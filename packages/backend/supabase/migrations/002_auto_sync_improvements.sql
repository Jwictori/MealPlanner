-- MatPlanner Auto-Sync Improvements
-- Migration 002
-- Created: 2024-12-30

BEGIN;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe 
  ON meal_plans(recipe_id) 
  WHERE recipe_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shopping_lists_date_range 
  ON shopping_lists(user_id, date_range_start, date_range_end);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_updated 
  ON shopping_lists(user_id, updated_at DESC);

-- Update trigger for shopping_lists (tracks when sync happened)
CREATE OR REPLACE FUNCTION update_shopping_list_sync_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_shopping_lists_updated_at ON shopping_lists;
CREATE TRIGGER update_shopping_lists_updated_at 
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW 
  EXECUTE FUNCTION update_shopping_list_sync_time();

-- Add comment to shopping_lists.items to document new structure
COMMENT ON COLUMN shopping_lists.items IS 
'JSONB array of shopping list items. Each item should have:
{
  "name": string (ingredient name),
  "quantity": number,
  "unit": string,
  "category": string (from ingredientCategories),
  "checked": boolean,
  "is_manual": boolean (user added manually, not from recipe),
  "used_in_recipes": string[] (array of recipe IDs),
  "used_on_dates": string[] (array of ISO dates),
  "recipe_names": string[] (for display purposes)
}';

COMMIT;
