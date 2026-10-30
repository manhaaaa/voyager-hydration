/**
 * Challenger 2 Verification & Adversarial Stress Harness
 * Milestone 1: Scaffolding & Core Hydration Engine
 * Target: src/utils/hydrationEngine.ts
 *
 * Requirements Challenged:
 * 1. Cumulative weather logic ($W_{weather}$): 6 combinations of temp (<28, 28-32, >32) and humidity (<40, >=40)
 *    yielding exact expected deltas (+0, +150, +250, +400, +500, +650 ml).
 * 2. formatWaterVolume Vietnamese notation verification: '2,0 L', '2,15 L', '1,6 L', etc.
 * 3. Remaining cups ceiling division logic with various deficits and cup sizes.
 * 4. Weather cache expiration under artificial time acceleration (30m TTL, boundary, distance shift, offline fallback).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateWeatherBonus,
  calculateDailyWaterGoal,
  formatWaterVolume,
  calculateRemainingCups,
  getRemainingPromptText,
  getCachedWeather,
  setCachedWeather,
  isCacheValid,
  fetchWeatherData,
  WEATHER_CACHE_TTL_MS,
  FALLBACK_LOCATIONS,
} from '../../src/utils/hydrationEngine';
import type { WeatherData, OpenMeteoCurrentResponse, ActivityLevel } from '../../src/types';

// In-memory localStorage polyfill for Node.js
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

describe('Challenger 2 Empirical Verification: Hydration Engine', () => {
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
  // 1. Cumulative Weather Logic ($W_{weather}$) Exhaustive Matrix
  // ==========================================================================
  describe('1. Cumulative Weather Logic Matrix ($W_{weather}$)', () => {
    const canonicalMatrix = [
      {
        temp: 20,
        humidity: 50,
        desc: 'Temp < 28°C (20°C) and Humidity >= 40% (50%)',
        expectedTemp: 0,
        expectedHumid: 0,
        expectedTotal: 0,
      },
      {
        temp: 22,
        humidity: 35,
        desc: 'Temp < 28°C (22°C) and Humidity < 40% (35%)',
        expectedTemp: 0,
        expectedHumid: 150,
        expectedTotal: 150,
      },
      {
        temp: 30,
        humidity: 60,
        desc: 'Temp 28-32°C (30°C) and Humidity >= 40% (60%)',
        expectedTemp: 250,
        expectedHumid: 0,
        expectedTotal: 250,
      },
      {
        temp: 30,
        humidity: 35,
        desc: 'Temp 28-32°C (30°C) and Humidity < 40% (35%)',
        expectedTemp: 250,
        expectedHumid: 150,
        expectedTotal: 400,
      },
      {
        temp: 35,
        humidity: 55,
        desc: 'Temp > 32°C (35°C) and Humidity >= 40% (55%)',
        expectedTemp: 500,
        expectedHumid: 0,
        expectedTotal: 500,
      },
      {
        temp: 38,
        humidity: 25,
        desc: 'Temp > 32°C (38°C) and Humidity < 40% (25%)',
        expectedTemp: 500,
        expectedHumid: 150,
        expectedTotal: 650,
      },
    ];

    canonicalMatrix.forEach(({ temp, humidity, desc, expectedTemp, expectedHumid, expectedTotal }) => {
      it(`evaluates ${desc} -> exact delta +${expectedTotal} ml`, () => {
        const bonus = calculateWeatherBonus(temp, humidity);
        expect(bonus.tempBonus).toBe(expectedTemp);
        expect(bonus.humidBonus).toBe(expectedHumid);
        expect(bonus.total).toBe(expectedTotal);
      });
    });

    describe('Micro-boundary threshold tests', () => {
      it('verifies boundary around 28.0°C (27.999°C vs 28.000°C)', () => {
        expect(calculateWeatherBonus(27.999, 50).tempBonus).toBe(0);
        expect(calculateWeatherBonus(28.000, 50).tempBonus).toBe(250);
        expect(calculateWeatherBonus(28.001, 50).tempBonus).toBe(250);
      });

      it('verifies boundary around 32.0°C (31.999°C vs 32.000°C vs 32.001°C)', () => {
        expect(calculateWeatherBonus(31.999, 50).tempBonus).toBe(250);
        expect(calculateWeatherBonus(32.000, 50).tempBonus).toBe(250);
        expect(calculateWeatherBonus(32.001, 50).tempBonus).toBe(500);
      });

      it('verifies boundary around 40.0% humidity (39.999% vs 40.000% vs 40.001%)', () => {
        expect(calculateWeatherBonus(25, 39.999).humidBonus).toBe(150);
        expect(calculateWeatherBonus(25, 40.000).humidBonus).toBe(0);
        expect(calculateWeatherBonus(25, 40.001).humidBonus).toBe(0);
      });

      it('safely handles extreme temperatures and humidities', () => {
        expect(calculateWeatherBonus(-20, 80).total).toBe(0);
        expect(calculateWeatherBonus(50, 10).total).toBe(650);
        expect(calculateWeatherBonus(0, 0).total).toBe(150);
        expect(calculateWeatherBonus(30, 100).total).toBe(250);
        expect(calculateWeatherBonus(NaN, 50).total).toBe(0);
        expect(calculateWeatherBonus(30, NaN).total).toBe(250);
      });
    });
  });

  // ==========================================================================
  // 2. formatWaterVolume Vietnamese Notation
  // ==========================================================================
  describe('2. formatWaterVolume Vietnamese Notation', () => {
    it('verifies exact Vietnamese string outputs specified in requirements', () => {
      expect(formatWaterVolume(2000, 'L')).toBe('2,0 L');
      expect(formatWaterVolume(2150, 'L')).toBe('2,15 L');
      expect(formatWaterVolume(1600, 'L')).toBe('1,6 L');
    });

    it('formats milliliter values correctly with "ml" suffix', () => {
      expect(formatWaterVolume(0, 'ml')).toBe('0 ml');
      expect(formatWaterVolume(250, 'ml')).toBe('250 ml');
      expect(formatWaterVolume(2150, 'ml')).toBe('2150 ml');
    });

    it('formats single decimal for tenths and two decimals for 50ml fractions', () => {
      expect(formatWaterVolume(0, 'L')).toBe('0,0 L');
      expect(formatWaterVolume(50, 'L')).toBe('0,05 L');
      expect(formatWaterVolume(100, 'L')).toBe('0,1 L');
      expect(formatWaterVolume(250, 'L')).toBe('0,25 L');
      expect(formatWaterVolume(500, 'L')).toBe('0,5 L');
      expect(formatWaterVolume(1000, 'L')).toBe('1,0 L');
      expect(formatWaterVolume(1050, 'L')).toBe('1,05 L');
      expect(formatWaterVolume(2700, 'L')).toBe('2,7 L');
      expect(formatWaterVolume(3500, 'L')).toBe('3,5 L');
    });

    it('never contains period as decimal separator in Liter mode', () => {
      for (let ml = 0; ml <= 5000; ml += 50) {
        const str = formatWaterVolume(ml, 'L');
        expect(str).toContain(',');
        expect(str).not.toContain('.');
        expect(str.endsWith(' L')).toBe(true);
      }
    });

    it('defensively handles invalid or negative amounts', () => {
      expect(formatWaterVolume(-250, 'L')).toBe('0,0 L');
      expect(formatWaterVolume(-250, 'ml')).toBe('0 ml');
      expect(formatWaterVolume(NaN, 'L')).toBe('0,0 L');
      expect(formatWaterVolume(NaN, 'ml')).toBe('0 ml');
      expect(formatWaterVolume(undefined as any, 'L')).toBe('0,0 L');
    });
  });

  // ==========================================================================
  // 3. Remaining Cups Ceiling Division Logic
  // ==========================================================================
  describe('3. Remaining Cups Ceiling Division Logic', () => {
    it('calculates ceiling cups with standard 250ml cup', () => {
      expect(calculateRemainingCups(2000, 2000, 250)).toBe(0);
      expect(calculateRemainingCups(2000, 2500, 250)).toBe(0);
      expect(calculateRemainingCups(2000, 1750, 250)).toBe(1); // 250 deficit -> 1
      expect(calculateRemainingCups(2000, 1749, 250)).toBe(2); // 251 deficit -> 2
      expect(calculateRemainingCups(2000, 1500, 250)).toBe(2); // 500 deficit -> 2
      expect(calculateRemainingCups(2000, 1000, 250)).toBe(4); // 1000 deficit -> 4
      expect(calculateRemainingCups(2000, 0, 250)).toBe(8);    // 2000 deficit -> 8
      expect(calculateRemainingCups(2000, 1999, 250)).toBe(1); // 1ml deficit -> 1
    });

    it('handles various custom cup sizes (150ml, 200ml, 330ml, 500ml)', () => {
      expect(calculateRemainingCups(2000, 1000, 150)).toBe(7); // ceil(1000/150) = 7
      expect(calculateRemainingCups(2000, 1500, 200)).toBe(3); // ceil(500/200) = 3
      expect(calculateRemainingCups(2000, 1000, 330)).toBe(4); // ceil(1000/330) = 4
      expect(calculateRemainingCups(2000, 1200, 500)).toBe(2); // ceil(800/500) = 2
    });

    it('safeguards against degenerate or zero cup sizes without division by zero', () => {
      // 0 or NaN cup size defaults to 250: 1000 / 250 = 4
      expect(calculateRemainingCups(2000, 1000, 0)).toBe(4);
      expect(calculateRemainingCups(2000, 1000, NaN)).toBe(4);
      // Negative cup size (-50) evaluates truthy, safeCup clamped to 1ml -> 1000 cups
      expect(calculateRemainingCups(2000, 1000, -50)).toBe(1000);
    });

    it('generates prompt text in Vietnamese', () => {
      expect(getRemainingPromptText(0)).toBe('Mục tiêu hoàn thành! ✨');
      expect(getRemainingPromptText(-1)).toBe('Mục tiêu hoàn thành! ✨');
      expect(getRemainingPromptText(1)).toBe('Thêm 1 ly >');
      expect(getRemainingPromptText(3)).toBe('Thêm 3 ly >');
    });
  });

  // ==========================================================================
  // 4. Weather Cache Expiration under Artificial Time Acceleration
  // ==========================================================================
  describe('4. Weather Cache Expiration under Artificial Time Acceleration', () => {
    const HANOI_COORDS = FALLBACK_LOCATIONS.HANOI;
    const START_TIME = new Date('2026-10-30T10:00:00.000Z').getTime();

    const cachedWeather: WeatherData = {
      temperature: 29.0,
      humidity: 50.0,
      weatherCode: 1,
      bonusMl: 250,
      locationName: 'Hà Nội',
      isFallback: false,
      timestamp: START_TIME,
      isOffline: false,
    };

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(START_TIME);
    });

    it('hits cache within TTL (< 30 minutes) without making network calls', async () => {
      setCachedWeather(cachedWeather, HANOI_COORDS);

      // Advance by 10 minutes (600,000 ms)
      vi.advanceTimersByTime(10 * 60 * 1000);
      let data = await fetchWeatherData(HANOI_COORDS.latitude, HANOI_COORDS.longitude, false);
      expect(data.temperature).toBe(29.0);
      expect(fetchSpy).not.toHaveBeenCalled();

      // Advance by another 19 minutes (total 29m elapsed: 1,740,000 ms < 1,800,000 ms TTL)
      vi.advanceTimersByTime(19 * 60 * 1000);
      data = await fetchWeatherData(HANOI_COORDS.latitude, HANOI_COORDS.longitude, false);
      expect(data.temperature).toBe(29.0);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('expires cache and calls network at exactly 30 minutes (1,800,000 ms)', async () => {
      setCachedWeather(cachedWeather, HANOI_COORDS);

      // Advance time by exactly 30 minutes
      vi.advanceTimersByTime(WEATHER_CACHE_TTL_MS);

      // Cache is now expired (Date.now() - entry.timestamp is not < 1800000)
      expect(isCacheValid(getCachedWeather(), HANOI_COORDS.latitude, HANOI_COORDS.longitude)).toBe(false);

      const mockResponse: OpenMeteoCurrentResponse = {
        latitude: HANOI_COORDS.latitude,
        longitude: HANOI_COORDS.longitude,
        current: {
          time: '2026-10-30T10:30',
          interval: 900,
          temperature_2m: 33.5, // Hot > 32°C (+500ml)
          relative_humidity_2m: 38, // Arid < 40% (+150ml)
          weather_code: 0,
        },
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const refreshed = await fetchWeatherData(HANOI_COORDS.latitude, HANOI_COORDS.longitude, false);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(refreshed.temperature).toBe(33.5);
      expect(refreshed.humidity).toBe(38);
      expect(refreshed.bonusMl).toBe(650);
      expect(refreshed.isOffline).toBe(false);
    });

    it('invalidates cache when requested coordinates differ by >= 0.1 degree', async () => {
      setCachedWeather(cachedWeather, HANOI_COORDS);

      // Move to Vinh (18.6734, 105.6813), which is > 2 degrees away
      expect(isCacheValid(getCachedWeather(), FALLBACK_LOCATIONS.VINH.latitude, FALLBACK_LOCATIONS.VINH.longitude)).toBe(false);

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          latitude: FALLBACK_LOCATIONS.VINH.latitude,
          longitude: FALLBACK_LOCATIONS.VINH.longitude,
          current: { temperature_2m: 26.0, relative_humidity_2m: 75, weather_code: 1 },
        }),
      } as Response);

      const vinhWeather = await fetchWeatherData(FALLBACK_LOCATIONS.VINH.latitude, FALLBACK_LOCATIONS.VINH.longitude, false);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(vinhWeather.temperature).toBe(26.0);
    });

    it('returns stale cache with isOffline = true when network fails after TTL expiration', async () => {
      setCachedWeather(cachedWeather, HANOI_COORDS);

      // Advance by 3 hours
      vi.advanceTimersByTime(3 * 60 * 60 * 1000);

      fetchSpy.mockRejectedValueOnce(new TypeError('Network offline'));

      const fallback = await fetchWeatherData(HANOI_COORDS.latitude, HANOI_COORDS.longitude, false);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fallback.isOffline).toBe(true);
      expect(fallback.temperature).toBe(29.0);
      expect(fallback.bonusMl).toBe(250);
    });
  });

  // ==========================================================================
  // 5. Property-Based Checks & Invariants
  // ==========================================================================
  describe('5. Mathematical Invariants & Property-Based Checks', () => {
    it('ensures calculateDailyWaterGoal is always a positive multiple of 50', () => {
      const activities: ActivityLevel[] = ['sedentary', 'moderate', 'high'];
      for (let i = 0; i < 200; i++) {
        const weight = Math.floor(Math.random() * 200) + 20; // 20 - 220kg
        const act = activities[i % activities.length];
        const bonus = Math.floor(Math.random() * 800);
        const goal = calculateDailyWaterGoal(weight, act, bonus);

        expect(goal % 50).toBe(0);
        expect(goal).toBeGreaterThanOrEqual(700);
      }
    });
  });
});
