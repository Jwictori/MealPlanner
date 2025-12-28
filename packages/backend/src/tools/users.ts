import { supabase } from '../index.js';

export const userTools = [
  {
    name: 'get_user_profile',
    description: 'Get user profile information',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
      },
      required: ['user_id'],
    },
    handler: async (args: any) => {
      const { user_id } = args;
      
      const { data, error } = await supabase
        .from('users')
        .select('*, preferences:user_preferences(*)')
        .eq('id', user_id)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    },
  },
  {
    name: 'update_user_profile',
    description: 'Update user profile',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        updates: { type: 'object' },
      },
      required: ['user_id', 'updates'],
    },
    handler: async (args: any) => {
      const { user_id, updates } = args;
      
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    },
  },
  {
    name: 'get_user_preferences',
    description: 'Get user preferences',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
      },
      required: ['user_id'],
    },
    handler: async (args: any) => {
      const { user_id } = args;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user_id)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    },
  },
  {
    name: 'update_user_preferences',
    description: 'Update user preferences',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        preferences: { type: 'object' },
      },
      required: ['user_id', 'preferences'],
    },
    handler: async (args: any) => {
      const { user_id, preferences } = args;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .update(preferences)
        .eq('user_id', user_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    },
  },
];
