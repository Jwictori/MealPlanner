/**
 * Recipe Importer - 3-Layer Approach
 * 
 * Layer 1: Structured Data (schema.org JSON-LD) - 60-70% success rate
 * Layer 2: Heuristic HTML Parsing - 85-90% success rate
 * Layer 3: AI Extraction (Gemini) - 99% success rate (Premium)
 * 
 * Strategy: Try layers in order, fall back to next if confidence is low.
 * This saves AI API requests and costs.
 */

import { JSDOM } from 'jsdom';

export interface ImportedRecipe {
  name: string;
  servings: number;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  instructions: string;
  tags?: string[];
  image_url?: string;
  source: 'structured' | 'heuristic' | 'ai';
  confidence: number;
  source_url?: string;
}

export class RecipeImporter {
  
  /**
   * Main import function - tries all 3 layers
   * 
   * @param url - Recipe URL to import from
   * @param useAI - Whether to use AI (Layer 3) - typically premium feature
   * @param userId - User ID (for logging/analytics)
   * @returns Imported recipe data
   */
  static async importFromUrl(
    url: string, 
    useAI: boolean = false,
    userId?: string
  ): Promise<ImportedRecipe> {
    
    console.log(`[RecipeImport] Starting import from: ${url}`);
    console.log(`[RecipeImport] AI enabled: ${useAI}`);
    
    // Fetch HTML from URL
    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MealPlanner/1.0; +https://mealplanner.app)',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      html = await response.text();
      console.log(`[RecipeImport] Fetched HTML: ${html.length} chars`);
    } catch (error) {
      console.error('[RecipeImport] Fetch failed:', error);
      throw new Error(`Failed to fetch recipe: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Layer 1: Try structured data (schema.org JSON-LD)
    try {
      console.log('[RecipeImport] Trying Layer 1: Structured data...');
      const structured = await this.extractStructuredData(html, url);
      
      if (structured && structured.confidence >= 0.7) {
        console.log(`[RecipeImport] ✅ Layer 1 succeeded (confidence: ${structured.confidence})`);
        return structured;
      } else {
        console.log(`[RecipeImport] ⚠️ Layer 1 low confidence: ${structured?.confidence || 0}`);
      }
    } catch (error) {
      console.log('[RecipeImport] ❌ Layer 1 failed:', error instanceof Error ? error.message : String(error));
    }
    
    // Layer 2: Try heuristic HTML parsing
    try {
      console.log('[RecipeImport] Trying Layer 2: Heuristic parsing...');
      const heuristic = await this.extractHeuristic(html, url);
      
      if (heuristic && heuristic.confidence >= 0.6) {
        console.log(`[RecipeImport] ✅ Layer 2 succeeded (confidence: ${heuristic.confidence})`);
        return heuristic;
      } else {
        console.log(`[RecipeImport] ⚠️ Layer 2 low confidence: ${heuristic?.confidence || 0}`);
      }
    } catch (error) {
      console.log('[RecipeImport] ❌ Layer 2 failed:', error instanceof Error ? error.message : String(error));
    }
    
    // Layer 3: Use AI (if enabled)
    if (useAI) {
      try {
        console.log('[RecipeImport] Trying Layer 3: AI extraction...');
        const ai = await this.extractWithAI(html, url);
        console.log(`[RecipeImport] ✅ Layer 3 succeeded (confidence: ${ai.confidence})`);
        return ai;
      } catch (error) {
        console.error('[RecipeImport] ❌ Layer 3 failed:', error);
        throw new Error('All import methods failed, including AI');
      }
    } else {
      throw new Error(
        'Recipe import failed with structured and heuristic methods. ' +
        'Enable AI import (Premium feature) for better success rate.'
      );
    }
  }
  
  /**
   * Layer 1: Extract from schema.org JSON-LD
   * Common on sites like AllRecipes, Food Network, NYT Cooking
   */
  private static async extractStructuredData(
    html: string, 
    sourceUrl: string
  ): Promise<ImportedRecipe | null> {
    
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Find all JSON-LD script tags
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        
        // Check if it's a Recipe schema (can be single object or array)
        const recipes = Array.isArray(data) ? data : [data];
        
        for (const item of recipes) {
          // Check for Recipe type (can be nested in @graph)
          let recipeData = null;
          
          if (item['@type'] === 'Recipe' || item['@type']?.includes?.('Recipe')) {
            recipeData = item;
          } else if (item['@graph']) {
            // Some sites nest Recipe in @graph array
            recipeData = item['@graph'].find(
              (g: any) => g['@type'] === 'Recipe' || g['@type']?.includes?.('Recipe')
            );
          }
          
          if (recipeData) {
            return {
              name: recipeData.name || '',
              servings: this.parseServings(
                recipeData.recipeYield || 
                recipeData.servings || 
                recipeData['yield'] || 
                4
              ),
              ingredients: this.parseStructuredIngredients(
                recipeData.recipeIngredient || []
              ),
              instructions: this.parseStructuredInstructions(
                recipeData.recipeInstructions || []
              ),
              tags: this.parseStructuredTags(recipeData),
              image_url: this.parseStructuredImage(recipeData.image),
              source: 'structured',
              confidence: 0.9,
              source_url: sourceUrl,
            };
          }
        }
      } catch (e) {
        // Skip invalid JSON
        continue;
      }
    }
    
    return null;
  }
  
  /**
   * Layer 2: Heuristic HTML parsing
   * Works on most recipe blogs and sites without structured data
   */
  private static async extractHeuristic(
    html: string, 
    sourceUrl: string
  ): Promise<ImportedRecipe | null> {
    
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    let confidence = 0;
    
    // Find recipe title
    const titleSelectors = [
      'h1.recipe-title',
      'h1[itemprop="name"]',
      '[class*="recipe"] h1',
      '.entry-title',
      'h1',
    ];
    
    let name = '';
    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent && el.textContent.trim().length > 3) {
        name = el.textContent.trim();
        confidence += 0.3;
        break;
      }
    }
    
    // Find servings
    let servings = 4; // Default
    const servingsSelectors = [
      '[itemprop="recipeYield"]',
      '.recipe-yield',
      '[class*="serving"]',
      '[class*="yield"]',
    ];
    
    for (const selector of servingsSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        servings = this.parseServings(el.textContent);
        break;
      }
    }
    
    // Find ingredients
    const ingredientSelectors = [
      '.recipe-ingredients li',
      '[itemprop="recipeIngredient"]',
      '.ingredients li',
      'ul.ingredient-list li',
      '[class*="ingredient"] li',
    ];
    
    let ingredientTexts: string[] = [];
    for (const selector of ingredientSelectors) {
      const els = document.querySelectorAll(selector);
      if (els.length >= 3) { // At least 3 ingredients to be confident
        ingredientTexts = Array.from(els)
          .map(el => el.textContent?.trim() || '')
          .filter(text => text.length > 2);
        confidence += 0.4;
        break;
      }
    }
    
    // Find instructions
    const instructionSelectors = [
      '.recipe-instructions',
      '[itemprop="recipeInstructions"]',
      '.instructions',
      '.directions',
      '[class*="instruction"]',
      '[class*="direction"]',
    ];
    
    let instructions = '';
    for (const selector of instructionSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent && el.textContent.trim().length > 50) {
        instructions = this.cleanInstructions(el.textContent);
        confidence += 0.3;
        break;
      }
    }
    
    // Find image
    const imageSelectors = [
      '.recipe-image img',
      '[itemprop="image"]',
      '.entry-image img',
      'article img',
    ];
    
    let image_url = '';
    for (const selector of imageSelectors) {
      const el = document.querySelector(selector);
      if (el instanceof dom.window.HTMLImageElement) {
        image_url = el.src;
        break;
      }
    }
    
    // Confidence check
    if (confidence < 0.6) {
      return null;
    }
    
    return {
      name,
      servings,
      ingredients: this.parseHeuristicIngredients(ingredientTexts),
      instructions,
      image_url: image_url || undefined,
      source: 'heuristic',
      confidence,
      source_url: sourceUrl,
    };
  }
  
  /**
   * Layer 3: AI extraction using Gemini
   * Calls Supabase Edge Function
   */
  private static async extractWithAI(
    html: string, 
    sourceUrl: string
  ): Promise<ImportedRecipe> {
    
    // Call Supabase Edge Function for AI extraction
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/recipe-import-ai`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ 
          html: html.slice(0, 50000), // Limit size for AI
          url: sourceUrl 
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI import failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    return {
      ...data,
      source: 'ai',
      confidence: 0.95,
      source_url: sourceUrl,
    };
  }
  
  // ============================================
  // Helper Functions
  // ============================================
  
  private static parseServings(value: any): number {
    if (typeof value === 'number') return Math.max(1, Math.round(value));
    
    if (typeof value === 'string') {
      // Extract first number from string
      const match = value.match(/\d+/);
      return match ? Math.max(1, parseInt(match[0])) : 4;
    }
    
    return 4;
  }
  
  private static parseStructuredIngredients(list: string[]): any[] {
    return list
      .filter(ing => ing && ing.trim().length > 0)
      .map(ing => this.parseIngredientString(ing));
  }
  
  private static parseHeuristicIngredients(list: string[]): any[] {
    return list
      .filter(ing => ing && ing.trim().length > 0)
      .map(ing => this.parseIngredientString(ing));
  }
  
  /**
   * Parse ingredient string into structured format
   * Examples:
   * - "2 dl mjölk" → { amount: 2, unit: "dl", name: "mjölk" }
   * - "1 tsk salt" → { amount: 1, unit: "tsk", name: "salt" }
   * - "500g köttfärs" → { amount: 500, unit: "g", name: "köttfärs" }
   */
  private static parseIngredientString(str: string): any {
    // Clean up string
    str = str.trim().replace(/\s+/g, ' ');
    
    // Try to match: [amount] [unit] [name]
    const patterns = [
      // "2 dl mjölk"
      /^([\d.,/]+)\s*(\w+)\s+(.+)$/,
      // "2 msk smör"
      /^([\d.,/]+)\s+(\w+)\s+(.+)$/,
      // "mjölk" (no amount)
      /^([a-zA-ZåäöÅÄÖ].*)$/,
    ];
    
    for (const pattern of patterns) {
      const match = str.match(pattern);
      
      if (match) {
        if (match.length === 4) {
          // Has amount and unit
          return {
            amount: this.parseAmount(match[1]),
            unit: match[2].toLowerCase(),
            name: match[3].trim(),
          };
        } else if (match.length === 2) {
          // Only name
          return {
            amount: 0,
            unit: '',
            name: match[1].trim(),
          };
        }
      }
    }
    
    // Fallback: treat whole string as name
    return {
      amount: 0,
      unit: '',
      name: str.trim(),
    };
  }
  
  private static parseAmount(str: string): number {
    // Handle fractions like "1/2", "1 1/2"
    if (str.includes('/')) {
      const parts = str.split(/\s+/);
      let total = 0;
      
      for (const part of parts) {
        if (part.includes('/')) {
          const [num, den] = part.split('/').map(Number);
          total += num / den;
        } else {
          total += parseFloat(part);
        }
      }
      
      return total;
    }
    
    // Handle comma as decimal separator
    return parseFloat(str.replace(',', '.'));
  }
  
  private static parseStructuredInstructions(list: any): string {
    if (typeof list === 'string') {
      return this.cleanInstructions(list);
    }
    
    if (Array.isArray(list)) {
      return list
        .map((step, i) => {
          let text = '';
          
          if (typeof step === 'string') {
            text = step;
          } else if (step.text) {
            text = step.text;
          } else if (step.description) {
            text = step.description;
          } else if (step['@type'] === 'HowToStep') {
            text = step.text || step.description || '';
          }
          
          if (!text) return '';
          
          // Add step number if not already present
          const cleanText = text.trim();
          if (!/^\d+\./.test(cleanText)) {
            return `${i + 1}. ${cleanText}`;
          }
          
          return cleanText;
        })
        .filter(Boolean)
        .join('\n\n');
    }
    
    return '';
  }
  
  private static cleanInstructions(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
  }
  
  private static parseStructuredTags(data: any): string[] {
    const tags: string[] = [];
    
    // Recipe category
    if (data.recipeCategory) {
      const cats = Array.isArray(data.recipeCategory) 
        ? data.recipeCategory 
        : [data.recipeCategory];
      tags.push(...cats);
    }
    
    // Recipe cuisine
    if (data.recipeCuisine) {
      const cuisines = Array.isArray(data.recipeCuisine) 
        ? data.recipeCuisine 
        : [data.recipeCuisine];
      tags.push(...cuisines);
    }
    
    // Keywords
    if (data.keywords) {
      if (typeof data.keywords === 'string') {
        tags.push(...data.keywords.split(',').map((k: string) => k.trim()));
      } else if (Array.isArray(data.keywords)) {
        tags.push(...data.keywords);
      }
    }
    
    return tags.filter(Boolean).map(t => t.toLowerCase());
  }
  
  private static parseStructuredImage(image: any): string | undefined {
    if (!image) return undefined;
    
    if (typeof image === 'string') {
      return image;
    }
    
    if (image.url) {
      return image.url;
    }
    
    if (Array.isArray(image) && image.length > 0) {
      return this.parseStructuredImage(image[0]);
    }
    
    return undefined;
  }
}