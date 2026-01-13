import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Recipe, ImportFeedback, ImportIssueCategory } from '@shared/types'

interface RecipeDetailModalProps {
  recipe: Recipe | null
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

// Issue categories for negative feedback
const ISSUE_CATEGORIES: { value: ImportIssueCategory; label: string }[] = [
  { value: 'ingredients_wrong', label: 'Ingredienser fel' },
  { value: 'instructions_wrong', label: 'Instruktioner fel' },
  { value: 'groups_wrong', label: 'Grupperingar fel' },
  { value: 'units_wrong', label: 'Enheter fel' },
  { value: 'translation_wrong', label: 'Översättning fel' },
  { value: 'missing_data', label: 'Saknad data' },
  { value: 'other', label: 'Annat' },
]

export function RecipeDetailModal({ recipe, isOpen, onClose, onEdit, onDelete }: RecipeDetailModalProps) {
  const [feedbackState, setFeedbackState] = useState<'none' | 'selecting' | 'submitted'>('none')
  const [issueCategory, setIssueCategory] = useState<ImportIssueCategory | null>(null)
  const [feedbackDetails, setFeedbackDetails] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

  if (!recipe) return null

  // Check if this is a system recipe
  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'
  const isSystemRecipe = recipe.user_id === SYSTEM_USER_ID

  // Check if this is an imported recipe (has import_domain or source_url)
  const isImportedRecipe = !!(recipe.import_domain || recipe.source_url)
  const importDomain = recipe.import_domain || (recipe.source_url ? new URL(recipe.source_url).hostname.replace('www.', '') : '')

  const handleFeedbackSubmit = async (feedback: ImportFeedback) => {
    setFeedbackLoading(true)
    setFeedbackError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Inte inloggad')

      const feedbackData = {
        recipe_id: recipe.id,
        user_id: user.id,
        domain: importDomain,
        feedback,
        issue_category: feedback === 'thumbs_down' ? issueCategory : null,
        feedback_details: feedbackDetails || null,
        import_method: recipe.import_method || null,
      }

      const { error } = await supabase
        .from('recipe_import_feedback')
        .upsert(feedbackData, { onConflict: 'recipe_id,user_id' })

      if (error) throw error

      // Update recipe to mark feedback as given
      await supabase
        .from('recipes')
        .update({ import_feedback_requested: true })
        .eq('id', recipe.id)

      setFeedbackState('submitted')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Kunde inte spara feedback'
      setFeedbackError(errorMessage)
    } finally {
      setFeedbackLoading(false)
    }
  }

  const handleThumbsUp = () => {
    handleFeedbackSubmit('thumbs_up')
  }

  const handleThumbsDown = () => {
    setSelectedFeedback('thumbs_down')
    setFeedbackState('selecting')
  }

