import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NutritionPer100g {
  energy_kcal?: number;
  protein_g?: number;
  carbohydrates_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugars_g?: number;
  salt_g?: number;
  saturated_fat_g?: number;
}

interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_sv?: string;
  product_name_en?: string;
  categories_tags?: string[];
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    salt_100g?: number;
    "saturated-fat_100g"?: number;
  };
  allergens_tags?: string[];
  image_url?: string;
  image_small_url?: string;
}

interface EnrichedIngredient {
  canonical_name: string;
  canonical_name_en?: string;
  default_category: string;
  nutrition_per_100g?: NutritionPer100g;
  allergens?: string[];
  image_url?: string;
  source: string;
  open_food_facts_id?: string;
}

// Map Open Food Facts categories to our categories
function mapOffCategoryToOurs(offCategories: string[]): string {
  const categoryMap: Record<string, string> = {
    "en:meats": "MEAT_FRESH",
    "en:poultry": "MEAT_POULTRY",
    "en:fishes": "FISH_FRESH",
    "en:seafood": "SHELLFISH",
    "en:vegetables": "VEGETABLES",
    "en:fruits": "FRUIT",
    "en:dairy": "DAIRY_MILK",
    "en:cheeses": "DAIRY_CHEESE",
    "en:butters": "DAIRY_BUTTER",
    "en:yogurts": "DAIRY_YOGURT",
    "en:eggs": "EGGS",
    "en:breads": "BREAD",
    "en:pastas": "PASTA_RICE",
    "en:rices": "PASTA_RICE",
    "en:cereals": "PASTA_RICE",
    "en:spices": "SPICES",
    "en:herbs": "FRESH_HERBS",
    "en:oils": "OIL_VINEGAR",
    "en:vinegars": "OIL_VINEGAR",
    "en:sauces": "SAUCES",
    "en:canned-foods": "CANNED",
    "en:legumes": "LEGUMES",
    "en:nuts": "LEGUMES",
    "en:frozen-foods": "FROZEN_OTHER",
    "en:flour": "BAKING_FLOUR",
    "en:sugars": "BAKING_FLOUR",
  };

  for (const cat of offCategories || []) {
    for (const [key, value] of Object.entries(categoryMap)) {
      if (cat.includes(key)) {
        return value;
      }
    }
  }
  return "OTHER";
}

// Search Open Food Facts
async function searchOpenFoodFacts(searchTerm: string): Promise<OpenFoodFactsProduct | null> {
  try {
    // Search with Swedish bias
    const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
    url.searchParams.set("search_terms", searchTerm);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("page_size", "5");
    url.searchParams.set("lc", "sv"); // Swedish language
    url.searchParams.set("cc", "se"); // Sweden country

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "MealPlanner/1.0 (contact@mealplanner.se)" },
    });

    if (!response.ok) {
      console.error("Open Food Facts API error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.products && data.products.length > 0) {
      // Return best match (first result)
      return data.products[0];
    }

    return null;
  } catch (error) {
    console.error("Open Food Facts search error:", error);
    return null;
  }
}

