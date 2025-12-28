-- Seed data for MatPlanner
-- Insert default public recipes that all users can access

-- Create a system user for public recipes
INSERT INTO users (id, email, name, auth_provider, household_size)
VALUES ('00000000-0000-0000-0000-000000000000', 'system@matplanner.app', 'MatPlanner', 'email', 4)
ON CONFLICT (id) DO NOTHING;

-- Insert default recipes (from your existing 25 recipes)
INSERT INTO recipes (id, user_id, name, servings, ingredients, instructions, tags, is_public) VALUES
(
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'Köttbullar med potatismos',
  4,
  '[
    {"amount": 500, "unit": "g", "name": "Köttfärs", "key": "kottfars"},
    {"amount": 1, "unit": "st", "name": "Ägg", "key": "agg"},
    {"amount": 60, "unit": "g", "name": "Ströbröd", "key": "strobrod"},
    {"amount": 2, "unit": "dl", "name": "Grädde (200ml)", "key": "gradde"},
    {"amount": 1, "unit": "st", "name": "Lök", "key": "lon"},
    {"amount": 800, "unit": "g", "name": "Potatis", "key": "potatis"},
    {"amount": 1, "unit": "dl", "name": "Mjölk (100ml)", "key": "mjolk"},
    {"amount": 50, "unit": "g", "name": "Smör", "key": "smor"}
  ]'::jsonb,
  'Blanda färs, ägg, ströbröd, grädde och finhackad lök. Forma till bullar och stek i smör. Koka potatis och mosa med mjölk och smör. Servera med lingonsylt.',
  '["Klassiker", "Svenskt", "Barnvänligt"]'::jsonb,
  TRUE
),
(
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'Pasta Carbonara',
  4,
  '[
    {"amount": 400, "unit": "g", "name": "Pasta", "key": "pasta"},
    {"amount": 200, "unit": "g", "name": "Bacon", "key": "bacon"},
    {"amount": 3, "unit": "st", "name": "Ägg", "key": "agg"},
    {"amount": 100, "unit": "g", "name": "Riven parmesan", "key": "parmesan"},
    {"amount": 2, "unit": "dl", "name": "Grädde (200ml)", "key": "gradde"},
    {"amount": 2, "unit": "klyfta", "name": "Vitlök", "key": "vitlok"}
  ]'::jsonb,
  'Koka pastan. Stek bacon och vitlök. Blanda ägg, parmesan och grädde. Vänd ner pastan i baconblandningen och tillsätt äggblandningen utanför värmen.',
  '["Snabbt", "Italienskt", "Populärt"]'::jsonb,
  TRUE
),
(
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'Lax med dillsås',
  4,
  '[
    {"amount": 600, "unit": "g", "name": "Lax", "key": "lax"},
    {"amount": 2, "unit": "dl", "name": "Grädde (200ml)", "key": "gradde"},
    {"amount": 2, "unit": "msk", "name": "Färsk dill (30ml)", "key": "dill"},
    {"amount": 1, "unit": "msk", "name": "Citronsaft (15ml)", "key": "citron"},
    {"amount": 600, "unit": "g", "name": "Potatis", "key": "potatis"}
  ]'::jsonb,
  'Stek eller ugnstek laxen. Koka grädde och tillsätt dill och citronsaft. Servera med kokt potatis.',
  '["Fisk", "Nyttig", "Festmat"]'::jsonb,
  TRUE
);

-- Add more recipes (truncated for brevity - you can add all 25)
-- ...

-- Create indexes on JSONB fields for better search performance
CREATE INDEX idx_recipes_tags ON recipes USING gin(tags);
CREATE INDEX idx_recipes_ingredients ON recipes USING gin(ingredients);

-- Full-text search on recipe names
CREATE INDEX idx_recipes_search ON recipes USING gin(
  to_tsvector('swedish', name || ' ' || COALESCE(instructions, ''))
);
