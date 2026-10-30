# Handoff Report: Explorer 2 (Hydration Engine Spec Miner)

**Document**: `d:\uống nước\.agents\teamwork\explorer_m1_2\handoff.md`  
**Author**: teamwork_spec_miner  
**Recipient**: `7c380586-cf2a-4df7-b89c-a4b667536d21` (Sub-Orchestrator Milestone 1)  
**Deliverable Artifact**: `d:\uống nước\.agents\teamwork\explorer_m1_2\hydration_engine_blueprint.md`  
**Date**: 2026-10-30T15:16:30Z  
**Type**: Hard Handoff (Task Complete)

---

## 1. Observation

1. **Original User Request (`ORIGINAL_REQUEST.md`)**:
   - Lines 22–29 specify:
     ```
     - Gọi API thời tiết miễn phí Open-Meteo (https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code) dựa trên GPS thiết bị. Nếu người dùng tắt GPS hoặc từ chối cấp quyền, mặc định lấy tọa độ Hà Nội/Vinh.
     - Công thức tính mục tiêu nước hằng ngày (W_total):
       * Nước cơ bản: W_base = Cân nặng (kg) * 35 (ml).
       * Mức vận động (W_activity): Ít vận động (+0 ml), Vừa (+350 ml), Cao (+700 ml).
       * Phụ thu thời tiết (W_weather): Cộng +250 ml nếu nhiệt độ 28°C - 32°C; cộng +500 ml nếu > 32°C; cộng thêm +150 ml nếu độ ẩm < 40%.
       * Tổng: W_total = W_base + W_activity + W_weather (làm tròn đến 50 ml hoặc 0,1 L).
     ```

2. **Project Plan Interface Contracts (`PROJECT.md`)**:
   - Lines 48–81 define:
     ```typescript
     export interface UserProfile {
       name: string;
       weightKg: number;
       heightCm: number;
       age: number;
       activityLevel: 'sedentary' | 'moderate' | 'high';
       wakeTime: string; // '07:00'
       bedTime: string;  // '01:00'
       autoWeatherAdjust: boolean;
       selectedCompanion: string;
       selectedTheme: string;
       unit: 'ml' | 'L';
       soundEnabled: boolean;
     }

     export interface WeatherData {
       temperature: number;
       humidity: number;
       weatherCode: number;
       bonusMl: number;
       locationName: string;
       isFallback: boolean;
     }

     export function calculateDailyWaterGoal(
       weightKg: number,
       activityLevel: 'sedentary' | 'moderate' | 'high',
       weatherBonusMl: number
     ): number;

     export function fetchWeatherData(lat?: number, lon?: number): Promise<WeatherData>;
     ```

3. **Live Probing of Open-Meteo API**:
   - Tool call `powershell -Command "Invoke-RestMethod -Uri 'https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,relative_humidity_2m,weather_code' | ConvertTo-Json -Depth 5"`:
     - Output returned valid JSON:
       ```json
       {
         "latitude": 21.05448,
         "longitude": 105.898476,
         "current_units": {
           "temperature_2m": "°C",
           "relative_humidity_2m": "%",
           "weather_code": "wmo code"
         },
         "current": {
           "temperature_2m": 25.4,
           "relative_humidity_2m": 90,
           "weather_code": 1
         }
       }
       ```
   - Tool call `curl.exe -s "https://api.open-meteo.com/v1/forecast?latitude=invalid&longitude=105.6813"`:
     - Returned HTTP 400 error JSON:
       `{"error":true,"reason":"Invalid value: Cannot initialize Float from invalid String value invalid"}`.

4. **Detailed Technical Survey (`spec_miner_survey_2/spec_report.md`)**:
   - Lines 50–132 specify the exact mathematical formulations, boundary condition handling (inclusive $[28, 32]^\circ\text{C}$ vs strictly $> 32^\circ\text{C}$, strictly $< 40\%$ humidity), 50 ml rounding formula `Math.round(val / 50) * 50`, Vietnamese decimal display formatting (`replace('.', ',')`), remaining cups ceiling logic $\lceil \text{Deficit} / 250 \rceil$, and 30-minute localStorage caching with key `'voyager_weather_cache'`.

---

## 2. Logic Chain

