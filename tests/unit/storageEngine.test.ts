// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import {
  STORAGE_KEYS,
  DEFAULT_USER_PROFILE,
  DEFAULT_SETTINGS,
  getStorageItem,
  getFromPreferences,
  setStorageItem,
  removeStorageItem,
  clearAllStorage,
  reconcileStorage,
  saveAppState,
  loadAppState,
  exportDataAsJson,
  exportDataAsCsv,
  escapeCsvCell,
  DailyLogsMap,
} from '../../src/utils/storageEngine';

describe('Dual-Layer Persistence Engine Unit Tests (storageEngine.ts)', () => {
  beforeEach(async () => {
    // Clear both in-memory localStorage and Capacitor Preferences
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    await Preferences.clear();
  });

  // --------------------------------------------------------------------------
  // 1. Synchronous Layer 1 (localStorage) Operations
  // --------------------------------------------------------------------------
  describe('Layer 1: Synchronous localStorage', () => {
    it('synchronously sets and retrieves values with zero latency', async () => {
      await setStorageItem('test_num', 12345);
      const val = getStorageItem('test_num', 0);
      expect(val).toBe(12345);
    });

    it('returns fallback value when key does not exist', () => {
      const fallback = { status: 'none' };
      const val = getStorageItem('non_existent_key', fallback);
      expect(val).toEqual(fallback);
    });

    it('recovers gracefully from corrupted JSON by returning fallback', () => {
      window.localStorage.setItem('corrupted_key', '{bad json');
      const fallback = { recovered: true };
      const val = getStorageItem('corrupted_key', fallback);
      expect(val).toEqual(fallback);
    });

    it('preserves Vietnamese Unicode characters and emojis intact', async () => {
      const payload = {
        name: 'Nguyễn Văn Mạnh 🌌',
        badge: '🔥 Chuỗi 7 ngày',
        motto: 'Uống nước ngân hà!',
      };
      await setStorageItem('unicode_profile', payload);
      const result = getStorageItem('unicode_profile', null);
      expect(result).toEqual(payload);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Asynchronous Layer 2 (Preferences) & Dual-Write
  // --------------------------------------------------------------------------
  describe('Layer 2: Native Preferences & Dual-Write', () => {
    it('setStorageItem writes to both localStorage and Capacitor Preferences', async () => {
      const payload = { targetMl: 2500, active: true };
      await setStorageItem('dual_key', payload);

      // Check Layer 1 (localStorage)
      const localVal = JSON.parse(window.localStorage.getItem('dual_key') || '{}');
      expect(localVal).toEqual(payload);

      // Check Layer 2 (Preferences)
      const prefVal = await getFromPreferences('dual_key', null);
      expect(prefVal).toEqual(payload);
    });

    it('getFromPreferences returns fallback if key is missing in Preferences', async () => {
      const val = await getFromPreferences('unknown_pref', 'default_val');
      expect(val).toBe('default_val');
    });

    it('removeStorageItem removes key from both layers', async () => {
      await setStorageItem('removable', { value: 99 });
      expect(getStorageItem('removable', null)).not.toBeNull();

      await removeStorageItem('removable');
      expect(getStorageItem('removable', null)).toBeNull();
      const prefVal = await getFromPreferences('removable', null);
      expect(prefVal).toBeNull();
    });

    it('clearAllStorage removes all Voyager storage keys from both layers', async () => {
      await setStorageItem(STORAGE_KEYS.USER_PROFILE, { name: 'Mạnh' });
      await setStorageItem(STORAGE_KEYS.DAILY_LOGS, { '2026-10-30': { consumedMl: 1000 } });

      await clearAllStorage();

      expect(getStorageItem(STORAGE_KEYS.USER_PROFILE, null)).toBeNull();
      expect(getStorageItem(STORAGE_KEYS.DAILY_LOGS, null)).toBeNull();
      expect(await getFromPreferences(STORAGE_KEYS.USER_PROFILE, null)).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 3. Storage Reconciliation
  // --------------------------------------------------------------------------
  describe('Storage Reconciliation (Eviction Recovery)', () => {
    it('restores purged localStorage keys from native Preferences', async () => {
      // 1. Populate both layers
      await setStorageItem(STORAGE_KEYS.STREAK, 15);
      await setStorageItem('custom_setting', 'cosmic_blue');

      // 2. Simulate Android WebView memory pressure purging app keys from localStorage
      window.localStorage.removeItem(STORAGE_KEYS.STREAK);
      window.localStorage.removeItem('custom_setting');
      expect(getStorageItem(STORAGE_KEYS.STREAK, 0)).toBe(0);

      // 3. Reconcile from Preferences
      await reconcileStorage();
      expect(getStorageItem(STORAGE_KEYS.STREAK, 0)).toBe(15);
      expect(getStorageItem('custom_setting', '')).toBe('cosmic_blue');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Standard Interface Contracts (PROJECT.md)
  // --------------------------------------------------------------------------
  describe('PROJECT.md Contract APIs (saveAppState / loadAppState)', () => {
    it('saveAppState writes through dual layers', async () => {
      await saveAppState('app_version', '1.0.0');
      const loaded = await loadAppState('app_version', '0.0.0');
      expect(loaded).toBe('1.0.0');
    });

    it('loadAppState retrieves from sync cache first', async () => {
      window.localStorage.setItem('cached_sync', JSON.stringify({ ok: true }));
      const result = await loadAppState('cached_sync', { ok: false });
      expect(result).toEqual({ ok: true });
    });

    it('loadAppState backfills localStorage when found only in Preferences', async () => {
      await Preferences.set({ key: 'pref_only', value: JSON.stringify({ backfilled: true }) });
      expect(window.localStorage.getItem('pref_only')).toBeNull();

      const result = await loadAppState('pref_only', null);
      expect(result).toEqual({ backfilled: true });
      expect(window.localStorage.getItem('pref_only')).toBe(JSON.stringify({ backfilled: true }));
    });
  });

  // --------------------------------------------------------------------------
  // 5. Data Export (JSON & RFC-4180 CSV with UTF-8 BOM)
  // --------------------------------------------------------------------------
  describe('Data Export Utilities', () => {
    it('exportDataAsJson generates parseable JSON payload with schema fields', async () => {
      await setStorageItem(STORAGE_KEYS.USER_PROFILE, { ...DEFAULT_USER_PROFILE, name: 'Thuyền trưởng' });
      await setStorageItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);

      const jsonStr = exportDataAsJson();
      const parsed = JSON.parse(jsonStr);

      expect(parsed.appName).toBe("Voyager's Cosmic Hydration");
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.profile.name).toBe('Thuyền trưởng');
      expect(parsed.settings.language).toBe('vi');
      expect(parsed.logs).toBeDefined();
    });

    it('escapeCsvCell correctly adheres to RFC-4180 escaping rules', () => {
      expect(escapeCsvCell('SimpleText')).toBe('SimpleText');
      expect(escapeCsvCell('Hello, World')).toBe('"Hello, World"');
      expect(escapeCsvCell('Quote "Test"')).toBe('"Quote ""Test"""');
      expect(escapeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
      expect(escapeCsvCell('Line1\rLine2')).toBe('"Line1\rLine2"');
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
      expect(escapeCsvCell(2500)).toBe('2500');
    });

    it('exportDataAsCsv produces UTF-8 BOM CSV with exact 6 headers', async () => {
      const logs: DailyLogsMap = {
        '2026-10-28': {
          date: '2026-10-28',
          targetMl: 2000,
          consumedMl: 2200,
          entries: [
            { id: '1', timestamp: 1, time: '08:00', amountMl: 500 },
            { id: '2', timestamp: 2, time: '12:00', amountMl: 1700 },
          ],
          isGoalReached: true,
        },
        '2026-10-29': {
          date: '2026-10-29',
          targetMl: 2000,
          consumedMl: 1500,
          entries: [{ id: '3', timestamp: 3, time: '09:00', amountMl: 1500 }],
          isGoalReached: false,
        },
      };

      await setStorageItem(STORAGE_KEYS.DAILY_LOGS, logs);

      const csv = exportDataAsCsv();
      // Verify UTF-8 BOM (\uFEFF)
      expect(csv.charCodeAt(0)).toBe(0xfeff);

      const cleanCsv = csv.slice(1);
      const lines = cleanCsv.trim().split('\n');

      // Check Headers
      expect(lines[0]).toBe('Ngày,Mục tiêu (ml),Đã uống (ml),Tỷ lệ (%),Trạng thái,Số lần uống');

      // Check rows in sorted chronological order
      expect(lines.length).toBe(3);
      expect(lines[1]).toContain('2026-10-28,2000,2200,110.0%,Hoàn thành,2');
      expect(lines[2]).toContain('2026-10-29,2000,1500,75.0%,Đang thực hiện,1');
    });

    it('exportDataAsCsv handles empty logs gracefully with only headers', async () => {
      await setStorageItem(STORAGE_KEYS.DAILY_LOGS, {});
      const csv = exportDataAsCsv();
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      const lines = csv.slice(1).trim().split('\n');
      expect(lines.length).toBe(1);
      expect(lines[0]).toBe('Ngày,Mục tiêu (ml),Đã uống (ml),Tỷ lệ (%),Trạng thái,Số lần uống');
    });
  });
});
