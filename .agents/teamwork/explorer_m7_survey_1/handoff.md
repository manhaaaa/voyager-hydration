# Handoff Report: Audio Architecture Survey & Real Asset Playback Integration

- **Agent**: explorer_m7_survey_1
- **Working Directory**: `D:\uống nước\.agents\teamwork\explorer_m7_survey_1`
- **Target Project**: Voyager's Cosmic Hydration (`D:\uống nước`)
- **Date**: 2026-10-31T17:35:00Z
- **Status**: Completed (Hard Handoff)

---

## 1. Observation

### 1.1 Existing Audio Engine Architecture (`src/utils/audioEngine.ts`)
- **Procedural Nature**: `src/utils/audioEngine.ts` is explicitly documented at lines 5-7 as "100% procedural sound synthesis using native Web Audio API oscillators, filters, and gain nodes. Zero external audio assets required."
- **Exported Sound Types**: Lines 13-15 define:
  ```typescript
  export type SoundType = 'ripple' | 'violin' | 'bubble';
  export type SoundThemeId = SoundType | 'chime';
  ```
- **Volume & Headroom Gain**: Line 29 establishes the master limiter constant:
  ```typescript
  export const MASTER_HEADROOM_GAIN = 0.6;
  ```
  Lines 165-171 implement `createMasterBus`, which scales every synthesized sound by `MASTER_HEADROOM_GAIN * clampedVol` to prevent acoustic digital clipping (> 0 dBFS).
- **AudioContext Lifecycle & Unlocking**:
  - Lines 43-52: `getAudioContextConstructor()` resolves `window.AudioContext || (window as any).webkitAudioContext || (globalThis as any).AudioContext || null`.
  - Lines 88-100: `unlockAudioContext()` awaits `ctx.resume()` when `ctx.state === 'suspended'`.
  - Lines 116-135: `registerAutoUnlockListeners()` binds passive listeners on `['pointerdown', 'touchstart', 'keydown', 'click']` to automatically unlock the `AudioContext` on the first user interaction.
  - Line 81: Exposes `_setAudioContextForTesting(ctx: AudioContext | null)` to permit dependency injection during test execution.
- **Procedural Synthesizers**:
  - `synthesizeRipple` (lines 181-225): Resonant lowpass filter (2200Hz, Q=1.2) + upward-then-downward sine drop chirp (450Hz -> 1350Hz -> 800Hz) + body tail resonance (330Hz -> 290Hz).
  - `synthesizeViolin` (lines 231-309): 1850Hz peaking acoustic body filter + 140ms echo delay with 1400Hz damping + 5.6Hz vibrato LFO + 4-note chord cluster [440, 554.37, 659.25, 880] Hz using sawtooth and detuned triangle waves.
  - `synthesizeBubble` (lines 315-372): 600Hz highpass filter + 2:1 FM modulator (2093Hz modulating 780Hz->1046.5Hz carrier) + 4-step triangle arpeggio [523.25, 659.25, 783.99, 1046.50] Hz.
- **Public Playback APIs**:
  - Lines 382-415: `playCosmicSound(theme: SoundThemeId, options?: SoundOptions): Promise<void>`.
  - Lines 420-422: `playHydrationSound(type: SoundThemeId): Promise<void>`.
  - Lines 427-452: `playQuickTap()`: synchronous 25ms tactile feedback blip (sine chirp 880Hz -> 440Hz).
  - Lines 458-489: `playGoalCelebrationFanfare()`: celebratory arpeggiated C-Major sequence [C5, E5, G5, C6].
- **Mute Controls**: Lines 140-146 provide `setAudioMuted(muted: boolean)` and `isAudioMuted(): boolean`.

### 1.2 Audio Integration Across the UI & Storage
- **`src/tabs/ReminderTab.tsx`**:
  - Line 23: Imports `{ playCosmicSound, playQuickTap, SoundType }` from `'../utils/audioEngine'`.
  - Lines 47, 159-164: Manages sound audition:
    ```typescript
    const handlePreviewSound = (e: React.MouseEvent, sound: SoundType) => {
      e.stopPropagation();
      playCosmicSound(sound, { volume: 1.0 });
      setPreviewingSound(sound);
      setTimeout(() => setPreviewingSound(null), 1200);
    };
    ```
  - Lines 460-550: Renders audio selection cards for `'ripple'`, `'violin'`, `'bubble'`.
