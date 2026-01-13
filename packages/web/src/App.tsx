import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { supabase } from './lib/supabase'
import { Header } from './components/Header'
import { Navigation } from './components/Navigation'
import { RecipesView } from './components/views/RecipesView'
import { PlanningView } from './components/views/PlanningView'
import { ShoppingView } from './components/views/ShoppingView'
import { SettingsView } from './components/views/SettingsView'
import { AdminView } from './components/views/AdminView'

function App() {
  const { currentView, setUser, setRecipes } = useStore()

  useEffect(() => {
    // Check current auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user as any)
        loadRecipes(session.user.id)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user as any)
        loadRecipes(session.user.id)
      } else {
        setUser(null)
        setRecipes([])
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setRecipes])

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {currentView === 'recipes' && <RecipesView />}
        {currentView === 'planning' && <PlanningView />}
        {currentView === 'shopping' && <ShoppingView />}
        {currentView === 'settings' && <SettingsView />}
        {currentView === 'admin' && <AdminView />}
      </main>

      <Navigation />
    </div>
  )
}

export default App