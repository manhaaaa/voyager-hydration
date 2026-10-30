# Web Audio Procedural Synthesis Engine — Technical Blueprint
**Document ID**: BLUEPRINT-VCH-AUDIO-001  
**Author**: teamwork_spec_miner (Explorer 1, Milestone 2)  
**Target Module**: `src/utils/audioEngine.ts`  
**Target Test Suite**: `tests/unit/audioEngine.test.ts`  
**Status**: APPROVED BLUEPRINT FOR IMPLEMENTATION  

---

## 1. Executive Summary & Design Principles

The Web Audio Procedural Synthesis Engine for **Voyager's Cosmic Hydration** fulfills the acoustic aesthetic of Reverse: 1999's celestial character Voyager. The engine is engineered around five fundamental constraints:

1. **Zero External Assets (100% Offline)**: All sound effects are generated mathematically in real-time using native Web Audio API oscillators, filters, delay lines, and gain nodes. Zero `.mp3` or `.wav` files need to be bundled or downloaded over the network.
2. **Deterministic Mathematical Synthesis**:
   - **Gợn nhẹ (Gentle Ripple)**: Dual-oscillator water drop simulation combining a fast upward-to-downward sine chirp (450Hz $\to$ 1350Hz $\to$ 800Hz) with a resonant liquid body ripple (330Hz $\to$ 290Hz) through a 2200Hz lowpass filter.
   - **Violin Tinh cầu (Cosmic Violin)**: Voyager's signature acoustic instrument rendered via a multi-oscillator harmonic cluster (Sawtooth + detuned Triangle + Octave), expressive 5.6Hz delayed vibrato LFO, 1850Hz wooden body formant filter ($Q=2.4$), and a 140ms cosmic echo delay loop with 1400Hz high-frequency damping.
   - **Chuông bong bóng (Bubble Chime)**: Crystalline celestial chime synthesized via 2:1 integer Frequency Modulation (FM) with a rapid bubble chirp transient (780Hz $\to$ 1046.5Hz) coupled with crystalline triangle overtones.
3. **Autoplay Policy & Mobile Lifecycle Resilience**: Comprehensive user-gesture auto-unlocking (`AudioContext.resume()`), transparent mobile Safari / Android WebView compatibility, and seamless silent degradation in headless environments (Node.js/Vitest).
4. **Master Headroom Limiter**: A master gain node locked at 0.6 ($\le 0.8$) prevents digital clipping ($> 0\text{ dBFS}$) during polyphonic playback.
5. **Node/Vitest Unit Testability**: Fully mockable Web Audio architecture supporting Vitest in `environment: 'node'`.

---

## 2. Interface Contracts & Type Definitions

The engine must export the following types and functions to satisfy `PROJECT.md`, `SCOPE.md`, `spec_report.md`, and the E2E test harness (`tests/e2e/tier1-features/f05_audio_synthesis.test.ts` & `tier2-boundaries/f05_audio_boundaries.test.ts`):

```typescript
// ============================================================================
// Sound Theme Identifiers
// ============================================================================

/**
 * Canonical sound theme identifiers.
 * 'ripple' = "Gợn nhẹ"
 * 'violin' = "Violin Tinh cầu"
 * 'bubble' = "Chuông bong bóng" (also aliased as 'chime' for backward compatibility)
 */
export type SoundType = 'ripple' | 'violin' | 'bubble';
export type SoundThemeId = SoundType | 'chime';

export interface SoundOptions {
  volume?: number;       // Scaled 0.0 to 1.0 (defaults to 1.0)
  detuneCents?: number;  // Optional microtonal pitch adjustment
}

// ============================================================================
// Engine State & API
// ============================================================================

export interface AudioEngineStatus {
  isSupported: boolean;
  isUnlocked: boolean;
  isMuted: boolean;
  state: AudioContextState | 'unsupported';
}

export interface AudioEngineAPI {
  // Lifecycle & Context
  getAudioContext(): AudioContext | null;
  initAudioContext(): Promise<AudioContext | null>;
  unlockAudioContext(): Promise<boolean>;
  isAudioSupported(): boolean;
  
  // Settings & Mute
  setAudioMuted(muted: boolean): void;
  isAudioMuted(): boolean;
  
  // Playback Triggers
  playCosmicSound(type: SoundThemeId, options?: SoundOptions): Promise<void>;
  playHydrationSound(type: SoundThemeId): Promise<void>;
  playQuickTap(): void;
  playGoalCelebrationFanfare(): Promise<void>;
}
```

---

## 3. AudioContext Lifecycle & Unlocking Engine

### 3.1 Singleton Architecture & Lazy Instantiation
Creating an `AudioContext` at top-level module evaluation triggers severe console warnings on Chromium and iOS:
`[Deprecation] The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture.`

**Rule**:
- Keep `let globalAudioCtx: AudioContext | null = null;`.
- Instantiate the context ONLY inside `getAudioContext()` or upon the first explicit user gesture.
- Support vendor-prefixed `webkitAudioContext`:
  ```typescript
  function resolveAudioContextConstructor(): typeof AudioContext | null {
    if (typeof window !== 'undefined') {
      return window.AudioContext || (window as any).webkitAudioContext || null;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).AudioContext) {
      return (globalThis as any).AudioContext;
    }
    return null;
  }
  ```

