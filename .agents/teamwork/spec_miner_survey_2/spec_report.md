# Voyager's Cosmic Hydration — Core Engine Technical & Mathematical Specification
**Document ID**: SPEC-VCH-CORE-001  
**Author**: teamwork_spec_miner  
**Status**: APPROVED SPECIFICATION  
**Scope**: Hydration Calculation Logic, Web Audio Procedural Synthesis, Dual-Layer Offline Storage, and Notification Scheduling Engine.

---

## 1. Executive Summary & Architecture Overview

The core computational and sensorial pillars of **Voyager's Cosmic Hydration** are designed with four fundamental principles:
1. **Mathematical Determinism**: Zero ambiguity in daily hydration target calculation, activity compensation, and weather-based environmental adjustments.
2. **Procedural Zero-Asset Audio**: 100% synthesized soundscapes utilizing the Web Audio API without requiring external `.mp3` or `.wav` network downloads, guaranteeing instantaneous zero-latency playback and zero asset loading failures.
3. **Dual-Layer Offline Resilience**: Redundant persistence across `localStorage` (instant synchronous reads) and `@capacitor/preferences` (native Android `SharedPreferences` persistence), ensuring zero state loss across app lifecycles.
4. **Intelligent Quiet-Aware Scheduling**: Dynamic notification scheduling with strict quiet hours enforcement (01:00 - 07:00) and deficit-adaptive smart intervals.

```
+-----------------------------------------------------------------------------------+
|                                  USER / UI LAYER                                  |
|   (TodayTab, ReminderTab, JournalTab, StatsTab, ProfileTab, VoyagerChibi)        |
+-----------------------------------------+-----------------------------------------+
                                          |
                +-------------------------+-------------------------+
                |                                                   |
                v                                                   v
+-------------------------------+                   +-------------------------------+
|     HYDRATION CORE ENGINE     |                   |    WEB AUDIO SYNTHESIS ENGINE |
| (src/utils/hydrationEngine.ts)|                   |   (src/utils/audioEngine.ts)  |
| - Base Formula (Weight * 35)  |                   | - Gentle Ripple (Water Drop)  |
| - Activity Bonus (+0/+350/+700|                   | - Cosmic Violin (Voyager弦乐) |
| - Open-Meteo Weather Bonus    |                   | - Bubble Chime (Crystalline)  |
| - Rounding to 50ml / 0.1L     |                   | - Auto-unlock AudioContext    |
| - GPS & Hanoi/Vinh Fallbacks  |                   +-------------------------------+
+---------------+---------------+
                |
                v
+-------------------------------+                   +-------------------------------+
|     DUAL-LAYER STORAGE        |                   | NOTIFICATION SCHEDULER ENGINE |
| (src/services/storageService) | <===============> |(src/services/notificationSvc) |
| Layer 1: localStorage (sync)  |                   | - Modes: Gentle, Smart, Fixed |
| Layer 2: @capacitor/prefs     |                   | - Deficit-adaptive interval   |
| - Auto-sync & backup/export   |                   | - Quiet Hours (01:00 - 07:00) |
+-------------------------------+                   +-------------------------------+
```

---

## 2. Hydration Calculation Logic Specification (`src/utils/hydrationEngine.ts`)

### 2.1 Mathematical Formulation

The total daily water intake target $W_{total}$ (in milliliters) is defined as:
$$W_{total} = W_{base} + W_{activity} + W_{weather}$$

#### 2.1.1 Base Hydration Component ($W_{base}$)
$$W_{base} = \text{weight}_{kg} \times 35$$

*Parameter constraints:*
- $\text{weight}_{kg} \in [20.0, 300.0]$ kg.
- Default fallback weight when uninitialized or invalid: $60.0$ kg ($W_{base} = 2100\text{ ml}$).
- Non-numeric or negative values MUST be clamped or sanitized:
  $$\text{weight}_{sanitized} = \begin{cases} 60.0 & \text{if } \text{weight} \le 0 \lor \text{isNaN}(\text{weight}) \\ \min(300.0, \max(20.0, \text{weight})) & \text{otherwise} \end{cases}$$

#### 2.1.2 Physical Activity Component ($W_{activity}$)
Categorized into three distinct metabolic activity tiers:
$$\text{ActivityLevel} = \{\text{'sedentary'}, \text{'moderate'}, \text{'high'}\}$$

$$W_{activity}(\text{level}) = \begin{cases} 0\text{ ml} & \text{if level} = \text{'sedentary'} \quad (\text{Ít vận động}) \\ 350\text{ ml} & \text{if level} = \text{'moderate'} \quad (\text{Vận động vừa: đi bộ, việc nhẹ}) \\ 700\text{ ml} & \text{if level} = \text{'high'} \quad (\text{Vận động cao: thể thao, lao động nặng}) \end{cases}$$

Default: `'moderate'` ($+350\text{ ml}$).

#### 2.1.3 Environmental Weather Component ($W_{weather}$)
The environmental adjustment dynamically adapts to ambient ambient temperature $T$ ($^\circ\text{C}$) and relative humidity $H$ ($\%$).

If user setting `autoAdjustWeather` is `false`:
$$W_{weather} = 0$$

If `autoAdjustWeather` is `true`:
$$W_{weather} = \Delta W_{temp}(T) + \Delta W_{humid}(H)$$

