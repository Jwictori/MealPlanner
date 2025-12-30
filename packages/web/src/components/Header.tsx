import { useState } from 'react'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'

export function Header() {
  const { user } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (isLogin) {
      // Login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setMessage(error.message)
      } else {
        setShowAuthForm(false)
        setEmail('')
        setPassword('')
      }
    } else {
      // Signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) {
        setMessage(error.message)
      } else if (data.user) {
        // Create user in public.users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email || email,
            name: email.split('@')[0],
            auth_provider: 'email',
            household_size: 4,
            dietary_preferences: [],
            allergies: [],
          })
        
        if (userError) {
          console.error('User creation error:', userError)
          setMessage('Konto skapat men profil kunde inte skapas. Kontakta support.')
        } else {
          setMessage('Konto skapat! Logga in nu.')
          setIsLogin(true)
        }
      }
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="bg-surface shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <span className="text-2xl">🍽️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">MealPlanner</h1>
              <p className="text-xs text-text-secondary">Smart matplanering</p>
            </div>
          </div>

          <div>
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-text-secondary hidden md:block">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text transition-colors"
                >
                  Logga ut
                </button>
              </div>
            ) : (
              <>
                {!showAuthForm ? (
                  <button
                    onClick={() => setShowAuthForm(true)}
                    className="px-6 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all shadow-md hover:shadow-lg"
                  >
                    Logga in
                  </button>
                ) : (
                  <div className="bg-surface border border-gray-200 rounded-xl p-4 shadow-lg absolute right-4 top-16 w-80">
                    <h3 className="font-bold mb-4">
                      {isLogin ? 'Logga in' : 'Skapa konto'}
                    </h3>
                    
                    <form onSubmit={handleAuth} className="space-y-3">
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-primary"
                      />
                      <input
                        type="password"
                        placeholder="Lösenord (min 6 tecken)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-primary"
                      />
                      
                      {message && (
                        <p className="text-sm text-red-600">{message}</p>
                      )}
                      
                      <button
                        type="submit"
                        className="w-full px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark"
                      >
                        {isLogin ? 'Logga in' : 'Skapa konto'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(!isLogin)
                          setMessage('')
                        }}
                        className="w-full text-sm text-text-secondary hover:text-text"
                      >
                        {isLogin ? 'Inget konto? Skapa ett' : 'Har konto? Logga in'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setShowAuthForm(false)}
                        className="w-full text-sm text-text-secondary hover:text-text"
                      >
                        Avbryt
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}