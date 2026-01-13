import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import { CollapsibleSection } from './CollapsibleSection'
import { ShoppingListItemCard } from './ShoppingListItemCard'
import { CompactToolbar } from './CompactToolbar'
import { MiniStatsBar } from './MiniStatsBar'
import { getCategoryInfo, type IngredientCategory } from '@shared/ingredientCategories'
import type { ShoppingList, ShoppingListItem } from '@shared/shoppingListTypes'

interface ShoppingListViewProps {
  list: ShoppingList
  items: ShoppingListItem[]
  onCheckItem: (itemId: string, checked: boolean) => void
  onUpdateItem?: (itemId: string, updates: Partial<ShoppingListItem>) => void
  onDeleteItem?: (itemId: string) => void
  onMarkComplete?: () => void
  onExport?: () => void
  onDelete?: () => void
}

type SortMode = 'store_layout' | 'alphabetical' | 'checked_last'
type ViewMode = 'with_categories' | 'flat' | 'compact'

export function ShoppingListView({
  list,
  items,
  onCheckItem,
  onUpdateItem,
  onDeleteItem,
  onMarkComplete,
  onExport,
  onDelete
}: ShoppingListViewProps) {
  
  const [sortMode, setSortMode] = useState<SortMode>('store_layout')
  const [viewMode, setViewMode] = useState<ViewMode>('with_categories')
  const [hideEmptyCategories, setHideEmptyCategories] = useState(true)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<IngredientCategory[]>([])
  const [showUncheckedOnly, setShowUncheckedOnly] = useState(false)
  const [showStats, setShowStats] = useState(false)
  
  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    let filtered = items
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(item =>
        item.ingredient_name.toLowerCase().includes(term)
      )
    }
    
    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(item =>
        selectedCategories.includes(item.category)
      )
    }
    
    // Unchecked only filter
    if (showUncheckedOnly) {
      filtered = filtered.filter(item => !item.checked)
    }
    
    return filtered
  }, [items, searchTerm, selectedCategories, showUncheckedOnly])
  
  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<IngredientCategory, ShoppingListItem[]>()
    
    for (const item of filteredItems) {
      if (!grouped.has(item.category)) {
        grouped.set(item.category, [])
      }
      grouped.get(item.category)!.push(item)
    }
    
    // Sort within each category based on sortMode
    for (const [_, catItems] of grouped) {
      catItems.sort((a, b) => {
        if (sortMode === 'checked_last') {
          if (a.checked !== b.checked) return a.checked ? 1 : -1
        }
        if (sortMode === 'alphabetical') {
          return a.ingredient_name.localeCompare(b.ingredient_name, 'sv')
        }
        // Default: keep original order
        return a.order - b.order
      })
    }
    
    return grouped
  }, [filteredItems, sortMode])
  
  // Sort categories based on sortMode and store layout
  const sortedCategories = useMemo(() => {
    const categories = Array.from(itemsByCategory.keys())
    
    if (sortMode === 'store_layout') {
      // Sort by store layout order
      return categories.sort((a, b) => {
        const aInfo = getCategoryInfo(a)
        const bInfo = getCategoryInfo(b)
        if (!aInfo || !bInfo) return 0
        return aInfo.sortOrder - bInfo.sortOrder
      })
    } else if (sortMode === 'alphabetical') {
      // Sort categories alphabetically
      return categories.sort((a, b) => {
        const aInfo = getCategoryInfo(a)
        const bInfo = getCategoryInfo(b)
        if (!aInfo || !bInfo) return 0
        return aInfo.name_sv.localeCompare(bInfo.name_sv, 'sv')
      })
    }
    
    // Default: store layout
    return categories.sort((a, b) => {
      const aInfo = getCategoryInfo(a)
      const bInfo = getCategoryInfo(b)
      if (!aInfo || !bInfo) return 0
      return aInfo.sortOrder - bInfo.sortOrder
    })
  }, [itemsByCategory, sortMode])
  
  // Flat list (no categories)
  const flatItems = useMemo(() => {
    const allItems = Array.from(itemsByCategory.values()).flat()
    
    if (sortMode === 'alphabetical') {
      return allItems.sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name, 'sv'))
    } else if (sortMode === 'checked_last') {
      return allItems.sort((a, b) => {
        if (a.checked !== b.checked) return a.checked ? 1 : -1
        return a.ingredient_name.localeCompare(b.ingredient_name, 'sv')
      })
    }
    
    // Store layout: sort by category order, then name
    return allItems.sort((a, b) => {
      const aInfo = getCategoryInfo(a.category)
      const bInfo = getCategoryInfo(b.category)
      if (!aInfo || !bInfo) return 0
      if (aInfo.sortOrder !== bInfo.sortOrder) {
        return aInfo.sortOrder - bInfo.sortOrder
      }
      return a.ingredient_name.localeCompare(b.ingredient_name, 'sv')
    })
  }, [itemsByCategory, sortMode])
  
  const stats = useMemo(() => {
    const checked = items.filter(i => i.checked).length
    const total = items.length
    const percentage = total > 0 ? Math.round((checked / total) * 100) : 0
    
    return { checked, total, percentage }
  }, [items])
  
  // Get available categories from all items
  const availableCategories = useMemo(() => {
    const categories = new Set<IngredientCategory>()
    items.forEach(item => categories.add(item.category))
    return Array.from(categories).sort((a, b) => {
      const aInfo = getCategoryInfo(a)
      const bInfo = getCategoryInfo(b)
      if (!aInfo || !bInfo) return 0
      return aInfo.sortOrder - bInfo.sortOrder
    })
  }, [items])
  
  const toggleCategory = (category: IngredientCategory) => {
    const newCollapsed = new Set(collapsedCategories)
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category)
    } else {
      newCollapsed.add(category)
    }
    setCollapsedCategories(newCollapsed)
  }
  
  const collapseAll = () => {
    setCollapsedCategories(new Set(sortedCategories))
  }
  
  const expandAll = () => {
    setCollapsedCategories(new Set())
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-light to-secondary-light rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">{list.name}</h2>
            <p className="text-text-secondary">
              {format(parseISO(list.date_range_start), 'd MMM', { locale: sv })} - 
              {format(parseISO(list.date_range_end), 'd MMM yyyy', { locale: sv })}
            </p>
          </div>
          <span className="text-4xl">🛒</span>
        </div>
      </div>
      
      {/* Mini Statistics Bar */}
      <MiniStatsBar 
        items={items}
        expanded={showStats}
        onToggle={() => setShowStats(!showStats)}
      />
      
      {/* Warnings summary */}
      {list.warnings && list.warnings.length > 0 && (
        <CollapsibleSection
          title={`Viktiga påminnelser (${list.warnings.length})`}
          icon="⚠️"
          variant="default"
        >
          <div className="space-y-2">
            {list.warnings.map((warning, index) => {
              const categoryInfo = getCategoryInfo(warning.category)
              if (!categoryInfo) {
                console.warn('Unknown category:', warning.category)
                return null
              }
              return (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-xl flex-shrink-0">{categoryInfo.icon}</span>
                  <div>
                    <p className="font-semibold">{warning.message}</p>
                    <p className="text-text-secondary text-xs mt-1">
                      {warning.recommendation}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      )}
      
      {/* Compact Toolbar */}
      <CompactToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategories={selectedCategories}
        onCategoryToggle={(cat) => {
          setSelectedCategories(prev =>
            prev.includes(cat)
              ? prev.filter(c => c !== cat)
              : [...prev, cat]
          )
        }}
        availableCategories={availableCategories}
        showUncheckedOnly={showUncheckedOnly}
        onToggleUncheckedOnly={() => setShowUncheckedOnly(!showUncheckedOnly)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        totalItems={items.length}
        filteredItems={filteredItems.length}
        showStats={showStats}
        onToggleStats={() => setShowStats(!showStats)}
      />
      
      {/* Category controls - only for categorized view */}
      {viewMode === 'with_categories' && (
        <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hideEmptyCategories}
              onChange={(e) => setHideEmptyCategories(e.target.checked)}
              className="rounded"
            />
            <span>Dölj tomma</span>
          </label>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={collapseAll}
              className="px-3 py-1 text-xs bg-white hover:bg-gray-100 rounded-lg border border-gray-200"
            >
              Fäll ihop
            </button>
            <button
              onClick={expandAll}
              className="px-3 py-1 text-xs bg-white hover:bg-gray-100 rounded-lg border border-gray-200"
            >
              Expandera
            </button>
          </div>
        </div>
      )}
      
      {/* Mark complete button */}
      {stats.checked === stats.total && stats.total > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={onMarkComplete}
          className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
        >
          <span>✓</span>
          <span>Markera lista som klar</span>
        </motion.button>
      )}
      
      {/* Items */}
      {viewMode === 'with_categories' ? (
        // Categorized view
        <div className="space-y-4">
          {sortedCategories
            .filter(category => !hideEmptyCategories || itemsByCategory.get(category)!.length > 0)
            .map(category => {
              const catItems = itemsByCategory.get(category)!
              const categoryInfo = getCategoryInfo(category)
              if (!categoryInfo) {
                // Show items with unknown category in a default "Övrigt" category
                const catItems = itemsByCategory.get(category)!
                const checkedCount = catItems.filter(i => i.checked).length
                
                return (
                  <div key={category} className="bg-surface rounded-xl overflow-hidden border-2 border-gray-200">
                    <div className="p-4 bg-gray-100">
                      <h3 className="font-bold text-lg">📦 Övrigt</h3>
                      <p className="text-sm text-text-secondary">
                        {checkedCount}/{catItems.length} klara
                      </p>
                    </div>
                    <div className="p-4 space-y-2">
                      {catItems.map(item => (
                        <ShoppingListItemCard
                          key={item.id}
                          item={item}
                          onCheck={onCheckItem}
                          onUpdateQuantity={onUpdateItem ? (id, qty) => onUpdateItem(id, { quantity: qty }) : undefined}
                          onDelete={onDeleteItem}
                        />
                      ))}
                    </div>
                  </div>
                )
              }
              const checkedCount = catItems.filter(i => i.checked).length
              const isCollapsed = collapsedCategories.has(category)
              
              return (
                <div key={category} className="bg-surface rounded-xl overflow-hidden border-2 border-gray-200">
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{categoryInfo.icon}</span>
                      <div className="text-left">
                        <h3 className="font-bold text-lg">{categoryInfo.name_sv}</h3>
                        <p className="text-sm text-text-secondary">
                          {checkedCount}/{catItems.length} klara
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {catItems.some(i => i.freshness_warning) && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                          ⚠️ Varningar
                        </span>
                      )}
                      <span className="text-2xl">{isCollapsed ? '▼' : '▲'}</span>
                    </div>
                  </button>
                  
                  {/* Category items */}
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t-2 border-gray-200"
                      >
                        <div className="p-4 space-y-2">
                          {catItems.map(item => (
                            <ShoppingListItemCard
                              key={item.id}
                              item={item}
                              onCheck={onCheckItem}
                              onUpdateQuantity={onUpdateItem ? (id, qty) => onUpdateItem(id, { quantity: qty }) : undefined}
                              onDelete={onDeleteItem}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
        </div>
      ) : (
        // Flat/compact view
        <div className="bg-surface rounded-xl overflow-hidden">
          {/* Header for flat list */}
          {viewMode === 'flat' && (
            <div className="p-4 border-b-2 border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Alla varor</h3>
                <span className="text-sm text-text-secondary">
                  {stats.checked}/{stats.total} klara
                </span>
              </div>
            </div>
          )}
          
          {/* Items */}
          <div className={viewMode === 'compact' ? 'p-2 space-y-1' : 'p-4 space-y-2'}>
            {flatItems.map(item => (
              <ShoppingListItemCard
                key={`${item.id}-${viewMode}`}
                item={item}
                onCheck={onCheckItem}
                onUpdateQuantity={onUpdateItem ? (id, qty) => onUpdateItem(id, { quantity: qty }) : undefined}
                onDelete={onDeleteItem}
                compact={viewMode === 'compact'}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Footer actions */}
      <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
        <button
          onClick={onExport}
          className="flex-1 px-4 py-3 border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary-light transition-all"
        >
          📧 Exportera
        </button>
        <button
          onClick={onDelete}
          className="flex-1 px-4 py-3 border-2 border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all"
        >
          🗑️ Radera lista
        </button>
      </div>
      
      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="text-5xl mb-3">🛒</div>
          <h3 className="font-bold mb-2">Tom lista</h3>
          <p className="text-text-secondary text-sm">
            Inga varor i denna inköpslista ännu.
          </p>
        </div>
      )}
    </div>
  )
}