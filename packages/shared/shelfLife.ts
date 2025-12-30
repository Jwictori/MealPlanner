// Shelf Life Database - Based on Swedish Food Agency (Livsmedelsverket) guidelines
// All times in DAYS at proper fridge temperature (4°C)

export interface ShelfLifeData {
  category: IngredientCategory
  daysInFridge: number
  daysInFreezer: number
  freezable: boolean
  warning: 'high' | 'medium' | 'low'
  icon: string
  color: string
  tips: string
}

export type IngredientCategory =
  | 'FRESH_FISH'
  | 'FRESH_MEAT'
  | 'GROUND_MEAT'
  | 'FRESH_VEGETABLES_SHORT' // Sallad, spenat, etc
  | 'FRESH_VEGETABLES_LONG'  // Lök, potatis, etc
  | 'DAIRY'
  | 'EGGS'
  | 'DRY_GOODS'
  | 'CANNED'
  | 'FROZEN'
  | 'COOKED_FOOD'

export const SHELF_LIFE_DATABASE: Record<IngredientCategory, ShelfLifeData> = {
  FRESH_FISH: {
    category: 'FRESH_FISH',
    daysInFridge: 2, // 1-2 dagar enligt Livsmedelsverket
    daysInFreezer: 180, // 6 månader
    freezable: true,
    warning: 'high',
    icon: '🐟',
    color: '#3B82F6', // blue
    tips: 'Frys in direkt om du inte ska använda inom 2 dagar. Färsk fisk är MYCKET känslig.'
  },
  
  FRESH_MEAT: {
    category: 'FRESH_MEAT',
    daysInFridge: 4, // 3-5 dagar för styckningsdetaljer
    daysInFreezer: 270, // 9 månader (genomsnitt)
    freezable: true,
    warning: 'high',
    icon: '🥩',
    color: '#EF4444', // red
    tips: 'Färskt kött håller 3-5 dagar. Frys in om längre lagring behövs.'
  },
  
  GROUND_MEAT: {
    category: 'GROUND_MEAT',
    daysInFridge: 2, // 1-2 dagar butiksmald, upp till 8 dagar i modifierad atmosfär
    daysInFreezer: 120, // 3-4 månader
    freezable: true,
    warning: 'high',
    icon: '🍖',
    color: '#DC2626', // dark red
    tips: 'Köttfärs är EXTRA känslig! Använd inom 1-2 dagar eller frys omedelbart.'
  },
  
  FRESH_VEGETABLES_SHORT: {
    category: 'FRESH_VEGETABLES_SHORT',
    daysInFridge: 6, // 5-7 dagar för sallad, tomat, gurka
    daysInFreezer: 0, // Inte lämpliga att frysa
    freezable: false,
    warning: 'medium',
    icon: '🥬',
    color: '#10B981', // green
    tips: 'Färska grönsaker som sallad, tomat, gurka håller ~5-7 dagar. Fryser ej väl.'
  },
  
  FRESH_VEGETABLES_LONG: {
    category: 'FRESH_VEGETABLES_LONG',
    daysInFridge: 14, // 2-3 veckor för lök, potatis, morötter
    daysInFreezer: 365, // Vissa går att frysa
    freezable: true,
    warning: 'low',
    icon: '🥔',
    color: '#84CC16', // lime
    tips: 'Lök, potatis, morötter håller 2-3 veckor. Förvara svalt och mörkt.'
  },
  
  DAIRY: {
    category: 'DAIRY',
    daysInFridge: 7, // Mjölk 4+ dagar efter bäst-före, grädde, yoghurt längre
    daysInFreezer: 90, // Vissa mejeriprodukter går att frysa
    freezable: false, // Generellt nej (mjölk skär sig, yoghurt förändras)
    warning: 'medium',
    icon: '🥛',
    color: '#FCD34D', // yellow
    tips: 'Mejerivaror håller oftast längre än bäst-före-datum om oöppnade. Öppnade 3-7 dagar.'
  },
  
  EGGS: {
    category: 'EGGS',
    daysInFridge: 35, // 2-3 månader från värpdag om förvarade rätt
    daysInFreezer: 0, // Råa ägg fryser ej, kokta går
    freezable: false,
    warning: 'low',
    icon: '🥚',
    color: '#F59E0B', // amber
    tips: 'Ägg håller 2-3 månader i kyl. Förvara med spetsen nedåt.'
  },
  
  DRY_GOODS: {
    category: 'DRY_GOODS',
    daysInFridge: 365, // Torrvaror håller 6-12+ månader
    daysInFreezer: 730, // Ännu längre i frys
    freezable: true,
    warning: 'low',
    icon: '📦',
    color: '#78350F', // brown
    tips: 'Pasta, ris, mjöl håller 6-12+ månader. Förvara torrt och svalt.'
  },
  
  CANNED: {
    category: 'CANNED',
    daysInFridge: 730, // Konserver håller 1-2+ år
    daysInFreezer: 0, // Behövs ej frysa
    freezable: false,
    warning: 'low',
    icon: '🥫',
    color: '#92400E', // dark brown
    tips: 'Konserver håller 1-2+ år. Kontrollera bäst-före-datum.'
  },
  
  FROZEN: {
    category: 'FROZEN',
    daysInFridge: 1, // Ska användas direkt efter upptining
    daysInFreezer: 365, // Redan fryst, håller länge
    freezable: true,
    warning: 'low',
    icon: '❄️',
    color: '#06B6D4', // cyan
    tips: 'Redan frysta varor. Tina i kyl och använd inom 24h.'
  },
  
  COOKED_FOOD: {
    category: 'COOKED_FOOD',
    daysInFridge: 4, // Tillagad mat 3-4 dagar
    daysInFreezer: 90, // 2-3 månader
    freezable: true,
    warning: 'medium',
    icon: '🍲',
    color: '#F97316', // orange
    tips: 'Tillagad mat håller 3-4 dagar i kyl. Frys för längre lagring.'
  }
}

