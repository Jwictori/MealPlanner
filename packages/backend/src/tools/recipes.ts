import { z } from 'zod';
import { supabase } from '../index.js';

// Zod schemas for validation
const IngredientSchema = z.object({
  amount: z.number(),
  unit: z.string(),
  name: z.string(),
  key: z.string().optional(),
});

const RecipeSchema = z.object({
  name: z.string().min(1),
  servings: z.number().int().positive(),
  ingredients: z.array(IngredientSchema),
  instructions: z.string(),
  tags: z.array(z.string()).optional(),
  image_url: z.string().url().optional(),
  is_public: z.boolean().optional(),
});

export const recipeTools = [
  {
    name: 'create_recipe',
    description: 'Create a new recipe',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'User ID' },
        recipe: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            servings: { type: 'number' },
            ingredients: { type: 'array' },
            instructions: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            image_url: { type: 'string' },
            is_public: { type: 'boolean' },
          },
          required: ['name', 'servings', 'ingredients', 'instructions'],
        },
      },
      required: ['user_id', 'recipe'],
    },
    handler: async (args: any) => {
      const { user_id, recipe } = args;
      
      // Validate input
      const validatedRecipe = RecipeSchema.parse(recipe);
      
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          user_id,
          ...validatedRecipe,
          tags: validatedRecipe.tags || [],
          is_public: validatedRecipe.is_public || false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    },
  },
  {
    name: 'get_recipe',
    description: 'Get a recipe by ID',
    inputSchema: {
      type: 'object',
      properties: {
        recipe_id: { type: 'string', description: 'Recipe ID' },
      },
      required: ['recipe_id'],
    },
    handler: async (args: any) => {
      const { recipe_id } = args;
      
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipe_id)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    },
  },
  {
    name: 'list_recipes',
    description: 'List recipes for a user',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'User ID' },
        include_public: { type: 'boolean', description: 'Include public recipes' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
        limit: { type: 'number', description: 'Number of recipes to return' },
      },
      required: ['user_id'],
    },
    handler: async (args: any) => {
      const { user_id, include_public = true, tags, limit = 100 } = args;
      
      let query = supabase
        .from('recipes')
        .select('*')
        .limit(limit);
      
      if (include_public) {
        query = query.or(`user_id.eq.${user_id},is_public.eq.true`);
      } else {
        query = query.eq('user_id', user_id);
      }
      
      if (tags && tags.length > 0) {
        query = query.contains('tags', tags);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return { success: true, data, count: data.length };
    },
  },
  {
    name: 'update_recipe',
    description: 'Update an existing recipe',
    inputSchema: {
      type: 'object',
      properties: {
        recipe_id: { type: 'string' },
        updates: { type: 'object' },
      },
      required: ['recipe_id', 'updates'],
    },
    handler: async (args: any) => {
      const { recipe_id, updates } = args;
      
      const { data, error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', recipe_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    },
  },
  {
    name: 'delete_recipe',
    description: 'Delete a recipe',
    inputSchema: {
      type: 'object',
      properties: {
        recipe_id: { type: 'string' },
      },
      required: ['recipe_id'],
    },
    handler: async (args: any) => {
      const { recipe_id } = args;
      
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipe_id);
      
      if (error) throw error;
      return { success: true, message: 'Recipe deleted' };
    },
  },
  {
    name: 'search_recipes',
    description: 'Search recipes by name or ingredients',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number' },
      },
      required: ['user_id', 'query'],
    },
    handler: async (args: any) => {
      const { user_id, query, limit = 20 } = args;
      
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .or(`user_id.eq.${user_id},is_public.eq.true`)
        .textSearch('name', query, { type: 'websearch', config: 'swedish' })
        .limit(limit);
      
      if (error) throw error;
      return { success: true, data, count: data.length };
    },
  },
];
