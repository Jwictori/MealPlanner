// Shopping List Types - Complete system
import type { IngredientCategory } from './ingredientCategories'

export interface ShoppingList {
  id: string
  user_id: string
  name: string // "Inköp 30 Dec - 12 Jan"
  date_range_start: string // ISO date
  date_range_end: string // ISO date
  created_at: string
  updated_at: string
  status: 'active' | 'completed' | 'archived'
  warnings: FreshnessWarning[]
  split_mode: 'single' | 'multiple' // Om delad i flera listor
  items: any[] // JSONB array in database
}

export interface ShoppingListItem {
  id: string
  shopping_list_id: string
  ingredient_name: string
  quantity: number
  unit: string
  category: IngredientCategory
  checked: boolean
  used_in_recipes: string[] // Recipe IDs
  used_on_dates: string[] // ISO dates
  freshness_warning: boolean
  freshness_status: 'ok' | 'freeze' | 'buy_later'
  split_info?: {
    buy_now: number
    buy_later: number
    buy_later_date: string
  }
  notes?: string
  order: number // For sorting
}

export interface FreshnessWarning {
  severity: 'high' | 'medium' | 'low'
  category: IngredientCategory
  item_count: number
  message: string
  recommendation: string
  affected_items: string[] // Item IDs
}

export interface DateRangePreset {
  id: string
  label: string
  days: number
  icon: string
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { id: 'this_week', label: 'Denna vecka', days: 7, icon: '📅' },
  { id: 'two_weeks', label: 'Nästa 2 veckor', days: 14, icon: '📆' },
  { id: 'one_month', label: 'En månad framåt', days: 30, icon: '🗓️' },
  { id: 'custom', label: 'Anpassat datumspann', days: 0, icon: '⚙️' }
]

export interface PopulateStrategy {
  mode: 'include_all' | 'exclude_perishables' | 'split_lists' | 'custom'
  custom_categories?: IngredientCategory[]
}

// Database schema
export const SHOPPING_LIST_SCHEMA = `
  -- Shopping lists
  CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    split_mode TEXT DEFAULT 'single' CHECK (split_mode IN ('single', 'multiple')),
    warnings JSONB DEFAULT '[]'::jsonb
  );

  -- Shopping list items
  CREATE TABLE shopping_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    ingredient_name TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit TEXT NOT NULL,
    category TEXT NOT NULL,
    checked BOOLEAN DEFAULT false,
    used_in_recipes TEXT[] DEFAULT '{}',
    used_on_dates DATE[] DEFAULT '{}',
    freshness_warning BOOLEAN DEFAULT false,
    freshness_status TEXT CHECK (freshness_status IN ('ok', 'freeze', 'buy_later')),
    split_info JSONB,
    notes TEXT,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Indexes
  CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
  CREATE INDEX idx_shopping_lists_status ON shopping_lists(status);
  CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(shopping_list_id);
  CREATE INDEX idx_shopping_list_items_category ON shopping_list_items(category);

  -- RLS Policies
  ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
  ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view own shopping lists"
    ON shopping_lists FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can create own shopping lists"
    ON shopping_lists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update own shopping lists"
    ON shopping_lists FOR UPDATE
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete own shopping lists"
    ON shopping_lists FOR DELETE
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can view items in own shopping lists"
    ON shopping_list_items FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM shopping_lists
        WHERE id = shopping_list_items.shopping_list_id
        AND user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can create items in own shopping lists"
    ON shopping_list_items FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM shopping_lists
        WHERE id = shopping_list_items.shopping_list_id
        AND user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update items in own shopping lists"
    ON shopping_list_items FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM shopping_lists
        WHERE id = shopping_list_items.shopping_list_id
        AND user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete items in own shopping lists"
    ON shopping_list_items FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM shopping_lists
        WHERE id = shopping_list_items.shopping_list_id
        AND user_id = auth.uid()
      )
    );
`