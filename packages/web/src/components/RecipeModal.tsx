import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { IngredientAutocomplete } from './IngredientAutocomplete'
import { UnitSelect } from './UnitSelect'
import type { Recipe, Ingredient } from '@shared/types'

interface InstructionStep {
  step: number
  instruction: string
}

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
    tags: recipe?.tags || [],
    image_url: recipe?.image_url || '',
    source_url: recipe?.source_url || '',
  })

  // Convert recipe_ingredients to legacy Ingredient format for form state
  const getInitialIngredients = (): Ingredient[] => {
    if (recipe?.recipe_ingredients && recipe.recipe_ingredients.length > 0) {
      // New format from recipe_ingredients table
      return recipe.recipe_ingredients.map(ri => ({
        name: ri.ingredient_name,
        amount: ri.quantity,
        unit: ri.unit,
        group: ri.ingredient_group
      }))
    }
    if (recipe?.ingredients && recipe.ingredients.length > 0) {
      // Legacy JSONB format
      return recipe.ingredients
    }
    return [{ amount: 0, unit: '', name: '', group: undefined }]
  }

  const [ingredients, setIngredients] = useState<Ingredient[]>(getInitialIngredients)

  const [instructionSteps, setInstructionSteps] = useState<InstructionStep[]>(() => {
    // Try to use instructions_steps if available, otherwise convert old instructions
    if (recipe?.instructions_steps && recipe.instructions_steps.length > 0) {
      return recipe.instructions_steps
    } else if (recipe?.instructions) {
      // Convert old text instructions to steps
      const lines = recipe.instructions.split('\n').filter(line => line.trim())
      return lines.map((line, index) => ({
        step: index + 1,
        instruction: line.replace(/^\s*(\d+[\.\):]?\s*|step\s+\d+:\s*)/i, '').trim()
      }))
    }
    return [{ step: 1, instruction: '' }]
  })

  const [currentTag, setCurrentTag] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Import state
  const [importUrl, setImportUrl] = useState('')
  const [useAI, setUseAI] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importWarning, setImportWarning] = useState('')
  const [importStatus, setImportStatus] = useState<{
    step: 'fetching' | 'parsing' | 'done' | null
    message: string
  }>({ step: null, message: '' })

  // Update form when recipe changes
  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name,
        servings: recipe.servings,
        tags: recipe.tags || [],
        image_url: recipe.image_url || '',
        source_url: recipe.source_url || '',
      })
      // Handle both new (recipe_ingredients) and legacy (ingredients) formats
      if (recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0) {
        setIngredients(recipe.recipe_ingredients.map(ri => ({
          name: ri.ingredient_name,
          amount: ri.quantity,
          unit: ri.unit,
          group: ri.ingredient_group
        })))
      } else {
        setIngredients(recipe.ingredients || [{ amount: 0, unit: '', name: '', group: undefined }])
      }
      
      // Handle instructions
      if (recipe.instructions_steps && recipe.instructions_steps.length > 0) {
        setInstructionSteps(recipe.instructions_steps)
      } else if (recipe.instructions) {
        const lines = recipe.instructions.split('\n').filter(line => line.trim())
        setInstructionSteps(lines.map((line, index) => ({
          step: index + 1,
          instruction: line.replace(/^\s*(\d+[\.\):]?\s*|step\s+\d+:\s*)/i, '').trim()
        })))
      }
    } else {
      // Reset for new recipe
      setFormData({
        name: '',
        servings: 4,
        tags: [],
        image_url: '',
        source_url: '',
      })
      setIngredients([{ amount: 0, unit: '', name: '', group: undefined }])
      setInstructionSteps([{ step: 1, instruction: '' }])
      setImportUrl('')
      setImportError('')
      setImportWarning('')
    }
  }, [recipe, isOpen])

  // === IMPORT FUNCTIONS ===
  const handleImport = async () => {
    if (!importUrl.trim()) return

    setImportError('')
    setImportWarning('')
    setIsImporting(true)

    try {
      console.log('🌐 Starting recipe import from:', importUrl)
      setImportStatus({ step: 'fetching', message: 'Analyserar recept med AI...' })

      // Use AI-powered import with pattern learning
      console.log('🤖 Using AI Recipe Import (with pattern learning)...')
      const { data: importResult, error: importError } = await supabase.functions.invoke('recipe-import-ai', {
        body: { url: importUrl }
      })

      if (importError) {
        throw new Error(importError.message || 'Could not import recipe')
      }

      if (!importResult?.success) {
        throw new Error(importResult?.error || 'Import failed')
      }

      const imported = importResult.recipe
      console.log('✅ Import SUCCESS:', imported?.name, '| Method:', importResult.import_method)

      // Log if new rules were created
      if (importResult.rules_created) {
        console.log('📝 New extraction rules created for domain:', importResult.domain)
      }

      // Check if fallback was used (AI quota exceeded)
      if (importResult.used_fallback) {
        console.log('⚠️ Fallback used:', importResult.fallback_reason)
        setImportWarning('AI-kvota slut - receptet importerades utan översättning. Du kan behöva justera enheter och ingredienser manuellt.')
      }

      if (!imported) {
        throw new Error('Could not extract recipe data')
      }

      // Fill form with imported data
      setFormData({
        name: imported.name || '',
        servings: imported.servings || 4,
        tags: imported.tags || [],
        image_url: imported.image_url || '',
        source_url: imported.source_url || importUrl,
      })

      setIngredients(imported.ingredients || [{ amount: 0, unit: '', name: '' }])

      // Set instruction steps
      if (imported.instructions_steps && imported.instructions_steps.length > 0) {
        setInstructionSteps(imported.instructions_steps)
      } else if (imported.instructions) {
        const lines = imported.instructions.split('\n').filter((line: string) => line.trim())
        setInstructionSteps(lines.map((line: string, index: number) => ({
          step: index + 1,
          instruction: line.replace(/^\s*(\d+[\.\):]?\s*|step\s+\d+:\s*)/i, '').trim()
        })))
      }

      setImportUrl('')
      setUseAI(false)
      setImportStatus({ step: 'done', message: 'Recept importerat!' })

      // Clear status after a moment
      setTimeout(() => {
        setImportStatus({ step: null, message: '' })
      }, 1500)

    } catch (error: any) {
      console.error('❌ Import error:', error)
      setImportError(error.message || 'Import misslyckades')
      setImportStatus({ step: null, message: '' })
    } finally {
      setIsImporting(false)
    }
  }

  // Check if a string looks like an ingredient group header rather than an ingredient
  function isIngredientGroupHeader(str: string): boolean {
    const trimmed = str.trim()

    // Too short or empty
    if (!trimmed || trimmed.length < 2) return false

    // Common Swedish group header patterns
    const groupPatterns = [
      /^till\s+(servering|såsen|garnering|toppning|smeten|degen|fyllning|marinaden|glazen|glasyr)/i,
      /^(servering|tillbehör|garnering|toppning|sås|marinad|smeten|degen|fyllning|glaze|glasyr):?$/i,
      /^för\s+(servering|såsen|garnering)/i,
    ]

    if (groupPatterns.some(p => p.test(trimmed))) {
      return true
    }

    // Single word, no numbers, likely a header
    // Examples: "Servering", "Sås", "Marinad"
    if (/^[A-ZÅÄÖ][a-zåäö]+:?$/.test(trimmed) && trimmed.length <= 20) {
      // Check it's not a common ingredient
      const commonIngredients = ['smör', 'mjölk', 'vatten', 'salt', 'socker', 'olja', 'mjöl']
      if (!commonIngredients.includes(trimmed.toLowerCase().replace(':', ''))) {
        return true
      }
    }

    return false
  }

  // Normalize group header to clean form
  function normalizeGroupHeader(str: string): string {
    let cleaned = str.trim().replace(/:$/, '')

    // Capitalize first letter
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
  }

  // LAYER 1: Extract recipe from schema.org/Recipe JSON-LD
  function extractRecipeFromSchema(html: string): any | null {
    try {
      // Find JSON-LD script tags
      const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
      const matches = html.matchAll(scriptRegex)

      for (const match of matches) {
        try {
          const jsonData = JSON.parse(match[1])

          // Handle array of items
          const items = Array.isArray(jsonData) ? jsonData : [jsonData]

          for (const item of items) {
            // Check if it's a Recipe
            if (item['@type'] === 'Recipe' || item['@type']?.includes('Recipe')) {
              console.log('📊 Found Recipe schema!')

              // Extract ingredients with group detection
              const ingredients: { name: string, amount?: number, unit?: string, group?: string }[] = []
              const recipeIngredients = item.recipeIngredient || []
              let currentGroup: string | undefined = undefined

              for (const ing of recipeIngredients) {
                const trimmedIng = String(ing).trim()

                // Check if this is a group header
                if (isIngredientGroupHeader(trimmedIng)) {
                  currentGroup = normalizeGroupHeader(trimmedIng)
                  console.log('📂 Detected ingredient group:', currentGroup)
                  continue  // Don't add as ingredient
                }

                // Parse ingredient string like "2 dl mjölk"
                const parsed = parseIngredientString(trimmedIng)
                if (parsed) {
                  ingredients.push({
                    ...parsed,
                    group: currentGroup
                  })
                }
              }

              // Extract instructions
              let instructions = ''
              if (Array.isArray(item.recipeInstructions)) {
                instructions = item.recipeInstructions
                  .map((step: any) => {
                    if (typeof step === 'string') return step
                    if (step.text) return step.text
                    return ''
                  })
                  .filter(Boolean)
                  .join('\n')
              } else if (typeof item.recipeInstructions === 'string') {
                instructions = item.recipeInstructions
              }

              // Extract image URL (can be string, object, or array)
              let imageUrl: string | null = null
              if (item.image) {
                if (typeof item.image === 'string') {
                  imageUrl = item.image
                } else if (Array.isArray(item.image)) {
                  // Take the first image if array
                  const firstImg = item.image[0]
                  imageUrl = typeof firstImg === 'string' ? firstImg : firstImg?.url || null
                } else if (item.image.url) {
                  imageUrl = item.image.url
                }
              }

              // Extract tags from multiple schema.org fields
              const extractedTags: string[] = []

              // 1. recipeCategory (can be string or array)
              if (item.recipeCategory) {
                if (Array.isArray(item.recipeCategory)) {
                  extractedTags.push(...item.recipeCategory)
                } else {
                  extractedTags.push(item.recipeCategory)
                }
              }

              // 2. recipeCuisine (cuisine type like "Fransk mat")
              if (item.recipeCuisine) {
                if (Array.isArray(item.recipeCuisine)) {
                  extractedTags.push(...item.recipeCuisine)
                } else {
                  extractedTags.push(item.recipeCuisine)
                }
              }

              // 3. keywords (comma-separated or array)
              if (item.keywords) {
                if (Array.isArray(item.keywords)) {
                  extractedTags.push(...item.keywords)
                } else if (typeof item.keywords === 'string') {
                  // Split comma-separated keywords
                  const keywordList = item.keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
                  extractedTags.push(...keywordList)
                }
              }

              // 4. suitableForDiet (like "VegetarianDiet")
              if (item.suitableForDiet) {
                const diets = Array.isArray(item.suitableForDiet) ? item.suitableForDiet : [item.suitableForDiet]
                for (const diet of diets) {
                  // Convert schema.org diet to readable tag
                  const dietName = typeof diet === 'string' ? diet : diet['@type'] || ''
                  const readableDiet = dietName
                    .replace('https://schema.org/', '')
                    .replace('Diet', '')
                    .replace(/([A-Z])/g, ' $1')
                    .trim()
                  if (readableDiet) extractedTags.push(readableDiet)
                }
              }

              // Deduplicate and clean tags
              const uniqueTags = [...new Set(extractedTags.map(t => t.trim()).filter(Boolean))]

              return {
                name: item.name || '',
                servings: parseInt(item.recipeYield) || 4,
                ingredients: ingredients.length > 0 ? ingredients : [{ amount: 0, unit: '', name: '', group: undefined }],
                instructions: instructions,
                tags: uniqueTags,
                image_url: imageUrl
              }
            }
          }
        } catch (e) {
          // Invalid JSON, try next script tag
          continue
        }
      }

      return null
    } catch (error) {
      console.error('Schema extraction error:', error)
      return null
    }
  }

  // Parse ingredient string with flexible Swedish patterns
  function parseIngredientString(str: string): { name: string, amount?: number, unit?: string } | null {
    const trimmed = str.trim()
    if (!trimmed) return null

    // All known units (including flexible ones)
    const units = [
      'ml', 'dl', 'cl', 'l', 'liter',
      'g', 'gram', 'kg', 'hg',
      'msk', 'matsked', 'tsk', 'tesked', 'krm', 'kryddmått',
      'st', 'styck', 'stycken',
      'klyfta', 'klyftor', 'skiva', 'skivor',
      'burk', 'burkar', 'förp', 'förpackning', 'påse', 'påsar',
      'nypa', 'nypor', 'näve', 'nävar',
      'bit', 'bitar', 'knippe', 'bunt'
    ].join('|')

    // Pattern 1: "2 dl mjölk", "500 g vetemjöl", "1 tsk salt"
    const pattern1 = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${units})?\\s+(.+)$`, 'i')
    const match1 = trimmed.match(pattern1)

    if (match1) {
      return {
        amount: parseFloat(match1[1].replace(',', '.')),
        unit: normalizeUnit(match1[2]) || undefined,
        name: match1[3].trim()
      }
    }

    // Pattern 2: "ca 2 dl mjölk", "cirka 500 g kött"
    const pattern2 = new RegExp(`^(?:ca|cirka|ungefär)?\\s*(\\d+(?:[.,]\\d+)?)\\s*(${units})?\\s+(.+)$`, 'i')
    const match2 = trimmed.match(pattern2)

    if (match2) {
      return {
        amount: parseFloat(match2[1].replace(',', '.')),
        unit: normalizeUnit(match2[2]) || undefined,
        name: match2[3].trim()
      }
    }

    // Pattern 3: Fractions like "1/2 dl", "1 1/2 msk"
    const fractionMatch = trimmed.match(/^(\d+)?\s*(\d+)\/(\d+)\s*([\wåäö]+)?\s+(.+)$/i)
    if (fractionMatch) {
      const whole = fractionMatch[1] ? parseInt(fractionMatch[1]) : 0
      const num = parseInt(fractionMatch[2])
      const den = parseInt(fractionMatch[3])
      const amount = whole + (num / den)
      return {
        amount: amount,
        unit: normalizeUnit(fractionMatch[4]) || undefined,
        name: fractionMatch[5].trim()
      }
    }

    // Pattern 4: No amount - "salt och peppar", "olja, till formen"
    // Check if it starts with a common ingredient pattern
    const noAmountPatterns = [
      /^(salt|peppar|socker|olja|smör|vatten)/i,
      /efter smak$/i,
      /till formen$/i,
      /till stekning$/i,
      /till servering$/i,
    ]

    const hasNoAmount = noAmountPatterns.some(p => p.test(trimmed)) ||
                        !trimmed.match(/^\d/)  // Doesn't start with number

    if (hasNoAmount && !trimmed.match(/^\d/)) {
      return {
        amount: undefined,
        unit: undefined,
        name: trimmed
      }
    }

    // Fallback: just the name
    return {
      amount: undefined,
      unit: undefined,
      name: trimmed
    }
  }

  // Normalize unit variations to standard form
  function normalizeUnit(unit?: string): string | undefined {
    if (!unit) return undefined
    const lower = unit.toLowerCase()
    const unitMap: Record<string, string> = {
      'liter': 'l',
      'gram': 'g',
      'matsked': 'msk',
      'tesked': 'tsk',
      'kryddmått': 'krm',
      'styck': 'st',
      'stycken': 'st',
      'klyftor': 'klyfta',
      'skivor': 'skivor',
      'burkar': 'burk',
      'förpackning': 'förp',
      'påsar': 'påse',
      'nypor': 'nypa',
      'nävar': 'näve',
      'bitar': 'bit',
    }
    return unitMap[lower] || lower
  }

  // === INGREDIENT FUNCTIONS ===
  const addIngredient = () => {
    // Inherit group from last ingredient if it has one
    const lastGroup = ingredients.length > 0 ? ingredients[ingredients.length - 1].group : undefined
    setIngredients([...ingredients, { amount: 0, unit: '', name: '', group: lastGroup }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  // === INSTRUCTION STEP FUNCTIONS ===
  const addStep = () => {
    setInstructionSteps([
      ...instructionSteps,
      { step: instructionSteps.length + 1, instruction: '' }
    ])
  }

  const removeStep = (index: number) => {
    const updated = instructionSteps.filter((_, i) => i !== index)
    // Renumber steps
    setInstructionSteps(updated.map((s, i) => ({ ...s, step: i + 1 })))
  }

  const updateStep = (index: number, instruction: string) => {
    const updated = [...instructionSteps]
    updated[index] = { ...updated[index], instruction }
    setInstructionSteps(updated)
  }

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= instructionSteps.length) return

    const updated = [...instructionSteps]
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    // Renumber
    setInstructionSteps(updated.map((s, i) => ({ ...s, step: i + 1 })))
  }

  // === TAG FUNCTIONS ===
  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, currentTag.trim()] })
      setCurrentTag('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })
  }

  // === SUBMIT ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)

    // Convert steps to old format for backward compatibility
    const instructionsText = instructionSteps
      .map(s => `${s.step}. ${s.instruction}`)
      .join('\n')

    // Recipe data WITHOUT ingredients (ingredients go to separate table now)
    const recipeData = {
      user_id: user.id,
      name: formData.name,
      servings: formData.servings,
      instructions: instructionsText,
      instructions_steps: instructionSteps,
      tags: formData.tags,
      is_public: false,
      image_url: formData.image_url || null,
      source_url: formData.source_url || null,
      // Legacy field - send empty array (PostgREST may have cached schema)
      ingredients_deprecated: [],
    }

    try {
      let recipeId: string

      if (isEditing && recipe) {
        // UPDATE existing recipe
        const { data, error } = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', recipe.id)
          .select()
          .single()

        if (error) throw error
        recipeId = recipe.id

        // Delete old ingredients
        const { error: deleteError } = await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', recipeId)

        if (deleteError) {
          console.error('Error deleting old ingredients:', deleteError)
        }

        if (data) {
          updateRecipe(recipe.id, data as any)
        }
      } else {
        // INSERT new recipe
        const { data, error } = await supabase
          .from('recipes')
          .insert(recipeData)
          .select()
          .single()

        if (error) throw error
        if (!data) throw new Error('No data returned from insert')

        recipeId = data.id
        addRecipe(data as any)
      }

      // Insert ingredients into recipe_ingredients table
      const validIngredients = ingredients.filter(ing => ing.name.trim())

      if (validIngredients.length > 0) {
        const ingredientRows = validIngredients.map((ing, index) => ({
          recipe_id: recipeId,
          ingredient_name: ing.name.trim(),
          // Allow null for flexible ingredients like "salt och peppar"
          quantity: ing.amount || null,
          unit: ing.unit || null,
          ingredient_group: ing.group || null,
          order_position: index + 1
        }))

        const { error: ingError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientRows)

        if (ingError) {
          console.error('Error saving ingredients:', ingError)
          // Don't throw - recipe is saved, just log the error
        }
      }

      // Fetch the complete recipe with ingredients to update store
      const { data: completeRecipe, error: fetchError } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (*)
        `)
        .eq('id', recipeId)
        .single()

      if (!fetchError && completeRecipe) {
        if (isEditing) {
          updateRecipe(recipeId, completeRecipe as any)
        } else {
          // Remove the incomplete recipe we added earlier, add the complete one
          updateRecipe(recipeId, completeRecipe as any)
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

          {/* Modal Container */}
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
              
              {/* === IMPORT SECTION === */}
              {!isEditing && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 relative overflow-hidden">
                  {/* Loading Overlay */}
                  <AnimatePresence>
                    {isImporting && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-blue-50/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl"
                      >
                        {/* Spinner */}
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full mb-3"
                          style={{ borderWidth: '3px' }}
                        />
                        {/* Status Text */}
                        <motion.p
                          key={importStatus.message}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-blue-700 font-medium text-sm"
                        >
                          {importStatus.message || 'Importerar...'}
                        </motion.p>
                        {/* Progress dots */}
                        <div className="flex gap-1 mt-2">
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                            className={`w-2 h-2 rounded-full ${importStatus.step === 'fetching' ? 'bg-blue-600' : 'bg-blue-300'}`}
                          />
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                            className={`w-2 h-2 rounded-full ${importStatus.step === 'parsing' ? 'bg-blue-600' : 'bg-blue-300'}`}
                          />
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                            className={`w-2 h-2 rounded-full ${importStatus.step === 'done' ? 'bg-green-500' : 'bg-blue-300'}`}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Success checkmark */}
                  <AnimatePresence>
                    {importStatus.step === 'done' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-green-50/95 flex flex-col items-center justify-center z-10 rounded-xl"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', damping: 10 }}
                          className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-2"
                        >
                          <span className="text-white text-2xl">✓</span>
                        </motion.div>
                        <p className="text-green-700 font-semibold">Recept importerat!</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <h3 className="text-sm font-semibold mb-3 text-blue-900">
                    🔗 Importera från URL (valfritt)
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="https://www.ica.se/recept/..."
                      className="flex-1 px-4 py-2 rounded-lg border border-blue-300 focus:border-blue-500 outline-none"
                      disabled={isImporting}
                    />
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={isImporting || !importUrl.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 whitespace-nowrap"
                    >
                      Importera
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="useAI"
                      checked={useAI}
                      onChange={(e) => setUseAI(e.target.checked)}
                      className="w-4 h-4"
                      disabled={isImporting}
                    />
                    <label htmlFor="useAI" className="text-xs text-blue-700">
                      Använd AI för svåra webbplatser (långsammare)
                    </label>
                  </div>
                  {importError && (
                    <div className="mt-2 text-sm text-red-600">
                      {importError}
                    </div>
                  )}
                  {importWarning && (
                    <div className="mt-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      ⚠️ {importWarning}
                    </div>
                  )}
                  <p className="text-xs text-blue-600 mt-2">
                    Fungerar med ICA, Coop, Arla, Köket.se, AllRecipes, m.fl.
                  </p>
                </div>
              )}

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

              {/* Image URL */}
              <div>
                <label className="block text-sm font-semibold mb-2">Bild-URL (valfritt)</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="https://example.com/bild.jpg"
                />
                {/* Image preview */}
                {formData.image_url && (
                  <div className="mt-3 relative">
                    <img
                      src={formData.image_url}
                      alt="Förhandsvisning"
                      className="w-full h-40 object-cover rounded-xl border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                        const parent = (e.target as HTMLImageElement).parentElement
                        if (parent) {
                          const errorMsg = parent.querySelector('.img-error')
                          if (errorMsg) (errorMsg as HTMLElement).style.display = 'flex'
                        }
                      }}
                      onLoad={(e) => {
                        (e.target as HTMLImageElement).style.display = 'block'
                        const parent = (e.target as HTMLImageElement).parentElement
                        if (parent) {
                          const errorMsg = parent.querySelector('.img-error')
                          if (errorMsg) (errorMsg as HTMLElement).style.display = 'none'
                        }
                      }}
                    />
                    <div className="img-error hidden w-full h-40 rounded-xl border border-red-200 bg-red-50 items-center justify-center text-red-500 text-sm">
                      ⚠️ Kunde inte ladda bilden
                    </div>
                  </div>
                )}
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold">Ingredienser</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const groupName = prompt('Ange gruppnamn (t.ex. "Servering", "Till såsen"):')
                        if (groupName?.trim()) {
                          // Add a new ingredient with this group
                          setIngredients([...ingredients, { amount: 0, unit: '', name: '', group: groupName.trim() }])
                        }
                      }}
                      className="text-sm text-secondary font-semibold hover:text-secondary-dark"
                    >
                      + Ny grupp
                    </button>
                    <button
                      type="button"
                      onClick={addIngredient}
                      className="text-sm text-primary font-semibold hover:text-primary-dark"
                    >
                      + Lägg till
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {ingredients.map((ingredient, index) => {
                    // Check if this is the first ingredient in a new group
                    const prevGroup = index > 0 ? ingredients[index - 1].group : undefined
                    const isNewGroup = ingredient.group && ingredient.group !== prevGroup

                    return (
                      <div key={index}>
                        {/* Group header */}
                        {isNewGroup && (
                          <div className="flex items-center gap-2 mb-2 mt-3 first:mt-0">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs font-semibold text-secondary uppercase tracking-wide px-2">
                              {ingredient.group}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                // Remove group from all ingredients in this group
                                const updated = ingredients.map(ing =>
                                  ing.group === ingredient.group ? { ...ing, group: undefined } : ing
                                )
                                setIngredients(updated)
                              }}
                              className="text-xs text-gray-400 hover:text-red-500"
                              title="Ta bort grupp"
                            >
                              ✕
                            </button>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="Mängd"
                            value={ingredient.amount != null && ingredient.amount > 0 ? ingredient.amount : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value)
                              updateIngredient(index, 'amount', val)
                            }}
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
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* === INSTRUCTION STEPS === */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold">Instruktioner</label>
                  <button
                    type="button"
                    onClick={addStep}
                    className="text-sm text-primary font-semibold hover:text-primary-dark"
                  >
                    + Lägg till steg
                  </button>
                </div>

                <div className="space-y-3">
                  {instructionSteps.map((step, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {step.step}
                      </div>
                      <textarea
                        value={step.instruction}
                        onChange={(e) => updateStep(index, e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary outline-none resize-none"
                        rows={2}
                        placeholder="Beskriv detta steg..."
                        required
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
                          disabled={index === instructionSteps.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Flytta ner"
                        >
                          ↓
                        </button>
                        {instructionSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Ta bort"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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