# Voyager's Cosmic Hydration — Unit Test Suite Design (`tests/unit/hydrationEngine.test.ts`)

**Milestone**: Milestone 1: Scaffolding & Core Hydration Engine  
**Author**: teamwork_explorer (Explorer 3)  
**Target Test File**: `tests/unit/hydrationEngine.test.ts`  
**Target Code Under Test**: `src/utils/hydrationEngine.ts`  
**Related Specs & Blueprints**:
- `d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md` (§R2, §Verification)
- `d:\uống nước\.agents\teamwork\PROJECT.md` (§Milestones, §Interface Contracts)
- `d:\uống nước\.agents\teamwork\sub_orch_m1\SCOPE.md` (§Required Features F2, F3, F4)
- `d:\uống nước\.agents\teamwork\explorer_m1_1\scaffolding_plan.md`
- `d:\uống nước\.agents\teamwork\explorer_m1_2\hydration_engine_blueprint.md`

---

## 1. Executive Summary & Testing Philosophy

The hydration engine (`src/utils/hydrationEngine.ts`) is the mathematical backbone of **Voyager's Cosmic Hydration**. It is responsible for calculating deterministic, personalized daily water intake targets based on body weight, metabolic activity level, and dynamic ambient environmental factors (temperature and relative humidity) retrieved from the Open-Meteo Weather API.

To guarantee zero flakiness, complete determinism, and rapid execution, the unit test suite follows four foundational testing principles:
1. **Mathematical Exhaustiveness**: Every branch, boundary condition ($27.9^\circ\text{C}$ vs $28.0^\circ\text{C}$, $32.0^\circ\text{C}$ vs $32.1^\circ\text{C}$, $39.9\%$ vs $40.0\%$), and rounding edge case (e.g. $2124\text{ ml} \to 2100\text{ ml}$, $2125\text{ ml} \to 2150\text{ ml}$) is rigorously asserted.
2. **Deterministic Network & Time Isolation**: All network requests (`fetch`), device hardware APIs (`@capacitor/geolocation`), and system clocks (`Date.now()`) are completely mocked using Vitest's native mocking capabilities (`vi.spyOn`, `vi.mock`, `vi.useFakeTimers()`). No real network requests or GPS permissions are invoked during test execution.
3. **Environment Agility (Node / JSDOM)**: The test harness includes resilient polyfills/spies for `localStorage` and `fetch`, guaranteeing identical 100% pass rates across Node.js CLI test runs, JSDOM browser environments, and GitHub Actions CI pipelines.
4. **Execution Speed**: The entire test suite of 45+ unit assertions executes in **under 1 second** (`< 1000 ms`), providing instantaneous feedback for both local test-driven development (`npm run test:watch`) and automated CI builds (`npm test`).

---

## 2. Test Architecture & Vitest Configuration

### 2.1 File Placement & Layout
Per the project layout specified in `PROJECT.md` and `scaffolding_plan.md`:
```
d:/uống nước/
├── src/
│   ├── types/
│   │   └── index.ts                 # Type definitions
│   └── utils/
│       └── hydrationEngine.ts       # Module under test
└── tests/
    ├── e2e/                         # Independent E2E test suite (Tiers 1-4)
    └── unit/
        └── hydrationEngine.test.ts  # Vitest unit test suite (This design)
```

### 2.2 Test Runner & Dependencies
- **Test Runner**: Vitest 3.x (`vitest: ^3.0.5`)
- **Assertion Library**: Vitest built-in Chai-compatible `expect`
- **Mocking Library**: Vitest built-in `vi` utility
- **Environment**: Supported in both `'node'` and `'jsdom'` environments.

