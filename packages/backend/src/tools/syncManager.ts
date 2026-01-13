/**
 * Shopping List Sync Manager
 * 
 * Handles automatic synchronization between meal plans and shopping lists.
 * When a meal plan is created/updated/deleted, the active shopping list
 * is automatically updated to reflect the changes.
 * 
 * Features:
 * - Incremental updates (no full regeneration)
 * - Preserves manual items
 * - Preserves checked state
 * - Tracks which recipes use each ingredient
 * - Tracks which dates each ingredient is needed
 */

import { supabase } from '../index.js';
import { categorizeIngredient } from '../../../shared/src/ingredientCategories.js';

export interface SyncOptions {
  userId: string;
  oldRecipeId: string | null;
  newRecipeId: string | null;
  date: string;
}

export interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  is_manual: boolean;
  used_in_recipes: string[];
  used_on_dates: string[];
  recipe_names: string[];
}

export class ShoppingListSyncManager {
  
  /**
   * Main sync function - called when meal plan changes
   * 
   * @param options - Sync configuration
   * @returns Promise<void>
   */
  static async syncMealPlanToShoppingList(options: SyncOptions): Promise<void> {
    const { userId, oldRecipeId, newRecipeId, date } = options;
    
    console.log('[Sync] Starting sync:', { userId, oldRecipeId, newRecipeId, date });
    
    // 1. Find active shopping list that covers this date
    const { data: activeList, error: listError } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', userId)
      .lte('date_range_start', date)
      .gte('date_range_end', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (listError) {
      console.error('[Sync] Error fetching shopping list:', listError);
      throw listError;
    }
    
    if (!activeList) {
      console.log('[Sync] No active shopping list found for date range, skipping sync');
      return;
    }
    
    console.log('[Sync] Found active shopping list:', activeList.id);
    
    let items = (activeList.items as ShoppingListItem[]) || [];
    
    // 2. Remove old recipe ingredients (if meal plan had a previous recipe)
    if (oldRecipeId) {
      console.log('[Sync] Removing ingredients from old recipe:', oldRecipeId);
      
      const { data: oldRecipe, error: recipeError } = await supabase
        .from('recipes')
        .select('ingredients, name')
        .eq('id', oldRecipeId)
        .single();
      
      if (recipeError) {
        console.error('[Sync] Error fetching old recipe:', recipeError);
      } else if (oldRecipe) {
        items = this.decrementIngredients(
          items,
          oldRecipe.ingredients,
          oldRecipeId,
          date
        );
        console.log('[Sync] Removed old recipe ingredients, items count:', items.length);
      }
    }
    
    // 3. Add new recipe ingredients (if meal plan has a new recipe)
    if (newRecipeId) {
      console.log('[Sync] Adding ingredients from new recipe:', newRecipeId);
      
      const { data: newRecipe, error: recipeError } = await supabase
        .from('recipes')
        .select('ingredients, name')
        .eq('id', newRecipeId)
        .single();
      
      if (recipeError) {
        console.error('[Sync] Error fetching new recipe:', recipeError);
        throw recipeError;
      }
      
      if (newRecipe) {
        items = this.incrementIngredients(
          items,
          newRecipe.ingredients,
          newRecipeId,
          newRecipe.name,
          date
        );
        console.log('[Sync] Added new recipe ingredients, items count:', items.length);
      }
    }
    
    // 4. Update shopping list in database
    const { error: updateError } = await supabase
      .from('shopping_lists')
      .update({ 
        items,
        updated_at: new Date().toISOString() 
      })
      .eq('id', activeList.id);
    
    if (updateError) {
      console.error('[Sync] Error updating shopping list:', updateError);
      throw updateError;
    }
    
    console.log('[Sync] ✅ Successfully synced shopping list');
  }
  
  /**
   * Add ingredients to shopping list (incremental)
   * 
   * @param items - Current shopping list items
   * @param ingredients - Recipe ingredients to add
   * @param recipeId - Recipe UUID
   * @param recipeName - Recipe name (for display)
   * @param date - Date when recipe is planned
   * @returns Updated items array
   */
  private static incrementIngredients(
    items: ShoppingListItem[],
    ingredients: any[],
    recipeId: string,
    recipeName: string,
    date: string
  ): ShoppingListItem[] {
    
    // Create a map for faster lookups
    const itemsMap = new Map<string, ShoppingListItem>();
    
    for (const item of items) {
      const key = this.getItemKey(item);
      itemsMap.set(key, item);
    }
    
    // Add or update ingredients
    for (const ing of ingredients) {
      const key = this.getItemKey(ing);
      
      if (itemsMap.has(key)) {
        // Update existing item
        const existing = itemsMap.get(key)!;
        
        existing.quantity = (existing.quantity || 0) + (ing.amount || 0);
        
        // Add recipe ID if not already present
        if (!existing.used_in_recipes) {
          existing.used_in_recipes = [];
        }
        if (!existing.used_in_recipes.includes(recipeId)) {
          existing.used_in_recipes.push(recipeId);
        }
        
        // Add date if not already present
        if (!existing.used_on_dates) {
          existing.used_on_dates = [];
        }
        if (!existing.used_on_dates.includes(date)) {
          existing.used_on_dates.push(date);
        }
        
        // Add recipe name if not already present
        if (!existing.recipe_names) {
          existing.recipe_names = [];
        }
        if (!existing.recipe_names.includes(recipeName)) {
          existing.recipe_names.push(recipeName);
        }
        
      } else {
        // Create new item
        const category = categorizeIngredient(ing.name);
        
        itemsMap.set(key, {
          name: ing.name,
          quantity: ing.amount || 0,
          unit: ing.unit || '',
          category,
          checked: false,
          is_manual: false,
          used_in_recipes: [recipeId],
          used_on_dates: [date],
          recipe_names: [recipeName],
        });
      }
    }
    
    return Array.from(itemsMap.values());
  }
  
  /**
   * Remove ingredients from shopping list (incremental)
   * 
   * @param items - Current shopping list items
   * @param ingredients - Recipe ingredients to remove
   * @param recipeId - Recipe UUID
   * @param date - Date when recipe was planned
   * @returns Updated items array
   */
  private static decrementIngredients(
    items: ShoppingListItem[],
    ingredients: any[],
    recipeId: string,
    date: string
  ): ShoppingListItem[] {
    
    const result: ShoppingListItem[] = [];
    
    for (const item of items) {
      // Always preserve manual items
      if (item.is_manual) {
        result.push(item);
        continue;
      }
      
      // Find matching ingredient in recipe
      const matchingIng = ingredients.find(ing => 
        this.getItemKey(ing) === this.getItemKey(item)
      );
      
      if (matchingIng) {
        // Decrement quantity
        item.quantity = (item.quantity || 0) - (matchingIng.amount || 0);
        
        // Remove recipe from tracking arrays
        if (item.used_in_recipes) {
          item.used_in_recipes = item.used_in_recipes.filter(
            (id: string) => id !== recipeId
          );
        }
        
        if (item.used_on_dates) {
          item.used_on_dates = item.used_on_dates.filter(
            (d: string) => d !== date
          );
        }
        
        // Keep item if:
        // 1. Still has positive quantity
        // 2. Still used in other recipes
        // 3. User has checked it (preserve checked state)
        const shouldKeep = 
          (item.quantity > 0.01 && item.used_in_recipes && item.used_in_recipes.length > 0) ||
          item.checked;
        
        if (shouldKeep) {
          // Ensure quantity doesn't go negative
          if (item.quantity < 0) {
            item.quantity = 0;
          }
          result.push(item);
        }
      } else {
        // Keep non-matching items
        result.push(item);
      }
    }
    
    return result;
  }
  
  /**
   * Generate unique key for ingredient/item
   * Used for matching ingredients across recipes
   * 
   * @param item - Ingredient or shopping list item
   * @returns Unique key string
   */
  private static getItemKey(item: any): string {
    const name = (item.name || '').toLowerCase().trim();
    const unit = (item.unit || '').toLowerCase().trim();
    
    // Normalize units for matching
    // ml and dl should match, g and kg should match
    let normalizedUnit = unit;
    if (unit === 'ml') normalizedUnit = 'dl';
    if (unit === 'g' && item.quantity && item.quantity >= 1000) normalizedUnit = 'kg';
    
    return `${name}_${normalizedUnit}`;
  }
  
  /**
   * Create a new shopping list for a date range
   * Useful when no active list exists
   * 
   * @param userId - User UUID
   * @param startDate - Start date (ISO format)
   * @param endDate - End date (ISO format)
   * @returns Created shopping list
   */
  static async createShoppingList(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    
    const { data, error } = await supabase
      .from('shopping_lists')
      .insert({
        user_id: userId,
        date_range_start: startDate,
        date_range_end: endDate,
        items: [],
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('[Sync] Created new shopping list:', data.id);
    return data;
  }
  
  /**
   * Get or create active shopping list for a date
   * 
   * @param userId - User UUID
   * @param date - Target date
   * @returns Active shopping list
   */
  static async getOrCreateActiveList(
    userId: string,
    date: string
  ): Promise<any> {
    
    // Try to find existing list
    const { data: existing } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', userId)
      .lte('date_range_start', date)
      .gte('date_range_end', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (existing) {
      return existing;
    }
    
    // Create new list (7 days from today)
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 7);
    
    return this.createShoppingList(
      userId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
  }
}