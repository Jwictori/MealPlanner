/**
 * Supabase Edge Function: recipe-import-ai (v2.0)
 *
 * AI-powered recipe import with pattern learning
 * - First import from new site: Uses Gemini to analyze and generate extraction rules
 * - Subsequent imports: Uses cached rules (no AI cost)
 * - Feedback system: Learns from user thumbs up/down
 *
 * Deploy: supabase functions deploy recipe-import-ai
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TYPES
// ============================================================================

interface ParsedIngredient {
  amount: number | null;
  unit: string | null;
  name: string;
  group?: string;
  original?: {
    amount: number | null;
    unit: string | null;
    name: string;
  };
}

interface InstructionStep {
  step: number;
  text: string;
  section?: string;
}

interface ParsedRecipe {
  name: string;
  servings: number;
  ingredients: ParsedIngredient[];
  instructions: string;
  instructions_steps: InstructionStep[];
  tags: string[];
  image_url: string | null;
  source_url: string;
  prep_time_minutes: number | null;
  cooking_time_minutes: number | null;
  difficulty: string | null;
  locale: string;
  original_locale: string | null;
  original_recipe_data: any | null;
  import_domain: string;
  import_method: 'ai_generated' | 'cached_rules';
}

interface ExtractionRules {
  schema_version: string;
  ingredients: {
    group_detection: {
      method: 'keyword_match' | 'colon_suffix' | 'all_caps' | 'none';
      keywords: string[];
      reject_patterns: string[];
    };
  };
  instructions: {
    type: 'HowToStep' | 'HowToSection' | 'string_array' | 'plain_string';
    has_sections: boolean;
  };
  locale: {
    detected: string;
    needs_translation: boolean;
  };
  unit_translations: Record<string, { swedish: string; factor?: number }>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function detectDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function extractJsonLd(html: string): any[] {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const results: any[] = [];
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      results.push(JSON.parse(match[1]));
    } catch {
      continue;
    }
  }
  return results;
}

function findRecipeObject(jsonLdArray: any[]): any | null {
  for (const json of jsonLdArray) {
    const items = json['@graph'] || (Array.isArray(json) ? json : [json]);
    for (const item of items) {
      const type = item['@type'];
      if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
        return item;
      }
    }
  }
  return null;
}

function parseFraction(str: string): number {
  let s = str.trim()
    .replace(/½/g, '0.5')
    .replace(/¼/g, '0.25')
    .replace(/¾/g, '0.75')
    .replace(/⅓/g, '0.333')
    .replace(/⅔/g, '0.667');

  // Handle mixed fractions like "1 1/2"
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  // Handle simple fractions like "1/2"
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 2) {
      return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
  }

  return parseFloat(s.replace(',', '.')) || 0;
}

function parseDuration(isoString: string | null | undefined): number | null {
  if (!isoString) return null;
  const match = String(isoString).match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return null;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  return hours * 60 + minutes || null;
}

// ============================================================================
// GEMINI AI INTEGRATION
// ============================================================================

const GEMINI_PROMPT = `Du är en expert på att analysera schema.org Recipe-data från webbsidor.

Analysera följande schema.org JSON-LD data och extrahera receptet. Översätt till svenska och konvertera till metriska enheter.

VIKTIG: Returnera ENDAST valid JSON, ingen annan text eller markdown.

Schema.org data:
{SCHEMA_DATA}

Returnera exakt detta JSON-format:
{
  "recipe": {
    "name": "receptets namn på svenska",
    "servings": 4,
    "prep_time_minutes": null,
    "cooking_time_minutes": null,
    "difficulty": null,
    "image_url": null,
    "tags": []
  },
  "ingredients": [
    {
      "amount": 2,
      "unit": "dl",
      "name": "vetemjöl",
      "group": "Degen",
      "original": { "amount": 1, "unit": "cup", "name": "flour" }
    }
  ],
  "instructions": [
    { "step": 1, "text": "Instruktion på svenska", "section": null }
  ],
  "extraction_rules": {
    "ingredients": {
      "group_detection": {
        "method": "keyword_match",
        "keywords": ["lista", "av", "gruppnamn"],
        "reject_patterns": ["starts_with_digit", "contains_parentheses"]
      }
    },
    "instructions": {
      "type": "HowToStep",
      "has_sections": false
    },
    "locale": {
      "detected": "en-US",
      "needs_translation": true
    },
    "unit_translations": {
      "cup": { "swedish": "dl", "factor": 2.37 },
      "tablespoon": { "swedish": "msk" },
      "teaspoon": { "swedish": "tsk" },
      "ounce": { "swedish": "g", "factor": 28 },
      "pound": { "swedish": "g", "factor": 454 }
    }
  }
}

REGLER:
1. Översätt ALLA ingredienser och instruktioner till svenska
2. Konvertera amerikanska enheter: cups→dl (×2.37), tbsp→msk, tsp→tsk, oz→g (×28), lb→g (×454)
3. Behåll ursprunglig data i "original" för ingredienser
4. Identifiera ingrediensgrupper (t.ex. "Till såsen:", "Marinad")
5. Om receptet har HowToSection, inkludera section i instructions
6. Parsa ISO 8601 tider (PT30M = 30 minuter)
7. Fyll i extraction_rules baserat på hur receptet var strukturerat`;

async function callGeminiForRecipeAnalysis(schemaData: any): Promise<any> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = GEMINI_PROMPT.replace('{SCHEMA_DATA}', JSON.stringify(schemaData, null, 2));

  console.log('[AI Import] Calling Gemini API...');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AI Import] Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

  // Diagnostic logging to help detect truncated or malformed AI output
  try {
    console.log('[AI Import] Gemini result keys:', Object.keys(result || {}));
    if (result.candidates) console.log('[AI Import] Gemini candidates:', result.candidates.length);
    if (textContent) console.log('[AI Import] Gemini text length:', textContent.length);
  } catch (e) {
    console.warn('[AI Import] Failed to log Gemini diagnostics', e);
  }

  if (!textContent) {
    throw new Error('No content in Gemini response');
  }

  console.log('[AI Import] Parsing Gemini response...');

  try {
    return JSON.parse(textContent);
  } catch (e) {
    // Try to extract JSON from markdown wrapper
    try {
      const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      const objectMatch = textContent.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
    } catch (innerErr) {
      console.warn('[AI Import] Secondary JSON extraction failed', innerErr);
    }

    // Provide more diagnostic context in the error to aid debugging
    const sampleSnippet = textContent ? textContent.slice(0, 2000) : '<no content>';
    console.error('[AI Import] Failed to parse Gemini response as JSON. snippet length:', textContent ? textContent.length : 0);
    console.error('[AI Import] Snippet (first 2000 chars):', sampleSnippet);
    throw new Error(`Failed to parse Gemini response as JSON; length=${textContent ? textContent.length : 0}; snippet=${sampleSnippet.slice(0,500)}`);
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function getExistingRules(
  supabase: any,
  domain: string
): Promise<{ rules: ExtractionRules | null; needsReanalysis: boolean; ruleId: string | null }> {
  const { data, error } = await supabase
    .from('site_extraction_rules')
    .select('*')
    .eq('domain', domain)
    .single();

  if (error || !data) {
    return { rules: null, needsReanalysis: true, ruleId: null };
  }

  // Check if we need to re-analyze based on feedback
  const needsReanalysis =
    data.status === 'needs_review' ||
    (data.total_imports >= 5 && data.success_rate !== null && data.success_rate < 70);

  return {
    rules: data.extraction_rules as ExtractionRules,
    needsReanalysis,
    ruleId: data.id,
  };
}

async function saveExtractionRules(
  supabase: any,
  domain: string,
  aiResult: any,
  sampleUrl: string,
  schemaOrg: any
): Promise<void> {
  const { error } = await supabase
    .from('site_extraction_rules')
    .upsert({
      domain,
      status: 'active',
      confidence_score: 80,
      extraction_rules: aiResult.extraction_rules,
      sample_urls: [sampleUrl],
      sample_schema_org: schemaOrg,
      ai_model_used: 'gemini-2.0-flash',
      ai_prompt_version: '2.0',
      ai_analysis_raw: aiResult,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'domain',
    });

  if (error) {
    console.error('[AI Import] Failed to save extraction rules:', error);
  } else {
    console.log('[AI Import] Saved extraction rules for domain:', domain);
  }
}

async function incrementRuleUsage(supabase: any, domain: string): Promise<void> {
  const { error } = await supabase
    .from('site_extraction_rules')
    .update({
      times_used: supabase.sql`times_used + 1`,
      last_used_at: new Date().toISOString(),
    })
    .eq('domain', domain);

  if (error) {
    console.error('[AI Import] Failed to increment usage:', error);
  }
}

// ============================================================================
// RECIPE PARSING WITH CACHED RULES
// ============================================================================

function applyRulesToExtract(
  schemaRecipe: any,
  rules: ExtractionRules,
  sourceUrl: string,
  domain: string
): ParsedRecipe {
  console.log('[AI Import] Applying cached rules for domain:', domain);

  // Parse ingredients with group detection
  const ingredients: ParsedIngredient[] = [];
  let currentGroup: string | undefined;

  const rawIngredients = schemaRecipe.recipeIngredient || [];
  for (const ing of rawIngredients) {
    const ingStr = typeof ing === 'string' ? ing : ing.text || String(ing);
    const trimmed = ingStr.trim();

    // Check if this is a group header
    if (isGroupHeader(trimmed, rules.ingredients.group_detection)) {
      currentGroup = trimmed.replace(/:$/, '').trim();
      continue;
    }

    // Parse the ingredient
    const parsed = parseIngredientWithTranslation(trimmed, rules.unit_translations);
    if (currentGroup) {
      parsed.group = currentGroup;
    }
    ingredients.push(parsed);
  }

  // Parse instructions
  const instructionSteps = parseInstructions(schemaRecipe.recipeInstructions, rules.instructions);

  // Get metadata
  const prepTime = parseDuration(schemaRecipe.prepTime);
  const cookTime = parseDuration(schemaRecipe.cookTime);
  const totalTime = parseDuration(schemaRecipe.totalTime);

  let imageUrl = extractImageUrl(schemaRecipe.image);
  const tags = extractTags(schemaRecipe);
  const servings = extractServings(schemaRecipe.recipeYield);

  return {
    name: schemaRecipe.name || 'Importerat recept',
    servings,
    ingredients,
    instructions: instructionSteps.map(s => s.section ? `**${s.section}**\n${s.step}. ${s.text}` : `${s.step}. ${s.text}`).join('\n'),
    instructions_steps: instructionSteps,
    tags,
    image_url: imageUrl,
    source_url: sourceUrl,
    prep_time_minutes: prepTime,
    cooking_time_minutes: cookTime || totalTime,
    difficulty: null,
    locale: 'sv-SE',
    original_locale: rules.locale.detected,
    original_recipe_data: rules.locale.needs_translation ? schemaRecipe : null,
    import_domain: domain,
    import_method: 'cached_rules',
  };
}

function isGroupHeader(
  str: string,
  detection: ExtractionRules['ingredients']['group_detection']
): boolean {
  if (detection.method === 'none') return false;

  const lower = str.toLowerCase();

  // Check reject patterns
  for (const pattern of detection.reject_patterns) {
    if (pattern === 'starts_with_digit' && /^\d/.test(str)) return false;
    if (pattern === 'contains_digit' && /\d/.test(str)) return false;
    if (pattern === 'contains_parentheses' && (str.includes('(') || str.includes(')'))) return false;
    if (pattern === 'contains_comma' && str.includes(',')) return false;
  }

  if (detection.method === 'colon_suffix' && str.endsWith(':')) return true;
  if (detection.method === 'all_caps' && str === str.toUpperCase() && str.length < 30 && /[A-Z]/.test(str)) return true;
  if (detection.method === 'keyword_match') {
    return detection.keywords.some(kw => lower.includes(kw.toLowerCase()));
  }

  return false;
}

function parseIngredientWithTranslation(
  str: string,
  unitTranslations: Record<string, { swedish: string; factor?: number }>
): ParsedIngredient {
  // Remove leading "ca." or "about"
  const cleaned = str.replace(/^(ca\.?|circa|about|approximately|omkring)\s+/i, '').trim();

  // Pattern: "2 cups flour" or "1/2 tsk salt"
  const match = cleaned.match(/^([\d.,\/\s½¼¾⅓⅔]+)?\s*([a-zA-ZåäöÅÄÖ]+)?\s*(.+)?$/);

  if (!match) {
    return { amount: null, unit: null, name: str };
  }

  let amount: number | null = null;
  if (match[1]) {
    amount = parseFraction(match[1].trim());
    if (isNaN(amount)) amount = null;
  }

  let unit = match[2]?.toLowerCase() || null;
  let name = match[3]?.trim() || cleaned;

  // Store original before translation
  const original = { amount, unit, name };

  // Translate unit if needed
  if (unit && unitTranslations[unit]) {
    const translation = unitTranslations[unit];
    if (translation.factor && amount !== null) {
      amount = Math.round(amount * translation.factor * 10) / 10;
    }
    unit = translation.swedish;
  }

  // Clean up name
  name = name.replace(/^(of|av)\s+/i, '').trim();

  return { amount, unit, name, original };
}

function parseInstructions(
  recipeInstructions: any,
  rules: ExtractionRules['instructions']
): InstructionStep[] {
  const steps: InstructionStep[] = [];
  if (!recipeInstructions) return steps;

  if (typeof recipeInstructions === 'string') {
    return [{ step: 1, text: recipeInstructions }];
  }

  if (!Array.isArray(recipeInstructions)) return steps;

  let stepCounter = 1;
  let currentSection: string | undefined;

  for (const item of recipeInstructions) {
    if (typeof item === 'string') {
      steps.push({ step: stepCounter++, text: item, section: currentSection });
    } else if (typeof item === 'object' && item !== null) {
      if (item['@type'] === 'HowToSection') {
        currentSection = item.name || undefined;
        const sectionSteps = item.itemListElement || [];
        for (const s of sectionSteps) {
          const text = s?.text || s?.name || '';
          if (text && typeof text === 'string') {
            steps.push({ step: stepCounter++, text: text.trim(), section: currentSection });
          }
        }
      } else if (item['@type'] === 'HowToStep') {
        const text = item.text || item.name || '';
        if (text && typeof text === 'string') {
          steps.push({ step: stepCounter++, text: text.trim(), section: currentSection });
        }
      } else if (item.text) {
        steps.push({ step: stepCounter++, text: String(item.text).trim(), section: currentSection });
      }
    }
  }

  return steps;
}

function extractImageUrl(image: any): string | null {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) {
    const first = image[0];
    return typeof first === 'string' ? first : first?.url || null;
  }
  return image.url || null;
}

function extractTags(schemaRecipe: any): string[] {
  const tags: string[] = [];

  if (schemaRecipe.recipeCategory) {
    const cats = Array.isArray(schemaRecipe.recipeCategory) ? schemaRecipe.recipeCategory : [schemaRecipe.recipeCategory];
    tags.push(...cats.filter((c: any) => typeof c === 'string'));
  }

  if (schemaRecipe.recipeCuisine) {
    const cuisines = Array.isArray(schemaRecipe.recipeCuisine) ? schemaRecipe.recipeCuisine : [schemaRecipe.recipeCuisine];
    tags.push(...cuisines.filter((c: any) => typeof c === 'string'));
  }

  if (schemaRecipe.keywords) {
    if (Array.isArray(schemaRecipe.keywords)) {
      tags.push(...schemaRecipe.keywords.filter((k: any) => typeof k === 'string'));
    } else if (typeof schemaRecipe.keywords === 'string') {
      tags.push(...schemaRecipe.keywords.split(/[,;]/).map((k: string) => k.trim()).filter(Boolean));
    }
  }

  return [...new Set(tags.map(t => t.trim()).filter(t => t.length >= 2))];
}

function extractServings(recipeYield: any): number {
  if (!recipeYield) return 4;
  const yieldStr = Array.isArray(recipeYield) ? recipeYield[0] : recipeYield;
  const numMatch = String(yieldStr).match(/\d+/);
  return numMatch ? parseInt(numMatch[0]) : 4;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const url: string = body?.url;
    const forceReanalyze: boolean = body?.force_reanalyze || false;

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const domain = detectDomain(url);
    console.log(`[AI Import] Processing recipe from: ${domain}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for existing rules
    const { rules: existingRules, needsReanalysis } = await getExistingRules(supabase, domain);
    const shouldUseAI = !existingRules || needsReanalysis || forceReanalyze;

    console.log(`[AI Import] Domain: ${domain}, Use AI: ${shouldUseAI}, Has rules: ${!!existingRules}, Needs reanalysis: ${needsReanalysis}`);

    // Fetch the HTML
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    ];

    let html = '';
    for (const userAgent of userAgents) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
          },
          redirect: 'follow',
        });
        if (response.ok) {
          html = await response.text();
          console.log(`[AI Import] Fetched HTML: ${html.length} chars`);
          break;
        }
      } catch (e) {
        console.error('[AI Import] Fetch error:', e);
      }
    }

    if (!html) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch URL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract schema.org data
    const jsonLdArray = extractJsonLd(html);
    const schemaRecipe = findRecipeObject(jsonLdArray);

    if (!schemaRecipe) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No schema.org Recipe found',
          message: 'This page does not contain structured recipe data',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let recipe: ParsedRecipe;

    if (shouldUseAI) {
      console.log('[AI Import] Using Gemini for analysis...');

      try {
        const aiResult = await callGeminiForRecipeAnalysis(schemaRecipe);

        // Save extraction rules for future use
        await saveExtractionRules(supabase, domain, aiResult, url, schemaRecipe);

        // Build recipe from AI result
        recipe = {
          name: aiResult.recipe?.name || schemaRecipe.name || 'Importerat recept',
          servings: aiResult.recipe?.servings || 4,
          ingredients: aiResult.ingredients || [],
          instructions: (aiResult.instructions || [])
            .map((s: any) => s.section ? `**${s.section}**\n${s.step}. ${s.text}` : `${s.step}. ${s.text}`)
            .join('\n'),
          instructions_steps: aiResult.instructions || [],
          tags: aiResult.recipe?.tags || [],
          image_url: aiResult.recipe?.image_url || extractImageUrl(schemaRecipe.image),
          source_url: url,
          prep_time_minutes: aiResult.recipe?.prep_time_minutes || parseDuration(schemaRecipe.prepTime),
          cooking_time_minutes: aiResult.recipe?.cooking_time_minutes || parseDuration(schemaRecipe.cookTime),
          difficulty: aiResult.recipe?.difficulty || null,
          locale: 'sv-SE',
          original_locale: aiResult.extraction_rules?.locale?.detected || null,
          original_recipe_data: aiResult.extraction_rules?.locale?.needs_translation ? schemaRecipe : null,
          import_domain: domain,
          import_method: 'ai_generated',
        };

        console.log(`[AI Import] ✅ AI extracted: ${recipe.name}`);
      } catch (aiError) {
        console.error('[AI Import] AI analysis failed:', aiError);

        return new Response(
          JSON.stringify({
            success: false,
            error: 'AI analysis failed',
            message: String(aiError),
            schema_org_available: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Use cached rules
      recipe = applyRulesToExtract(schemaRecipe, existingRules!, url, domain);
      await incrementRuleUsage(supabase, domain);
      console.log(`[AI Import] ✅ Cached rules extracted: ${recipe.name}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipe,
        import_method: recipe.import_method,
        domain,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AI Import] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
