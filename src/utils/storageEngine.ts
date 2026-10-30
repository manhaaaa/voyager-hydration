/**
 * Voyager's Cosmic Hydration - Dual-Layer Persistence Engine
 * File: src/utils/storageEngine.ts
 *
 * Dual-layer write-through storage architecture:
 * Layer 1: Synchronous window.localStorage for instant 0ms React hydration.
 * Layer 2: Asynchronous @capacitor/preferences for native mobile SharedPreferences persistence.
 */

import { Preferences } from '@capacitor/preferences';
import type { UserProfile } from '../types';

// ============================================================================
// Storage Keys & Constants
// ============================================================================

export const STORAGE_KEYS = {
  USER_PROFILE: 'voyager_user_profile',
  DAILY_LOGS: 'voyager_daily_logs',
  SETTINGS: 'voyager_settings',
  WEATHER_CACHE: 'voyager_weather_cache',
  STREAK: 'voyager_streak',
  LAST_EXPORT: 'voyager_last_export',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// ============================================================================
// Schemas & Types
// ============================================================================

export interface HydrationEntry {
  id: string;                      // e.g. "log_1730304000000"
  timestamp: number;               // Epoch millisecond
  time: string;                    // "HH:mm" formatted
  amountMl: number;                // 50, 150, 250, 500, etc.
  containerType?: 'cup' | 'bottle' | 'glass' | 'custom';
}

export interface DailyHydrationRecord {
  date: string;                    // "YYYY-MM-DD"
  targetMl: number;                // Target volume in ml
  consumedMl: number;              // Total consumed volume in ml
  entries: HydrationEntry[];       // Chronological logs
  isGoalReached: boolean;          // consumedMl >= targetMl
  weatherSnapshot?: {
    temperature: number;
    humidity: number;
    weatherCode: number;
    bonusMl: number;
    locationName: string;
  };
}

export type DailyLogsMap = Record<string, DailyHydrationRecord>;

export interface AppSettings {
  language: 'vi';
  unit: 'ml' | 'L';
  soundEnabled: boolean;
  selectedSound: 'ripple' | 'violin' | 'bubble';
  reminderEnabled: boolean;
  reminderMode: 'gentle' | 'smart' | 'regular';
  wakeTime: string;                // "07:00"
  sleepTime: string;               // "01:00"
  selectedTheme: string;           // "deep_space" | "nebula_aurora" | ...
  selectedCompanion: string;       // "Voyager Nguyên Bản" | ...
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Mạnh',
  weightKg: 60,
  heightCm: 170,
  age: 24,
  activityLevel: 'moderate',
  wakeTime: '07:00',
  bedTime: '01:00',
  autoWeatherAdjust: true,
  selectedCompanion: 'Voyager Nguyên Bản',
  selectedTheme: 'deep_space',
  unit: 'L',
  soundEnabled: true,
  customDailyTargetMl: null,
};

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'vi',
  unit: 'L',
  soundEnabled: true,
  selectedSound: 'ripple',
  reminderEnabled: true,
  reminderMode: 'smart',
  wakeTime: '07:00',
  sleepTime: '01:00',
  selectedTheme: 'deep_space',
  selectedCompanion: 'Voyager Nguyên Bản',
};

