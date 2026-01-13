# 📱 Matplaneraren Mobile

React Native app för iOS & Android.

## 🚀 Installation

```bash
# Från MealPlanner root
cd packages/mobile
npm install
```

## ⚙️ Konfiguration

**INGEN separat .env behövs!** Appen läser från `packages/backend/.env`

Kontrollera att `backend/.env` har:
```
SUPABASE_URL=https://kjmlongsvjtgbznetmka.supabase.co
SUPABASE_ANON_KEY=your-key-here
```

## 📱 Starta

```bash
npm start
```

### På Telefon:
1. Installera **Expo Go** (App Store / Play Store)
2. Scanna QR koden

### Emulator:
- Tryck `a` för Android
- Tryck `i` för iOS

## ✨ Features

- ✅ Login (samma som web)
- ✅ Shopping Lists med checkboxes
- ✅ Meal Planning med AI
- ✅ Recipe browsing  
- ✅ Auto-sync via triggers
- ✅ Haptic feedback

## 📁 Struktur

```
mobile/
├── app/
│   ├── (auth)/login.tsx       # Login
│   ├── (tabs)/                # Main app
│   │   ├── _layout.tsx        # Bottom tabs
│   │   ├── index.tsx          # Home
│   │   ├── shopping.tsx       # Shopping list
│   │   ├── planning.tsx       # Meal planning
│   │   ├── recipes.tsx        # Recipe list
│   │   └── settings.tsx       # Settings
│   └── _layout.tsx            # Root + auth check
├── lib/supabase.ts            # Uses backend/.env
└── store/useStore.ts          # Uses @mealplanner/shared types
```

## 🔄 Delad Kod

Mobilappen delar:
- ✅ `@mealplanner/shared` types
- ✅ `.env` från backend
- ✅ Supabase backend
- ✅ Database triggers

## 🐛 Troubleshooting

**"Missing Supabase credentials"**
→ Kolla `backend/.env`

**"Cannot connect"**
→ Telefon & dator på samma WiFi

**Screen imports missing**
→ Kör `npm install` igen