- **`src/tabs/ProfileTab.tsx`**:
  - Line 21: Imports `{ playCosmicSound, playQuickTap, SoundType }`.
  - Lines 153-155: Provides sound audition preview via `playCosmicSound(type, { volume: 1.0 })`.
- **`src/App.tsx`**:
  - Lines 27-30: Imports `{ playQuickTap, playGoalCelebrationFanfare, setAudioMuted }`.
  - Lines 108 & 131: Synchronizes audio mute state with `profile.soundEnabled` via `setAudioMuted(!profile.soundEnabled)`.
  - Line 172: Plays tactile tap on water logging: `playQuickTap()`.
  - Line 205: Triggers fanfare when reaching 100% hydration target: `playGoalCelebrationFanfare()`.
- **`src/utils/storageEngine.ts`**:
  - Line 61: `selectedSound: 'ripple' | 'violin' | 'bubble';` inside `AppSettings`.
  - Line 90: `DEFAULT_SETTINGS` initializes `selectedSound: 'ripple'`.

### 1.3 Public Asset Directory Layout
- Running `list_dir` on `D:\uống nước\public\assets` shows:
  ```
  public/assets/
  ├── character/
  │   ├── voyager_base.png
  │   ├── voyager_drinking.png
  │   ├── voyager_gentle.png
  │   ├── voyager_happy.png
  │   ├── voyager_idle.png
  │   ├── voyager_sleeping.png
  │   └── voyager_strict.png
  └── voyager_base.png
  ```
- **Finding**: The directory `public/assets/audio/` does not yet exist.
- **Asset path resolution**: In `src/components/VoyagerChibi.tsx:50-55`, assets are referenced with root-relative paths like `'/assets/character/voyager_base.png'`. In Vite, static files placed in `public/` are served at root (`/assets/...`) during development and copied to `dist/assets/...` during `npm run build`. In Capacitor Android, `dist/` is deployed to Android's WebView asset folder, maintaining identical path resolution.

### 1.4 Test Infrastructure & Current Status
- **Vitest Environment** (`vite.config.ts:24-29`):
  ```typescript
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  }
  ```
  The default Vitest environment is `node`. Test files that mount React components explicitly specify `// @vitest-environment jsdom` at line 1.
- **Audio Mocking in Unit Tests** (`tests/unit/audioEngine.test.ts`):
  - Lines 22-118: Implements `MockAudioParam` and `TestMockAudioContext` with mock methods for `createOscillator`, `createGain`, `createBiquadFilter`, and `createDelay`.
  - Lines 124-126: Injects the mock via `_setAudioContextForTesting(mockCtx as unknown as AudioContext)`.
- **Audio Mocking in E2E Tests** (`tests/e2e/harness.ts:160-219`):
  - Implements an independent `MockAudioContext` recording scheduled nodes in `nodesCreated`.
- **Empirical Execution Results**:
  - `npm test`: Executed `vitest run tests/unit` → **19 test files passed (408/408 tests, 100%)**.
  - `npm run test:e2e`: Executed `node --experimental-strip-types tests/e2e/runner.ts` → **196/196 tests passed (100%)**.
  - `npm run build`: Executed `tsc && vite build` → **Built in 7.61s with zero errors or warnings**.

---

## 2. Logic Chain

