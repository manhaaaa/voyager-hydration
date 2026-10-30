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
