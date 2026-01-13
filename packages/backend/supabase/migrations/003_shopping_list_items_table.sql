-- MatPlanner Shopping List Items Table
-- Migration 003
-- Created: 2026-01-07

BEGIN;

-- Create shopping_list_items table for normalized storage
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50),
  category VARCHAR(100),
  checked BOOLEAN DEFAULT FALSE,
  used_in_recipes JSONB DEFAULT '[]'::jsonb,
  used_on_dates JSONB DEFAULT '[]'::jsonb,
  freshness_warning BOOLEAN DEFAULT FALSE,
  freshness_status VARCHAR(20) DEFAULT 'ok' CHECK (freshness_status IN ('ok', 'freeze', 'buy_later')),
  split_info JSONB,
  notes TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list
  ON shopping_list_items(shopping_list_id);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_order
  ON shopping_list_items(shopping_list_id, "order");

-- Enable RLS
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can access items from their own shopping lists
CREATE POLICY shopping_list_items_policy ON shopping_list_items
  FOR ALL
  USING (
    shopping_list_id IN (
      SELECT id FROM shopping_lists WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    shopping_list_id IN (
      SELECT id FROM shopping_lists WHERE user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_shopping_list_items_updated_at
  BEFORE UPDATE ON shopping_list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_list_items;

COMMIT;