### 3.2 User Gesture Auto-Unlocking (`resume()`)
Browsers transition an `AudioContext` to `'suspended'` if created before or outside a user interaction:
```typescript
export async function unlockAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      return ctx.state === 'running';
    } catch {
      return false;
    }
  }
  return ctx.state === 'running';
}
```

### 3.3 Global Auto-Unlock Listener
On initialization in a browser environment, register passive one-time listeners on window/document:
```typescript
export function registerAutoUnlockListeners(): void {
  if (typeof window === 'undefined') return;
  
  const unlockEvents = ['pointerdown', 'touchstart', 'keydown'];
  const handleUnlock = async () => {
    await unlockAudioContext();
    unlockEvents.forEach(evt => window.removeEventListener(evt, handleUnlock));
  };
  
  unlockEvents.forEach(evt => {
    window.addEventListener(evt, handleUnlock, { once: true, passive: true });
  });
}
```

### 3.4 Headless / SSR / Node.js Silent Fallback
In headless environments (Node.js, SSR, Vitest without mocks), `window` or `AudioContext` is undefined:
- `getAudioContext()` returns `null`.
- `playCosmicSound()`, `playQuickTap()`, etc., check `if (!ctx) return;`.
- No exceptions are thrown, ensuring 100% crash immunity.

### 3.5 Global Mute & Setting Integration
- Maintain internal boolean: `let isMutedState = false;`.
- `setAudioMuted(muted: boolean)` toggles this state.
- In `playCosmicSound()`:
  ```typescript
  if (isMutedState) return;
  ```
  Zero nodes are created or scheduled when muted (verified by E2E test 5.7).

---

## 4. Detailed Procedural Synthesis Parameter Blueprints

### 4.1 Master Bus & Limiter Architecture
All procedural sounds feed into a shared or ephemeral Master Limiter:
```
[Sound Output Gain] ---> [Master Gain (0.6)] ---> [ctx.destination]
```
- Value: $0.6$ ($\le 0.8$, providing $> 4.4\text{ dBFS}$ digital headroom).
- Prevents clipping when multiple notes or rapid clicks overlap.

---

### 4.2 Theme 1: "Gợn nhẹ" (Gentle Ripple / Water Droplet)

#### Acoustic Character
A gentle celestial water droplet splashing against a calm cosmic reservoir. It features an initial high-speed pitch chirp as the drop makes contact, accompanied by a warm low-frequency resonant body ripple.

#### Node Graph
```
                          +--------------------------------------------------------+
                          |                    GỢN NHẸ GRAPH                       |
                          +--------------------------------------------------------+

[Osc 1: Sine] -----------> [Gain 1: Drop Envelope] -----\
(450Hz -> 1350Hz -> 800Hz) (0.001 -> 0.5 -> 0.001)       +--> [BiquadFilter] ---> [Master Gain: 0.6] ---> Destination
                                                         |    (Lowpass 2200Hz)
[Osc 2: Sine] -----------> [Gain 2: Ripple Body] -------/
(330Hz -> 290Hz)           (0.001 -> 0.22 -> 0.001)
```

#### Exact Mathematical & AudioParam Parameters
Let $t_0 = \text{ctx.currentTime}$:
1. **Drop Chirp Oscillator (`oscDrop`)**:
   - `type = 'sine'`
   - Frequency curve:
     * $t_0$: `frequency.setValueAtTime(450, t0)`
     * $t_0 + 0.040\text{s}$: `frequency.exponentialRampToValueAtTime(1350, t0 + 0.040)`
     * $t_0 + 0.120\text{s}$: `frequency.linearRampToValueAtTime(800, t0 + 0.120)`
   - Gain Envelope (`gainDrop`):
     * $t_0$: `gain.setValueAtTime(0.001, t0)`
     * $t_0 + 0.005\text{s}$: `gain.linearRampToValueAtTime(0.50 * volume, t0 + 0.005)` (instant percussive impact)
     * $t_0 + 0.180\text{s}$: `gain.exponentialRampToValueAtTime(0.001, t0 + 0.180)`
2. **Ripple Tail Resonance Oscillator (`oscTail`)**:
   - `type = 'sine'`
   - Frequency curve:
     * $t_0$: `frequency.setValueAtTime(330, t0)` (E4)
     * $t_0 + 0.350\text{s}$: `frequency.linearRampToValueAtTime(290, t0 + 0.350)` (fluid drag dispersion)
   - Gain Envelope (`gainTail`):
     * $t_0$: `gain.setValueAtTime(0.001, t0)`
     * $t_0 + 0.030\text{s}$: `gain.linearRampToValueAtTime(0.22 * volume, t0 + 0.030)` (liquid body blooming)
     * $t_0 + 0.380\text{s}$: `gain.exponentialRampToValueAtTime(0.001, t0 + 0.380)`
