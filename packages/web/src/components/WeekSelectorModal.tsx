import { motion, AnimatePresence } from 'framer-motion'
import { startOfWeek, endOfWeek, format, addDays, isSameMonth } from 'date-fns'
import { sv } from 'date-fns/locale'
import { getWeek } from 'date-fns'
import type { MealPlan } from '@shared/types'

interface WeekSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectWeek: (weekStart: Date) => void
  currentMonth: Date
  mealPlans: MealPlan[]
}

export function WeekSelectorModal({
  isOpen,
  onClose,
  onSelectWeek,
  currentMonth,
  mealPlans
}: WeekSelectorModalProps) {
  
  // Get all weeks in the current month
  const getWeeksInMonth = () => {
    const weeks: { start: Date; end: Date; weekNumber: number; mealCount: number }[] = []
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    
    let currentWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    
    while (currentWeekStart <= monthEnd) {
      const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
      
      // Only include weeks that have at least one day in the current month
      if (isSameMonth(currentWeekStart, currentMonth) || isSameMonth(currentWeekEnd, currentMonth)) {
        const weekDates = Array.from({ length: 7 }, (_, i) => 
          format(addDays(currentWeekStart, i), 'yyyy-MM-dd')
        )
        const mealCount = mealPlans.filter(mp => weekDates.includes(mp.date)).length
        
        weeks.push({
          start: currentWeekStart,
          end: currentWeekEnd,
          weekNumber: getWeek(currentWeekStart, { locale: sv }),
          mealCount
        })
      }
      
      currentWeekStart = addDays(currentWeekStart, 7)
    }
    
    return weeks
  }
  
  const weeks = getWeeksInMonth()
  const weeksWithMeals = weeks.filter(w => w.mealCount > 0)
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-2xl shadow-2xl p-6 max-w-md w-full"
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">Välj vecka att rensa</h3>
                <p className="text-text-secondary text-sm">
                  {format(currentMonth, 'MMMM yyyy', { locale: sv })}
                </p>
              </div>

              {weeksWithMeals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary">
                    Inga måltider planerade i {format(currentMonth, 'MMMM', { locale: sv })}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {weeksWithMeals.map((week, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        onSelectWeek(week.start)
                        onClose()
                      }}
                      className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-red-500 hover:bg-red-50 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-red-700">
                            Vecka {week.weekNumber}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {format(week.start, 'd MMM', { locale: sv })} - {format(week.end, 'd MMM', { locale: sv })}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-red-600">
                              {week.mealCount}
                            </div>
                            <div className="text-xs text-gray-500">
                              måltid{week.mealCount !== 1 ? 'er' : ''}
                            </div>
                          </div>
                          <div className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                            🗑️
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-all"
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