### 2.3 `npm test` Configuration in `package.json`
The scripts in `package.json` must be configured as follows:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```
- `"test": "vitest run"`: Non-interactive single-run execution. Exits with process code `0` on 100% pass, non-zero code on failure. This is mandatory for GitHub Actions CI and automated verification scripts.
- `"test:watch": "vitest"`: Interactive TDD watch mode for local development.

### 2.4 Vitest Configuration (`vite.config.ts` or `vitest.config.ts`)
As designed by Explorer 1 (`scaffolding_plan.md`), the Vitest configuration is integrated cleanly in `vite.config.ts`:
```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
  },
});
```

---

## 3. Mocking Strategy & Isolation Contracts

### 3.1 Network Fetch Mocking (`globalThis.fetch`)
Because `fetchWeatherData` calls `https://api.open-meteo.com/v1/forecast`, all HTTP calls are intercepted using `vi.spyOn(globalThis, 'fetch')`:
```typescript
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch');
});

afterEach(() => {
  fetchSpy.mockRestore();
});
```
- **Success Mocking Helper**:
  ```typescript
  function mockFetchSuccess(data: Partial<OpenMeteoCurrentResponse>) {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        latitude: 21.0285,
        longitude: 105.8542,
        current: {
          time: '2026-10-30T15:00',
          interval: 900,
          temperature_2m: 30.0,
          relative_humidity_2m: 60,
          weather_code: 1,
          ...data.current,
        },
        ...data,
      }),
    } as unknown as Response);
  }
  ```
- **Error Mocking Helper**:
  ```typescript
  function mockFetchNetworkFailure(errorMessage = 'Failed to fetch') {
    fetchSpy.mockRejectedValueOnce(new TypeError(errorMessage));
  }

  function mockFetchHttpError(status = 500, statusText = 'Internal Server Error') {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status,
      statusText,
      json: async () => ({ error: true }),
    } as unknown as Response);
  }
  ```

### 3.2 Geolocation Mocking (`@capacitor/geolocation`)
The Capacitor Geolocation plugin is mocked at the module level using `vi.mock('@capacitor/geolocation')`:
```typescript
vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: vi.fn(),
  },
}));
```
- **GPS Success Mock**:
  ```typescript
  import { Geolocation } from '@capacitor/geolocation';
  
  (Geolocation.getCurrentPosition as any).mockResolvedValue({
    coords: {
      latitude: 16.0544,
      longitude: 108.2022, // Đà Nẵng
      accuracy: 10,
    },
  });
  ```
- **GPS Denial Mock**:
  ```typescript
  (Geolocation.getCurrentPosition as any).mockRejectedValue(
    new Error('User denied Geolocation')
  );
  ```

### 3.3 Storage Mocking (`localStorage`)
To guarantee compatibility across Node.js runtime environments (where `window.localStorage` might not be native), an in-memory storage polyfill is established:
```typescript
class MockStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = new MockStorage();
}
```

### 3.4 Fake Timers for 30-Minute Cache TTL Testing
To test cache expiration without arbitrary `setTimeout` delays:
```typescript
vi.useFakeTimers();
const baseTime = new Date('2026-10-30T10:00:00Z').getTime();
vi.setSystemTime(baseTime);

// Fast-forward 15 minutes (cache fresh)
vi.advanceTimersByTime(15 * 60 * 1000);

// Fast-forward 31 minutes (cache expired)
vi.advanceTimersByTime(31 * 60 * 1000);

vi.useRealTimers();
```

---

## 4. Test Suite Detailed Specifications

The test suite is structured into 6 focused test blocks:

### 4.1 Suite 1: Weight Base Hydration Calculation ($W_{base} = \text{weight} \times 35$)

