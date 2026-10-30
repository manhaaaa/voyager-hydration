/**
 * Adversarial Challenger Stress Harness
 * File: tests/unit/hydrationAdversarialStress.test.ts
 *
 * EMPIRICAL CHALLENGER STRESS SUITE:
 * 1. Extreme inputs: NaN, negative weights, zero weight, massive weights (10,000 kg), Infinity.
 * 2. Fractional temperatures around boundaries: 27.999°C vs 28.000°C, 32.000°C vs 32.001°C.
 * 3. Humidity extremes: negative humidity, 39.999%, 40.000%, 100%.
 * 4. Rounding edge cases across 10,000 random inputs to ensure all results strictly end in 00 or 50 ml.
 * 5. Live network failure simulation, GPS coordinate fallback, and corrupted cache recovery.
 * 6. Falsy weather API zero-values (0°C, 0% humidity, weather_code 0).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Geolocation } from '@capacitor/geolocation';
import {
  calculateBaseWater,
  calculateActivityWater,
  calculateWeatherBonus,
  calculateHydrationTarget,
  roundToNearest50,
  formatWaterVolume,
  calculateRemainingCups,
  getCachedWeather,
  setCachedWeather,
  fetchWeatherData,
  FALLBACK_LOCATIONS,
  WEATHER_CACHE_KEY,
  DEFAULT_MOCK_WEATHER,
} from '../../src/utils/hydrationEngine';
import type { ActivityLevel, WeatherData } from '../../src/types';

// Mock Capacitor Geolocation
vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: vi.fn(),
  },
}));

// Mock localStorage polyfill
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

describe('Adversarial Challenger Stress Tests — Hydration Engine', () => {
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

  // ==========================================================================
  // Test Set 1: Extreme Inputs & Adversarial Types
  // ==========================================================================
  describe('Adversarial Suite 1: Extreme Inputs & Type Corruption', () => {
    it('handles NaN, negative weights, zero weight, and sub-zero floats', () => {
      // Must fallback to default 60kg * 35 = 2100 ml
      expect(calculateBaseWater(NaN)).toBe(2100);
      expect(calculateBaseWater(0)).toBe(2100);
      expect(calculateBaseWater(-0)).toBe(2100);
      expect(calculateBaseWater(-1)).toBe(2100);
      expect(calculateBaseWater(-0.00001)).toBe(2100);
      expect(calculateBaseWater(-999999)).toBe(2100);
    });

    it('handles massive weights: 10,000 kg and beyond (clamping to MAX_WEIGHT_KG = 300)', () => {
      // Clamped to 300kg: 300 * 35 = 10500 ml
      expect(calculateBaseWater(10000)).toBe(10500);
      expect(calculateBaseWater(100000)).toBe(10500);
      expect(calculateBaseWater(1e12)).toBe(10500);
      expect(calculateBaseWater(Number.MAX_VALUE)).toBe(10500);
    });

    it('handles infinities: +Infinity and -Infinity', () => {
      // -Infinity is <= 0 -> default 2100
      expect(calculateBaseWater(-Infinity)).toBe(2100);
      // +Infinity is clamped to 300 -> 10500
      expect(calculateBaseWater(Infinity)).toBe(10500);
    });

    it('handles tiny positive numbers: clamped to MIN_WEIGHT_KG = 20 (700 ml)', () => {
      expect(calculateBaseWater(0.0001)).toBe(700);
      expect(calculateBaseWater(1)).toBe(700);
      expect(calculateBaseWater(19.999)).toBe(700);
      expect(calculateBaseWater(20.0)).toBe(700);
      expect(calculateBaseWater(20.001)).toBe(700);
    });

    it('handles runtime type confusion without throwing', () => {
      expect(calculateBaseWater(null as any)).toBe(2100);
      expect(calculateBaseWater(undefined as any)).toBe(2100);
      expect(calculateBaseWater('60' as any)).toBe(2100);
      expect(calculateBaseWater('invalid' as any)).toBe(2100);
      expect(calculateBaseWater({} as any)).toBe(2100);
      expect(calculateBaseWater([] as any)).toBe(2100);
      expect(calculateBaseWater(true as any)).toBe(2100);
    });

    it('handles activity levels with unknown or malicious strings', () => {
      expect(calculateActivityWater('sedentary')).toBe(0);
      expect(calculateActivityWater('moderate')).toBe(350);
      expect(calculateActivityWater('high')).toBe(700);

      // Adversarial inputs must safely fallback to moderate (350ml)
      expect(calculateActivityWater('ultra' as any)).toBe(350);
      expect(calculateActivityWater('' as any)).toBe(350);
      expect(calculateActivityWater(null as any)).toBe(350);
      expect(calculateActivityWater(undefined as any)).toBe(350);
      expect(calculateActivityWater(123 as any)).toBe(350);
    });
  });

  // ==========================================================================
  // Test Set 2: Fractional Temperatures Around Boundaries
  // ==========================================================================
  describe('Adversarial Suite 2: Fractional Temperatures Around Boundaries', () => {
    it('verifies boundary around 28.000°C with micro-increments', () => {
      // Below 28.0°C -> 0 ml
      expect(calculateWeatherBonus(27.0, 50).tempBonus).toBe(0);
      expect(calculateWeatherBonus(27.9, 50).tempBonus).toBe(0);
      expect(calculateWeatherBonus(27.99, 50).tempBonus).toBe(0);
      expect(calculateWeatherBonus(27.999, 50).tempBonus).toBe(0);
      expect(calculateWeatherBonus(27.999999, 50).tempBonus).toBe(0);

      // Exactly 28.000°C -> +250 ml
      expect(calculateWeatherBonus(28.0, 50).tempBonus).toBe(250);
      expect(calculateWeatherBonus(28.000001, 50).tempBonus).toBe(250);
      expect(calculateWeatherBonus(28.001, 50).tempBonus).toBe(250);
      expect(calculateWeatherBonus(28.1, 50).tempBonus).toBe(250);
    });

    it('verifies boundary around 32.000°C with micro-increments', () => {
      // 28.0°C to 32.0°C inclusive -> +250 ml
      expect(calculateWeatherBonus(31.9, 50).tempBonus).toBe(250);
      expect(calculateWeatherBonus(31.99, 50).tempBonus).toBe(250);
      expect(calculateWeatherBonus(31.999, 50).tempBonus).toBe(250);
      expect(calculateWeatherBonus(31.999999, 50).tempBonus).toBe(250);
      expect(calculateWeatherBonus(32.0, 50).tempBonus).toBe(250);

      // Above 32.000°C -> +500 ml
      expect(calculateWeatherBonus(32.000001, 50).tempBonus).toBe(500);
      expect(calculateWeatherBonus(32.001, 50).tempBonus).toBe(500);
      expect(calculateWeatherBonus(32.01, 50).tempBonus).toBe(500);
      expect(calculateWeatherBonus(32.1, 50).tempBonus).toBe(500);
      expect(calculateWeatherBonus(35.0, 50).tempBonus).toBe(500);
    });

    it('verifies extreme temperature ranges: sub-zero and planetary extremes', () => {
      // Sub-zero temperatures (< 28°C) -> 0 ml
      expect(calculateWeatherBonus(-273.15, 50).tempBonus).toBe(0);
      expect(calculateWeatherBonus(-50, 50).tempBonus).toBe(0);
      expect(calculateWeatherBonus(-0.01, 50).tempBonus).toBe(0);
      expect(calculateWeatherBonus(0, 50).tempBonus).toBe(0);

      // Extreme heat (> 32°C) -> 500 ml
      expect(calculateWeatherBonus(50, 50).tempBonus).toBe(500);
      expect(calculateWeatherBonus(100, 50).tempBonus).toBe(500);
      expect(calculateWeatherBonus(10000, 50).tempBonus).toBe(500);
    });

    it('verifies invalid temperature inputs (NaN, null, undefined, strings)', () => {
      expect(calculateWeatherBonus(NaN, 50)).toEqual({ total: 0, tempBonus: 0, humidBonus: 0 });
      expect(calculateWeatherBonus(null as any, 50)).toEqual({ total: 0, tempBonus: 0, humidBonus: 0 });
      expect(calculateWeatherBonus(undefined as any, 50)).toEqual({ total: 0, tempBonus: 0, humidBonus: 0 });
      expect(calculateWeatherBonus('30' as any, 50)).toEqual({ total: 0, tempBonus: 0, humidBonus: 0 });
    });
  });

  // ==========================================================================
  // Test Set 3: Humidity Extremes & Boundaries
  // ==========================================================================
  describe('Adversarial Suite 3: Humidity Extremes & Boundaries', () => {
    it('verifies boundary around 40.000% with micro-increments', () => {
      // Below 40.0% -> +150 ml
      expect(calculateWeatherBonus(25, 39.0).humidBonus).toBe(150);
      expect(calculateWeatherBonus(25, 39.9).humidBonus).toBe(150);
      expect(calculateWeatherBonus(25, 39.99).humidBonus).toBe(150);
      expect(calculateWeatherBonus(25, 39.999).humidBonus).toBe(150);
      expect(calculateWeatherBonus(25, 39.999999).humidBonus).toBe(150);

      // 40.000% and above -> 0 ml
      expect(calculateWeatherBonus(25, 40.0).humidBonus).toBe(0);
      expect(calculateWeatherBonus(25, 40.000001).humidBonus).toBe(0);
      expect(calculateWeatherBonus(25, 40.001).humidBonus).toBe(0);
      expect(calculateWeatherBonus(25, 40.1).humidBonus).toBe(0);
      expect(calculateWeatherBonus(25, 75.0).humidBonus).toBe(0);
    });

    it('verifies extreme humidity: negative humidity, 0%, 100%, and over-saturated 150%', () => {
      // 0% is < 40 -> +150 ml
      expect(calculateWeatherBonus(25, 0).humidBonus).toBe(150);
      // Negative humidity (sensor glitch) is < 40 -> +150 ml
      expect(calculateWeatherBonus(25, -10).humidBonus).toBe(150);
      expect(calculateWeatherBonus(25, -100).humidBonus).toBe(150);

      // 100% saturation -> 0 ml
      expect(calculateWeatherBonus(25, 100).humidBonus).toBe(0);
      // Over-saturated 150% -> 0 ml
      expect(calculateWeatherBonus(25, 150).humidBonus).toBe(0);
    });

    it('verifies invalid humidity values (NaN, null, undefined) safely return 0 bonus', () => {
      expect(calculateWeatherBonus(25, NaN).humidBonus).toBe(0);
      expect(calculateWeatherBonus(25, null as any).humidBonus).toBe(0);
      expect(calculateWeatherBonus(25, undefined as any).humidBonus).toBe(0);
      expect(calculateWeatherBonus(25, '30' as any).humidBonus).toBe(0);
    });
  });

  // ==========================================================================
  // Test Set 4: 10,000 Property-Based Randomized Rounding Invariant Checks
  // ==========================================================================
  describe('Adversarial Suite 4: 10,000 Property-Based Rounding Invariant Checks', () => {
    it('verifies roundToNearest50 strictly produces multiples of 50 across 10,000 random floats', () => {
      const failures: { input: number; output: number }[] = [];

      for (let i = 0; i < 10000; i++) {
        // Generate diverse numbers: positive, negative, zero, fractional
        const randomAmount = (Math.random() - 0.2) * 10000; // -2000 to +8000
        const rounded = roundToNearest50(randomAmount);

        // Invariant 1: Result must be divisible by 50 without remainder
        if (rounded % 50 !== 0) {
          failures.push({ input: randomAmount, output: rounded });
          continue;
        }

        // Invariant 2: String representation of rounded integer must end in '00' or '50'
        const absVal = Math.abs(rounded);
        const endsWith00Or50 = absVal % 100 === 0 || absVal % 100 === 50;
        if (!endsWith00Or50) {
          failures.push({ input: randomAmount, output: rounded });
        }
      }

      expect(failures).toHaveLength(0);
    });

    it('verifies calculateHydrationTarget strictly ends in 00 or 50 ml across 10,000 random profiles', () => {
      const activities: ActivityLevel[] = ['sedentary', 'moderate', 'high'];
      const failures: any[] = [];

      for (let i = 0; i < 10000; i++) {
        const weightKg = Math.random() * 350 - 20; // -20 to 330 kg
        const activityLevel = activities[Math.floor(Math.random() * activities.length)];
        const temperature = Math.random() * 70 - 15; // -15 to 55°C
        const humidity = Math.random() * 120 - 10; // -10 to 110%
        const autoAdjust = Math.random() > 0.3;
        const customTarget = Math.random() > 0.8 ? Math.round(Math.random() * 5000) : undefined;

        const result = calculateHydrationTarget({
          weightKg,
          activityLevel,
          weather: {
            temperature,
            humidity,
            weatherCode: 1,
            bonusMl: 0,
            locationName: 'Test',
            isFallback: false,
            timestamp: Date.now(),
          },
          autoAdjustWeather: autoAdjust,
          customDailyTargetMl: customTarget,
        });

        // Invariant 1: targetMl is divisible by 50
        if (result.targetMl % 50 !== 0) {
          failures.push({ case: 'divisible_50', result });
          break;
        }

        // Invariant 2: targetMl % 100 must be 0 or 50
        const rem100 = result.targetMl % 100;
        if (rem100 !== 0 && rem100 !== 50) {
          failures.push({ case: 'ends_00_50', result });
          break;
        }

        // Invariant 3: formattedTarget adheres to Vietnamese format (e.g. "2,0 L", "2,15 L")
        const formatValid = /^\d+(,\d{1,2})? L$/.test(result.formattedTarget);
        if (!formatValid) {
          failures.push({ case: 'format_regex', formatted: result.formattedTarget });
          break;
        }

        // Invariant 4: Liters is strictly targetMl / 1000
        if (result.liters !== result.targetMl / 1000) {
          failures.push({ case: 'liters_mismatch', result });
          break;
        }

        // Invariant 5: targetMl must be >= 700 unless customDailyTarget is used
        if (!customTarget && result.targetMl < 700) {
          failures.push({ case: 'below_min_700', result });
          break;
        }
      }

      expect(failures).toHaveLength(0);
    });

    it('verifies formatWaterVolume strictly outputs Vietnamese comma format without dot', () => {
      expect(formatWaterVolume(2000, 'L')).toBe('2,0 L');
      expect(formatWaterVolume(2050, 'L')).toBe('2,05 L');
      expect(formatWaterVolume(2100, 'L')).toBe('2,1 L');
      expect(formatWaterVolume(2150, 'L')).toBe('2,15 L');
      expect(formatWaterVolume(2200, 'L')).toBe('2,2 L');
      expect(formatWaterVolume(0, 'L')).toBe('0,0 L');
      expect(formatWaterVolume(50, 'L')).toBe('0,05 L');
    });

    it('verifies calculateRemainingCups handles deficit edge cases without negative cups or NaN', () => {
      // Overconsumed
      expect(calculateRemainingCups(2000, 3000)).toBe(0);
      expect(calculateRemainingCups(2000, 2000)).toBe(0);

      // Fractional cups ceil
      expect(calculateRemainingCups(2000, 1950, 250)).toBe(1); // 50ml left -> 1 cup
      expect(calculateRemainingCups(2000, 1750, 250)).toBe(1); // 250ml left -> 1 cup
      expect(calculateRemainingCups(2000, 1749, 250)).toBe(2); // 251ml left -> 2 cups

      // Malicious or negative inputs
      expect(calculateRemainingCups(-100, 500)).toBe(0);
      expect(calculateRemainingCups(2000, -500)).toBe(8); // deficit = 2000 - 0 = 2000 -> 8 cups
      expect(calculateRemainingCups(2000, 0, 0)).toBe(8); // safeCup falls back to 250 -> 8 cups
      // Note: If negative cup size is passed (e.g. -50), safeCup clamps via Math.max(1, -50) = 1 ml, returning 2000 cups
      expect(calculateRemainingCups(2000, 0, -50)).toBe(2000);
    });
  });

  // ==========================================================================
  // Test Set 5: Network Failure & GPS Coordinate Fallback Simulation
  // ==========================================================================
  describe('Adversarial Suite 5: Network Failure & GPS Coordinate Fallback', () => {
    it('simulates GPS hardware timeout & permission rejection: falls back to Hà Nội', async () => {
      // Mock Geolocation rejection
      (Geolocation.getCurrentPosition as any).mockRejectedValue(
        new Error('Location services disabled by user')
      );

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          latitude: FALLBACK_LOCATIONS.HANOI.latitude,
          longitude: FALLBACK_LOCATIONS.HANOI.longitude,
          current: { temperature_2m: 29.0, relative_humidity_2m: 55, weather_code: 1 },
        }),
      } as Response);

      const weather = await fetchWeatherData(undefined, undefined, true);

      expect(weather.isFallback).toBe(true);
      expect(weather.locationName).toBe(FALLBACK_LOCATIONS.HANOI.name);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const url = fetchSpy.mock.calls[0][0];
      expect(url).toContain(`latitude=${FALLBACK_LOCATIONS.HANOI.latitude}`);
      expect(url).toContain(`longitude=${FALLBACK_LOCATIONS.HANOI.longitude}`);
    });

    it('simulates live network abort/timeout: returns fallback safely without throwing', async () => {
      fetchSpy.mockRejectedValueOnce(new DOMException('The user aborted a request.', 'AbortError'));

      const weather = await fetchWeatherData(21.0285, 105.8542, true);

      expect(weather.isOffline).toBe(true);
      expect(weather.temperature).toBe(DEFAULT_MOCK_WEATHER.temperature);
      expect(weather.humidity).toBe(DEFAULT_MOCK_WEATHER.humidity);
      expect(weather.bonusMl).toBe(0);
    });

    it('simulates DNS failure or complete offline mode (TypeError: Failed to fetch)', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch: net::ERR_INTERNET_DISCONNECTED'));

      const weather = await fetchWeatherData(21.0285, 105.8542, true);

      expect(weather.isOffline).toBe(true);
      expect(weather.temperature).toBe(26.0);
    });

    it('simulates server errors (HTTP 502 Bad Gateway & HTTP 503 Service Unavailable)', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
      } as Response);

      const weather = await fetchWeatherData(21.0285, 105.8542, true);
      expect(weather.isOffline).toBe(true);
    });

    it('simulates corrupted JSON payload from server (e.g. empty object or missing current)', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}), // Missing current
      } as Response);

      const weather = await fetchWeatherData(21.0285, 105.8542, true);
      expect(weather.isOffline).toBe(true);
      expect(weather.bonusMl).toBe(0);
    });

    it('recovers gracefully from corrupted localStorage weather cache', async () => {
      localStorage.setItem(WEATHER_CACHE_KEY, 'CORRUPTED_{{{NOT_JSON');

      expect(getCachedWeather()).toBeNull();

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          latitude: 21.0285,
          longitude: 105.8542,
          current: { temperature_2m: 27.0, relative_humidity_2m: 60, weather_code: 1 },
        }),
      } as Response);

      const weather = await fetchWeatherData(21.0285, 105.8542, false);
      expect(weather.temperature).toBe(27.0);
      expect(weather.isOffline).toBe(false);
    });

    it('falls back to expired stale cache marked isOffline=true when live network drops', async () => {
      vi.useFakeTimers();
      const baseTime = new Date('2026-10-30T08:00:00Z').getTime();
      vi.setSystemTime(baseTime);

      const staleData: WeatherData = {
        temperature: 34.0,
        humidity: 35.0,
        weatherCode: 0,
        bonusMl: 650,
        locationName: 'Vinh',
        isFallback: false,
        timestamp: baseTime,
      };
      setCachedWeather(staleData, { latitude: 18.6734, longitude: 105.6813 });

      // Advance by 3 hours (cache definitely expired)
      vi.advanceTimersByTime(3 * 3600 * 1000);

      // Live fetch fails
      fetchSpy.mockRejectedValueOnce(new TypeError('Network down'));

      const weather = await fetchWeatherData(18.6734, 105.6813, false);

      expect(weather.isOffline).toBe(true);
      expect(weather.temperature).toBe(34.0);
      expect(weather.humidity).toBe(35.0);
      expect(weather.bonusMl).toBe(650);
      expect(weather.locationName).toBe('Vinh');
    });
  });

  // ==========================================================================
  // Test Set 6: Adversarial Weather API Falsy Zero-Value Checks
  // ==========================================================================
  describe('Adversarial Suite 6: Open-Meteo Falsy Value Edge Cases (0°C, 0% humidity, code 0)', () => {
    it('investigates behavior when API returns temperature = 0°C', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          latitude: 21.0285,
          longitude: 105.8542,
          current: {
            temperature_2m: 0,
            relative_humidity_2m: 50,
            weather_code: 2,
          },
        }),
      } as Response);

      const weather = await fetchWeatherData(21.0285, 105.8542, true);
      // EMPIRICAL OBSERVATION:
      // In hydrationEngine.ts: `Number(json.current.temperature_2m) || 26.0`
      // Since Number(0) is falsy in JS, 0 || 26.0 evaluates to 26.0!
      // Therefore 0°C is replaced by 26.0°C.
      expect(weather.temperature).toBe(26.0);
    });

    it('investigates behavior when API returns relative_humidity = 0%', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          latitude: 21.0285,
          longitude: 105.8542,
          current: {
            temperature_2m: 25.0,
            relative_humidity_2m: 0,
            weather_code: 1,
          },
        }),
      } as Response);

      const weather = await fetchWeatherData(21.0285, 105.8542, true);
      // EMPIRICAL OBSERVATION:
      // In hydrationEngine.ts: `Number(json.current.relative_humidity_2m) || 60`
      // Since Number(0) is falsy in JS, 0 || 60 evaluates to 60!
      // This causes humidity to be treated as 60% instead of 0%, so humidBonus is 0 instead of 150ml.
      expect(weather.humidity).toBe(60);
      expect(weather.bonusMl).toBe(0); // Expected 150 if 0% were preserved, but 0 is received due to || fallback
    });

    it('investigates behavior when API returns weather_code = 0 (Clear Sky)', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          latitude: 21.0285,
          longitude: 105.8542,
          current: {
            temperature_2m: 25.0,
            relative_humidity_2m: 50,
            weather_code: 0,
          },
        }),
      } as Response);

      const weather = await fetchWeatherData(21.0285, 105.8542, true);
      // EMPIRICAL OBSERVATION:
      // In hydrationEngine.ts: `Number(json.current.weather_code) || 1`
      // Since 0 || 1 evaluates to 1, code 0 (Clear Sky) evaluates to 1 (Partly Cloudy).
      expect(weather.weatherCode).toBe(1);
    });
  });
});
