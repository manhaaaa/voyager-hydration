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
    if (typeof localStorage === 'undefined') return null;
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
    if (typeof localStorage === 'undefined') return;
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
    if (typeof localStorage === 'undefined') return;
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

// Canonical Aliases for cross-module compatibility
export const canonicalFormatVolume = formatWaterVolume;
export const canonicalRemainingCups = calculateRemainingCups;
export const canonicalCalculateDailyGoal = calculateDailyWaterGoal;

