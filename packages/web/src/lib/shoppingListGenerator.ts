import { format, addDays, differenceInDays, parseISO } from 'date-fns'
import { categorizeIngredient, getCategoryInfo, type IngredientCategory } from '@shared/ingredientCategories'
import type { Recipe, MealPlan } from '@shared/types'
import type { ShoppingList, ShoppingListItem, FreshnessWarning } from '@shared/shoppingListTypes'

interface GenerateOptions {
  dateFrom: string // ISO date
  dateTo: string // ISO date
  strategy: 'include_all' | 'exclude_perishables' | 'split_lists' | 'custom'
  customCategories?: IngredientCategory[]
}

interface AggregatedIngredient {
  name: string
  totalQuantity: number
  unit: string
  category: IngredientCategory
  usedInRecipes: Array<{ recipeId: string; recipeName: string; date: string }>
  usedOnDates: string[]
}

export class ShoppingListGenerator {
  
  // Step 1: Aggregate ingredients from meal plans
  static aggregateIngredients(
    mealPlans: MealPlan[],
    recipes: Recipe[],
    dateFrom: string,
    dateTo: string
  ): AggregatedIngredient[] {
    
    const ingredientMap = new Map<string, AggregatedIngredient>()
    
    // Filter meal plans within date range
    const filteredPlans = mealPlans.filter(mp => {
      const mpDate = mp.date
      return mpDate >= dateFrom && mpDate <= dateTo
    })
    
    // Aggregate ingredients (supports both new recipe_ingredients and legacy ingredients)
    for (const plan of filteredPlans) {
      const recipe = recipes.find(r => r.id === plan.recipe_id)
      if (!recipe) continue

      // Get ingredients from either new format (recipe_ingredients) or legacy format (ingredients)
      const ingredientsList = recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0
        ? recipe.recipe_ingredients.map(ri => ({
            name: ri.ingredient_name,
            amount: ri.quantity,
            unit: ri.unit
          }))
        : (recipe.ingredients ?? [])

      for (const ingredient of ingredientsList) {
        if (!ingredient.name) continue

        const key = `${ingredient.name.toLowerCase()}_${ingredient.unit || ''}`

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!
          existing.totalQuantity += ingredient.amount || 0
          existing.usedInRecipes.push({
            recipeId: recipe.id,
            recipeName: recipe.name,
            date: plan.date
          })
          existing.usedOnDates.push(plan.date)
        } else {
          const category = categorizeIngredient(ingredient.name)
          ingredientMap.set(key, {
            name: ingredient.name,
            totalQuantity: ingredient.amount || 0,
            unit: ingredient.unit || '',
            category,
            usedInRecipes: [{
              recipeId: recipe.id,
              recipeName: recipe.name,
              date: plan.date
            }],
            usedOnDates: [plan.date]
          })
        }
      }
    }
    
