import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import { getCategoryInfo } from '@shared/ingredientCategories'
import type { ShoppingListItem } from '@shared/shoppingListTypes'

interface ShoppingListItemCardProps {
  item: ShoppingListItem
  onCheck: (itemId: string, checked: boolean) => void
  onUpdateQuantity?: (itemId: string, newQuantity: number) => void
  onDelete?: (itemId: string) => void
  compact?: boolean
}

export function ShoppingListItemCard({
  item,
  onCheck,
  onUpdateQuantity: _onUpdateQuantity,
  onDelete: _onDelete,
  compact = false
}: ShoppingListItemCardProps) {
  
  const [showDetails, setShowDetails] = useState(false)
  const categoryInfo = getCategoryInfo(item.category) || {
    // Fallback for unknown categories
    key: 'PASTA_RICE' as const,
    name_sv: item.category || 'Övrigt',
    name_en: item.category || 'Other',
    icon: '📦',
    color: '#9CA3AF',
    sortOrder: 999,
    shelfLife: 30,
    freezable: false,
    tips_sv: 'Okänd kategori',
    tips_en: 'Unknown category'
  }
  
  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), 'd MMM', { locale: sv })
  }
  
  const getWarningBadge = () => {
    if (!item.freshness_warning) return null
    
    if (item.freshness_status === 'freeze') {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
          ❄️ Frys in
        </span>
      )
    }
    
    if (item.freshness_status === 'buy_later') {
      return (
        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
          ⏰ Köp senare
        </span>
      )
    }
    
    return null
  }
  
  // COMPACT MODE - Minimal single-line view
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
          item.checked
            ? 'border-green-300 bg-green-50 opacity-60 line-through'
            : 'border-gray-200 bg-white hover:bg-gray-50'
        }`}
      >
        {/* Checkbox */}
        <button
          onClick={() => onCheck(item.id, !item.checked)}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            item.checked
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 hover:border-primary'
          }`}
        >
          {item.checked && <span className="text-white text-xs">✓</span>}
        </button>
        
        {/* Icon */}
        <span className="text-lg flex-shrink-0">{categoryInfo.icon}</span>
        
        {/* Name & Quantity */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{item.ingredient_name}</span>
          <span className="text-xs text-text-secondary flex-shrink-0">
            {item.quantity} {item.unit}
          </span>
        </div>
        
        {/* Warning badge (compact) */}
        {item.freshness_warning && (
          <span className="text-lg flex-shrink-0">
            {item.freshness_status === 'freeze' ? '❄️' : '⏰'}
          </span>
        )}
      </div>
    )
  }
  
  // NORMAL MODE - Full detailed view
  return (
    <div
      className={`group rounded-lg border-2 transition-all duration-200 ${
        item.checked
          ? 'border-green-300 bg-green-50 opacity-70'
          : 'border-gray-200 bg-white hover:border-primary'
      }`}
    >
      <div className="p-3">
        {/* Main row */}
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={() => onCheck(item.id, !item.checked)}
            className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
              item.checked
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 hover:border-primary'
            }`}
          >
            {item.checked && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-white text-sm"
              >
                ✓
              </motion.span>
            )}
          </button>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold truncate ${
                  item.checked ? 'line-through text-gray-500' : ''
                }`}>
                  {item.ingredient_name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-sm font-medium ${
                    item.checked ? 'text-gray-400' : 'text-primary'
                  }`}>
                    {item.quantity} {item.unit}
                  </span>
                  {getWarningBadge()}
                </div>
              </div>
              
              {/* Category icon */}
              <span className="text-2xl flex-shrink-0">
                {categoryInfo.icon}
              </span>
            </div>
            
            {/* Usage info */}
            {item.used_on_dates.length > 0 && (
              <div className="text-xs text-text-secondary mt-2">
                Används: {item.used_on_dates.slice(0, 3).map(formatDate).join(', ')}
                {item.used_on_dates.length > 3 && ` +${item.used_on_dates.length - 3} fler`}
              </div>
            )}
            
            {/* Split info */}
            {item.split_info && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs">
                <div className="flex items-center gap-2 text-blue-900">
                  <span>✂️</span>
                  <div>
                    <span className="font-semibold">{item.split_info.buy_now} {item.unit}</span> nu
                    {' • '}
                    <span className="font-semibold">{item.split_info.buy_later} {item.unit}</span> senare
                    {item.split_info.buy_later_date && (
                      <> (köp {formatDate(item.split_info.buy_later_date)})</>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Warning message */}
            {item.freshness_warning && item.freshness_status !== 'ok' && (
              <div className={`mt-2 p-2 rounded-lg text-xs ${
                item.freshness_status === 'freeze'
                  ? 'bg-blue-50 text-blue-800'
                  : 'bg-orange-50 text-orange-800'
              }`}>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0">💡</span>
                  <p className="leading-relaxed">
                    {item.freshness_status === 'freeze'
                      ? `Håller max ${categoryInfo.shelfLife} dagar. Frys in direkt om du inte ska använda snart!`
                      : `Håller max ${categoryInfo.shelfLife} dagar. Köp närmare användning för bästa fräschör.`
                    }
                  </p>
                </div>
              </div>
            )}
            
            {/* Expandable details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-primary font-medium mt-2 hover:underline"
            >
              {showDetails ? '▼ Mindre info' : '▶ Mer info'}
            </button>
            
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 text-xs space-y-2"
                >
                  {/* Used in recipes */}
                  {item.used_in_recipes.length > 0 && (
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="font-semibold text-gray-700 mb-1">
                        Används i recept:
                      </p>
                      <p className="text-gray-600">
                        {item.used_in_recipes.length} st
                      </p>
                    </div>
                  )}
                  
                  {/* Category info */}
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="font-semibold text-gray-700 mb-1">
                      Kategori: {categoryInfo.name_sv}
                    </p>
                    <p className="text-gray-600">
                      Håller {categoryInfo.shelfLife} dagar i kyl
                      {categoryInfo.freezable && ' • Går att frysa'}
                    </p>
                  </div>
                  
                  {/* Notes */}
                  {item.notes && (
                    <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                      <p className="text-gray-700">📝 {item.notes}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}