import { supabase } from '../index.js';

export const planningTools = [
  {
    name: 'create_meal_plan',
    description: 'Create or update a meal plan for a specific date',
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
      
      const { data, error } = await supabase
        .from('meal_plans')
        .upsert(
          { user_id, date, recipe_id },
          { onConflict: 'user_id,date' }
        )
        .select()
        .single();
      
      if (error) throw error;
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
    description: 'Delete a meal plan for a specific date',
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
      
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('user_id', user_id)
        .eq('date', date);
      
      if (error) throw error;
      return { success: true, message: 'Meal plan deleted' };
    },
  },
  {
    name: 'clear_meal_plans',
    description: 'Clear all meal plans for a date range',
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
      
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('user_id', user_id)
        .gte('date', start_date)
        .lte('date', end_date);
      
      if (error) throw error;
      return { success: true, message: 'Meal plans cleared' };
    },
  },
];
