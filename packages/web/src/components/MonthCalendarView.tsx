import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  getWeek
} from 'date-fns'
import { sv } from 'date-fns/locale'
import type { MealPlan, Recipe } from '@shared/types'

interface MonthCalendarViewProps {
  mealPlans: MealPlan[]
  recipes: Recipe[]
  currentDate: Date
  onDateChange: (date: Date) => void
  onAddMeal: (date: string) => void
  onViewMeal: (plan: MealPlan) => void
  onDeleteMeal: (planId: string) => void
}

export function MonthCalendarView({
  mealPlans,
  recipes,
  currentDate,
  onDateChange,
  onAddMeal,
  onViewMeal,
  onDeleteMeal
}: MonthCalendarViewProps) {
  
  const [selectedMonth, setSelectedMonth] = useState(currentDate)
  
  // Get all days for the month grid (including padding days)
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(selectedMonth), { weekStartsOn: 1 }) // Monday
    const end = endOfWeek(endOfMonth(selectedMonth), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [selectedMonth])
  
  // Group meal plans by date
  const plansByDate = useMemo(() => {
    const map = new Map<string, MealPlan[]>()
    mealPlans.forEach(plan => {
      const dateKey = plan.date
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(plan)
    })
    return map
  }, [mealPlans])
  
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1))
  }
  
  const goToNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1))
  }
  
  const goToToday = () => {
    setSelectedMonth(new Date())
  }
  
  const getRecipeForPlan = (plan: MealPlan) => {
    return recipes.find(r => r.id === plan.recipe_id)
  }
  
  const weekDays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold capitalize">
            {format(selectedMonth, 'MMMM yyyy', { locale: sv })}
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Vecka {getWeek(selectedMonth, { locale: sv })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            title="Föregående månad"
          >
            <span className="text-xl">◀</span>
          </button>
          
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-all"
          >
            Idag
          </button>
          
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            title="Nästa månad"
          >
            <span className="text-xl">▶</span>
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-200">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b-2 border-gray-200">
          {weekDays.map(day => (
            <div
              key={day}
              className="p-3 text-center font-semibold text-sm text-gray-700"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Days grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const plansForDay = plansByDate.get(dateStr) || []
            const isCurrentMonth = isSameMonth(day, selectedMonth)
            const isTodayDate = isToday(day)
            const isSelected = isSameDay(day, currentDate)
            
            return (
              <motion.div
                key={dateStr}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.01 }}
                className={`group min-h-[120px] p-2 border-b border-r border-gray-200 transition-all relative ${
                  !isCurrentMonth
                    ? 'bg-gray-50'
                    : isTodayDate
                    ? 'bg-blue-50'
                    : isSelected
                    ? 'bg-primary-light'
                    : 'bg-white hover:bg-gray-50'
                } ${
                  (index + 1) % 7 === 0 ? 'border-r-0' : ''
                }`}
              >
                {/* Clickable area for date selection */}
                <div 
                  onClick={() => onDateChange(day)}
                  className="cursor-pointer"
                >
                  {/* Date number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-semibold ${
                        !isCurrentMonth
                          ? 'text-gray-400'
                          : isTodayDate
                          ? 'text-primary'
                          : 'text-gray-700'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    
                    {/* Week number on Mondays */}
                    {day.getDay() === 1 && (
                      <span className="text-xs text-gray-400">
                        v{getWeek(day, { locale: sv })}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Meal plans for this day */}
                <div className="space-y-1 mb-1 flex-1">
                  <AnimatePresence>
                    {plansForDay.map(plan => {
                      const recipe = getRecipeForPlan(plan)
                      if (!recipe) return null
                      
                      return (
                        <motion.div
                          key={plan.id}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="group/item relative"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onViewMeal(plan)
                            }}
                            className="w-full text-left px-2 py-1 bg-gradient-to-r from-primary to-secondary text-white rounded text-xs font-medium hover:shadow-md transition-all truncate"
                          >
                            {recipe.name}
                          </button>
                          
                          {/* Quick delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (window.confirm(`Ta bort "${recipe.name}"?`)) {
                                onDeleteMeal(plan.id)
                              }
                            }}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover/item:opacity-100 transition-all hover:bg-red-600 flex items-center justify-center z-10"
                          >
                            ×
                          </button>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
                
                {/* Add meal button - ONLY show when NO meals exist */}
                {isCurrentMonth && plansForDay.length === 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddMeal(dateStr)
                    }}
                    className="w-full flex-1 min-h-[60px] flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 hover:border-primary rounded-lg text-gray-500 hover:text-primary transition-all hover:bg-primary-light"
                  >
                    <span className="text-2xl">+</span>
                    <span className="text-xs font-medium">Lägg till</span>
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
          <span>Idag</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary-light border border-primary rounded"></div>
          <span>Vald dag</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-primary to-secondary rounded"></div>
          <span>Planerad måltid</span>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
          <p className="text-xs text-green-700 mb-1">Måltider denna månad</p>
          <p className="text-2xl font-bold text-green-900">
            {mealPlans.filter(p => {
              const planDate = new Date(p.date)
              return isSameMonth(planDate, selectedMonth)
            }).length}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
          <p className="text-xs text-blue-700 mb-1">Unika recept</p>
          <p className="text-2xl font-bold text-blue-900">
            {new Set(
              mealPlans
                .filter(p => isSameMonth(new Date(p.date), selectedMonth))
                .map(p => p.recipe_id)
            ).size}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
          <p className="text-xs text-purple-700 mb-1">Planerade dagar</p>
          <p className="text-2xl font-bold text-purple-900">
            {new Set(
              mealPlans
                .filter(p => isSameMonth(new Date(p.date), selectedMonth))
                .map(p => p.date)
            ).size}
          </p>
        </div>
      </div>
    </div>
  )
}