Where the temperature surcharge $\Delta W_{temp}(T)$ is piecewise continuous:
$$\Delta W_{temp}(T) = \begin{cases} 0\text{ ml} & \text{if } T < 28.0^\circ\text{C} \\ 250\text{ ml} & \text{if } 28.0^\circ\text{C} \le T \le 32.0^\circ\text{C} \\ 500\text{ ml} & \text{if } T > 32.0^\circ\text{C} \end{cases}$$

And the humidity surcharge $\Delta W_{humid}(H)$ is:
$$\Delta W_{humid}(H) = \begin{cases} 150\text{ ml} & \text{if } H < 40.0\% \\ 0\text{ ml} & \text{if } H \ge 40.0\% \end{cases}$$

#### Cumulative Weather Surcharge Matrix:
| Temperature $T$ | Humidity $H$ | $\Delta W_{temp}$ | $\Delta W_{humid}$ | Total $W_{weather}$ | Weather Description |
|---|---|---|---|---|---|
| $T < 28^\circ\text{C}$ (e.g. $24^\circ\text{C}$) | $H \ge 40\%$ (e.g. $65\%$) | $0\text{ ml}$ | $0\text{ ml}$ | **$+0\text{ ml}$** | Dịu mát, độ ẩm chuẩn |
| $T < 28^\circ\text{C}$ (e.g. $25^\circ\text{C}$) | $H < 40\%$ (e.g. $32\%$) | $0\text{ ml}$ | $+150\text{ ml}$ | **$+150\text{ ml}$** | Mát mẻ nhưng hanh khô |
| $28^\circ\text{C} \le T \le 32^\circ\text{C}$ (e.g. $30^\circ\text{C}$) | $H \ge 40\%$ (e.g. $70\%$) | $+250\text{ ml}$ | $0\text{ ml}$ | **$+250\text{ ml}$** | Nóng vừa, độ ẩm bình thường |
| $28^\circ\text{C} \le T \le 32^\circ\text{C}$ (e.g. $29.5^\circ\text{C}$) | $H < 40\%$ (e.g. $35\%$) | $+250\text{ ml}$ | $+150\text{ ml}$ | **$+400\text{ ml}$** | Nóng vừa và hanh khô |
| $T > 32^\circ\text{C}$ (e.g. $36^\circ\text{C}$) | $H \ge 40\%$ (e.g. $60\%$) | $+500\text{ ml}$ | $0\text{ ml}$ | **$+500\text{ ml}$** | Nắng gắt oi ả |
| $T > 32^\circ\text{C}$ (e.g. $38^\circ\text{C}$) | $H < 40\%$ (e.g. $28\%$) | $+500\text{ ml}$ | $+150\text{ ml}$ | **$+650\text{ ml}$** | Nắng gắt cực độ, khô rát |

### 2.2 Rounding & Formatting Specifications

1. **Rounding to nearest 50 ml**:
   $$W_{target} = \text{round}\left(\frac{W_{total}}{50}\right) \times 50$$
   *Example*:
   - Input: $62\text{ kg} \times 35 = 2170\text{ ml}$. Sedentary ($+0$), $T=25^\circ\text{C}$ ($+0$).
   - Raw total: $2170\text{ ml}$.
   - $2170 / 50 = 43.4 \implies \text{round}(43.4) = 43 \implies 43 \times 50 = 2150\text{ ml}$.

2. **Liters Representation & Formatting**:
   $$V_{liters} = \frac{W_{target}}{1000}$$
   Display formatting rules:
   - For round decimal: `(val).toFixed(1)` replacing `.` with `,` (e.g. `2.0` $\to$ `2,0 L`, `1.6` $\to$ `1,6 L`).
   - For mid-step $50\text{ ml}$ increments: formatted as `X,X5 L` or rounded display `X,X L` depending on user unit setting (`'ml'` vs `'L'`).
   - Standard display helper:
     ```ts
     export function formatWaterVolume(ml: number, unit: 'ml' | 'L' = 'L'): string {
       if (unit === 'ml') {
         return `${Math.round(ml)} ml`;
       }
       const liters = ml / 1000;
       // Format with 1 or 2 decimals if has fraction
       const str = (liters % 1 === 0) 
         ? liters.toFixed(1) 
         : (liters % 0.1 === 0 ? liters.toFixed(1) : liters.toFixed(2));
       return `${str.replace('.', ',')} L`;
     }
     ```

3. **Remaining Cups Calculation**:
   Given consumed volume $W_{consumed}$ and selected quick cup volume $V_{cup}$ (default: $250\text{ ml}$):
   $$\text{Deficit} = \max(0, W_{target} - W_{consumed})$$
   $$\text{RemainingCups} = \begin{cases} 0 & \text{if } \text{Deficit} = 0 \\ \left\lceil \frac{\text{Deficit}}{V_{cup}} \right\rceil & \text{if } \text{Deficit} > 0 \end{cases}$$
   *Display string*: `"Thêm " + RemainingCups + " ly >"` (e.g. `"Thêm 3 ly >"`).

---

### 2.3 Open-Meteo Weather API Integration & Fallbacks

#### 2.3.1 API Contract
- **Endpoint URL**:
  `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code`
