# Scope: Milestone 2 — Audio, Persistence & Voyager Chibi Component

## Objective
Implement procedural Web Audio synthesis engine, dual-layer storage synchronization, local notification scheduler, and `VoyagerChibi.tsx` component with 5 expression states and custom image upload support.

## Required Features
- **F5: Web Audio Synthesis Engine (`src/utils/audioEngine.ts`)**:
  - Procedural sound synthesis using native Web Audio API oscillators, filters, gain nodes (100% offline, zero external audio asset dependencies).
  - 3 Soundscapes:
    * "Gợn nhẹ" (Ripple): Sine drop (450Hz -> 1350Hz) + resonant 330Hz tail + 2200Hz lowpass filter.
    * "Violin Tinh cầu" (Cosmic Violin): Multi-oscillator cluster (sawtooth + detuned triangle + octave) + 5.6Hz vibrato LFO + 1850Hz body filter + 140ms cosmic delay echo.
    * "Chuông bong bóng" (Bubble Chime): FM crystalline ping (Carrier 1046.5Hz modulated by 2093Hz) + bubble pitch chirp (780Hz -> 1046Hz).
  - AudioContext auto-unlock on user gesture (`resume()`).
- **F6: Dual-Layer Persistence Engine (`src/utils/storageEngine.ts`)**:
  - Synchronous `localStorage` for instant 0ms mount + asynchronous `@capacitor/preferences` for native mobile SharedPreferences persistence.
  - Automatic synchronization on write.
  - JSON and CSV export helpers (`exportDataAsJson()`, `exportDataAsCsv()`).
- **F7: Local Notification Scheduler (`src/utils/notificationEngine.ts`)**:
  - `@capacitor/local-notifications` integration with runtime permission request (`POST_NOTIFICATIONS`).
  - 3 Reminder Modes:
    * Nhẹ nhàng (Gentle / infrequent)
    * Thông minh (Smart: dynamic interval $\Delta T_{awake} / \lceil \text{Deficit} / 250 \rceil$, clamped 45m-150m)
    * Đều đặn (Regular: fixed intervals)
  - Quiet hours lock: strictly suppress/postpone reminders during 01:00 - 07:00.
- **F8: Voyager Chibi Character Component (`src/components/VoyagerChibi.tsx`)**:
  - Base character image from `public/assets/voyager_base.png`.
  - 5 Expression States: `idle`, `happy`, `sleeping`, `gentle`, `strict` (playing violin).
  - Visual details: White sailor hat, starry galaxy cape, starry cyan/blue hair, starlight aura.
  - Support for custom PNG/GIF uploaded by user (data URL or local file path).
  - Interactive click animations (bobbing, sparkle, confetti on happy).

## Acceptance Criteria
- `audioEngine.ts`, `storageEngine.ts`, `notificationEngine.ts`, and `VoyagerChibi.tsx` fully implemented without placeholders or TODOs.
- `npm test` passes all unit tests.
- `npm run build` succeeds with exit code 0.
