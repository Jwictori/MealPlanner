import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import type { Recipe } from '@shared/types'

interface SelectRecipeModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectRecipe: (recipeId: string) => void
  recipes: Recipe[]
  selectedDate: string | null
}

export function SelectRecipeModal({
  isOpen,
  onClose,
  onSelectRecipe,
  recipes,
  selectedDate,
}: SelectRecipeModalProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleSelect = (recipeId: string) => {
    onSelectRecipe(recipeId)
    setSearchQuery('')
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
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Välj Recept</h2>
                  {selectedDate && (
                    <p className="text-text-secondary">
                      {format(new Date(selectedDate + 'T12:00:00'), 'EEEE d MMMM', { locale: sv })}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-2xl text-text-secondary hover:text-text transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Search */}
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Sök recept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Recipe List */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredRecipes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-bold mb-2">
                    {searchQuery ? 'Inga recept hittades' : 'Inga recept än'}
                  </h3>
                  <p className="text-text-secondary">
                    {searchQuery ? 'Prova en annan sökning' : 'Skapa några recept först!'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredRecipes.map((recipe) => (
                    <motion.button
                      key={recipe.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(recipe.id)}
                      className="bg-background rounded-xl p-4 text-left hover:shadow-md transition-all border border-gray-200 hover:border-primary"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold mb-1">{recipe.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-text-secondary mb-2">
                            <span>👥 {recipe.servings} portioner</span>
                            <span>📝 {(recipe.recipe_ingredients?.length ?? recipe.ingredients?.length ?? 0)} ingredienser</span>
                          </div>
                          {recipe.tags && recipe.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {recipe.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-secondary-light text-secondary text-xs font-semibold rounded-lg"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-3xl ml-4">🍽️</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="w-full px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Avbryt
              </button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