- **HTTP Method**: GET
- **Timeout**: 6000 ms (via `AbortController`).

#### 2.3.2 Response Schema:
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
    "time": "2026-10-30T15:00",
    "interval": 900,
    "temperature_2m": 29.4,
    "relative_humidity_2m": 65,
    "weather_code": 1
  }
}
```

#### 2.3.3 Location Fallbacks (When GPS is disabled, denied, or unavailable):
1. **Primary Fallback**: **Hà Nội**
   - Latitude: `21.0285`
   - Longitude: `105.8542`
   - Name: `"Hà Nội"`
2. **Secondary Fallback**: **Vinh**
   - Latitude: `18.6734`
   - Longitude: `105.6813`
   - Name: `"Vinh"`

#### 2.3.4 Weather Caching & Error Resilience Flow:
1. Try GPS via `@capacitor/geolocation` (timeout 5000ms).
2. If geolocation fails (permission denied, timeout, location service disabled): fallback to coordinates of Hà Nội (`21.0285, 105.8542`).
3. Check Weather Cache:
   - Cache key: `voyager_weather_cache`.
   - TTL (Time-To-Live): 30 minutes ($1800000\text{ ms}$).
   - If cached entry exists, matches location within $0.1^\circ$ delta, and is fresh ($< 30\text{ min}$): return cached data immediately.
4. If network request fails or device is completely offline:
   - If any cached weather exists (even expired): return cached weather with `isOffline: true`.
   - If no cache exists at all: return default mock weather:
     `{ temperature: 26.0, humidity: 65, weatherCode: 1, locationName: "Hà Nội (Mặc định)", isOffline: true }`.
     In this case: $\Delta W_{weather} = 0\text{ ml}$.

#### 2.3.5 WMO Weather Code Interpretation & Icon Mapping:
| WMO Code | Meaning | Vietnamese Label | UI Icon / Visual Cue |
|---|---|---|---|
| `0` | Clear sky | Trời quang đãng | Sun / Mặt trời rực rỡ |
| `1, 2, 3` | Mainly clear, partly cloudy, overcast | Trời nhiều mây | CloudSun / Mây thưa |
| `45, 48` | Fog, depositing rime fog | Sương mù vũ trụ | CloudFog / Sương đêm |
| `51, 53, 55, 56, 57` | Drizzle (Light/Dense) | Mưa phùn nhẹ | CloudDrizzle / Hạt mưa nhỏ |
| `61, 63, 65, 66, 67` | Rain (Slight/Heavy) | Mưa rào | CloudRain / Mưa sao |
| `71, 73, 75, 77` | Snow fall | Băng tuyết tinh vân | Snowflake / Bông tuyết |
| `80, 81, 82` | Rain showers | Mưa rào dồn dập | CloudRain / Mưa nặng hạt |
| `95, 96, 99` | Thunderstorm | Giông bão sấm chớp | CloudLightning / Bão từ |

---

### 2.4 TypeScript Interface Specification for `hydrationEngine.ts`

```typescript
export type ActivityLevel = 'sedentary' | 'moderate' | 'high';

export interface WeatherData {
  temperature: number;      // in Celsius
  relativeHumidity: number; // percentage (0 - 100)
  weatherCode: number;      // WMO code
  locationName: string;     // e.g. "Hà Nội" | "Vinh" | "Vị trí GPS"
  timestamp: number;        // epoch timestamp ms
  isOffline?: boolean;
}

export interface HydrationCalculationInput {
  weightKg: number;
  activityLevel: ActivityLevel;
  weather?: WeatherData | null;
  autoAdjustWeather: boolean;
  customDailyTargetMl?: number | null; // Manual override if user set custom target
}

export interface HydrationTargetBreakdown {
  baseMl: number;
  activityMl: number;
  weatherMl: number;
  tempBonusMl: number;
  humidBonusMl: number;
  rawTotalMl: number;
  roundedTotalMl: number;
  isCustomOverride: boolean;
}

export interface HydrationEngineAPI {
  calculateBaseWater(weightKg: number): number;
  calculateActivityWater(level: ActivityLevel): number;
  calculateWeatherWater(weather: WeatherData | null | undefined, autoAdjust: boolean): {
    total: number;
    tempBonus: number;
    humidBonus: number;
  };
  calculateDailyTarget(input: HydrationCalculationInput): HydrationTargetBreakdown;
  roundToNearest50(amountMl: number): number;
  calculateRemainingCups(targetMl: number, consumedMl: number, cupSizeMl?: number): number;
  formatWaterVolume(amountMl: number, unit?: 'ml' | 'L'): string;
  fetchCurrentWeather(coords?: { latitude: number; longitude: number }): Promise<WeatherData>;
}
```

---

## 3. Web Audio API Procedural Sound Synthesis Specification (`src/utils/audioEngine.ts`)

To eliminate the need for heavy external sound assets and guarantee instant response times on mobile webviews, three signature Voyager soundscapes are generated procedurally using the Web Audio API.

### 3.1 Global AudioContext Lifecycle & Safety Rules

1. **Singleton Context & Autoplay Policy**:
   Browsers and Android WebViews block audio synthesis until the first user interaction (touch, tap, click).
   - Singleton pattern: `getAudioContext(): AudioContext`.
   - On every sound trigger:
     ```ts
     if (ctx.state === 'suspended') {
       await ctx.resume();
     }
     ```
2. **Global Mute Respect**:
   If user settings have `soundEnabled === false`, `playHydrationSound()` immediately returns without scheduling nodes.
3. **Master Limiter / Headroom**:
   A master `GainNode` with value $0.6$ prevents any digital clipping ($> 0\text{ dBFS}$) and smooths envelope transients.

---

### 3.2 Sound 1: "Gợn nhẹ" (Gentle Ripple / Water Droplet)

**Acoustic Character**: Soft, organic water drop hitting calm galactic liquid. Characterized by a rapid upward frequency chirp followed by a resonant low-frequency body ripple.

#### Node Graph:
```
[Oscillator: Sine (Drop Chirp)] ----> [GainNode (Drop Envelope)] ----\
                                                                       +---> [BiquadFilter: Lowpass 2200Hz] ---> [Master Gain (0.6)] ---> Destination
