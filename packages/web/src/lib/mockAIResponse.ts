// Mock AI response for development - no API calls needed
export const MOCK_AI_RESPONSE = {
  "meal_plan": [
    {
      "day": 1,
      "recipe_name": "Kycklingwok",
      "reason": "En snabb (passar väl inom 30 min tidsramen), näringsrik och barnvänlig rätt med kyckling som proteinkälla. Den innehåller mycket grönsaker och kan enkelt anpassas med ris eller nudlar för en balanserad måltid. Receptet behöver dubbleras för att räcka till 6 personer (2 vuxna, 4 barn)."
    },
    {
      "day": 2,
      "recipe_name": "Köttfärssås",
      "reason": "En klassiker som är enkel att laga och omtyckt av barnen. Köttfärssåsen är proteinrik och kan effektivt lagas inom 30 minuter. Den kan enkelt kompletteras med extra grönsaker (t.ex. rivna morötter, zucchini) i såsen samt en fräsch sallad vid sidan om för ökat näringsinnehåll. Receptet behöver dubbleras för att räcka till 6 personer."
    },
    {
      "day": 3,
      "recipe_name": "Lax med dillsås",
      "reason": "Ger en viktig variation med fisk som proteinkälla, rik på omega-3. Rätten är relativt snabblagad (fisk kokar snabbt, såsen är enkel att vispa ihop) och dillsåsen gör den smakrik. Serveras med potatis och en enkel grönsallad för en balanserad måltid. Receptet behöver dubbleras för att räcka till 6 personer."
    },
    {
      "day": 4,
      "recipe_name": "Pasta Carbonara",
      "reason": "En snabb och populär italiensk rätt som är omtyckt av de flesta. Protein från bacon och ägg samt kolhydrater från pasta. Rätten är snabblagad och passar väl in i 30-minuters tidsramen. För att balansera näringen rekommenderas att servera med en stor, fräsch grönsallad. Receptet behöver dubbleras för att räcka till 6 personer."
    },
    {
      "day": 5,
      "recipe_name": "Tacos",
      "reason": "En perfekt fredagsrätt som är både snabb (kan förberedas inom 30 minuter), barnvänlig och interaktiv. Tacos erbjuder stor variation med många tillbehör som färska grönsaker (sallad, tomat, gurka, majs), vilket gör den näringsrik och rolig att äta för hela familjen. Enkelt att anpassa efter allas smak. Receptet behöver dubbleras för att räcka till 6 personer."
    },
    {
      "day": 6,
      "recipe_name": "Lasagne",
      "reason": "En mättande och klassisk rätt som passar utmärkt för helgen då det finns mer tid för matlagning (ej inom 30 minuter). Receptet är redan anpassat för 6 personer (2 vuxna, 4 barn) och erbjuder en robust måltid med köttfärs, pasta och ost. Serveras med en stor grönsallad för att balansera rätten."
    },
    {
      "day": 7,
      "recipe_name": "Fiskgratäng",
      "reason": "En enkel och smakrik fiskrätt som kompletterar veckans fiskintag. Gratängen är lätt att förbereda (aktiv tid under 30 minuter) och sköter sig sedan själv i ugnen, vilket gör den lämplig för en lugnare helgdag. Protein från torsk och räkor, samt potatis och en krämig sås. Servera med kokta grönsaker som broccoli eller gröna ärtor. Receptet behöver dubbleras för att räcka till 6 personer."
    }
  ],
  "overall_reasoning": "Matplanen är noggrant utformad för att erbjuda en balanserad och varierad kost över veckan för ett hushåll med 2 vuxna och 4 barn. Hänsyn har tagits till en medelstor budget och den strikta tidsbegränsningen på 30 minuter för vardagsmiddagar. Fokus har legat på att inkludera barnvänliga rätter som är lätta att anpassa, samtidigt som protein- och kolhydratkällor varieras för optimal näring.",
  "nutritional_balance": "Veckans matplan erbjuder en god näringsbalans med en mångsidig variation av proteinkällor, inklusive kyckling, fisk (två gånger), nötfärs och fläsk/ägg. Kolhydrater kommer från varierande källor som pasta, ris/nudlar, potatis och tacoskal. En stark betoning läggs på att komplettera rätterna med rikligt med grönsaker.",
  "tips": [
    "Dubblera recept som är angivna för 4 portioner för att säkerställa att det räcker till 6 personer (2 vuxna, 4 barn) och eventuella lunchlådor.",
    "Förbered grönsaker (hacka, skölj) under helgen eller kvällen innan för att spara värdefull tid på vardagar och underlätta 30-minutersmålet.",
    "Komplettera alltid måltiderna med en stor, fräsch sallad eller kokta/ångade grönsaker för att öka näringsintaget och fiberhalten.",
    "Använd fullkornsprodukter (pasta, ris) när det är möjligt för att ytterligare öka fiberintaget och ge mer långvarig mättnad.",
    "Planera in eventuella rester från middagarna till lunch dagen efter för att minimera matsvinn och spara tid för lunchberedning."
  ]
}

// Toggle for development
export const USE_MOCK_AI = true // Set to false to use real AI