```
[Observation 1.1: Web Audio Synthesis]
  Procedural synthesis uses OscillatorNode/GainNode (< 1.5s duration)
           │
           ├────────────────────────────┐
           ▼                            ▼
[Observation 1.3: Real Audio Assets]   [Observation 1.4: Node.js Test Environment]
  Real files (.mp3, .wav) are 5-60s      AudioContext.decodeAudioData needs fetch()
  media files stored in public/assets    which fails in headless Node tests
           │                            │
           ▼                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ Logic Step 1: Playback Mechanism Evaluation                 │
   │ HTMLAudioElement (new Audio) vs Web Audio AudioBuffer       │
   │ - HTMLAudioElement streams progressively (no RAM decode)    │
   │ - Native loop = true for continuous alarm ringing           │
   │ - Direct audio.pause() & currentTime = 0 for instant stop   │
   │ - Simple mockable interface in Vitest                       │
   └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ Logic Step 2: Backward-Compatible Architecture              │
   │ - Preserve SoundType ('ripple' | 'violin' | 'bubble')       │
   │ - Introduce VoyagerAudioTrackId ('voyager_violin' | ...)    │
   │ - Unify under SoundThemeId                                  │
   │ - Add dedicated alarm & preview lifecycle methods           │
   └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ Logic Step 3: Alarm Clock State & UI Orchestration          │
   │ - Independent Alarm Clock card in ReminderTab               │
   │ - Looping audio until user taps "Snooze" or "Dismiss"       │
   │ - Previews are strictly one-shot (loop = false)             │
   └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ Logic Step 4: Vitest Mocking Strategy                       │
   │ - Provide _setAudioConstructorForTesting in audioEngine.ts  │
   │ - Create standard MockAudio class for tests                 │
   │ - Verify play, pause, loop, src, and volume without errors  │
   └─────────────────────────────────────────────────────────────┘
```

### Detailed Inferences:
1. **Playback Technology Selection (HTMLAudioElement vs Web Audio API)**:
   - Decoding audio files via `AudioContext.decodeAudioData` requires asynchronous `fetch()` to load the file into an `ArrayBuffer`. In Vitest/Node test runs, relative fetches (e.g. `fetch('/assets/audio/...')`) reject with network errors because there is no HTTP server hosting the root in Node.
   - A 45-second stereo audio file decoded into uncompressed 32-bit float PCM occupies roughly 15MB of heap memory (`44100 * 2 * 4 * 45`). In contrast, `HTMLAudioElement` streams the audio via the browser/WebView media pipeline with negligible memory overhead.
   - `HTMLAudioElement` provides native property binding for `audio.loop = true`, which allows an alarm to loop indefinitely without managing recursive Web Audio scheduling loops or timer intervals.
   - Halting an alarm is clean and atomic: `audio.pause(); audio.currentTime = 0;`.
   - **Conclusion**: `HTMLAudioElement` is the optimal technology for real audio files (.mp3, .wav), while procedural sound effects (taps, fanfare) continue to use the lightweight Web Audio API synthesizer.

2. **Interface Extension & Backwards Compatibility**:
   - Existing code in `src/App.tsx`, `ReminderTab.tsx`, and `ProfileTab.tsx` relies on `'ripple' | 'violin' | 'bubble'`.
   - Rather than replacing `SoundType`, define:
     ```typescript
     export type ProceduralSoundType = 'ripple' | 'violin' | 'bubble';
     export type VoyagerAudioTrackId = 'voyager_violin' | 'voyager_greeting' | 'voyager_battle';
     export type SoundThemeId = ProceduralSoundType | VoyagerAudioTrackId | 'chime';
     ```
   - All existing procedural calls (`playCosmicSound('ripple')`, `playQuickTap()`, `playGoalCelebrationFanfare()`) continue operating without alteration, guaranteeing 100% test preservation for all 408 unit tests and 196 E2E tests.

3. **Audio Preview vs Looping Alarm Separation**:
   - **Preview (Nghe thử)**:
     - User clicks "Thử âm" on a sound card.
     - Playback must be one-shot: `audio.loop = false`.
     - Clicking "Thử âm" on another sound or clicking again halts the prior preview immediately.
     - Listens to the `'ended'` event to reset the UI button state back from "Đang phát..." to "Thử âm".
   - **Alarm Clock Trigger (Chuông báo thức)**:
     - Triggered when current time matches user-set alarm time (or snooze expiry).
     - Playback must be continuous: `audio.loop = true`.
     - Displays an active Alarm Overlay/Modal with Voyager character visuals and two action buttons:
       - **Hoãn báo thức (Snooze)**: Calls `stopAlarmPlayback()`, sets `snoozedUntil = Date.now() + 5 * 60 * 1000`.
       - **Tắt báo thức (Dismiss / Stop)**: Calls `stopAlarmPlayback()`, dismisses the modal, marks alarm as triggered for today.
     - Single-point of control: `stopAlarmPlayback()` ensures no lingering audio leaks.

