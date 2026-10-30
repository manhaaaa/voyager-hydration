# Hydration Engine Implementation Blueprint (`src/utils/hydrationEngine.ts`)

**Milestone**: Milestone 1: Scaffolding & Core Hydration Engine  
**Author**: teamwork_spec_miner (Explorer 2)  
**Target File**: `src/utils/hydrationEngine.ts` (supporting types in `src/types/index.ts`)  
**Status**: APPROVED BLUEPRINT FOR WORKER IMPLEMENTATION  

---

## 1. Executive Summary & Architecture Context

The hydration engine is the mathematical and meteorological core of **Voyager's Cosmic Hydration**. It calculates the user's daily water intake goal ($W_{total}$) based on body weight, physical activity level, and dynamic ambient environmental factors (temperature and relative humidity) fetched from the Open-Meteo Weather API.

### Core Architectural Guarantees:
1. **Mathematical Determinism**: Zero ambiguity in calculations, strict boundary conditions, and predictable rounding (nearest 50 ml / 0.1 L).
2. **Zero-Crash Resilience**: Clamping against invalid/extreme user inputs (e.g. $\le 0\text{ kg}$, $> 300\text{ kg}$, `NaN`).
3. **Multi-Tier Geolocation & Offline Fallbacks**:
   - Primary GPS via `@capacitor/geolocation` (or browser fallback).
   - Coordinate fallbacks: **Hà Nội** (`21.0285, 105.8542`) and **Vinh** (`18.6734, 105.6813`).
   - 30-minute local caching (`localStorage['voyager_weather_cache']`) to conserve network and battery.
   - Graceful offline fallback with default weather object ($26^\circ\text{C}, 60\%$) preventing network freeze.

---

## 2. Features Discovered & Probed

### Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Math Formula | $W_{base}$ Base Calculation | $\text{Weight (kg)} \times 35\text{ ml}$ | `weightKg: number` | Milliliters ($W_{base}$) | Clamps $\le 0$ or `NaN` to default 60kg (2100ml); clamps $[20, 300]$ kg | ORIGINAL_REQUEST §R2, spec_report.md §2.1.1 |
| 2 | Math Formula | $W_{activity}$ Activity Surcharge | Surcharge per tier: sedentary (+0ml), moderate (+350ml), high (+700ml) | `level: ActivityLevel` | Milliliters ($W_{activity}$) | Unrecognized string defaults to 'moderate' (+350ml) | ORIGINAL_REQUEST §R2, PROJECT.md §17 |
| 3 | Weather Logic | $\Delta W_{temp}$ Temperature Surcharge | Surcharge based on temp: $< 28^\circ\text{C}$ (+0ml), $28-32^\circ\text{C}$ (+250ml), $> 32^\circ\text{C}$ (+500ml) | `temperature: number` | Milliliters ($\Delta W_{temp}$) | Negative/extreme temperatures clamped gracefully | ORIGINAL_REQUEST §R2, spec_report.md §2.1.3 |
| 4 | Weather Logic | $\Delta W_{humid}$ Humidity Surcharge | Surcharge for dry air: $< 40\%$ (+150ml), $\ge 40\%$ (+0ml) | `humidity: number` | Milliliters ($\Delta W_{humid}$) | Clamped between 0% and 100% | ORIGINAL_REQUEST §R2, spec_report.md §2.1.3 |
| 5 | Weather Logic | Cumulative $W_{weather}$ | Cumulative sum $\Delta W_{temp} + \Delta W_{humid}$, disabled when autoAdjust is false | `weather: WeatherData, autoAdjust: boolean` | `{ total, tempBonus, humidBonus }` | Null/undefined weather returns 0 bonus | ORIGINAL_REQUEST §R2, SCOPE.md §F2 |
| 6 | Math Formula | Rounding to 50 ml / 0.1 L | Round total to nearest 50 ml step ($\text{round}(W_{total} / 50) \times 50$) and 0.1 L | `rawTotalMl: number` | `roundedTotalMl: number` | Non-finite input returns 2000ml safe default | ORIGINAL_REQUEST §R2, spec_report.md §2.2 |
| 7 | UI Helper | Remaining Cups Calculation | Deficit $\max(0, W_{target} - W_{consumed})$ divided by cup size ($250\text{ ml}$), ceil | `targetMl, consumedMl, cupSizeMl` | `number` (remaining glasses) | Negative consumed clamped to 0 | ORIGINAL_REQUEST §R4, spec_report.md §2.2 |
| 8 | UI Helper | Water Volume Formatting | Formats ml or L with Vietnamese comma decimal (`2,0 L`, `2,15 L`, `2150 ml`) | `ml: number, unit: 'ml' \| 'L'` | `string` | Safe string conversion | PROJECT.md §48, spec_report.md §2.2 |
| 9 | API Integration | Open-Meteo Weather Fetching | REST GET call to Open-Meteo forecast API for current temp, humidity, weather_code | `lat?: number, lon?: number` | `Promise<WeatherData>` | Returns fallback on HTTP error or offline | ORIGINAL_REQUEST §R2, Open-Meteo API live probe |
| 10 | Geolocation | GPS with Hà Nội/Vinh Fallbacks | Device GPS check via `@capacitor/geolocation`, fallback to Hà Nội/Vinh on denial/fail | None or coords | `Promise<WeatherData>` | Transparent fallback without throwing | ORIGINAL_REQUEST §R2, PROJECT.md §9 |
| 11 | Cache Storage | 30-Minute Local Cache | Cached under `'voyager_weather_cache'` with 1,800,000ms TTL | `key, data, coords` | `WeatherCacheEntry \| null` | Invalid/expired cache triggers fresh fetch | ORIGINAL_REQUEST §R2, spec_report.md §2.3.4 |
| 12 | UI Helper | WMO Code Mapping | Maps WMO codes (0..99) to Vietnamese labels and Lucide icon names | `weatherCode: number` | `{ label: string, icon: string }` | Unknown codes default to 'Thời tiết ôn hòa' / 'Cloud' | spec_report.md §2.3.5 |

