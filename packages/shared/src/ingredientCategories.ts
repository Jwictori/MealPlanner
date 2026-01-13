// Enhanced Ingredient Categorization - Swedish Grocery Store Layout
// Based on ICA/Coop/Willys standard layout

export type IngredientCategory =
  // Färskvaror
  | 'FRUIT'                    // Frukt
  | 'VEGETABLES'               // Grönsaker
  | 'SALAD_LEAFY'             // Sallad & Bladgrönt
  | 'FRESH_HERBS'             // Färska örter

  // Mejeri & Ägg
  | 'DAIRY_MILK'              // Mjölk & Grädde
  | 'DAIRY_YOGURT'            // Yoghurt & Fil
  | 'DAIRY_CHEESE'            // Ost
  | 'DAIRY_BUTTER'            // Smör & Matfett
  | 'EGGS'                    // Ägg

  // Kött & Chark
  | 'MEAT_FRESH'              // Färskt kött
  | 'MEAT_GROUND'             // Köttfärs
  | 'MEAT_POULTRY'            // Kyckling & Fågel
  | 'MEAT_DELI'               // Charkuterier

  // Fisk & Skaldjur
  | 'FISH_FRESH'              // Färsk fisk
  | 'FISH_FROZEN'             // Fryst fisk
  | 'SHELLFISH'               // Skaldjur

  // Bröd & Bakning
  | 'BREAD'                   // Bröd
  | 'BAKING_FLOUR'            // Mjöl
  | 'BAKING_SUGAR'            // Socker
  | 'BAKING_SUPPLIES'         // Bakpulver & Jäst

  // Konserver & Torrvaror
  | 'PASTA_RICE'              // Pasta & Ris
  | 'CANNED'                  // Konserver
  | 'LEGUMES'                 // Baljväxter
  | 'NUTS_SEEDS'              // Nötter & Frön
  | 'DRIED_SPICES'            // Torkade kryddor

  // Kryddor & Såser
  | 'SPICES'                  // Kryddor (mix)
  | 'SAUCES'                  // Såser & Dressing
  | 'OIL_VINEGAR'            // Olja & Vinäger

  // Fryst
  | 'FROZEN_MEAT'             // Fryst kött
  | 'FROZEN_FISH'             // Fryst fisk
  | 'FROZEN_VEGETABLES'       // Frysta grönsaker
  | 'FROZEN_OTHER'            // Övrig frys

  // Övrigt
  | 'OTHER'                   // Övrigt

export interface CategoryInfo {
  key: IngredientCategory
  name_sv: string
  name_en: string
  icon: string
  color: string
  sortOrder: number
  shelfLife: number // days at 4°C
  freezable: boolean
  tips_sv: string
  tips_en: string
}

