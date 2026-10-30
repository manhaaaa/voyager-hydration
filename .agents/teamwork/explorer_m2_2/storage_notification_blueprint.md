# Technical Blueprint: Dual-Layer Storage Engine & Notification Engine
**Document ID**: BLUEPRINT-M2-STORAGE-NOTIFICATION  
**Author**: teamwork_explorer (Explorer 2)  
**Milestone**: Milestone 2 — Audio, Persistence & Voyager Chibi  
**Target Files**:
- `src/utils/storageEngine.ts`
- `src/utils/notificationEngine.ts`  
**Dependencies**:
- `@capacitor/preferences`: `^7.0.0`
- `@capacitor/local-notifications`: `^7.0.0`
- `@capacitor/core`: `^7.0.0`

---

## 1. Executive Summary & Architectural Motivation

Milestone 2 requires establishing resilient offline persistence and local reminder automation for the *Voyager's Cosmic Hydration* application:

1. **Dual-Layer Persistence (`src/utils/storageEngine.ts`)**:
   - **The 0ms Hydration Problem**: Pure asynchronous storage mechanisms (such as `@capacitor/preferences` which returns Promises) induce React mounting latency, creating UI layout shift, empty flashes, or unnecessary loading spinners.
   - **The WebView Eviction Problem**: In hybrid Android Capacitor environments, the underlying WebView can purge standard HTML5 `localStorage` during operating system memory pressure or WebView background updates.
   - **Solution**: A unified Dual-Layer Write-Through architecture. Synchronous reads and writes target `localStorage` for instant 0ms mount, while all writes asynchronously replicate to native `@capacitor/preferences` (Android `SharedPreferences`). At boot time, a reconciliation pass restores missing or corrupted `localStorage` keys from native storage.
   - **Export Facilities**: Full JSON export and RFC-4180 compliant UTF-8 CSV history export (`['Ngày', 'Mục tiêu (ml)', 'Đã uống (ml)', 'Tỷ lệ (%)', 'Trạng thái', 'Số lần uống']`).

2. **Local Notification Scheduler (`src/utils/notificationEngine.ts`)**:
   - **Android 13+ Compliance**: Native integration with `@capacitor/local-notifications`, high-importance channel configuration (`voyager_hydration_reminders`), and runtime `POST_NOTIFICATIONS` permission negotiation.
   - **3 Reminder Modes**:
     * *Nhẹ nhàng* (Gentle): Fixed 180-minute (3h) interval.
     * *Thông minh* (Smart - Default): Dynamic interval based on deficit $\Delta W$, cups remaining $\lceil \Delta W / 250 \rceil$, and minutes to sleep, clamped strictly to $[45\text{m}, 150\text{m}]$.
     * *Đều đặn* (Regular): Fixed 90-minute (1.5h) interval.
   - **Strict Quiet Hours Lock (01:00 - 07:00)**: Complete suppression and deferral of alerts during sleep hours to ensure zero sleep disruption.
   - **Thematic Voyager Reverence**: All alerts utilize Reverse: 1999 cosmic Voyager phrasing (*ngân hà, tinh cầu, tiếng đàn violin*).

---

## 2. Blueprint 1: Dual-Layer Persistence Engine (`src/utils/storageEngine.ts`)

### 2.1 Architecture & Flow Diagram

```
                              +--------------------------------+
                              |   UI Component / Hook Mount    |
                              +---------------+----------------+
                                              |
                   +--------------------------+--------------------------+
                   |                                                     |
                   v (Synchronous Read: 0ms)                             v (Startup Boot: Reconcile)
       +-----------------------+                             +-------------------------------+
       |     localStorage      |                             |   reconcileStorage()          |
       | (Instant L1 Cache)    | <--------- Rehydrate ------ |   Check @capacitor/preferences|
       +-----------------------+                             +-------------------------------+
                   ^                                                         ^
                   |                                                         |
                   +--------------------------+------------------------------+
                                              |
                                              | Write-Through (setStorageItem)
                                              |
                               +--------------+---------------+
                               |  saveAppState / setItem      |
                               +------------------------------+
```

### 2.2 Storage Keys & Schema Contracts