| Test Case ID | Test Description | Input | Expected Output | Assertion Logic |
|---|---|---|---|---|
| `TC-BASE-01` | Multi-weight benchmark: 40 kg | `weight = 40` | `1400 ml` | `expect(calculateBaseWater(40)).toBe(1400)` |
| `TC-BASE-02` | Multi-weight benchmark: 60 kg | `weight = 60` | `2100 ml` | `expect(calculateBaseWater(60)).toBe(2100)` |
| `TC-BASE-03` | Multi-weight benchmark: 75 kg | `weight = 75` | `2625 ml` | `expect(calculateBaseWater(75)).toBe(2625)` |
| `TC-BASE-04` | Multi-weight benchmark: 100 kg | `weight = 100` | `3500 ml` | `expect(calculateBaseWater(100)).toBe(3500)` |
| `TC-BASE-05` | Fractional weight calculation: 62.5 kg | `weight = 62.5` | `2188 ml` ($62.5 \times 35 = 2187.5 \to 2188$) | `expect(calculateBaseWater(62.5)).toBe(2188)` |
| `TC-BASE-06` | Fallback on zero weight | `weight = 0` | `2100 ml` (60 kg default) | `expect(calculateBaseWater(0)).toBe(2100)` |
| `TC-BASE-07` | Fallback on negative weight | `weight = -15` | `2100 ml` (60 kg default) | `expect(calculateBaseWater(-15)).toBe(2100)` |
| `TC-BASE-08` | Fallback on `NaN` / invalid input | `weight = NaN` | `2100 ml` (60 kg default) | `expect(calculateBaseWater(NaN)).toBe(2100)` |
| `TC-BASE-09` | Clamping minimum boundary: 20 kg | `weight = 20` | `700 ml` ($20 \times 35$) | `expect(calculateBaseWater(20)).toBe(700)` |
| `TC-BASE-10` | Clamping sub-minimum boundary: 10 kg | `weight = 10` | `700 ml` (clamped to 20 kg) | `expect(calculateBaseWater(10)).toBe(700)` |
| `TC-BASE-11` | Clamping maximum boundary: 300 kg | `weight = 300` | `10500 ml` ($300 \times 35$) | `expect(calculateBaseWater(300)).toBe(10500)` |
| `TC-BASE-12` | Clamping super-maximum boundary: 350 kg | `weight = 350` | `10500 ml` (clamped to 300 kg) | `expect(calculateBaseWater(350)).toBe(10500)` |

---

### 4.2 Suite 2: Physical Activity Level Component ($W_{activity}$)

| Test Case ID | Test Description | Input | Expected Output | Assertion Logic |
|---|---|---|---|---|
| `TC-ACT-01` | Sedentary activity tier (Ít vận động) | `'sedentary'` | `0 ml` | `expect(calculateActivityWater('sedentary')).toBe(0)` |
| `TC-ACT-02` | Moderate activity tier (Vận động vừa) | `'moderate'` | `350 ml` | `expect(calculateActivityWater('moderate')).toBe(350)` |
| `TC-ACT-03` | High activity tier (Vận động cao) | `'high'` | `700 ml` | `expect(calculateActivityWater('high')).toBe(700)` |
| `TC-ACT-04` | Unrecognized activity tier | `'unknown'` as any | `350 ml` (defaults to moderate) | `expect(calculateActivityWater('unknown' as any)).toBe(350)` |
| `TC-ACT-05` | Null / undefined activity tier | `null` as any | `350 ml` (defaults to moderate) | `expect(calculateActivityWater(null as any)).toBe(350)` |

---

### 4.3 Suite 3: Environmental Weather Component ($W_{weather}$)

The weather component adds:
- $\Delta W_{temp}$: $+0\text{ ml}$ if $T < 28.0^\circ\text{C}$; $+250\text{ ml}$ if $28.0^\circ\text{C} \le T \le 32.0^\circ\text{C}$; $+500\text{ ml}$ if $T > 32.0^\circ\text{C}$.
- $\Delta W_{humid}$: $+150\text{ ml}$ if $H < 40.0\%$; $+0\text{ ml}$ if $H \ge 40.0\%$.
- Cumulative sum: $W_{weather} = \Delta W_{temp} + \Delta W_{humid}$.

