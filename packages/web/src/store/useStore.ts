import { create } from 'zustand'
import type { Recipe, MealPlan, User } from '@shared/types'

interface AppState {
  // User
  user: User | null
  setUser: (user: User | null) => void
  
  // Recipes
  recipes: Recipe[]
  setRecipes: (recipes: Recipe[]) => void
  addRecipe: (recipe: Recipe) => void
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void
  deleteRecipe: (id: string) => void
  
  // Meal Plans
  mealPlans: MealPlan[]
  setMealPlans: (plans: MealPlan[]) => void
  addMealPlan: (plan: MealPlan) => void
  removeMealPlan: (id: string) => void
  
  // UI State
  currentView: 'recipes' | 'planning' | 'shopping' | 'settings'
  setCurrentView: (view: AppState['currentView']) => void
  
  // Loading
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  // User
  user: null,
  setUser: (user) => set({ user }),
  
  // Recipes
  recipes: [],
  setRecipes: (recipes) => set({ recipes }),
  addRecipe: (recipe) => set((state) => ({ 
    recipes: [...state.recipes, recipe] 
  })),
  updateRecipe: (id, updates) => set((state) => ({
    recipes: state.recipes.map(r => r.id === id ? { ...r, ...updates } : r)
  })),
  deleteRecipe: (id) => set((state) => ({
    recipes: state.recipes.filter(r => r.id !== id)
  })),
  
  // Meal Plans
  mealPlans: [],
  setMealPlans: (plans) => set({ mealPlans: plans }),
  addMealPlan: (plan) => set((state) => ({
    mealPlans: [...state.mealPlans, plan]
  })),
  removeMealPlan: (id) => set((state) => ({
    mealPlans: state.mealPlans.filter(p => p.id !== id)
  })),
  
  // UI State
  currentView: 'recipes',
  setCurrentView: (view) => set({ currentView: view }),
  
  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}))
