# MealPlanner - Backlog & Issuespårning

> **Syfte:** Centraliserad spårning av buggar, funktioner och förbättringar
> **Senast uppdaterad:** 2026-01-14

---

## Statusförklaring

| Status | Betydelse |
|--------|-----------|
| `KRITISK` | Blockerar användning, måste fixas omedelbart |
| `HÖG` | Viktig funktionalitet som inte fungerar |
| `MEDIUM` | Förbättring eller mindre bugg |
| `LÅG` | Nice-to-have, framtida förbättring |
| `KLAR` | Implementerad och testad |
| `PÅGÅR` | Aktivt arbete pågår |

---

## A. Kritiska/Blockerande Problem

### A1. AI-planering kraschar
- **Status:** `KLAR` ✅
- **Plats:** [PlanningView.tsx](packages/web/src/components/views/PlanningView.tsx)
- **Fel:** `duplicate key value violates unique constraint "unique_user_date"`
- **Orsak:** INSERT försökte skapa meal_plan för datum som redan finns
- **Lösning:** Använder nu UPSERT (ON CONFLICT) istället för INSERT
- **Fix:** Uppdaterade `handleGenerateWeek()` och `handleDuplicateMeal()` i PlanningView.tsx

### A2. Snabbplanering fungerar inte
- **Status:** `KLAR` ✅
- **Plats:** [QuickPresets.tsx](packages/web/src/components/QuickPresets.tsx)
- **Fel:** Varken "Fyll tomma dagar" eller "Ersätt ALLA dagar" populerade dagar
- **Orsak:** QuickPresets anropade `onClose()` efter `onGenerate()`, vilket rensade `selectedDateRange` innan PopulateChoiceModal kunde använda det
- **Fix:**
  - Tog bort `onClose()` efter `onGenerate()` i QuickPresets.tsx
  - Parent-komponenten (PlanningView) styr nu stängning via `handleGenerateWeek`
  - Fixade också `isEnough`-check att använda `daysToGenerate` istället för hårdkodad 7

### A3. Inköpslista i planering fungerar inte
- **Status:** `HÖG`
- **Plats:** [PlanningView.tsx](packages/web/src/components/views/PlanningView.tsx)
- **Problem:** Duplicerad kod med ShoppingView
- **Lösning:** Extrahera gemensam hook `useShoppingList()`

### A4. Receptimport - kvantitetsparser
- **Status:** `HÖG`
- **Plats:** Edge Function `recipe-import-ai`
- **Fel:** `1-1,5 msk` parsas som `1 -1,5` (antal 1, namn "-1,5 koncentrerad...")
- **Lösning:** Förbättra regex för att hantera ranges

### A5. Receptimport - specialtecken
- **Status:** `MEDIUM`
- **Fel:** `mâchesallad` → `mâ chesallad` (mellanslag i ordet)
- **Lösning:** Normalisera Unicode-tecken korrekt

---

## B. Dataintegritetsproblem

### B1. Ingredienser sparas för tidigt
- **Status:** `HÖG`
- **Plats:** [RecipeModal.tsx](packages/web/src/components/RecipeModal.tsx)
- **Problem:** "vaniljs" skapas som ingrediens innan recept sparas
- **Lösning:**
  - Håll ingredienser i lokalt React-state
  - Spara endast vid recept-save
  - Batch-skapa i transaktion

### B2. Kategori-inkonsistens i UI
- **Status:** `MEDIUM`
- **Plats:** Ingredienssökning överallt
- **Problem:** Blandat svenska/engelska (BAKING_SUGAR vs Övrigt vs Kryddor)
- **Lösning:** Alltid visa `name_sv` från `CATEGORY_DATABASE`

### B3. API-förslag fungerar inte
- **Status:** `MEDIUM`
- **Plats:** [RecipeModal.tsx](packages/web/src/components/RecipeModal.tsx)
- **Problem:** Open Food Facts-sökning sker inte för okända ingredienser
- **Förväntat:** Hämta förslag via `ingredient-lookup` Edge Function

---

## C. Importkvalitetsproblem

### C1. Ingrediensgrupper blir ingredienser
- **Status:** `HÖG`
- **Exempel:** "Garnering" och "Tillbehör" blir ingredienser istället för grupper
- **Källa:** Provencalsk kycklinggryta från koket.se
- **Lösning:** Förbättra Gemini-prompt med strukturerad JSON-output