export const CATEGORY_DATABASE: Record<IngredientCategory, CategoryInfo> = {
  // FRUKT & GRÖNT
  FRUIT: {
    key: 'FRUIT',
    name_sv: 'Frukt',
    name_en: 'Fruit',
    icon: '🍎',
    color: '#DC2626',
    sortOrder: 1,
    shelfLife: 7,
    freezable: true,
    tips_sv: 'Förvara svalt. Vissa frukter mognar efter plockning.',
    tips_en: 'Store cool. Some fruits ripen after picking.'
  },
  
  VEGETABLES: {
    key: 'VEGETABLES',
    name_sv: 'Grönsaker',
    name_en: 'Vegetables',
    icon: '🥕',
    color: '#F97316',
    sortOrder: 2,
    shelfLife: 7,
    freezable: true,
    tips_sv: 'Rotsaker håller längre än bladgrönsaker.',
    tips_en: 'Root vegetables last longer than leafy greens.'
  },
  
  SALAD_LEAFY: {
    key: 'SALAD_LEAFY',
    name_sv: 'Sallad & Bladgrönt',
    name_en: 'Salad & Leafy Greens',
    icon: '🥬',
    color: '#10B981',
    sortOrder: 3,
    shelfLife: 5,
    freezable: false,
    tips_sv: 'Använd snabbt! Håller max 5 dagar.',
    tips_en: 'Use quickly! Lasts max 5 days.'
  },
  
  FRESH_HERBS: {
    key: 'FRESH_HERBS',
    name_sv: 'Färska Örter',
    name_en: 'Fresh Herbs',
    icon: '🌿',
    color: '#059669',
    sortOrder: 4,
    shelfLife: 5,
    freezable: true,
    tips_sv: 'Ställ i vatten som en bukett eller frys in.',
    tips_en: 'Place in water like a bouquet or freeze.'
  },
  
  // MEJERI & ÄGG
  DAIRY_MILK: {
    key: 'DAIRY_MILK',
    name_sv: 'Mjölk & Grädde',
    name_en: 'Milk & Cream',
    icon: '🥛',
    color: '#EAB308',
    sortOrder: 10,
    shelfLife: 7,
    freezable: false,
    tips_sv: 'Håller ofta längre än bäst före-datum om oöppnad.',
    tips_en: 'Often lasts longer than best-before date if unopened.'
  },
  
  DAIRY_YOGURT: {
    key: 'DAIRY_YOGURT',
    name_sv: 'Yoghurt & Fil',
    name_en: 'Yogurt',
    icon: '🥄',
    color: '#FCD34D',
    sortOrder: 11,
    shelfLife: 14,
    freezable: false,
    tips_sv: 'Håller bra även efter bäst före-datum.',
    tips_en: 'Keeps well past best-before date.'
  },
  
  DAIRY_CHEESE: {
    key: 'DAIRY_CHEESE',
    name_sv: 'Ost',
    name_en: 'Cheese',
    icon: '🧀',
    color: '#FBBF24',
    sortOrder: 12,
    shelfLife: 21,
    freezable: true,
    tips_sv: 'Hårdost håller längst. Frys rivna ostar.',
    tips_en: 'Hard cheese lasts longest. Freeze grated cheese.'
  },
  
  DAIRY_BUTTER: {
    key: 'DAIRY_BUTTER',
    name_sv: 'Smör & Matfett',
    name_en: 'Butter & Fat',
    icon: '🧈',
    color: '#FDE047',
    sortOrder: 13,
    shelfLife: 30,
    freezable: true,
    tips_sv: 'Smör går utmärkt att frysa.',
    tips_en: 'Butter freezes excellently.'
  },
  
  EGGS: {
    key: 'EGGS',
    name_sv: 'Ägg',
    name_en: 'Eggs',
    icon: '🥚',
    color: '#FB923C',
    sortOrder: 14,
    shelfLife: 28,
    freezable: false,
    tips_sv: 'Håller 3-4 veckor. Förvara med spetsen nedåt.',
    tips_en: 'Lasts 3-4 weeks. Store pointed end down.'
  },
  
  // KÖTT & CHARK
  MEAT_FRESH: {
    key: 'MEAT_FRESH',
    name_sv: 'Färskt Kött',
    name_en: 'Fresh Meat',
    icon: '🥩',
    color: '#DC2626',
    sortOrder: 20,
    shelfLife: 4,
    freezable: true,
    tips_sv: 'Håller 3-5 dagar. Frys om längre lagring.',
    tips_en: 'Lasts 3-5 days. Freeze for longer storage.'
  },
  
  MEAT_GROUND: {
    key: 'MEAT_GROUND',
    name_sv: 'Köttfärs',
    name_en: 'Ground Meat',
    icon: '🍖',
    color: '#B91C1C',
    sortOrder: 21,
    shelfLife: 2,
    freezable: true,
    tips_sv: 'EXTRA känsligt! Använd inom 1-2 dagar eller frys.',
    tips_en: 'EXTRA sensitive! Use within 1-2 days or freeze.'
  },
  
  MEAT_POULTRY: {
    key: 'MEAT_POULTRY',
    name_sv: 'Kyckling & Fågel',
    name_en: 'Poultry',
    icon: '🍗',
    color: '#EF4444',
    sortOrder: 22,
    shelfLife: 2,
    freezable: true,
    tips_sv: 'Kyckling är känsligt. Använd snabbt!',
    tips_en: 'Chicken is sensitive. Use quickly!'
  },
  
  MEAT_DELI: {
    key: 'MEAT_DELI',
    name_sv: 'Charkuterier',
    name_en: 'Deli Meats',
    icon: '🥓',
    color: '#F87171',
    sortOrder: 23,
    shelfLife: 7,
    freezable: true,
    tips_sv: 'Öppnad förpackning: 3-5 dagar.',
    tips_en: 'Opened package: 3-5 days.'
  },
  
  // FISK & SKALDJUR
  FISH_FRESH: {
    key: 'FISH_FRESH',
    name_sv: 'Färsk Fisk',
    name_en: 'Fresh Fish',
    icon: '🐟',
    color: '#3B82F6',
    sortOrder: 30,
    shelfLife: 2,
    freezable: true,
    tips_sv: 'Håller MAX 1-2 dagar! Frys direkt om ej omedelbar användning.',
    tips_en: 'Lasts MAX 1-2 days! Freeze immediately if not using.'
  },
  
  FISH_FROZEN: {
    key: 'FISH_FROZEN',
    name_sv: 'Fryst Fisk',
    name_en: 'Frozen Fish',
    icon: '🧊🐟',
    color: '#60A5FA',
    sortOrder: 31,
    shelfLife: 1,
    freezable: true,
    tips_sv: 'Tina i kyl och använd inom 24h.',
    tips_en: 'Thaw in fridge and use within 24h.'
  },
  
  SHELLFISH: {
    key: 'SHELLFISH',
    name_sv: 'Skaldjur',
    name_en: 'Shellfish',
    icon: '🦐',
    color: '#2563EB',
    sortOrder: 32,
    shelfLife: 2,
    freezable: true,
    tips_sv: 'Mycket känsligt. Använd snabbt!',
    tips_en: 'Very sensitive. Use quickly!'
  },
  
  // BRÖD & BAKNING
  BREAD: {
    key: 'BREAD',
    name_sv: 'Bröd',
    name_en: 'Bread',
    icon: '🍞',
    color: '#92400E',
    sortOrder: 40,
    shelfLife: 7,
    freezable: true,
    tips_sv: 'Frys gärna bröd - tinar snabbt!',
    tips_en: 'Freeze bread - thaws quickly!'
  },
  
  BAKING_FLOUR: {
    key: 'BAKING_FLOUR',
    name_sv: 'Mjöl',
    name_en: 'Flour',
    icon: '🌾',
    color: '#78350F',
    sortOrder: 41,
    shelfLife: 365,
    freezable: false,
    tips_sv: 'Håller länge i skafferi.',
    tips_en: 'Lasts long in pantry.'
  },

  BAKING_SUGAR: {
    key: 'BAKING_SUGAR',
    name_sv: 'Socker',
    name_en: 'Sugar',
    icon: '🍬',
    color: '#F5F5DC',
    sortOrder: 42,
    shelfLife: 730,
    freezable: false,
    tips_sv: 'Håller praktiskt taget för evigt torrt.',
    tips_en: 'Keeps practically forever if dry.'
  },

  BAKING_SUPPLIES: {
    key: 'BAKING_SUPPLIES',
    name_sv: 'Bakpulver & Jäst',
    name_en: 'Baking Powder & Yeast',
    icon: '🧁',
    color: '#A16207',
    sortOrder: 42,
    shelfLife: 365,
    freezable: false,
    tips_sv: 'Kontrollera bäst före-datum på jäst.',
    tips_en: 'Check best-before date on yeast.'
  },
  
  // KONSERVER & TORRVAROR
  PASTA_RICE: {
    key: 'PASTA_RICE',
    name_sv: 'Pasta & Ris',
    name_en: 'Pasta & Rice',
    icon: '🍝',
    color: '#CA8A04',
    sortOrder: 50,
    shelfLife: 730,
    freezable: false,
    tips_sv: 'Håller mycket länge. Förvara torrt.',
    tips_en: 'Lasts very long. Store dry.'
  },
  
  CANNED: {
    key: 'CANNED',
    name_sv: 'Konserver',
    name_en: 'Canned Goods',
    icon: '🥫',
    color: '#B45309',
    sortOrder: 51,
    shelfLife: 730,
    freezable: false,
    tips_sv: 'Håller 1-2+ år. Kontrollera bäst före.',
    tips_en: 'Lasts 1-2+ years. Check best-before.'
  },
  
  LEGUMES: {
    key: 'LEGUMES',
    name_sv: 'Baljväxter',
    name_en: 'Legumes',
    icon: '🫘',
    color: '#92400E',
    sortOrder: 52,
    shelfLife: 730,
    freezable: false,
    tips_sv: 'Torkade baljväxter håller mycket länge.',
    tips_en: 'Dried legumes last very long.'
  },

  NUTS_SEEDS: {
    key: 'NUTS_SEEDS',
    name_sv: 'Nötter & Frön',
    name_en: 'Nuts & Seeds',
    icon: '🥜',
    color: '#8B4513',
    sortOrder: 53,
    shelfLife: 180,
    freezable: true,
    tips_sv: 'Förvara svalt och mörkt. Fryser bra.',
    tips_en: 'Store cool and dark. Freezes well.'
  },

  DRIED_SPICES: {
    key: 'DRIED_SPICES',
    name_sv: 'Torkade Kryddor',
    name_en: 'Dried Spices',
    icon: '🌶️',
    color: '#991B1B',
    sortOrder: 53,
    shelfLife: 365,
    freezable: false,
    tips_sv: 'Förvara mörkt och torrt.',
    tips_en: 'Store dark and dry.'
  },
  
  // KRYDDOR & SÅSER
  SPICES: {
    key: 'SPICES',
    name_sv: 'Kryddor',
    name_en: 'Spices',
    icon: '🧂',
    color: '#7C2D12',
    sortOrder: 60,
    shelfLife: 365,
    freezable: false,
    tips_sv: 'Kryddor tappar smak över tid.',
    tips_en: 'Spices lose flavor over time.'
  },
  
  SAUCES: {
    key: 'SAUCES',
    name_sv: 'Såser & Dressing',
    name_en: 'Sauces & Dressing',
    icon: '🍶',
    color: '#92400E',
    sortOrder: 61,
    shelfLife: 90,
    freezable: false,
    tips_sv: 'Öppnad: förvara i kyl.',
    tips_en: 'Opened: store in fridge.'
  },
  
  OIL_VINEGAR: {
    key: 'OIL_VINEGAR',
    name_sv: 'Olja & Vinäger',
    name_en: 'Oil & Vinegar',
    icon: '🫗',
    color: '#854D0E',
    sortOrder: 62,
    shelfLife: 365,
    freezable: false,
    tips_sv: 'Olivolja håller ~1 år efter öppning.',
    tips_en: 'Olive oil lasts ~1 year after opening.'
  },
  
  // FRYST
  FROZEN_MEAT: {
    key: 'FROZEN_MEAT',
    name_sv: 'Fryst Kött',
    name_en: 'Frozen Meat',
    icon: '❄️🥩',
    color: '#0EA5E9',
    sortOrder: 70,
    shelfLife: 1,
    freezable: true,
    tips_sv: 'Tina i kyl. Använd inom 24h efter tinad.',
    tips_en: 'Thaw in fridge. Use within 24h after thawed.'
  },
  
  FROZEN_FISH: {
    key: 'FROZEN_FISH',
    name_sv: 'Fryst Fisk',
    name_en: 'Frozen Fish',
    icon: '❄️🐟',
    color: '#14B8A6',
    sortOrder: 71,
    shelfLife: 1,
    freezable: true,
    tips_sv: 'Tina i kyl. Använd inom 24h.',
    tips_en: 'Thaw in fridge. Use within 24h.'
  },
  
  FROZEN_VEGETABLES: {
    key: 'FROZEN_VEGETABLES',
    name_sv: 'Frysta Grönsaker',
    name_en: 'Frozen Vegetables',
    icon: '❄️🥦',
    color: '#10B981',
    sortOrder: 72,
    shelfLife: 1,
    freezable: true,
    tips_sv: 'Kan användas direkt från frysen.',
    tips_en: 'Can be used directly from freezer.'
  },
  
  FROZEN_OTHER: {
    key: 'FROZEN_OTHER',
    name_sv: 'Övrig Frys',
    name_en: 'Other Frozen',
    icon: '❄️',
    color: '#0891B2',
    sortOrder: 73,
    shelfLife: 1,
    freezable: true,
    tips_sv: 'Varierar beroende på produkt.',
    tips_en: 'Varies by product.'
  },

  OTHER: {
    key: 'OTHER',
    name_sv: 'Övrigt',
    name_en: 'Other',
    icon: '📦',
    color: '#9CA3AF',
    sortOrder: 99,
    shelfLife: 30,
    freezable: false,
    tips_sv: 'Kontrollera förpackningen.',
    tips_en: 'Check the package.'
  }
}

