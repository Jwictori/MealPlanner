import { supabase } from '../index.js';
import { ShoppingListSyncManager } from './syncManager.js';

export const planningTools = [
  {
    name: 'create_meal_plan',
    description: 'Create or update a meal plan for a specific date. Automatically syncs with shopping list.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        recipe_id: { type: 'string' },
      },
      required: ['user_id', 'date', 'recipe_id'],
    },
    handler: async (args: any) => {
      const { user_id, date, recipe_id } = args;
      
      console.log('[MealPlan] Creating/updating meal plan:', { user_id, date, recipe_id });
      
      // 1. Check if meal plan already exists (to get old recipe_id for sync)
      const { data: existing, error: fetchError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user_id)
        .eq('date', date)
        .maybeSingle();
      
      if (fetchError) {
        console.error('[MealPlan] Error fetching existing meal plan:', fetchError);
      }
      
      const oldRecipeId = existing?.recipe_id || null;
      
      console.log('[MealPlan] Old recipe ID:', oldRecipeId);
      
      // 2. Upsert meal plan (create or update)
      const { data, error } = await supabase
        .from('meal_plans')
        .upsert(
          { user_id, date, recipe_id },
          { onConflict: 'user_id,date' }
        )
        .select()
        .single();
      
      if (error) {
        console.error('[MealPlan] Error upserting meal plan:', error);
        throw error;
      }
      
      console.log('[MealPlan] ✅ Meal plan saved:', data.id);
      
      // 3. 🔥 AUTO-SYNC to shopping list
      try {
        await ShoppingListSyncManager.syncMealPlanToShoppingList({
          userId: user_id,
          oldRecipeId,
          newRecipeId: recipe_id,
          date,
        });
        
        console.log('[MealPlan] ✅ Shopping list synced successfully');
      } catch (syncError) {
        console.error('[MealPlan] ⚠️ Shopping list sync failed:', syncError);
        // Don't fail the whole operation if sync fails
        // User can manually regenerate shopping list
      }
      
      return { success: true, data };
    },
  },
  {
    name: 'get_meal_plans',
    description: 'Get meal plans for a date range',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
      },
      required: ['user_id', 'start_date', 'end_date'],
    },
    handler: async (args: any) => {
      const { user_id, start_date, end_date } = args;
      
      const { data, error } = await supabase
        .from('meal_plans')
        .select(`
          *,
          recipe:recipes(*)
        `)
        .eq('user_id', user_id)
        .gte('date', start_date)
        .lte('date', end_date)
        .order('date');
      
      if (error) throw error;
      return { success: true, data, count: data.length };
    },
  },
  {
    name: 'delete_meal_plan',
    description: 'Delete a meal plan for a specific date. Automatically removes ingredients from shopping list.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        date: { type: 'string' },
      },
      required: ['user_id', 'date'],
    },
    handler: async (args: any) => {
      const { user_id, date } = args;
      
      console.log('[MealPlan] Deleting meal plan:', { user_id, date });
      
      // 1. Get meal plan details before deletion (needed for sync)
      const { data: mealPlan, error: fetchError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user_id)
        .eq('date', date)
        .maybeSingle();
      
      if (fetchError) {
        console.error('[MealPlan] Error fetching meal plan:', fetchError);
        throw fetchError;
      }
      
      if (!mealPlan) {
        console.log('[MealPlan] No meal plan found to delete');
        return { success: true, message: 'No meal plan to delete' };
      }
      
      console.log('[MealPlan] Found meal plan to delete:', {
        id: mealPlan.id,
        recipe_id: mealPlan.recipe_id,
      });
      
      // 2. Delete meal plan
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('user_id', user_id)
        .eq('date', date);
      
      if (error) {
        console.error('[MealPlan] Error deleting meal plan:', error);
        throw error;
      }
      
      console.log('[MealPlan] ✅ Meal plan deleted');
      
      // 3. 🔥 AUTO-SYNC to shopping list (remove ingredients)
      try {
        await ShoppingListSyncManager.syncMealPlanToShoppingList({
          userId: user_id,
          oldRecipeId: mealPlan.recipe_id,
          newRecipeId: null, // Removing recipe
          date,
        });
        
        console.log('[MealPlan] ✅ Shopping list synced (ingredients removed)');
      } catch (syncError) {
        console.error('[MealPlan] ⚠️ Shopping list sync failed:', syncError);
      }
      
      return { success: true, message: 'Meal plan deleted' };
    },
  },
  {
    name: 'clear_meal_plans',
    description: 'Clear all meal plans for a date range. Automatically updates shopping list.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
      },
      required: ['user_id', 'start_date', 'end_date'],
    },
    handler: async (args: any) => {
      const { user_id, start_date, end_date } = args;
      
      console.log('[MealPlan] Clearing meal plans:', { user_id, start_date, end_date });
      
      // 1. Get all meal plans in range (for sync)
      const { data: plans, error: fetchError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user_id)
        .gte('date', start_date)
        .lte('date', end_date);
      
      if (fetchError) {
        console.error('[MealPlan] Error fetching meal plans:', fetchError);
        throw fetchError;
      }
      
      if (!plans || plans.length === 0) {
        console.log('[MealPlan] No meal plans to clear');
        return { success: true, message: 'No meal plans to clear', deleted: 0 };
      }
      
      console.log('[MealPlan] Found meal plans to clear:', plans.length);
      
      // 2. Delete all plans
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('user_id', user_id)
        .gte('date', start_date)
        .lte('date', end_date);
      
      if (error) {
        console.error('[MealPlan] Error clearing meal plans:', error);
        throw error;
      }
      
      console.log('[MealPlan] ✅ Meal plans cleared');
      
      // 3. 🔥 AUTO-SYNC to shopping list (remove all ingredients from deleted plans)
      try {
        for (const plan of plans) {
          await ShoppingListSyncManager.syncMealPlanToShoppingList({
            userId: user_id,
            oldRecipeId: plan.recipe_id,
            newRecipeId: null,
            date: plan.date,
          });
        }
        
        console.log('[MealPlan] ✅ Shopping list synced (all ingredients removed)');
      } catch (syncError) {
        console.error('[MealPlan] ⚠️ Shopping list sync failed:', syncError);
      }
      
      return { 
        success: true, 
        message: 'Meal plans cleared',
        deleted: plans.length 
      };
    },
  },
];