import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCategoryInfo } from '@shared/ingredientCategories'
import { ShoppingListStatistics } from './ShoppingListStatistics'
import type { ShoppingListItem } from '@shared/shoppingListTypes'

interface MiniStatsBarProps {
  items: ShoppingListItem[]
  expanded: boolean
  onToggle: () => void
}

export function MiniStatsBar({ items, expanded, onToggle }: MiniStatsBarProps) {
  
  const miniStats = useMemo(() => {
    // Get top 3 categories by item count
    const byCategory = new Map<string, { count: number; icon: string; name: string; unchecked: number }>()
    
    items.forEach(item => {
      const info = getCategoryInfo(item.category)
      if (!info) return
      
      const key = item.category
      if (!byCategory.has(key)) {
        byCategory.set(key, { count: 0, icon: info.icon, name: info.name_sv, unchecked: 0 })
      }
      const cat = byCategory.get(key)!
      cat.count++
      if (!item.checked) cat.unchecked++
    })
    
    const topCategories = Array.from(byCategory.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
    
    return topCategories
  }, [items])
  
  if (miniStats.length === 0) return null
  
  return (
    <div className="space-y-2">
      {/* Mini bar - always visible */}
      <button
        onClick={onToggle}
        className="w-full bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-xl px-4 py-3 transition-all border-2 border-transparent hover:border-primary/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-lg">📊</span>
            {miniStats.map((cat, i) => (
              <span key={i} className="text-sm font-medium">
                {cat.icon} {cat.name} <span className="text-primary font-bold">{cat.unchecked}</span>
              </span>
            ))}
          </div>
          <span className="text-lg ml-2">
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>
      
      {/* Expanded statistics */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ShoppingListStatistics items={items} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
