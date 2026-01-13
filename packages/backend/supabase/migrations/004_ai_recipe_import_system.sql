-- Migration: AI Recipe Import System
-- Description: Adds tables for AI-powered recipe extraction with pattern learning
-- Version: 004
-- Date: 2026-01-10

-- ============================================================================
-- 1. SITE EXTRACTION RULES TABLE
-- Stores AI-generated extraction rules per domain (learned patterns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_extraction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Domain identification (unique key)
  domain TEXT UNIQUE NOT NULL,

  -- Status management
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'deprecated', 'needs_review')),

  -- Confidence and quality metrics
  confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- AI-generated extraction rules (JSONB for flexibility)
  -- Structure:
  -- {
  --   "schema_version": "1.0",
  --   "ingredients": {
  --     "source": "recipeIngredient",
  --     "group_detection": { "method": "keyword_match", "keywords": [...], "reject_patterns": [...] },
  --     "parsing": { "amount_regex": "...", "unit_position": "after_amount" }
  --   },
  --   "instructions": {
  --     "source": "recipeInstructions",
  --     "type": "HowToStep|HowToSection|string_array|plain_string",
  --     "section_handling": { "has_sections": true, "section_field": "itemListElement" }
  --   },
  --   "metadata": {
  --     "name_field": "name",
  --     "servings_field": "recipeYield",
  --     "image_field": "image",
  --     "tags_sources": ["recipeCategory", "keywords"],
  --     "time_fields": { "prep": "prepTime", "cook": "cookTime", "total": "totalTime" }
  --   },
  --   "unit_translations": {
  --     "tablespoon": { "swedish": "msk" },
  --     "cup": { "swedish": "dl", "factor": 2.37 }
  --   },
  --   "locale": { "detected": "en-US", "needs_translation": true }
  -- }
  extraction_rules JSONB NOT NULL,

  -- Sample data used for analysis
  sample_urls TEXT[] DEFAULT '{}',
  sample_html_snippet TEXT, -- First 10KB of HTML for debugging
  sample_schema_org JSONB, -- Raw schema.org data found

  -- Usage statistics
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Feedback metrics (populated from recipe_import_feedback)
  total_imports INTEGER DEFAULT 0,
  positive_feedback INTEGER DEFAULT 0,
  negative_feedback INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN total_imports > 0 THEN
        ROUND((positive_feedback::NUMERIC / total_imports) * 100, 2)
      ELSE 0
    END
  ) STORED,

  -- AI metadata
  ai_model_used TEXT, -- e.g., 'gemini-2.0-flash'
  ai_prompt_version TEXT, -- For tracking prompt iterations
  ai_analysis_raw JSONB, -- Full AI response for debugging

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_site_extraction_rules_domain ON site_extraction_rules(domain);
CREATE INDEX idx_site_extraction_rules_status ON site_extraction_rules(status);
CREATE INDEX idx_site_extraction_rules_success_rate ON site_extraction_rules(success_rate DESC);

-- Comment
COMMENT ON TABLE site_extraction_rules IS 'AI-generated extraction rules per recipe website domain. Used to parse recipes consistently.';

-- ============================================================================
-- 2. RECIPE IMPORT FEEDBACK TABLE
-- Stores user feedback (thumbs up/down) for imported recipes
-- ============================================================================

CREATE TABLE IF NOT EXISTS recipe_import_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Domain tracking (for aggregating feedback per site)
  domain TEXT NOT NULL,

  -- Feedback
  feedback TEXT NOT NULL CHECK (feedback IN ('thumbs_up', 'thumbs_down')),
  feedback_details TEXT, -- Optional: user can explain what was wrong

  -- What was the issue? (for thumbs_down)
  issue_category TEXT CHECK (issue_category IN (
    'ingredients_wrong',
    'instructions_wrong',
    'groups_wrong',
    'units_wrong',
    'translation_wrong',
    'missing_data',
    'other'
  )),

  -- Import metadata (snapshot at time of import)
  import_method TEXT CHECK (import_method IN ('ai_generated', 'cached_rules', 'manual')),
  extraction_rules_version TEXT, -- Which version of rules was used

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate feedback from same user on same recipe
  UNIQUE(recipe_id, user_id)
);

-- Indexes
CREATE INDEX idx_recipe_import_feedback_domain ON recipe_import_feedback(domain);
CREATE INDEX idx_recipe_import_feedback_feedback ON recipe_import_feedback(feedback);
CREATE INDEX idx_recipe_import_feedback_recipe ON recipe_import_feedback(recipe_id);