[Oscillator: Sine (Ripple Tail)] ---> [GainNode (Ripple Envelope)] --/
```

#### Synthesis Parameters:
1. **Drop Chirp**:
   - Waveform: `'sine'`
   - Frequency curve: Starts at $450\text{ Hz}$ at $t_0$.
   - Exponential ramp to $1350\text{ Hz}$ at $t_0 + 0.04\text{s}$.
   - Linear ramp down to $800\text{ Hz}$ at $t_0 + 0.12\text{s}$.
   - Gain Envelope:
     - $t_0$: $0.001$
     - $t_0 + 0.005\text{s}$: Quick attack to $0.5$
     - $t_0 + 0.18\text{s}$: Exponential decay to $0.001$
2. **Ripple Tail (Liquid Resonance)**:
   - Waveform: `'sine'`
   - Frequency: $330\text{ Hz}$ (E4) with slight downward pitch shift to $290\text{ Hz}$ over $0.35\text{s}$.
   - Gain Envelope:
     - $t_0$: $0.0$
     - $t_0 + 0.03\text{s}$: Rises to $0.22$
     - $t_0 + 0.38\text{s}$: Exponential decay to $0.001$
3. **Filter**:
   - `BiquadFilterNode`: `type = 'lowpass'`, `frequency = 2200 Hz`, `Q = 1.2`.
4. **Total Duration**: $0.40\text{s}$.

---

### 3.3 Sound 2: "Violin Tinh cầu" (Cosmic Space Violin)

**Acoustic Character**: Emulates Voyager's signature violin from Reverse: 1999 echoing across the stellar vacuum. Rich harmonic sawtooth/triangle blend with expressive delayed vibrato LFO and interstellar delay echo.

#### Node Graph:
```
[LFO: Sine (5.5Hz)] ---> [LFO Gain (12Hz)] --\
                                               v
[Osc 1: Sawtooth (f0)] ------------------> [Gain 1] --\
                                                       +--> [Formant Filter: Peaking 1850Hz] ---> [Dry/Wet] ---> Master Gain
[Osc 2: Triangle (f0 + 6 cents)] --------> [Gain 2] --/             |
                                                                    v
                                                     [DelayNode (140ms)] ---> [Feedback Gain (0.35)] ---> [Lowpass Damping 1200Hz]
```

#### Synthesis Parameters:
1. **Pitch**: Note A4 / E5 cosmic chord. Nominal fundamental $f_0 = 587.33\text{ Hz}$ (D5).
2. **Oscillator Cluster**:
   - **Oscillator 1**: Sawtooth wave at $f_0$ ($587.33\text{ Hz}$).
   - **Oscillator 2**: Triangle wave at $f_0 + 6\text{ cents}$ ($589.37\text{ Hz}$) for warm string chorus chorus.
   - **Oscillator 3 (Celestial Octave)**: Sine wave at $2 \times f_0$ ($1174.66\text{ Hz}$), attenuated by $-10\text{ dB}$ ($0.316$).
3. **Vibrato LFO (Natural Bowing Expression)**:
   - Waveform: `'sine'`, rate: $5.6\text{ Hz}$.
   - LFO Gain Envelope:
     - Starts at $0\text{ Hz}$ modulation depth at $t_0$.
     - Gently ramps up to $12\text{ Hz}$ frequency deviation at $t_0 + 0.20\text{s}$ (mimicking a violinist introducing vibrato after the initial bow contact).
4. **Bowing Amplitude Envelope (ADSR)**:
   - Attack: $0.12\text{s}$ (linear ramp from $0$ to $0.45$).
   - Decay: $0.10\text{s}$ to sustain level $0.35$.
   - Sustain: Holds until $t_0 + 0.65\text{s}$.
   - Release: Smooth exponential tail decaying from $0.35$ to $0.001$ over $0.55\text{s}$.
5. **Cosmic Space Reverb / Delay Simulation**:
   - `DelayNode`: delay time $= 140\text{ ms}$.
   - Feedback `GainNode`: gain $= 0.32$.
   - High-frequency damping: `BiquadFilterNode` (`lowpass`, $1400\text{ Hz}$) in the feedback loop to create dark cosmic depth.
6. **Violin Body Acoustic Formant**:
   - `BiquadFilterNode`: `type = 'peaking'`, `frequency = 1850 Hz`, `Q = 2.4`, `gain = 4 dB`.
7. **Total Duration**: $1.35\text{s}$.

---

### 3.4 Sound 3: "Chuông bong bóng" (Bubble Chime / Crystalline Ping)

**Acoustic Character**: A bright, crystalline chime combined with a rapid bubbling transient. High-tech and sparkling, perfectly matching cosmic starlight.

#### Node Graph:
```
[Modulator Osc: Sine (2 * fc)] ---> [Modulator Gain (750 -> 0)] --\
                                                                    v
