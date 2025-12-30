import { motion, AnimatePresence } from 'framer-motion'

interface PopulateChoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onChoice: (mode: 'fill' | 'replace') => void
  emptyDays: number
  filledDays: number
}

export function PopulateChoiceModal({ 
  isOpen, 
  onClose, 
  onChoice,
  emptyDays,
  filledDays
}: PopulateChoiceModalProps) {
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
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">Hur vill du planera?</h3>
                <p className="text-text-secondary text-sm">
                  Du har redan {filledDays} dag{filledDays !== 1 ? 'ar' : ''} planerade och {emptyDays} tom{emptyDays !== 1 ? 'ma' : ''}.
                </p>
              </div>

              <div className="space-y-3">
                {/* Fill empty days */}
                <button
                  onClick={() => {
                    onChoice('fill')
                    onClose()
                  }}
                  className="w-full p-4 border-2 border-green-300 rounded-xl text-left hover:bg-green-50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">➕</span>
                    <div className="flex-1">
                      <div className="font-semibold mb-1">
                        Fyll endast tomma dagar ({emptyDays} st)
                      </div>
                      <div className="text-sm text-text-secondary">
                        Befintliga måltider behålls. Nya recept läggs till på tomma dagar.
                      </div>
                    </div>
                  </div>
                </button>

                {/* Replace all */}
                <button
                  onClick={() => {
                    onChoice('replace')
                    onClose()
                  }}
                  className="w-full p-4 border-2 border-orange-300 rounded-xl text-left hover:bg-orange-50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🔄</span>
                    <div className="flex-1">
                      <div className="font-semibold mb-1">
                        Ersätt ALLA dagar (7 st)
                      </div>
                      <div className="text-sm text-text-secondary">
                        Tar bort befintliga måltider och skapar en helt ny veckoplan.
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full mt-4 px-4 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Avbryt
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