-- Comment
COMMENT ON TABLE recipe_import_feedback IS 'User feedback on recipe import quality. Used to calculate success rates and trigger re-analysis.';

-- ============================================================================
-- 3. ADD FIELDS TO RECIPES TABLE
-- For storing original (untranslated) recipe data
-- ============================================================================

-- Add original recipe data field (stores the recipe in its original language)
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS original_recipe_data JSONB;

COMMENT ON COLUMN recipes.original_recipe_data IS 'Original recipe data before translation. Contains the recipe in its source language for international users.';

-- Add import tracking fields
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS import_domain TEXT;

COMMENT ON COLUMN recipes.import_domain IS 'Domain from which this recipe was imported (e.g., koket.se, allrecipes.com)';

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS import_method TEXT
CHECK (import_method IN ('ai_generated', 'cached_rules', 'manual', 'schema_org'));

COMMENT ON COLUMN recipes.import_method IS 'Method used to import this recipe: ai_generated (first-time AI analysis), cached_rules (used stored rules), manual (user entered), schema_org (legacy)';

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS import_feedback_requested BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN recipes.import_feedback_requested IS 'Whether user has been prompted for feedback on this import';

-- ============================================================================
-- 4. FUNCTION: Update feedback metrics on site_extraction_rules
-- Automatically updates counts when feedback is added
-- ============================================================================

CREATE OR REPLACE FUNCTION update_site_extraction_feedback()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE site_extraction_rules
    SET
      total_imports = total_imports + 1,
      positive_feedback = positive_feedback + CASE WHEN NEW.feedback = 'thumbs_up' THEN 1 ELSE 0 END,
      negative_feedback = negative_feedback + CASE WHEN NEW.feedback = 'thumbs_down' THEN 1 ELSE 0 END,
      updated_at = now()
    WHERE domain = NEW.domain;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle feedback change (unlikely but possible)
    UPDATE site_extraction_rules
    SET
      positive_feedback = positive_feedback
        + CASE WHEN NEW.feedback = 'thumbs_up' THEN 1 ELSE 0 END
        - CASE WHEN OLD.feedback = 'thumbs_up' THEN 1 ELSE 0 END,
      negative_feedback = negative_feedback
        + CASE WHEN NEW.feedback = 'thumbs_down' THEN 1 ELSE 0 END
        - CASE WHEN OLD.feedback = 'thumbs_down' THEN 1 ELSE 0 END,
      updated_at = now()
    WHERE domain = NEW.domain;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic feedback aggregation
DROP TRIGGER IF EXISTS trigger_update_site_feedback ON recipe_import_feedback;
CREATE TRIGGER trigger_update_site_feedback
  AFTER INSERT OR UPDATE ON recipe_import_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_site_extraction_feedback();

-- ============================================================================
-- 5. FUNCTION: Check if domain needs re-analysis
-- Returns true if success_rate drops below threshold or no rules exist
-- ============================================================================

CREATE OR REPLACE FUNCTION domain_needs_reanalysis(p_domain TEXT, p_threshold INTEGER DEFAULT 70)
RETURNS BOOLEAN AS $$
DECLARE
  v_rule RECORD;
BEGIN
  SELECT * INTO v_rule FROM site_extraction_rules WHERE domain = p_domain;

  -- No rules exist = needs analysis
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- Status is needs_review
  IF v_rule.status = 'needs_review' THEN
    RETURN TRUE;
  END IF;

  -- Success rate below threshold (only if we have enough data)
  IF v_rule.total_imports >= 5 AND v_rule.success_rate < p_threshold THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

-- site_extraction_rules: Read-only for authenticated users, write only via service role
ALTER TABLE site_extraction_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_extraction_rules_read" ON site_extraction_rules
  FOR SELECT TO authenticated
  USING (true);

-- recipe_import_feedback: Users can only manage their own feedback
ALTER TABLE recipe_import_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_import_feedback_select" ON recipe_import_feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "recipe_import_feedback_insert" ON recipe_import_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "recipe_import_feedback_update" ON recipe_import_feedback
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 7. INDEXES FOR RECIPES TABLE (new columns)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_recipes_import_domain ON recipes(import_domain);
CREATE INDEX IF NOT EXISTS idx_recipes_import_method ON recipes(import_method);
