import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { sv } from 'date-fns/locale'
import type { Recipe, MealPlan } from '@shared/types'

// Recipe card component using "Floor Fade" pattern (industry best practice)
// Pattern: Image fills card + dark gradient at bottom + white text overlay
function RecipeMealCard({
  recipe,
  onRemove
}: {
  recipe: Recipe
  onRemove: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const hasImage = recipe.image_url && !imgError

  return (
    <div className="relative h-32 rounded-xl overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
      {/* Background: Image or gradient fallback */}
      {hasImage ? (
        <img
          src={recipe.image_url}
          alt={recipe.name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary" />
      )}

      {/* Dark gradient overlay at bottom (floor fade) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Delete button - top right */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-sm"
      >
        ✕
      </button>

      {/* Text content at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h4 className="font-bold text-white text-sm leading-tight line-clamp-2 drop-shadow-md">
          {recipe.name}
        </h4>
        <p className="text-white/80 text-xs mt-1">
          {recipe.servings} portioner
        </p>
      </div>
    </div>
  )
}

interface WeekCalendarProps {
  mealPlans: MealPlan[]
  recipes: Recipe[]
  onAddMeal: (date: string) => void
  onRemoveMeal: (planId: string) => void
  onRecipeClick: (recipe: Recipe) => void
  currentDate?: Date
  onWeekChange?: (date: Date) => void
}

export function WeekCalendar({ 
  mealPlans, 
  recipes, 
  onAddMeal, 
  onRemoveMeal,
  onRecipeClick,
  currentDate,
  onWeekChange
}: WeekCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(currentDate || new Date(), { weekStartsOn: 1 }) // Monday
  )
  
  // Sync with parent when currentDate changes
  useEffect(() => {
    if (currentDate) {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      setCurrentWeekStart(weekStart)
    }
  }, [currentDate])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  const goToPreviousWeek = () => {
    const newWeekStart = addDays(currentWeekStart, -7)
    setCurrentWeekStart(newWeekStart)
    onWeekChange?.(newWeekStart)
  }

  const goToNextWeek = () => {
    const newWeekStart = addDays(currentWeekStart, 7)
    setCurrentWeekStart(newWeekStart)
    onWeekChange?.(newWeekStart)
  }

  const goToToday = () => {
    const today = new Date()
    const newWeekStart = startOfWeek(today, { weekStartsOn: 1 })
    setCurrentWeekStart(newWeekStart)
    onWeekChange?.(today)
  }

  const getMealForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const plan = mealPlans.find(p => p.date === dateStr)
    if (!plan) return null
    return {
      plan,
      recipe: recipes.find(r => r.id === plan.recipe_id)
    }
  }

  const isToday = (date: Date) => isSameDay(date, new Date())

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPreviousWeek}
          className="px-4 py-2 bg-surface border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
        >
          ← Förra veckan
        </button>

        <button
          onClick={goToToday}
          className="px-6 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
        >
          Idag
        </button>

        <button
          onClick={goToNextWeek}
          className="px-4 py-2 bg-surface border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
        >
          Nästa vecka →
        </button>
      </div>

      {/* Week Header */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-text-secondary">
          Vecka {format(currentWeekStart, 'w', { locale: sv })} • {format(currentWeekStart, 'MMMM yyyy', { locale: sv })}
        </h3>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const meal = getMealForDay(day)
          const today = isToday(day)

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-surface rounded-2xl p-4 border-2 transition-all min-h-[200px] ${
                today 
                  ? 'border-primary shadow-lg' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Day Header */}
              <div className="text-center mb-3">
                <div className={`text-sm font-semibold uppercase ${
                  today ? 'text-primary' : 'text-text-secondary'
                }`}>
                  {format(day, 'EEEE', { locale: sv })}
                </div>
                <div className={`text-2xl font-bold ${
                  today ? 'text-primary' : 'text-text'
                }`}>
                  {format(day, 'd')}
                </div>
              </div>

              {/* Meal Content */}
              {meal?.recipe ? (
                <div onClick={() => onRecipeClick(meal.recipe!)}>
                  <RecipeMealCard
                    recipe={meal.recipe}
                    onRemove={() => onRemoveMeal(meal.plan.id)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => onAddMeal(format(day, 'yyyy-MM-dd'))}
                  className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-primary-light/20 transition-all flex flex-col items-center justify-center group"
                >
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                    ➕
                  </span>
                  <span className="text-sm font-semibold text-text-secondary group-hover:text-primary">
                    Lägg till måltid
                  </span>
                </button>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}