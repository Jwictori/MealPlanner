import { motion, AnimatePresence } from 'framer-motion'
import type { Recipe } from '@shared/types'

interface RecipeDetailModalProps {
  recipe: Recipe | null
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function RecipeDetailModal({ recipe, isOpen, onClose, onEdit, onDelete }: RecipeDetailModalProps) {
  if (!recipe) return null

  // Check if this is a system recipe
  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'
  const isSystemRecipe = recipe.user_id === SYSTEM_USER_ID

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
                    <span>📝 {recipe.ingredients.length} ingredienser</span>
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
                  <div className="bg-background rounded-xl p-4 space-y-2">
                    {recipe.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center gap-3 py-2">
                        <span className="w-2 h-2 bg-primary rounded-full" />
                        <span className="font-semibold text-text">
                          {ingredient.amount} {ingredient.unit}
                        </span>
                        <span className="text-text-secondary">{ingredient.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    👨‍🍳 Instruktioner
                  </h3>
                  <div className="bg-background rounded-xl p-6">
                    <p className="text-text whitespace-pre-wrap leading-relaxed">
                      {recipe.instructions}
                    </p>
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