4. **Sourcing and Audio Format Compatibility**:
   - Per `ORIGINAL_REQUEST.md §R2`, acceptable formats include `.mp3`, `.wav`, or `.ogg`.
   - **MP3 (`audio/mpeg`)**: Supported across 100% of desktop browsers, mobile Safari, and Android WebViews. Compact file size (approx. 100KB-300KB for 10-25 seconds).
   - **WAV (`audio/wav`)**: Uncompressed PCM audio, 100% supported everywhere.
   - Recommended assets to create in `public/assets/audio/`:
     - `voyager_violin.mp3` (Tiếng đàn violin của Voyager - celestial violin melody)
     - `voyager_greeting.mp3` (Voice nền - gentle greeting: "Greetings, friend. The stars are in tune today.")
     - `voyager_battle.mp3` (Voice vào trận - battle entry: "The strings of the cosmos are ready. Let us begin.")

---

## 3. Caveats & Edge Cases

1. **Browser Autoplay Restrictions**:
   - Modern browsers (Chrome, Safari) block `audio.play()` unless a user gesture has occurred on the document.
   - *Mitigation*: The app already has `registerAutoUnlockListeners()` in `audioEngine.ts:116-130`. Whenever the user taps any tab, button, or sets the alarm time, audio playback is unlocked. Furthermore, all calls to `audio.play()` must chain `.catch((err) => console.warn('[AudioEngine] Playback prevented:', err))` to prevent unhandled promise rejections.
2. **Capacitor Mobile Background Audio**:
   - When an Android app is in the background or device is locked, JavaScript timers in the WebView may be throttled.
   - *Mitigation*: The project already possesses `@capacitor/local-notifications` configured in `src/utils/notificationEngine.ts`. The alarm clock scheduler should schedule a high-priority local notification (`importance: 4`) at the exact alarm time to ensure the user receives a native sound/banner alert even if the app is backgrounded. When the app is in the foreground, the in-app looping alarm modal triggers.
3. **Audio Instance Leaks on Component Unmount**:
   - If the user navigates away or unmounts the tab while a preview or alarm is playing, audio could continue playing if not tracked globally.
   - *Mitigation*: `audioEngine.ts` must maintain singleton references (`activeAlarmAudio` and `activePreviewAudio`). Calling `stopAlarmPlayback()` or `stopPreviewAudio()` guarantees that any active element is paused and set to `null`.
4. **Multiple Alarms Triggering within the Same Minute**:
   - A minute ticker checking `currentHHMM === alarmHHMM` might fire multiple times during that 60-second window if not guarded.
   - *Mitigation*: Track `lastTriggeredDate: "YYYY-MM-DD"` or `hasFiredThisMinute: boolean` in state to guarantee an alarm triggers exactly once per scheduled event.
5. **Node.js Environment Lacking `Audio` Constructor**:
   - In Vitest's default `environment: 'node'`, `globalThis.Audio` is `undefined`. Calling `new Audio()` directly would cause a `ReferenceError`.
   - *Mitigation*: Guard construction with `getAudioConstructor()` and provide `_setAudioConstructorForTesting()` for test suite injection.

---

## 4. Conclusion & Concrete Recommendations

### 4.1 Recommended Audio Engine Extension (`src/utils/audioEngine.ts`)

Add the following interfaces, constants, and functions to `src/utils/audioEngine.ts`:

