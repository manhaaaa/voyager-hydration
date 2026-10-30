/**
 * Voyager's Cosmic Hydration - Unit Test Suite
 * File: tests/unit/hydrationEngine.test.ts
 * Module Under Test: src/utils/hydrationEngine.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Geolocation } from '@capacitor/geolocation';
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
  DEFAULT_WEIGHT_KG,
  FALLBACK_LOCATIONS,
  WEATHER_CACHE_KEY,
  DEFAULT_MOCK_WEATHER,
} from '../../src/utils/hydrationEngine';
import type { WeatherData, OpenMeteoCurrentResponse } from '../../src/types';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Geolocation plugin
vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: vi.fn(),
  },
}));

// In-Memory LocalStorage Polyfill for Node.js test environment
class MockLocalStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = new MockLocalStorage();
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Hydration Engine Test Suite (hydrationEngine.ts)', () => {
  let fetchSpy: any;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Suite 1: Weight Base Calculation (W_base)
  // --------------------------------------------------------------------------
  describe('1. Base Hydration Formula (W_base = weight * 35)', () => {
    it('calculates correct base water for standard benchmarks: 40kg, 60kg, 75kg, 100kg', () => {
      expect(calculateBaseWater(40)).toBe(1400); // 40 * 35 = 1400 ml
      expect(calculateBaseWater(60)).toBe(2100); // 60 * 35 = 2100 ml
      expect(calculateBaseWater(75)).toBe(2625); // 75 * 35 = 2625 ml
      expect(calculateBaseWater(100)).toBe(3500); // 100 * 35 = 3500 ml
    });

    it('calculates fractional weights accurately with rounding', () => {
      // 62.5 * 35 = 2187.5 -> 2188
      expect(calculateBaseWater(62.5)).toBe(2188);
      // 55.4 * 35 = 1939.0 -> 1939
      expect(calculateBaseWater(55.4)).toBe(1939);
    });

    it('sanitizes zero, negative, or NaN weights to default 60kg (2100ml)', () => {
      expect(DEFAULT_WEIGHT_KG).toBe(60);
      expect(calculateBaseWater(0)).toBe(2100);
      expect(calculateBaseWater(-15)).toBe(2100);
      expect(calculateBaseWater(NaN)).toBe(2100);
      expect(calculateBaseWater(undefined as any)).toBe(2100);
    });

    it('clamps weight to minimum boundary of 20kg (700ml)', () => {
      expect(calculateBaseWater(20)).toBe(700);
      expect(calculateBaseWater(10)).toBe(700); // Clamped to 20kg
      expect(calculateBaseWater(1)).toBe(700);
    });

    it('clamps weight to maximum boundary of 300kg (10500ml)', () => {
      expect(calculateBaseWater(300)).toBe(10500);
      expect(calculateBaseWater(350)).toBe(10500); // Clamped to 300kg
      expect(calculateBaseWater(500)).toBe(10500);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Physical Activity Levels (W_activity)
  // --------------------------------------------------------------------------
  describe('2. Physical Activity Level (W_activity)', () => {
    it('returns +0ml for sedentary level (Ít vận động)', () => {
      expect(calculateActivityWater('sedentary')).toBe(0);
    });

    it('returns +350ml for moderate level (Vừa)', () => {
      expect(calculateActivityWater('moderate')).toBe(350);
    });

    it('returns +700ml for high level (Cao)', () => {
      expect(calculateActivityWater('high')).toBe(700);
    });

    it('defaults safely to moderate (+350ml) on invalid or missing activity input', () => {
      expect(calculateActivityWater('extreme' as any)).toBe(350);
      expect(calculateActivityWater('' as any)).toBe(350);
      expect(calculateActivityWater(null as any)).toBe(350);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: Environmental Weather Bonus Conditions (W_weather)
  // --------------------------------------------------------------------------
  describe('3. Environmental Weather Bonus Conditions (W_weather)', () => {
    describe('Temperature Thresholds', () => {
      it('awards +0ml for cool weather (< 28.0°C)', () => {
        expect(calculateWeatherBonus(20.0, 50).tempBonus).toBe(0);
        expect(calculateWeatherBonus(25.0, 50).tempBonus).toBe(0);
        expect(calculateWeatherBonus(27.9, 50).tempBonus).toBe(0);
      });

      it('awards +250ml for warm weather (28.0°C to 32.0°C inclusive)', () => {
        expect(calculateWeatherBonus(28.0, 50).tempBonus).toBe(250);
        expect(calculateWeatherBonus(30.0, 50).tempBonus).toBe(250);
        expect(calculateWeatherBonus(32.0, 50).tempBonus).toBe(250);
      });

      it('awards +500ml for hot weather (> 32.0°C)', () => {
        expect(calculateWeatherBonus(32.1, 50).tempBonus).toBe(500);
        expect(calculateWeatherBonus(35.0, 50).tempBonus).toBe(500);
        expect(calculateWeatherBonus(42.0, 50).tempBonus).toBe(500);
      });
    });

    describe('Humidity Thresholds', () => {
      it('awards +0ml for normal or humid air (>= 40.0%)', () => {
        expect(calculateWeatherBonus(25, 40.0).humidBonus).toBe(0);
        expect(calculateWeatherBonus(25, 65.0).humidBonus).toBe(0);
        expect(calculateWeatherBonus(25, 95.0).humidBonus).toBe(0);
      });

      it('awards +150ml for dry/arid air (< 40.0%)', () => {
        expect(calculateWeatherBonus(25, 39.9).humidBonus).toBe(150);
        expect(calculateWeatherBonus(25, 30.0).humidBonus).toBe(150);
        expect(calculateWeatherBonus(25, 15.0).humidBonus).toBe(150);
      });
    });

    describe('Cumulative Combinations & Extremes', () => {
      it('calculates Cool + Normal humidity: 24°C, 60% -> +0ml total', () => {
        const bonus = calculateWeatherBonus(24, 60);
        expect(bonus.tempBonus).toBe(0);
        expect(bonus.humidBonus).toBe(0);
        expect(bonus.total).toBe(0);
      });

      it('calculates Cool + Dry humidity: 22°C, 35% -> +150ml total', () => {
        const bonus = calculateWeatherBonus(22, 35);
        expect(bonus.tempBonus).toBe(0);
        expect(bonus.humidBonus).toBe(150);
        expect(bonus.total).toBe(150);
      });

      it('calculates Warm + Normal humidity: 30°C, 55% -> +250ml total', () => {
        const bonus = calculateWeatherBonus(30, 55);
        expect(bonus.tempBonus).toBe(250);
        expect(bonus.humidBonus).toBe(0);
        expect(bonus.total).toBe(250);
      });

      it('calculates Warm + Dry humidity: 30°C, 35% -> +400ml total', () => {
        const bonus = calculateWeatherBonus(30, 35);
        expect(bonus.tempBonus).toBe(250);
        expect(bonus.humidBonus).toBe(150);
        expect(bonus.total).toBe(400);
      });

      it('calculates Hot + Normal humidity: 35°C, 60% -> +500ml total', () => {
        const bonus = calculateWeatherBonus(35, 60);
        expect(bonus.tempBonus).toBe(500);
        expect(bonus.humidBonus).toBe(0);
        expect(bonus.total).toBe(500);
      });

      it('calculates Combined Extreme: Hot + Dry (38°C, 25%) -> +650ml total', () => {
        const bonus = calculateWeatherBonus(38, 25);
        expect(bonus.tempBonus).toBe(500);
        expect(bonus.humidBonus).toBe(150);
        expect(bonus.total).toBe(650);
      });
    });

    describe('Auto-Adjust Weather Flag & Safe Defaults', () => {
      const hotDryWeather: WeatherData = {
        temperature: 38,
        humidity: 25,
        weatherCode: 0,
        bonusMl: 650,
        locationName: 'Hà Nội',
        isFallback: false,
        timestamp: Date.now(),
      };

      it('returns total weather bonus when autoAdjust is true', () => {
        const res = calculateWeatherWater(hotDryWeather, true);
        expect(res.total).toBe(650);
      });

      it('returns 0ml bonus when autoAdjust is false even in extreme heat', () => {
        const res = calculateWeatherWater(hotDryWeather, false);
        expect(res.total).toBe(0);
        expect(res.tempBonus).toBe(0);
        expect(res.humidBonus).toBe(0);
      });

      it('returns 0ml safely when weather is null or undefined', () => {
        expect(calculateWeatherWater(null, true).total).toBe(0);
        expect(calculateWeatherWater(undefined, true).total).toBe(0);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 4: Rounding Behavior & UI Output Helpers
  // --------------------------------------------------------------------------
  describe('4. Rounding Behavior & UI Output Helpers', () => {
    describe('roundToNearest50', () => {
      it('preserves exact multiples of 50ml', () => {
        expect(roundToNearest50(2000)).toBe(2000);
        expect(roundToNearest50(2150)).toBe(2150);
      });

      it('rounds down when remainder is under 25ml', () => {
        expect(roundToNearest50(2120)).toBe(2100);
        expect(roundToNearest50(2124)).toBe(2100);
        expect(roundToNearest50(2174)).toBe(2150);
      });

      it('rounds up when remainder is 25ml or greater', () => {
        expect(roundToNearest50(2125)).toBe(2150);
        expect(roundToNearest50(2149)).toBe(2150);
        expect(roundToNearest50(2175)).toBe(2200);
      });

      it('handles NaN or invalid inputs safely', () => {
        expect(roundToNearest50(NaN)).toBe(2000);
      });
    });

    describe('roundToNearest100 (0.1 L)', () => {
      it('rounds to nearest 100ml steps', () => {
        expect(roundToNearest100(2149)).toBe(2100);
        expect(roundToNearest100(2150)).toBe(2200);
        expect(roundToNearest100(1620)).toBe(1600);
      });
    });

    describe('calculateDailyWaterGoal (PROJECT.md contract)', () => {
      it('calculates full goal: 60kg, moderate (+350), warm weather (+250) -> 2700ml', () => {
        // Base: 60 * 35 = 2100
        // Activity: 350
        // Weather: 250
        // Total: 2700 ml
        expect(calculateDailyWaterGoal(60, 'moderate', 250)).toBe(2700);
      });

      it('calculates full goal with rounding: 75kg, sedentary (+0), cool weather (+0) -> 2650ml', () => {
        // Base: 75 * 35 = 2625
        // Activity: 0
        // Weather: 0
        // Total: 2625 -> rounded to 2650 ml
        expect(calculateDailyWaterGoal(75, 'sedentary', 0)).toBe(2650);
      });
    });

    describe('calculateHydrationTarget (Comprehensive Breakdown)', () => {
      it('returns complete mathematical breakdown object', () => {
        const result = calculateHydrationTarget({
          weightKg: 60,
          activityLevel: 'moderate',
          weather: {
            temperature: 30,
            humidity: 50,
            weatherCode: 1,
            bonusMl: 250,
            locationName: 'Hà Nội',
            isFallback: false,
            timestamp: Date.now(),
          },
          autoAdjustWeather: true,
        });

        expect(result.baseMl).toBe(2100);
        expect(result.activityMl).toBe(350);
        expect(result.weatherMl).toBe(250);
        expect(result.tempBonusMl).toBe(250);
        expect(result.humidBonusMl).toBe(0);
        expect(result.rawTotalMl).toBe(2700);
        expect(result.targetMl).toBe(2700);
        expect(result.liters).toBe(2.7);
        expect(result.formattedTarget).toBe('2,7 L');
        expect(result.isCustomOverride).toBe(false);
      });

      it('respects custom daily target override if provided', () => {
        const result = calculateHydrationTarget({
          weightKg: 60,
          activityLevel: 'moderate',
          customDailyTargetMl: 2350,
        });

        expect(result.targetMl).toBe(2350);
        expect(result.isCustomOverride).toBe(true);
        expect(result.formattedTarget).toBe('2,35 L');
      });
    });

    describe('formatWaterVolume', () => {
      it('formats milliliters with "ml" suffix', () => {
        expect(formatWaterVolume(2150, 'ml')).toBe('2150 ml');
        expect(formatWaterVolume(500, 'ml')).toBe('500 ml');
      });

      it('formats whole liters with Vietnamese comma decimal "2,0 L"', () => {
        expect(formatWaterVolume(2000, 'L')).toBe('2,0 L');
        expect(formatWaterVolume(1000, 'L')).toBe('1,0 L');
      });

      it('formats single decimal liters "1,6 L"', () => {
        expect(formatWaterVolume(1600, 'L')).toBe('1,6 L');
      });

      it('formats two decimal places for 50ml steps "2,15 L"', () => {
        expect(formatWaterVolume(2150, 'L')).toBe('2,15 L');
      });
    });

    describe('calculateRemainingCups & getRemainingPromptText', () => {
      it('calculates remaining glasses with ceiling division', () => {
        expect(calculateRemainingCups(2000, 1500, 250)).toBe(2); // 500 / 250 = 2
        expect(calculateRemainingCups(2000, 1600, 250)).toBe(2); // 400 / 250 = 1.6 -> 2
        expect(calculateRemainingCups(2000, 1750, 250)).toBe(1); // 250 / 250 = 1
      });

      it('returns 0 glasses when goal is reached or exceeded', () => {
        expect(calculateRemainingCups(2000, 2000, 250)).toBe(0);
        expect(calculateRemainingCups(2000, 2500, 250)).toBe(0);
      });

      it('generates correct Vietnamese prompt string', () => {
        expect(getRemainingPromptText(3)).toBe('Thêm 3 ly >');
        expect(getRemainingPromptText(1)).toBe('Thêm 1 ly >');
        expect(getRemainingPromptText(0)).toBe('Mục tiêu hoàn thành! ✨');
      });
    });

    describe('getWeatherDescription (WMO Mapping)', () => {
      it('maps WMO 0 to Clear Sky and Sun icon', () => {
        const desc = getWeatherDescription(0);
        expect(desc.label).toBe('Trời quang đãng');
        expect(desc.icon).toBe('Sun');
      });

      it('maps WMO 61 to Rain and CloudRain icon', () => {
        const desc = getWeatherDescription(61);
        expect(desc.label).toBe('Mưa rào sao băng');
        expect(desc.icon).toBe('CloudRain');
      });

      it('maps unknown code to fallback description', () => {
        const desc = getWeatherDescription(999);
        expect(desc.label).toBe('Thời tiết ôn hòa');
        expect(desc.icon).toBe('Cloud');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 5: Open-Meteo API Fetching & Geolocation Fallbacks
  // --------------------------------------------------------------------------
  describe('5. Open-Meteo API Fetching, Mock Requests & Fallbacks', () => {
    it('successfully parses valid Open-Meteo API payload and computes weather bonus', async () => {
      const mockResponse: OpenMeteoCurrentResponse = {
        latitude: 21.0285,
        longitude: 105.8542,
        current: {
          time: '2026-10-30T15:00',
          interval: 900,
          temperature_2m: 30.5, // Warm: +250ml
          relative_humidity_2m: 35, // Arid: +150ml
          weather_code: 1,
        },
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const weather = await fetchWeatherData(21.0285, 105.8542, true);

      expect(weather.temperature).toBe(30.5);
      expect(weather.humidity).toBe(35);
      expect(weather.weatherCode).toBe(1);
      expect(weather.bonusMl).toBe(400); // 250 + 150 = 400ml
      expect(weather.isOffline).toBe(false);
    });

    it('formats Open-Meteo request URL with required query parameters', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          latitude: 21.0285,
          longitude: 105.8542,
          current: { temperature_2m: 26, relative_humidity_2m: 60, weather_code: 1 },
        }),
      } as Response);

      await fetchWeatherData(21.0285, 105.8542, true);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const requestUrl = fetchSpy.mock.calls[0][0] as string;
      expect(requestUrl).toContain('latitude=21.0285');
      expect(requestUrl).toContain('longitude=105.8542');
      expect(requestUrl).toContain('current=temperature_2m,relative_humidity_2m,weather_code');
    });

    it('falls back to Hà Nội coordinates when GPS permission is denied or unavailable', async () => {
      // Mock Geolocation rejection
      (Geolocation.getCurrentPosition as any).mockRejectedValueOnce(
        new Error('User denied Geolocation permission')
      );

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          latitude: FALLBACK_LOCATIONS.HANOI.latitude,
          longitude: FALLBACK_LOCATIONS.HANOI.longitude,
          current: { temperature_2m: 28.0, relative_humidity_2m: 70, weather_code: 1 },
        }),
      } as Response);

      const weather = await fetchWeatherData(undefined, undefined, true);

      expect(weather.isFallback).toBe(true);
      expect(weather.locationName).toBe(FALLBACK_LOCATIONS.HANOI.name);
      const requestUrl = fetchSpy.mock.calls[0][0] as string;
      expect(requestUrl).toContain(`latitude=${FALLBACK_LOCATIONS.HANOI.latitude}`);
      expect(requestUrl).toContain(`longitude=${FALLBACK_LOCATIONS.HANOI.longitude}`);
    });

    it('gracefully handles network blackout by returning default mock without throwing', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const weather = await fetchWeatherData(21.0285, 105.8542, true);

      expect(weather.isOffline).toBe(true);
      expect(weather.temperature).toBe(DEFAULT_MOCK_WEATHER.temperature);
      expect(weather.humidity).toBe(DEFAULT_MOCK_WEATHER.humidity);
      expect(weather.bonusMl).toBe(0);
    });

    it('handles HTTP 500 server error safely', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const weather = await fetchWeatherData(21.0285, 105.8542, true);

      expect(weather.isOffline).toBe(true);
      expect(weather.bonusMl).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 6: Cache Expiry and Cache Hit Behavior
  // --------------------------------------------------------------------------
  describe('6. Cache Expiry & Cache Hit Behavior (30-Minute TTL)', () => {
    it('serves data from cache and does NOT call fetch when cache is fresh (< 30 min)', async () => {
      vi.useFakeTimers();
      const baseTime = new Date('2026-10-30T10:00:00Z').getTime();
      vi.setSystemTime(baseTime);

      const cachedData: WeatherData = {
        temperature: 29.0,
        humidity: 50,
        weatherCode: 1,
        bonusMl: 250,
        locationName: 'Hà Nội',
        isFallback: false,
        timestamp: baseTime,
      };

      setCachedWeather(cachedData, { latitude: 21.0285, longitude: 105.8542 });

      // Advance time by 15 minutes (under 30-min TTL)
      vi.advanceTimersByTime(15 * 60 * 1000);

      const weather = await fetchWeatherData(21.0285, 105.8542, false);

      expect(weather.temperature).toBe(29.0);
      expect(weather.bonusMl).toBe(250);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('invalidates cache and triggers fresh network fetch when cache is older than 30 minutes', async () => {
      vi.useFakeTimers();
      const baseTime = new Date('2026-10-30T10:00:00Z').getTime();
      vi.setSystemTime(baseTime);

      const oldData: WeatherData = {
        temperature: 25.0,
        humidity: 60,
        weatherCode: 1,
        bonusMl: 0,
        locationName: 'Hà Nội',
        isFallback: false,
        timestamp: baseTime,
      };

      setCachedWeather(oldData, { latitude: 21.0285, longitude: 105.8542 });

      // Advance time by 31 minutes (exceeds 30-min TTL)
      vi.advanceTimersByTime(31 * 60 * 1000);

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          latitude: 21.0285,
          longitude: 105.8542,
          current: { temperature_2m: 33.0, relative_humidity_2m: 50, weather_code: 1 },
        }),
      } as Response);

      const weather = await fetchWeatherData(21.0285, 105.8542, false);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(weather.temperature).toBe(33.0);
      expect(weather.bonusMl).toBe(500); // Updated to > 32°C bonus
    });

    it('bypasses cache when requested coordinates differ by > 0.1 degree', async () => {
      vi.useFakeTimers();
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);

      // Cache stored for Hà Nội
      const hanoiData: WeatherData = {
        temperature: 26.0,
        humidity: 65,
        weatherCode: 1,
        bonusMl: 0,
        locationName: 'Hà Nội',
        isFallback: false,
        timestamp: baseTime,
      };
      setCachedWeather(hanoiData, { latitude: 21.0285, longitude: 105.8542 });

      // Request weather for Vinh (18.6734, 105.6813)
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          latitude: 18.6734,
          longitude: 105.6813,
          current: { temperature_2m: 31.0, relative_humidity_2m: 60, weather_code: 1 },
        }),
      } as Response);

      const weather = await fetchWeatherData(18.6734, 105.6813, false);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(weather.temperature).toBe(31.0);
    });

    it('returns expired cached weather with isOffline = true when network fails', async () => {
      vi.useFakeTimers();
      const baseTime = new Date('2026-10-30T10:00:00Z').getTime();
      vi.setSystemTime(baseTime);

      const previousData: WeatherData = {
        temperature: 31.0,
        humidity: 50,
        weatherCode: 1,
        bonusMl: 250,
        locationName: 'Hà Nội',
        isFallback: false,
        timestamp: baseTime,
      };
      setCachedWeather(previousData, { latitude: 21.0285, longitude: 105.8542 });

      // Advance by 2 hours (expired)
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      // Network fails
      fetchSpy.mockRejectedValueOnce(new TypeError('Network offline'));

      const weather = await fetchWeatherData(21.0285, 105.8542, false);

      expect(weather.isOffline).toBe(true);
      expect(weather.temperature).toBe(31.0);
      expect(weather.bonusMl).toBe(250);
    });

    it('clears weather cache properly on clearWeatherCache call', () => {
      expect(WEATHER_CACHE_KEY).toBe('voyager_weather_cache');
      expect(isCacheValid(null)).toBe(false);
      const data: WeatherData = {
        temperature: 25,
        humidity: 50,
        weatherCode: 1,
        bonusMl: 0,
        locationName: 'Hà Nội',
        isFallback: false,
        timestamp: Date.now(),
      };
      setCachedWeather(data, { latitude: 21.0285, longitude: 105.8542 });
      expect(getCachedWeather()).not.toBeNull();

      clearWeatherCache();
      expect(getCachedWeather()).toBeNull();
    });
  });
});
