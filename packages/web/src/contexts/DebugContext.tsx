import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from './AuthContext'

// Debug settings interface
export interface DebugSettings {
  // Logging
  enableConsoleLog: boolean        // Show console.log messages
  enablePerformanceLog: boolean    // Show timing/performance data
  logApiCalls: boolean             // Log all Supabase API calls

  // Mock data (development only)
  useMockAI: boolean               // Use mock AI responses instead of real API
  useMockRecipes: boolean          // Use test recipes

  // UI Debug
  showComponentBorders: boolean    // Visual component boundaries
  showRenderCounts: boolean        // Show re-render counters

  // Feature flags (for testing)
  enableExperimentalFeatures: boolean
}

// Default settings
const DEFAULT_SETTINGS: DebugSettings = {
  enableConsoleLog: true,
  enablePerformanceLog: false,
  logApiCalls: false,
  useMockAI: true,  // Default to mock in development
  useMockRecipes: false,
  showComponentBorders: false,
  showRenderCounts: false,
  enableExperimentalFeatures: false,
}

// Production settings (all debug features off)
const PRODUCTION_SETTINGS: DebugSettings = {
  enableConsoleLog: false,
  enablePerformanceLog: false,
  logApiCalls: false,
  useMockAI: false,
  useMockRecipes: false,
  showComponentBorders: false,
  showRenderCounts: false,
  enableExperimentalFeatures: false,
}

interface DebugContextType {
  // Current settings
  settings: DebugSettings

  // Check if debug mode is available (admin only)
  isDebugAvailable: boolean

  // Individual setting checks (convenience)
  shouldLog: boolean
  useMockAI: boolean

  // Actions
  updateSetting: <K extends keyof DebugSettings>(key: K, value: DebugSettings[K]) => void
  resetToDefaults: () => void
  toggleAllOff: () => void

  // Debug logging helper
  debugLog: (category: string, ...args: unknown[]) => void
  perfLog: (label: string, startTime: number) => void
}

const DebugContext = createContext<DebugContextType | undefined>(undefined)

const STORAGE_KEY = 'mealplanner_debug_settings'
const IS_PRODUCTION = import.meta.env.PROD

interface DebugProviderProps {
  children: ReactNode
}

export function DebugProvider({ children }: DebugProviderProps) {
  const { isAdmin } = useAuth()
  const [settings, setSettings] = useState<DebugSettings>(
    IS_PRODUCTION ? PRODUCTION_SETTINGS : DEFAULT_SETTINGS
  )

  // Load settings from localStorage on mount
  useEffect(() => {
    if (IS_PRODUCTION) return // Never load debug settings in production

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<DebugSettings>
        setSettings(prev => ({ ...prev, ...parsed }))
      }
    } catch (err) {
      console.error('Failed to load debug settings:', err)
    }
  }, [])

  // Save settings to localStorage when they change
  useEffect(() => {
    if (IS_PRODUCTION) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (err) {
      console.error('Failed to save debug settings:', err)
    }
  }, [settings])

  // Check if debug mode is available
  const isDebugAvailable = !IS_PRODUCTION && isAdmin

  // Update a single setting
  const updateSetting = useCallback(<K extends keyof DebugSettings>(
    key: K,
    value: DebugSettings[K]
  ) => {
    if (!isDebugAvailable) return

    setSettings(prev => ({ ...prev, [key]: value }))
  }, [isDebugAvailable])

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    if (!isDebugAvailable) return

    setSettings(DEFAULT_SETTINGS)
  }, [isDebugAvailable])

  // Turn all debug features off
  const toggleAllOff = useCallback(() => {
    if (!isDebugAvailable) return

    setSettings(PRODUCTION_SETTINGS)
  }, [isDebugAvailable])

  // Debug logging helper
  const debugLog = useCallback((category: string, ...args: unknown[]) => {
    if (!settings.enableConsoleLog) return
    if (IS_PRODUCTION && !isAdmin) return

    console.log(`[${category}]`, ...args)
  }, [settings.enableConsoleLog, isAdmin])

  // Performance logging helper
  const perfLog = useCallback((label: string, startTime: number) => {
    if (!settings.enablePerformanceLog) return
    if (IS_PRODUCTION && !isAdmin) return

    const duration = performance.now() - startTime
    console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`)
  }, [settings.enablePerformanceLog, isAdmin])

  // Convenience values
  const shouldLog = isDebugAvailable && settings.enableConsoleLog
  const useMockAI = isDebugAvailable && settings.useMockAI

  const value: DebugContextType = {
    settings,
    isDebugAvailable,
    shouldLog,
    useMockAI,
    updateSetting,
    resetToDefaults,
    toggleAllOff,
    debugLog,
    perfLog,
  }

  return (
    <DebugContext.Provider value={value}>
      {children}
    </DebugContext.Provider>
  )
}

// Hook to use debug context
export function useDebug(): DebugContextType {
  const context = useContext(DebugContext)
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider')
  }
  return context
}

// Conditional console.log that respects debug settings
export function useDebugLog() {
  const { debugLog } = useDebug()
  return debugLog
}

// Hook for performance measurements
export function usePerformance() {
  const { perfLog } = useDebug()

  const measure = useCallback((label: string, fn: () => void) => {
    const start = performance.now()
    fn()
    perfLog(label, start)
  }, [perfLog])

  const measureAsync = useCallback(async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now()
    const result = await fn()
    perfLog(label, start)
    return result
  }, [perfLog])

  return { measure, measureAsync }
}
