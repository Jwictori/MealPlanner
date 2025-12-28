-- MatPlanner Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  auth_provider VARCHAR(50) NOT NULL CHECK (auth_provider IN ('google', 'facebook', 'email')),
  household_size INT DEFAULT 2 CHECK (household_size > 0),
  dietary_preferences JSONB DEFAULT '[]'::jsonb,
  allergies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  servings INT NOT NULL CHECK (servings > 0),
  ingredients JSONB NOT NULL,
  instructions TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  image_url VARCHAR(500),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal plans table
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_date UNIQUE(user_id, date)
);

-- Shopping lists table
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  items JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared recipes table (for community features)
CREATE TABLE shared_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_code VARCHAR(20) UNIQUE NOT NULL,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  unit_system VARCHAR(20) DEFAULT 'metric' CHECK (unit_system IN ('metric', 'imperial', 'us')),
  language VARCHAR(10) DEFAULT 'sv',
  show_ml_in_parentheses BOOLEAN DEFAULT TRUE,
  default_servings INT DEFAULT 4 CHECK (default_servings > 0),
  preferences JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_recipes_user ON recipes(user_id);
CREATE INDEX idx_recipes_public ON recipes(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_recipes_name ON recipes USING gin(to_tsvector('swedish', name));
CREATE INDEX idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX idx_meal_plans_date ON meal_plans(date);
CREATE INDEX idx_shopping_lists_user ON shopping_lists(user_id);
CREATE INDEX idx_shared_recipes_code ON shared_recipes(share_code);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_policy ON users
    FOR ALL
    USING (auth.uid() = id);

-- Recipes: Users can see their own + public recipes
CREATE POLICY recipes_select_policy ON recipes
    FOR SELECT
    USING (user_id = auth.uid() OR is_public = TRUE);

CREATE POLICY recipes_insert_policy ON recipes
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY recipes_update_policy ON recipes
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY recipes_delete_policy ON recipes
    FOR DELETE
    USING (user_id = auth.uid());

-- Meal plans: Users can only access their own
CREATE POLICY meal_plans_policy ON meal_plans
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Shopping lists: Users can only access their own
CREATE POLICY shopping_lists_policy ON shopping_lists
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- User preferences: Users can only access their own
CREATE POLICY user_preferences_policy ON user_preferences
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Shared recipes: Anyone can view, only owner can create/delete
CREATE POLICY shared_recipes_select_policy ON shared_recipes
    FOR SELECT
    USING (TRUE);

CREATE POLICY shared_recipes_insert_policy ON shared_recipes
    FOR INSERT
    WITH CHECK (shared_by = auth.uid());

CREATE POLICY shared_recipes_delete_policy ON shared_recipes
    FOR DELETE
    USING (shared_by = auth.uid());

-- Create default user preferences on user creation
CREATE OR REPLACE FUNCTION create_default_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_user_preferences AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_default_preferences();

-- Generate random share code
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ language 'plpgsql';

-- Set share code on shared recipe creation
CREATE OR REPLACE FUNCTION set_share_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.share_code IS NULL THEN
        NEW.share_code := generate_share_code();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_shared_recipe_code BEFORE INSERT ON shared_recipes
    FOR EACH ROW EXECUTE FUNCTION set_share_code();