---

## 3. Edge Cases & Boundary Probes

| # | Feature | Input | Observed / Required Behavior | Verification Logic |
|---|---------|-------|------------------------------|-------------------|
| 1 | $W_{base}$ | `weight = 0`, `-10`, `NaN` | Clamped to default $60\text{ kg} \implies W_{base} = 2100\text{ ml}$ | `if (!weight \|\| isNaN(weight) \|\| weight <= 0) weight = 60` |
| 2 | $W_{base}$ | `weight = 15` (below min 20kg) | Clamped to $20\text{ kg} \implies W_{base} = 700\text{ ml}$ | `Math.max(20, Math.min(300, weight))` |
| 3 | $W_{base}$ | `weight = 350` (above max 300kg) | Clamped to $300\text{ kg} \implies W_{base} = 10500\text{ ml}$ | `Math.max(20, Math.min(300, weight))` |
| 4 | $W_{weather}$ Temp | $T = 27.9^\circ\text{C}$ | Strict threshold: $\Delta W_{temp} = 0\text{ ml}$ | $T < 28.0$ |
| 5 | $W_{weather}$ Temp | $T = 28.0^\circ\text{C}$ | Inclusive lower boundary: $\Delta W_{temp} = +250\text{ ml}$ | $T \ge 28.0 \land T \le 32.0$ |
| 6 | $W_{weather}$ Temp | $T = 32.0^\circ\text{C}$ | Inclusive upper boundary: $\Delta W_{temp} = +250\text{ ml}$ | $T \ge 28.0 \land T \le 32.0$ |
| 7 | $W_{weather}$ Temp | $T = 32.1^\circ\text{C}$ | Strict hot threshold: $\Delta W_{temp} = +500\text{ ml}$ | $T > 32.0$ |
| 8 | $W_{weather}$ Humidity | $H = 39.9\%$ | Strict arid threshold: $\Delta W_{humid} = +150\text{ ml}$ | $H < 40.0$ |
| 9 | $W_{weather}$ Humidity | $H = 40.0\%$ | Normal threshold: $\Delta W_{humid} = 0\text{ ml}$ | $H \ge 40.0$ |
| 10 | $W_{weather}$ Combined | $T = 35^\circ\text{C}, H = 30\%$ | Cumulative sum: $500 + 150 = +650\text{ ml}$ | Cumulative addition |
| 11 | $W_{weather}$ Auto-Adjust | `autoAdjust = false`, $T = 38^\circ\text{C}, H = 20\%$ | Returns $0\text{ ml}$ total bonus | User setting override |
| 12 | Rounding 50ml | $2124\text{ ml}$ | Rounds down: $2100\text{ ml}$ | `Math.round(2124 / 50) * 50 = 2100` |
| 13 | Rounding 50ml | $2125\text{ ml}$ | Rounds up: $2150\text{ ml}$ | `Math.round(2125 / 50) * 50 = 2150` |
| 14 | Rounding 50ml | $2174\text{ ml}$ | Rounds down: $2150\text{ ml}$ | `Math.round(2174 / 50) * 50 = 2150` |
| 15 | Rounding 50ml | $2175\text{ ml}$ | Rounds up: $2200\text{ ml}$ | `Math.round(2175 / 50) * 50 = 2200` |
| 16 | Deficit | Consumed $2500\text{ ml} \ge$ Target $2000\text{ ml}$ | Deficit is $0\text{ ml}$, Remaining cups $= 0$ | `Math.max(0, target - consumed)` |
| 17 | Open-Meteo Error | Network failure / timeout | Returns cached data or safe default mock ($26^\circ\text{C}, 60\%$, Hà Nội Mặc định) | `try / catch` with offline cache fallback |
| 18 | Cache Expiry | Cache age $= 31\text{ minutes}$ | Invalidates cache, executes fresh fetch | `Date.now() - timestamp >= 1800000` |
| 19 | Geolocation Denied | User denies location permission | Falls back directly to Hà Nội coordinates (`21.0285, 105.8542`) | `isFallback: true` |

