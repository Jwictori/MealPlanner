import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCategoryInfo, type IngredientCategory } from '@shared/ingredientCategories'

type SortMode = 'store_layout' | 'alphabetical' | 'checked_last'
type ViewMode = 'with_categories' | 'flat' | 'compact'

interface CompactToolbarProps {
  // Search
  searchTerm: string
  onSearchChange: (term: string) => void
  
  // Filters
  selectedCategories: IngredientCategory[]
  onCategoryToggle: (category: IngredientCategory) => void
  availableCategories: IngredientCategory[]
  showUncheckedOnly: boolean
  onToggleUncheckedOnly: () => void
  
  // View & Sort
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  sortMode: SortMode
  onSortModeChange: (mode: SortMode) => void
  
  // Stats
  totalItems: number
  filteredItems: number
  showStats: boolean
  onToggleStats: () => void
}

export function CompactToolbar({
  searchTerm,
  onSearchChange,
  selectedCategories,
  onCategoryToggle,
  availableCategories,
  showUncheckedOnly,
  onToggleUncheckedOnly,
  viewMode,
  onViewModeChange,
  sortMode,
  onSortModeChange,
  totalItems,
  filteredItems,
  showStats,
  onToggleStats
}: CompactToolbarProps) {
  
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [showView, setShowView] = useState(false)
  
  const searchRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  
  // Close popups when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false)
      }
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowFilters(false)
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSort(false)
      }
      if (viewRef.current && !viewRef.current.contains(event.target as Node)) {
        setShowView(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const activeFiltersCount = selectedCategories.length + (showUncheckedOnly ? 1 : 0)
  
  return (
    <div className="flex items-center gap-2">
      {/* Search */}
      <div ref={searchRef} className="relative flex-1">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setShowSearch(true)}
            placeholder="Sök ingrediens..."
            className="w-full px-4 py-2.5 pl-10 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none text-sm"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Search results info */}
        <AnimatePresence>
          {showSearch && (searchTerm || activeFiltersCount > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full mt-1 left-0 right-0 bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-900 z-10"
            >
              Visar <strong>{filteredItems}</strong> av {totalItems} varor
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Stats toggle */}
      <button
        onClick={onToggleStats}
        className={`p-2.5 rounded-xl font-semibold transition-all ${
          showStats
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Statistik"
      >
        <span className="text-lg">📊</span>
      </button>
      
      {/* View mode dropdown */}
      <div ref={viewRef} className="relative">
        <button
          onClick={() => setShowView(!showView)}
          className="p-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
          title="Visning"
        >
          <span className="text-lg">
            {viewMode === 'with_categories' ? '📂' : viewMode === 'flat' ? '📄' : '📋'}
          </span>
        </button>
        
        <AnimatePresence>
          {showView && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-2 z-20 min-w-[180px]"
            >
              <div className="space-y-1">
                <button
                  onClick={() => { onViewModeChange('with_categories'); setShowView(false) }}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                    viewMode === 'with_categories'
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  📂 Med kategorier
                </button>
                <button
                  onClick={() => { onViewModeChange('flat'); setShowView(false) }}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                    viewMode === 'flat'
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  📄 Platt lista
                </button>
                <button
                  onClick={() => { onViewModeChange('compact'); setShowView(false) }}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                    viewMode === 'compact'
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  📋 Kompakt
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Sort dropdown */}
      <div ref={sortRef} className="relative">
        <button
          onClick={() => setShowSort(!showSort)}
          className="p-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
          title="Sortering"
        >
          <span className="text-lg">⚡</span>
        </button>
        
        <AnimatePresence>
          {showSort && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-2 z-20 min-w-[180px]"
            >
              <div className="space-y-1">
                <button
                  onClick={() => { onSortModeChange('store_layout'); setShowSort(false) }}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                    sortMode === 'store_layout'
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  🏪 Butikslayout
                </button>
                <button
                  onClick={() => { onSortModeChange('alphabetical'); setShowSort(false) }}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                    sortMode === 'alphabetical'
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  🔤 Alfabetisk
                </button>
                <button
                  onClick={() => { onSortModeChange('checked_last'); setShowSort(false) }}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                    sortMode === 'checked_last'
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  ✓ Avbockade sist
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Filters popup */}
      <div ref={filtersRef} className="relative">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-xl font-semibold transition-all relative ${
            activeFiltersCount > 0
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title="Filter"
        >
          <span className="text-lg">🔧</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>
        
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-4 z-20 min-w-[280px] max-w-[320px]"
            >
              {/* Unchecked only toggle */}
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={showUncheckedOnly}
                  onChange={onToggleUncheckedOnly}
                  className="w-4 h-4 rounded border-2 border-gray-300"
                />
                <span className="text-sm font-medium">Visa bara oklara</span>
              </label>
              
              {/* Category filters */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Kategorier:</h4>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => selectedCategories.forEach(cat => onCategoryToggle(cat))}
                      className="text-xs text-primary hover:underline"
                    >
                      Rensa
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                  {availableCategories.map(category => {
                    const info = getCategoryInfo(category)
                    if (!info) return null
                    
                    const isSelected = selectedCategories.includes(category)
                    
                    return (
                      <button
                        key={category}
                        onClick={() => onCategoryToggle(category)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        {info.icon} {info.name_sv}
                      </button>
                    )
                  })}
                </div>
              </div>
              
              {/* Clear all button */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => {
                    selectedCategories.forEach(cat => onCategoryToggle(cat))
                    if (showUncheckedOnly) onToggleUncheckedOnly()
                  }}
                  className="w-full mt-3 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-all"
                >
                  Rensa alla filter
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
