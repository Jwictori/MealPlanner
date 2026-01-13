import { z } from 'zod';
import { supabase } from '../index.js';
import { RecipeImporter } from './recipeImporter.js';

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
  
  // ============================================
  // 🔥 NEW: Recipe Import Tools
  // ============================================
  
  {
    name: 'import_recipe_from_url',
    description: `Import a recipe from a URL using 3-layer approach:
    - Layer 1: Structured data (schema.org) - Fast, free, 60-70% success
    - Layer 2: Heuristic HTML parsing - Fast, free, 85-90% success
    - Layer 3: AI extraction (Gemini) - Slow, costs money, 99% success (premium only)
    
    The function tries layers in order and uses the first successful one.`,
    inputSchema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'User UUID',
        },
        url: {
          type: 'string',
          description: 'Recipe URL to import from',
          format: 'uri',
        },
        use_ai: {
          type: 'boolean',
          description: 'Allow AI import (Layer 3) - premium feature',
          default: false,
        },
      },
      required: ['user_id', 'url'],
    },
    handler: async (args: any) => {
      const { user_id, url, use_ai = false } = args;
      
      console.log('[RecipeImport] Starting import:', { user_id, url, use_ai });
      
      try {
        // Import recipe using 3-layer approach
        const imported = await RecipeImporter.importFromUrl(url, use_ai, user_id);
        
        console.log('[RecipeImport] Successfully imported:', {
          name: imported.name,
          source: imported.source,
          confidence: imported.confidence,
        });
        
        // Save to database
        const { data, error } = await supabase
          .from('recipes')
          .insert({
            user_id,
            name: imported.name,
            servings: imported.servings,
            ingredients: imported.ingredients,
            instructions: imported.instructions,
            tags: [...(imported.tags || []), 'imported', imported.source],
            image_url: imported.image_url,
            is_public: false,
          })
          .select()
          .single();
        
        if (error) {
          console.error('[RecipeImport] Database error:', error);
          throw error;
        }
        
        console.log('[RecipeImport] ✅ Recipe saved to database:', data.id);
        
        return {
          success: true,
          data,
          import_method: imported.source,
          confidence: imported.confidence,
          message: `Recipe imported successfully using ${imported.source} method`,
        };
        
      } catch (error: any) {
        console.error('[RecipeImport] Import failed:', error);
        
        // Provide helpful error message
        let message = error.message;
        
        if (message.includes('Enable AI import')) {
          message += '\n\nUpgrade to Premium to unlock AI-powered recipe import with 99% success rate!';
        }
        
        throw new Error(message);
      }
    },
  },
  
  {
    name: 'check_import_support',
    description: 'Check if a URL is likely to support recipe import (quick pre-check)',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Recipe URL to check',
          format: 'uri',
        },
      },
      required: ['url'],
    },
    handler: async (args: any) => {
      const { url } = args;
      
      try {
        // Fetch just the headers (fast, no body download)
        const response = await fetch(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MealPlanner/1.0)',
          },
        });
        
        const contentType = response.headers.get('content-type') || '';
        
        // Check if it's HTML
        const isHtml = contentType.includes('text/html');
        
        // Known recipe sites with good structured data (Layer 1 works well)
        const knownGoodSites = [
          'allrecipes.com',
          'foodnetwork.com',
          'cooking.nytimes.com',
          'bonappetit.com',
          'seriouseats.com',
          'epicurious.com',
          'tasty.co',
          'ica.se',
          'coop.se',
          'arla.se',
          'koket.se',
        ];
        
        const domain = new URL(url).hostname.toLowerCase();
        const isKnownGood = knownGoodSites.some(site => domain.includes(site));
        
        let confidence: 'high' | 'medium' | 'low' = 'low';
        let message = '';
        
        if (!isHtml) {
          confidence = 'low';
          message = 'This URL does not appear to be a recipe page (not HTML)';
        } else if (isKnownGood) {
          confidence = 'high';
          message = 'This site is known to work well with Layer 1 (structured data)';
        } else {
          confidence = 'medium';
          message = 'This site should work with Layer 2 (heuristic parsing)';
        }
        
        return {
          success: true,
          supported: isHtml,
          confidence,
          message,
          is_known_site: isKnownGood,
        };
        
      } catch (error: any) {
        return {
          success: false,
          supported: false,
          confidence: 'unknown',
          message: `Could not check URL: ${error.message}`,
          is_known_site: false,
        };
      }
    },
  },
];