// Local types (copied from @mealplanner/shared)

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface InstructionStep {
  step: number;
  instruction: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  ingredients: Ingredient[];
  instructions?: string;
  instructions_steps?: InstructionStep[];
  servings: number;
  cooking_time?: number;
  category?: string;
  tags?: string[];
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  recipe_id: string;
  date: string;
  created_at?: string;
  recipe?: Recipe;
}

export interface ShoppingListItem {
  id: string;
  shopping_list_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  used_in_recipes?: string[];
  used_on_dates?: string[];
  order?: number;
}

export interface ShoppingList {
  id: string;
  user_id: string;
  name: string;
  date_range_start: string;
  date_range_end: string;
  status: 'draft' | 'active' | 'completed';
  created_at?: string;
  updated_at?: string;
  items?: ShoppingListItem[];
}
