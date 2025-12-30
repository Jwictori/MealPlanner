import type { MealPlan, Recipe } from '@shared/types'
import type { ShoppingList, ShoppingListItem } from '@shared/shoppingListTypes'

export interface SyncConflict {
  type: 'removed_recipe' | 'added_recipe' | 'date_changed'
  recipeId: string
  recipeName: string
  affectedItems: ShoppingListItem[]
  purchasedCount: number
}

interface SyncResult {
  conflicts: SyncConflict[]
  newItems: ShoppingListItem[]
  removedItems: ShoppingListItem[]
  hasChanges: boolean
}

export class ShoppingListSyncManager {
  
  /**
   * Analyze changes between current meal plans and shopping list
   */
  static analyzeChanges(
    shoppingList: ShoppingList,
    currentItems: ShoppingListItem[],
    oldMealPlans: MealPlan[],
    newMealPlans: MealPlan[],
    recipes: Recipe[]
  ): SyncResult {
    
    const conflicts: SyncConflict[] = []
    const newItems: ShoppingListItem[] = []
    const removedItems: ShoppingListItem[] = []
    
    // Get recipe IDs in list date range
    const listStart = new Date(shoppingList.date_range_start)
    const listEnd = new Date(shoppingList.date_range_end)
    
    const oldRecipeIds = new Set(
      oldMealPlans
        .filter(mp => {
          const date = new Date(mp.date)
          return date >= listStart && date <= listEnd
        })
        .map(mp => mp.recipe_id)
    )
    
    const newRecipeIds = new Set(
      newMealPlans
        .filter(mp => {
          const date = new Date(mp.date)
          return date >= listStart && date <= listEnd
        })
        .map(mp => mp.recipe_id)
    )
    
    // Find removed recipes
    for (const recipeId of oldRecipeIds) {
      if (!newRecipeIds.has(recipeId)) {
        const recipe = recipes.find(r => r.id === recipeId)
        if (!recipe) continue
        
        // Find items from this recipe that are already purchased
        const affectedItems = currentItems.filter(item =>
          item.used_in_recipes.includes(recipeId)
        )
        
        const purchasedItems = affectedItems.filter(item => item.checked)
        
        if (purchasedItems.length > 0) {
          conflicts.push({
            type: 'removed_recipe',
            recipeId,
            recipeName: recipe.name,
            affectedItems,
            purchasedCount: purchasedItems.length
          })
        }
        
        // Mark items for removal (only if not purchased or used in other recipes)
        for (const item of affectedItems) {
          const usedInOtherRecipes = item.used_in_recipes.some(
            rid => rid !== recipeId && newRecipeIds.has(rid)
          )
          
          if (!item.checked && !usedInOtherRecipes) {
            removedItems.push(item)
          }
        }
      }
    }
    
    // Find added recipes (would need new items)
    for (const recipeId of newRecipeIds) {
      if (!oldRecipeIds.has(recipeId)) {
        const recipe = recipes.find(r => r.id === recipeId)
        if (!recipe) continue
        
        // These would be new items to add
        // (actual item generation happens in generator)
        conflicts.push({
          type: 'added_recipe',
          recipeId,
          recipeName: recipe.name,
          affectedItems: [],
          purchasedCount: 0
        })
      }
    }
    
    return {
      conflicts,
      newItems,
      removedItems,
      hasChanges: conflicts.length > 0 || removedItems.length > 0
    }
  }
  
  /**
   * Merge changes while preserving user's checked items
   */
  static mergeChanges(
    currentItems: ShoppingListItem[],
    newGeneratedItems: ShoppingListItem[],
    keepPurchased: boolean = true
  ): ShoppingListItem[] {
    
    // Create a map of current items by ingredient name + unit
    const currentItemMap = new Map<string, ShoppingListItem>()
    currentItems.forEach(item => {
      const key = `${item.ingredient_name.toLowerCase()}_${item.unit}`
      currentItemMap.set(key, item)
    })
    
    const mergedItems: ShoppingListItem[] = []
    
    // Process new items
    for (const newItem of newGeneratedItems) {
      const key = `${newItem.ingredient_name.toLowerCase()}_${newItem.unit}`
      const existingItem = currentItemMap.get(key)
      
      if (existingItem) {
        // Item exists - preserve checked status if requested
        mergedItems.push({
          ...newItem,
          id: existingItem.id, // Keep existing ID
          checked: keepPurchased ? existingItem.checked : false,
          // Merge quantities if needed
          quantity: Math.max(newItem.quantity, existingItem.quantity)
        })
        
        // Mark as processed
        currentItemMap.delete(key)
      } else {
        // New item
        mergedItems.push(newItem)
      }
    }
    
    // Add remaining checked items (items that were purchased but not in new list)
    if (keepPurchased) {
      for (const [_, item] of currentItemMap) {
        if (item.checked) {
          mergedItems.push(item)
        }
      }
    }
    
    return mergedItems
  }
  
  /**
   * Generate user-friendly conflict messages
   */
  static getConflictMessage(conflict: SyncConflict): string {
    switch (conflict.type) {
      case 'removed_recipe':
        return conflict.purchasedCount > 0
          ? `Du har redan handlat ${conflict.purchasedCount} vara${conflict.purchasedCount !== 1 ? 'or' : ''} för "${conflict.recipeName}" som nu tagits bort från planeringen.`
          : `"${conflict.recipeName}" har tagits bort från planeringen.`
      
      case 'added_recipe':
        return `"${conflict.recipeName}" har lagts till i planeringen.`
      
      case 'date_changed':
        return `Datum ändrat för "${conflict.recipeName}".`
      
      default:
        return 'Okänd ändring'
    }
  }
  
  /**
   * Get action recommendations for conflicts
   */
  static getRecommendedAction(conflict: SyncConflict): string {
    switch (conflict.type) {
      case 'removed_recipe':
        return conflict.purchasedCount > 0
          ? 'Behåll inhandlade varor eller ta bort dem från listan?'
          : 'Varor för detta recept kommer tas bort från listan.'
      
      case 'added_recipe':
        return 'Nya varor kommer läggas till i listan.'
      
      default:
        return ''
    }
  }
}