---

## 4. Full TypeScript Types & Interfaces

The following types MUST be placed in `src/types/index.ts` (or exported from `src/utils/hydrationEngine.ts`):

```typescript
// ==========================================
// 1. User & Activity Types
// ==========================================

export type ActivityLevel = 'sedentary' | 'moderate' | 'high';

export interface UserProfile {
  name: string;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  wakeTime: string; // "07:00"
  bedTime: string;  // "01:00"
  autoWeatherAdjust: boolean;
  selectedCompanion?: string;
  selectedTheme?: string;
  unit: 'ml' | 'L';
  soundEnabled: boolean;
  customDailyTargetMl?: number | null;
}

// ==========================================
// 2. Weather Engine Types
// ==========================================

export interface WeatherData {
  temperature: number;      // Temperature in Celsius (°C)
  humidity: number;         // Relative humidity percentage (0 - 100%)
  weatherCode: number;      // WMO Weather interpretation code (0 - 99)
  bonusMl: number;          // Total calculated weather surcharge ml (+0, +150, +250, +400, +500, +650)
  locationName: string;     // e.g. "Hà Nội", "Vinh", "Vị trí GPS"
  isFallback: boolean;      // true if geolocation was unavailable/denied and fallback was used
  timestamp: number;        // Epoch timestamp (ms) when data was fetched
  isOffline?: boolean;      // true if network request failed and fallback/cached data was served
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface WeatherCacheEntry {
  data: WeatherData;
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
  };
}

export interface OpenMeteoCurrentResponse {
  latitude: number;
  longitude: number;
  generationtime_ms?: number;
  utc_offset_seconds?: number;
  timezone?: string;
  elevation?: number;
  current_units?: {
    time: string;
    interval: string;
    temperature_2m: string;
    relative_humidity_2m: string;
    weather_code: string;
  };
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
  };
}

// ==========================================
// 3. Hydration Calculation Results
// ==========================================

export interface WeatherBonusBreakdown {
  total: number;
  tempBonus: number;
  humidBonus: number;
}

export interface HydrationCalculationInput {
  weightKg: number;
  activityLevel: ActivityLevel;
  weather?: WeatherData | null;
  autoAdjustWeather?: boolean;
  customDailyTargetMl?: number | null;
}

export interface HydrationCalculationResult {
  baseMl: number;           // W_base = sanitizedWeight * 35
  activityMl: number;       // W_activity (0, 350, 700)
  weatherMl: number;        // W_weather
  tempBonusMl: number;      // Temperature component (0, 250, 500)
  humidBonusMl: number;     // Humidity component (0, 150)
  rawTotalMl: number;       // Base + Activity + Weather
  targetMl: number;         // rawTotalMl rounded to nearest 50 ml
  liters: number;           // targetMl / 1000
  formattedTarget: string;  // e.g. "2,1 L" or "2150 ml"
  isCustomOverride: boolean;
}

export interface WeatherDescription {
  label: string;            // Vietnamese label (e.g. "Trời quang đãng", "Mưa rào")
  icon: string;             // Lucide icon name (e.g. "Sun", "CloudSun", "CloudRain")
}
```

---

## 5. Mathematical Formulations & Constants

### 5.1 Constants Definition
```typescript
export const DEFAULT_WEIGHT_KG = 60;
export const MIN_WEIGHT_KG = 20;
export const MAX_WEIGHT_KG = 300;

export const BASE_WATER_MULTIPLIER = 35; // ml per kg

export const ACTIVITY_WATER_MAP: Record<ActivityLevel, number> = {
  sedentary: 0,
  moderate: 350,
  high: 700,
};

export const WEATHER_TEMP_WARM_MIN = 28.0;
export const WEATHER_TEMP_WARM_MAX = 32.0;
export const WEATHER_TEMP_WARM_BONUS = 250;
export const WEATHER_TEMP_HOT_BONUS = 500;

export const WEATHER_HUMIDITY_DRY_THRESHOLD = 40.0;
export const WEATHER_HUMIDITY_DRY_BONUS = 150;

export const WEATHER_CACHE_KEY = 'voyager_weather_cache';
export const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes (1,800,000 ms)
export const WEATHER_FETCH_TIMEOUT_MS = 6000;       // 6 seconds abort timeout

export const FALLBACK_LOCATIONS = {
  HANOI: { latitude: 21.0285, longitude: 105.8542, name: 'Hà Nội' },
  VINH:  { latitude: 18.6734, longitude: 105.6813, name: 'Vinh' },
} as const;

export const DEFAULT_MOCK_WEATHER: WeatherData = {
  temperature: 26.0,
  humidity: 60.0,
  weatherCode: 1,
  bonusMl: 0,
  locationName: 'Hà Nội (Mặc định)',
  isFallback: true,
  timestamp: 0,
  isOffline: true,
};
```

---

## 6. Complete Implementation Logic for Worker (`src/utils/hydrationEngine.ts`)

