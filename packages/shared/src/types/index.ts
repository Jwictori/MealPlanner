// Core domain types for MatPlanner

// User roles
export type UserRole = 'guest' | 'user' | 'premium' | 'admin';
export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'cancelled' | 'expired';
export type AuthProvider = 'google' | 'facebook' | 'apple' | 'email';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  auth_provider: AuthProvider;
  provider_data?: Record<string, unknown>;

  // Role & Subscription
  role: UserRole;
  role_updated_at?: Date;
  subscription_status: SubscriptionStatus;
  subscription_expires_at?: Date;

  // Onboarding
  onboarding_completed: boolean;
  onboarding_step: number;

  // Profile
  household_size: number;
  dietary_preferences: string[];
  allergies: string[];
  preferences?: Record<string, unknown>;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// Helper functions for role checking
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

export function isPremium(user: User | null): boolean {
  return user?.role === 'premium' || user?.role === 'admin';
}

export function canAccessFeature(user: User | null, feature: 'household' | 'ai_planning' | 'unlimited_recipes' | 'admin_panel'): boolean {
  if (!user) return false;

  switch (feature) {
    case 'admin_panel':
      return user.role === 'admin';
    case 'household':
    case 'ai_planning':
    case 'unlimited_recipes':
      return user.role === 'premium' || user.role === 'admin';
    default:
      return true;
  }
}

// Legacy JSONB ingredient format (deprecated - kept for migration compatibility)
export interface Ingredient {
  amount?: number | null;  // Optional for "salt och peppar" style ingredients
  unit?: string | null;    // Optional for "efter smak" style ingredients
  name: string;
  key?: string;
  group?: string;  // Ingredient group (e.g., "Servering", "Till såsen")
}

// New relational ingredient format (from recipe_ingredients table)
export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id?: string;
  ingredient_name: string;
  preparation?: string;
  quantity?: number | null;  // Optional for "salt och peppar" style ingredients
  unit?: string | null;      // Optional for "efter smak" style ingredients
  ingredient_group?: string;
  notes?: string;
  order_position: number;
  created_at?: Date;
  updated_at?: Date;
}

// Helper to convert between formats
export function legacyToRecipeIngredient(ing: Ingredient, recipeId: string, position: number): Partial<RecipeIngredient> {
  return {
    recipe_id: recipeId,
    ingredient_name: ing.name,
    quantity: ing.amount,
    unit: ing.unit,
    order_position: position
  };
}

export function recipeIngredientToLegacy(ing: RecipeIngredient): Ingredient {
  return {
    name: ing.ingredient_name,
    amount: ing.quantity,
    unit: ing.unit
  };
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  servings: number;
  // New: ingredients from recipe_ingredients table (via join)
  recipe_ingredients?: RecipeIngredient[];
  // Legacy: kept for backward compatibility during migration
  ingredients?: Ingredient[];
  instructions?: string;
  instructions_steps?: InstructionStep[];
  tags: string[];
  image_url?: string;
  source_url?: string;  // URL where recipe was imported from
  is_public: boolean;
  cooking_time_minutes?: number;
  prep_time_minutes?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  // Import tracking fields (from AI recipe import system)
  import_domain?: string;  // Domain from which recipe was imported (e.g., koket.se)
  import_method?: 'ai_generated' | 'cached_rules' | 'manual' | 'schema_org';
  import_feedback_requested?: boolean;  // Whether user has been prompted for feedback
  original_recipe_data?: Record<string, unknown>;  // Original recipe before translation
  created_at: Date;
  updated_at: Date;
}

// Recipe import feedback types
export type ImportFeedback = 'thumbs_up' | 'thumbs_down';
export type ImportIssueCategory =
  | 'ingredients_wrong'
  | 'instructions_wrong'
  | 'groups_wrong'
  | 'units_wrong'
  | 'translation_wrong'
  | 'missing_data'
  | 'other';

export interface RecipeImportFeedback {
  id: string;
  recipe_id: string;
  user_id: string;
  domain: string;
  feedback: ImportFeedback;
  feedback_details?: string;
  issue_category?: ImportIssueCategory;
  import_method?: string;
  extraction_rules_version?: string;
  created_at: Date;
}

// Helper function to convert between formats
export function instructionsToSteps(instructions: string): InstructionStep[] {
  if (!instructions) return [];
  
  // Try to detect if instructions are already numbered
  const lines = instructions.split('\n').filter(line => line.trim());
  
  return lines.map((line, index) => {
    // Remove common numbering patterns: "1.", "1)", "Step 1:", etc.
    const cleaned = line.replace(/^\s*(\d+[\.\):]?\s*|step\s+\d+:\s*)/i, '').trim();
    return {
      step: index + 1,
      instruction: cleaned
    };
  });
}

export function stepsToInstructions(steps: InstructionStep[]): string {
  return steps
    .sort((a, b) => a.step - b.step)
    .map(s => `${s.step}. ${s.instruction}`)
    .join('\n');
}

export interface InstructionStep {
  step: number;
  instruction: string;
  section?: string;  // Optional section header (e.g., "Grönpepparsås", "Till servering")
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
