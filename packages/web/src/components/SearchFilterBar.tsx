import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCategoryInfo, type IngredientCategory } from '@shared/ingredientCategories'

interface SearchFilterBarProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  selectedCategories: IngredientCategory[]
  onCategoryToggle: (category: IngredientCategory) => void
  availableCategories: IngredientCategory[]
  showUncheckedOnly: boolean
  onToggleUncheckedOnly: () => void
  totalItems: number
  filteredItems: number
}

export function SearchFilterBar({
  searchTerm,
  onSearchChange,
  selectedCategories,
  onCategoryToggle,
  availableCategories,
  showUncheckedOnly,
  onToggleUncheckedOnly,
  totalItems,
  filteredItems
}: SearchFilterBarProps) {
  
  const [showFilters, setShowFilters] = useState(false)
  
  const activeFiltersCount = selectedCategories.length + (showUncheckedOnly ? 1 : 0)
  
  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Sök ingrediens..."
            className="w-full px-4 py-3 pl-10 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Filter toggle button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-xl font-semibold transition-all ${
            showFilters || activeFiltersCount > 0
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <span>🔧</span>
            {activeFiltersCount > 0 && (
              <span className="bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </span>
        </button>
      </div>
      
      {/* Results info */}
      {(searchTerm || activeFiltersCount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-2 bg-blue-50 rounded-lg"
        >
          <span className="text-sm text-blue-900">
            Visar <strong>{filteredItems}</strong> av {totalItems} varor
          </span>
          {(searchTerm || activeFiltersCount > 0) && (
            <button
              onClick={() => {
                onSearchChange('')
                selectedCategories.forEach(cat => onCategoryToggle(cat))
                if (showUncheckedOnly) onToggleUncheckedOnly()
              }}
              className="text-sm text-blue-700 hover:text-blue-900 font-medium"
            >
              Rensa filter
            </button>
          )}
        </motion.div>
      )}
      
      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface rounded-xl p-4 space-y-4">
              {/* Show unchecked only toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUncheckedOnly}
                    onChange={onToggleUncheckedOnly}
                    className="w-5 h-5 rounded border-2 border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <div>
                    <span className="font-semibold">Visa bara oklara varor</span>
                    <p className="text-xs text-text-secondary">Dölj avbockade items</p>
                  </div>
                </label>
              </div>
              
              {/* Category filters */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Filtrera kategorier:</h4>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => selectedCategories.forEach(cat => onCategoryToggle(cat))}
                      className="text-xs text-primary hover:underline"
                    >
                      Rensa alla
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map(category => {
                    const info = getCategoryInfo(category)
                    if (!info) return null
                    
                    const isSelected = selectedCategories.includes(category)
                    
                    return (
                      <button
                        key={category}
                        onClick={() => onCategoryToggle(category)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <span>{info.icon}</span>
                          <span>{info.name_sv}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
