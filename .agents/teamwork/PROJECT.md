# Project: Voyager's Cosmic Hydration

## Architecture
- **Framework**: React 18 / 19 + TypeScript + Vite.
- **Styling**: Tailwind CSS with custom Card-UI tokens: 2px solid `#1E293B` borders, `shadow-[0_4px_0_#1E293B]`, rounded cards (`rounded-2xl`, `rounded-3xl`), and cosmic color palette (`cosmic-sky`, `cosmic-blue`, `cosmic-gold`, `cosmic-void`).
- **Icons & Effects**: `lucide-react`, `canvas-confetti`.
- **Audio**: Web Audio API procedural synthesis engine generating 3 cosmic tones ("Gợn nhẹ", "Violin Tinh cầu", "Chuông bong bóng") without external audio file dependencies.
- **Storage**: Dual-layer architecture: synchronous `localStorage` for instant React hydration + asynchronous `@capacitor/preferences` for native persistent storage.
- **Weather & Geolocation**: Open-Meteo Weather API (`temperature_2m`, `relative_humidity_2m`, `weather_code`) combined with `@capacitor/geolocation` and automatic GPS fallback (Hanoi: `21.0285, 105.8542`, Vinh: `18.6734, 105.6813`).
- **Mobile Container**: Capacitor Android (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/local-notifications`, `@capacitor/geolocation`, `@capacitor/preferences`, `@capacitor/filesystem`).
- **CI/CD**: GitHub Actions workflow (`.github/workflows/build-apk.yml`) with Node 20, Java 21, Vite build, Capacitor sync, and `./gradlew assembleDebug`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Project Scaffolding & Dependencies | Vite + React + TypeScript + Tailwind CSS, lucide-react, canvas-confetti, Capacitor packages | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Hydration Engine Formula | $W_{total} = W_{base} + W_{activity} + W_{weather}$, rounding to 50ml/0.1L | M1 | ORIGINAL_REQUEST §R2 |
| 3 | Weather API & Geolocation | Open-Meteo API integration with GPS coordinates and fallback to Hanoi/Vinh | M1 | ORIGINAL_REQUEST §R2 |
| 4 | Hydration Unit Test Suite | Comprehensive unit tests for hydration calculations and edge cases (`npm test`) | M1 | ORIGINAL_REQUEST §Verification |
| 5 | Web Audio Synthesis Engine | 3 procedural soundscapes ("Gợn nhẹ", "Violin Tinh cầu", "Chuông bong bóng") | M2 | ORIGINAL_REQUEST §R4 |
| 6 | Dual-Layer Persistence Engine | Synchronization between `localStorage` and `@capacitor/preferences` | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Local Notification Scheduler | @capacitor/local-notifications, 3 modes, quiet hours (01:00-07:00) | M2 | ORIGINAL_REQUEST §R4 |
| 8 | Voyager Chibi Character Component | 5 expression states (idle, happy, sleeping, gentle, strict), sailor hat, star cape, violin, custom upload | M2 | ORIGINAL_REQUEST §R3 |
| 9 | Fixed Bottom Navigation Bar | 5-tab navigation (Today, Reminder, Journal, Stats, Profile), 100% free / 0% paywall | M3 | ORIGINAL_REQUEST §R4 |
| 10 | TodayTab Screen | Streak 🔥, weather widget, current/goal, cup deficit prompt, galaxy wave tank with star float, Chibi Voyager bobbing, quick log buttons (+50, +150, +250 checked, +500ml), custom modal, confetti | M3 | ORIGINAL_REQUEST §R4 |
| 11 | ReminderTab Screen | Next reminder countdown with Voyager holding cosmic bell, toggle, 3 modes, schedule (07:00 / 01:00), sound preview | M3 | ORIGINAL_REQUEST §R4 |
| 12 | JournalTab Screen | Monthly calendar grid, cup fill levels, gold checkmarks, smiling flame streak card | M3 | ORIGINAL_REQUEST §R4 |
| 13 | StatsTab Screen | Week/Month/Custom tabs, daily bar chart with dashed target line and mini Voyager sitting on water column, completion stats | M3 | ORIGINAL_REQUEST §R4 |
| 14 | ProfileTab Screen | Avatar, username edit, custom image upload, body stats & weather auto-adjust toggle, 6 companions, 4 space themes, unit setting, JSON/CSV export | M3 | ORIGINAL_REQUEST §R4 |
| 15 | Capacitor Android Configuration | `capacitor.config.ts` (appId: `com.manh.voyagerhydration`, appName: `Voyager Hydration`, webDir: `dist`), `npx cap sync android` | M4 | ORIGINAL_REQUEST §R5 |
| 16 | Android Permissions | `POST_NOTIFICATIONS`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` in AndroidManifest.xml | M4 | ORIGINAL_REQUEST §R5 |
| 17 | GitHub Actions CI APK Build | `.github/workflows/build-apk.yml` with Node 20, Java 21, Vite build, Capacitor sync, `./gradlew assembleDebug`, upload artifact | M4 | ORIGINAL_REQUEST §R5 |
| 18 | E2E Test Suite (Tiers 1-4) | Comprehensive opaque-box test suite for all features | E2E-Track | Dual Track |
| 19 | Final Verification & Coverage Hardening | Pass 100% E2E tests (Tiers 1-4) and Adversarial Coverage Hardening (Tier 5) | M5 | Dual Track |
| 20 | Gemini AI Character Illustrations | `voyager_drinking.png` and `voyager_sleeping.png` 1000x1000 transparent RGBA assets | M6 | ORIGINAL_REQUEST §Follow-up R1 |
| 21 | Cosmic Water Planet Component | `CosmicWaterPlanet.tsx` with 0% barren, 1-99% dual-wave ocean, 100% glowing super-habitable world | M6 | ORIGINAL_REQUEST §Follow-up R2 |
| 22 | Ephemeral Drinking State & Veil-Free Bedtime | 2.5s drinking animation on water log, dark veil removed from `SleepingOverlay`, partitioned mood hierarchy | M6 | ORIGINAL_REQUEST §Follow-up R1, R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Independent opaque-box test suite (Tiers 1-4) published as `TEST_READY.md` | none | DONE |
| M1 | Scaffolding & Core Hydration Engine | Project setup, dependencies, `hydrationEngine.ts`, Open-Meteo weather integration, unit test suite (`npm test`) | none | DONE |
| M2 | Audio, Persistence & Voyager Chibi | Web Audio synthesizer, dual-layer storage, notification scheduler, `VoyagerChibi.tsx` with 5 states and custom upload | M1 | DONE |
| M3 | 5 Main Tabs & Card-UI System | Navigation bar, TodayTab (wave tank, quick log, confetti), ReminderTab, JournalTab, StatsTab, ProfileTab | M1, M2 | DONE |
| M4 | Capacitor Android & GitHub Actions CI | `capacitor.config.ts`, `android/` setup, permissions in AndroidManifest.xml, `.github/workflows/build-apk.yml` | M1, M2, M3 | DONE |
| M5 | Final Milestone: 100% E2E Pass & Hardening | Phase 1: Pass 100% E2E tests (Tiers 1-4); Phase 2: Adversarial coverage hardening (Tier 5) | M1, M2, M3, M4, E2E | DONE |
| M6 | Cosmic Water Planet & Enhanced Voyager Visuals | Gemini character assets, veil-free bedtime, CosmicWaterPlanet 0-100% fill, drinking interaction | M1, M2, M3, M4, M5 | DONE |

## Interface Contracts

### HydrationEngine ↔ UI / State
```typescript
export interface UserProfile {
  name: string;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: 'sedentary' | 'moderate' | 'high';
  wakeTime: string; // '07:00'
  bedTime: string;  // '01:00'
  autoWeatherAdjust: boolean;
  selectedCompanion: string;
  selectedTheme: string;
  unit: 'ml' | 'L';
  soundEnabled: boolean;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  weatherCode: number;
  bonusMl: number;
  locationName: string;
  isFallback: boolean;
}

export function calculateDailyWaterGoal(
  weightKg: number,
  activityLevel: 'sedentary' | 'moderate' | 'high',
  weatherBonusMl: number
): number;

export function fetchWeatherData(lat?: number, lon?: number): Promise<WeatherData>;
```

### AudioEngine
```typescript
export type SoundType = 'ripple' | 'violin' | 'bubble';
export function playCosmicSound(type: SoundType): void;
```

### StorageEngine
```typescript
export function saveAppState<T>(key: string, data: T): Promise<void>;
export function loadAppState<T>(key: string, fallback: T): Promise<T>;
export function exportDataAsJson(): string;
export function exportDataAsCsv(): string;
```

## Code Layout
```
d:/uống nước/
├── .github/
│   └── workflows/
│       └── build-apk.yml
├── android/                   # Generated by Capacitor
│   └── app/
│       └── src/main/AndroidManifest.xml
├── public/
│   └── assets/                # Voyager character images and icons
├── src/
│   ├── components/
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── NavigationBar.tsx
│   │   ├── VoyagerChibi.tsx
│   │   └── WaveTank.tsx
│   ├── tabs/
│   │   ├── TodayTab.tsx
│   │   ├── ReminderTab.tsx
│   │   ├── JournalTab.tsx
│   │   ├── StatsTab.tsx
│   │   └── ProfileTab.tsx
│   ├── utils/
│   │   ├── audioEngine.ts
│   │   ├── hydrationEngine.ts
│   │   ├── notificationEngine.ts
│   │   └── storageEngine.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── tests/
│   ├── e2e/                   # E2E test suite (Tiers 1-4)
│   └── unit/
│       └── hydrationEngine.test.ts
├── capacitor.config.ts
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```
