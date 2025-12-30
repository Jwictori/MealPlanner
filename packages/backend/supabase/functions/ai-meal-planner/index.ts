// Supabase Edge Function: ai-meal-planner (Gemini version)
// Deploy this to handle Gemini API calls server-side

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client (for potential future use)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const authHeader = req.headers.get('Authorization')
    
    // Optional: Verify user is authenticated
    if (authHeader) {
      const supabaseClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
      })
      
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }
    }

    // Get request body
    const { userContext, recipesList, options } = await req.json()

    // Build prompt
    const prompt = buildPrompt(userContext, recipesList, options)

    // Call Gemini API
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Call Gemini API - Use gemini-2.5-flash (verified available)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${error}`)
    }

    const data = await response.json()
    
    // Extract text from Gemini response
    const aiText = data.candidates[0]?.content?.parts[0]?.text
    
    if (!aiText) {
      throw new Error('No response from Gemini')
    }

    // Return in Claude-compatible format for frontend
    const claudeFormatResponse = {
      content: [{
        type: 'text',
        text: aiText
      }]
    }
    
    return new Response(
      JSON.stringify(claudeFormatResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: unknown) {
    console.error('Edge function error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

function buildPrompt(userContext: string, recipesList: any[], options: any): string {
  const focusDescriptions = {
    balanced: 'balanserad näring med variation',
    protein: 'högt proteininnehåll för träning',
    budget: 'kostnadseffektiva ingredienser',
    quick: 'snabb matlagning (max 30 min)',
    variety: 'maximal variation i smaker och kök',
  }

  const focusDesc = focusDescriptions[options.focusArea as keyof typeof focusDescriptions] || 'balanserad kost'

  return `Du är en professionell matplanerare och nutritionist.

${userContext}

TILLGÄNGLIGA RECEPT:
${JSON.stringify(recipesList, null, 2)}

UPPGIFT:
Skapa en ${options.days}-dagars matplan med fokus på "${focusDesc}".

${options.customInstructions ? `EXTRA INSTRUKTIONER:\n${options.customInstructions}\n` : ''}

KRAV:
1. Välj ${options.days} OLIKA recept (inga dubbletter)
2. Balansera näring (proteiner, grönsaker, kolhydrater)
3. Variera protein-källor (kyckling, fisk, vegetariskt, kött)
4. Ta hänsyn till användarens preferenser
5. Förklara varför du valde varje recept

VIKTIGT: Svara ENDAST med JSON, ingen annan text före eller efter. Börja direkt med { och sluta med }.

JSON FORMAT:
{
  "meal_plan": [
    {"day": 1, "recipe_name": "...", "reason": "..."},
    {"day": 2, "recipe_name": "...", "reason": "..."}
  ],
  "overall_reasoning": "Övergripande tankar om veckan...",
  "nutritional_balance": "Beskrivning av näringsbalans...",
  "tips": ["Tip 1", "Tip 2"]
}`
}