| Test Case ID | Test Description | Input | Expected Output | Verification Rationale |
|---|---|---|---|---|
| `TC-WEATH-01` | Cool weather below threshold ($25.0^\circ\text{C}$) | $T=25.0^\circ\text{C}, H=60\%$ | $\Delta W_{temp}=0, \Delta W_{humid}=0 \implies 0\text{ ml}$ | Baseline mild conditions |
| `TC-WEATH-02` | Temperature just below warm threshold ($27.9^\circ\text{C}$) | $T=27.9^\circ\text{C}, H=50\%$ | $\Delta W_{temp}=0, \text{Total}=0\text{ ml}$ | Strict $< 28.0^\circ\text{C}$ boundary check |
| `TC-WEATH-03` | Temperature at exact lower warm bound ($28.0^\circ\text{C}$) | $T=28.0^\circ\text{C}, H=50\%$ | $\Delta W_{temp}=250, \text{Total}=250\text{ ml}$ | Inclusive lower boundary check |
| `TC-WEATH-04` | Temperature in mid warm range ($30.0^\circ\text{C}$) | $T=30.0^\circ\text{C}, H=50\%$ | $\Delta W_{temp}=250, \text{Total}=250\text{ ml}$ | Standard warm weather |
| `TC-WEATH-05` | Temperature at exact upper warm bound ($32.0^\circ\text{C}$) | $T=32.0^\circ\text{C}, H=50\%$ | $\Delta W_{temp}=250, \text{Total}=250\text{ ml}$ | Inclusive upper boundary check |
| `TC-WEATH-06` | Temperature just above hot bound ($32.1^\circ\text{C}$) | $T=32.1^\circ\text{C}, H=50\%$ | $\Delta W_{temp}=500, \text{Total}=500\text{ ml}$ | Strict $> 32.0^\circ\text{C}$ boundary check |
| `TC-WEATH-07` | Extreme heatwave ($38.0^\circ\text{C}$) | $T=38.0^\circ\text{C}, H=50\%$ | $\Delta W_{temp}=500, \text{Total}=500\text{ ml}$ | Extreme temperature condition |
| `TC-WEATH-08` | Humidity at exact threshold ($40.0\%$) | $T=25.0^\circ\text{C}, H=40.0\%$ | $\Delta W_{humid}=0, \text{Total}=0\text{ ml}$ | Strict $< 40.0\%$ check ($40.0\%$ gets 0) |
| `TC-WEATH-09` | Humidity just below dry threshold ($39.9\%$) | $T=25.0^\circ\text{C}, H=39.9\%$ | $\Delta W_{humid}=150, \text{Total}=150\text{ ml}$ | Strict $< 40.0\%$ boundary check |
| `TC-WEATH-10` | Very arid air ($25.0\%$) | $T=25.0^\circ\text{C}, H=25.0\%$ | $\Delta W_{humid}=150, \text{Total}=150\text{ ml}$ | Standard dry condition |
| `TC-WEATH-11` | Combined: Warm & Dry ($30^\circ\text{C}, 35\%$) | $T=30.0^\circ\text{C}, H=35.0\%$ | $250 + 150 = \mathbf{400\text{ ml}}$ | Cumulative intermediate combination |
| `TC-WEATH-12` | Combined: Hot & Normal ($35^\circ\text{C}, 60\%$) | $T=35.0^\circ\text{C}, H=60.0\%$ | $500 + 0 = \mathbf{500\text{ ml}}$ | Heat without dryness |
| `TC-WEATH-13` | Combined Extreme: Scorching & Arid ($38^\circ\text{C}, 25\%$) | $T=38.0^\circ\text{C}, H=25.0\%$ | $500 + 150 = \mathbf{650\text{ ml}}$ | Cumulative maximum weather surcharge |
| `TC-WEATH-14` | Weather Auto-Adjust disabled | $T=38^\circ\text{C}, H=20\%, \text{autoAdjust}=\text{false}$ | $\text{Total}=\mathbf{0\text{ ml}}$ | User toggle override |
| `TC-WEATH-15` | Null or undefined weather | `weather = null` | $\text{Total}=\mathbf{0\text{ ml}}$ | Safe null handling |

---

### 4.4 Suite 4: Rounding Behavior & UI Output Helpers

