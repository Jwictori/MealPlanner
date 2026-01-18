import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { supabase } from './lib/supabase'
import { useAuth } from './contexts'
import { Header } from './components/Header'
import { Navigation } from './components/Navigation'
import { RecipesView } from './components/views/RecipesView'
import { PlanningView } from './components/views/PlanningView'
import { ShoppingView } from './components/views/ShoppingView'
import { SettingsView } from './components/views/SettingsView'
import { AdminView } from './components/views/AdminView'

function App() {
  const { currentView, setUser, setRecipes, setCurrentView } = useStore()
  const { user, isAdmin, isLoading: authLoading } = useAuth()

  // Sync auth context user to store (for backward compatibility)
  useEffect(() => {
    if (user) {
      setUser(user as any)
    } else {
      setUser(null)
    }
  }, [user, setUser])

  // Load recipes when user changes
  useEffect(() => {
    if (user?.id) {
      loadRecipes(user.id)
    } else {
      setRecipes([])
    }
  }, [user?.id, setRecipes])

  // Redirect from admin if not admin
  useEffect(() => {
    if (!authLoading && currentView === 'admin' && !isAdmin) {
      setCurrentView('recipes')
    }
  }, [currentView, isAdmin, authLoading, setCurrentView])

  const loadRecipes = async (userId: string) => {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (*)
      `)
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .order('created_at', { ascending: false })

    if (data && !error) {
      setRecipes(data as any)
    }
  }

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Laddar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {currentView === 'recipes' && <RecipesView />}
        {currentView === 'planning' && <PlanningView />}
        {currentView === 'shopping' && <ShoppingView />}
        {currentView === 'settings' && <SettingsView />}
        {currentView === 'admin' && isAdmin && <AdminView />}
      </main>

      <Navigation />
    </div>
  )
}

export default App