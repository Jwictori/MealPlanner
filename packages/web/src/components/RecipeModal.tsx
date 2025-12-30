import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { IngredientAutocomplete } from './IngredientAutocomplete'
import { UnitSelect } from './UnitSelect'
import type { Recipe, Ingredient } from '@shared/types'

interface RecipeModalProps {
  isOpen: boolean
  onClose: () => void
  recipe?: Recipe
}

export function RecipeModal({ isOpen, onClose, recipe }: RecipeModalProps) {
  const { user, addRecipe, updateRecipe } = useStore()
  const isEditing = !!recipe

  const [formData, setFormData] = useState({
    name: recipe?.name || '',
    servings: recipe?.servings || 4,
    instructions: recipe?.instructions || '',
    tags: recipe?.tags || [],
  })

  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients || [{ amount: 0, unit: '', name: '' }]
  )

  const [currentTag, setCurrentTag] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update form when recipe changes
  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name,
        servings: recipe.servings,
        instructions: recipe.instructions,
        tags: recipe.tags || [],
      })
      setIngredients(recipe.ingredients || [{ amount: 0, unit: '', name: '' }])
    } else {
      // Reset for new recipe
      setFormData({
        name: '',
        servings: 4,
        instructions: '',
        tags: [],
      })
      setIngredients([{ amount: 0, unit: '', name: '' }])
    }
  }, [recipe, isOpen])

  const addIngredient = () => {
    setIngredients([...ingredients, { amount: 0, unit: '', name: '' }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, currentTag.trim()] })
      setCurrentTag('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)

    const recipeData = {
      user_id: user.id,
      name: formData.name,
      servings: formData.servings,
      ingredients: ingredients.filter(ing => ing.name.trim()),
      instructions: formData.instructions,
      tags: formData.tags,
      is_public: false,
    }

    try {
      if (isEditing && recipe) {
        const { data, error } = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', recipe.id)
          .select()
          .single()

        if (!error && data) {
          updateRecipe(recipe.id, data as any)
        }
      } else {
        const { data, error } = await supabase
          .from('recipes')
          .insert(recipeData)
          .select()
          .single()

        if (!error && data) {
          addRecipe(data as any)
        }
      }

      onClose()
    } catch (error) {
      console.error('Error saving recipe:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal Container - Flexbox centered */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-surface rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
            >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">
                {isEditing ? 'Redigera Recept' : 'Nytt Recept'}
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold mb-2">Namn</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="T.ex. Köttbullar med potatismos"
                />
              </div>

              {/* Servings */}
              <div>
                <label className="block text-sm font-semibold mb-2">Portioner</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold">Ingredienser</label>
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="text-sm text-primary font-semibold hover:text-primary-dark"
                  >
                    + Lägg till
                  </button>
                </div>

                <div className="space-y-2">
                  {ingredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Mängd"
                        value={ingredient.amount || ''}
                        onChange={(e) => updateIngredient(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-24 px-3 py-2 rounded-lg border border-gray-300 focus:border-primary outline-none"
                      />
                      <UnitSelect
                        value={ingredient.unit}
                        onChange={(unit) => updateIngredient(index, 'unit', unit)}
                        className="w-28 px-3 py-2 rounded-lg border border-gray-300 focus:border-primary outline-none"
                      />
                      <IngredientAutocomplete
                        value={ingredient.name}
                        onChange={(name, defaultUnit) => {
                          updateIngredient(index, 'name', name)
                          // Auto-fill unit if empty and default exists
                          if (!ingredient.unit && defaultUnit) {
                            updateIngredient(index, 'unit', defaultUnit)
                          }
                        }}
                        placeholder="Ingrediens"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:border-primary outline-none"
                      />
                      {ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="px-3 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-semibold mb-2">Instruktioner</label>
                <textarea
                  required
                  rows={6}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                  placeholder="Beskriv hur receptet tillagas..."
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold mb-2">Taggar</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary outline-none"
                    placeholder="T.ex. Vegetarisk, Snabbt, Barnvänligt"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-secondary text-white rounded-lg font-semibold hover:bg-secondary-dark"
                  >
                    Lägg till
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-secondary-light text-secondary rounded-lg text-sm font-semibold flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-secondary-dark"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Avbryt
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Sparar...' : isEditing ? 'Uppdatera' : 'Skapa'}
              </button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