// Enrich ingredient from Open Food Facts
function enrichFromOpenFoodFacts(product: OpenFoodFactsProduct, originalName: string): EnrichedIngredient {
  const nutrition: NutritionPer100g = {};

  if (product.nutriments) {
    const n = product.nutriments;
    if (n["energy-kcal_100g"]) nutrition.energy_kcal = Math.round(n["energy-kcal_100g"]);
    if (n.proteins_100g) nutrition.protein_g = Math.round(n.proteins_100g * 10) / 10;
    if (n.carbohydrates_100g) nutrition.carbohydrates_g = Math.round(n.carbohydrates_100g * 10) / 10;
    if (n.fat_100g) nutrition.fat_g = Math.round(n.fat_100g * 10) / 10;
    if (n.fiber_100g) nutrition.fiber_g = Math.round(n.fiber_100g * 10) / 10;
    if (n.sugars_100g) nutrition.sugars_g = Math.round(n.sugars_100g * 10) / 10;
    if (n.salt_100g) nutrition.salt_g = Math.round(n.salt_100g * 100) / 100;
    if (n["saturated-fat_100g"]) nutrition.saturated_fat_g = Math.round(n["saturated-fat_100g"] * 10) / 10;
  }

  return {
    canonical_name: originalName.toLowerCase(),
    canonical_name_en: product.product_name_en || product.product_name || undefined,
    default_category: mapOffCategoryToOurs(product.categories_tags || []),
    nutrition_per_100g: Object.keys(nutrition).length > 0 ? nutrition : undefined,
    allergens: product.allergens_tags?.map(a => a.replace("en:", "")),
    image_url: product.image_small_url || product.image_url,
    source: "open_food_facts",
    open_food_facts_id: product.product_name,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredient_name, force_refresh = false } = await req.json();

    if (!ingredient_name || typeof ingredient_name !== "string") {
      return new Response(
        JSON.stringify({ error: "ingredient_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedName = ingredient_name.toLowerCase().trim();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check local cache first (unless force refresh)
    if (!force_refresh) {
      const { data: cached } = await supabase
        .from("canonical_ingredients")
        .select("*")
        .or(`canonical_name.eq.${normalizedName},canonical_name_normalized.eq.${normalizedName}`)
        .not("nutrition_per_100g", "is", null)
        .single();

      if (cached) {
        console.log(`Cache hit for: ${normalizedName}`);
        return new Response(
          JSON.stringify({
            ingredient: cached,
            source: "cache",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Search Open Food Facts
    console.log(`Searching Open Food Facts for: ${normalizedName}`);
    const offProduct = await searchOpenFoodFacts(normalizedName);

    let enrichedData: EnrichedIngredient | null = null;

    if (offProduct) {
      enrichedData = enrichFromOpenFoodFacts(offProduct, normalizedName);
      console.log(`Found in Open Food Facts: ${normalizedName}`);
    }

    // 3. Update or insert into canonical_ingredients
    if (enrichedData) {
      // Check if ingredient exists
      const { data: existing } = await supabase
        .from("canonical_ingredients")
        .select("id")
        .or(`canonical_name.eq.${normalizedName},canonical_name_normalized.eq.${normalizedName}`)
        .single();

      if (existing) {
        // Update existing
        const { data: updated, error } = await supabase
          .from("canonical_ingredients")
          .update({
            canonical_name_en: enrichedData.canonical_name_en,
            nutrition_per_100g: enrichedData.nutrition_per_100g,
            open_food_facts_id: enrichedData.open_food_facts_id,
            source: enrichedData.source,
            cached_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          console.error("Update error:", error);
        } else {
          console.log(`Updated ingredient: ${normalizedName}`);
          return new Response(
            JSON.stringify({
              ingredient: updated,
              source: "open_food_facts",
              action: "updated",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Insert new
        const { data: inserted, error } = await supabase
          .from("canonical_ingredients")
          .insert({
            canonical_name: enrichedData.canonical_name,
            canonical_name_normalized: enrichedData.canonical_name.replace(/[^a-zåäö0-9]/g, ""),
            canonical_name_en: enrichedData.canonical_name_en,
            default_category: enrichedData.default_category,
            default_unit: "g", // Default to grams
            nutrition_per_100g: enrichedData.nutrition_per_100g,
            open_food_facts_id: enrichedData.open_food_facts_id,
            source: enrichedData.source,
            cached_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error("Insert error:", error);
        } else {
          console.log(`Inserted new ingredient: ${normalizedName}`);
          return new Response(
            JSON.stringify({
              ingredient: inserted,
              source: "open_food_facts",
              action: "created",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 4. If nothing found, return basic info
    return new Response(
      JSON.stringify({
        ingredient: {
          canonical_name: normalizedName,
          default_category: "OTHER",
          source: "not_found",
        },
        source: "not_found",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
