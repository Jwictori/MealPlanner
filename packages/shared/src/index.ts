/**
 * Shared Package - Central Export
 * 
 * Explicitly re-export to avoid naming conflicts
 */

// ============================================
// Core Types (from types/index.ts)
// ============================================
export type {
  User,
  Ingredient,
  RecipeIngredient,
  Recipe,
  MealPlan,
  InstructionStep,
  UserPreferences,
  SharedRecipe,
  ApiResponse,
  MealPlanMode,
  AIMealPlanRequest,
  VolumeUnit,
  WeightUnit,
  CountUnit,
  Unit,
  Category
} from './types/index.js';

export {
  UNITS,
  CATEGORIES,
  legacyToRecipeIngredient,
  recipeIngredientToLegacy,
  instructionsToSteps,
  stepsToInstructions
} from './types/index.js';

// ============================================
// Ingredient Categorization (Grocery Store)
// ============================================
// NOTE: This IngredientCategory is for grocery store categories (DAIRY_MILK, MEAT_FRESH, etc)
export type {
  IngredientCategory,
  CategoryInfo
} from './ingredientCategories.js';

export {
  CATEGORY_DATABASE,
  categorizeIngredient,
  getCategoryInfo,
  getCategoryName,
  getAllCategoriesSorted
} from './ingredientCategories.js';

// ============================================
// Shopping List Types
// ============================================
// NOTE: Using ShoppingList & ShoppingListItem from shoppingListTypes (more complete)
// Overrides the simpler versions in types/index.ts
export type {
  ShoppingList,
  ShoppingListItem,
  FreshnessWarning,
  DateRangePreset,
  PopulateStrategy
} from './shoppingListTypes.js';

export {
  DATE_RANGE_PRESETS,
  SHOPPING_LIST_SCHEMA
} from './shoppingListTypes.js';

// ============================================
// Shelf Life Data
// ============================================
// NOTE: shelfLife.ts has its own IngredientCategory (FRESH_FISH, FRESH_MEAT, etc)
// We export it as ShelfLifeCategory to avoid conflict with grocery store categories
export type {
  ShelfLifeData,
  IngredientCategory as ShelfLifeCategory
} from './shelfLife.js';

export {
  SHELF_LIFE_DATABASE,
  categorizeIngredient as categorizeForShelfLife,
  willBeFreshWhenNeeded,
  splitIngredientByFreshness
} from './shelfLife.js';