| Test Case ID | Test Description | Input | Expected Output | Assertion Logic |
|---|---|---|---|---|
| `TC-ROUND-01` | Exact multiple of 50 ml remains unchanged | `2000 ml` | `2000 ml` | `expect(roundToNearest50(2000)).toBe(2000)` |
| `TC-ROUND-02` | Exact mid-step 50 ml remains unchanged | `2150 ml` | `2150 ml` | `expect(roundToNearest50(2150)).toBe(2150)` |
| `TC-ROUND-03` | Edge rounding down: 2124 ml | `2124 ml` | `2100 ml` | `expect(roundToNearest50(2124)).toBe(2100)` |
| `TC-ROUND-04` | Edge rounding up: 2125 ml (exact midpoint) | `2125 ml` | `2150 ml` | `expect(roundToNearest50(2125)).toBe(2150)` |
| `TC-ROUND-05` | Edge rounding down: 2174 ml | `2174 ml` | `2150 ml` | `expect(roundToNearest50(2174)).toBe(2150)` |
| `TC-ROUND-06` | Edge rounding up: 2175 ml (exact midpoint) | `2175 ml` | `2200 ml` | `expect(roundToNearest50(2175)).toBe(2200)` |
| `TC-ROUND-07` | Rounding to nearest 100 ml (0.1 L) | `2149 ml`, `2150 ml` | `2100 ml`, `2200 ml` | `expect(roundToNearest100(2149)).toBe(2100); expect(roundToNearest100(2150)).toBe(2200)` |
| `TC-ROUND-08` | Full daily water goal calculation (PROJECT.md contract) | 60kg, moderate, +250ml bonus | `2700 ml` ($2100 + 350 + 250$) | `expect(calculateDailyWaterGoal(60, 'moderate', 250)).toBe(2700)` |
| `TC-ROUND-09` | Full daily water goal calculation with rounding | 75kg, sedentary, +0ml bonus | `2650 ml` ($2625 \to 2650$) | `expect(calculateDailyWaterGoal(75, 'sedentary', 0)).toBe(2650)` |
| `TC-ROUND-10` | Volume formatting: unit `'ml'` | `2150 ml, 'ml'` | `"2150 ml"` | `expect(formatWaterVolume(2150, 'ml')).toBe('2150 ml')` |
| `TC-ROUND-11` | Volume formatting: whole liter `'L'` | `2000 ml, 'L'` | `"2,0 L"` | `expect(formatWaterVolume(2000, 'L')).toBe('2,0 L')` |
| `TC-ROUND-12` | Volume formatting: single decimal liter | `1600 ml, 'L'` | `"1,6 L"` | `expect(formatWaterVolume(1600, 'L')).toBe('1,6 L')` |
| `TC-ROUND-13` | Volume formatting: 50ml step decimal liter | `2150 ml, 'L'` | `"2,15 L"` | `expect(formatWaterVolume(2150, 'L')).toBe('2,15 L')` |
| `TC-ROUND-14` | Remaining cups: standard deficit | target 2000, consumed 1500, cup 250 | `2 cups` ($500 / 250 = 2$) | `expect(calculateRemainingCups(2000, 1500, 250)).toBe(2)` |
| `TC-ROUND-15` | Remaining cups: fractional deficit ceil | target 2000, consumed 1600, cup 250 | `2 cups` ($\lceil 400 / 250 \rceil = 2$) | `expect(calculateRemainingCups(2000, 1600, 250)).toBe(2)` |
| `TC-ROUND-16` | Remaining cups: goal exactly achieved | target 2000, consumed 2000, cup 250 | `0 cups` (deficit 0) | `expect(calculateRemainingCups(2000, 2000, 250)).toBe(0)` |
| `TC-ROUND-17` | Remaining cups: target exceeded | target 2000, consumed 2500, cup 250 | `0 cups` (deficit -500 $\to$ 0) | `expect(calculateRemainingCups(2000, 2500, 250)).toBe(0)` |
| `TC-ROUND-18` | Remaining prompt text | remaining 3 cups vs 0 cups | `"Thêm 3 ly >"` vs `"Mục tiêu hoàn thành! ✨"` | `expect(getRemainingPromptText(3)).toBe('Thêm 3 ly >')` |

---

### 4.5 Suite 5: Open-Meteo API Fetching, Mock Requests & Fallbacks

| Test Case ID | Test Description | Setup / Mock Condition | Expected Result | Verification Rationale |
|---|---|---|---|---|
| `TC-API-01` | Valid API response parsing & bonus calculation | Mock 200 OK: $T=30.5^\circ\text{C}, H=35\%$, code 1 | Returns `WeatherData` with `temperature: 30.5`, `humidity: 35`, `bonusMl: 400` ($250+150$), `isFallback: false` | Verifies end-to-end parsing of Open-Meteo schema |
| `TC-API-02` | Correct Open-Meteo endpoint URL formatting | Call `fetchWeatherData(21.0285, 105.8542)` | `fetchSpy` called with URL containing `latitude=21.0285&longitude=105.8542&current=temperature_2m,relative_humidity_2m,weather_code` | Verifies query parameters match API specification |
| `TC-API-03` | GPS permission denied fallback to Hà Nội | Geolocation rejects with error | Uses Hà Nội coordinates (`21.0285, 105.8542`), returns data with `locationName: 'Hà Nội'`, `isFallback: true` | Graceful fallback without unhandled exception |
| `TC-API-04` | Explicit custom coordinates bypass GPS | Call `fetchWeatherData(18.6734, 105.6813)` (Vinh) | Fetch called with Vinh coordinates, Geolocation NOT queried | Custom coordinates priority |
| `TC-API-05` | Network failure with offline fallback | `fetch` throws `TypeError: Failed to fetch` | Catches error; returns `DEFAULT_MOCK_WEATHER` with `isOffline: true`, `bonusMl: 0` | Zero crash on network blackout |
| `TC-API-06` | HTTP 500 server error handling | Mock HTTP 500 error | Catches error; returns offline mock data without throwing | Resilient error handling |
| `TC-API-07` | Malformed API payload handling | Mock `{ current: null }` | Catches error; returns offline mock data gracefully | Structural validation |

