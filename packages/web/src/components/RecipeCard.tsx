import { useState } from 'react'
import type { Recipe } from '@shared/types'
import { motion } from 'framer-motion'

interface RecipeCardProps {
  recipe: Recipe
  onClick?: () => void
}

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const [imageError, setImageError] = useState(false)
  const hasImage = recipe.image_url && !imageError

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-surface rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer border border-gray-100 overflow-hidden"
    >
      {/* Recipe Image */}
      {hasImage ? (
        <div className="relative h-40 bg-gray-100">
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div className="h-24 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
          <span className="text-4xl opacity-50">🍽️</span>
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold mb-2 line-clamp-2">{recipe.name}</h3>

        <div className="flex items-center gap-4 text-sm text-text-secondary mb-3">
          <div className="flex items-center gap-1">
            <span>👥</span>
            <span>{recipe.servings} port</span>
          </div>
          <div className="flex items-center gap-1">
            <span>📝</span>
            <span>{(recipe.recipe_ingredients?.length ?? recipe.ingredients?.length ?? 0)} ingredienser</span>
          </div>
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recipe.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-secondary-light text-secondary text-xs font-semibold rounded-md"
              >
                {tag}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-text-secondary text-xs font-semibold rounded-md">
                +{recipe.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
