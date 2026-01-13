import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { MOCK_AI_RESPONSE, USE_MOCK_AI } from '../lib/mockAIResponse'
import { RecipePreviewCard } from './RecipePreviewCard'
import { CollapsibleSection } from './CollapsibleSection'
import type { Recipe } from '@shared/types'

// Helper to get ingredient names (supports both new and legacy formats)
function getIngredientNames(recipe: Recipe): string[] {
  if (recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0) {
    return recipe.recipe_ingredients.map(ri => ri.ingredient_name)
  }
  return (recipe.ingredients ?? []).map(ing => ing.name)
}

interface AIMealPlannerProps {
  isOpen: boolean
  onClose: () => void
  recipes: Recipe[]
  userPreferences: any
  onGenerate: (selectedRecipes: Recipe[], dayOffsets?: number[]) => void
  dateRange?: { start: string; end: string } | null
}

interface PlanningOptions {
  days: number
  focusArea: 'balanced' | 'protein' | 'budget' | 'quick' | 'variety'
  customInstructions: string
}

interface AIResult {
  recipes: (Recipe | null)[]
  reasons: string[]
  overall_reasoning: string
  nutritional_balance: string
  tips: string[]
}

type Step = 'config' | 'generating' | 'preview' | 'error'

export function AIMealPlanner({ 
  isOpen, 
  onClose, 
  recipes, 
  userPreferences, 
  onGenerate,
  dateRange 
}: AIMealPlannerProps) {
  const [step, setStep] = useState<Step>('config')
  
  // Calculate days from dateRange
  const calculatedDays = dateRange 
    ? Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 7
  
  const [options, setOptions] = useState<PlanningOptions>({
    days: calculatedDays,
    focusArea: 'balanced',
    customInstructions: '',
  })
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [acceptedDays, setAcceptedDays] = useState<Set<number>>(new Set())
  const [rejectedDays, setRejectedDays] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string>('')

  const generateWithAI = async () => {
    if (recipes.length < options.days) {
      setError(`Du behöver minst ${options.days} recept för att planera ${options.days} dagar.`)
      return
    }

    setStep('generating')
    setError('')

    try {
      let planData

      if (USE_MOCK_AI) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000))
        planData = MOCK_AI_RESPONSE
      } else {
        // Real API call
        const userContext = buildUserContext(userPreferences)
        const recipesList = recipes.map(r => ({
          name: r.name,
          tags: r.tags || [],
          servings: r.servings,
          ingredients: getIngredientNames(r).filter(Boolean),
        }))

        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          throw new Error('Du måste vara inloggad för att använda AI-planering')
        }

        const { data, error: functionError } = await supabase.functions.invoke('ai-meal-planner', {
          body: {
            userContext,
            recipesList,
            options: {
              days: options.days,
              focusArea: options.focusArea,
              customInstructions: options.customInstructions,
            }
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        })

        if (functionError) {
          throw new Error(functionError.message || 'Edge function error')
        }

        if (!data || !data.content || !data.content[0]) {
          throw new Error('Ogiltigt svar från AI')
        }

        const aiResponse = data.content[0].text

        // Parse JSON
        let jsonText = aiResponse.trim()
        if (jsonText.startsWith('```')) {
          const lines = jsonText.split('\n')
          jsonText = lines.slice(1, -1).join('\n')
        }

        const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('Kunde inte tolka AI-svar')
        }

        planData = JSON.parse(jsonMatch[0])
      }

      // Map recipes
      const selectedRecipes: (Recipe | null)[] = []
      const reasons: string[] = []

      for (const day of planData.meal_plan) {
        const recipe = recipes.find(r => r.name === day.recipe_name)
        selectedRecipes.push(recipe || null)
        reasons.push(day.reason)
      }

      setAiResult({
        recipes: selectedRecipes,
        reasons,
        overall_reasoning: planData.overall_reasoning,
        nutritional_balance: planData.nutritional_balance,
        tips: planData.tips
      })

      // Auto-accept all initially
      setAcceptedDays(new Set(Array.from({ length: options.days }, (_, i) => i + 1)))
      setRejectedDays(new Set())
      
      setStep('preview')

    } catch (err) {
      console.error('AI generation error:', err)
      setError(err instanceof Error ? err.message : 'AI-planering misslyckades')
      setStep('error')
    }
  }

  const toggleDay = (day: number) => {
    const newAccepted = new Set(acceptedDays)
    const newRejected = new Set(rejectedDays)

    if (acceptedDays.has(day)) {
      newAccepted.delete(day)
      newRejected.add(day)
    } else if (rejectedDays.has(day)) {
      newRejected.delete(day)
      newAccepted.add(day)
    } else {
      newAccepted.add(day)
    }

    setAcceptedDays(newAccepted)
    setRejectedDays(newRejected)
  }

  const applyPlan = () => {
    if (!aiResult) return

    // Create arrays of selected recipes AND their day offsets
    const selectedRecipes: Recipe[] = []
    const dayOffsets: number[] = []
    
    aiResult.recipes.forEach((recipe, index) => {
      const day = index + 1
      // Only include accepted recipes that exist
      if (recipe !== null && acceptedDays.has(day)) {
        selectedRecipes.push(recipe)
        dayOffsets.push(index) // Keep original day offset (0-6 for Mon-Sun)
      }
    })

    if (selectedRecipes.length === 0) {
      setError('Du måste acceptera minst en rätt')
      return
    }

    // Pass both recipes AND their day assignments
    onGenerate(selectedRecipes, dayOffsets)
    handleClose()
  }

  const handleClose = () => {
    setStep('config')
    setAiResult(null)
    setAcceptedDays(new Set())
    setRejectedDays(new Set())
    setError('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-6xl bg-surface rounded-2xl shadow-2xl flex flex-col max-h-[90vh] my-8"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                      🤖 AI Matplanerare
                    </h2>
                    <p className="text-text-secondary">
                      {step === 'config' && 'Låt AI planera din vecka baserat på dina preferenser'}
                      {step === 'generating' && 'AI skapar din personliga matplan...'}
                      {step === 'preview' && `Granska och godkänn AI:s förslag (${acceptedDays.size}/${options.days} valda)`}
                      {step === 'error' && 'Ett fel uppstod'}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-2xl text-text-secondary hover:text-text transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* CONFIG STEP */}
                {step === 'config' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Antal dagar
                      </label>
                      <select
                        value={options.days}
                        onChange={(e) => setOptions({ ...options, days: parseInt(e.target.value) })}
                        className="input"
                      >
                        <option value={3}>3 dagar</option>
                        <option value={5}>5 dagar (vardagar)</option>
                        <option value={7}>7 dagar (hel vecka)</option>
                        <option value={14}>14 dagar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Fokusområde
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { id: 'balanced', label: '⚖️ Balanserat', desc: 'Jämn mix av allt' },
                          { id: 'protein', label: '🏋️ Proteinrikt', desc: 'Extra protein' },
                          { id: 'budget', label: '💰 Budget', desc: 'Billigt & gott' },
                          { id: 'quick', label: '⚡ Snabbt', desc: 'Max 30 min' },
                          { id: 'variety', label: '🌍 Variation', desc: 'Olika kök' },
                        ].map((focus) => (
                          <button
                            key={focus.id}
                            onClick={() => setOptions({ ...options, focusArea: focus.id as any })}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              options.focusArea === focus.id
                                ? 'border-primary bg-primary-light'
                                : 'border-gray-200 hover:border-primary'
                            }`}
                          >
                            <div className="font-semibold text-sm">{focus.label}</div>
                            <div className="text-xs text-text-secondary mt-1">{focus.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Extra instruktioner (valfritt)
                      </label>
                      <textarea
                        value={options.customInstructions}
                        onChange={(e) => setOptions({ ...options, customInstructions: e.target.value })}
                        className="input resize-none"
                        rows={3}
                        placeholder="T.ex. 'Jag vill ha fisk minst 2 gånger' eller 'Undvik pasta denna vecka'"
                      />
                    </div>

                    {userPreferences && (
                      <CollapsibleSection
                        title="AI tar hänsyn till dina inställningar"
                        icon="📋"
                        variant="info"
                      >
                        <ul className="text-sm text-text-secondary space-y-1">
                          {userPreferences.adults && <li>• {userPreferences.adults} vuxna i hushållet</li>}
                          {userPreferences.children > 0 && <li>• {userPreferences.children} barn</li>}
                          {userPreferences.diet_type && <li>• Kosttyp: {userPreferences.diet_type}</li>}
                          {userPreferences.allergies?.length > 0 && (
                            <li>• Allergier: {userPreferences.allergies.join(', ')}</li>)}
                          {userPreferences.fitness_goals && <li>• Mål: {userPreferences.fitness_goals}</li>}
                          {userPreferences.weekday_time && <li>• Tid vardagar: {userPreferences.weekday_time}</li>}
                        </ul>
                      </CollapsibleSection>
                    )}

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                        {error}
                      </div>
                    )}
                  </div>
                )}

                {/* GENERATING STEP */}
                {step === 'generating' && (
                  <div className="text-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="text-6xl mb-4 inline-block"
                    >
                      🤖
                    </motion.div>
                    <h3 className="text-xl font-bold mb-2">AI tänker...</h3>
                    <p className="text-text-secondary">
                      Analyserar dina preferenser och skapar den perfekta veckan
                    </p>
                    {USE_MOCK_AI && (
                      <p className="text-xs text-gray-400 mt-4">
                        (Använder mock data - ingen API-kostnad)
                      </p>
                    )}
                  </div>
                )}

                {/* PREVIEW STEP */}
                {step === 'preview' && aiResult && (
                  <div className="space-y-6">
                    {/* Summary */}
                    <CollapsibleSection
                      title={`AI:s översikt för veckan`}
                      icon="📊"
                      variant="success"
                      defaultOpen
                    >
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {aiResult.overall_reasoning}
                      </p>
                    </CollapsibleSection>

                    {/* Recipe previews */}
                    <div>
                      <h3 className="font-bold text-lg mb-4">
                        Föreslagna rätter ({acceptedDays.size} av {options.days} valda)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {aiResult.recipes.map((recipe, index) => (
                          <RecipePreviewCard
                            key={index}
                            day={index + 1}
                            recipe={recipe}
                            reason={aiResult.reasons[index]}
                            onAccept={() => toggleDay(index + 1)}
                            onReject={() => toggleDay(index + 1)}
                            isAccepted={acceptedDays.has(index + 1)}
                            isRejected={rejectedDays.has(index + 1)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Nutritional balance */}
                    <CollapsibleSection
                      title="Näringsbalans"
                      icon="🥗"
                    >
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {aiResult.nutritional_balance}
                      </p>
                    </CollapsibleSection>

                    {/* Tips */}
                    <CollapsibleSection
                      title={`Tips & Råd (${aiResult.tips.length})`}
                      icon="💡"
                    >
                      <ul className="space-y-2">
                        {aiResult.tips.map((tip, index) => (
                          <li key={index} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                            <span className="text-primary">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleSection>
                  </div>
                )}

                {/* ERROR STEP */}
                {step === 'error' && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-bold mb-2">Något gick fel</h3>
                    <p className="text-text-secondary mb-6">{error}</p>
                    <button
                      onClick={() => setStep('config')}
                      className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark"
                    >
                      Försök igen
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0">
                {step === 'config' && (
                  <>
                    <button
                      onClick={handleClose}
                      className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={generateWithAI}
                      className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
                    >
                      🤖 Skapa med AI
                    </button>
                  </>
                )}

                {step === 'preview' && (
                  <>
                    <button
                      onClick={() => setStep('config')}
                      className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                    >
                      ← Tillbaka
                    </button>
                    <button
                      onClick={applyPlan}
                      disabled={acceptedDays.size === 0}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ✓ Godkänn & Lägg till ({acceptedDays.size})
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

function buildUserContext(prefs: any): string {
  if (!prefs) return 'ANVÄNDARPROFIL: Inga preferenser satta.'

  const parts = ['ANVÄNDARPROFIL:']
  
  if (prefs.adults || prefs.children) {
    parts.push(`Hushåll: ${prefs.adults || 0} vuxna, ${prefs.children || 0} barn`)
  }
  
  if (prefs.diet_type) {
    parts.push(`Kost: ${prefs.diet_type}`)
  }
  
  if (prefs.allergies?.length > 0) {
    parts.push(`Allergier: ${prefs.allergies.join(', ')} (UNDVIK DESSA!)`)
  }
  
  if (prefs.avoid_foods?.length > 0) {
    parts.push(`Ogillar: ${prefs.avoid_foods.join(', ')}`)
  }
  
  if (prefs.love_foods?.length > 0) {
    parts.push(`Favoriter: ${prefs.love_foods.join(', ')} (prioritera dessa)`)
  }
  
  if (prefs.fitness_goals) {
    parts.push(`Träningsmål: ${prefs.fitness_goals}`)
  }
  
  if (prefs.weekday_time) {
    parts.push(`Tid vardagar: ${prefs.weekday_time}`)
  }
  
  if (prefs.budget_level) {
    parts.push(`Budget: ${prefs.budget_level}`)
  }
  
  return parts.join('\n')
}