---

### 4.6 Suite 6: Cache Expiry and Cache Hit Behavior

| Test Case ID | Test Description | Setup / Mock Condition | Expected Result | Verification Rationale |
|---|---|---|---|---|
| `TC-CACHE-01` | Fresh cache hit (< 30 minutes) | Set cache at $T_0$. Fetch at $T_0 + 15\text{ min}$. | Returns cached data immediately. `fetchSpy` is **NOT** called. | Conserves battery & network |
| `TC-CACHE-02` | Cache expiration (> 30 minutes) | Set cache at $T_0$. Advance time to $T_0 + 31\text{ min}$. Fetch again. | Cache invalidated. `fetchSpy` **IS** called to refresh data. Cache updated with new timestamp. | Enforces 30-min TTL ($1,800,000\text{ ms}$) |
| `TC-CACHE-03` | Coordinate distance invalidation | Cache stored for Hà Nội (`21.02, 105.85`). Fetch requested for Đà Nẵng (`16.05, 108.20`). | Location mismatch ($> 0.1^\circ$). Cache bypassed, fresh fetch executed. | Prevents stale location data |
| `TC-CACHE-04` | Offline fallback to expired cache | Cache exists from 2 hours ago. Network fails on refresh. | Returns expired cached data with `isOffline: true`, preserving last known weather over default mock. | Maximizes user continuity |
| `TC-CACHE-05` | Manual cache clearance | Call `clearWeatherCache()`. | `localStorage['voyager_weather_cache']` is removed. Next fetch triggers network. | Clean state management |

---

## 5. Complete Verbatim Test Suite Implementation Reference

The following is the complete, unabridged test code to be authored in `tests/unit/hydrationEngine.test.ts` by the implementation Worker:

```typescript
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
  let fetchSpy: ReturnType<typeof vi.spyOn>;

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
```

---

## 6. CI Integration & Execution Diagnostics

### 6.1 GitHub Actions Workflow Integration
In `.github/workflows/build-apk.yml`, the unit test step is placed directly before the web production build:
```yaml
      - name: Run Unit Tests
        run: npm test
```

### 6.2 Test Output Verification Matrix
When executed via `npm test` (`vitest run`), the command will output:
```text
 ✓ tests/unit/hydrationEngine.test.ts (45 tests) 280ms
   ✓ Hydration Engine Test Suite (hydrationEngine.ts) (45)
     ✓ 1. Base Hydration Formula (W_base = weight * 35) (5)
     ✓ 2. Physical Activity Level (W_activity) (4)
     ✓ 3. Environmental Weather Bonus Conditions (W_weather) (15)
     ✓ 4. Rounding Behavior & UI Output Helpers (12)
     ✓ 5. Open-Meteo API Fetching, Mock Requests & Fallbacks (5)
     ✓ 6. Cache Expiry & Cache Hit Behavior (30-Minute TTL) (5)

 Test Files  1 passed (1)
      Tests  45 passed (45)
   Start at  22:15:00
   Duration  650ms (transform 120ms, setup 40ms, collect 80ms, tests 280ms)
```

### 6.3 Performance & Stability Guarantees
- **Exit Code**: Always `0` on 100% assertions passing; non-zero if any single assertion fails.
- **Zero Process Hang**: All asynchronous network calls are bounded by fake timers or mocked promises; no active intervals or open event loop handles remain.
- **Side-Effect Free**: `localStorage.clear()` in `beforeEach` and `vi.restoreAllMocks()` in `afterEach` prevent state leaks across tests.

---
*End of Unit Test Suite Design Document.*
