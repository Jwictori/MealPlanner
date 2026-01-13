import { useState, useMemo, useCallback, useEffect } from 'react'
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
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'

// Small thumbnail for month view
function MiniThumbnail({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return null // Don't show placeholder in month view to save space
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-5 h-5 min-w-[20px] rounded object-cover"
      loading="lazy"
      onError={() => setError(true)}
    />
  )
}

interface MonthCalendarViewProps {
  mealPlans: MealPlan[]
  recipes: Recipe[]
  currentDate: Date
  onDateChange: (date: Date) => void
  onAddMeal: (date: string) => void
  onViewMeal: (plan: MealPlan) => void
  onDeleteMeal: (planId: string) => void
  onMoveMeal?: (planId: string, newDate: string) => void
  onDuplicateMeal?: (planId: string, newDate: string) => void
}

// Draggable meal item component - optimized for smooth drag
function DraggableMealItem({
  plan,
  recipe,
  onViewMeal,
  onDeleteMeal
}: {
  plan: MealPlan
  recipe: Recipe
  onViewMeal: (plan: MealPlan) => void
  onDeleteMeal: (planId: string) => void
}) {
  const [imgError, setImgError] = useState(false)
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: plan.id,
    data: { plan, recipe }
  })

  // Apply transform directly for smoother dragging
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : undefined,
    willChange: isDragging ? 'transform' : undefined
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/item relative flex-1 min-h-[28px] ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        {...listeners}
        {...attributes}
        onClick={(e) => {
          e.stopPropagation()
          onViewMeal(plan)
        }}
        className="w-full h-full text-left px-2 py-1.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg text-xs font-medium hover:shadow-lg transition-shadow flex items-center gap-1.5 cursor-grab active:cursor-grabbing touch-none"
      >
        {recipe.image_url && !imgError ? (
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="w-5 h-5 min-w-[20px] rounded object-cover pointer-events-none"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : null}
        <span className="truncate pointer-events-none">{recipe.name}</span>
      </button>

      {/* Quick delete button */}
      {!isDragging && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (window.confirm(`Ta bort "${recipe.name}"?`)) {
              onDeleteMeal(plan.id)
            }
          }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-red-600 shadow-md flex items-center justify-center leading-none"
          style={{ fontSize: '14px', paddingBottom: '1px' }}
        >
          ×
        </button>
      )}
    </div>
  )
}

// Droppable day cell component
function DroppableDay({
  dateStr,
  isOver,
  children
}: {
  dateStr: string
  isOver: boolean
  children: React.ReactNode
}) {
  const { setNodeRef } = useDroppable({
    id: dateStr
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex flex-col min-h-0 overflow-visible transition-all ${
        isOver ? 'bg-primary-light/50 ring-2 ring-primary ring-inset rounded-lg' : ''
      }`}
    >
      {children}
    </div>
  )
}

export function MonthCalendarView({
  mealPlans,
  recipes,
  currentDate,
  onDateChange,
  onAddMeal,
  onViewMeal,
  onDeleteMeal,
  onMoveMeal,
  onDuplicateMeal
}: MonthCalendarViewProps) {

  const [selectedMonth, setSelectedMonth] = useState(currentDate)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [isAltPressed, setIsAltPressed] = useState(false)
  const [overDateStr, setOverDateStr] = useState<string | null>(null)

  // Track Alt key for duplicate mode
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.altKey) setIsAltPressed(true)
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!e.altKey) setIsAltPressed(false)
  }, [])

  // Add/remove key listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  // Configure sensors for responsive drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5 // Lower distance for quicker activation
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Short delay for touch
        tolerance: 5
      }
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((event: { over: { id: string } | null }) => {
    setOverDateStr(event.over?.id as string | null)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)
    setOverDateStr(null)

    if (!over) return

    const planId = active.id as string
    const targetDate = over.id as string

    // Don't do anything if dropped on same date
    const plan = mealPlans.find(p => p.id === planId)
    if (!plan || plan.date === targetDate) return

    if (isAltPressed && onDuplicateMeal) {
      // Alt+drag = duplicate
      onDuplicateMeal(planId, targetDate)
    } else if (onMoveMeal) {
      // Normal drag = move
      onMoveMeal(planId, targetDate)
    }
  }, [mealPlans, isAltPressed, onMoveMeal, onDuplicateMeal])

  // Get active drag item for overlay
  const activeDragPlan = activeDragId ? mealPlans.find(p => p.id === activeDragId) : null
  const activeDragRecipe = activeDragPlan ? recipes.find(r => r.id === activeDragPlan.recipe_id) : null
  
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
      
      {/* Calendar Grid with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
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
              const isDropTarget = overDateStr === dateStr

              return (
                <div
                  key={dateStr}
                  className={`group h-[110px] p-2 border-b border-r border-gray-200 relative flex flex-col ${
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

                  {/* Droppable content area */}
                  <DroppableDay dateStr={dateStr} isOver={isDropTarget && isCurrentMonth}>
                    {/* Meal plans for this day */}
                    {plansForDay.length > 0 ? (
                      <div className="flex-1 flex flex-col gap-1 pt-1 overflow-visible">
                        <AnimatePresence>
                          {plansForDay.map((plan) => {
                            const recipe = getRecipeForPlan(plan)
                            if (!recipe) return null

                            return (
                              <DraggableMealItem
                                key={plan.id}
                                plan={plan}
                                recipe={recipe}
                                onViewMeal={onViewMeal}
                                onDeleteMeal={onDeleteMeal}
                              />
                            )
                          })}
                        </AnimatePresence>

                        {/* Add more button when meals exist */}
                        {isCurrentMonth && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onAddMeal(dateStr)
                            }}
                            className="flex items-center justify-center gap-1 py-1 border border-dashed border-gray-200 hover:border-primary rounded text-gray-400 hover:text-primary hover:bg-primary-light/30 transition-all text-[10px]"
                          >
                            <span>+</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Add meal button - when NO meals exist */
                      isCurrentMonth ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddMeal(dateStr)
                          }}
                          className="flex-1 flex flex-col items-center justify-center gap-0.5 border-2 border-dashed border-gray-200 hover:border-primary rounded-lg text-gray-400 hover:text-primary transition-all hover:bg-primary-light/50"
                        >
                          <span className="text-lg">+</span>
                          <span className="text-[10px] font-medium">Lägg till</span>
                        </button>
                      ) : (
                        <div className="flex-1" />
                      )
                    )}
                  </DroppableDay>
                </div>
              )
            })}
          </div>
        </div>

        {/* Drag Overlay - shows preview while dragging */}
        <DragOverlay>
          {activeDragRecipe && (
            <div className="px-2 py-1.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg text-xs font-medium shadow-xl flex items-center gap-1.5 opacity-90">
              {activeDragRecipe.image_url && (
                <img
                  src={activeDragRecipe.image_url}
                  alt={activeDragRecipe.name}
                  className="w-5 h-5 min-w-[20px] rounded object-cover"
                />
              )}
              <span className="truncate max-w-[120px]">{activeDragRecipe.name}</span>
              {isAltPressed && (
                <span className="ml-1 px-1 bg-white/20 rounded text-[10px]">Kopiera</span>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      
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