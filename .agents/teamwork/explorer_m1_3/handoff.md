# Handoff Report — Unit Test Suite Design (`hydrationEngine.test.ts`)

**Author**: teamwork_explorer (`explorer_m1_3`)  
**Target Milestone**: Milestone 1: Scaffolding & Core Hydration Engine  
**Recipient**: `7c380586-cf2a-4df7-b89c-a4b667536d21` (Sub-Orchestrator Milestone 1)  
**Deliverable**: `d:\uống nước\.agents\teamwork\explorer_m1_3\unit_test_design.md`  
**Date**: 2026-10-30  

---

## 1. Observation

1. **User Request & Master Architecture (`ORIGINAL_REQUEST.md` & `PROJECT.md`)**:
   - `ORIGINAL_REQUEST.md` line 22-29 specifies:
     * $W_{base} = \text{Cân nặng (kg)} \times 35\text{ ml}$.
     * $W_{activity}$: Ít vận động ($+0\text{ ml}$), Vừa ($+350\text{ ml}$), Cao ($+700\text{ ml}$).
     * $W_{weather}$: $+250\text{ ml}$ if $28^\circ\text{C} - 32^\circ\text{C}$; $+500\text{ ml}$ if $> 32^\circ\text{C}$; $+150\text{ ml}$ if humidity $< 40\%$.
     * Total: $W_{total} = W_{base} + W_{activity} + W_{weather}$ (rounding to $50\text{ ml}$ or $0,1\text{ L}$).
     * Weather API: Open-Meteo (`https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code`) with GPS fallback to Hà Nội/Vinh coordinates.
   - `ORIGINAL_REQUEST.md` line 71 specifies:
     * "Bộ kiểm thử tự động (unit tests) cho `hydrationEngine.ts` được triển khai và vượt qua toàn bộ (`npm test`), kiểm tra đúng các công thức tính $W_{base}$, $W_{activity}$, $W_{weather}$, làm tròn 50ml/0.1L và fallback tọa độ mặc định khi GPS không khả dụng."
   - `PROJECT.md` lines 130-132 specifies test file location:
     ```
     tests/
     ├── e2e/
     └── unit/
         └── hydrationEngine.test.ts
     ```

2. **Scaffolding Blueprint Alignment (`explorer_m1_1/scaffolding_plan.md`)**:
   - `package.json` includes:
     * `"scripts": { "test": "vitest run", "test:watch": "vitest" }`
     * `"devDependencies"`: `"vitest": "^3.0.5"`, `"@testing-library/react": "^16.2.0"`, `"jsdom": "^26.0.0"`.
   - `vite.config.ts` includes:
     * `test: { globals: true, environment: 'node', include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'] }`.

3. **Hydration Engine Blueprint Alignment (`explorer_m1_2/hydration_engine_blueprint.md`)**:
   - Declares the exact functions and types to test:
     * `calculateBaseWater(weightKg: number): number`
     * `calculateActivityWater(level: ActivityLevel): number`
     * `calculateWeatherBonus(temperature: number, humidity: number): WeatherBonusBreakdown`
     * `calculateWeatherWater(weather: WeatherData | null | undefined, autoAdjust?: boolean): WeatherBonusBreakdown`
     * `calculateDailyWaterGoal(weightKg: number, activityLevel: ActivityLevel, weatherBonusMl?: number): number`
     * `calculateHydrationTarget(input: HydrationCalculationInput): HydrationCalculationResult`
     * `roundToNearest50(amountMl: number): number`
     * `roundToNearest100(amountMl: number): number`
     * `formatWaterVolume(ml: number, unit?: 'ml' | 'L'): string`
     * `calculateRemainingCups(targetMl: number, consumedMl: number, cupSizeMl?: number): number`
     * `getRemainingPromptText(remainingCups: number): string`
     * `getWeatherDescription(weatherCode: number): WeatherDescription`
     * `fetchWeatherData(lat?: number, lon?: number, forceRefresh?: boolean): Promise<WeatherData>`
     * `getCachedWeather()`, `setCachedWeather()`, `clearWeatherCache()`
     * Constants: `DEFAULT_WEIGHT_KG = 60`, `FALLBACK_LOCATIONS.HANOI`, `FALLBACK_LOCATIONS.VINH`, `WEATHER_CACHE_TTL_MS = 1800000`.

---

## 2. Logic Chain

1. **Scope Breakdown**:
   The objective requires comprehensive unit test coverage for `hydrationEngine.ts` across weight benchmarks, activity tiers, weather conditions, rounding edge cases, Open-Meteo parsing, GPS fallbacks, and 30-min cache TTL.