    return Array.from(ingredientMap.values())
  }
  
  // Step 2: Analyze freshness for all ingredients
  static analyzeFreshness(
    ingredients: AggregatedIngredient[],
    startDate: string
  ): FreshnessWarning[] {
    
    const warnings: FreshnessWarning[] = []
    const warningsByCategory = new Map<IngredientCategory, AggregatedIngredient[]>()
    
    for (const ingredient of ingredients) {
      // Find earliest use date
      const earliestUse = ingredient.usedOnDates.sort()[0]
      const daysUntilUse = differenceInDays(parseISO(earliestUse), parseISO(startDate))
      
      // Get category info
      const categoryInfo = getCategoryInfo(ingredient.category)
      if (!categoryInfo) {
        console.warn('Unknown category in analyzeFreshness:', ingredient.category, ingredient.name)
        continue
      }
      
      // Check freshness
      const isFresh = daysUntilUse <= categoryInfo.shelfLife
      
      if (!isFresh) {
        if (!warningsByCategory.has(ingredient.category)) {
          warningsByCategory.set(ingredient.category, [])
        }
        warningsByCategory.get(ingredient.category)!.push(ingredient)
      }
    }
    
    // Generate warnings by category
    for (const [category, items] of warningsByCategory) {
      const categoryInfo = getCategoryInfo(category)
      if (!categoryInfo) continue // Skip unknown categories
      
      let severity: 'high' | 'medium' | 'low' = 'medium'
      if (categoryInfo.shelfLife <= 2) severity = 'high'
      if (categoryInfo.shelfLife >= 7) severity = 'low'
      
      warnings.push({
        severity,
        category,
        item_count: items.length,
        message: `${categoryInfo.icon} ${categoryInfo.name_sv} (${items.length} st)`,
        recommendation: categoryInfo.tips_sv,
        affected_items: items.map(i => i.name)
      })
    }
    
    return warnings.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }
  
  // Step 3: Split quantities based on use dates
  static splitQuantities(
    ingredient: AggregatedIngredient,
    splitDate: string // Date to split on (e.g., after 2 weeks)
  ): {
    buyNow: number
    buyLater: number
    buyLaterDate: string | null
  } {
    
    const nowDates = ingredient.usedOnDates.filter(d => d <= splitDate)
    const laterDates = ingredient.usedOnDates.filter(d => d > splitDate)
    
    if (laterDates.length === 0) {
      return {
        buyNow: ingredient.totalQuantity,
        buyLater: 0,
        buyLaterDate: null
      }
    }
    
    const nowAmount = (ingredient.totalQuantity / ingredient.usedOnDates.length) * nowDates.length
    const laterAmount = (ingredient.totalQuantity / ingredient.usedOnDates.length) * laterDates.length
    
    // Calculate optimal buy-later date (2 days before first use in later period)
    const firstLaterUse = laterDates.sort()[0]
    const buyLaterDate = format(
      addDays(parseISO(firstLaterUse), -2),
      'yyyy-MM-dd'
    )
    
    return {
      buyNow: Math.ceil(nowAmount),
      buyLater: Math.ceil(laterAmount),
      buyLaterDate
    }
  }
  
  // Step 4: Generate shopping list(s) based on strategy
  static async generateLists(
    userId: string,
    mealPlans: MealPlan[],
    recipes: Recipe[],
    options: GenerateOptions
  ): Promise<Partial<ShoppingList>[]> {
    
    const { dateFrom, dateTo, strategy } = options
    
    // Aggregate ingredients
    const ingredients = this.aggregateIngredients(mealPlans, recipes, dateFrom, dateTo)
    
    // Analyze freshness
    const warnings = this.analyzeFreshness(ingredients, dateFrom)
    
    // Generate lists based on strategy
    if (strategy === 'split_lists') {
      return this.generateSplitLists(userId, ingredients, dateFrom, dateTo, warnings)
    } else if (strategy === 'exclude_perishables') {
      return this.generateExcludePerishablesLists(userId, ingredients, dateFrom, dateTo, warnings)
    } else if (strategy === 'custom') {
      return this.generateCustomLists(userId, ingredients, dateFrom, dateTo, warnings, options.customCategories)
    } else {
      // include_all
      return this.generateSingleList(userId, ingredients, dateFrom, dateTo, warnings)
    }
  }
  
  private static generateSingleList(
    userId: string,
    ingredients: AggregatedIngredient[],
    dateFrom: string,
    dateTo: string,
    warnings: FreshnessWarning[]
  ): Partial<ShoppingList>[] {
    
    const items: Partial<ShoppingListItem>[] = ingredients.map((ing, index) => ({
      ingredient_name: ing.name,
      quantity: ing.totalQuantity,
      unit: ing.unit,
      category: ing.category,
      checked: false,
      used_in_recipes: ing.usedInRecipes.map(r => r.recipeId),
      used_on_dates: ing.usedOnDates,
      freshness_warning: warnings.some(w => w.affected_items.includes(ing.name)),
      freshness_status: this.getFreshnessStatus(ing, dateFrom),
      order: index
    }))
    
    return [{
      user_id: userId,
      name: `Inköpslista ${format(parseISO(dateFrom), 'd MMM')} - ${format(parseISO(dateTo), 'd MMM')}`,
      date_range_start: dateFrom,
      date_range_end: dateTo,
      status: 'active',
      split_mode: 'single',
      warnings,
      items
    }]
  }
  
  private static generateSplitLists(
    userId: string,
    ingredients: AggregatedIngredient[],
    dateFrom: string,
    dateTo: string,
    warnings: FreshnessWarning[]
  ): Partial<ShoppingList>[] {
    
    // Split at 2 weeks
    const midDate = format(addDays(parseISO(dateFrom), 14), 'yyyy-MM-dd')
    
    const list1Items: AggregatedIngredient[] = []
    const list2Items: AggregatedIngredient[] = []
    
    for (const ing of ingredients) {
      const hasEarlyUse = ing.usedOnDates.some(d => d <= midDate)
      const hasLateUse = ing.usedOnDates.some(d => d > midDate)
      
      if (hasEarlyUse && hasLateUse) {
        // Split quantity
        const split = this.splitQuantities(ing, midDate)
        
        if (split.buyNow > 0) {
          list1Items.push({
            ...ing,
            totalQuantity: split.buyNow,
            usedOnDates: ing.usedOnDates.filter(d => d <= midDate)
          })
        }
        
        if (split.buyLater > 0) {
          list2Items.push({
            ...ing,
            totalQuantity: split.buyLater,
            usedOnDates: ing.usedOnDates.filter(d => d > midDate)
          })
        }
      } else if (hasEarlyUse) {
        list1Items.push(ing)
      } else {
        list2Items.push(ing)
      }
    }
    
    const lists: Partial<ShoppingList>[] = []
    
    if (list1Items.length > 0) {
      lists.push({
        user_id: userId,
        name: `Lista 1: ${format(parseISO(dateFrom), 'd MMM')} - ${format(parseISO(midDate), 'd MMM')}`,
        date_range_start: dateFrom,
        date_range_end: midDate,
        status: 'active',
        split_mode: 'multiple',
        warnings: warnings.filter(w => 
          w.affected_items.some(item => list1Items.find(i => i.name === item))
        )
      })
    }
    
    if (list2Items.length > 0) {
      const list2Start = format(addDays(parseISO(midDate), 1), 'yyyy-MM-dd')
      lists.push({
        user_id: userId,
        name: `Lista 2: ${format(parseISO(list2Start), 'd MMM')} - ${format(parseISO(dateTo), 'd MMM')}`,
        date_range_start: list2Start,
        date_range_end: dateTo,
        status: 'active',
        split_mode: 'multiple',
        warnings: warnings.filter(w => 
          w.affected_items.some(item => list2Items.find(i => i.name === item))
        )
      })
    }
    
    return lists
  }
  
  private static generateExcludePerishablesLists(
    userId: string,
    ingredients: AggregatedIngredient[],
    dateFrom: string,
    dateTo: string,
    _warnings: FreshnessWarning[]
  ): Partial<ShoppingList>[] {

    // Only include items that will stay fresh for the entire period
    const totalDays = differenceInDays(parseISO(dateTo), parseISO(dateFrom))

    const includedItems = ingredients.filter(ing => {
      const categoryInfo = getCategoryInfo(ing.category)
      if (!categoryInfo) return false // Exclude unknown categories
      return categoryInfo.shelfLife >= totalDays
    })

    return this.generateSingleList(userId, includedItems, dateFrom, dateTo, [])
  }
  
  private static generateCustomLists(
    userId: string,
    ingredients: AggregatedIngredient[],
    dateFrom: string,
    dateTo: string,
    warnings: FreshnessWarning[],
    customCategories?: IngredientCategory[]
  ): Partial<ShoppingList>[] {
    
    if (!customCategories || customCategories.length === 0) {
      return this.generateSingleList(userId, ingredients, dateFrom, dateTo, warnings)
    }
    
    const filteredItems = ingredients.filter(ing => 
      customCategories.includes(ing.category)
    )
    
    return this.generateSingleList(userId, filteredItems, dateFrom, dateTo, warnings)
  }
  
  private static getFreshnessStatus(
    ingredient: AggregatedIngredient,
    startDate: string
  ): 'ok' | 'freeze' | 'buy_later' {
    
    const earliestUse = ingredient.usedOnDates.sort()[0]
    const daysUntilUse = differenceInDays(parseISO(earliestUse), parseISO(startDate))
    
    const categoryInfo = getCategoryInfo(ingredient.category)
    if (!categoryInfo) return 'ok' // Default to ok if unknown category
    
    const isFresh = daysUntilUse <= categoryInfo.shelfLife
    
    if (isFresh) return 'ok'
    
    return categoryInfo.freezable ? 'freeze' : 'buy_later'
  }
}