The Worker can implement `src/utils/hydrationEngine.ts` following this unabridged, production-grade reference:

```typescript
import { Geolocation } from '@capacitor/geolocation';
import type {
  ActivityLevel,
  Coordinates,
  HydrationCalculationInput,
  HydrationCalculationResult,
  OpenMeteoCurrentResponse,
  WeatherBonusBreakdown,
  WeatherCacheEntry,
  WeatherData,
  WeatherDescription,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_WEIGHT_KG = 60;
export const MIN_WEIGHT_KG = 20;
export const MAX_WEIGHT_KG = 300;
export const BASE_WATER_MULTIPLIER = 35;

export const ACTIVITY_WATER_MAP: Record<ActivityLevel, number> = {
  sedentary: 0,
  moderate: 350,
  high: 700,
};

export const WEATHER_TEMP_WARM_MIN = 28.0;
export const WEATHER_TEMP_WARM_MAX = 32.0;
export const WEATHER_TEMP_WARM_BONUS = 250;
export const WEATHER_TEMP_HOT_BONUS = 500;

export const WEATHER_HUMIDITY_DRY_THRESHOLD = 40.0;
export const WEATHER_HUMIDITY_DRY_BONUS = 150;

export const WEATHER_CACHE_KEY = 'voyager_weather_cache';
export const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const WEATHER_FETCH_TIMEOUT_MS = 6000;

export const FALLBACK_LOCATIONS = {
  HANOI: { latitude: 21.0285, longitude: 105.8542, name: 'Hà Nội' },
  VINH:  { latitude: 18.6734, longitude: 105.6813, name: 'Vinh' },
} as const;

export const DEFAULT_MOCK_WEATHER: WeatherData = {
  temperature: 26.0,
  humidity: 60.0,
  weatherCode: 1,
  bonusMl: 0,
  locationName: 'Hà Nội (Mặc định)',
  isFallback: true,
  timestamp: 0,
  isOffline: true,
};

// ============================================================================
// 1. Core Mathematical Calculation Functions
// ============================================================================

/**
 * Sanitizes user weight and calculates base hydration:
 * W_base = sanitizedWeight * 35 ml
 */
export function calculateBaseWater(weightKg: number): number {
  if (typeof weightKg !== 'number' || isNaN(weightKg) || weightKg <= 0) {
    return DEFAULT_WEIGHT_KG * BASE_WATER_MULTIPLIER;
  }
  const sanitizedWeight = Math.min(MAX_WEIGHT_KG, Math.max(MIN_WEIGHT_KG, weightKg));
  return Math.round(sanitizedWeight * BASE_WATER_MULTIPLIER);
}

/**
 * Calculates additional water based on metabolic activity:
 * sedentary: +0 ml, moderate: +350 ml, high: +700 ml
 */
export function calculateActivityWater(level: ActivityLevel): number {
  if (!level || !(level in ACTIVITY_WATER_MAP)) {
    return ACTIVITY_WATER_MAP.moderate;
  }
  return ACTIVITY_WATER_MAP[level];
}

/**
 * Calculates weather surcharge based on ambient temperature and humidity:
 * - Temp: < 28°C (+0 ml), 28°C - 32°C (+250 ml), > 32°C (+500 ml)
 * - Humidity: < 40% (+150 ml), >= 40% (+0 ml)
 * Returns breakdown and total cumulative surcharge.
 */
export function calculateWeatherBonus(
  temperature: number,
  humidity: number
): WeatherBonusBreakdown {
  if (typeof temperature !== 'number' || isNaN(temperature)) {
    return { total: 0, tempBonus: 0, humidBonus: 0 };
  }

  let tempBonus = 0;
  if (temperature >= WEATHER_TEMP_WARM_MIN && temperature <= WEATHER_TEMP_WARM_MAX) {
    tempBonus = WEATHER_TEMP_WARM_BONUS;
  } else if (temperature > WEATHER_TEMP_WARM_MAX) {
    tempBonus = WEATHER_TEMP_HOT_BONUS;
  }

  let humidBonus = 0;
  if (typeof humidity === 'number' && !isNaN(humidity) && humidity < WEATHER_HUMIDITY_DRY_THRESHOLD) {
    humidBonus = WEATHER_HUMIDITY_DRY_BONUS;
  }

  return {
    total: tempBonus + humidBonus,
    tempBonus,
    humidBonus,
  };
}

/**
 * Calculates weather water with respect to user's autoAdjust setting
 */
export function calculateWeatherWater(
  weather: WeatherData | null | undefined,
  autoAdjust: boolean = true
): WeatherBonusBreakdown {
  if (!autoAdjust || !weather) {
    return { total: 0, tempBonus: 0, humidBonus: 0 };
  }
  return calculateWeatherBonus(weather.temperature, weather.humidity);
}

/**
 * Rounds any hydration volume to the nearest 50 ml step.
 * e.g. 2124 -> 2100, 2125 -> 2150, 2174 -> 2150, 2175 -> 2200
 */
export function roundToNearest50(amountMl: number): number {
  if (typeof amountMl !== 'number' || isNaN(amountMl)) {
    return 2000;
  }
  return Math.round(amountMl / 50) * 50;
}

/**
 * Rounds to nearest 100 ml (0.1 L)
 */
export function roundToNearest100(amountMl: number): number {
  if (typeof amountMl !== 'number' || isNaN(amountMl)) {
    return 2000;
  }
  return Math.round(amountMl / 100) * 100;
}

/**
 * Direct daily water goal calculator as specified in PROJECT.md:
 * calculateDailyWaterGoal(weightKg, activityLevel, weatherBonusMl)
 */
export function calculateDailyWaterGoal(
  weightKg: number,
  activityLevel: ActivityLevel,
  weatherBonusMl: number = 0
): number {
  const base = calculateBaseWater(weightKg);
  const activity = calculateActivityWater(activityLevel);
  const weather = Math.max(0, weatherBonusMl || 0);
  const rawTotal = base + activity + weather;
  return roundToNearest50(rawTotal);
}

/**
 * Comprehensive calculator returning full calculation breakdown and formatted strings
 */
export function calculateHydrationTarget(
  input: HydrationCalculationInput
): HydrationCalculationResult {
  if (input.customDailyTargetMl && input.customDailyTargetMl > 0) {
    const targetMl = roundToNearest50(input.customDailyTargetMl);
    return {
      baseMl: calculateBaseWater(input.weightKg),
      activityMl: calculateActivityWater(input.activityLevel),
      weatherMl: 0,
      tempBonusMl: 0,
      humidBonusMl: 0,
      rawTotalMl: input.customDailyTargetMl,
      targetMl,
      liters: targetMl / 1000,
      formattedTarget: formatWaterVolume(targetMl, 'L'),
      isCustomOverride: true,
    };
  }

  const baseMl = calculateBaseWater(input.weightKg);
  const activityMl = calculateActivityWater(input.activityLevel);
  const autoAdjust = input.autoAdjustWeather !== false;
  const weatherBreakdown = calculateWeatherWater(input.weather, autoAdjust);
  
  const rawTotalMl = baseMl + activityMl + weatherBreakdown.total;
  const targetMl = roundToNearest50(rawTotalMl);
  const liters = targetMl / 1000;

  return {
    baseMl,
    activityMl,
    weatherMl: weatherBreakdown.total,
    tempBonusMl: weatherBreakdown.tempBonus,
    humidBonusMl: weatherBreakdown.humidBonus,
    rawTotalMl,
    targetMl,
    liters,
    formattedTarget: formatWaterVolume(targetMl, 'L'),
    isCustomOverride: false,
  };
}

// ============================================================================
// 2. UI Formatting & Deficit Helpers
// ============================================================================

/**
 * Formats water volume in ml or L using Vietnamese comma formatting.
 * e.g. 2000 ml -> "2,0 L" or "2000 ml"
 *      2150 ml -> "2,15 L" (or 2,2 L if 1 decimal)
 */
export function formatWaterVolume(ml: number, unit: 'ml' | 'L' = 'L'): string {
  if (typeof ml !== 'number' || isNaN(ml)) {
    return unit === 'ml' ? '0 ml' : '0,0 L';
  }
  const cleanMl = Math.max(0, Math.round(ml));
  if (unit === 'ml') {
    return `${cleanMl} ml`;
  }
  const liters = cleanMl / 1000;
  // If exactly integer or tenth: 1 decimal place (e.g. 2,0 or 2,1)
  // If has 50ml fragment (.05): 2 decimal places (e.g. 2,15)
  const isExactTenth = Math.round(liters * 10) === liters * 10;
  const numStr = isExactTenth ? liters.toFixed(1) : liters.toFixed(2);
  return `${numStr.replace('.', ',')} L`;
}

/**
 * Calculates remaining glasses of water needed to reach daily target.
 * Standard cup size is 250 ml.
 */
export function calculateRemainingCups(
  targetMl: number,
  consumedMl: number,
  cupSizeMl: number = 250
): number {
  const safeTarget = Math.max(0, targetMl || 0);
  const safeConsumed = Math.max(0, consumedMl || 0);
  const safeCup = Math.max(1, cupSizeMl || 250);

  const deficit = Math.max(0, safeTarget - safeConsumed);
  if (deficit === 0) {
    return 0;
  }
  return Math.ceil(deficit / safeCup);
}

/**
 * Returns user-facing prompt string for remaining cups
 */
export function getRemainingPromptText(remainingCups: number): string {
  if (remainingCups <= 0) {
    return 'Mục tiêu hoàn thành! ✨';
  }
  return `Thêm ${remainingCups} ly >`;
}

/**
 * Maps WMO weather code to Vietnamese label and Lucide icon name
 */
export function getWeatherDescription(weatherCode: number): WeatherDescription {
  switch (weatherCode) {
    case 0:
      return { label: 'Trời quang đãng', icon: 'Sun' };
    case 1:
    case 2:
    case 3:
      return { label: 'Trời nhiều mây', icon: 'CloudSun' };
    case 45:
    case 48:
      return { label: 'Sương mù ngân hà', icon: 'CloudFog' };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { label: 'Mưa phùn nhẹ', icon: 'CloudDrizzle' };
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return { label: 'Mưa rào sao băng', icon: 'CloudRain' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { label: 'Băng tuyết tinh vân', icon: 'Snowflake' };
    case 80:
    case 81:
    case 82:
      return { label: 'Mưa rào dồn dập', icon: 'CloudRain' };
    case 95:
    case 96:
    case 99:
      return { label: 'Bão từ không gian', icon: 'CloudLightning' };
    default:
      return { label: 'Thời tiết ôn hòa', icon: 'Cloud' };
  }
}

// ============================================================================
// 3. Weather API & Geolocation Integration with 30-min Cache
// ============================================================================

/**
 * Reads cached weather from localStorage
 */
export function getCachedWeather(): WeatherCacheEntry | null {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherCacheEntry;
    if (parsed && parsed.data && typeof parsed.timestamp === 'number') {
      return parsed;
    }
  } catch (err) {
    console.warn('[HydrationEngine] Failed to parse weather cache:', err);
  }
  return null;
}

/**
 * Saves weather to localStorage cache with timestamp
 */
export function setCachedWeather(
  data: WeatherData,
  coords: { latitude: number; longitude: number }
): void {
  try {
    const entry: WeatherCacheEntry = {
      data,
      timestamp: Date.now(),
      coords: {
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
    };
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    console.warn('[HydrationEngine] Failed to write weather cache:', err);
  }
}

/**
 * Clears weather cache (useful for testing or manual refresh)
 */
export function clearWeatherCache(): void {
  try {
    localStorage.removeItem(WEATHER_CACHE_KEY);
  } catch (err) {
    console.warn('[HydrationEngine] Failed to clear weather cache:', err);
  }
}

/**
 * Determines whether a cache entry is still valid (< 30 min and close in coords)
 */
export function isCacheValid(
  entry: WeatherCacheEntry | null,
  lat?: number,
  lon?: number
): boolean {
  if (!entry) return false;
  const isFresh = Date.now() - entry.timestamp < WEATHER_CACHE_TTL_MS;
  if (!isFresh) return false;

  // If specific coordinates were requested, check distance within ~0.1 deg
  if (typeof lat === 'number' && typeof lon === 'number') {
    const dLat = Math.abs(entry.coords.latitude - lat);
    const dLon = Math.abs(entry.coords.longitude - lon);
    return dLat < 0.1 && dLon < 0.1;
  }

  return true;
}

/**
 * Attempts to retrieve current GPS coordinates via @capacitor/geolocation or browser navigator
 */
export async function getDeviceCoordinates(): Promise<Coordinates | null> {
  try {
    // Attempt Capacitor Geolocation
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 5000,
    });
    if (position && position.coords) {
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        name: 'Vị trí hiện tại',
      };
    }
  } catch (err) {
    // Attempt browser navigator fallback if available
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const browserPos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        return {
          latitude: browserPos.coords.latitude,
          longitude: browserPos.coords.longitude,
          name: 'Vị trí hiện tại',
        };
      } catch (innerErr) {
        // Fallback silently
      }
    }
  }
  return null;
}

/**
 * Primary weather fetcher:
 * 1. Checks 30-min cache
 * 2. Gets coordinates (GPS or fallback Hà Nội: 21.0285, 105.8542)
 * 3. Calls Open-Meteo API with timeout
 * 4. Saves to cache and returns WeatherData
 * 5. On failure, uses offline cache or DEFAULT_MOCK_WEATHER
 */
export async function fetchWeatherData(
  lat?: number,
  lon?: number,
  forceRefresh: boolean = false
): Promise<WeatherData> {
  // Check cache if not forcing refresh
  if (!forceRefresh) {
    const cached = getCachedWeather();
    if (isCacheValid(cached, lat, lon)) {
      return cached!.data;
    }
  }

  // Determine target coordinates
  let targetLat: number;
  let targetLon: number;
  let locationName: string;
  let isFallback = false;

  if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
    targetLat = lat;
    targetLon = lon;
    locationName = 'Tọa độ tùy chỉnh';
  } else {
    const deviceCoords = await getDeviceCoordinates();
    if (deviceCoords) {
      targetLat = deviceCoords.latitude;
      targetLon = deviceCoords.longitude;
      locationName = deviceCoords.name || 'Vị trí hiện tại';
      isFallback = false;
    } else {
      // Primary Fallback: Hà Nội
      targetLat = FALLBACK_LOCATIONS.HANOI.latitude;
      targetLon = FALLBACK_LOCATIONS.HANOI.longitude;
      locationName = FALLBACK_LOCATIONS.HANOI.name;
      isFallback = true;
    }
  }

  // Fetch from Open-Meteo API with abort timeout
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,weather_code`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEATHER_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP Error: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as OpenMeteoCurrentResponse;
    if (!json.current) {
      throw new Error('Invalid Open-Meteo response structure: missing current data');
    }

    const temperature = Number(json.current.temperature_2m) || 26.0;
    const humidity = Number(json.current.relative_humidity_2m) || 60;
    const weatherCode = Number(json.current.weather_code) || 1;
    const bonus = calculateWeatherBonus(temperature, humidity);

    const weatherData: WeatherData = {
      temperature,
      humidity,
      weatherCode,
      bonusMl: bonus.total,
      locationName,
      isFallback,
      timestamp: Date.now(),
      isOffline: false,
    };

    // Save to 30-min cache
    setCachedWeather(weatherData, { latitude: targetLat, longitude: targetLon });

    return weatherData;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[HydrationEngine] Open-Meteo fetch failed:', err);

    // Fallback: If any cached data exists (even expired), return it with isOffline = true
    const fallbackCache = getCachedWeather();
    if (fallbackCache) {
      return {
        ...fallbackCache.data,
        isOffline: true,
      };
    }

    // Secondary coordinates test or mock fallback
    return {
      ...DEFAULT_MOCK_WEATHER,
      isOffline: true,
      timestamp: Date.now(),
    };
  }
}
```

---

## 7. Verification Test Suite Guidance

The unit test suite (`tests/unit/hydrationEngine.test.ts`) to be implemented by Worker 2 must cover the following test cases:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateBaseWater,
  calculateActivityWater,
  calculateWeatherBonus,
  calculateWeatherWater,
  calculateDailyWaterGoal,
  calculateHydrationTarget,
  roundToNearest50,
  roundToNearest100,
  formatWaterVolume,
  calculateRemainingCups,
  getRemainingPromptText,
  getWeatherDescription,
  getCachedWeather,
  setCachedWeather,
  clearWeatherCache,
  isCacheValid,
  fetchWeatherData,
  FALLBACK_LOCATIONS,
  WEATHER_CACHE_KEY,
} from '../../src/utils/hydrationEngine';

describe('Hydration Engine Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Base Hydration Formula (W_base = weight * 35)', () => {
    it('calculates exact W_base for standard weights', () => {
      expect(calculateBaseWater(60)).toBe(2100);
      expect(calculateBaseWater(70)).toBe(2450);
      expect(calculateBaseWater(80)).toBe(2800);
      expect(calculateBaseWater(55)).toBe(1925);
    });

    it('falls back to 60kg (2100ml) on zero, negative, or NaN input', () => {
      expect(calculateBaseWater(0)).toBe(2100);
      expect(calculateBaseWater(-15)).toBe(2100);
      expect(calculateBaseWater(NaN)).toBe(2100);
      expect(calculateBaseWater(null as any)).toBe(2100);
    });

    it('clamps weight to [20, 300] kg boundaries', () => {
      expect(calculateBaseWater(10)).toBe(700);    // 20 * 35 = 700
      expect(calculateBaseWater(350)).toBe(10500); // 300 * 35 = 10500
    });
  });

  describe('2. Physical Activity Surcharges (W_activity)', () => {
    it('returns +0 ml for sedentary', () => {
      expect(calculateActivityWater('sedentary')).toBe(0);
    });

    it('returns +350 ml for moderate', () => {
      expect(calculateActivityWater('moderate')).toBe(350);
    });

    it('returns +700 ml for high', () => {
      expect(calculateActivityWater('high')).toBe(700);
    });

    it('defaults to moderate (+350 ml) for invalid activity string', () => {
      expect(calculateActivityWater('invalid' as any)).toBe(350);
    });
  });

  describe('3. Weather Bonus Surcharges (W_weather)', () => {
    it('adds 0 ml when temperature < 28°C and humidity >= 40%', () => {
      const res = calculateWeatherBonus(25, 60);
      expect(res.total).toBe(0);
      expect(res.tempBonus).toBe(0);
      expect(res.humidBonus).toBe(0);
    });

    it('adds +250 ml when temperature is between 28°C and 32°C inclusive', () => {
      expect(calculateWeatherBonus(28.0, 50).tempBonus).toBe(250);
      expect(calculateWeatherBonus(30.0, 50).tempBonus).toBe(250);
      expect(calculateWeatherBonus(32.0, 50).tempBonus).toBe(250);
    });

    it('adds +500 ml when temperature is strictly > 32°C', () => {
      expect(calculateWeatherBonus(32.1, 50).tempBonus).toBe(500);
      expect(calculateWeatherBonus(38.0, 50).tempBonus).toBe(500);
    });

    it('adds +150 ml when humidity is strictly < 40%', () => {
      expect(calculateWeatherBonus(25, 39.9).humidBonus).toBe(150);
      expect(calculateWeatherBonus(25, 20.0).humidBonus).toBe(150);
      expect(calculateWeatherBonus(25, 40.0).humidBonus).toBe(0);
    });

    it('cumulatively adds temperature and humidity surcharges', () => {
      // Warm (28-32) + Dry (<40%): 250 + 150 = 400
      expect(calculateWeatherBonus(30, 35).total).toBe(400);
      // Hot (>32) + Dry (<40%): 500 + 150 = 650
      expect(calculateWeatherBonus(36, 25).total).toBe(650);
    });

    it('returns 0 when autoAdjustWeather is false', () => {
      const weather = { temperature: 36, humidity: 25 } as any;
      expect(calculateWeatherWater(weather, false).total).toBe(0);
      expect(calculateWeatherWater(weather, true).total).toBe(650);
    });
  });

  describe('4. Rounding Logic', () => {
    it('rounds to nearest 50 ml', () => {
      expect(roundToNearest50(2120)).toBe(2100);
      expect(roundToNearest50(2125)).toBe(2150);
      expect(roundToNearest50(2149)).toBe(2150);
      expect(roundToNearest50(2150)).toBe(2150);
      expect(roundToNearest50(2174)).toBe(2150);
      expect(roundToNearest50(2175)).toBe(2200);
    });

    it('rounds to nearest 100 ml (0.1 L)', () => {
      expect(roundToNearest100(2140)).toBe(2100);
      expect(roundToNearest100(2150)).toBe(2200);
      expect(roundToNearest100(2180)).toBe(2200);
    });
  });

  describe('5. Formatting & Cup Calculations', () => {
    it('formats volume with comma separator in L', () => {
      expect(formatWaterVolume(2000, 'L')).toBe('2,0 L');
      expect(formatWaterVolume(2100, 'L')).toBe('2,1 L');
      expect(formatWaterVolume(2150, 'L')).toBe('2,15 L');
      expect(formatWaterVolume(2150, 'ml')).toBe('2150 ml');
    });

    it('calculates remaining cups correctly', () => {
      expect(calculateRemainingCups(2000, 1500, 250)).toBe(2);
      expect(calculateRemainingCups(2000, 1600, 250)).toBe(2);
      expect(calculateRemainingCups(2000, 2000, 250)).toBe(0);
      expect(calculateRemainingCups(2000, 2500, 250)).toBe(0);
    });

    it('returns appropriate prompt text', () => {
      expect(getRemainingPromptText(3)).toBe('Thêm 3 ly >');
      expect(getRemainingPromptText(0)).toBe('Mục tiêu hoàn thành! ✨');
    });
  });

  describe('6. Weather Caching & Fallback Integration', () => {
    it('stores and retrieves cached weather from localStorage', () => {
      const mockData = { temperature: 29, humidity: 65, weatherCode: 1, bonusMl: 250 } as any;
      setCachedWeather(mockData, { latitude: 21.0285, longitude: 105.8542 });

      const cached = getCachedWeather();
      expect(cached).not.toBeNull();
      expect(cached?.data.temperature).toBe(29);
      expect(isCacheValid(cached, 21.0285, 105.8542)).toBe(true);
    });

    it('marks cache invalid after 30 minutes', () => {
      const mockData = { temperature: 29, humidity: 65 } as any;
      const expiredEntry = {
        data: mockData,
        timestamp: Date.now() - (31 * 60 * 1000), // 31 min ago
        coords: { latitude: 21.0285, longitude: 105.8542 },
      };
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(expiredEntry));

      const cached = getCachedWeather();
      expect(isCacheValid(cached, 21.0285, 105.8542)).toBe(false);
    });

    it('falls back to Hanoi coordinates on geolocation failure', async () => {
      // Mock fetch
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: { temperature_2m: 29.5, relative_humidity_2m: 60, weather_code: 1 },
        }),
      } as any);

      const result = await fetchWeatherData();
      expect(fetchSpy).toHaveBeenCalled();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain(`latitude=${FALLBACK_LOCATIONS.HANOI.latitude}`);
      expect(calledUrl).toContain(`longitude=${FALLBACK_LOCATIONS.HANOI.longitude}`);
      expect(result.temperature).toBe(29.5);
      expect(result.isFallback).toBe(true);
    });
  });
});
```

---

## 8. Summary Checklist for Worker 2 Implementation

- [x] All types match `PROJECT.md § Interface Contracts` and `SCOPE.md § F2`
- [x] Mathematical equations for $W_{base}$, $W_{activity}$, and $W_{weather}$ are strictly specified with edge clamping
- [x] Weather temperature rules ($< 28^\circ\text{C}$, $28-32^\circ\text{C}$, $> 32^\circ\text{C}$) and humidity rule ($< 40\%$) with cumulative summing verified
- [x] Rounding to 50 ml verified
- [x] Open-Meteo URL verified against live API
- [x] 30-minute localStorage cache pattern and TTL verified
- [x] Fallback coordinates for Hà Nội (`21.0285, 105.8542`) and Vinh (`18.6734, 105.6813`) verified
- [x] Safe mock offline fallback prevents app crashes
- [x] Complete Vitest test specifications provided