```typescript
export const STORAGE_KEYS = {
  USER_PROFILE: 'voyager_user_profile',
  DAILY_LOGS: 'voyager_daily_logs',
  SETTINGS: 'voyager_settings',
  WEATHER_CACHE: 'voyager_weather_cache',
  STREAK: 'voyager_streak',
  LAST_EXPORT: 'voyager_last_export',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

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
  selectedSound: 'ripple' | 'violin' | 'chime';
  reminderEnabled: boolean;
  reminderMode: 'gentle' | 'smart' | 'regular';
  wakeTime: string;                // "07:00"
  sleepTime: string;               // "01:00"
  selectedTheme: string;           // "deep_space" | "nebula_aurora" | ...
  selectedCompanion: string;       // "Voyager Nguyên Bản" | ...
}

export const DEFAULT_USER_PROFILE = {
  name: 'Mạnh',
  weightKg: 60,
  heightCm: 170,
  age: 24,
  activityLevel: 'moderate' as const,
  wakeTime: '07:00',
  bedTime: '01:00',
  autoWeatherAdjust: true,
  selectedCompanion: 'Voyager Nguyên Bản',
  selectedTheme: 'deep_space',
  unit: 'L' as const,
  soundEnabled: true,
  customDailyTargetMl: null as number | null,
  streak: 0,
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
```

---

### 2.3 Implementation Specification for `src/utils/storageEngine.ts`

```typescript
import { Preferences } from '@capacitor/preferences';
import { STORAGE_KEYS, DEFAULT_USER_PROFILE, DEFAULT_SETTINGS } from '../types';
import type { UserProfile, DailyLogsMap, DailyHydrationRecord, AppSettings } from '../types';

/**
 * In-memory safe check for window.localStorage
 */
function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * 1. Synchronous Read from L1 Cache (localStorage)
 * Guarantees 0ms latency for React component initial mount.
 * Falls back to default if uninitialized, corrupted, or unavailable.
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
 * 2. Asynchronous Read from L2 Native Preferences
 * Used during startup reconciliation or explicit native fetch.
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
 * 3. Dual-Layer Write-Through Operation
 * Immediately updates synchronous localStorage and dispatches
 * non-blocking native Preferences write.
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
 * 4. Remove Item from Both Storage Layers
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
 * 5. Clear All Voyager Keys from Both Storage Layers
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
 * 6. Storage Reconciliation
 * Detects if localStorage was purged by Android OS memory reclamation
 * and re-populates it from native Preferences.
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

/**
 * Standard Interface Contracts required by PROJECT.md
 */
export async function saveAppState<T>(key: string, data: T): Promise<void> {
  return setStorageItem<T>(key, data);
}

export async function loadAppState<T>(key: string, fallback: T): Promise<T> {
  // First attempt fast sync read from localStorage
  const syncVal = getStorageItem<T>(key, null as unknown as T);
  if (syncVal !== null && syncVal !== undefined) {
    return syncVal;
  }
  // If not found in localStorage, fetch from Preferences and backfill
  const prefVal = await getFromPreferences<T>(key, fallback);
  if (prefVal !== fallback && isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(key, JSON.stringify(prefVal));
    } catch {}
  }
  return prefVal;
}
```

---

### 2.4 Data Export Utilities (`exportDataAsJson()`, `exportDataAsCsv()`)

