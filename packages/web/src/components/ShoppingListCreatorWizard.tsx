import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DateRangeSelector } from './DateRangeSelector'
import { FreshnessAnalyzer } from './FreshnessAnalyzer'
import { StrategySelector } from './StrategySelector'
import { ShoppingListGenerator } from '../lib/shoppingListGenerator'
import type { MealPlan, Recipe } from '@shared/types'
import type { FreshnessWarning } from '@shared/shoppingListTypes'

interface ShoppingListCreatorWizardProps {
  isOpen: boolean
  onClose: () => void
  mealPlans: MealPlan[]
  recipes: Recipe[]
  userId: string
  onComplete: (lists: any[]) => void
}

type Step = 'date_range' | 'analysis' | 'strategy' | 'generating'

export function ShoppingListCreatorWizard({
  isOpen,
  onClose,
  mealPlans,
  recipes,
  userId,
  onComplete
}: ShoppingListCreatorWizardProps) {
  
  const [step, setStep] = useState<Step>('date_range')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [warnings, setWarnings] = useState<FreshnessWarning[]>([])
  const [totalIngredients, setTotalIngredients] = useState(0)
  const [perishableCount, setPerishableCount] = useState(0)
  const [safeCount, setSafeCount] = useState(0)
  
  const handleDateSelect = (fromOrRange: string | { start: string; end: string }, to?: string) => {
    let from: string
    let toDate: string
    
    // Support both old format (from, to) and new format ({ start, end })
    if (typeof fromOrRange === 'object') {
      from = fromOrRange.start
      toDate = fromOrRange.end
    } else {
      from = fromOrRange
      toDate = to || fromOrRange
    }
    
    setDateFrom(from)
    setDateTo(toDate)
    
    // Analyze ingredients
    const ingredients = ShoppingListGenerator.aggregateIngredients(
      mealPlans,
      recipes,
      from,
      toDate
    )
    
    const analysisWarnings = ShoppingListGenerator.analyzeFreshness(ingredients, from)
    
    setTotalIngredients(ingredients.length)
    setWarnings(analysisWarnings)
    
    const perishable = analysisWarnings.reduce((sum, w) => sum + w.item_count, 0)
    setSafeCount(ingredients.length - perishable)
    setPerishableCount(perishable)
    
    setStep('analysis')
  }
  
  const handleStrategySelect = async (strategy: 'include_all' | 'exclude_perishables' | 'split_lists' | 'custom') => {
    setStep('generating')
    
    try {
      const lists = await ShoppingListGenerator.generateLists(
        userId,
        mealPlans,
        recipes,
        {
          dateFrom,
          dateTo,
          strategy
        }
      )
      
      onComplete(lists)
      handleClose()
    } catch (error) {
      console.error('Failed to generate shopping lists:', error)
      alert('Kunde inte skapa inköpslista. Försök igen!')
      setStep('strategy')
    }
  }
  
  const handleClose = () => {
    setStep('date_range')
    setDateFrom('')
    setDateTo('')
    setWarnings([])
    setTotalIngredients(0)
    onClose()
  }
  
  const handleBack = () => {
    if (step === 'analysis') {
      setStep('date_range')
    } else if (step === 'strategy') {
      setStep('analysis')
    }
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-surface rounded-2xl shadow-2xl flex flex-col max-h-[90vh] my-8"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                      🛒 Skapa Inköpslista
                    </h2>
                    <p className="text-text-secondary">
                      {step === 'date_range' && 'Välj period att handla för'}
                      {step === 'analysis' && 'Analys av ingredienser'}
                      {step === 'strategy' && 'Välj strategi'}
                      {step === 'generating' && 'Skapar din inköpslista...'}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-2xl text-text-secondary hover:text-text transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Progress indicator */}
                <div className="flex items-center gap-2 mt-4">
                  {['date_range', 'analysis', 'strategy', 'generating'].map((s, index) => (
                    <div key={s} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        step === s
                          ? 'bg-primary text-white'
                          : index < ['date_range', 'analysis', 'strategy', 'generating'].indexOf(step)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {index + 1}
                      </div>
                      {index < 3 && (
                        <div className={`w-12 h-1 ${
                          index < ['date_range', 'analysis', 'strategy', 'generating'].indexOf(step)
                            ? 'bg-green-500'
                            : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                  {step === 'date_range' && (
                    <motion.div
                      key="date_range"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <DateRangeSelector
                        onSelect={handleDateSelect}
                      />
                    </motion.div>
                  )}
                  
                  {step === 'analysis' && (
                    <motion.div
                      key="analysis"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <FreshnessAnalyzer
                        warnings={warnings}
                        totalIngredients={totalIngredients}
                        onContinue={() => setStep('strategy')}
                        onBack={handleBack}
                      />
                    </motion.div>
                  )}
                  
                  {step === 'strategy' && (
                    <motion.div
                      key="strategy"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <StrategySelector
                        warnings={warnings}
                        totalIngredients={totalIngredients}
                        perishableCount={perishableCount}
                        safeCount={safeCount}
                        onSelect={handleStrategySelect}
                        onBack={handleBack}
                      />
                    </motion.div>
                  )}
                  
                  {step === 'generating' && (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="text-6xl mb-4 inline-block"
                      >
                        🛒
                      </motion.div>
                      <h3 className="text-xl font-bold mb-2">Skapar din inköpslista...</h3>
                      <p className="text-text-secondary">
                        Analyserar ingredienser och optimerar hållbarhet
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}