### C2. Instruktionssektioner saknas
- **Status:** `MEDIUM`
- **Problem:** Skapas inte även när de finns i källan
- **Lösning:** Explicit be Gemini extrahera sektioner i prompten

### C3. AI saknar receptkategorier
- **Status:** `MEDIUM`
- **Problem:** Ingen kategorisering för snabbplanering (QUICK, BUDGET, etc.)
- **Lösning:** Lägg till kategori-enum i Gemini-schemat

---

## D. UX/UI-förbättringar

### D1. Ingrediens-UI kräver scrollning
- **Status:** `MEDIUM`
- **Plats:** [RecipeModal.tsx](packages/web/src/components/RecipeModal.tsx)
- **Problem:** Måste scrolla upp/ner för varje ingrediens
- **Lösning:** Inline-redigering med kompakt layout

### D2. Ingen drag-and-drop
- **Status:** `LÅG`
- **Problem:** Kan inte flytta ingredienser/instruktioner
- **Lösning:** Implementera @dnd-kit

### D3. Kan inte lägga till instruktionssektioner
- **Status:** `MEDIUM`
- **Problem:** Saknar funktionalitet helt i manuellt läge
- **Lösning:** Lägg till "Ny sektion"-knapp

### D4. Månadsvy plottrigt
- **Status:** `LÅG`
- **Problem:** Olika storlekar, kräver scrollning för att se hela månaden
- **Lösning:** Kompaktare design, bättre grid-layout

### D5. Snabbplanering saknar visuell feedback
- **Status:** `MEDIUM`
- **Problem:** Ingen bekräftelse när man väljer "Denna vecka"/"Nästa vecka"
- **Lösning:** Aktiv-state på knappar

### D6. Datumspann förpopuleras inte
- **Status:** `LÅG`
- **Problem:** Borde hämta från aktuell vecka i veckovyn
- **Lösning:** Skicka med currentWeek som prop

### D7. Fel räkning av planerade dagar
- **Status:** `MEDIUM`
- **Problem:** Visar "0 dagar planerade" när 1 är planerad
- **Lösning:** Debugga räknelogiken i QuickPresets

---

## E. Feedback & Admin

### E1. Feedback endast efter sparning
- **Status:** `LÅG`
- **Problem:** Kan inte ge feedback på ej sparade recept
- **Lösning:** Spara import-JSON separat för admin-granskning

### E2. Fritextfält saknas för feedback
- **Status:** `LÅG`
- **Problem:** Negativ feedback behöver förklaring
- **Lösning:** Visa textarea vid negativ rating

### E3. Ej sparade recept försvinner
- **Status:** `LÅG`
- **Problem:** Import som inte sparas kan inte granskas
- **Lösning:** JSON-lagring i `import_attempts`-tabell

---

## F. Systemförbättringar (NYA)

### F1. Debug-läge via Admin
- **Status:** `KLAR` ✅
- **Beskrivning:** Kontrollera debug-funktioner via Admin-meny
- **Inkluderar:**
  - Console.log on/off
  - mockAIResponse on/off
  - Visa/dölj debug-info i UI
  - Performance-logging
- **Implementation:**
  - ✅ React Context `DebugContext` - [packages/web/src/contexts/DebugContext.tsx](packages/web/src/contexts/DebugContext.tsx)
  - ✅ Lagrar i localStorage
  - ✅ Admin UI toggle-panel i [AdminView.tsx](packages/web/src/components/views/AdminView.tsx)

### F2. Användarroller (RBAC)
- **Status:** `KLAR` ✅
- **Beskrivning:** Roll-baserad åtkomstkontroll
- **Roller:**
  - `guest` - Ej inloggad, begränsad åtkomst
  - `user` - Standardanvändare (gratis)
  - `premium` - Betalande användare
  - `admin` - Full åtkomst + debug-funktioner
- **Implementation:**
  - ✅ Kolumn `role` i `users`-tabell (migration: add_user_roles_and_profile)
  - ✅ DB-funktioner: `get_user_role()`, `is_admin()`, `is_premium_or_admin()`
  - ✅ Trigger `handle_new_user()` skapar profil automatiskt
  - ✅ React Context `useAuth()` - [packages/web/src/contexts/AuthContext.tsx](packages/web/src/contexts/AuthContext.tsx)
  - ✅ HOCs: `withAdminAccess`, `withPremiumAccess`