#### 2.4.1 RFC-4180 Escaping Specification
CSV cells must escape internal commas, double quotes, and line breaks:
$$S_{escaped} = \begin{cases} \text{"} + \text{replace}(S, \text{"}, \text{""}) + \text{"} & \text{if } S \text{ contains } \{',', '"', '\backslash n', '\backslash r'\} \\ S & \text{otherwise} \end{cases}$$

#### 2.4.2 Export Implementation

```typescript
export interface ExportPayload {
  exportedAt: string;
  version: string;
  appName: string;
  profile: UserProfile;
  settings: AppSettings;
  logs: DailyLogsMap;
}

/**
 * Exports complete application state as a formatted JSON string.
 * Verified by tests 6.4 and 14.7.
 */
export function exportDataAsJson(): string {
  const profile = getStorageItem<UserProfile>(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE as UserProfile);
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
 * RFC-4180 CSV Cell Escaper
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
 * Exports daily hydration logs as RFC-4180 UTF-8 CSV with BOM for Vietnamese Excel compatibility.
 * Columns: ['Ngày', 'Mục tiêu (ml)', 'Đã uống (ml)', 'Tỷ lệ (%)', 'Trạng thái', 'Số lần uống']
 * Verified by tests 6.5, 6.10, and 14.8.
 */
export function exportDataAsCsv(): string {
  const headers = ['Ngày', 'Mục tiêu (ml)', 'Đã uống (ml)', 'Tỷ lệ (%)', 'Trạng thái', 'Số lần uống'];
  const logs = getStorageItem<DailyLogsMap>(STORAGE_KEYS.DAILY_LOGS, {});

  // Sort dates chronologically
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

  // Prepend UTF-8 BOM (\uFEFF) so Excel on Windows renders Vietnamese diacritics correctly
  return '\uFEFF' + rows.join('\n');
}

/**
 * Triggers native or browser file download
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
```

---

## 3. Blueprint 2: Local Notification Scheduler (`src/utils/notificationEngine.ts`)

### 3.1 Notification System Architecture & Flow

```
                      +------------------------------------------+
                      | scheduleNextReminders(params)           |
                      +--------------------+---------------------+
                                           |
                   +-----------------------+-----------------------+
                   |                                               |
                   v (If notifications disabled)                   v (If enabled)
       +-----------------------+                       +-------------------------------+
       | cancelAllReminders()  |                       | 1. Cancel previous pending    |
       | Clear scheduled queue |                       | 2. Compute candidate slots    |
       +-----------------------+                       +---------------+---------------+
                                                                       |
                                                                       v
                                                       +-------------------------------+
                                                       | Filter through Quiet Hours    |
                                                       | (01:00 - 07:00 check)         |
                                                       +---------------+---------------+
                                                                       |
                                                                       v
                                                       +-------------------------------+
                                                       | Map to Voyager Celestial Text |
                                                       | & LocalNotifications.schedule |
                                                       +-------------------------------+
```

### 3.2 Constants & Channels Configuration

```typescript
export const NOTIFICATION_CHANNEL_ID = 'voyager_hydration_reminders';
export const NOTIFICATION_CHANNEL_NAME = 'Nhắc nhở uống nước Voyager';
export const NOTIFICATION_CHANNEL_DESCRIPTION = 'Kênh thông báo nhắc nhở uống nước vũ trụ Reverse: 1999';

export const REMINDER_MODES = {
  GENTLE: 'gentle',
  SMART: 'smart',
  REGULAR: 'regular',
} as const;

export type ReminderMode = typeof REMINDER_MODES[keyof typeof REMINDER_MODES];

export const FIXED_INTERVALS = {
  GENTLE: 180, // 3 hours (180 minutes)
  REGULAR: 90,  // 1.5 hours (90 minutes)
} as const;

export const SMART_INTERVAL_BOUNDS = {
  MIN_MINUTES: 45,
  MAX_MINUTES: 150,
  DEFAULT_MINUTES: 110,
  GOAL_MET_MINUTES: 180,
} as const;
```

---

### 3.3 Core Mathematical Logic for Notification Scheduler

#### 3.3.1 Deficit-Adaptive Smart Interval Algorithm
$$\Delta W = \max(0, W_{target} - W_{consumed})$$
$$N_{glasses} = \begin{cases} 0 & \text{if } \Delta W = 0 \\ \left\lceil \frac{\Delta W}{250} \right\rceil & \text{if } \Delta W > 0 \end{cases}$$

$$\text{RawInterval} = \begin{cases} 180 & \text{if } N_{glasses} = 0 \\ \frac{\text{MinutesToSleep}}{N_{glasses}} & \text{if } N_{glasses} > 0 \end{cases}$$

$$\text{SmartInterval} = \text{clamp}(45, \text{round}(\text{RawInterval}), 150)$$

*Test Suite Verifications*:
- $660\text{ min awake}, 6\text{ glasses deficit} \implies 660 / 6 = 110\text{ min}$ (Test 7.3).
- $100\text{ min awake}, 5\text{ glasses deficit} \implies 20\text{ min} \to \text{clamped to } 45\text{ min}$ (Test 7.3).
- $600\text{ min awake}, 1\text{ glass deficit} \implies 600\text{ min} \to \text{clamped to } 150\text{ min}$ (Test 7.3).

```typescript
export function calculateSmartInterval(minutesToSleep: number, remainingGlasses: number): number {
  if (remainingGlasses <= 0) {
    return SMART_INTERVAL_BOUNDS.GOAL_MET_MINUTES; // 180 min
  }
  const raw = minutesToSleep / remainingGlasses;
  return Math.max(
    SMART_INTERVAL_BOUNDS.MIN_MINUTES,
    Math.min(SMART_INTERVAL_BOUNDS.MAX_MINUTES, Math.round(raw))
  );
}

export function calculateMinutesToBedtime(now: Date, bedtime = '01:00', wakeTime = '07:00'): number {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [sleepH, sleepM] = bedtime.split(':').map(Number);
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);

  const sleepMinutes = sleepH * 60 + sleepM;
  const wakeMinutes = wakeH * 60 + wakeM;

  if (sleepMinutes < wakeMinutes) {
    // Bedtime is past midnight (e.g. 01:00, while wakeTime is 07:00)
    if (currentMinutes >= wakeMinutes) {
      // It is currently between 07:00 and 23:59
      return (24 * 60 - currentMinutes) + sleepMinutes;
    } else if (currentMinutes < sleepMinutes) {
      // It is currently between 00:00 and 01:00
      return sleepMinutes - currentMinutes;
    } else {
      // Inside quiet hours (01:00 - 07:00)
      return 0;
    }
  } else {
    // Normal same-day bedtime (e.g. sleep at 23:00)
    return Math.max(0, sleepMinutes - currentMinutes);
  }
}
```

---

#### 3.3.2 Strict Quiet Hours Enforcement (01:00 - 07:00)

```typescript
/**
 * Evaluates whether a timestamp falls strictly within quiet sleep hours.
 * Handles cross-midnight schedules (e.g. 01:00 to 07:00).
 * Verified by tests 7.1, T3.10, T4.06.
 */
export function isInQuietHours(date: Date, wakeTime = '07:00', sleepTime = '01:00'): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentTotal = hours * 60 + minutes;

  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  const [sleepH, sleepM] = sleepTime.split(':').map(Number);
  const wakeTotal = wakeH * 60 + wakeM;     // 7 * 60 = 420
  const sleepTotal = sleepH * 60 + sleepM;   // 1 * 60 = 60

  if (sleepTotal < wakeTotal) {
    // Midnight crossover: 01:00 - 07:00 -> [60, 420)
    return currentTotal >= sleepTotal && currentTotal < wakeTotal;
  } else {
    // Standard night window (e.g. 23:00 - 07:00)
    return currentTotal >= sleepTotal || currentTotal < wakeTotal;
  }
}

/**
 * If scheduledDate falls in quiet hours, defers notification to wakeTime (07:00 AM).
 * Verified by test T4.06.
 */
export function adjustForQuietHours(scheduledDate: Date, wakeTime = '07:00', sleepTime = '01:00'): Date {
  if (!isInQuietHours(scheduledDate, wakeTime, sleepTime)) {
    return new Date(scheduledDate);
  }
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  const adjusted = new Date(scheduledDate);
  adjusted.setHours(wakeH, wakeM, 0, 0);

  // If wakeTime has already passed today, advance to wakeTime tomorrow
  if (adjusted.getTime() <= scheduledDate.getTime()) {
    adjusted.setDate(adjusted.getDate() + 1);
  }
  return adjusted;
}
```

---

### 3.4 Celestial Phrasing Matrix (Reverse: 1999 Voyager Theme)

Verified by Test 7.5 to strictly contain `'ngân hà'`, `'Voyager'`, or `'đàn'`:

```typescript
export interface ThematicNotificationTemplate {
  title: string;
  body: string;
  chibiMood: 'idle' | 'happy' | 'sleeping' | 'gentle' | 'strict';
}

export const VOYAGER_NOTIFICATIONS: ThematicNotificationTemplate[] = [
  {
    title: 'Voyager nhắc bạn ✨',
    body: 'Một nốt nhạc ngân hà vừa ngân lên... Hãy uống một ngụm nước để tinh cầu luôn tràn đầy sức sống nhé!',
    chibiMood: 'gentle',
  },
  {
    title: 'Vũ trụ khát nước rồi! 🌌',
    body: 'Vũ trụ khát nước rồi! Voyager đã chuẩn bị sẵn một ly nước mát cho bạn rồi đây!',
    chibiMood: 'idle',
  },
  {
    title: 'Tiếng đàn thúc giục 🎻',
    body: 'Tiếng đàn thúc giục 🎻: Chuyến du hành hôm nay sắp kết thúc mà mục tiêu nước vẫn chưa xong!',
    chibiMood: 'strict',
  },
  {
    title: 'Bình minh tinh cầu ☀️',
    body: 'Bình minh ngân hà thức giấc! Voyager chúc thuyền trưởng một ngày tràn đầy năng lượng cùng ly nước đầu tiên!',
    chibiMood: 'happy',
  },
  {
    title: 'Bản giao hưởng sao đêm 🌠',
    body: 'Mỗi giọt nước là một vì sao lấp lánh... Hãy nạp năng lượng cùng Voyager nào!',
    chibiMood: 'gentle',
  },
];
```

---

### 3.5 Complete `src/utils/notificationEngine.ts` Implementation

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import {
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_CHANNEL_NAME,
  NOTIFICATION_CHANNEL_DESCRIPTION,
  FIXED_INTERVALS,
  VOYAGER_NOTIFICATIONS,
} from '../types';
import type { ReminderMode } from '../types';

export interface ScheduleRemindersParams {
  enabled: boolean;
  mode: ReminderMode;
  targetMl: number;
  consumedMl: number;
  wakeTime?: string;     // Default: "07:00"
  sleepTime?: string;    // Default: "01:00"
  cupSize?: number;      // Default: 250
}

/**
 * 1. Initialize Android Notification Channel & Listeners
 * Required on Android 8.0+ (API 26)
 */
export async function initializeNotificationEngine(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return; // Browser environment no-op
  }

  try {
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: NOTIFICATION_CHANNEL_NAME,
      description: NOTIFICATION_CHANNEL_DESCRIPTION,
      importance: 4,      // High importance (heads-up banner)
      visibility: 1,      // Public on lockscreen
      vibration: true,
      sound: undefined,   // Default notification tone or custom bundle sound
    });
  } catch (err) {
    console.warn('[NotificationEngine] Channel creation error:', err);
  }
}