1. From **Observation 1 & 2**, the hydration engine requires calculating three additive terms: base water ($W_{base}$), physical activity ($W_{activity}$), and environmental weather surcharge ($W_{weather}$).
2. From **Observation 1 & 4**, edge cases for user input (such as `weight <= 0`, negative numbers, or `NaN`) must be handled deterministically. Clamping to a valid range $[20.0, 300.0]\text{ kg}$ with a fallback of $60.0\text{ kg}$ guarantees that $W_{base}$ never results in negative, zero, or `NaN` milliliters.
3. From **Observation 1 & 4**, weather surcharges are cumulative: a warm day ($30^\circ\text{C}$) with low humidity ($35\%$) yields $+250 + 150 = +400\text{ ml}$. An extreme hot day ($36^\circ\text{C}$) with low humidity ($25\%$) yields $+500 + 150 = +650\text{ ml}$. If user disables auto-adjustment (`autoAdjustWeather = false`), the surcharge must evaluate to $0\text{ ml}$.
4. From **Observation 1 & 4**, rounding to nearest 50 ml uses standard midpoint-up rounding: $2124\text{ ml} \to 2100\text{ ml}$, $2125\text{ ml} \to 2150\text{ ml}$, $2174\text{ ml} \to 2150\text{ ml}$, $2175\text{ ml} \to 2200\text{ ml}$.
5. From **Observation 3**, live testing confirms that Open-Meteo returns numeric values in `current.temperature_2m`, `current.relative_humidity_2m`, and `current.weather_code`. Network or input errors return `{ error: true, reason: string }` or throw `TypeError: Failed to fetch`.
6. Therefore, the implementation in `hydrationEngine.ts` must encapsulate network calls with `try / catch`, an `AbortController` timeout (6000ms), and a dual fallback:
   - Primary coordinate fallback to Hà Nội (`21.0285, 105.8542`) when GPS is denied or unavailable.
   - Secondary offline fallback returning cached data or default mock weather ($26.0^\circ\text{C}, 60\%$, Hà Nội Mặc định) so the app remains fully functional and never crashes offline.
7. From **Observation 4**, a 30-minute TTL cache in `localStorage` under key `'voyager_weather_cache'` with coordinate delta checks ($< 0.1^\circ$) prevents repeated API polling and saves mobile battery.

---

## 3. Caveats

- **Capacitor Geolocation Web Mocking**: When running unit tests in Node/Vitest, `@capacitor/geolocation` will not have native Android location services available. The implementation in `hydrationEngine.ts` has a graceful `try / catch` fallback that tests can either mock using `vi.spyOn` or allow to cleanly fall back to Hà Nội coordinates without error.
- **Browser Navigator Geolocation**: On mobile Android browsers without GPS permission, the browser's `navigator.geolocation` will reject; the engine handles this identically to native denial, falling back to Hà Nội coordinates.
- **Floating-Point Representation in Liters**: Since $50\text{ ml} = 0.05\text{ L}$, volumes ending in $50\text{ ml}$ (e.g. $2150\text{ ml}$) produce two decimal places in liters (`2,15 L`), while full-hundred milliliter steps produce one decimal place (`2,0 L`, `2,1 L`). `formatWaterVolume` accommodates both cleanly with Vietnamese comma notation.

---

## 4. Conclusion

The specification for `src/utils/hydrationEngine.ts` has been fully mined, probed, verified, and compiled into `d:\uống nước\.agents\teamwork\explorer_m1_2\hydration_engine_blueprint.md`.

It provides:
1. Complete TypeScript interfaces: `UserProfile`, `WeatherData`, `Coordinates`, `WeatherCacheEntry`, `OpenMeteoCurrentResponse`, `HydrationCalculationInput`, `HydrationCalculationResult`, and `WeatherDescription`.
2. Verified formulas for $W_{base}$, $W_{activity}$, $W_{weather}$, rounding, remaining cups, and formatting.
3. Open-Meteo API integration with 30-min local caching, GPS fallback to Hà Nội (`21.0285, 105.8542`) / Vinh (`18.6734, 105.6813`), and offline mock resilience.
4. Complete, unabridged TypeScript source code blueprint ready for Worker 2 implementation.
5. Comprehensive unit test verification matrix covering all features, boundary values, and mock strategies.

---

## 5. Verification Method

To independently verify the blueprint:
1. **Inspect Blueprint File**:
   - Read `d:\uống nước\.agents\teamwork\explorer_m1_2\hydration_engine_blueprint.md`.
2. **Verify Interface Compliance**:
   - Compare types with `PROJECT.md § Interface Contracts` (lines 48–81) and `ORIGINAL_REQUEST.md § R2` (lines 22–29).
3. **Verify Open-Meteo API Endpoint Live**:
   ```powershell
   curl.exe -s "https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,relative_humidity_2m,weather_code"
   ```
4. **Invalidation Conditions**:
   - Any modification in user request altering the $35\text{ ml/kg}$ constant, activity tier values ($0, 350, 700\text{ ml}$), weather thresholds ($28-32^\circ\text{C}, >32^\circ\text{C}, <40\%$), or fallback coordinates.