[Carrier Osc: Sine (fc)] -----------------------------------------> [Carrier Gain (Chime Envelope)] ---\
                                                                                                        +--> Master Gain
[Sparkle Osc: Sine (3 * fc)] -------------------------------------> [Sparkle Gain (Fast Decay)] --------/
```

#### Synthesis Parameters:
1. **FM (Frequency Modulation) Synthesis**:
   - Carrier Fundamental $f_c = 1046.5\text{ Hz}$ (C6).
   - Pitch Chirp: Carrier frequency sweeps from $780\text{ Hz}$ to $1046.5\text{ Hz}$ in the first $0.035\text{s}$ (the "bubble pop").
   - Modulator Frequency $f_m = 2093.0\text{ Hz}$ (2:1 integer harmonic ratio for crystalline bell tone).
   - Modulation Index Gain: Starts at $750$ at $t_0$, exponentially decays to $0$ within $0.09\text{s}$ (creates the crisp metallic strike at the transient).
2. **Sparkle Over-Chime**:
   - Secondary sine oscillator at $3135.96\text{ Hz}$ (G7).
   - Gain: Instant attack to $0.2$, exponential decay to $0.001$ in $0.25\text{s}$.
3. **Chime Amplitude Envelope**:
   - Attack: $0.002\text{s}$ (immediate glass tap).
   - Decay: Exponential curve over $0.85\text{s}$ down to silence.
4. **Total Duration**: $0.85\text{s}$.

---

### 3.5 Audio Engine API Contract

```typescript
export type SoundThemeId = 'ripple' | 'violin' | 'chime';

export interface AudioEngineService {
  initContext(): Promise<void>;
  playSound(theme: SoundThemeId, volume?: number): Promise<void>;
  playQuickTap(): void;
  playGoalReachedCelebration(): Promise<void>;
}
```

---

## 4. Offline Persistence & Dual-Layer Storage Engine (`src/services/storageService.ts`)

### 4.1 The Dual-Layer Architecture

Mobile WebViews on Android (via Capacitor) can occasionally flush `localStorage` when memory is reclaimed or system webview packages update. Simultaneously, pure asynchronous storage like `@capacitor/preferences` introduces React rendering latency and flashes of unstyled content during synchronous component mount.

The solution is a **Dual-Layer Write-Through & Reconciling Storage Service**:
1. **Layer 1 (`localStorage`)**: Synchronous in-memory caching. Guarantees $0\text{ ms}$ synchronous initial state hydration on React mount.
2. **Layer 2 (`@capacitor/preferences`)**: Native Android `SharedPreferences`. Guarantees persistent storage resilient against process death, app restarts, and cache eviction.

```
       +---------------------------------------------+
       |             StorageService.save(key, val)   |
       +---------------------+-----------------------+
                             |
              +--------------+--------------+
              |                             |
              v (synchronous)               v (asynchronous non-blocking)
      +---------------+             +---------------------------+
      |  localStorage |             |  @capacitor/preferences   |
      |   (Instant)   |             |  (Android SharedPreferences)|
      +---------------+             +---------------------------+
```

### 4.2 Storage Schema & Key Definitions

#### 1. Key: `voyager_user_profile`
```typescript
export interface UserProfile {
  id: string;                      // UUID or "default_user"
  name: string;                    // Default: "Mạnh"
  avatarUrl?: string;              // Custom image or preset
  customAvatarData?: string;       // Base64 PNG/GIF from device upload
  companionVersion: 1 | 2 | 3 | 4 | 5 | 6; // 6 unlocked Voyager companions
  activeTheme: 'deep_space' | 'nebula_aurora' | 'supernova_gold' | 'cosmic_ocean';
  weightKg: number;                // Default: 60
  heightCm: number;                // Default: 170
  age: number;                     // Default: 24
  activityLevel: ActivityLevel;    // 'sedentary' | 'moderate' | 'high'
  autoAdjustWeather: boolean;      // Default: true
  customDailyTargetMl?: number | null; // Manual override if specified
  unit: 'ml' | 'L';                // Default: 'L'
  soundEnabled: boolean;           // Default: true
  selectedSound: SoundThemeId;     // 'ripple' | 'violin' | 'chime'
  language: 'vi';                  // Default: 'vi'
  reminderMode: ReminderMode;      // 'gentle' | 'smart' | 'regular'
  wakeTime: string;                // "HH:mm", Default: "07:00"
  sleepTime: string;               // "HH:mm", Default: "01:00"
  reminderEnabled: boolean;        // Default: true
  streak: number;                  // Current active day streak
  longestStreak: number;           // Record streak
  lastActiveDate: string;          // "YYYY-MM-DD"
}
```

#### 2. Key: `voyager_daily_logs`
Stored as a date-indexed hash map `Record<string, DailyHydrationRecord>`:
```typescript
export interface HydrationEntry {
  id: string;                      // UUID or timestamp-based ID
  timestamp: number;               // Epoch millisecond
  time: string;                    // "HH:mm" formatted
  amountMl: number;                // Volume in ml (e.g. 50, 150, 250, 500)
  containerType?: 'cup' | 'bottle' | 'glass' | 'custom';
}