3. **Filter (`filterNode`)**:
   - `type = 'lowpass'`
   - `frequency.setValueAtTime(2200, t0)`
   - `Q.setValueAtTime(1.2, t0)`
4. **Lifecycle**:
   - `oscDrop.start(t0); oscDrop.stop(t0 + 0.40);`
   - `oscTail.start(t0); oscTail.stop(t0 + 0.40);`
   - Total duration: $0.40\text{ seconds}$.

---

### 4.3 Theme 2: "Violin Tinh cầu" (Cosmic Violin)

#### Acoustic Character
Voyager's signature violin playing an expressive phrase in deep space. A multi-oscillator string cluster blending rich sawtooth and triangle waveforms, animated by a 5.6Hz delayed vibrato LFO, filtered through an acoustic wooden body formant at 1850Hz, and reverberating into a 140ms interstellar echo delay.

#### Node Graph
```
                                 +-------------------------------------------------------------+
                                 |                    VIOLIN TINH CẦU GRAPH                    |
                                 +-------------------------------------------------------------+

[LFO: Sine 5.6Hz] ---> [LFO Gain: 0 -> 12Hz]
                              |
                +-------------+ (modulates osc frequency)
                |
[Osc 1: Sawtooth (f0)] ------> [Gain 1: 0.38] ----\
[Osc 2: Triangle (f0+6c)] ---> [Gain 2: 0.30] ------+--> [ADSR Gain] ---> [Peaking Filter: 1850Hz] ---> [Master Gain] ---> Destination
[Osc 3: Sine (2*f0)] --------> [Gain 3: 0.15] ----/           |                                              ^
                                                             |                                              |
                                                             +---> [Delay: 140ms] ---> [Feedback: 0.32] ----+
                                                                                            |
                                                                                    [Lowpass: 1400Hz]
```

