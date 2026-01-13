import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import type { Recipe, InstructionStep, Ingredient } from '@shared/types';

interface RecipeImportModalProps {
  onClose: () => void;
  onSave: (recipe: Partial<Recipe>) => Promise<void>;
}

// Extended ingredient with matching info
interface ImportedIngredient extends Ingredient {
  canonical_id?: string;
  canonical_name?: string;
  match_confidence?: number;
  needs_review?: boolean;
}

// Canonical ingredient suggestion from API
interface CanonicalSuggestion {
  id: string;
  name: string;
  default_unit: string;
  category: string;
}

export default function RecipeImportModal({ onClose, onSave }: RecipeImportModalProps) {
  const [step, setStep] = useState<'import' | 'preview'>('import');
  const [url, setUrl] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Preview state
  const [previewRecipe, setPreviewRecipe] = useState<Partial<Recipe> | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedServings, setEditedServings] = useState(4);
  const [editedSteps, setEditedSteps] = useState<InstructionStep[]>([]);

  // Ingredient matching state
  const [editedIngredients, setEditedIngredients] = useState<ImportedIngredient[]>([]);
  const [editingIngredientIndex, setEditingIngredientIndex] = useState<number | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [ingredientSuggestions, setIngredientSuggestions] = useState<CanonicalSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Fetch canonical matches for ingredients after import
  const matchIngredients = useCallback(async (ingredients: Ingredient[]) => {
    const matched: ImportedIngredient[] = await Promise.all(
      ingredients.map(async (ing) => {
        try {
          // Try to find canonical match
          const { data } = await supabase.rpc('get_ingredient_match_info', {
            ingredient_name: ing.name
          });

          if (data && data.length > 0) {
            const match = data[0];
            return {
              ...ing,
              canonical_id: match.canonical_id,
              canonical_name: match.canonical_name,
              match_confidence: match.confidence,
              needs_review: match.confidence < 0.9
            };
          }
        } catch (err) {
          console.error('Match error:', err);
        }

        // No match found
        return {
          ...ing,
          canonical_id: undefined,
          canonical_name: undefined,
          match_confidence: 0,
          needs_review: true
        };
      })
    );

    setEditedIngredients(matched);
  }, []);

  // Search for canonical ingredients
  const searchIngredients = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setIngredientSuggestions([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data } = await supabase.rpc('get_ingredient_suggestions', {
        search_term: searchTerm
      });

      if (data) {
        setIngredientSuggestions(data);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ingredientSearch) {
        searchIngredients(ingredientSearch);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [ingredientSearch, searchIngredients]);

  // Select a canonical ingredient for the editing ingredient
  const selectCanonicalIngredient = (suggestion: CanonicalSuggestion) => {
    if (editingIngredientIndex === null) return;

    const updated = [...editedIngredients];
    updated[editingIngredientIndex] = {
      ...updated[editingIngredientIndex],
      canonical_id: suggestion.id,
      canonical_name: suggestion.name,
      match_confidence: 1.0,
      needs_review: false
    };

    setEditedIngredients(updated);
    setEditingIngredientIndex(null);
    setIngredientSearch('');
    setIngredientSuggestions([]);
  };

  // Mark ingredient as correct (approve auto-match)
  const approveIngredient = (index: number) => {
    const updated = [...editedIngredients];
    updated[index] = {
      ...updated[index],
      needs_review: false,
      match_confidence: 1.0
    };
    setEditedIngredients(updated);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call Supabase Edge Function (handles auth automatically)
      const { data, error: functionError } = await supabase.functions.invoke('recipe-import-ai', {
        body: { url, use_ai: useAI }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Import failed');
      }

      const recipe = data.recipe;

      // Set preview data
      setPreviewRecipe(recipe);
      setEditedName(recipe.name);
      setEditedServings(recipe.servings);
      setEditedSteps(recipe.instructions_steps || []);

      // Match ingredients with canonical database
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        await matchIngredients(recipe.ingredients);
      }

      setStep('preview');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Import misslyckades';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!previewRecipe) return;

    setLoading(true);
    try {
      // Convert edited ingredients back to recipe format with canonical info
      const ingredientsWithCanonical = editedIngredients.map(ing => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        key: ing.key,
        group: ing.group,
        // Pass canonical info for the backend to use
        _canonical_id: ing.canonical_id,
        _canonical_name: ing.canonical_name,
        _needs_review: ing.needs_review
      }));

      await onSave({
        ...previewRecipe,
        name: editedName,
        servings: editedServings,
        instructions_steps: editedSteps,
        ingredients: ingredientsWithCanonical as Ingredient[],
      });
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Kunde inte spara recept';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    setEditedSteps([
      ...editedSteps,
      { step: editedSteps.length + 1, instruction: '' }
    ]);
  };

  const updateStep = (index: number, instruction: string) => {
    const updated = [...editedSteps];
    updated[index] = { ...updated[index], instruction };
    setEditedSteps(updated);
  };

  const removeStep = (index: number) => {
    const updated = editedSteps.filter((_, i) => i !== index);
    // Renumber steps
    setEditedSteps(updated.map((s, i) => ({ ...s, step: i + 1 })));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= editedSteps.length) return;

    const updated = [...editedSteps];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    // Renumber
    setEditedSteps(updated.map((s, i) => ({ ...s, step: i + 1 })));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          {step === 'import' ? (
            <motion.div
              key="import"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <h2 className="text-2xl font-bold mb-4">Importera Recept</h2>
              
              <form onSubmit={handleImport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Recept URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.ica.se/recept/..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Fungerar med ICA, Coop, Arla, Köket.se, AllRecipes, m.fl.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useAI"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="useAI" className="text-sm">
                    Använd AI för svåra webbplatser (långsammare)
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                    disabled={loading}
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    disabled={loading || !url}
                  >
                    {loading ? 'Importerar...' : 'Importera'}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-h-[80vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold mb-4">Granska & Redigera</h2>

              <div className="space-y-6">
                {/* Recipe Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Receptnamn
                  </label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                {/* Servings */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Portioner
                  </label>
                  <input
                    type="number"
                    value={editedServings}
                    onChange={(e) => setEditedServings(parseInt(e.target.value))}
                    min="1"
                    className="w-24 px-4 py-2 border rounded-lg"
                  />
                </div>

                {/* Ingredients with canonical matching */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">
                      Ingredienser
                    </label>
                    {editedIngredients.some(ing => ing.needs_review) && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        {editedIngredients.filter(ing => ing.needs_review).length} behöver granskas
                      </span>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    {editedIngredients.map((ing, i) => (
                      <div key={i} className="relative">
                        {/* Main ingredient row */}
                        <div
                          className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                            ing.needs_review
                              ? 'bg-amber-50 border border-amber-200'
                              : 'bg-white border border-gray-100'
                          }`}
                        >
                          {/* Amount and unit */}
                          <span className="text-sm text-gray-500 w-20 flex-shrink-0">
                            {ing.amount || ''} {ing.unit || ''}
                          </span>

                          {/* Ingredient name */}
                          <span className="text-sm flex-1">{ing.name}</span>

                          {/* Match status indicator */}
                          {ing.needs_review ? (
                            <div className="flex items-center gap-1">
                              {ing.canonical_name ? (
                                <>
                                  <span className="text-xs text-amber-600">
                                    → {ing.canonical_name}?
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => approveIngredient(i)}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title="Godkänn"
                                  >
                                    ✓
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-red-500">
                                  Ingen matchning
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingIngredientIndex(i);
                                  setIngredientSearch(ing.name);
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Välj ingrediens"
                              >
                                ✎
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-green-600">
                              ✓ {ing.canonical_name || ing.name}
                            </span>
                          )}
                        </div>

                        {/* Ingredient search dropdown */}
                        {editingIngredientIndex === i && (
                          <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                            <input
                              type="text"
                              value={ingredientSearch}
                              onChange={(e) => setIngredientSearch(e.target.value)}
                              placeholder="Sök ingrediens..."
                              className="w-full px-3 py-2 border-b text-sm"
                              autoFocus
                            />
                            {searchLoading && (
                              <div className="px-3 py-2 text-sm text-gray-500">Söker...</div>
                            )}
                            {ingredientSuggestions.length > 0 && (
                              <div className="max-h-48 overflow-y-auto">
                                {ingredientSuggestions.map((suggestion) => (
                                  <button
                                    key={suggestion.id}
                                    type="button"
                                    onClick={() => selectCanonicalIngredient(suggestion)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between items-center"
                                  >
                                    <span>{suggestion.name}</span>
                                    <span className="text-xs text-gray-400">
                                      ({suggestion.default_unit})
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {ingredientSearch.length >= 2 && ingredientSuggestions.length === 0 && !searchLoading && (
                              <div className="px-3 py-2 text-sm text-gray-500">
                                Ingen träff - ingrediensen sparas som ny
                              </div>
                            )}
                            <div className="px-3 py-2 border-t flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingIngredientIndex(null);
                                  setIngredientSearch('');
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Avbryt
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructions Steps */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">
                      Instruktioner
                    </label>
                    <button
                      type="button"
                      onClick={addStep}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      + Lägg till steg
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editedSteps.map((step, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {step.step}
                        </div>
                        <textarea
                          value={step.instruction}
                          onChange={(e) => updateStep(index, e.target.value)}
                          className="flex-1 px-4 py-2 border rounded-lg resize-none"
                          rows={2}
                          placeholder="Beskriv detta steg..."
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveStep(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            title="Flytta upp"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(index, 'down')}
                            disabled={index === editedSteps.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            title="Flytta ner"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Ta bort"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setStep('import')}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    disabled={loading}
                  >
                    ← Tillbaka
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    disabled={loading || !editedName}
                  >
                    {loading ? 'Sparar...' : 'Spara Recept'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}