export interface DailyHydrationRecord {
  date: string;                    // "YYYY-MM-DD"
  targetMl: number;                // Calculated target for this date
  consumedMl: number;              // Total consumed
  entries: HydrationEntry[];       // Chronological logs
  isGoalReached: boolean;          // true when consumedMl >= targetMl
  weatherSnapshot?: WeatherData;   // Recorded weather conditions
}
```

#### 3. Key: `voyager_weather_cache`
```typescript
export interface CachedWeatherRecord {
  data: WeatherData;
  timestamp: number;
  latitude: number;
  longitude: number;
  locationName: string;
}
```

### 4.3 Data Export & Import Specification

1. **JSON Export (`voyager_hydration_export_{timestamp}.json`)**:
   Contains complete user profile, logs, history, and metadata.
2. **CSV Export (`voyager_hydration_history_{timestamp}.csv`)**:
   Standardized UTF-8 BOM CSV for spreadsheet compatibility (Excel / Google Sheets):
   ```csv
   Ngày,Mục tiêu (ml),Đã uống (ml),Tỷ lệ (%),Trạng thái,Số lần uống
   2026-10-28,2100,2150,102.4%,Hoàn thành,7
   2026-10-29,2450,2500,102.0%,Hoàn thành,8
   2026-10-30,2350,1250,53.2%,Đang thực hiện,4
   ```

---

## 5. Local Notification & Scheduling Engine (`src/services/notificationService.ts`)

### 5.1 Scheduling Modes

The application supports 3 distinct reminder modes:
1. **"Nhẹ nhàng" (Gentle)**:
   - For users who prefer minimal interruptions.
   - Fixed spacing: Every $180\text{ minutes}$ (3 hours) during waking hours.
   - Typically triggers $3 - 4$ times per day.
2. **"Thông minh" (Smart - Default)**:
   - Dynamically calculates the optimal interval based on the **remaining water deficit** and **remaining waking hours** before bedtime.
3. **"Đều đặn" (Regular / Fixed)**:
   - Fixed periodic interval: Every $90\text{ minutes}$ (1.5 hours) during waking hours.

### 5.2 The Smart Interval Calculation Algorithm

Let:
- $T_{now}$ be current clock time.
- $T_{wake}$ be wake time (e.g. `07:00`).
- $T_{sleep}$ be sleep time (e.g. `01:00`).
- $W_{target}$ be daily goal (e.g. $2150\text{ ml}$).
- $W_{consumed}$ be consumed volume (e.g. $650\text{ ml}$).
- $V_{cup}$ be standard portion volume ($250\text{ ml}$).

#### Step 1: Deficit Evaluation
$$\Delta W = \max(0, W_{target} - W_{consumed})$$
- If $\Delta W = 0$: Goal already achieved for the day!
  Cancel remaining drink alarms for today; schedule a single celebratory or maintenance prompt, or pause notifications until tomorrow $T_{wake}$.

#### Step 2: Glasses Remaining
$$N_{glasses} = \left\lceil \frac{\Delta W}{V_{cup}} \right\rceil$$

#### Step 3: Available Awake Window ($\Delta T_{awake}$)
Calculate minutes until sleep time $T_{sleep}$:
If $T_{sleep} < T_{wake}$ (e.g. $01:00 < 07:00$, spanning midnight):
$$\text{MinutesToSleep} = \begin{cases} (T_{sleep} + 24\text{h}) - T_{now} & \text{if } T_{now} \ge T_{wake} \\ T_{sleep} - T_{now} & \text{if } T_{now} < T_{sleep} \end{cases}$$

#### Step 4: Interval Determination & Clamping
$$\text{RawInterval} = \frac{\text{MinutesToSleep}}{N_{glasses}}$$
$$\text{CalculatedInterval} = \text{clamp}(45\text{ min}, \text{RawInterval}, 150\text{ min})$$

*Example*:
- At 14:00 ($T_{now} = 14:00$). Sleep time $01:00$ (+11 hours = $660\text{ minutes}$).
- Deficit: $1500\text{ ml} \implies N_{glasses} = 1500 / 250 = 6$ glasses.
- Raw interval: $660 / 6 = 110\text{ minutes}$ (1h 50m).
- Next reminder scheduled at: $14:00 + 110\text{m} = 15:50$.

---

### 5.3 Strict Quiet Hours Enforcement (01:00 - 07:00)

**Rule**: Under NO circumstances may any notification trigger between $01:00$ and $07:00$.

#### Algorithm for quiet window check:
```typescript
export function isInQuietHours(date: Date, wakeTime = "07:00", sleepTime = "01:00"): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentTotal = hours * 60 + minutes;

  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  const [sleepH, sleepM] = sleepTime.split(':').map(Number);
  const wakeTotal = wakeH * 60 + wakeM;   // e.g. 7 * 60 = 420
  const sleepTotal = sleepH * 60 + sleepM; // e.g. 1 * 60 = 60

  if (sleepTotal < wakeTotal) {
    // Crosses midnight: quiet hours are from sleepTotal to wakeTotal (01:00 to 07:00)
    return currentTotal >= sleepTotal && currentTotal < wakeTotal;
  } else {
    // Normal same-day window
    return currentTotal >= sleepTotal || currentTotal < wakeTotal;
  }
}

