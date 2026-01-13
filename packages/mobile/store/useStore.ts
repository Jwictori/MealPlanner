import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Recipe, MealPlan, ShoppingList, ShoppingListItem } from '../types';

interface Store {
  user: User | null;
  recipes: Recipe[];
  mealPlans: MealPlan[];
  shoppingLists: ShoppingList[];
  loading: boolean;
  
  setUser: (user: User | null) => void;
  setRecipes: (recipes: Recipe[]) => void;
  setMealPlans: (plans: MealPlan[]) => void;
  setShoppingLists: (lists: ShoppingList[]) => void;
  
  loadRecipes: () => Promise<void>;
  loadMealPlans: () => Promise<void>;
  loadShoppingLists: () => Promise<void>;
  
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Promise<void>;
  addMealPlan: (plan: Omit<MealPlan, 'id'>) => Promise<void>;
  removeMealPlan: (id: string) => Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
  user: null,
  recipes: [],
  mealPlans: [],
  shoppingLists: [],
  loading: false,
  
  setUser: (user) => set({ user }),
  setRecipes: (recipes) => set({ recipes }),
  setMealPlans: (plans) => set({ mealPlans: plans }),
  setShoppingLists: (lists) => set({ shoppingLists: lists }),
  
  loadRecipes: async () => {
    const { user } = get();
    if (!user) return;
    
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) set({ recipes: data });
  },
  
  loadMealPlans: async () => {
    const { user } = get();
    if (!user) return;
    
    const { data } = await supabase
      .from('meal_plans')
      .select(`
        *,
        recipe:recipes(*)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: true });
    
    if (data) set({ mealPlans: data as MealPlan[] });
  },
  
  loadShoppingLists: async () => {
    const { user } = get();
    if (!user) return;
    
    const { data } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) set({ shoppingLists: data });
  },
  
  addRecipe: async (recipe) => {
    const { user } = get();
    if (!user) return;
    
    const { data } = await supabase
      .from('recipes')
      .insert({ ...recipe, user_id: user.id })
      .select()
      .single();
    
    if (data) {
      set({ recipes: [data, ...get().recipes] });
    }
  },
  
  addMealPlan: async (plan) => {
    const { user } = get();
    if (!user) return;
    
    const { data } = await supabase
      .from('meal_plans')
      .insert({ ...plan, user_id: user.id })
      .select(`*, recipe:recipes(*)`)
      .single();
    
    if (data) {
      set({ mealPlans: [...get().mealPlans, data as MealPlan] });
    }
  },
  
  removeMealPlan: async (id) => {
    await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id);
    
    set({ mealPlans: get().mealPlans.filter(p => p.id !== id) });
  },
}));
