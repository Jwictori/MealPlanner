import { supabase } from '../index.js';

export const shoppingTools = [
  {
    name: 'generate_shopping_list',
    description: 'Generate a shopping list from meal plans',
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
      
      // Get all meal plans in range
      const { data: mealPlans, error: planError } = await supabase
        .from('meal_plans')
        .select('*, recipe:recipes(*)')
        .eq('user_id', user_id)
        .gte('date', start_date)
        .lte('date', end_date);
      
      if (planError) throw planError;
      
      // Combine ingredients
      const combinedIngredients: Record<string, any> = {};
      
      mealPlans.forEach((plan: any) => {
        if (!plan.recipe) return;
        
        plan.recipe.ingredients.forEach((ing: any) => {
          const key = ing.key || ing.name.toLowerCase().replace(/\s+/g, '');
          
          if (!combinedIngredients[key]) {
            combinedIngredients[key] = {
              name: ing.name,
              amount: 0,
              unit: ing.unit,
              category: 'other',
            };
          }
          
          // Simple addition (proper unit conversion would be better)
          combinedIngredients[key].amount += ing.amount;
        });
      });
      
      const items = Object.values(combinedIngredients).map((item: any) => ({
        ...item,
        checked: false,
      }));
      
      // Save shopping list
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert({
          user_id,
          date_range_start: start_date,
          date_range_end: end_date,
          items,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    },
  },
];