export function adjustForQuietHours(scheduledDate: Date, wakeTime = "07:00", sleepTime = "01:00"): Date {
  if (!isInQuietHours(scheduledDate, wakeTime, sleepTime)) {
    return scheduledDate;
  }
  // If scheduled inside quiet hours, forward to wakeTime of the same or next morning
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  const adjusted = new Date(scheduledDate);
  adjusted.setHours(wakeH, wakeM, 0, 0);
  if (adjusted.getTime() <= scheduledDate.getTime()) {
    adjusted.setDate(adjusted.getDate() + 1);
  }
  return adjusted;
}
```

---

### 5.4 Notification Thematic Message Matrix (Reverse: 1999 Voyager Theme)

| Trigger Type | Title | Body (Vietnamese) | Voyager Chibi Mood |
|---|---|---|---|
| **Standard Gentle** | Voyager nhắc bạn ✨ | "Một nốt nhạc ngân hà vừa ngân lên... Hãy uống một ngụm nước để tinh cầu luôn tràn đầy sức sống nhé!" | `gentle` |
| **Smart Deficit** | Vũ trụ khát nước rồi! 🌌 | "Bạn còn thiếu {deficit} ml nữa để đạt mục tiêu. Voyager đã chuẩn bị sẵn một ly nước mát cho bạn rồi đây!" | `idle` |
| **Urgent Evening** | Tiếng đàn thúc giục 🎻 | "Chuyến du hành hôm nay sắp kết thúc mà mục tiêu nước vẫn chưa xong! Uống một ly ngay cùng Voyager nào!" | `strict` |
| **Morning Wakeup** | Bình minh tinh cầu ☀️ | "Chào buổi sáng thuyền trưởng Mạnh! Bắt đầu ngày mới với 250 ml nước thanh khiết nhé!" | `happy` |
| **Goal Completed** | Tinh cầu rực sáng! 🎉 | "Tuyệt vời quá! Mục tiêu hôm nay đã hoàn thành trọn vẹn. Voyager đang tấu bản nhạc chúc mừng bạn!" | `happy` |

---

### 5.5 Capacitor Local Notifications Integration (`@capacitor/local-notifications`)

1. **Android Notification Channel Setup**:
   ```typescript
   await LocalNotifications.createChannel({
     id: 'voyager_hydration_reminders',
     name: 'Nhắc nhở uống nước Voyager',
     description: 'Kênh thông báo nhắc nhở uống nước vũ trụ',
     importance: 4, // High importance (heads-up banner)
     visibility: 1, // Public
     vibration: true,
     sound: 'res_cosmic_chime.wav'
   });
   ```

2. **Permissions Request**:
   Must check and request `POST_NOTIFICATIONS` permission (mandatory on Android 13+):
   ```typescript
   const status = await LocalNotifications.checkPermissions();
   if (status.display !== 'granted') {
     await LocalNotifications.requestPermissions();
   }
   ```

3. **Multi-Slot Rolling Scheduling**:
   Instead of scheduling dozens of notifications weeks in advance, the engine schedules a **rolling queue of the next 5 reminders**. Each time the user logs water or opens the app, the queue is cleared and refreshed with newly computed deficit parameters.

---

## 6. Comprehensive Edge Case & Fault Tolerance Matrix

| # | Edge Case / Scenario | Exact Input | Expected Observable Behavior | System Safeguard |
|---|---|---|---|---|
| 1 | **Zero or negative weight** | `weight = 0` or `-15 kg` | System treats as invalid; clamps to default fallback $60.0\text{ kg} \implies W_{base} = 2100\text{ ml}$. | `Math.max(20, Math.min(300, weight || 60))` |
| 2 | **Extreme weight boundary** | `weight = 350 kg` | Clamped to max $300\text{ kg} \implies W_{base} = 10500\text{ ml}$. | Prevents numerical overflow or UI layout breakage. |
| 3 | **Weather boundary: exactly 28°C** | `T = 28.0°C, H = 50%` | Boundary condition $28^\circ\text{C} \le T \le 32^\circ\text{C}$ met $\implies \Delta W_{temp} = +250\text{ ml}$. Total weather $= +250\text{ ml}$. | Operator `>= 28.0 && <= 32.0`. |
| 4 | **Weather boundary: exactly 32°C** | `T = 32.0°C, H = 50%` | Boundary condition $28^\circ\text{C} \le T \le 32^\circ\text{C}$ met $\implies \Delta W_{temp} = +250\text{ ml}$. | Inclusive upper bound `<= 32.0`. |
| 5 | **Weather boundary: 32.1°C** | `T = 32.1°C, H = 50%` | Strictly $> 32.0^\circ\text{C} \implies \Delta W_{temp} = +500\text{ ml}$. | Operator `> 32.0`. |
| 6 | **Humidity boundary: exactly 40%** | `T = 26.0°C, H = 40.0%` | Rule is strictly $H < 40\% \implies \Delta W_{humid} = 0\text{ ml}$. | Operator `< 40.0`. |
| 7 | **Humidity boundary: 39.9%** | `T = 26.0°C, H = 39.9%` | Strictly $< 40\% \implies \Delta W_{humid} = +150\text{ ml}$. | Operator `< 40.0`. |
| 8 | **Extreme Heat + Arid combined** | `T = 37°C, H = 25%` | $\Delta W_{temp} = 500$, $\Delta W_{humid} = 150 \implies W_{weather} = +650\text{ ml}$. | Cumulative addition rule verified. |
| 9 | **GPS denied or disabled** | Permission status: `'denied'` | Gracefully catches error; uses Hà Nội fallback (`21.0285, 105.8542`). Weather fetched without crash. | `try / catch` around Geolocation call. |
| 10 | **Complete network blackout** | `fetch` throws `TypeError: Failed to fetch` | Catches network exception; looks up `voyager_weather_cache`. If missing, returns default mock with $\Delta W_{weather} = 0$. UI flags offline. | Resilient offline fallback. |
| 11 | **User drinks over 200% of goal** | Consumed: $5000\text{ ml}$, Target: $2000\text{ ml}$ | Wave reservoir visual percentage clamped to $100\%$ (or $105\%$) to prevent wave clipping header; text shows full `5,0 / 2,0 L` ($250\%$). Deficit $= 0$. | Visual CSS percentage clamp `Math.min(100, pct)`. |
| 12 | **Midnight transition (23:59 -> 00:01)** | Date changes | System detects new date `YYYY-MM-DD`. Daily record initializes fresh consumed $= 0$; streak incremented if yesterday reached goal. | Daily rollover check on `onFocus` and interval. |
| 13 | **Quiet hours reminder overlap** | Reminder calculated at `02:30 AM` | `adjustForQuietHours()` detects quiet window $[01:00, 07:00)$; advances reminder to `07:00 AM`. | Zero disturbance during sleep. |
| 14 | **Web Audio Context Suspended** | Browser autoplay policy blocks sound | `playHydrationSound()` verifies `ctx.state === 'suspended'`; performs `await ctx.resume()` on user click before node scheduling. | Seamless unlock on first touch. |
| 15 | **Rapid multiple clicks on sound test** | User taps "Violin Tinh cầu" 10 times in 1s | Each tap initializes lightweight sound node graph without leaking AudioContext; master limiter prevents audio distortion. | Ephemeral AudioNodes connected to master bus. |

---

## 7. Verification & Acceptance Test Suite

### 7.1 Unit Tests Specification (`src/utils/__tests__/hydrationEngine.test.ts`)

The test suite must implement tests for all of the following assertion blocks:
```typescript
describe('Hydration Calculation Logic', () => {
  test('W_base correctly multiplies weight by 35', () => {
    expect(calculateBaseWater(60)).toBe(2100);
    expect(calculateBaseWater(70)).toBe(2450);
    expect(calculateBaseWater(0)).toBe(2100); // fallback default
  });

  test('W_activity returns 0, 350, 700 for respective levels', () => {
    expect(calculateActivityWater('sedentary')).toBe(0);
    expect(calculateActivityWater('moderate')).toBe(350);
    expect(calculateActivityWater('high')).toBe(700);
  });

  test('W_weather applies temperature and humidity thresholds cumulatively', () => {
    // Normal
    expect(calculateWeatherWater({ temperature: 25, relativeHumidity: 50 } as any, true).total).toBe(0);
    // Temp 28 - 32
    expect(calculateWeatherWater({ temperature: 28, relativeHumidity: 50 } as any, true).total).toBe(250);
    expect(calculateWeatherWater({ temperature: 32, relativeHumidity: 50 } as any, true).total).toBe(250);
    // Temp > 32
    expect(calculateWeatherWater({ temperature: 33, relativeHumidity: 50 } as any, true).total).toBe(500);
    // Humidity < 40%
    expect(calculateWeatherWater({ temperature: 25, relativeHumidity: 35 } as any, true).total).toBe(150);
    // Cumulative hot + dry
    expect(calculateWeatherWater({ temperature: 35, relativeHumidity: 30 } as any, true).total).toBe(650);
    // Auto adjust disabled
    expect(calculateWeatherWater({ temperature: 35, relativeHumidity: 30 } as any, false).total).toBe(0);
  });

  test('Round to nearest 50 ml functions properly', () => {
    expect(roundToNearest50(2120)).toBe(2100);
    expect(roundToNearest50(2125)).toBe(2150);
    expect(roundToNearest50(2149)).toBe(2150);
    expect(roundToNearest50(2175)).toBe(2200);
  });

  test('Remaining cups calculation properly rounds up deficit', () => {
    expect(calculateRemainingCups(2000, 1500, 250)).toBe(2);
    expect(calculateRemainingCups(2000, 1600, 250)).toBe(2);
    expect(calculateRemainingCups(2000, 2000, 250)).toBe(0);
    expect(calculateRemainingCups(2000, 2500, 250)).toBe(0);
  });
});
```

---
*End of Technical Specification Report.*
