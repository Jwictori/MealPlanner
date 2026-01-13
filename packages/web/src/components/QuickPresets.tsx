import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Recipe } from '@shared/types'

// Helper to get ingredients in a consistent format (supports both new and legacy)
function getIngredientNames(recipe: Recipe): string[] {
  if (recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0) {
    return recipe.recipe_ingredients.map(ri => ri.ingredient_name)
  }
  return (recipe.ingredients ?? []).map(ing => ing.name)
}

interface Preset {
  id: string
  name: string
  description: string
  icon: string
  filter: (recipe: Recipe, preferences: any) => boolean
}

interface QuickPresetsProps {
  isOpen: boolean
  onClose: () => void
  recipes: Recipe[]
  userPreferences: any
  onGenerate: (selectedRecipes: Recipe[]) => void
  dateRange?: { start: string; end: string } | null
}

const PRESETS: Preset[] = [
  {
    id: 'quick',
    name: 'Snabblagat',
    description: 'Max 30 minuter per måltid',
    icon: '⚡',
    filter: (recipe) => recipe.tags?.includes('Snabbt') || recipe.tags?.includes('Enkelt'),
  },
  {
    id: 'protein',
    name: 'Proteinrikt',
    description: 'Perfekt för träning och muskelbygge',
    icon: '🏋️',
    filter: (recipe) =>
      recipe.tags?.includes('Protein') ||
      getIngredientNames(recipe).some(name =>
        name && ['Kyckling', 'Lax', 'Köttfärs', 'Ägg', 'Tonfisk'].some(meat =>
          name.includes(meat)
        )
      ),
  },
  {
    id: 'vegetarian',
    name: 'Vegetariskt',
    description: 'Endast vegetariska rätter',
    icon: '🌱',
    filter: (recipe) => recipe.tags?.includes('Vegetarisk'),
  },
  {
    id: 'family',
    name: 'Barnvänligt',
    description: 'Rätter hela familjen gillar',
    icon: '👨‍👩‍👧',
    filter: (recipe) => recipe.tags?.includes('Barnvänligt'),
  },
  {
    id: 'budget',
    name: 'Budget',
    description: 'Prisvärt och gott',
    icon: '💰',
    filter: (recipe) => {
      const budgetIngredients = ['Pasta', 'Ris', 'Köttfärs', 'Ägg', 'Potatis']
      return getIngredientNames(recipe).some(name =>
        name && budgetIngredients.some(budget => name.includes(budget))
      )
    },
  },
  {
    id: 'fish',
    name: 'Fisk & Skaldjur',
    description: 'Hälsosamt och gott från havet',
    icon: '🐟',
    filter: (recipe) =>
      recipe.tags?.includes('Fisk') ||
      getIngredientNames(recipe).some(name =>
        name && ['Lax', 'Torsk', 'Räkor', 'Tonfisk'].some(fish => name.includes(fish))
      ),
  },
  {
    id: 'comfort',
    name: 'Comfort Food',
    description: 'Mysig husmanskost',
    icon: '🍲',
    filter: (recipe) => 
      !!(recipe.tags?.includes('Klassiker') ||
      (recipe.name && ['Köttbullar', 'Lasagne', 'Gratäng', 'Soppa'].some(comfort =>
        recipe.name.includes(comfort)
      ))),
  },
  {
    id: 'healthy',
    name: 'Hälsosamt',
    description: 'Nyttig och balanserad kost',
    icon: '🥗',
    filter: (recipe) =>
      recipe.tags?.includes('Nyttig') ||
      recipe.tags?.includes('Hälsosam') ||
      getIngredientNames(recipe).filter(name =>
        name && ['Broccoli', 'Spenat', 'Sallad', 'Tomat', 'Paprika'].some(veg =>
          name.includes(veg)
        )
      ).length >= 2,
  },
]

