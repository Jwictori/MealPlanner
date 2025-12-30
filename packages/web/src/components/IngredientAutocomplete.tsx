import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface Ingredient {
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

export function IngredientAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Ingrediens",
  className = "" 
}: IngredientAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Ingredient[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Load all ingredients on mount
  useEffect(() => {
    loadIngredients()
  }, [])

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

  const loadIngredients = async () => {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name')

    if (!error && data) {
      setAllIngredients(data)
    }
  }

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue)

    if (inputValue.length > 0) {
      const filtered = allIngredients.filter(ing =>
        ing.name.toLowerCase().includes(inputValue.toLowerCase())
      )
      setSuggestions(filtered.slice(0, 10)) // Max 10 suggestions
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSelect = (ingredient: Ingredient) => {
    onChange(ingredient.name, ingredient.default_unit)
    setShowSuggestions(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => value.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((ingredient) => (
            <button
              key={ingredient.id}
              type="button"
              onClick={() => handleSelect(ingredient)}
              className="w-full text-left px-4 py-2 hover:bg-primary-light transition-colors flex items-center justify-between"
            >
              <span className="font-medium">{ingredient.name}</span>
              <span className="text-xs text-text-secondary bg-secondary-light px-2 py-1 rounded">
                {getCategoryLabel(ingredient.category)}
              </span>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && value.length > 0 && suggestions.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-text-secondary">
          <p className="text-sm">Ingen matchning hittades</p>
          <p className="text-xs mt-1">Ingrediensen kommer att sparas som "{value}"</p>
        </div>
      )}
    </div>
  )
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
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
