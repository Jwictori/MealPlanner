import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import { RecipeCard } from '../RecipeCard'
import { RecipeModal } from '../RecipeModal'
import { RecipeDetailModal } from '../RecipeDetailModal'
import type { Recipe } from '@shared/types'

export function RecipesView() {
  const { recipes, user, setRecipes, setIsLoading, deleteRecipe } = useStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')

  const loadRecipes = useCallback(async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setRecipes(data as any)
      }
    } catch (error) {
      console.error('Error loading recipes:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, setRecipes, setIsLoading])

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setIsDetailModalOpen(true)
  }

  const handleEditRecipe = () => {
    setRecipeToEdit(selectedRecipe || undefined)
    setIsDetailModalOpen(false)
    setIsModalOpen(true)
  }

  const handleDeleteRecipe = async () => {
    if (!selectedRecipe || !confirm('Är du säker på att du vill ta bort detta recept?')) return

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', selectedRecipe.id)

      if (!error) {
        deleteRecipe(selectedRecipe.id)
        setIsDetailModalOpen(false)
        setSelectedRecipe(null)
      }
    } catch (error) {
      console.error('Error deleting recipe:', error)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setRecipeToEdit(undefined)
  }

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (!user) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🍽️</div>
        <h2 className="text-2xl font-bold mb-2">Välkommen till MealPlanner!</h2>
        <p className="text-text-secondary">Logga in för att komma igång</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Mina Recept</h2>
        
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Sök recept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none flex-1 md:w-64"
          />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all shadow-md hover:shadow-lg whitespace-nowrap"
          >
            + Nytt Recept
          </button>
        </div>
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📖</div>
          <h3 className="text-xl font-bold mb-2">
            {searchQuery ? 'Inga recept hittades' : 'Inga recept än'}
          </h3>
          <p className="text-text-secondary mb-4">
            {searchQuery ? 'Prova en annan sökning' : 'Skapa ditt första recept!'}
          </p>
          {!searchQuery && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
            >
              + Skapa Recept
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe}
              onClick={() => handleRecipeClick(recipe)}
            />
          ))}
        </div>
      )}

      <RecipeModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        recipe={recipeToEdit}
      />

      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleEditRecipe}
        onDelete={handleDeleteRecipe}
      />
    </div>
  )
}