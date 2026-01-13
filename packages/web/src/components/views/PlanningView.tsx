import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import { WeekCalendar } from '../WeekCalendar'
import { MonthCalendarView } from '../MonthCalendarView'
import { SelectRecipeModal } from '../SelectRecipeModal'
import { RecipeDetailModal } from '../RecipeDetailModal'
import { QuickPresets } from '../QuickPresets'
import { AIMealPlanner } from '../AIMealPlanner'
import { ClearWeekModal } from '../ClearWeekModal'
import { WeekSelectorModal } from '../WeekSelectorModal'
import { PopulateChoiceModal } from '../PopulateChoiceModal'
import { ShoppingListCreatorWizard } from '../ShoppingListCreatorWizard'
import { DateRangeSelector } from '../DateRangeSelector'
import { format, addDays, startOfWeek } from 'date-fns'
import type { Recipe, MealPlan } from '@shared/types'

type ViewMode = 'week' | 'month'
type PlannerType = 'preset' | 'ai' | null

export function PlanningView() {
  const { user, recipes, mealPlans, setMealPlans, addMealPlan, removeMealPlan } = useStore()
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false)
  const [isPresetsOpen, setIsPresetsOpen] = useState(false)
  const [isAIPlannerOpen, setIsAIPlannerOpen] = useState(false)
  const [isClearWeekModalOpen, setIsClearWeekModalOpen] = useState(false)
  const [isWeekSelectorOpen, setIsWeekSelectorOpen] = useState(false)
  const [selectedWeekToClear, setSelectedWeekToClear] = useState<Date | null>(null)
  const [isPopulateChoiceOpen, setIsPopulateChoiceOpen] = useState(false)
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [userPreferences, setUserPreferences] = useState<any>(null)
  const [pendingPresetRecipes, setPendingPresetRecipes] = useState<Recipe[]>([])
  
  // Date range selector state
  const [showDateSelector, setShowDateSelector] = useState(false)
  const [plannerType, setPlannerType] = useState<PlannerType>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string } | null>(null)

  useEffect(() => {
    if (user) {
      loadMealPlans()
      loadUserPreferences()
    }
  }, [user])

  const loadUserPreferences = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (!error && data) {
        setUserPreferences(data)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const loadMealPlans = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      if (error) throw error
      if (data) {
        setMealPlans(data)
      }
    } catch (error) {
      console.error('Error loading meal plans:', error)
    }
  }

  const handleAddMeal = (date: string) => {
    setSelectedDate(date)
    setIsSelectModalOpen(true)
  }

  const handleSelectRecipe = async (recipeId: string) => {
    if (!selectedDate || !user) return

    try {
      const newMealPlan: Partial<MealPlan> = {
        user_id: user.id,
        recipe_id: recipeId,
        date: selectedDate,
      }

      // Use upsert to replace existing meal plan for this date
      const { data, error } = await supabase
        .from('meal_plans')
        .upsert([newMealPlan], { onConflict: 'user_id,date' })
        .select()
        .single()

      if (error) throw error
      if (data) {
        // Remove any existing meal plan for this date from local state
        const existingPlan = mealPlans.find(mp => mp.date === selectedDate && mp.user_id === user.id)
        if (existingPlan) {
          removeMealPlan(existingPlan.id)
        }
        addMealPlan(data)
      }

      setIsSelectModalOpen(false)
      setSelectedDate(null)
    } catch (error) {
      console.error('Error adding meal plan:', error)
    }
  }

  const handleRemoveMeal = async (mealPlanId: string) => {
    console.log('🗑️ Removing meal plan:', mealPlanId, 'Type:', typeof mealPlanId)

    try {
      // Find the meal plan to get more details for debugging
      const mealPlan = mealPlans.find(mp => mp.id === mealPlanId)
      console.log('📋 Found meal plan:', mealPlan)

      if (!mealPlan) {
        console.warn('⚠️ Meal plan not found in local state')
      }

      const { error, data } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', mealPlanId)
        .select()

      console.log('🔄 Delete result:', { error, data })

      if (error) throw error

      removeMealPlan(mealPlanId)

      // Reload meal plans to ensure sync
      await loadMealPlans()
    } catch (error) {
      console.error('Error removing meal plan:', error)
    }
  }

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setIsDetailModalOpen(true)
  }

  const handleMoveMeal = async (planId: string, newDate: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('meal_plans')
        .update({ date: newDate })
        .eq('id', planId)

      if (error) throw error

      // Reload meal plans to reflect change
      await loadMealPlans()
    } catch (error) {
      console.error('Error moving meal:', error)
    }
  }

  const handleDuplicateMeal = async (planId: string, newDate: string) => {
    if (!user) return

    try {
      // Find the original plan
      const originalPlan = mealPlans.find(p => p.id === planId)
      if (!originalPlan) return

      // Create a copy on the new date
      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          user_id: user.id,
          recipe_id: originalPlan.recipe_id,
          date: newDate
        })
        .select()
        .single()

      if (error) throw error
      if (data) {
        addMealPlan(data)
      }
    } catch (error) {
      console.error('Error duplicating meal:', error)
    }
  }

  // ✅ FIXED: Now uses selectedDateRange!
  const handleQuickPresetSelect = (selectedRecipes: Recipe[]) => {
    if (!selectedDateRange) {
      console.error('❌ No date range selected')
      return
    }
    
    console.log('📅 Selected date range:', selectedDateRange)
    
    // Calculate dates in selected range
    const startDate = new Date(selectedDateRange.start)
    const endDate = new Date(selectedDateRange.end)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    const rangeDates = Array.from({ length: daysDiff }, (_, i) => 
      format(addDays(startDate, i), 'yyyy-MM-dd')
    )
    
    console.log('📆 Range dates:', rangeDates)
    
    const rangeExistingMeals = mealPlans.filter(mp => 
      rangeDates.includes(mp.date)
    )
    
    console.log('🍽️ Existing meals in range:', rangeExistingMeals.length, 'out of', daysDiff, 'days')
    console.log('📊 Empty days:', daysDiff - rangeExistingMeals.length)

    if (rangeExistingMeals.length > 0) {
      // Has existing meals - ask user what to do
      setPendingPresetRecipes(selectedRecipes)
      setIsPopulateChoiceOpen(true)
    } else {
      // Empty range - just add all
      handleGenerateWeek(selectedRecipes)
    }
  }

  const handlePopulateChoice = async (mode: 'fill' | 'replace') => {
    if (!user || !selectedDateRange || pendingPresetRecipes.length === 0) return

    try {
      const startDate = new Date(selectedDateRange.start)
      const endDate = new Date(selectedDateRange.end)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      
      const rangeDates = Array.from({ length: daysDiff }, (_, i) => 
        format(addDays(startDate, i), 'yyyy-MM-dd')
      )

      if (mode === 'replace') {
        // Delete all meals in range
        const existingMeals = mealPlans.filter(mp => rangeDates.includes(mp.date))
        
        for (const meal of existingMeals) {
          const { error } = await supabase
            .from('meal_plans')
            .delete()
            .eq('id', meal.id)
          
          if (error) throw error
        }

        // Add all new recipes
        await handleGenerateWeek(pendingPresetRecipes)
      } else {
        // mode === 'fill' - only add to empty days
        const filledDates = new Set(mealPlans.filter(mp => rangeDates.includes(mp.date)).map(mp => mp.date))
        
        // Find empty days
        const emptyDayOffsets: number[] = []
        rangeDates.forEach((date, index) => {
          if (!filledDates.has(date)) {
            emptyDayOffsets.push(index)
          }
        })

        // Take only as many recipes as we have empty days
        const recipesToAdd = pendingPresetRecipes.slice(0, emptyDayOffsets.length)
        
        if (recipesToAdd.length > 0) {
          await handleGenerateWeek(recipesToAdd, emptyDayOffsets)
        }
      }

      setPendingPresetRecipes([])
    } catch (error) {
      console.error('Error populating range:', error)
    }
  }

  const handleClearWeek = async () => {
    if (!user) return

    try {
      // Use selectedWeekToClear if set (from month view), otherwise currentDate
      const dateToUse = selectedWeekToClear || currentDate
      const weekStart = startOfWeek(dateToUse, { weekStartsOn: 1 })
      const weekDates = Array.from({ length: 7 }, (_, i) => 
        format(addDays(weekStart, i), 'yyyy-MM-dd')
      )
      
      const mealsToDelete = mealPlans.filter(mp => weekDates.includes(mp.date))

      for (const meal of mealsToDelete) {
        const { error } = await supabase
          .from('meal_plans')
          .delete()
          .eq('id', meal.id)
        
        if (error) throw error
        removeMealPlan(meal.id)
      }

      setIsClearWeekModalOpen(false)
      setSelectedWeekToClear(null)
    } catch (error) {
      console.error('Error clearing week:', error)
    }
  }
  
  const handleWeekSelect = (weekStart: Date) => {
    setSelectedWeekToClear(weekStart)
    setIsClearWeekModalOpen(true)
  }

  const handleClearMonth = async () => {
    if (!user) return

    if (!window.confirm('Är du säker på att du vill ta bort alla måltider för hela månaden?')) {
      return
    }

    try {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      const monthDates: string[] = []
      for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        monthDates.push(format(d, 'yyyy-MM-dd'))
      }

      const mealsToDelete = mealPlans.filter(mp => monthDates.includes(mp.date))

      for (const meal of mealsToDelete) {
        const { error } = await supabase
          .from('meal_plans')
          .delete()
          .eq('id', meal.id)

        if (error) throw error
        removeMealPlan(meal.id)
      }
    } catch (error) {
      console.error('Error clearing month:', error)
    }
  }

  const handleGenerateWeek = async (selectedRecipes: Recipe[], dayOffsets?: number[]) => {
    if (!user || !selectedDateRange) return

    try {
      const startDate = new Date(selectedDateRange.start)
      
      // Use provided dayOffsets or generate sequential days
      const offsets = dayOffsets || Array.from({ length: selectedRecipes.length }, (_, i) => i)
      
      for (let i = 0; i < selectedRecipes.length; i++) {
        const recipe = selectedRecipes[i]
        const offset = offsets[i]
        const date = format(addDays(startDate, offset), 'yyyy-MM-dd')

        const newMealPlan: Partial<MealPlan> = {
          user_id: user.id,
          recipe_id: recipe.id,
          date: date,
        }

        const { data, error } = await supabase
          .from('meal_plans')
          .insert([newMealPlan])
          .select()
          .single()

        if (error) throw error
        if (data) {
          addMealPlan(data)
        }
      }

      setIsPresetsOpen(false)
      setIsAIPlannerOpen(false)
      setIsPopulateChoiceOpen(false)
      setPendingPresetRecipes([])
    } catch (error) {
      console.error('Error generating week:', error)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-text-secondary">Logga in för att se matplaneringen</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">Matplanering</h2>
            
            {/* View mode toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'week'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📅 Vecka
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'month'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📆 Månad
              </button>
            </div>
            
            {/* Clear button - different behavior per view */}
            {(() => {
              if (viewMode === 'month') {
                // In month view - show button if ANY meals exist in the month
                const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
                const monthDates: string[] = []
                for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
                  monthDates.push(format(d, 'yyyy-MM-dd'))
                }
                const mealsInMonth = mealPlans.filter(mp => monthDates.includes(mp.date))

                return mealsInMonth.length > 0 && (
                  <button
                    onClick={() => setIsWeekSelectorOpen(true)}
                    className="px-4 py-2 text-red-600 border-2 border-red-300 rounded-lg font-medium hover:bg-red-50 transition-all flex items-center gap-2"
                  >
                    <span>🗑️</span>
                    <span className="text-sm">Rensa...</span>
                  </button>
                )
              } else {
                // In week view - show for current week
                const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
                const weekDates = Array.from({ length: 7 }, (_, i) =>
                  format(addDays(weekStart, i), 'yyyy-MM-dd')
                )
                const mealsInWeek = mealPlans.filter(mp => weekDates.includes(mp.date))

                return mealsInWeek.length > 0 && (
                  <button
                    onClick={() => setIsClearWeekModalOpen(true)}
                    className="px-4 py-2 text-red-600 border-2 border-red-300 rounded-lg font-medium hover:bg-red-50 transition-all flex items-center gap-2"
                  >
                    <span>🗑️</span>
                    <span className="text-sm">Rensa vecka</span>
                  </button>
                )
              }
            })()}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsShoppingListOpen(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <span>🛒</span>
              <span>Inköpslista</span>
            </button>
            <button
              onClick={() => {
                setPlannerType('preset')
                setShowDateSelector(true)
              }}
              className="px-6 py-3 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary-dark transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <span>⚡</span>
              <span>Snabbplanering</span>
            </button>
            <button
              onClick={() => {
                setPlannerType('ai')
                setShowDateSelector(true)
              }}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <span>🤖</span>
              <span>AI-planering (max 7 dagar)</span>
            </button>
          </div>
        </div>
        <p className="text-text-secondary">
          {viewMode === 'month' 
            ? 'Planera dina måltider för månaden. Välj datumspann med Snabbplanering eller AI-planering!'
            : 'Planera dina måltider för veckan. Använd Snabbplanering för färdiga teman eller AI för smart personlig planering!'
          }
        </p>
      </div>
      
      {/* Date Range Selector Modal */}
      {showDateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <DateRangeSelector
            currentDate={viewMode === 'month' ? currentDate : new Date()}
            maxDays={plannerType === 'ai' ? 7 : undefined}
            onSelectRange={(start, end) => {
              setSelectedDateRange({ start, end })
              setShowDateSelector(false)
              
              // Open appropriate planner
              if (plannerType === 'preset') {
                setIsPresetsOpen(true)
              } else if (plannerType === 'ai') {
                setIsAIPlannerOpen(true)
              }
            }}
            onCancel={() => {
              setShowDateSelector(false)
              setPlannerType(null)
            }}
          />
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'week' ? (
        <WeekCalendar
          mealPlans={mealPlans}
          recipes={recipes}
          onAddMeal={handleAddMeal}
          onRemoveMeal={handleRemoveMeal}
          onRecipeClick={handleRecipeClick}
          currentDate={currentDate}
          onWeekChange={setCurrentDate}
        />
      ) : (
        <MonthCalendarView
          mealPlans={mealPlans}
          recipes={recipes}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onAddMeal={handleAddMeal}
          onViewMeal={(plan: MealPlan) => {
            const recipe = recipes.find(r => r.id === plan.recipe_id)
            if (recipe) {
              setSelectedRecipe(recipe)
              setIsDetailModalOpen(true)
            }
          }}
          onDeleteMeal={handleRemoveMeal}
          onMoveMeal={handleMoveMeal}
          onDuplicateMeal={handleDuplicateMeal}
        />
      )}

      <SelectRecipeModal
        isOpen={isSelectModalOpen}
        onClose={() => {
          setIsSelectModalOpen(false)
          setSelectedDate(null)
        }}
        onSelectRecipe={handleSelectRecipe}
        recipes={recipes}
        selectedDate={selectedDate}
      />

      <QuickPresets
        isOpen={isPresetsOpen}
        onClose={() => {
          setIsPresetsOpen(false)
          setSelectedDateRange(null)
        }}
        recipes={recipes}
        userPreferences={userPreferences}
        onGenerate={handleQuickPresetSelect}
        dateRange={selectedDateRange}
      />

      <AIMealPlanner
        isOpen={isAIPlannerOpen}
        onClose={() => {
          setIsAIPlannerOpen(false)
          setSelectedDateRange(null)
        }}
        recipes={recipes}
        userPreferences={userPreferences}
        onGenerate={handleGenerateWeek}
        dateRange={selectedDateRange}
      />

      <RecipeDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedRecipe(null)
        }}
        recipe={selectedRecipe}
        onEdit={() => {
          // TODO: Implement edit functionality
          console.log('Edit recipe:', selectedRecipe?.id)
        }}
        onDelete={() => {
          // TODO: Implement delete functionality
          console.log('Delete recipe:', selectedRecipe?.id)
        }}
      />

      <PopulateChoiceModal
        isOpen={isPopulateChoiceOpen}
        onClose={() => {
          setIsPopulateChoiceOpen(false)
          setPendingPresetRecipes([])
        }}
        onChoice={handlePopulateChoice}
        emptyDays={selectedDateRange ? (() => {
          const startDate = new Date(selectedDateRange.start)
          const endDate = new Date(selectedDateRange.end)
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
          const rangeDates = Array.from({ length: daysDiff }, (_, i) => 
            format(addDays(startDate, i), 'yyyy-MM-dd')
          )
          return daysDiff - mealPlans.filter(mp => rangeDates.includes(mp.date)).length
        })() : 0}
        filledDays={selectedDateRange ? (() => {
          const startDate = new Date(selectedDateRange.start)
          const endDate = new Date(selectedDateRange.end)
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
          const rangeDates = Array.from({ length: daysDiff }, (_, i) => 
            format(addDays(startDate, i), 'yyyy-MM-dd')
          )
          return mealPlans.filter(mp => rangeDates.includes(mp.date)).length
        })() : 0}
      />

      <WeekSelectorModal
        isOpen={isWeekSelectorOpen}
        onClose={() => setIsWeekSelectorOpen(false)}
        onSelectWeek={handleWeekSelect}
        onClearMonth={handleClearMonth}
        currentMonth={currentDate}
        mealPlans={mealPlans}
      />

      <ClearWeekModal
        isOpen={isClearWeekModalOpen}
        onClose={() => {
          setIsClearWeekModalOpen(false)
          setSelectedWeekToClear(null)
        }}
        onConfirm={handleClearWeek}
        mealCount={(() => {
          const dateToUse = selectedWeekToClear || currentDate
          const weekStart = startOfWeek(dateToUse, { weekStartsOn: 1 })
          const weekDates = Array.from({ length: 7 }, (_, i) => 
            format(addDays(weekStart, i), 'yyyy-MM-dd')
          )
          return mealPlans.filter(mp => weekDates.includes(mp.date)).length
        })()}
      />

      <ShoppingListCreatorWizard
        isOpen={isShoppingListOpen}
        onClose={() => setIsShoppingListOpen(false)}
        mealPlans={mealPlans}
        recipes={recipes}
        userId={user.id}

        // PlanningView.tsx - onComplete handler för ShoppingListCreatorWizard
        // Ersätt hela onComplete prop med detta:

        onComplete={async (lists) => {
          console.log('✅ Shopping lists created from wizard:', lists)
          
          try {
            for (const list of lists) {
              console.log('➕ Creating list:', list.name)
              
              // 1. Get meal plans in date range with recipes and their ingredients
              const { data: mealPlansInRange, error: mealPlansError } = await supabase
                .from('meal_plans')
                .select(`
                  id,
                  date,
                  recipe_id,
                  recipes (
                    id,
                    name,
                    recipe_ingredients (*)
                  )
                `)
                .eq('user_id', user.id)
                .gte('date', list.date_range_start)
                .lte('date', list.date_range_end)

              if (mealPlansError) {
                console.error('❌ Failed to fetch meal plans:', mealPlansError)
                continue
              }

              console.log(`📦 Found ${mealPlansInRange?.length || 0} meal plans`)

              // 2. Aggregate ingredients from recipe_ingredients table
              const itemsMap = new Map()

              for (const mp of mealPlansInRange || []) {
                // Handle recipe - could be object or array
                const recipe = Array.isArray(mp.recipes) ? mp.recipes[0] : mp.recipes
                if (!recipe) continue

                // Get ingredients from recipe_ingredients (new relational format)
                const ingredients = recipe.recipe_ingredients || []
                if (ingredients.length === 0) continue

                for (const ing of ingredients) {
                  const key = `${ing.ingredient_name}_${ing.unit}`

                  if (itemsMap.has(key)) {
                    const existing = itemsMap.get(key)
                    existing.quantity += ing.quantity || 0
                    existing.used_on_dates.push(mp.date)
                  } else {
                    itemsMap.set(key, {
                      id: crypto.randomUUID(),
                      ingredient_name: ing.ingredient_name,
                      quantity: ing.quantity || 0,
                      unit: ing.unit,
                      category: 'other',
                      checked: false,
                      recipe_id: mp.recipe_id,
                      used_on_dates: [mp.date],
                      order: itemsMap.size
                    })
                  }
                }
              }

              const items = Array.from(itemsMap.values())
              console.log(`📝 Aggregated ${items.length} unique items`)

              // 3. Create shopping list WITH items
              const { data: listData, error: listError } = await supabase
                .from('shopping_lists')
                .insert({
                  user_id: list.user_id,
                  name: list.name,
                  date_range_start: list.date_range_start,
                  date_range_end: list.date_range_end,
                  status: list.status || 'active',
                  split_mode: list.split_mode || 'single',
                  warnings: list.warnings || [],
                  items: items  // ← Items included directly!
                })
                .select()
                .single()

              if (listError || !listData) {
                console.error('❌ Failed to create list:', listError)
                continue
              }

              console.log('✅ Created list with', items.length, 'items')
            }

            // 4. Close wizard
            setIsShoppingListOpen(false)
            
            // 5. Show success message
            alert(`✅ Inköpslista skapad! Gå till Inköp-fliken för att se den.`)
            
          } catch (error) {
            console.error('❌ Error creating shopping lists:', error)
            alert('❌ Kunde inte skapa inköpslista. Försök igen.')
          }
        }}
      />
    </div>
  )
}