```typescript
// 1. Types & Track Registry
export type ProceduralSoundType = 'ripple' | 'violin' | 'bubble';
export type VoyagerAudioTrackId = 'voyager_violin' | 'voyager_greeting' | 'voyager_battle';
export type SoundThemeId = ProceduralSoundType | VoyagerAudioTrackId | 'chime';

export interface VoyagerAudioTrackInfo {
  id: VoyagerAudioTrackId;
  name: string;
  description: string;
  src: string;
}

export const VOYAGER_AUDIO_TRACKS: Record<VoyagerAudioTrackId, VoyagerAudioTrackInfo> = {
  voyager_violin: {
    id: 'voyager_violin',
    name: 'Violin Tinh cầu (Voyager Theme)',
    description: 'Tiếng đàn vĩ cầm Reverse: 1999 ngân nga trong vũ trụ',
    src: '/assets/audio/voyager_violin.mp3',
  },
  voyager_greeting: {
    id: 'voyager_greeting',
    name: 'Lời chào Tinh cầu (Voice nền)',
    description: 'Giọng nói dịu dàng chào buổi sáng của Voyager',
    src: '/assets/audio/voyager_greeting.mp3',
  },
  voyager_battle: {
    id: 'voyager_battle',
    name: 'Khúc dạo đầu Vũ trụ (Voice vào trận)',
    description: 'Giai điệu và giọng nói bước vào trận chiến ngân hà',
    src: '/assets/audio/voyager_battle.mp3',
  },
};

// 2. Internal State Singletons
let activeAlarmAudio: HTMLAudioElement | null = null;
let activePreviewAudio: HTMLAudioElement | null = null;
let proceduralAlarmInterval: ReturnType<typeof setInterval> | null = null;
let customAudioConstructor: typeof Audio | null = null;

// 3. Audio Constructor Resolver
export function getAudioConstructor(): typeof Audio | null {
  if (customAudioConstructor) return customAudioConstructor;
  if (typeof window !== 'undefined' && window.Audio) return window.Audio;
  if (typeof globalThis !== 'undefined' && (globalThis as any).Audio) return (globalThis as any).Audio;
  return null;
}

export function _setAudioConstructorForTesting(ctor: typeof Audio | null): void {
  customAudioConstructor = ctor;
}

// 4. Preview API (One-Shot)
export function previewVoyagerTrack(
  trackId: VoyagerAudioTrackId | ProceduralSoundType,
  onEnded?: () => void
): HTMLAudioElement | null {
  stopPreviewAudio();
  if (isAudioMuted()) return null;

  if (trackId === 'ripple' || trackId === 'violin' || trackId === 'bubble') {
    playCosmicSound(trackId);
    if (onEnded) setTimeout(onEnded, 1200);
    return null;
  }

  const track = VOYAGER_AUDIO_TRACKS[trackId];
  if (!track) return null;

  const AudioCtor = getAudioConstructor();
  if (!AudioCtor) return null;

  try {
    const audio = new AudioCtor(track.src);
    audio.volume = Math.max(0, Math.min(1.0, MASTER_HEADROOM_GAIN));
    audio.loop = false;
    audio.onended = () => {
      if (activePreviewAudio === audio) activePreviewAudio = null;
      if (onEnded) onEnded();
    };
    activePreviewAudio = audio;
    audio.play().catch((err) => console.warn('[AudioEngine] Preview failed:', err));
    return audio;
  } catch {
    return null;
  }
}

export function stopPreviewAudio(): void {
  if (activePreviewAudio) {
    try {
      activePreviewAudio.pause();
      activePreviewAudio.currentTime = 0;
    } catch {}
    activePreviewAudio = null;
  }
}

// 5. Alarm Looping API (Loop Until Stopped)
export function startAlarmPlayback(trackId: VoyagerAudioTrackId | ProceduralSoundType): void {
  stopAlarmPlayback();
  if (isAudioMuted()) return;

  if (trackId === 'ripple' || trackId === 'violin' || trackId === 'bubble') {
    playCosmicSound(trackId);
    proceduralAlarmInterval = setInterval(() => {
      playCosmicSound(trackId);
    }, 2000);
    return;
  }

  const track = VOYAGER_AUDIO_TRACKS[trackId];
  if (!track) return;

  const AudioCtor = getAudioConstructor();
  if (!AudioCtor) return;

  try {
    const audio = new AudioCtor(track.src);
    audio.volume = Math.max(0, Math.min(1.0, MASTER_HEADROOM_GAIN));
    audio.loop = true;
    activeAlarmAudio = audio;
    audio.play().catch((err) => console.warn('[AudioEngine] Alarm play failed:', err));
  } catch {}
}

export function stopAlarmPlayback(): void {
  if (activeAlarmAudio) {
    try {
      activeAlarmAudio.pause();
      activeAlarmAudio.currentTime = 0;
    } catch {}
    activeAlarmAudio = null;
  }
  if (proceduralAlarmInterval) {
    clearInterval(proceduralAlarmInterval);
    proceduralAlarmInterval = null;
  }
}

export function isAlarmPlaying(): boolean {
  return activeAlarmAudio !== null || proceduralAlarmInterval !== null;
}
```