// Helper function to categorize ingredients
export function categorizeIngredient(ingredientName: string): IngredientCategory {
  const name = ingredientName.toLowerCase()
  
  // Fish
  if (name.includes('lax') || name.includes('torsk') || name.includes('fisk') || 
      name.includes('räk') || name.includes('skaldjur') || name.includes('hummer')) {
    return 'FRESH_FISH'
  }
  
  // Ground meat
  if (name.includes('köttfärs') || name.includes('färs')) {
    return 'GROUND_MEAT'
  }
  
  // Fresh meat
  if (name.includes('kött') || name.includes('biff') || name.includes('kyckling') ||
      name.includes('fläsk') || name.includes('nöt') || name.includes('lamm') ||
      name.includes('entrecote') || name.includes('fågel')) {
    return 'FRESH_MEAT'
  }
  
  // Fresh vegetables (short shelf life)
  if (name.includes('sallad') || name.includes('spenat') || name.includes('tomat') ||
      name.includes('gurka') || name.includes('paprika') || name.includes('broccoli') ||
      name.includes('blomkål') || name.includes('zucchini') || name.includes('avokado')) {
    return 'FRESH_VEGETABLES_SHORT'
  }
  
  // Fresh vegetables (long shelf life)
  if (name.includes('lök') || name.includes('potatis') || name.includes('morot') ||
      name.includes('kål') || name.includes('rödbeta') || name.includes('palsternacka') ||
      name.includes('rotselleri') || name.includes('pumpa')) {
    return 'FRESH_VEGETABLES_LONG'
  }
  
  // Dairy
  if (name.includes('mjölk') || name.includes('grädde') || name.includes('yoghurt') ||
      name.includes('fil') || name.includes('ost') || name.includes('smör') ||
      name.includes('crème fraiche') || name.includes('kesella')) {
    return 'DAIRY'
  }
  
  // Eggs
  if (name.includes('ägg')) {
    return 'EGGS'
  }
  
  // Canned
  if (name.includes('burk') || name.includes('konserv') || name.includes('krossade tomater')) {
    return 'CANNED'
  }
  
  // Frozen
  if (name.includes('fryst') || name.includes('djupfryst')) {
    return 'FROZEN'
  }
  
  // Dry goods (default for many things)
  if (name.includes('pasta') || name.includes('ris') || name.includes('mjöl') ||
      name.includes('socker') || name.includes('salt') || name.includes('krydda') ||
      name.includes('buljong') || name.includes('olja') || name.includes('vinäger')) {
    return 'DRY_GOODS'
  }
  
  // Default to dry goods for unknown
  return 'DRY_GOODS'
}

// Calculate if ingredient will be fresh when needed
export function willBeFreshWhenNeeded(
  category: IngredientCategory,
  daysUntilUse: number
): {
  isFresh: boolean
  daysOver: number
  recommendation: 'ok' | 'freeze' | 'buy_later'
} {
  const shelfLife = SHELF_LIFE_DATABASE[category]
  const daysOver = daysUntilUse - shelfLife.daysInFridge
  
  if (daysUntilUse <= shelfLife.daysInFridge) {
    return { isFresh: true, daysOver: 0, recommendation: 'ok' }
  }
  
  if (shelfLife.freezable) {
    return { isFresh: false, daysOver, recommendation: 'freeze' }
  }
  
  return { isFresh: false, daysOver, recommendation: 'buy_later' }
}

// Calculate how much of an ingredient should be bought now vs later
export function splitIngredientByFreshness(
  totalAmount: number,
  unit: string,
  useDates: string[] // Dates when this ingredient is used
): {
  buyNow: { amount: number; unit: string; dates: string[] }
  buyLater: { amount: number; unit: string; dates: string[] }
} {
  // Simplified: Split by first 7 days vs rest
  const today = new Date()
  const sevenDaysFromNow = new Date(today)
  sevenDaysFromNow.setDate(today.getDate() + 7)
  
  const nowDates = useDates.filter(date => new Date(date) <= sevenDaysFromNow)
  const laterDates = useDates.filter(date => new Date(date) > sevenDaysFromNow)
  
  const nowAmount = (totalAmount / useDates.length) * nowDates.length
  const laterAmount = (totalAmount / useDates.length) * laterDates.length
  
  return {
    buyNow: { amount: Math.ceil(nowAmount), unit, dates: nowDates },
    buyLater: { amount: Math.ceil(laterAmount), unit, dates: laterDates }
  }
}
