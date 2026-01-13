# 📱 MOBILAPP SNABBSTART

## 📁 INSTALLATION

### 1. Placera filer i monorepo

Extrahera `mobile.zip` så att du får:

```
MealPlanner/
├── packages/
│   ├── shared/          ✅ Finns redan
│   ├── web/             ✅ Finns redan  
│   ├── backend/         ✅ Finns redan (.env här!)
│   └── mobile/          ← NY! Extrahera hit
```

### 2. Installera dependencies

```bash
cd MealPlanner/packages/mobile
npm install
```

### 3. Ingen .env behövs!

Appen läser automatiskt från `../backend/.env`

Kontrollera att den har:
```env
SUPABASE_URL=https://kjmlongsvjtgbznetmka.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

## 📱 STARTA APPEN

```bash
npm start
```

Detta visar en QR kod.

### iPhone:
1. Installera **Expo Go** från App Store
2. Öppna Camera
3. Scanna QR koden
4. Appen öppnas i Expo Go

### Android:
1. Installera **Expo Go** från Play Store  
2. Öppna Expo Go
3. Scanna QR koden
4. Appen öppnas

## ✅ TESTA

1. **Logga in** - Samma credentials som web
2. **Shopping** - Se din aktiva inköpslista
3. **Kryssa av** - Checkbox med haptic feedback
4. **Home** - Översikt

## 🔄 DELAD KOD

✅ Använder `@mealplanner/shared` types  
✅ Läser `backend/.env`  
✅ Samma Supabase backend  
✅ Samma triggers för auto-sync

## 🎯 NÄSTA STEG

Mobilappen är redo att testa! Shopping list-funktionen är fullt fungerande med:
- ✅ Checkbox för varje vara
- ✅ Haptic feedback när du kryssar
- ✅ Auto-sync via database triggers
- ✅ Progress bar

Planning, Recipes och Settings är basic men fungerar.

**Vercel deploy:** Appen pratar direkt med Supabase, ingen web-server behövs!
