// @vitest-environment jsdom
/**
 * Challenger 1 Empirical Verification & Adversarial Stress Harness
 * Milestone 2: Audio, Persistence & Voyager Chibi
 * Targets: src/utils/audioEngine.ts, src/utils/storageEngine.ts
 *
 * EMPIRICAL ADVERSARIAL CHALLENGES:
 * 1. Audio Engine Concurrency & Headroom:
 *    - 100 rapid sequential triggers of alternating themes ('ripple', 'violin', 'bubble', 'chime')
 *    - 100 parallel/concurrent triggers via Promise.all
 *    - Rapid tapping (100 sequential calls to playQuickTap())
 *    - Verification of finite node lifespan (all oscillators stop)
 *    - Master headroom gain strictly <= 0.8 across all volume scales
 * 2. Audio Headless Fallback & Error Resilience:
 *    - Missing AudioContext constructor (headless Node/SSR)
 *    - Throwing AudioContext constructor (SecurityError / DOMException)
 *    - Rejected resume() promise on suspended context
 * 3. Audio Global Mute Suppression:
 *    - Strict zero node creation when soundEnabled = false
 *    - Instant restoration upon unmuting
 * 4. Storage Engine Corrupted JSON Recovery:
 *    - Malformed syntax, truncated payloads, binary garbage, HTML error pages
 *    - Zero-throw fallback guarantees for getStorageItem, loadAppState, exportDataAsJson, exportDataAsCsv
 * 5. Storage RFC-4180 CSV Export with UTF-8 BOM & Vietnamese Unicode:
 *    - Full Vietnamese diacritic matrix (a-y with all 5 tones + đ) & celestial emojis
 *    - Exact UTF-8 BOM (\uFEFF / [0xEF, 0xBB, 0xBF]) verification
 *    - RFC-4180 round-trip integrity (quotes, commas, newlines)
 * 6. Storage Large Log Serialization & Scaling:
 *    - 365 days of realistic daily hydration records
 *    - CSV export payload strictly < 50KB
 *    - Serialization & roundtrip deserialization benchmark (< 50ms)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import {
  isAudioSupported,
  getAudioContext,
  unlockAudioContext,
  setAudioMuted,
  isAudioMuted,
  getAudioEngineStatus,
  playCosmicSound,
  playHydrationSound,
  playQuickTap,
  playGoalCelebrationFanfare,
  _setAudioContextForTesting,
  MASTER_HEADROOM_GAIN,
  type SoundThemeId,
} from '../../src/utils/audioEngine';
import {
  STORAGE_KEYS,
  DEFAULT_USER_PROFILE,
  DEFAULT_SETTINGS,
  getStorageItem,
  setStorageItem,
  loadAppState,
  exportDataAsJson,
  exportDataAsCsv,
  escapeCsvCell,
  type DailyLogsMap,
  type HydrationEntry,
} from '../../src/utils/storageEngine';
import type { UserProfile } from '../../src/types';

// ============================================================================
// Robust Mock Web Audio API Framework for Concurrency & Headroom Stress Testing
// ============================================================================

class MockAudioParam {
  value: number;
  timeline: Array<{ type: string; value: number; time: number }> = [];

  constructor(initialValue: number) {
    this.value = initialValue;
  }

  setValueAtTime(val: number, time: number) {
    this.value = val;
    this.timeline.push({ type: 'setValueAtTime', value: val, time });
    return this;
  }

  exponentialRampToValueAtTime(val: number, time: number) {
    this.value = val;
    this.timeline.push({ type: 'exponentialRampToValueAtTime', value: val, time });
    return this;
  }

  linearRampToValueAtTime(val: number, time: number) {
    this.value = val;
    this.timeline.push({ type: 'linearRampToValueAtTime', value: val, time });
    return this;
  }
}

interface MockNodeRecord {
  type: string;
  node: any;
  startTime?: number;
  stopTime?: number;
}

class StressMockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'running';
  currentTime: number = 0;
  destination = { channelCount: 2 };
  nodesCreated: MockNodeRecord[] = [];

  async resume(): Promise<void> {
    this.state = 'running';
  }

  createOscillator() {
    const osc: any = {
      type: 'sine',
      frequency: new MockAudioParam(440),
      detune: new MockAudioParam(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn((t = 0) => {
        const record = this.nodesCreated.find((n) => n.node === osc);
        if (record) record.startTime = t;
      }),
      stop: vi.fn((t = 0) => {
        const record = this.nodesCreated.find((n) => n.node === osc);
        if (record) record.stopTime = t;
      }),
    };
    this.nodesCreated.push({ type: 'oscillator', node: osc });
    return osc;
  }

  createGain() {
    const gainNode: any = {
      gain: new MockAudioParam(1),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.nodesCreated.push({ type: 'gain', node: gainNode });
    return gainNode;
  }

  createBiquadFilter() {
    const filter: any = {
      type: 'lowpass',
      frequency: new MockAudioParam(350),
      Q: new MockAudioParam(1),
      gain: new MockAudioParam(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.nodesCreated.push({ type: 'biquad-filter', node: filter });
    return filter;
  }

  createDelay() {
    const delay: any = {
      delayTime: new MockAudioParam(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.nodesCreated.push({ type: 'delay', node: delay });
    return delay;
  }
}

// ============================================================================
// Test Suite 1: Audio Engine Stress Testing
// ============================================================================

describe('Challenger 1 Empirical Stress: Audio Engine (audioEngine.ts)', () => {
  let mockCtx: StressMockAudioContext;

  beforeEach(() => {
    (globalThis as any).AudioContext = StressMockAudioContext;
    if (typeof window !== 'undefined') {
      (window as any).AudioContext = StressMockAudioContext;
    }
    mockCtx = new StressMockAudioContext();
    _setAudioContextForTesting(mockCtx as unknown as AudioContext);
    setAudioMuted(false);
  });

  afterEach(() => {
    delete (globalThis as any).AudioContext;
    if (typeof window !== 'undefined') {
      delete (window as any).AudioContext;
    }
    _setAudioContextForTesting(null);
    setAudioMuted(false);
  });

  describe('Adversarial Challenge 1.1: Rapid Multi-Triggering Concurrency & Memory Safety', () => {
    it('executes 100 rapid sequential triggers without audio degradation or unhandled errors', async () => {
      const themes: SoundThemeId[] = ['ripple', 'violin', 'bubble', 'chime'];
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const theme = themes[i % themes.length];
        await playCosmicSound(theme);
      }

      const elapsedMs = performance.now() - startTime;
      expect(elapsedMs).toBeLessThan(1000); // Must be lightweight and sub-second

      // Verify node allocation
      const oscillators = mockCtx.nodesCreated.filter((n) => n.type === 'oscillator');
      expect(oscillators.length).toBeGreaterThan(200);

      // Verify all oscillators have scheduled stop times (no orphaned/infinite oscillators)
      const unstoppedOscs = oscillators.filter((o) => o.stopTime === undefined || o.stopTime === null);
      expect(unstoppedOscs.length).toBe(0);

      // Verify stop times are finite (< 2.0 seconds after startTime)
      for (const osc of oscillators) {
        expect(osc.stopTime).toBeDefined();
        expect(osc.stopTime!).toBeGreaterThan(osc.startTime ?? 0);
        expect(osc.stopTime!).toBeLessThanOrEqual(2.0);
      }
    });

    it('handles 100 concurrent triggers launched via Promise.all without race conditions', async () => {
      const burstThemes: SoundThemeId[] = ['ripple', 'violin', 'bubble', 'ripple'];
      const promises = Array.from({ length: 100 }, (_, idx) =>
        playCosmicSound(burstThemes[idx % burstThemes.length])
      );

      await expect(Promise.all(promises)).resolves.not.toThrow();

      const allGains = mockCtx.nodesCreated.filter((n) => n.type === 'gain');
      // Each trigger creates at least 1 master gain bus
      expect(allGains.length).toBeGreaterThanOrEqual(100);
    });

    it('sustains 100 rapid tap blips (playQuickTap) without audio buffer overflow', () => {
      for (let i = 0; i < 100; i++) {
        expect(() => playQuickTap()).not.toThrow();
      }

      const oscs = mockCtx.nodesCreated.filter((n) => n.type === 'oscillator');
      expect(oscs.length).toBe(100);
      for (const osc of oscs) {
        expect(osc.stopTime).toBe(0.025);
      }
    });

    it('verifies Master Headroom Gain strictly enforces <= 0.8 across extreme volume parameters', async () => {
      expect(MASTER_HEADROOM_GAIN).toBeLessThanOrEqual(0.8);

      const testVolumes = [
        { input: 1.0, expectedMax: 0.8 },
        { input: 0.5, expectedMax: 0.8 },
        { input: 0.0, expectedMax: 0.8 },
        { input: 2.5, expectedMax: 0.8 },   // Over-unity volume: clamped to 1.0
        { input: -1.0, expectedMax: 0.8 },  // Negative volume: clamped to 0.0
      ];

      for (const tc of testVolumes) {
        await playCosmicSound('ripple', { volume: tc.input });
        // Find the most recently created master gain node
        const gains = mockCtx.nodesCreated.filter((n) => n.type === 'gain');
        const latestGain = gains[gains.length - 1];
        expect(latestGain.node.gain.value).toBeLessThanOrEqual(tc.expectedMax);
        expect(latestGain.node.gain.value).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Adversarial Challenge 1.2: Headless Fallback Resilience', () => {
    it('survives missing AudioContext constructor (Node/SSR/Headless WebKit)', async () => {
      _setAudioContextForTesting(null);
      delete (globalThis as any).AudioContext;
      if (typeof window !== 'undefined') {
        (window as any).AudioContext = undefined;
        (window as any).webkitAudioContext = undefined;
      }

      expect(isAudioSupported()).toBe(false);
      expect(getAudioContext()).toBeNull();

      const status = getAudioEngineStatus();
      expect(status.isSupported).toBe(false);
      expect(status.isUnlocked).toBe(false);
      expect(status.state).toBe('unsupported');

      // None of the playback functions should throw
      await expect(playCosmicSound('ripple')).resolves.not.toThrow();
      await expect(playCosmicSound('violin')).resolves.not.toThrow();
      await expect(playCosmicSound('bubble')).resolves.not.toThrow();
      await expect(playHydrationSound('ripple')).resolves.not.toThrow();
      expect(() => playQuickTap()).not.toThrow();
      await expect(playGoalCelebrationFanfare()).resolves.not.toThrow();

      const unlocked = await unlockAudioContext();
      expect(unlocked).toBe(false);
    });

    it('survives throwing AudioContext constructor (e.g. SecurityError in restrictive sandbox)', async () => {
      _setAudioContextForTesting(null);
      const ThrowingCtor = function () {
        throw new DOMException('AudioContext construction blocked by permissions policy', 'SecurityError');
      };
      (globalThis as any).AudioContext = ThrowingCtor;
      if (typeof window !== 'undefined') {
        (window as any).AudioContext = ThrowingCtor;
      }

      expect(getAudioContext()).toBeNull();
      await expect(playCosmicSound('bubble')).resolves.not.toThrow();
      expect(() => playQuickTap()).not.toThrow();
    });

    it('handles rejected resume() promise without unhandled rejections', async () => {
      mockCtx.state = 'suspended';
      mockCtx.resume = vi.fn().mockRejectedValue(new Error('Autoplay policy prevented context resumption'));

      const unlocked = await unlockAudioContext();
      expect(unlocked).toBe(false);

      // Playback still proceeds gracefully without throwing unhandled rejection
      await expect(playCosmicSound('ripple')).resolves.not.toThrow();
    });
  });

  describe('Adversarial Challenge 1.3: Global Mute Suppression', () => {
    it('strictly suppresses all audio node allocations when soundEnabled is false', async () => {
      setAudioMuted(true);
      expect(isAudioMuted()).toBe(true);

      const status = getAudioEngineStatus();
      expect(status.isMuted).toBe(true);

      // Trigger every audio API
      await playCosmicSound('ripple');
      await playCosmicSound('violin');
      await playCosmicSound('bubble');
      await playHydrationSound('ripple');
      playQuickTap();
      await playGoalCelebrationFanfare();

      // Zero nodes must be created
      expect(mockCtx.nodesCreated.length).toBe(0);

      // Unmute and verify immediate restoration
      setAudioMuted(false);
      expect(isAudioMuted()).toBe(false);
      await playCosmicSound('ripple');
      expect(mockCtx.nodesCreated.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Test Suite 2: Storage Engine Stress Testing
// ============================================================================

describe('Challenger 1 Empirical Stress: Storage Engine (storageEngine.ts)', () => {
  beforeEach(async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    await Preferences.clear();
  });

  describe('Adversarial Challenge 2.1: Corrupted JSON Recovery', () => {
    const maliciousCorruptedPayloads = [
      '{ invalid: json syntax',
      '{"unterminated": "string',
      '[1, 2, 3,',
      'undefined',
      'NaN',
      '<html><body>502 Bad Gateway</body></html>',
      '\x00\x01\x02\xFF\xFE\xFD',
      '}{',
      '{"deep": {"nested": {"broken":',
    ];

    it('recovers gracefully from all corrupted JSON strings in getStorageItem without crashing', () => {
      for (const payload of maliciousCorruptedPayloads) {
        window.localStorage.setItem('test_corrupted', payload);
        const fallback = { safe: true, timestamp: Date.now() };

        expect(() => {
          const result = getStorageItem('test_corrupted', fallback);
          expect(result).toEqual(fallback);
        }).not.toThrow();
      }
    });

    it('survives corrupted JSON in loadAppState and returns fallback', async () => {
      window.localStorage.setItem(STORAGE_KEYS.USER_PROFILE, '{bad profile json');
      const profile = await loadAppState<UserProfile>(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE);
      expect(profile).toEqual(DEFAULT_USER_PROFILE);
    });

    it('exportDataAsJson produces valid fallback JSON even if all keys in localStorage are corrupted', () => {
      window.localStorage.setItem(STORAGE_KEYS.USER_PROFILE, '<<corrupted>>');
      window.localStorage.setItem(STORAGE_KEYS.SETTINGS, '{broken settings');
      window.localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, '[broken logs');

      expect(() => {
        const jsonStr = exportDataAsJson();
        const parsed = JSON.parse(jsonStr);
        expect(parsed.appName).toBe("Voyager's Cosmic Hydration");
        expect(parsed.profile).toEqual(DEFAULT_USER_PROFILE);
        expect(parsed.settings).toEqual(DEFAULT_SETTINGS);
        expect(parsed.logs).toEqual({});
      }).not.toThrow();
    });

    it('exportDataAsCsv produces valid header-only CSV when DAILY_LOGS is corrupted', () => {
      window.localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, '{corrupted logs');

      expect(() => {
        const csv = exportDataAsCsv();
        expect(csv.charCodeAt(0)).toBe(0xfeff); // Still has BOM
        const lines = csv.slice(1).trim().split('\n');
        expect(lines.length).toBe(1);
        expect(lines[0]).toBe('Ngày,Mục tiêu (ml),Đã uống (ml),Tỷ lệ (%),Trạng thái,Số lần uống');
      }).not.toThrow();
    });
  });

  describe('Adversarial Challenge 2.2: Vietnamese Diacritics & Unicode Emojis in CSV Export', () => {
    it('prepends exact UTF-8 Byte Order Mark (\\uFEFF) to output', () => {
      const csv = exportDataAsCsv();
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv.charCodeAt(0)).toBe(0xfeff);

      // Verify UTF-8 byte representation
      const encoder = new TextEncoder();
      const bytes = encoder.encode(csv);
      expect(bytes[0]).toBe(0xef);
      expect(bytes[1]).toBe(0xbb);
      expect(bytes[2]).toBe(0xbf);
    });

    it('faithfully preserves Vietnamese diacritic tone marks and celestial emojis in CSV rows', async () => {
      const complexDiacriticsLogs: DailyLogsMap = {
        '2026-10-01': {
          date: '2026-10-01 (Ngày đầu tháng 🌌)',
          targetMl: 2200,
          consumedMl: 2400,
          isGoalReached: true,
          entries: [
            { id: '1', timestamp: 1, time: '08:00', amountMl: 500 },
            { id: '2', timestamp: 2, time: '12:30', amountMl: 1900 },
          ],
        },
        '2026-10-02': {
          date: '2026-10-02',
          targetMl: 2000,
          consumedMl: 1800,
          isGoalReached: false,
          entries: [
            { id: '3', timestamp: 3, time: '09:00', amountMl: 1800 },
          ],
        },
      };

      await setStorageItem(STORAGE_KEYS.DAILY_LOGS, complexDiacriticsLogs);

      const csv = exportDataAsCsv();
      expect(csv.charCodeAt(0)).toBe(0xfeff);

      const body = csv.slice(1);
      const lines = body.split('\n');

      expect(lines[0]).toBe('Ngày,Mục tiêu (ml),Đã uống (ml),Tỷ lệ (%),Trạng thái,Số lần uống');
      expect(lines[1]).toContain('2026-10-01 (Ngày đầu tháng 🌌),2200,2400,109.1%,Hoàn thành,2');
      expect(lines[2]).toContain('2026-10-02,2000,1800,90.0%,Đang thực hiện,1');
    });

    it('strictly satisfies RFC-4180 escaping rules for quotes, commas, and newlines', () => {
      // 1. Strings with quotes: "Voyager" -> """Voyager"""
      expect(escapeCsvCell('Voyager "Reverse 1999"')).toBe('"Voyager ""Reverse 1999"""');

      // 2. Strings with commas: "Hà Nội, Việt Nam" -> "\"Hà Nội, Việt Nam\""
      expect(escapeCsvCell('Hà Nội, Việt Nam')).toBe('"Hà Nội, Việt Nam"');

      // 3. Strings with newlines
      expect(escapeCsvCell('Dòng 1\nDòng 2')).toBe('"Dòng 1\nDòng 2"');
      expect(escapeCsvCell('Dòng 1\r\nDòng 2')).toBe('"Dòng 1\r\nDòng 2"');

      // 4. Strings with combination of quotes and commas
      expect(escapeCsvCell('Note: "Nước mát, đá lạnh"')).toBe('"Note: ""Nước mát, đá lạnh"""');

      // 5. Normal strings: no quoting needed
      expect(escapeCsvCell('ThànhPhốVinh')).toBe('ThànhPhốVinh');
      expect(escapeCsvCell(12345)).toBe('12345');
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
    });
  });

  describe('Adversarial Challenge 2.3: Large Log Serialization & Scaling (365 Days)', () => {
    /**
     * Generates 365 days of realistic hydration records
     */
    function generateYearOfHydrationLogs(): DailyLogsMap {
      const logs: DailyLogsMap = {};
      const startDate = new Date('2026-01-01T00:00:00Z');

      for (let day = 0; day < 365; day++) {
        const currentDate = new Date(startDate.getTime() + day * 86400000);
        const dateStr = currentDate.toISOString().slice(0, 10);

        const targetMl = 2000 + (day % 4) * 150; // 2000, 2150, 2300, 2450
        const consumedMl = (day % 5 === 0) ? targetMl - 300 : targetMl + 200; // 80% goal completion rate
        const isGoalReached = consumedMl >= targetMl;

        // 4 entries per day
        const entries: HydrationEntry[] = [
          { id: `entry_${day}_1`, timestamp: currentDate.getTime() + 8 * 3600000, time: '08:00', amountMl: 250, containerType: 'cup' },
          { id: `entry_${day}_2`, timestamp: currentDate.getTime() + 11 * 3600000, time: '11:00', amountMl: 500, containerType: 'bottle' },
          { id: `entry_${day}_3`, timestamp: currentDate.getTime() + 15 * 3600000, time: '15:00', amountMl: 500, containerType: 'bottle' },
          { id: `entry_${day}_4`, timestamp: currentDate.getTime() + 20 * 3600000, time: '20:00', amountMl: consumedMl - 1250, containerType: 'glass' },
        ];

        logs[dateStr] = {
          date: dateStr,
          targetMl,
          consumedMl,
          isGoalReached,
          entries,
          weatherSnapshot: {
            temperature: 28.5,
            humidity: 65,
            weatherCode: 1,
            bonusMl: 250,
            locationName: 'Hà Nội',
          },
        };
      }

      return logs;
    }

    it('exports 365 days of CSV hydration records strictly under 50KB', async () => {
      const yearLogs = generateYearOfHydrationLogs();
      await setStorageItem(STORAGE_KEYS.DAILY_LOGS, yearLogs);

      const t0 = performance.now();
      const csv = exportDataAsCsv();
      const durationMs = performance.now() - t0;

      // 1. Performance benchmark: must export in < 50ms
      expect(durationMs).toBeLessThan(50);

      // 2. Measure UTF-8 byte length
      const encoder = new TextEncoder();
      const csvBytes = encoder.encode(csv);
      const csvSizeKB = csvBytes.byteLength / 1024;

      // Assert < 50KB constraint
      expect(csvSizeKB).toBeLessThan(50);
      // Realistic expected size: 365 rows * ~45 bytes = ~16.5 KB
      expect(csvSizeKB).toBeGreaterThan(10);
      expect(csvSizeKB).toBeLessThan(25);

      // 3. Verify row count (1 BOM + header + 365 daily rows = 366 lines)
      const lines = csv.slice(1).trim().split('\n');
      expect(lines.length).toBe(366);
      expect(lines[0]).toBe('Ngày,Mục tiêu (ml),Đã uống (ml),Tỷ lệ (%),Trạng thái,Số lần uống');
      expect(lines[1]).toContain('2026-01-01');
      expect(lines[365]).toContain('2026-12-31');
    });

    it('demonstrates storage serialization efficiency and round-trip fidelity for 365 days', async () => {
      const yearLogs = generateYearOfHydrationLogs();
      await setStorageItem(STORAGE_KEYS.DAILY_LOGS, yearLogs);

      // Verify synchronous retrieval from localStorage
      const retrieved = getStorageItem<DailyLogsMap>(STORAGE_KEYS.DAILY_LOGS, {});
      expect(Object.keys(retrieved).length).toBe(365);

      // Verify date continuity from Jan 1 to Dec 31
      expect(retrieved['2026-01-01'].date).toBe('2026-01-01');
      expect(retrieved['2026-12-31'].date).toBe('2026-12-31');

      // Verify entries integrity for arbitrary day
      expect(retrieved['2026-06-15'].entries.length).toBe(4);
      expect(retrieved['2026-06-15'].weatherSnapshot?.locationName).toBe('Hà Nội');
    });
  });
});