export function QuickPresets({ 
  isOpen, 
  onClose, 
  recipes, 
  userPreferences, 
  onGenerate,
  dateRange 
}: QuickPresetsProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Calculate number of days to generate
  const daysToGenerate = dateRange 
    ? Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 7

  const generateWeek = async (preset: Preset) =>{
    setIsGenerating(true)
    
    // Filter recipes based on preset
    let filteredRecipes = recipes.filter(r => preset.filter(r, userPreferences))
    
    // Apply user preferences if available
    if (userPreferences) {
      // Filter out allergies
      if (userPreferences.allergies?.length > 0) {
        filteredRecipes = filteredRecipes.filter(recipe =>
          !getIngredientNames(recipe).some(name =>
            name && userPreferences.allergies.some((allergy: string) =>
              name.toLowerCase().includes(allergy.toLowerCase())
            )
          )
        )
      }

      // Prefer loved foods
      if (userPreferences.love_foods?.length > 0) {
        filteredRecipes.sort((a, b) => {
          const aScore = getIngredientNames(a).filter(name =>
            name && userPreferences.love_foods.some((love: string) =>
              name.toLowerCase().includes(love.toLowerCase())
            )
          ).length
          const bScore = getIngredientNames(b).filter(name =>
            name && userPreferences.love_foods.some((love: string) =>
              name.toLowerCase().includes(love.toLowerCase())
            )
          ).length
          return bScore - aScore
        })
      }

      // Filter by diet type
      if (userPreferences.diet_type === 'vegetarian' || userPreferences.diet_type === 'vegan') {
        filteredRecipes = filteredRecipes.filter(r => r.tags?.includes('Vegetarisk'))
      }
    }
    
    // Shuffle to get variety
    const shuffled = [...filteredRecipes].sort(() => Math.random() - 0.5)
    
    // Pick recipes for the selected date range
    const selectedRecipes = shuffled.slice(0, daysToGenerate)
    
    // If not enough recipes, show error
    if (selectedRecipes.length < daysToGenerate) {
      alert(`Kunde bara hitta ${selectedRecipes.length} recept för "${preset.name}". Behöver minst ${daysToGenerate} recept.`)
      setIsGenerating(false)
      return
    }
    
    setIsGenerating(false)
    onGenerate(selectedRecipes)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-surface rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Snabbplanering</h2>
                    <p className="text-text-secondary">
                      Välj ett tema så genererar vi {daysToGenerate} {daysToGenerate === 1 ? 'dag' : 'dagar'} åt dig!
                    </p>
                    {dateRange && (
                      <p className="text-sm text-primary font-medium mt-1">
                        📅 {new Date(dateRange.start).toLocaleDateString('sv-SE')} - {new Date(dateRange.end).toLocaleDateString('sv-SE')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="text-2xl text-text-secondary hover:text-text transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Presets Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {PRESETS.map((preset) => {
                    const availableCount = recipes.filter(r => preset.filter(r, userPreferences)).length
                    const isEnough = availableCount >= 7

                    return (
                      <motion.button
                        key={preset.id}
                        whileHover={{ scale: isEnough ? 1.05 : 1 }}
                        whileTap={{ scale: isEnough ? 0.95 : 1 }}
                        onClick={() => isEnough && generateWeek(preset)}
                        disabled={!isEnough || isGenerating}
                        className={`p-6 rounded-2xl border-2 text-left transition-all ${
                          isEnough
                            ? 'border-gray-200 hover:border-primary hover:shadow-lg cursor-pointer'
                            : 'border-gray-200 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="text-5xl mb-3">{preset.icon}</div>
                        <h3 className="font-bold text-lg mb-1">{preset.name}</h3>
                        <p className="text-sm text-text-secondary mb-3">
                          {preset.description}
                        </p>
                        <div className={`text-xs font-semibold ${
                          isEnough ? 'text-primary' : 'text-red-500'
                        }`}>
                          {isEnough 
                            ? `${availableCount} recept tillgängliga`
                            : `Endast ${availableCount} recept (behöver 7)`
                          }
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-secondary-light rounded-xl">
                  <p className="text-sm text-text-secondary">
                    💡 <strong>Tips:</strong> Preset-planeringen tar hänsyn till dina inställningar 
                    (allergier, kosttyp, favoriter). Ju fler recept du har, desto bättre variation!
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="w-full px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Avbryt
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}