  const submitThumbsDown = () => {
    handleFeedbackSubmit('thumbs_down')
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

          {/* Modal Container - FLEXBOX CENTERED */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-surface rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-2">{recipe.name}</h2>
                  <div className="flex items-center gap-4 text-text-secondary">
                    <span>👥 {recipe.servings} portioner</span>
                    <span>📝 {(recipe.recipe_ingredients?.length ?? recipe.ingredients?.length ?? 0)} ingredienser</span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-2xl text-text-secondary hover:text-text transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Recipe Image */}
                {recipe.image_url && (
                  <div className="rounded-xl overflow-hidden">
                    <img
                      src={recipe.image_url}
                      alt={recipe.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        // Hide image if it fails to load
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}

                {/* Source Link (for imported recipes) */}
                {recipe.source_url && (
                  <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-2">
                    <span className="text-blue-600">🔗</span>
                    <a
                      href={recipe.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline text-sm truncate"
                    >
                      {new URL(recipe.source_url).hostname.replace('www.', '')}
                    </a>
                    <span className="text-xs text-blue-500 ml-auto">Originalrecept</span>
                  </div>
                )}

                {/* Import Feedback Section */}
                {isImportedRecipe && !isSystemRecipe && !recipe.import_feedback_requested && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    {feedbackState === 'none' && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-amber-800">
                            Hur blev importen?
                          </p>
                          <p className="text-xs text-amber-600 mt-1">
                            Din feedback hjälper oss förbättra importen från {importDomain}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleThumbsUp}
                            disabled={feedbackLoading}
                            className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors disabled:opacity-50"
                            title="Bra import"
                          >
                            👍
                          </button>
                          <button
                            onClick={handleThumbsDown}
                            disabled={feedbackLoading}
                            className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors disabled:opacity-50"
                            title="Problem med importen"
                          >
                            👎
                          </button>
                        </div>
                      </div>
                    )}

                    {feedbackState === 'selecting' && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-amber-800">
                          Vad var fel med importen?
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {ISSUE_CATEGORIES.map((cat) => (
                            <button
                              key={cat.value}
                              onClick={() => setIssueCategory(cat.value)}
                              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                issueCategory === cat.value
                                  ? 'bg-amber-500 text-white border-amber-500'
                                  : 'bg-white text-amber-700 border-amber-300 hover:border-amber-400'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={feedbackDetails}
                          onChange={(e) => setFeedbackDetails(e.target.value)}
                          placeholder="Valfritt: Beskriv problemet..."
                          className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg resize-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setFeedbackState('none')
                              setIssueCategory(null)
                              setFeedbackDetails('')
                            }}
                            className="px-3 py-1 text-sm text-amber-600 hover:text-amber-800"
                          >
                            Avbryt
                          </button>
                          <button
                            onClick={submitThumbsDown}
                            disabled={feedbackLoading || !issueCategory}
                            className="px-4 py-1 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                          >
                            {feedbackLoading ? 'Skickar...' : 'Skicka'}
                          </button>
                        </div>
                      </div>
                    )}

                    {feedbackState === 'submitted' && (
                      <div className="text-center py-2">
                        <p className="text-sm text-green-700 font-medium">
                          ✓ Tack för din feedback!
                        </p>
                      </div>
                    )}

                    {feedbackError && (
                      <p className="text-xs text-red-600 mt-2">{feedbackError}</p>
                    )}
                  </div>
                )}

                {/* Tags */}
                {recipe.tags && recipe.tags.length > 0 && (
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {recipe.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-secondary-light text-secondary rounded-lg text-sm font-semibold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ingredients */}
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    🥘 Ingredienser
                  </h3>
                  <div className="bg-background rounded-xl p-4">
                    {/* Support both new (recipe_ingredients) and legacy (ingredients) formats */}
                    {(recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0) ? (
                      (() => {
                        // Group ingredients by ingredient_group
                        const groups: { [key: string]: typeof recipe.recipe_ingredients } = {}
                        const ungrouped: typeof recipe.recipe_ingredients = []

                        recipe.recipe_ingredients!.forEach(ing => {
                          if (ing.ingredient_group) {
                            if (!groups[ing.ingredient_group]) {
                              groups[ing.ingredient_group] = []
                            }
                            groups[ing.ingredient_group]!.push(ing)
                          } else {
                            ungrouped.push(ing)
                          }
                        })

                        const groupNames = Object.keys(groups)

                        const renderIngredient = (ingredient: NonNullable<typeof recipe.recipe_ingredients>[number], index: number) => {
                          const hasAmount = ingredient.quantity != null && ingredient.quantity > 0
                          const hasUnit = ingredient.unit != null && ingredient.unit !== ''
                          const quantityStr = hasAmount ? String(ingredient.quantity) : ''
                          const unitStr = hasUnit ? ingredient.unit : ''
                          const amountDisplay = [quantityStr, unitStr].filter(Boolean).join(' ')

                          return (
                            <div key={index} className="flex items-center gap-3 py-2">
                              <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                              {amountDisplay ? (
                                <>
                                  <span className="font-semibold text-text min-w-[60px]">
                                    {amountDisplay}
                                  </span>
                                  <span className="text-text-secondary">{ingredient.ingredient_name}</span>
                                </>
                              ) : (
                                <span className="text-text-secondary">{ingredient.ingredient_name}</span>
                              )}
                            </div>
                          )
                        }

                        return (
                          <div className="space-y-1">
                            {/* Render ungrouped ingredients first */}
                            {ungrouped.map((ing, idx) => renderIngredient(ing, idx))}

                            {/* Render each group with header */}
                            {groupNames.map((groupName, groupIndex) => (
                              <div key={groupName} className={groupIndex === 0 && ungrouped.length === 0 ? '' : 'mt-4 pt-3 border-t border-gray-200'}>
                                <h4 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-2">
                                  {groupName}
                                </h4>
                                {groups[groupName]!.map((ing, idx) => renderIngredient(ing, idx + 1000 + groupIndex * 100))}
                              </div>
                            ))}
                          </div>
                        )
                      })()
                    ) : recipe.ingredients?.map((ingredient, index) => {
                      const hasAmount = ingredient.amount != null && ingredient.amount > 0
                      const hasUnit = ingredient.unit != null && ingredient.unit !== ''
                      const quantityStr = hasAmount ? String(ingredient.amount) : ''
                      const unitStr = hasUnit ? ingredient.unit : ''
                      const amountDisplay = [quantityStr, unitStr].filter(Boolean).join(' ')

                      return (
                        <div key={index} className="flex items-center gap-3 py-2">
                          <span className="w-2 h-2 bg-primary rounded-full" />
                          {amountDisplay ? (
                            <>
                              <span className="font-semibold text-text min-w-[60px]">
                                {amountDisplay}
                              </span>
                              <span className="text-text-secondary">{ingredient.name}</span>
                            </>
                          ) : (
                            <span className="text-text-secondary">{ingredient.name}</span>
                          )}
                        </div>
                      )
                    }) ?? <p className="text-text-secondary">Inga ingredienser</p>}
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    👨‍🍳 Instruktioner
                  </h3>
                  <div className="bg-background rounded-xl p-6">
                    {/* Prefer instructions_steps with sections, fallback to plain text */}
                    {recipe.instructions_steps && recipe.instructions_steps.length > 0 ? (
                      (() => {
                        // Group steps by section
                        let currentSection: string | null = null
                        const elements: React.ReactNode[] = []

                        recipe.instructions_steps.forEach((step, index) => {
                          // Check if we're entering a new section
                          if (step.section && step.section !== currentSection) {
                            currentSection = step.section
                            elements.push(
                              <h4 key={`section-${index}`} className="text-sm font-semibold text-secondary uppercase tracking-wide mt-4 mb-2 first:mt-0">
                                {step.section}
                              </h4>
                            )
                          }

                          elements.push(
                            <div key={`step-${index}`} className="flex gap-3 py-2">
                              <span className="flex-shrink-0 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {step.step}
                              </span>
                              <p className="text-text leading-relaxed pt-0.5">{step.instruction}</p>
                            </div>
                          )
                        })

                        return <div className="space-y-1">{elements}</div>
                      })()
                    ) : (
                      <p className="text-text whitespace-pre-wrap leading-relaxed">
                        {recipe.instructions}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 flex gap-3">
                {isSystemRecipe ? (
                  <>
                    <div className="flex-1 px-6 py-3 bg-secondary-light text-secondary rounded-xl font-semibold text-center">
                      📖 MealPlanner Recept
                    </div>
                    <button
                      onClick={onClose}
                      className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
                    >
                      Stäng
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={onDelete}
                      className="px-6 py-3 border border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all"
                    >
                      🗑️ Ta bort
                    </button>
                    <button
                      onClick={onEdit}
                      className="flex-1 px-6 py-3 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary-dark transition-all"
                    >
                      ✏️ Redigera
                    </button>
                    <button
                      onClick={onClose}
                      className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
                    >
                      Stäng
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