/**
 * 2. Check and Request Permissions (Android 13+ POST_NOTIFICATIONS)
 */
export async function checkPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return true;
  }
  try {
    const status = await LocalNotifications.checkPermissions();
    return status.display === 'granted';
  } catch {
    return false;
  }
}

export async function requestPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
    return true;
  }
  try {
    const status = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
  } catch {
    return false;
  }
}

/**
 * 3. Cancel All Scheduled Notifications
 * Verified by tests 7.4 and T3.09.
 */
export async function cancelAllReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map(n => ({ id: n.id })),
      });
    }
  } catch (err) {
    console.warn('[NotificationEngine] cancelAllReminders failed:', err);
  }
}

/**
 * 4. Schedule Rolling Reminders Pipeline
 * Schedules up to 5 rolling reminder slots adapted to current mode,
 * deficit, and quiet hours.
 */
export async function scheduleNextReminders(params: ScheduleRemindersParams): Promise<Date | null> {
  const {
    enabled,
    mode = 'smart',
    targetMl,
    consumedMl,
    wakeTime = '07:00',
    sleepTime = '01:00',
    cupSize = 250,
  } = params;

  // If reminders toggled off, cancel all and return null
  if (!enabled) {
    await cancelAllReminders();
    return null;
  }

  // Cancel any existing queued notifications before recalculating
  await cancelAllReminders();

  const now = new Date();
  const deficit = Math.max(0, targetMl - consumedMl);
  const remainingGlasses = deficit === 0 ? 0 : Math.ceil(deficit / cupSize);

  // Determine interval in minutes
  let intervalMinutes: number;
  if (mode === 'gentle') {
    intervalMinutes = FIXED_INTERVALS.GENTLE; // 180 min
  } else if (mode === 'regular') {
    intervalMinutes = FIXED_INTERVALS.REGULAR; // 90 min
  } else {
    // Mode: 'smart'
    const minutesToSleep = calculateMinutesToBedtime(now, sleepTime, wakeTime);
    intervalMinutes = calculateSmartInterval(minutesToSleep, remainingGlasses);
  }

  // Compute rolling schedule of 5 reminder slots
  const notificationsToSchedule: Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date };
    channelId: string;
    extra: Record<string, any>;
  }> = [];

  let nextScheduledTime: Date | null = null;
  let cursorTime = new Date(now.getTime() + intervalMinutes * 60 * 1000);

  for (let slot = 1; slot <= 5; slot++) {
    // Check & adjust for quiet hours (01:00 - 07:00)
    let slotTime = new Date(cursorTime);
    if (isInQuietHours(slotTime, wakeTime, sleepTime)) {
      slotTime = adjustForQuietHours(slotTime, wakeTime, sleepTime);
    }

    if (slot === 1) {
      nextScheduledTime = new Date(slotTime);
    }

    const templateIndex = (slot - 1) % VOYAGER_NOTIFICATIONS.length;
    const template = VOYAGER_NOTIFICATIONS[templateIndex];

    notificationsToSchedule.push({
      id: 2000 + slot,
      title: template.title,
      body: template.body,
      schedule: { at: slotTime },
      channelId: NOTIFICATION_CHANNEL_ID,
      extra: {
        slotIndex: slot,
        mode,
        deficitMl: deficit,
      },
    });

    // Advance cursor for next slot
    cursorTime = new Date(slotTime.getTime() + intervalMinutes * 60 * 1000);
  }

  if (Capacitor.isNativePlatform() && notificationsToSchedule.length > 0) {
    try {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule,
      });
    } catch (err) {
      console.warn('[NotificationEngine] LocalNotifications.schedule failed:', err);
    }
  }

  return nextScheduledTime;
}