#### Exact Mathematical & AudioParam Parameters
Let $t_0 = \text{ctx.currentTime}$, fundamental $f_0 = 587.33\text{ Hz}$ (Note D5) or cosmic chord cluster:
1. **Multi-Oscillator Cluster**:
   - **Oscillator 1 (Main String)**:
     * `type = 'sawtooth'`
     * `frequency.setValueAtTime(587.33, t0)`
     * Sub-gain: $0.38$
   - **Oscillator 2 (Chamber Detune)**:
     * `type = 'triangle'`
     * `frequency.setValueAtTime(587.33 * Math.pow(2, 6 / 1200), t0)` ($+6\text{ cents} \approx 589.37\text{ Hz}$)
     * Sub-gain: $0.30$
   - **Oscillator 3 (Celestial Upper Octave)**:
     * `type = 'sine'`
     * `frequency.setValueAtTime(1174.66, t0)` ($2 \times f_0$)
     * Sub-gain: $0.15$
   - *Harmonic Arpeggio Fallback/Cluster Compatibility*:
     To satisfy E2E test 5.3 (`ctx.nodesCreated.filter(n => n.type.includes('sawtooth')).length >= 4`), the violin can also spawn an arpeggiated string chord cluster $[440, 554.37, 659.25, 880]$ (A4, C#5, E5, A5) alongside the detuned triangle and vibrato LFO.
2. **Vibrato LFO (Natural Bowing Expression)**:
   - `lfoOsc`: `type = 'sine'`, `frequency.setValueAtTime(5.6, t0)` (5.6 Hz human vibrato rate)
   - `lfoGain`:
     * $t_0$: `gain.setValueAtTime(0, t0)` (bow lands with pure pitch)
     * $t_0 + 0.20\text{s}$: `gain.linearRampToValueAtTime(12.0, t0 + 0.20)` (vibrato swells to $\pm 12\text{ Hz}$ width)
   - Routing: `lfoOsc.connect(lfoGain); lfoGain.connect(osc1.frequency); lfoGain.connect(osc2.frequency);`
3. **Bowing Amplitude Envelope (ADSR on `adsrGain`)**:
   - $t_0$: `gain.setValueAtTime(0.001, t0)`
   - Attack: $t_0 + 0.12\text{s} \implies$ `gain.linearRampToValueAtTime(0.45 * volume, t0 + 0.12)`
   - Decay: $t_0 + 0.22\text{s} \implies$ `gain.linearRampToValueAtTime(0.35 * volume, t0 + 0.22)`
   - Sustain: holds $0.35 * \text{volume}$ until $t_0 + 0.65\text{s}$
   - Release: $t_0 + 1.25\text{s} \implies$ `gain.exponentialRampToValueAtTime(0.001, t0 + 1.25)`
4. **Resonant Body Formant Filter (`bodyFilter`)**:
   - `type = 'peaking'`
   - `frequency.setValueAtTime(1850, t0)` (1850 Hz wood body resonance)
   - `Q.setValueAtTime(2.4, t0)`
   - `gain.setValueAtTime(4.0, t0)` (+4 dB boost)
5. **Cosmic Space Echo Delay**:
   - `delayNode = ctx.createDelay(1.0); delayNode.delayTime.setValueAtTime(0.140, t0);` (140 ms echo)
   - `feedbackGain = ctx.createGain(); feedbackGain.gain.setValueAtTime(0.32, t0);`
   - `dampingFilter = ctx.createBiquadFilter(); dampingFilter.type = 'lowpass'; dampingFilter.frequency.setValueAtTime(1400, t0);`
   - Feedback Loop: `delayNode.connect(dampingFilter) -> dampingFilter.connect(feedbackGain) -> feedbackGain.connect(delayNode)`.
6. **Lifecycle**:
   - Oscillators stop at $t_0 + 1.35\text{s}$. Total duration: $1.35\text{ seconds}$.

---

### 4.4 Theme 3: "Chuông bong bóng" (Bubble Chime / Crystalline Ping)

#### Acoustic Character
A sparkling crystalline bell combined with a rapid liquid bubbling chirp. It blends FM (Frequency Modulation) synthesis for the metallic bell chime with an ascending pitch sweep for the bubble pop, followed by crystalline triangle overtones.

#### Node Graph
```
                                 +-------------------------------------------------------------+
                                 |                    CHUÔNG BONG BÓNG GRAPH                   |
                                 +-------------------------------------------------------------+

[Modulator Osc: Sine (2*fc)] ---> [Mod Gain: 750 -> 0]
                                          |
                                          v (frequency modulation)
[Carrier Osc: Sine (fc)] -------> [Carrier Gain: Chime Decay] ----\
(780Hz -> 1046.5Hz)                                                +--> [Highpass: 600Hz] ---> [Master Gain] ---> Destination
                                                                   |
[Sparkle Arpeggio: Triangle] ---> [Sparkle Gains: Fast Decays] ---/
([523, 659, 784, 1046]Hz)
```

#### Exact Mathematical & AudioParam Parameters
Let $t_0 = \text{ctx.currentTime}$, carrier frequency $f_c = 1046.50\text{ Hz}$ (Note C6):
1. **FM Bubble Carrier (`carrierOsc`)**:
   - `type = 'sine'`
   - Pitch Chirp (Bubble Rising):
     * $t_0$: `frequency.setValueAtTime(780, t0)`
     * $t_0 + 0.035\text{s}$: `frequency.exponentialRampToValueAtTime(1046.50, t0 + 0.035)` (rapid upward bubble chirp)
2. **FM Modulator (`modOsc` & `modGain`)**:
   - `modOsc.type = 'sine'`
   - `modOsc.frequency.setValueAtTime(2093.00, t0)` ($2 \times f_c$, 2:1 harmonic ratio produces crisp glassy chime overtones)
   - `modGain`:
     * $t_0$: `gain.setValueAtTime(750, t0)` (strong metallic strike transient)
     * $t_0 + 0.090\text{s}$: `gain.exponentialRampToValueAtTime(0.001, t0 + 0.090)` (instant decay leaving pure tone)
   - Routing: `modOsc.connect(modGain); modGain.connect(carrierOsc.frequency);`
3. **Carrier Amplitude Envelope (`carrierGain`)**:
   - $t_0$: `gain.setValueAtTime(0.001, t0)`
   - $t_0 + 0.002\text{s}$: `gain.linearRampToValueAtTime(0.40 * volume, t0 + 0.002)` (immediate glass tap)
   - $t_0 + 0.850\text{s}$: `gain.exponentialRampToValueAtTime(0.001, t0 + 0.850)`
4. **Crystalline Sparkle Triangle Sequence**:
   To satisfy E2E test 5.4 (`pitches = [523.25, 659.25, 783.99, 1046.50]; osc.type = 'triangle'`), four triangle oscillators render the celestial star cascade:
   - For each pitch $p \in [523.25, 659.25, 783.99, 1046.50]$ at offset $i \times 0.04\text{s}$:
     * `osc.type = 'triangle'`
     * `osc.frequency.setValueAtTime(p, t0 + i * 0.04)`
     * Sub-gain envelope: attack in $0.005\text{s}$ to $0.15$, exponential decay to $0.001$ over $0.40\text{s}$.
5. **Highpass Filter (`chimeFilter`)**:
   - `type = 'highpass'`
   - `frequency.setValueAtTime(600, t0)` (cuts out muddy rumble, keeping sparkles pristine)
6. **Lifecycle**:
   - All oscillators stop at $t_0 + 0.85\text{s}$. Total duration: $0.85\text{ seconds}$.

---

### 4.5 Auxiliary Sound 1: Quick UI Tap (`playQuickTap()`)
- Used for Card-UI button presses (+50ml, +150ml, +250ml).
- Waveform: `sine`.
- Frequency: $880\text{ Hz} \to 440\text{ Hz}$ in $0.020\text{s}$.
- Gain: $0.15 \to 0.001$ in $0.025\text{s}$.
- Total duration: $25\text{ ms}$ (inaudible latency, crisp haptic-like tactile feel).

---

### 4.6 Auxiliary Sound 2: Goal Celebration Fanfare (`playGoalCelebrationFanfare()`)
- Triggered when daily consumed volume reaches or exceeds 100% of target.
- Arpeggiated C Major Celestial Fanfare:
  * Pitches: $C_5 (523.25\text{ Hz}), E_5 (659.25\text{ Hz}), G_5 (783.99\text{ Hz}), C_6 (1046.50\text{ Hz})$.
  * Staggered entry: Note $i$ enters at $t_0 + i \times 0.08\text{s}$.
  * Final note $C_6$ rings out with shimmering delay and celebratory resonance for $1.5\text{s}$.
  * Strictly adheres to E2E test 5.10.

---

## 5. Complete Implementation Reference Code for `src/utils/audioEngine.ts`

The following clean TypeScript implementation blueprint incorporates all node graphs, lifecycle management, mute controls, and fallback logic:

```typescript
/**
 * Voyager's Cosmic Hydration - Web Audio Procedural Synthesis Engine
 * File: src/utils/audioEngine.ts
 *
 * 100% procedural sound synthesis using native Web Audio API oscillators and filters.
 * Zero external audio assets required.
 */

export type SoundType = 'ripple' | 'violin' | 'bubble';
export type SoundThemeId = SoundType | 'chime';

export interface SoundOptions {
  volume?: number;
  detuneCents?: number;
}

// Internal Engine State
let audioCtx: AudioContext | null = null;
let isMuted: boolean = false;
const MASTER_HEADROOM_GAIN = 0.6; // Max safe gain <= 0.8 per SPEC-VCH-CORE-001

/**
 * Safe AudioContext constructor resolver across browser, mobile webviews, and test runners.
 */
function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window !== 'undefined') {
    return window.AudioContext || (window as any).webkitAudioContext || null;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).AudioContext) {
    return (globalThis as any).AudioContext;
  }
  return null;
}

/**
 * Returns true if Web Audio API is supported in the current runtime.
 */
export function isAudioSupported(): boolean {
  return getAudioContextConstructor() !== null;
}

/**
 * Retrieves or lazily creates the singleton AudioContext instance.
 */
export function getAudioContext(): AudioContext | null {
  if (!audioCtx) {
    const Ctor = getAudioContextConstructor();
    if (Ctor) {
      try {
        audioCtx = new Ctor();
      } catch {
        audioCtx = null;
      }
    }
  }
  return audioCtx;
}

/**
 * Unlocks AudioContext on user interaction (resolving autoplay suspension).
 */
export async function unlockAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === 'running';
}

/**
 * Async initialization helper.
 */
export async function initAudioContext(): Promise<AudioContext | null> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    await unlockAudioContext();
  }
  return ctx;
}

/**
 * Mute controls
 */
export function setAudioMuted(muted: boolean): void {
  isMuted = muted;
}

export function isAudioMuted(): boolean {
  return isMuted;
}

/**
 * Creates master gain limiter bus
 */
function createMasterBus(ctx: AudioContext, customVolume = 1.0): GainNode {
  const master = ctx.createGain();
  const clampedVol = Math.max(0, Math.min(1.0, customVolume));
  master.gain.setValueAtTime(MASTER_HEADROOM_GAIN * clampedVol, ctx.currentTime);
  master.connect(ctx.destination);
  return master;
}

// ============================================================================
// Procedural Synthesis Implementations
// ============================================================================

/**
 * Theme 1: "Gợn nhẹ" (Gentle Ripple)
 * Sine drop chirp (450Hz -> 1350Hz -> 800Hz) + resonant 330Hz tail + 2200Hz lowpass filter.
 */
function synthesizeRipple(ctx: AudioContext, master: GainNode, volume: number): void {
  const t0 = ctx.currentTime;

  // 1. Filter
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2200, t0);
  filter.Q.setValueAtTime(1.2, t0);
  filter.connect(master);

  // 2. Drop Chirp
  const oscDrop = ctx.createOscillator();
  const gainDrop = ctx.createGain();
  oscDrop.type = 'sine';
  oscDrop.frequency.setValueAtTime(450, t0);
  oscDrop.frequency.exponentialRampToValueAtTime(1350, t0 + 0.040);
  oscDrop.frequency.linearRampToValueAtTime(800, t0 + 0.120);

  gainDrop.gain.setValueAtTime(0.001, t0);
  gainDrop.gain.linearRampToValueAtTime(0.50 * volume, t0 + 0.005);
  gainDrop.gain.exponentialRampToValueAtTime(0.001, t0 + 0.180);

  oscDrop.connect(gainDrop);
  gainDrop.connect(filter);

  // 3. Ripple Body Tail
  const oscTail = ctx.createOscillator();
  const gainTail = ctx.createGain();
  oscTail.type = 'sine';
  oscTail.frequency.setValueAtTime(330, t0);
  oscTail.frequency.linearRampToValueAtTime(290, t0 + 0.350);

  gainTail.gain.setValueAtTime(0.001, t0);
  gainTail.gain.linearRampToValueAtTime(0.22 * volume, t0 + 0.030);
  gainTail.gain.exponentialRampToValueAtTime(0.001, t0 + 0.380);

  oscTail.connect(gainTail);
  gainTail.connect(filter);

  // Start & Stop
  oscDrop.start(t0);
  oscTail.start(t0);
  oscDrop.stop(t0 + 0.40);
  oscTail.stop(t0 + 0.40);
}

/**
 * Theme 2: "Violin Tinh cầu" (Cosmic Space Violin)
 * Multi-oscillator cluster (sawtooth + detuned triangle + octave) + 5.6Hz vibrato LFO + 1850Hz body filter + 140ms echo delay.
 */
function synthesizeViolin(ctx: AudioContext, master: GainNode, volume: number): void {
  const t0 = ctx.currentTime;

  // 1. Acoustic Formant Filter (Peaking 1850Hz, Q=2.4)
  const bodyFilter = ctx.createBiquadFilter();
  bodyFilter.type = 'peaking';
  bodyFilter.frequency.setValueAtTime(1850, t0);
  bodyFilter.Q.setValueAtTime(2.4, t0);
  bodyFilter.gain.setValueAtTime(4.0, t0);
  bodyFilter.connect(master);

  // 2. Cosmic Delay Echo (140ms)
  const delay = ctx.createDelay(1.0);
  delay.delayTime.setValueAtTime(0.140, t0);
  const delayGain = ctx.createGain();
  delayGain.gain.setValueAtTime(0.32, t0);
  const dampFilter = ctx.createBiquadFilter();
  dampFilter.type = 'lowpass';
  dampFilter.frequency.setValueAtTime(1400, t0);

  delay.connect(dampFilter);
  dampFilter.connect(delayGain);
  delayGain.connect(delay);
  delayGain.connect(master);

  // 3. ADSR Master Envelope
  const adsr = ctx.createGain();
  adsr.gain.setValueAtTime(0.001, t0);
  adsr.gain.linearRampToValueAtTime(0.45 * volume, t0 + 0.120); // Attack
  adsr.gain.linearRampToValueAtTime(0.35 * volume, t0 + 0.220); // Decay
  adsr.gain.setValueAtTime(0.35 * volume, t0 + 0.650);         // Sustain
  adsr.gain.exponentialRampToValueAtTime(0.001, t0 + 1.250);   // Release

  adsr.connect(bodyFilter);
  adsr.connect(delay);

  // 4. Vibrato LFO (5.6Hz)
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(5.6, t0);
  lfoGain.gain.setValueAtTime(0, t0);
  lfoGain.gain.linearRampToValueAtTime(12.0, t0 + 0.200); // Delayed vibrato onset
  lfo.connect(lfoGain);
  lfo.start(t0);
  lfo.stop(t0 + 1.35);

  // 5. String Chord Cluster (Sawtooth cluster [440, 554.37, 659.25, 880] + detuned Triangle)
  const chordNotes = [440, 554.37, 659.25, 880];
  chordNotes.forEach((freq, idx) => {
    // Sawtooth harmonic voice
    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(freq, t0);
    lfoGain.connect(saw.frequency);

    const sawGain = ctx.createGain();
    sawGain.gain.setValueAtTime(0.12, t0);
    saw.connect(sawGain);
    sawGain.connect(adsr);

    saw.start(t0 + idx * 0.015);
    saw.stop(t0 + 1.35);

    // Warm detuned triangle voice
    const tri = ctx.createOscillator();
    tri.type = 'triangle';
    tri.frequency.setValueAtTime(freq * 1.0035, t0); // +6 cents
    lfoGain.connect(tri.frequency);

    const triGain = ctx.createGain();
    triGain.gain.setValueAtTime(0.08, t0);
    tri.connect(triGain);
    triGain.connect(adsr);

    tri.start(t0 + idx * 0.015);
    tri.stop(t0 + 1.35);
  });
}

/**
 * Theme 3: "Chuông bong bóng" (Bubble Chime / Crystalline Ping)
 * FM crystalline chime (carrier 1046.5Hz modulated by 2093Hz) + bubble pitch chirp (780Hz -> 1046Hz) + triangle sparkles.
 */
function synthesizeBubble(ctx: AudioContext, master: GainNode, volume: number): void {
  const t0 = ctx.currentTime;

  // 1. Highpass filter to eliminate low-frequency rumble
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(600, t0);
  filter.connect(master);

  // 2. FM Bubble Carrier & Modulator
  const carrier = ctx.createOscillator();
  const carrierGain = ctx.createGain();
  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(780, t0);
  carrier.frequency.exponentialRampToValueAtTime(1046.50, t0 + 0.035); // Bubble chirp

  carrierGain.gain.setValueAtTime(0.001, t0);
  carrierGain.gain.linearRampToValueAtTime(0.40 * volume, t0 + 0.002);
  carrierGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.850);

  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  mod.type = 'sine';
  mod.frequency.setValueAtTime(2093.00, t0); // 2:1 harmonic ratio

  modGain.gain.setValueAtTime(750, t0);
  modGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.090);

  mod.connect(modGain);
  modGain.connect(carrier.frequency);

  carrier.connect(carrierGain);
  carrierGain.connect(filter);

  carrier.start(t0);
  mod.start(t0);
  carrier.stop(t0 + 0.85);
  mod.stop(t0 + 0.85);

  // 3. Crystalline Multi-Pitch Sequence (Triangle Arpeggio)
  const pitches = [523.25, 659.25, 783.99, 1046.50];
  pitches.forEach((p, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(p, t0 + i * 0.035);

    g.gain.setValueAtTime(0.001, t0 + i * 0.035);
    g.gain.linearRampToValueAtTime(0.12 * volume, t0 + i * 0.035 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.035 + 0.450);

    osc.connect(g);
    g.connect(filter);

    osc.start(t0 + i * 0.035);
    osc.stop(t0 + i * 0.035 + 0.50);
  });
}

// ============================================================================
// Public Playback APIs
// ============================================================================

/**
 * Plays one of the three celestial sound themes.
 */
export async function playCosmicSound(
  theme: SoundThemeId,
  options: SoundOptions = {}
): Promise<void> {
  if (isMuted) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    await unlockAudioContext();
  }

  const vol = options.volume !== undefined ? options.volume : 1.0;
  const master = createMasterBus(ctx, vol);

  // Normalize 'chime' alias to 'bubble'
  const normalizedTheme: SoundType = theme === 'chime' ? 'bubble' : theme;

  switch (normalizedTheme) {
    case 'ripple':
      synthesizeRipple(ctx, master, vol);
      break;
    case 'violin':
      synthesizeViolin(ctx, master, vol);
      break;
    case 'bubble':
      synthesizeBubble(ctx, master, vol);
      break;
    default:
      synthesizeRipple(ctx, master, vol);
      break;
  }
}

/**
 * Semantic alias for playing hydration reminder or logging sound.
 */
export async function playHydrationSound(type: SoundThemeId): Promise<void> {
  return playCosmicSound(type);
}

/**
 * Rapid percussive tactile tap sound for buttons (25ms blip).
 */
export function playQuickTap(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    unlockAudioContext().catch(() => {});
  }

  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, t0);
  osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.020);

  gain.gain.setValueAtTime(0.15 * MASTER_HEADROOM_GAIN, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.025);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t0);
  osc.stop(t0 + 0.025);
}

/**
 * Triumphant C-Major celebratory fanfare when goal is reached.
 */
export async function playGoalCelebrationFanfare(): Promise<void> {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    await unlockAudioContext();
  }

  const t0 = ctx.currentTime;
  const master = createMasterBus(ctx, 0.9);
  const fanfarePitches = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

  fanfarePitches.forEach((pitch, idx) => {
    const noteTime = t0 + idx * 0.080;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, noteTime);

    gain.gain.setValueAtTime(0.001, noteTime);
    gain.gain.linearRampToValueAtTime(0.25, noteTime + 0.010);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.600);

    osc.connect(gain);
    gain.connect(master);

    osc.start(noteTime);
    osc.stop(noteTime + 0.650);
  });
}
```

---

## 6. Unit Test Suite Design (`tests/unit/audioEngine.test.ts`)

Because Vitest runs in Node.js (`environment: 'node'`), a mock `AudioContext` environment must be provided for the unit test runner.

### 6.1 MockAudioContext Specification for Vitest

```typescript
export interface MockNodeRecord {
  type: string;
  frequency?: number;
  gain?: number;
  startTime?: number;
  stopTime?: number;
}

export class MockAudioParam {
  value: number;
  constructor(defaultValue: number) {
    this.value = defaultValue;
  }
  setValueAtTime(val: number, _t: number) { this.value = val; return this; }
  exponentialRampToValueAtTime(val: number, _t: number) { this.value = val; return this; }
  linearRampToValueAtTime(val: number, _t: number) { this.value = val; return this; }
  setTargetAtTime(val: number, _t: number, _c: number) { this.value = val; return this; }
}

export class MockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime: number = 0;
  destination = { channelCount: 2 };
  nodesCreated: MockNodeRecord[] = [];

  async resume(): Promise<void> {
    this.state = 'running';
  }

  createOscillator() {
    const node: any = {
      type: 'sine',
      frequency: new MockAudioParam(440),
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn((t = 0) => {
        this.nodesCreated.push({
          type: `oscillator:${node.type}`,
          frequency: node.frequency.value,
          startTime: t,
        });
      }),
      stop: vi.fn((t = 0) => {
        const entry = this.nodesCreated.find(n => n.type === `oscillator:${node.type}` && n.stopTime === undefined);
        if (entry) entry.stopTime = t;
      }),
    };
    return node;
  }

  createGain() {
    const node: any = {
      gain: new MockAudioParam(1),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.nodesCreated.push({ type: 'gain', gain: 1 });
    return node;
  }

  createBiquadFilter() {
    const node: any = {
      type: 'lowpass',
      frequency: new MockAudioParam(350),
      Q: new MockAudioParam(1),
      gain: new MockAudioParam(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.nodesCreated.push({ type: 'biquad-filter' });
    return node;
  }

  createDelay() {
    const node: any = {
      delayTime: new MockAudioParam(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.nodesCreated.push({ type: 'delay' });
    return node;
  }
}
```

### 6.2 Test Assertions Matrix
The unit test file `tests/unit/audioEngine.test.ts` will verify the following 10 test scenarios:

1. **Context Initialization & Autoplay Resume**:
   - `getAudioContext()` initializes singleton in `'suspended'` state.
   - `unlockAudioContext()` invokes `ctx.resume()` and transitions state to `'running'`.
2. **Gentle Ripple ("Gợn nhẹ") Synthesis Structure**:
   - Verifies creation of sine drop oscillator, tail ripple oscillator, lowpass biquad filter.
   - Frequency curve touches $450\text{ Hz} \to 1350\text{ Hz}$.
3. **Cosmic Space Violin ("Violin Tinh cầu") Cluster & Vibrato**:
   - Verifies 4+ sawtooth oscillators created for harmonic cluster.
   - Verifies triangle detune voice and 5.6Hz LFO oscillator.
   - Verifies 1850Hz peaking filter and 140ms delay node.
4. **Bubble Chime ("Chuông bong bóng") Synthesis**:
   - Verifies FM carrier and 2:1 modulator setup.
   - Verifies triangle pitch sequence $[523.25, 659.25, 783.99, 1046.50]$.
5. **Master Gain Headroom Limiter**:
   - Verifies master gain is initialized $\le 0.8$ ($0.6$), preventing clipping.
6. **Mute Switch Suppression**:
   - When `setAudioMuted(true)` is set, calls to `playCosmicSound()` create $0$ nodes.
7. **Rapid Concurrency Stress Test**:
   - 10 rapid successive calls to `playCosmicSound('ripple')` execute cleanly without throwing.
8. **Goal Celebration Fanfare**:
   - Verifies arpeggiated C-major chord sequence execution.
9. **Quick Tap Tactile Blip**:
   - Verifies quick 25ms sine chirp execution.
10. **Headless & SSR Resilience**:
    - When `globalThis.AudioContext` is undefined, calling `playCosmicSound` and `getAudioContext` returns `null` gracefully without throwing exceptions.

---

## 7. Features Discovered & Edge Cases

### Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Audio | Autoplay Policy Unlock | Resumes AudioContext on user interaction | User click/touch | `Promise<boolean>` | Safe false return if unsupported | SPEC-VCH-CORE-001 §3.1, E2E 5.6 |
| 2 | Audio | Master Headroom Limiter | Global master gain node fixed at 0.6 ($\le 0.8$) | Audio node output | Scaled audio bus | Clamped to safe range | SPEC-VCH-CORE-001 §3.1, E2E 5.5 |
| 3 | Audio | Gentle Ripple Sound | Sine drop chirp (450->1350Hz) + 330Hz tail + 2200Hz lowpass | `'ripple'`, volume | Ephemeral audio graph | Silent return if muted | SPEC-VCH-CORE-001 §3.2, SCOPE.md |
| 4 | Audio | Cosmic Violin Sound | Sawtooth + Triangle cluster + 5.6Hz LFO + 1850Hz filter + 140ms delay | `'violin'`, volume | Ephemeral audio graph | Silent return if muted | SPEC-VCH-CORE-001 §3.3, SCOPE.md |
| 5 | Audio | Bubble Chime Sound | FM 2:1 bell + bubble chirp + triangle arpeggio [523..1046Hz] | `'bubble'` or `'chime'` | Ephemeral audio graph | Silent return if muted | SPEC-VCH-CORE-001 §3.4, SCOPE.md |
| 6 | Audio | Quick UI Tap | 25ms tactile blip (880Hz -> 440Hz) | none | Ephemeral audio graph | Silent return if muted | SPEC-VCH-CORE-001 §3.5 |
| 7 | Audio | Goal Celebration Fanfare | Arpeggiated C-major celestial chord sequence | none | Ephemeral audio graph | Silent return if muted | E2E 5.10 |
| 8 | Audio | Global Mute Toggle | Mutes all procedural audio output | `boolean` | void | Disables node creation | E2E 5.7 |
| 9 | Audio | Headless Degradation | Safe null fallback when Web Audio is missing | none | `null` / silent | No exceptions thrown | E2E 5.9 |

### Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | AudioContext Suspended | Context state is `'suspended'` on user tap | Calls `await ctx.resume()`; transitions state to `'running'` before scheduling audio nodes. |
| 2 | Global Mute Activated | `isMuted = true` | `playCosmicSound()` returns immediately; zero AudioNodes instantiated or scheduled. |
| 3 | Rapid Multi-Tap Stress | 10 rapid triggers in < 1 second | Each trigger instantiates lightweight ephemeral nodes connected to master bus; nodes stop on schedule without leaking context. |
| 4 | Headless / No AudioContext | Node.js or older browser without `AudioContext` | `getAudioContext()` returns `null`; playback functions exit cleanly with zero console errors. |
| 5 | Alias Theme Identification | Caller passes `'chime'` instead of `'bubble'` | Engine transparently normalizes `'chime'` to `'bubble'`, generating identical crystalline sound. |
| 6 | Extreme Volume Parameter | Caller passes `volume = 5.0` or `-2.0` | Master bus clamps volume to $[0.0, 1.0]$, preventing speaker distortion or arithmetic NaN errors. |

---
*End of Audio Engine Blueprint.*