### 4.2 Recommended Vitest Mock Class (`MockAudio`)

For unit testing in `tests/unit/audioEngine.test.ts` and component test suites:

```typescript
export class MockAudio {
  src: string;
  volume: number = 1.0;
  loop: boolean = false;
  currentTime: number = 0;
  paused: boolean = true;
  muted: boolean = false;
  onended: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;

  static instances: MockAudio[] = [];

  constructor(src = '') {
    this.src = src;
    MockAudio.instances.push(this);
  }

  play = vi.fn().mockImplementation(async () => {
    this.paused = false;
    return Promise.resolve();
  });

  pause = vi.fn().mockImplementation(() => {
    this.paused = true;
  });

  load = vi.fn();
}
```

### 4.3 Alarm Clock UI & State Integration Plan
1. **Settings / State Storage** (`src/utils/storageEngine.ts`):
   Extend `AppSettings` with:
   ```typescript
   export interface AlarmClockSettings {
     enabled: boolean;
     time: string; // "07:30"
     sound: VoyagerAudioTrackId | ProceduralSoundType;
     snoozeMinutes: number; // default 5
     snoozedUntil: number | null; // epoch ms
     lastTriggeredDate: string | null;
   }
   ```
2. **Alarm Component & Modal** (`src/components/AlarmModal.tsx` & `src/tabs/ReminderTab.tsx`):
   - Dedicated "Đồng hồ báo thức Voyager" card in `ReminderTab.tsx` displaying the time picker, toggle switch, sound selector with "Thử âm" preview buttons.
   - Full-screen / prominent modal `AlarmModal.tsx` that appears when the alarm activates, featuring:
     - Voyager Chibi illustration
     - Ringing bell animation
     - "Hoãn 5 phút" (Snooze) button
     - "Tắt báo thức" (Stop / Dismiss) button
3. **Timer Ticker** (`src/App.tsx` or `useAlarmClock`):
   - 1-second interval verifying `currentTime === alarmTime` or `Date.now() >= snoozedUntil`.
   - On match: calls `startAlarmPlayback(alarmSettings.sound)` and opens `AlarmModal`.

---

## 5. Verification Method

To verify these findings and any subsequent implementation independently:

1. **Unit Test Verification**:
   ```powershell
   cd "D:\uống nước"
   npm test
   ```
   *Expected Result*: All 19 existing test suites (408 tests) plus any new unit tests for `previewVoyagerTrack`, `startAlarmPlayback`, `stopAlarmPlayback`, and alarm clock logic must pass 100%.

2. **E2E Test Verification**:
   ```powershell
   cd "D:\uống nước"
   npm run test:e2e
   ```
   *Expected Result*: All 196 tests across Tiers 1-4 pass without failure.

3. **Production TypeScript & Vite Build Verification**:
   ```powershell
   cd "D:\uống nước"
   npm run build
   ```
   *Expected Result*: Compiles cleanly with `tsc && vite build`, creating `dist/` with no TypeScript type errors.

4. **File Assets Verification**:
   ```powershell
   Test-Path "D:\uống nước\public\assets\audio\voyager_violin.mp3"
   Test-Path "D:\uống nước\public\assets\audio\voyager_greeting.mp3"
   Test-Path "D:\uống nước\public\assets\audio\voyager_battle.mp3"
   ```
   *Expected Result*: Returns `True` for each audio asset.

5. **Invalidation Conditions**:
   - If `AudioContext.decodeAudioData` is used instead of `HTMLAudioElement`, causing network errors in Node.js Vitest runs.
   - If `activeAlarmAudio` is not stopped upon modal dismissal, causing background audio to leak.
   - If existing `SoundType` ('ripple', 'violin', 'bubble') or `playCosmicSound` signatures are modified, breaking existing test suites.
