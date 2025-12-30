import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { getCategoryInfo } from '@shared/ingredientCategories'
import type { ShoppingListItem } from '@shared/shoppingListTypes'

interface ShoppingListStatisticsProps {
  items: ShoppingListItem[]
}

export function ShoppingListStatistics({ items }: ShoppingListStatisticsProps) {
  
  const stats = useMemo(() => {
    const total = items.length
    const checked = items.filter(i => i.checked).length
    const unchecked = total - checked
    const percentage = total > 0 ? Math.round((checked / total) * 100) : 0
    
    // Category breakdown
    const byCategory = new Map<string, { count: number; checked: number; icon: string; name: string }>()
    items.forEach(item => {
      const info = getCategoryInfo(item.category)
      if (!info) return
      
      const key = item.category
      if (!byCategory.has(key)) {
        byCategory.set(key, { count: 0, checked: 0, icon: info.icon, name: info.name_sv })
      }
      const cat = byCategory.get(key)!
      cat.count++
      if (item.checked) cat.checked++
    })
    
    // Warnings count
    const warningsCount = items.filter(i => i.freshness_warning).length
    
    // Most common category
    const sortedCategories = Array.from(byCategory.entries())
      .sort((a, b) => b[1].count - a[1].count)
    const topCategory = sortedCategories[0]
    
    return {
      total,
      checked,
      unchecked,
      percentage,
      byCategory: Array.from(byCategory.entries()),
      warningsCount,
      topCategory
    }
  }, [items])
  
  return (
    <div className="bg-gradient-to-br from-primary-light to-secondary-light rounded-2xl p-6">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <span>📊</span>
        <span>Statistik</span>
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total items */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/80 backdrop-blur rounded-xl p-4 text-center"
        >
          <div className="text-3xl font-bold text-primary">{stats.total}</div>
          <div className="text-sm text-text-secondary mt-1">Totalt varor</div>
        </motion.div>
        
        {/* Checked */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur rounded-xl p-4 text-center"
        >
          <div className="text-3xl font-bold text-green-600">{stats.checked}</div>
          <div className="text-sm text-text-secondary mt-1">Klara</div>
        </motion.div>
        
        {/* Unchecked */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur rounded-xl p-4 text-center"
        >
          <div className="text-3xl font-bold text-orange-600">{stats.unchecked}</div>
          <div className="text-sm text-text-secondary mt-1">Kvar</div>
        </motion.div>
        
        {/* Progress percentage */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur rounded-xl p-4 text-center"
        >
          <div className="text-3xl font-bold text-primary">{stats.percentage}%</div>
          <div className="text-sm text-text-secondary mt-1">Genomfört</div>
        </motion.div>
      </div>
      
      {/* Category breakdown */}
      {stats.byCategory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 bg-white/80 backdrop-blur rounded-xl p-4"
        >
          <h4 className="font-semibold text-sm mb-3">Per kategori:</h4>
          <div className="space-y-2">
            {stats.byCategory.slice(0, 5).map(([key, data]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xl">{data.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{data.name}</span>
                    <span className="text-xs text-text-secondary">
                      {data.checked}/{data.count}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(data.checked / data.count) * 100}%` }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      className="h-full bg-green-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {stats.byCategory.length > 5 && (
            <p className="text-xs text-text-secondary mt-2 text-center">
              + {stats.byCategory.length - 5} kategorier till
            </p>
          )}
        </motion.div>
      )}
      
      {/* Warnings */}
      {stats.warningsCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4 bg-orange-50 border-2 border-orange-200 rounded-xl p-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-orange-900">
                {stats.warningsCount} vara{stats.warningsCount !== 1 ? 'or' : ''} med varning
              </p>
              <p className="text-xs text-orange-800">
                Kontrollera färskhet och lagringstips
              </p>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Top category insight */}
      {stats.topCategory && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">{stats.topCategory[1].icon}</span>
            <div>
              <p className="font-semibold text-blue-900">
                Mest: {stats.topCategory[1].name}
              </p>
              <p className="text-xs text-blue-800">
                {stats.topCategory[1].count} varor i denna kategori
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
