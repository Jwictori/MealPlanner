import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Recipe } from '@shared/types'

interface AIMealPlannerProps {
  isOpen: boolean
  onClose: () => void
  recipes: Recipe[]
  userPreferences: any
  onGenerate: (selectedRecipes: Recipe[]) => void
}

interface PlanningOptions {
  days: number
  focusArea: 'balanced' | 'protein' | 'budget' | 'quick' | 'variety'
  customInstructions: string
}

export function AIMealPlanner({ isOpen, onClose, recipes, userPreferences, onGenerate }: AIMealPlannerProps) {
  const [options, setOptions] = useState<PlanningOptions>({
    days: 7,
    focusArea: 'balanced',
    customInstructions: '',
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiReasoning, setAiReasoning] = useState<string>('')
  const [error, setError] = useState<string>('')

  const generateWithAI = async () => {
    if (recipes.length < options.days) {
      setError(`Du behöver minst ${options.days} recept för att planera ${options.days} dagar.`)
      return
    }

    setIsGenerating(true)
    setError('')
    setAiReasoning('')

    try {
      // Build context about user
      const userContext = buildUserContext(userPreferences)
      
      // Build recipes list
      const recipesList = recipes.map(r => ({
        name: r.name,
        tags: r.tags || [],
        servings: r.servings,
        ingredients: r.ingredients.map(i => i.name).filter(Boolean),
      }))

      // Call Supabase Edge Function
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

      // Log full response for debugging
      console.log('🤖 AI Response:', aiResponse)

      // Parse JSON response - handle markdown code blocks
      let jsonText = aiResponse.trim()
      
      // Remove markdown code blocks if present (```json and ```)
      if (jsonText.startsWith('```')) {
        // Find the actual JSON (between first ``` and last ```)
        const lines = jsonText.split('\n')
        // Remove first line (```json or ```) and last line (```)
        jsonText = lines.slice(1, -1).join('\n')
      }
      
      // Try to find JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('Could not find JSON in response:', aiResponse)
        throw new Error('Kunde inte tolka AI-svar')
      }

      let planData
      try {
        planData = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Tried to parse:', jsonMatch[0].substring(0, 200))
        throw new Error('Ogiltigt JSON-format från AI')
      }

      // Map recipe names to actual recipes
      const selectedRecipes: Recipe[] = []
      for (const day of planData.meal_plan) {
        const recipe = recipes.find(r => r.name === day.recipe_name)
        if (recipe) {
          selectedRecipes.push(recipe)
        }
      }

      if (selectedRecipes.length < options.days) {
        throw new Error('AI kunde inte matcha alla recept')
      }

      // Set reasoning for display
      const reasoning = `
📊 **AI:s Resonemang:**

${planData.overall_reasoning}

**Näringsbalans:**
${planData.nutritional_balance}

**Daglig plan:**
${planData.meal_plan.map((d: any) => `
**Dag ${d.day}:** ${d.recipe_name}
💡 ${d.reason}
`).join('\n')}

**Tips:**
${planData.tips.map((t: string) => `• ${t}`).join('\n')}
      `.trim()

      setAiReasoning(reasoning)
      
      // Wait a bit to show reasoning
      setTimeout(() => {
        onGenerate(selectedRecipes)
        setIsGenerating(false)
      }, 2000)

    } catch (err) {
      console.error('AI generation error:', err)
      setError('⚠️ AI-planering kräver att Edge Function är deployed i Supabase. Använd Snabbplanering istället, eller följ deployment-guiden.')
      setIsGenerating(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-surface rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                      🤖 AI Matplanerare
                    </h2>
                    <p className="text-text-secondary">
                      Låt AI planera din vecka baserat på dina preferenser
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-2xl text-text-secondary hover:text-text transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!isGenerating && !aiReasoning && (
                  <>
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
                      <div className="grid grid-cols-2 gap-3">
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
                            <div className="font-semibold">{focus.label}</div>
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
                      <div className="bg-secondary-light rounded-xl p-4">
                        <p className="text-sm font-semibold mb-2">📋 AI kommer att ta hänsyn till:</p>
                        <ul className="text-sm text-text-secondary space-y-1">
                          {userPreferences.adults && <li>• {userPreferences.adults} vuxna i hushållet</li>}
                          {userPreferences.children > 0 && <li>• {userPreferences.children} barn</li>}
                          {userPreferences.diet_type && <li>• Kosttyp: {userPreferences.diet_type}</li>}
                          {userPreferences.allergies?.length > 0 && (
                            <li>• Allergier: {userPreferences.allergies.join(', ')}</li>
                          )}
                          {userPreferences.fitness_goals && <li>• Mål: {userPreferences.fitness_goals}</li>}
                          {userPreferences.weekday_time && <li>• Tid vardagar: {userPreferences.weekday_time}</li>}
                        </ul>
                      </div>
                    )}

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                        {error}
                      </div>
                    )}
                  </>
                )}

                {isGenerating && !aiReasoning && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4 animate-bounce">🤖</div>
                    <h3 className="text-xl font-bold mb-2">AI tänker...</h3>
                    <p className="text-text-secondary">
                      Analyserar dina preferenser och skapar den perfekta veckan
                    </p>
                  </div>
                )}

                {aiReasoning && (
                  <div className="bg-primary-light rounded-xl p-6">
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                      {aiReasoning}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  {aiReasoning ? 'Stäng' : 'Avbryt'}
                </button>
                {!aiReasoning && (
                  <button
                    onClick={generateWithAI}
                    disabled={isGenerating}
                    className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all disabled:opacity-50"
                  >
                    {isGenerating ? 'Genererar...' : '🤖 Skapa med AI'}
                  </button>
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