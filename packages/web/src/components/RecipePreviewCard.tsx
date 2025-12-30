import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Recipe } from '@shared/types'

interface RecipePreviewCardProps {
  day: number
  recipe: Recipe | null
  reason: string
  onAccept: () => void
  onReject: () => void
  isAccepted: boolean
  isRejected: boolean
}

const DAY_NAMES = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']

export function RecipePreviewCard({
  day,
  recipe,
  reason,
  onAccept,
  onReject,
  isAccepted,
  isRejected
}: RecipePreviewCardProps) {
  const [showReason, setShowReason] = useState(false)

  if (!recipe) {
    return (
      <div className="bg-gray-100 rounded-xl p-4 text-center text-gray-400">
        <p className="text-sm">Receptet hittades inte</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (day - 1) * 0.1 }}
      className={`rounded-xl border-2 transition-all ${
        isAccepted
          ? 'border-green-500 bg-green-50'
          : isRejected
          ? 'border-red-300 bg-red-50 opacity-50'
          : 'border-gray-200 bg-white hover:border-primary'
      }`}
    >
      <div className="p-4">
        {/* Day header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase">
            Dag {day} · {DAY_NAMES[day - 1]}
          </span>
          {isAccepted && <span className="text-green-600 text-xl">✓</span>}
          {isRejected && <span className="text-red-600 text-xl">✗</span>}
        </div>

        {/* Recipe name */}
        <h3 className="font-bold text-lg mb-2">{recipe.name}</h3>

        {/* Recipe meta */}
        <div className="flex gap-2 mb-3 text-xs text-gray-600">
          <span>🍽️ {recipe.servings} port</span>
          {recipe.tags && recipe.tags.length > 0 && (
            <span className="px-2 py-0.5 bg-primary-light rounded-full">
              {recipe.tags[0]}
            </span>
          )}
        </div>

        {/* AI Reason - collapsible */}
        <div className="mb-3">
          <button
            onClick={() => setShowReason(!showReason)}
            className="text-sm text-primary font-medium flex items-center gap-1"
          >
            💡 AI:s motivering {showReason ? '▼' : '▶'}
          </button>
          {showReason && (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="text-sm text-gray-600 mt-2 leading-relaxed"
            >
              {reason}
            </motion.p>
          )}
        </div>

        {/* Action buttons */}
        {!isAccepted && !isRejected && (
          <div className="flex gap-2">
            <button
              onClick={onAccept}
              className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors text-sm"
            >
              ✓ Acceptera
            </button>
            <button
              onClick={onReject}
              className="flex-1 px-3 py-2 border-2 border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors text-sm"
            >
              ✗ Byt ut
            </button>
          </div>
        )}

        {isAccepted && (
          <button
            onClick={onReject}
            className="w-full px-3 py-2 border-2 border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
          >
            Ångra
          </button>
        )}

        {isRejected && (
          <button
            onClick={onAccept}
            className="w-full px-3 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm"
          >
            Välj ändå
          </button>
        )}
      </div>
    </motion.div>
  )
}