2. **Test Isolation & Determinism**:
   - Direct hardware/network calls (`fetch`, `@capacitor/geolocation`) in unit tests cause non-deterministic failures, latency, and CI breakages.
   - Therefore, mocking `globalThis.fetch` via `vi.spyOn` and `@capacitor/geolocation` via `vi.mock('@capacitor/geolocation')` ensures 100% reproducible tests.
   - For cache TTL testing, relying on real time causes test bloat; using Vitest's fake timers (`vi.useFakeTimers()`, `vi.setSystemTime()`, `vi.advanceTimersByTime()`) allows instantaneous simulation of 15-minute cache hits and 31-minute cache expirations in 0 milliseconds.
3. **Cross-Environment Compatibility**:
   - Because `vite.config.ts` specifies `environment: 'node'`, native browser objects like `localStorage` are not guaranteed to be present unless polyfilled or running under `jsdom`.
   - Incorporating an in-memory `MockLocalStorage` inside `hydrationEngine.test.ts` guarantees seamless execution across both Node.js CLI runs and browser environments.
4. **Test Suite Organization**:
   - The test design is divided into 6 explicit suites comprising 45+ unit assertions:
     * Suite 1: $W_{base}$ across 40, 60, 75, 100kg, fractional values, zero, negative, and clamping boundaries (20kg min, 300kg max).
     * Suite 2: $W_{activity}$ across sedentary (+0ml), moderate (+350ml), high (+700ml), and invalid inputs.
     * Suite 3: $W_{weather}$ temperature tiers (<28°C, 28-32°C, >32°C), humidity (<40%, >=40%), boundary values ($27.9^\circ\text{C}, 28.0^\circ\text{C}, 32.0^\circ\text{C}, 32.1^\circ\text{C}, 39.9\%, 40.0\%$), cumulative combinations, and `autoAdjust: false` disablement.
     * Suite 4: Rounding behavior (exact, 2124 -> 2100, 2125 -> 2150, 2174 -> 2150, 2175 -> 2200), Vietnamese comma volume formatting (`2,0 L`, `1,6 L`, `2,15 L`), remaining cups ceiling division, and WMO code mapping.
     * Suite 5: Open-Meteo URL formatting, JSON response parsing, GPS failure fallback to Hà Nội coordinates (`21.0285, 105.8542`), and network failure resilience.
     * Suite 6: 30-minute cache TTL hits, 31-minute expirations, coordinate distance bypass (>0.1°), and offline expired cache fallback.
5. **Worker-Ready Reference Code**:
   - The entire verbatim test code is included in `unit_test_design.md` §5, enabling Worker 2 to write `tests/unit/hydrationEngine.test.ts` without ambiguity.

---

## 3. Caveats

1. **Storage Polyfill Assumption**: The test suite defines a simple in-memory `MockLocalStorage` when `globalThis.localStorage` is undefined. When running under `jsdom` or browser, native `window.localStorage` is used naturally.
2. **Capacitor Geolocation Mock**: In Node.js testing, native Capacitor plugins cannot run natively; module mock `vi.mock('@capacitor/geolocation')` must be defined at the top of the test file before imports.
3. **No Code Implementation**: In accordance with the Explorer role boundaries, no production code or test files were written to `src/` or `tests/`. All work is confined to `d:\uống nước\.agents\teamwork\explorer_m1_3\unit_test_design.md`.

---

## 4. Conclusion

The unit test design for `hydrationEngine.ts` is fully documented, verified against user requirements, and harmonized with both Explorer 1's scaffolding configuration and Explorer 2's implementation blueprint.
- Deliverable: `d:\uống nước\.agents\teamwork\explorer_m1_3\unit_test_design.md`
- Target Test File: `tests/unit/hydrationEngine.test.ts`
- Total Test Assertions: 45+ tests across 6 suites
- Expected Test Duration: < 1.0 second on local CLI and GitHub Actions CI.

---

## 5. Verification Method

Once Worker 1 completes project scaffolding and Worker 2 implements `src/utils/hydrationEngine.ts` and `tests/unit/hydrationEngine.test.ts`:
1. Run the test command from project root `d:\uống nước`:
   ```bash
   npm test
   ```
2. Verify that Vitest executes non-interactively and passes all 45+ test cases:
   - Check `tests/unit/hydrationEngine.test.ts` passes with exit code 0.
   - Verify execution time is under 1.5 seconds.
3. Invalidation Conditions:
   - Any test failure on threshold boundaries ($28.0^\circ\text{C}, 32.0^\circ\text{C}, 40.0\%$).
   - Flakiness caused by unmocked `fetch` or GPS calls.
   - Process hang caused by unmocked timers or watch mode in CI.

*End of Handoff Report.*
