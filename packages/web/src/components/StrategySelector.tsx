import { useState } from 'react'
import { motion } from 'framer-motion'
import type { FreshnessWarning } from '@shared/shoppingListTypes'

interface StrategySelectorProps {
  warnings: FreshnessWarning[]
  totalIngredients: number
  perishableCount: number
  safeCount: number
  onSelect: (strategy: 'include_all' | 'exclude_perishables' | 'split_lists' | 'custom') => void
  onBack: () => void
}

export function StrategySelector({
  warnings,
  totalIngredients,
  perishableCount,
  safeCount,
  onSelect,
  onBack
}: StrategySelectorProps) {
  
  const [selectedStrategy, setSelectedStrategy] = useState<string>('split_lists')
  
  const strategies = [
    {
      id: 'include_all',
      icon: '❄️',
      title: 'Inkludera allt (jag fryser in)',
      description: '1 lista med alla varor. Du ansvarar för att frysa färskvaror.',
      stats: `${totalIngredients} varor`,
      color: 'blue',
      recommended: false
    },
    {
      id: 'exclude_perishables',
      icon: '📦',
      title: 'Endast hållbara varor',
      description: 'Exkludera färskvaror som inte håller. Du måste handla igen senare.',
      stats: `${safeCount} varor (${perishableCount} exkluderade)`,
      color: 'orange',
      recommended: false
    },
    {
      id: 'split_lists',
      icon: '✂️',
      title: 'Dela upp i 2 listor',
      description: 'Lista 1 för närmaste veckorna, Lista 2 för senare. Allt färskt!',
      stats: 'Handla två gånger',
      color: 'green',
      recommended: warnings.length > 2
    },
    {
      id: 'custom',
      icon: '⚙️',
      title: 'Anpassad filtrering',
      description: 'Välj själv vilka kategorier du vill inkludera/exkludera.',
      stats: 'Full kontroll',
      color: 'purple',
      recommended: false
    }
  ]
  
  const handleSelect = () => {
    onSelect(selectedStrategy as any)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-5xl mb-3">🎛️</div>
        <h3 className="text-xl font-bold mb-2">Hur vill du hantera färskvaror?</h3>
        <p className="text-text-secondary">
          Välj strategi baserat på dina möjligheter
        </p>
      </div>
      
      {/* Strategy options */}
      <div className="space-y-3">
        {strategies.map((strategy, index) => {
          const isSelected = selectedStrategy === strategy.id
          const colorClasses = {
            blue: 'border-blue-300 bg-blue-50 hover:border-blue-500',
            orange: 'border-orange-300 bg-orange-50 hover:border-orange-500',
            green: 'border-green-300 bg-green-50 hover:border-green-500',
            purple: 'border-purple-300 bg-purple-50 hover:border-purple-500'
          }
          
          return (
            <motion.button
              key={strategy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedStrategy(strategy.id)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary-light ring-2 ring-primary ring-opacity-30'
                  : colorClasses[strategy.color as keyof typeof colorClasses]
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{strategy.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold">{strategy.title}</h4>
                    {strategy.recommended && (
                      <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full font-medium">
                        REKOMMENDERAT
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mb-2">
                    {strategy.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">
                      → {strategy.stats}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-primary text-2xl">✓</span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
      
      {/* Info boxes based on selection */}
      {selectedStrategy === 'include_all' && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <span className="text-xl">💡</span>
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Tips för infrysnig:</p>
              <ul className="space-y-1 text-blue-800">
                <li>• Frys färsk fisk och kött direkt när du kommer hem</li>
                <li>• Portionera köttfärs innan du fryser</li>
                <li>• Märk fryspåsar med innehåll och datum</li>
                <li>• Färska grönsaker fryser ofta dåligt (sallad, tomat)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {selectedStrategy === 'exclude_perishables' && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
          <div className="flex gap-3">
            <span className="text-xl">⚠️</span>
            <div className="text-sm text-orange-900">
              <p className="font-semibold mb-1">Kom ihåg:</p>
              <p className="text-orange-800">
                Du kommer behöva handla igen senare för färsk fisk, kött och grönsaker. 
                Planera in ett extra shoppingtillfälle!
              </p>
            </div>
          </div>
        </div>
      )}
      
      {selectedStrategy === 'split_lists' && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
          <div className="flex gap-3">
            <span className="text-xl">✅</span>
            <div className="text-sm text-green-900">
              <p className="font-semibold mb-1">Smart val!</p>
              <p className="text-green-800 mb-2">
                Lista 1 täcker närmaste 2 veckorna, Lista 2 täcker resten. 
                Du får påminnelse när det är dags för Lista 2.
              </p>
              <p className="text-green-700 text-xs">
                💡 Allt förblir färskt och inget behöver frysas!
              </p>
            </div>
          </div>
        </div>
      )}
      
      {selectedStrategy === 'custom' && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
          <div className="flex gap-3">
            <span className="text-xl">⚙️</span>
            <div className="text-sm text-purple-900">
              <p className="font-semibold mb-1">Avancerat läge:</p>
              <p className="text-purple-800">
                På nästa steg kan du välja exakt vilka kategorier du vill inkludera. 
                Till exempel: endast torrvaror + mejeri från hela perioden.
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
          onClick={handleSelect}
          className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
        >
          Skapa lista(or) →
        </button>
      </div>
    </div>
  )
}
