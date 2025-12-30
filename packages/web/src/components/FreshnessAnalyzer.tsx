import { motion } from 'framer-motion'
import { getCategoryInfo } from '@shared/ingredientCategories'
import type { FreshnessWarning } from '@shared/shoppingListTypes'

interface FreshnessAnalyzerProps {
  warnings: FreshnessWarning[]
  totalIngredients: number
  onContinue: () => void
  onBack: () => void
}

export function FreshnessAnalyzer({
  warnings,
  totalIngredients,
  onContinue,
  onBack
}: FreshnessAnalyzerProps) {
  
  const highWarnings = warnings.filter(w => w.severity === 'high')
  const mediumWarnings = warnings.filter(w => w.severity === 'medium')
  const safeItems = totalIngredients - warnings.reduce((sum, w) => sum + w.item_count, 0)
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-5xl mb-3">📊</div>
        <h3 className="text-xl font-bold mb-2">Analys av din inköpslista</h3>
        <p className="text-text-secondary">
          Hittade {totalIngredients} ingredienser från dina recept
        </p>
      </div>
      
      {/* Warnings */}
      {warnings.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-bold text-yellow-900 mb-1">
                  Varningar om hållbarhet
                </h4>
                <p className="text-sm text-yellow-800">
                  Några ingredienser håller inte hela perioden. Se detaljer nedan.
                </p>
              </div>
            </div>
          </div>
          
          {/* High severity warnings */}
          {highWarnings.map((warning, index) => {
            const categoryInfo = getCategoryInfo(warning.category)
            if (!categoryInfo) return null // Skip unknown categories
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-red-50 border-2 border-red-200 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{categoryInfo.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-red-900 mb-1">
                      {categoryInfo.name_sv} ({warning.item_count} st)
                    </h4>
                    <p className="text-sm text-red-800 mb-2">
                      Håller max {categoryInfo.shelfLife} dag{categoryInfo.shelfLife !== 1 ? 'ar' : ''} i kyl
                    </p>
                    <div className="bg-white/50 rounded-lg p-3 mb-2">
                      <p className="text-xs font-medium text-red-900 mb-1">Berörda varor:</p>
                      <p className="text-xs text-red-800">
                        {warning.affected_items.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-red-600">💡</span>
                      <p className="text-red-800 font-medium">{warning.recommendation}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
          
          {/* Medium severity warnings */}
          {mediumWarnings.map((warning, index) => {
            const categoryInfo = getCategoryInfo(warning.category)
            if (!categoryInfo) return null // Skip unknown categories
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (highWarnings.length + index) * 0.1 }}
                className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{categoryInfo.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-yellow-900 mb-1">
                      {categoryInfo.name_sv} ({warning.item_count} st)
                    </h4>
                    <p className="text-sm text-yellow-800 mb-2">
                      Håller max {categoryInfo.shelfLife} dagar i kyl
                    </p>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-600">💡</span>
                      <p className="text-yellow-800">{warning.recommendation}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h4 className="font-bold text-green-900 mb-2">Inga hållbarhetsproblem!</h4>
          <p className="text-sm text-green-800">
            Alla ingredienser håller sig fräscha under hela perioden.
          </p>
        </div>
      )}
      
      {/* Safe items summary */}
      {safeItems > 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <h4 className="font-semibold text-green-900">
                Torrvaror & hållbara ingredienser ({safeItems} st)
              </h4>
              <p className="text-sm text-green-800">
                Inga problem med dessa varor
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
        >
          ← Tillbaka
        </button>
        <button
          onClick={onContinue}
          className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
        >
          Välj strategi →
        </button>
      </div>
    </div>
  )
}