export interface ExportPayload {
  exportedAt: string;
  version: string;
  appName: string;
  profile: UserProfile;
  settings: AppSettings;
  logs: DailyLogsMap;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Checks if window.localStorage is accessible without throwing.
 */
function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

// ============================================================================
// Storage Layer Operations
// ============================================================================

/**
 * Layer 1: Synchronous read from localStorage (instant 0ms mount).
 * Gracefully returns fallback on missing key, parse error, or corrupted JSON.
 */
export function getStorageItem<T>(key: string, fallback: T): T {
  if (!isLocalStorageAvailable()) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[StorageEngine] Corrupted JSON in localStorage key "${key}". Returning fallback.`, err);
    return fallback;
  }
}

/**
 * Layer 2: Asynchronous read from native Capacitor Preferences (SharedPreferences / NSUserDefaults).
 */
export async function getFromPreferences<T>(key: string, fallback: T): Promise<T> {
  try {
    const { value } = await Preferences.get({ key });
    if (value === null || value === undefined) {
      return fallback;
    }
    return JSON.parse(value) as T;
  } catch (err) {
    console.warn(`[StorageEngine] Failed to read Preferences key "${key}". Returning fallback.`, err);
    return fallback;
  }
}

/**
 * Dual-Layer Write-Through:
 * 1. Synchronously updates localStorage for immediate React reactivity.
 * 2. Asynchronously persists to native Preferences.
 */
export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  const serialized = JSON.stringify(value);

  // Layer 1: Synchronous localStorage write
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(key, serialized);
    } catch (err) {
      console.error(`[StorageEngine] localStorage setItem failed for key "${key}":`, err);
    }
  }

  // Layer 2: Asynchronous native Preferences write
  try {
    await Preferences.set({ key, value: serialized });
  } catch (err) {
    console.error(`[StorageEngine] Preferences.set failed for key "${key}":`, err);
  }
}

/**
 * Removes item from both localStorage and native Preferences.
 */
export async function removeStorageItem(key: string): Promise<void> {
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      console.warn(`[StorageEngine] localStorage removeItem failed for "${key}":`, err);
    }
  }

  try {
    await Preferences.remove({ key });
  } catch (err) {
    console.warn(`[StorageEngine] Preferences.remove failed for "${key}":`, err);
  }
}

/**
 * Clears all known Voyager keys from both storage layers.
 */
export async function clearAllStorage(): Promise<void> {
  const keysToClear = Object.values(STORAGE_KEYS);

  if (isLocalStorageAvailable()) {
    try {
      for (const k of keysToClear) {
        window.localStorage.removeItem(k);
      }
    } catch (err) {
      console.warn('[StorageEngine] Error clearing localStorage:', err);
    }
  }

  try {
    for (const k of keysToClear) {
      await Preferences.remove({ key: k });
    }
  } catch (err) {
    console.warn('[StorageEngine] Error clearing Preferences:', err);
  }
}

/**
 * Startup Storage Reconciliation:
 * If Android OS memory pressure evicts localStorage, restores keys from native Preferences.
 */
export async function reconcileStorage(): Promise<void> {
  if (!isLocalStorageAvailable()) return;

  try {
    const { keys } = await Preferences.keys();
    for (const key of keys) {
      const localVal = window.localStorage.getItem(key);
      if (localVal === null) {
        const { value } = await Preferences.get({ key });
        if (value !== null) {
          window.localStorage.setItem(key, value);
        }
      }
    }
  } catch (err) {
    console.warn('[StorageEngine] Reconciliation pass encountered an error:', err);
  }
}

// ============================================================================
// Standard Interface Contracts (PROJECT.md)
// ============================================================================

export async function saveAppState<T>(key: string, data: T): Promise<void> {
  return setStorageItem<T>(key, data);
}

export async function loadAppState<T>(key: string, fallback: T): Promise<T> {
  // 1. Instant sync read from localStorage
  const syncVal = getStorageItem<T>(key, null as unknown as T);
  if (syncVal !== null && syncVal !== undefined) {
    return syncVal;
  }
  // 2. Fetch from Preferences and backfill localStorage
  const prefVal = await getFromPreferences<T>(key, fallback);
  if (prefVal !== fallback && isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(key, JSON.stringify(prefVal));
    } catch {}
  }
  return prefVal;
}

// ============================================================================
// Export Utilities (JSON & RFC-4180 CSV with UTF-8 BOM)
// ============================================================================

/**
 * Exports complete application state as formatted JSON string.
 */
export function exportDataAsJson(): string {
  const profile = getStorageItem<UserProfile>(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE);
  const settings = getStorageItem<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  const logs = getStorageItem<DailyLogsMap>(STORAGE_KEYS.DAILY_LOGS, {});

  const exportPayload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    appName: "Voyager's Cosmic Hydration",
    profile,
    settings,
    logs,
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * RFC-4180 compliant CSV cell escaper:
 * Wraps values containing commas, quotes, or newlines in double quotes and escapes quotes as "".
 */
export function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports daily hydration logs as RFC-4180 compliant UTF-8 CSV with BOM (\uFEFF)
 * for seamless compatibility with Microsoft Excel on Windows.
 * Columns: ['Ngày', 'Mục tiêu (ml)', 'Đã uống (ml)', 'Tỷ lệ (%)', 'Trạng thái', 'Số lần uống']
 */
export function exportDataAsCsv(): string {
  const headers = ['Ngày', 'Mục tiêu (ml)', 'Đã uống (ml)', 'Tỷ lệ (%)', 'Trạng thái', 'Số lần uống'];
  const logs = getStorageItem<DailyLogsMap>(STORAGE_KEYS.DAILY_LOGS, {});

  const sortedDates = Object.keys(logs).sort();
  const rows: string[] = [headers.join(',')];

  for (const dateKey of sortedDates) {
    const record = logs[dateKey];
    if (!record) continue;

    const targetMl = record.targetMl || 0;
    const consumedMl = record.consumedMl || 0;
    const ratioPct = targetMl > 0 ? ((consumedMl / targetMl) * 100).toFixed(1) + '%' : '0.0%';
    const status = record.isGoalReached || consumedMl >= targetMl ? 'Hoàn thành' : 'Đang thực hiện';
    const entriesCount = Array.isArray(record.entries) ? record.entries.length : 0;

    const row = [
      escapeCsvCell(record.date || dateKey),
      escapeCsvCell(targetMl),
      escapeCsvCell(consumedMl),
      escapeCsvCell(ratioPct),
      escapeCsvCell(status),
      escapeCsvCell(entriesCount),
    ].join(',');

    rows.push(row);
  }

  // Prepend UTF-8 Byte Order Mark (\uFEFF) for Vietnamese Excel support
  return '\uFEFF' + rows.join('\n');
}

/**
 * Triggers native browser or mobile file download.
 */
export function triggerDownload(filename: string, content: string, mimeType: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