### F3. Nutrition UI
- **Status:** `LÅG`
- **Beskrivning:** Visa näringsvärden i recept och inköpslista
- **Data finns:** Via Open Food Facts i `canonical_ingredients`

### F4. Mobilapp konfiguration
- **Status:** `LÅG`
- **Problem:** Saknar .env med Supabase-credentials
- **Plats:** packages/mobile/

### F5. OAuth/Social Login
- **Status:** `MEDIUM`
- **Beskrivning:** Flera inloggningsmetoder för enklare registrering
- **Providers att implementera:**
  - Google OAuth (prioritet 1 - mest populär)
  - Apple Sign-In (prioritet 2 - krävs för iOS)
  - Facebook OAuth (prioritet 3)
- **Implementation:**
  - Aktivera providers i Supabase Dashboard
  - Skapa snyggt registrerings-UI med alla alternativ
  - Trigger `handle_new_user()` skapar profil automatiskt
  - Extrahera metadata (namn, avatar) från OAuth-provider
- **Beroenden:** F2 (Användarroller) måste vara klart först

### F6. Onboarding-wizard
- **Status:** `LÅG`
- **Beskrivning:** Guidad setup för nya användare
- **Steg:**
  1. Välkommen + hushållsstorlek
  2. Allergier/preferenser
  3. Matbudget
  4. Klar → Dashboard
- **Spåras i:** `profiles.onboarding_completed`, `profiles.onboarding_step`

### F7. "Tvinga AI"-knapp
- **Status:** `LÅG`
- **Fråga:** Fungerar den? Behövs den?
- **Plats:** RecipeModal.tsx
- **Åtgärd:** Verifiera eller ta bort

---

## G. Teknisk Skuld

### G1. Frontend-logik bör flyttas till backend
- **Status:** `LÅG`
- **Exempel:**
  - Ingrediensaggregering
  - Fräschhetsberäkningar
  - Kategori-normalisering

### G2. Duplicerad kod
- **Status:** `MEDIUM`
- **Platser:**
  - Inköpslista i PlanningView vs ShoppingView
  - Ingredienssökning i RecipeModal vs RecipeImportModal

---

## Prioriterad Arbetsordning

### Sprint 1: Kritiska Fixar
1. [x] A1: AI-planering UPSERT-fix ✅
2. [x] A2: Snabbplanering debugging ✅
3. [x] F2: Användarroller (grund) ✅
4. [x] F1: Debug-läge via Admin ✅
5. [ ] A3: Extrahera gemensam inköpslista-hook

### Sprint 2: Importkvalitet
5. [ ] A4+A5: Kvantitets- och specialteckenparser
6. [ ] C1+C2: Förbättra Gemini-prompt
7. [ ] C3: Receptkategorier i import

### Sprint 3: Dataintegritet
8. [ ] B1: Ingredienser sparas lokalt först
9. [ ] B2: Kategori-normalisering i UI
10. [ ] B3: API-förslag via Open Food Facts

### Sprint 4: Debug & Admin
11. [ ] F1: Debug-läge via Admin
12. [ ] E1-E3: Feedback-system

### Sprint 5: UX-förbättringar
13. [ ] D1-D3: Ny ingrediens/instruktions-UI
14. [ ] D5-D7: Snabbplanering UX
15. [ ] D4: Månadsvy redesign

### Framtida
16. [ ] F3: Nutrition UI
17. [ ] F4: Mobilapp
18. [ ] G1-G2: Teknisk skuld

---

## Ändringslogg

| Datum | Ändring |
|-------|---------|
| 2026-01-14 | Skapade BACKLOG.md med alla kända problem och funktioner |
| 2026-01-14 | La till F1 (Debug-läge) och F2 (Användarroller) |
| 2026-01-14 | La till F5 (OAuth/Social Login) och F6 (Onboarding-wizard) |
| 2026-01-14 | ✅ **KLAR:** F2 (Användarroller) - DB migration, AuthContext, HOCs |
| 2026-01-14 | ✅ **KLAR:** F1 (Debug-läge) - DebugContext, Admin toggle-panel |
| 2026-01-14 | ✅ **KLAR:** A1 (AI-planering) - UPSERT fix i PlanningView.tsx |
| 2026-01-14 | ✅ **KLAR:** A2 (Snabbplanering) - Fix onClose-timing i QuickPresets.tsx |

