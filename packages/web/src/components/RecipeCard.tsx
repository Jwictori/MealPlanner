import type { Recipe } from '@shared/types'
import { motion } from 'framer-motion'

interface RecipeCardProps {
  recipe: Recipe
  onClick?: () => void
}

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-surface rounded-2xl shadow-md hover:shadow-xl transition-all p-6 cursor-pointer border border-gray-100"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-bold flex-1 pr-2">{recipe.name}</h3>
        <span className="text-2xl">🍽️</span>
      </div>

      <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
        <div className="flex items-center gap-1">
          <span>👥</span>
          <span>{recipe.servings} portioner</span>
        </div>
        <div className="flex items-center gap-1">
          <span>📝</span>
          <span>{recipe.ingredients.length} ingredienser</span>
        </div>
      </div>

      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recipe.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-secondary-light text-secondary text-xs font-semibold rounded-lg"
            >
              {tag}
            </span>
          ))}
          {recipe.tags.length > 3 && (
            <span className="px-3 py-1 bg-gray-100 text-text-secondary text-xs font-semibold rounded-lg">
              +{recipe.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}