/**
 * 5. Format Remaining Countdown String
 * Verified by test 11.1 (e.g. "Sau 2 giờ 53 phút")
 */
export function formatNextReminderCountdown(targetDate: Date | null): string {
  if (!targetDate) return 'Chưa lên lịch';

  const diffMs = targetDate.getTime() - Date.now();
  if (diffMs <= 0) return 'Đến giờ uống nước!';

  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `Sau ${hours} giờ ${minutes} phút`;
}
```

---

## 4. UI Hook & State Integration Blueprint

To cleanly integrate storage and notifications with `TodayTab`, `ReminderTab`, and `ProfileTab`, the following React hooks will be instantiated in Milestone 3:

### 4.1 `useHydrationStorage` Hook
```typescript
// Proposed hook interface for src/hooks/useHydrationStorage.ts
export function useHydrationStorage() {
  // Synchronous initial state from getStorageItem (0ms mount, zero flicker)
  const [profile, setProfileState] = useState<UserProfile>(() =>
    getStorageItem(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE)
  );

  const [logs, setLogsState] = useState<DailyLogsMap>(() =>
    getStorageItem(STORAGE_KEYS.DAILY_LOGS, {})
  );

  // Write-through update
  const updateProfile = useCallback(async (newProfile: UserProfile) => {
    setProfileState(newProfile);
    await setStorageItem(STORAGE_KEYS.USER_PROFILE, newProfile);
  }, []);

  const logDrink = useCallback(async (amountMl: number) => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = logs[today] || {
      date: today,
      targetMl: 2000,
      consumedMl: 0,
      entries: [],
      isGoalReached: false,
    };
    const updatedRecord: DailyHydrationRecord = {
      ...existing,
      consumedMl: existing.consumedMl + amountMl,
      entries: [
        ...existing.entries,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          time: new Date().toTimeString().slice(0, 5),
          amountMl,
        },
      ],
      isGoalReached: existing.consumedMl + amountMl >= existing.targetMl,
    };
    const updatedLogs = { ...logs, [today]: updatedRecord };
    setLogsState(updatedLogs);
    await setStorageItem(STORAGE_KEYS.DAILY_LOGS, updatedLogs);
  }, [logs]);

  return { profile, updateProfile, logs, logDrink };
}
```

---

## 5. Vitest Unit Test Blueprint (`tests/unit/storageAndNotification.test.ts`)

The implementation must pass comprehensive unit tests with Vitest, verifying:

```typescript
describe('Storage Engine Unit Tests', () => {
  it('performs synchronous write to localStorage and handles corrupted fallback', () => {
    // 1. Sets valid item
    setStorageItem('test_key', { count: 10 });
    expect(getStorageItem('test_key', { count: 0 })).toEqual({ count: 10 });

    // 2. Corrupts localStorage directly
    window.localStorage.setItem('test_key', '{broken_json');
    expect(getStorageItem('test_key', { count: 99 })).toEqual({ count: 99 });
  });

  it('exports valid JSON and RFC-4180 CSV with 6 headers', () => {
    const jsonStr = exportDataAsJson();
    expect(() => JSON.parse(jsonStr)).not.toThrow();

    const csvStr = exportDataAsCsv();
    expect(csvStr.charCodeAt(0)).toBe(0xFEFF); // UTF-8 BOM
    const lines = csvStr.replace('\uFEFF', '').trim().split('\n');
    expect(lines[0]).toBe('Ngày,Mục tiêu (ml),Đã uống (ml),Tỷ lệ (%),Trạng thái,Số lần uống');
  });
});

