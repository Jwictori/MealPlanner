import { motion, AnimatePresence } from 'framer-motion'

interface ClearWeekModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  mealCount: number
}

export function ClearWeekModal({ isOpen, onClose, onConfirm, mealCount }: ClearWeekModalProps) {
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
              className="bg-surface rounded-2xl shadow-2xl p-6 max-w-md w-full"
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🗑️</div>
                <h3 className="text-xl font-bold mb-2">Rensa veckan?</h3>
                <p className="text-text-secondary">
                  {mealCount > 0 
                    ? `Du har ${mealCount} måltid${mealCount !== 1 ? 'er' : ''} planerade denna vecka. Vill du ta bort alla?`
                    : 'Det finns inga måltider att ta bort denna vecka.'
                  }
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Avbryt
                </button>
                <button
                  onClick={() => {
                    onConfirm()
                    onClose()
                  }}
                  disabled={mealCount === 0}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🗑️ Rensa vecka
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
