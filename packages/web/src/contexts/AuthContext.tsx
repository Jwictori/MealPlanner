import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User, UserRole } from '@shared/types'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'

interface AuthContextType {
  // User state
  user: User | null
  session: Session | null
  isLoading: boolean

  // Role helpers
  role: UserRole
  isAdmin: boolean
  isPremium: boolean
  isAuthenticated: boolean

  // Actions
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>

  // Permission check
  can: (feature: 'household' | 'ai_planning' | 'unlimited_recipes' | 'admin_panel' | 'debug_mode') => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isLoadingRef = useRef(true) // Ref to track loading state for timeouts

  // Create a fallback user object when profile can't be fetched
  const createFallbackUser = useCallback((userId: string, authEmail?: string): User => ({
    id: userId,
    email: authEmail || '',
    role: 'user' as UserRole,
    auth_provider: 'email',
    subscription_status: 'none',
    onboarding_completed: false,
    onboarding_step: 0,
    household_size: 1,
    dietary_preferences: [],
    allergies: [],
    created_at: new Date(),
    updated_at: new Date(),
  }), [])

  // Fetch user profile from our users table with timeout
  const fetchUserProfile = useCallback(async (userId: string, authEmail?: string): Promise<User> => {
    console.log('[AuthContext] fetchUserProfile called for:', userId)
    try {
      // Add timeout to prevent hanging queries
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 3000)
      })

      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      if (error) {
        console.error('[AuthContext] Error fetching user profile:', error)
        // Return a minimal user object so the app still works
        return createFallbackUser(userId, authEmail)
      }

      console.log('[AuthContext] Profile data received:', data)
      return data as User
    } catch (err) {
      console.error('[AuthContext] Exception in fetchUserProfile:', err)
      // Always return a fallback user so login works
      return createFallbackUser(userId, authEmail)
    }
  }, [createFallbackUser])

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (session?.user?.id) {
      const profile = await fetchUserProfile(session.user.id)
      setUser(profile)
    }
  }, [session?.user?.id, fetchUserProfile])

  // Initialize auth state
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      console.log('[AuthContext] Starting auth initialization...')
      try {
        // Get current session
        console.log('[AuthContext] Getting session...')
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('[AuthContext] Session error:', sessionError)
        }

        console.log('[AuthContext] Session retrieved:', currentSession ? 'has session' : 'no session')

        if (!isMounted) return
        setSession(currentSession)

        if (currentSession?.user?.id) {
          console.log('[AuthContext] Fetching user profile for:', currentSession.user.id)
          const profile = await fetchUserProfile(
            currentSession.user.id,
            currentSession.user.email
          )
          console.log('[AuthContext] Profile fetched:', profile ? 'success' : 'null')
          if (isMounted) {
            setUser(profile)
          }
        }
      } catch (err) {
        console.error('[AuthContext] Error initializing auth:', err)
      } finally {
        console.log('[AuthContext] Setting isLoading to false')
        if (isMounted) {
          isLoadingRef.current = false
          setIsLoading(false)
        }
      }
    }

    // Safety timeout - if auth takes more than 5 seconds, show app anyway
    const timeoutId = setTimeout(() => {
      if (isMounted && isLoadingRef.current) {
        console.warn('[AuthContext] Auth timeout reached - showing app without waiting')
        isLoadingRef.current = false
        setIsLoading(false)
      }
    }, 5000)

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        console.log('[AuthContext] Auth state changed:', event, 'session:', newSession ? 'exists' : 'null')
        setSession(newSession)

        if (event === 'SIGNED_IN' && newSession?.user?.id) {
          // If we're still in initial loading, skip fetching here - initAuth will handle it
          // This prevents the race condition where SIGNED_IN fires before the client is ready
          if (isLoadingRef.current) {
            console.log('[AuthContext] SIGNED_IN during initial load - letting initAuth handle profile fetch')
            return
          }

          // For subsequent logins (after initial load), fetch the profile
          console.log('[AuthContext] SIGNED_IN - fetching profile for:', newSession.user.id)
          const profile = await fetchUserProfile(
            newSession.user.id,
            newSession.user.email
          )
          if (!isMounted) return

          console.log('[AuthContext] SIGNED_IN - setting user:', profile?.email)
          setUser(profile)
          console.log('[AuthContext] SIGNED_IN - user state updated')
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] SIGNED_OUT - clearing user')
          setUser(null)
        } else if (event === 'USER_UPDATED' && newSession?.user?.id) {
          console.log('[AuthContext] USER_UPDATED - refreshing profile')
          const profile = await fetchUserProfile(
            newSession.user.id,
            newSession.user.email
          )
          setUser(profile)
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [fetchUserProfile])

  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error ? new Error(error.message) : null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  // Sign up with email/password
  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      return { error: error ? new Error(error.message) : null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  // Role derived values
  const role: UserRole = user?.role ?? 'guest'
  const isAdmin = role === 'admin'
  const isPremium = role === 'premium' || role === 'admin'
  const isAuthenticated = !!session && !!user

  // Permission check function
  const can = (feature: 'household' | 'ai_planning' | 'unlimited_recipes' | 'admin_panel' | 'debug_mode'): boolean => {
    if (!isAuthenticated) return false

    switch (feature) {
      case 'admin_panel':
      case 'debug_mode':
        return isAdmin
      case 'household':
      case 'ai_planning':
      case 'unlimited_recipes':
        return isPremium
      default:
        return true
    }
  }

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    role,
    isAdmin,
    isPremium,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    refreshUser,
    can,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-order component for admin-only routes
export function withAdminAccess<P extends object>(Component: React.ComponentType<P>) {
  return function AdminProtectedComponent(props: P) {
    const { isAdmin, isLoading } = useAuth()

    if (isLoading) {
      return <div className="flex items-center justify-center h-full">Laddar...</div>
    }

    if (!isAdmin) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Åtkomst nekad</h2>
            <p className="text-text-secondary">Du har inte behörighet att se denna sida.</p>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}

// Higher-order component for premium-only features
export function withPremiumAccess<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function PremiumProtectedComponent(props: P) {
    const { isPremium, isLoading } = useAuth()

    if (isLoading) {
      return <div className="flex items-center justify-center h-full">Laddar...</div>
    }

    if (!isPremium) {
      return fallback ?? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-6 bg-surface rounded-xl">
            <h2 className="text-xl font-bold mb-2">Premium-funktion</h2>
            <p className="text-text-secondary mb-4">
              Uppgradera till Premium för att använda denna funktion.
            </p>
            <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
              Uppgradera nu
            </button>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}