// Comprehensive ingredient categorization with Swedish focus
export function categorizeIngredient(ingredientName: string, locale: string = 'sv'): IngredientCategory {
  const name = ingredientName.toLowerCase().trim()
  
  // FÄRSKA ÖRTER (check first - specific)
  const herbs = ['dill', 'persilja', 'timjan', 'rosmarin', 'basilika', 'koriander', 'mynta', 'oregano', 'salvia', 'dragon', 'gräslök', 'citronmeliss']
  if (herbs.some(herb => name.includes(herb))) {
    return 'FRESH_HERBS'
  }
  
  // KÖTTFÄRS (check before general meat)
  if (name.includes('färs') || name.includes('köttfärs') || name.includes('nötfärs') || name.includes('fläskfärs')) {
    return 'MEAT_GROUND'
  }
  
  // KYCKLING & FÅGEL
  if (name.includes('kyckling') || name.includes('kycklingfilé') || name.includes('kycklingbröst') || 
      name.includes('kycklinglekt') || name.includes('fågel') || name.includes('höna') || name.includes('kalkon')) {
    return 'MEAT_POULTRY'
  }
  
  // FÄRSK FISK
  if (name.includes('lax') || name.includes('torsk') || name.includes('sill') || name.includes('abborre') ||
      name.includes('gädda') || name.includes('forell') || name.includes('makrill') || name.includes('tonfisk')) {
    return 'FISH_FRESH'
  }
  
  // SKALDJUR
  if (name.includes('räka') || name.includes('kräfta') || name.includes('hummer') || name.includes('mussla') ||
      name.includes('ostron') || name.includes('skaldjur')) {
    return 'SHELLFISH'
  }
  
  // FÄRSKT KÖTT
  if (name.includes('kött') || name.includes('biff') || name.includes('stek') || name.includes('kotlett') ||
      name.includes('fläsk') || name.includes('oxfilé') || name.includes('lammkött') || name.includes('kalvkött') ||
      name.includes('revbensspjäll') || name.includes('entrecôte')) {
    return 'MEAT_FRESH'
  }
  
  // CHARK
  if (name.includes('skinka') || name.includes('bacon') || name.includes('korv') || name.includes('salami') ||
      name.includes('prosciutto') || name.includes('serrano') || name.includes('påläggrök')) {
    return 'MEAT_DELI'
  }
  
  // SALLAD & BLADGRÖNT
  if (name.includes('sallad') || name.includes('isbergssallad') || name.includes('romansallad') ||
      name.includes('ruccola') || name.includes('spenat') || name.includes('mangold') || name.includes('pak choi')) {
    return 'SALAD_LEAFY'
  }
  
  // GRÖNSAKER
  if (name.includes('tomat') || name.includes('gurka') || name.includes('paprika') || name.includes('lök') ||
      name.includes('vitlök') || name.includes('morot') || name.includes('potatis') || name.includes('broccoli') ||
      name.includes('blomkål') || name.includes('zucchini') || name.includes('aubergine') || name.includes('squash') ||
      name.includes('pumpa') || name.includes('palsternacka') || name.includes('rotselleri') || name.includes('purjolök') ||
      name.includes('majrovor') || name.includes('rödbetor') || name.includes('kålrot') || name.includes('kål') ||
      name.includes('vitkål') || name.includes('rödkål') || name.includes('brysselkål') || name.includes('grönkål')) {
    return 'VEGETABLES'
  }
  
  // FRUKT
  if (name.includes('äpple') || name.includes('banan') || name.includes('apelsin') || name.includes('citron') ||
      name.includes('lime') || name.includes('päron') || name.includes('vindruva') || name.includes('mango') ||
      name.includes('ananas') || name.includes('jordgubb') || name.includes('blåbär') || name.includes('hallon') ||
      name.includes('björnbär') || name.includes('persika') || name.includes('nektarin') || name.includes('plommon') ||
      name.includes('kiwi') || name.includes('melon') || name.includes('vattenmelon')) {
    return 'FRUIT'
  }
  
  // MJÖLK & GRÄDDE
  if (name.includes('mjölk') || name.includes('grädde') || name.includes('vispgrädde') || 
      name.includes('matlagningsgrädde') || name.includes('crème fraiche')) {
    return 'DAIRY_MILK'
  }
  
  // YOGHURT & FIL
  if (name.includes('yoghurt') || name.includes('fil') || name.includes('filmjölk') || name.includes('kesella')) {
    return 'DAIRY_YOGURT'
  }
  
  // OST
  if (name.includes('ost') || name.includes('parmesan') || name.includes('mozzarella') || name.includes('cheddar') ||
      name.includes('feta') || name.includes('gorgonzola') || name.includes('gruyère') || name.includes('brie') ||
      name.includes('camembert') || name.includes('ricotta') || name.includes('mascarpone')) {
    return 'DAIRY_CHEESE'
  }
  
  // SMÖR & MATFETT
  if (name.includes('smör') || name.includes('margarin') || name.includes('matfett')) {
    return 'DAIRY_BUTTER'
  }
  
  // ÄGG
  if (name.includes('ägg')) {
    return 'EGGS'
  }
  
  // BRÖD
  if (name.includes('bröd') || name.includes('frallor') || name.includes('baguette') || name.includes('ciabatta') ||
      name.includes('pita') || name.includes('tortilla') || name.includes('wraps')) {
    return 'BREAD'
  }
  
  // MJÖL & SOCKER
  if (name.includes('mjöl') || name.includes('vetemjöl') || name.includes('rågmjöl') || name.includes('socker') ||
      name.includes('strösocker') || name.includes('farinsocker') || name.includes('florsocker')) {
    return 'BAKING_FLOUR'
  }
  
  // BAKPULVER & JÄST
  if (name.includes('bakpulver') || name.includes('bikarbonat') || name.includes('jäst') || name.includes('torrjäst')) {
    return 'BAKING_SUPPLIES'
  }
  
  // PASTA & RIS
  if (name.includes('pasta') || name.includes('spaghetti') || name.includes('penne') || name.includes('fusilli') ||
      name.includes('makaroner') || name.includes('ris') || name.includes('jasminris') || name.includes('basmatiris') ||
      name.includes('risoni') || name.includes('couscous') || name.includes('bulgur') || name.includes('quinoa')) {
    return 'PASTA_RICE'
  }
  
  // KONSERVER
  if (name.includes('burk') || name.includes('konserv') || name.includes('krossade tomater') || 
      name.includes('tomatpuré') || name.includes('passerade tomater') || name.includes('majskorn') ||
      name.includes('kidneybönor') || name.includes('kikärtor') || name.includes('linser') || name.includes('tonfisk på burk')) {
    return 'CANNED'
  }
  
  // BALJVÄXTER (torkade)
  if (name.includes('böna') || name.includes('lins') || name.includes('ärtor') || name.includes('kikärtor') ||
      name.includes('svarta bönor') || name.includes('vita bönor')) {
    return 'LEGUMES'
  }
  
  // TORKADE KRYDDOR
  if (name.includes('torkad') || name.includes('paprikapulver') || name.includes('cayennepeppar') || 
      name.includes('kanel') || name.includes('kardemumma') || name.includes('spiskummin') || 
      name.includes('curry') || name.includes('ingefära, mald')) {
    return 'DRIED_SPICES'
  }
  
  // KRYDDOR (generellt)
  if (name.includes('krydda') || name.includes('salt') || name.includes('peppar') || name.includes('lagerblad') ||
      name.includes('nejlika') || name.includes('muskot') || name.includes('chilipulver')) {
    return 'SPICES'
  }
  
  // SÅSER & DRESSING
  if (name.includes('sås') || name.includes('soja') || name.includes('sojasås') || name.includes('worcestershire') ||
      name.includes('tabasco') || name.includes('ketchup') || name.includes('senap') || name.includes('majonnäs') ||
      name.includes('dressing') || name.includes('vinägrett')) {
    return 'SAUCES'
  }
  
  // OLJA & VINÄGER
  if (name.includes('olja') || name.includes('olivolja') || name.includes('rapsolja') || name.includes('sesamolja') ||
      name.includes('vinäger') || name.includes('balsamvinäger') || name.includes('äppelcidervinäger')) {
    return 'OIL_VINEGAR'
  }
  
  // FRYST (om specifikt nämnt)
  if (name.includes('fryst') || name.includes('djupfryst')) {
    if (name.includes('kött') || name.includes('biff') || name.includes('fläsk')) return 'FROZEN_MEAT'
    if (name.includes('fisk') || name.includes('lax') || name.includes('torsk')) return 'FROZEN_FISH'
    if (name.includes('grönsakr') || name.includes('ärtor') || name.includes('bönor') || name.includes('broccoli')) return 'FROZEN_VEGETABLES'
    return 'FROZEN_OTHER'
  }
  
  // DEFAULT - check if it's protein-heavy or carb-heavy
  if (name.length < 3) return 'SPICES' // Short names are usually spices
  
  // Default to dry goods for unknown
  return 'PASTA_RICE'
}