describe('Notification Engine Unit Tests', () => {
  it('correctly calculates smart intervals', () => {
    expect(calculateSmartInterval(660, 6)).toBe(110);
    expect(calculateSmartInterval(100, 5)).toBe(45);  // clamped min
    expect(calculateSmartInterval(600, 1)).toBe(150); // clamped max
  });

  it('suppresses and defers notifications during quiet hours (01:00 - 07:00)', () => {
    const quietDate = new Date(2026, 9, 31, 2, 30); // 02:30 AM
    expect(isInQuietHours(quietDate, '07:00', '01:00')).toBe(true);

    const deferred = adjustForQuietHours(quietDate, '07:00', '01:00');
    expect(deferred.getHours()).toBe(7);
    expect(deferred.getMinutes()).toBe(0);
  });
});
```

---

## 6. Verification & Acceptance Checklist

| Requirement | Specification Location | Verification Criteria |
|---|---|---|
| **0ms Mount Storage** | §2.3 `getStorageItem` | Instant synchronous read from `localStorage` without async await |
| **Native SharedPreferences** | §2.3 `setStorageItem` | Background non-blocking replication to `@capacitor/preferences` |
| **Startup Reconciliation** | §2.3 `reconcileStorage` | Restores purged `localStorage` keys from native preferences |
| **JSON Export** | §2.4 `exportDataAsJson` | Parseable JSON containing profile, settings, and full history |
| **RFC-4180 CSV Export** | §2.4 `exportDataAsCsv` | UTF-8 BOM CSV with exact 6 headers and escaped cells |
| **LocalNotifications Channel** | §3.2 & §3.5 `initializeNotificationEngine` | High-importance channel `voyager_hydration_reminders` created |
| **Runtime Permissions** | §3.5 `requestPermissions` | Checks and requests `POST_NOTIFICATIONS` permission |
| **3 Reminder Modes** | §3.3.1 `calculateSmartInterval` | Gentle (180m), Regular (90m), Smart (deficits clamped 45m-150m) |
| **Strict Quiet Hours** | §3.3.2 `isInQuietHours` & `adjustForQuietHours` | Zero alerts between 01:00 and 07:00, deferred to 07:00 |
| **Thematic Messages** | §3.4 `VOYAGER_NOTIFICATIONS` | Reverse: 1999 Voyager phrases (*ngân hà, tinh cầu, đàn violin*) |

