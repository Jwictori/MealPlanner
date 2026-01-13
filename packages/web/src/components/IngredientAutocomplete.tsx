import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface IngredientSuggestion {
  id: string
  name: string
  category: string
  default_unit: string
}

interface IngredientAutocompleteProps {
  value: string
  onChange: (value: string, defaultUnit?: string) => void
  placeholder?: string
  className?: string
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function IngredientAutocomplete({
  value,
  onChange,
  placeholder = "Ingrediens",
  className = ""
}: IngredientAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce search term to avoid too many API calls
  const debouncedValue = useDebounce(value, 150)

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    if (debouncedValue.length >= 2) {
      fetchSuggestions(debouncedValue)
    } else {
      setSuggestions([])
    }
  }, [debouncedValue])

  const fetchSuggestions = async (searchTerm: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .rpc('get_ingredient_suggestions', { search_term: searchTerm })

      if (!error && data) {
        setSuggestions(data)
        setHighlightedIndex(-1)
      }
    } catch (err) {
      console.error('Error fetching ingredient suggestions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Save new ingredient to database when user enters something not in suggestions
  const saveNewIngredient = useCallback(async (name: string) => {
    if (!name.trim() || name.length < 2) return

    // Check if this name matches any suggestion
    const matchesSuggestion = suggestions.some(
      s => s.name.toLowerCase() === name.toLowerCase()
    )

    if (matchesSuggestion) return // Already exists

    // Save to database (this will only insert if it doesn't exist)
    try {
      await supabase.rpc('add_ingredient_if_not_exists', {
        ingredient_name: name.trim()
      })
      console.log('Saved new ingredient:', name)
    } catch (err) {
      // Ignore errors - ingredient might already exist
      console.log('Could not save ingredient (may already exist):', name)
    }
  }, [suggestions])

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue)
    if (inputValue.length >= 2) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleSelect = (ingredient: IngredientSuggestion) => {
    onChange(ingredient.name, ingredient.default_unit)
    setShowSuggestions(false)
  }

  const handleBlur = () => {
    // Delay to allow click on suggestion to fire first
    setTimeout(() => {
      if (value.trim() && value.length >= 2) {
        saveNewIngredient(value)
      }
    }, 200)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (value.trim()) {
          saveNewIngredient(value)
        }
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex])
        } else if (value.trim()) {
          saveNewIngredient(value)
          setShowSuggestions(false)
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => value.length >= 2 && setShowSuggestions(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((ingredient, index) => (
            <button
              key={ingredient.id}
              type="button"
              onClick={() => handleSelect(ingredient)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full text-left px-4 py-2 transition-colors flex items-center justify-between ${
                index === highlightedIndex ? 'bg-primary-light' : 'hover:bg-gray-50'
              }`}
            >
              <span className="font-medium">{ingredient.name}</span>
              <div className="flex items-center gap-2">
                {ingredient.default_unit && (
                  <span className="text-xs text-gray-500">
                    ({ingredient.default_unit})
                  </span>
                )}
                <span className="text-xs text-text-secondary bg-secondary-light px-2 py-0.5 rounded">
                  {getCategoryLabel(ingredient.category)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No matches message */}
      {showSuggestions && value.length >= 2 && suggestions.length === 0 && !isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <p className="text-sm text-text-secondary text-center">
            Ingen matchning - "{value}" sparas automatiskt
          </p>
        </div>
      )}
    </div>
  )
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    // Swedish categories from our seed data
    'GRÖNSAKER': 'Grönsaker',
    'VEGETABLES': 'Grönsaker',
    'FRUKT': 'Frukt',
    'FRUIT': 'Frukt',
    'MEJERI': 'Mejeri',
    'DAIRY': 'Mejeri',
    'DAIRY_MILK': 'Mejeri',
    'KÖTT': 'Kött',
    'MEAT': 'Kött',
    'FISK': 'Fisk',
    'FISH': 'Fisk',
    'SEAFOOD': 'Skaldjur',
    'KRYDDOR': 'Kryddor',
    'SPICES': 'Kryddor',
    'HERBS': 'Örter',
    'SKAFFERI': 'Skafferi',
    'PANTRY': 'Skafferi',
    'GRAINS': 'Spannmål',
    'NÖTTER': 'Nötter',
    'NUTS': 'Nötter',
    'OIL_VINEGAR': 'Olja & Vinäger',
    'BAKING': 'Bakning',
    'ÖVRIGT': 'Övrigt',
    'OTHER': 'Övrigt',
    // Legacy categories
    dairy: 'Mejeri',
    meat: 'Kött',
    fish: 'Fisk',
    vegetables: 'Grönsaker',
    fruit: 'Frukt',
    grains: 'Spannmål',
    spices: 'Kryddor',
    condiments: 'Tillbehör',
    bakery: 'Bageri',
    frozen: 'Fryst',
    other: 'Övrigt',
  }
  return labels[category] || category
}