// Map Swedish/legacy database categories to English keys
const SWEDISH_TO_ENGLISH_CATEGORY: Record<string, IngredientCategory> = {
  // Swedish categories from database
  'GRÖNSAKER': 'VEGETABLES',
  'FRUKT': 'FRUIT',
  'MEJERI': 'DAIRY_MILK',
  'KÖTT': 'MEAT_FRESH',
  'FÅGEL': 'MEAT_POULTRY',
  'FISK': 'FISH_FRESH',
  'FISH': 'FISH_FRESH',
  'SKALDJUR': 'SHELLFISH',
  'ÖRTER': 'FRESH_HERBS',
  'KRYDDOR': 'SPICES',
  'TORKADE_KRYDDOR': 'DRIED_SPICES',
  'SÅSER': 'SAUCES',
  'OLJA_VINÄGER': 'OIL_VINEGAR',
  'PASTA_RIS': 'PASTA_RICE',
  'BRÖD': 'BREAD',
  'BAKNING': 'BAKING_FLOUR',
  'BAKPULVER_JÄST': 'BAKING_SUPPLIES',
  'KONSERVER': 'CANNED',
  'BALJVÄXTER': 'LEGUMES',
  'ÄGG': 'EGGS',
  'OST': 'DAIRY_CHEESE',
  'SMÖR': 'DAIRY_BUTTER',
  'YOGHURT': 'DAIRY_YOGURT',
  'SALLAD': 'SALAD_LEAFY',
  'CHARK': 'MEAT_DELI',
  'KÖTTFÄRS': 'MEAT_GROUND',
  'FRYST': 'FROZEN_OTHER',
  'FRYST_KÖTT': 'FROZEN_MEAT',
  'FRYST_FISK': 'FROZEN_FISH',
  'FRYSTA_GRÖNSAKER': 'FROZEN_VEGETABLES',
  // Legacy/mixed categories
  'ÖVRIGT': 'OTHER',
  'GRAINS': 'PASTA_RICE',
  'PANTRY': 'PASTA_RICE',
  'SKAFFERI': 'PASTA_RICE',
  'NÖTTER': 'NUTS_SEEDS',
}

// Get category info in current language
export function getCategoryInfo(category: string, locale: string = 'sv'): CategoryInfo | undefined {
  // First try direct lookup (English keys)
  if (category in CATEGORY_DATABASE) {
    return CATEGORY_DATABASE[category as IngredientCategory]
  }

  // Then try Swedish mapping
  const mappedCategory = SWEDISH_TO_ENGLISH_CATEGORY[category.toUpperCase()]
  if (mappedCategory) {
    return CATEGORY_DATABASE[mappedCategory]
  }

  // Return undefined if not found
  return undefined
}

// Get display name for category
export function getCategoryName(category: IngredientCategory, locale: string = 'sv'): string {
  const info = CATEGORY_DATABASE[category]
  if (!info) return category.replace(/_/g, ' ')
  return locale === 'sv' ? info.name_sv : info.name_en
}

// Get all categories sorted by store layout
export function getAllCategoriesSorted(locale: string = 'sv'): CategoryInfo[] {
  return Object.values(CATEGORY_DATABASE).sort((a, b) => a.sortOrder - b.sortOrder)
}
