// Core domain types for MatPlanner

export interface User {
  id: string;
  email: string;
  name?: string;
  auth_provider: 'google' | 'facebook' | 'email';
  household_size: number;
  dietary_preferences: string[];
  allergies: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Ingredient {
  amount: number;
  unit: string;
  name: string;
  key?: string; // For ingredient database lookup
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  servings: number;
  ingredients: Ingredient[];
  instructions: string;
  tags: string[];
  image_url?: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MealPlan {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD format
  recipe_id: string;
  recipe?: Recipe; // Populated on fetch
  created_at: Date;
}

export interface ShoppingListItem {
  name: string;
  amount: number;
  unit: string;
  category: 'produce' | 'meat' | 'dairy' | 'pantry' | 'other';
  checked: boolean;
}

export interface ShoppingList {
  id: string;
  user_id: string;
  date_range_start: string;
  date_range_end: string;
  items: ShoppingListItem[];
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  user_id: string;
  unit_system: 'metric' | 'imperial' | 'us';
  language: 'sv' | 'en';
  show_ml_in_parentheses: boolean;
  default_servings: number;
  preferences: Record<string, any>;
}

export interface SharedRecipe {
  id: string;
  recipe_id: string;
  shared_by: string;
  share_code: string;
  view_count: number;
  created_at: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// AI Planning types
export type MealPlanMode = 'balanced' | 'vegetarian' | 'quick' | 'random' | 'ai';

export interface AIMealPlanRequest {
  mode: MealPlanMode;
  start_date: string;
  days: number;
  user_preferences?: UserPreferences;
  pantry_items?: string[];
}

// Unit conversion
export const UNITS = {
  volume: ['ml', 'dl', 'l', 'msk', 'tsk', 'krm'],
  weight: ['g', 'kg', 'hg'],
  count: ['st', 'klyfta', 'påse', 'burk']
} as const;

export type VolumeUnit = typeof UNITS.volume[number];
export type WeightUnit = typeof UNITS.weight[number];
export type CountUnit = typeof UNITS.count[number];
export type Unit = VolumeUnit | WeightUnit | CountUnit;

// Ingredient categories
export const CATEGORIES = {
  produce: 'Frukt & Grönt',
  meat: 'Kött & Fisk',
  dairy: 'Mejeri',
  pantry: 'Skafferi',
  other: 'Övrigt'
} as const;

export type Category = keyof typeof CATEGORIES;
