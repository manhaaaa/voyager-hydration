# BRIEFING — 2026-10-31T17:34:30Z

## Mission
Investigate audio architecture in src/utils/audioEngine.ts, real audio file playback (.mp3, .wav, .ogg), alarm preview and looping, and Vitest mocking requirements for Voyager's Cosmic Hydration.

## 🔒 My Identity
- Archetype: explorer
- Roles: Technical Investigator / Audio Architecture Survey
- Working directory: D:\uống nước\.agents\teamwork\explorer_m7_survey_1
- Original parent: 1b9ace2b-f679-4fe0-9a25-b3f7980770e8
- Milestone: Milestone 7 Survey 1

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Write only to D:\uống nước\.agents\teamwork\explorer_m7_survey_1
- Strict evidence chain with file paths and line numbers
- Follow 5-component handoff report structure

## Current Parent
- Conversation ID: 1b9ace2b-f679-4fe0-9a25-b3f7980770e8
- Updated: 2026-10-31T17:34:30Z

## Investigation State
- **Explored paths**:
  - `src/utils/audioEngine.ts` (Web Audio API procedural synthesis, lifecycle, headroom limiter)
  - `src/utils/notificationEngine.ts` (quiet hours, reminder modes, Capacitor LocalNotifications)
  - `src/tabs/ReminderTab.tsx` & `src/tabs/ProfileTab.tsx` (sound audition and selection UI)
  - `src/App.tsx` & `src/utils/storageEngine.ts` (app settings, soundEnabled sync, storage persistence)
  - `tests/unit/audioEngine.test.ts` & `tests/e2e/harness.ts` (MockAudioContext, test environment)
  - `public/assets/` (asset structure, missing `audio/` directory)
- **Key findings**:
  1. Existing audio engine is 100% procedural Web Audio API with zero external audio assets.
  2. HTMLAudioElement (`new Audio(src)`) is vastly superior to `AudioBuffer` for real audio files (streaming, lower RAM, native `loop = true`, clean `pause()` and `currentTime = 0`).
  3. Audio assets should be placed in `public/assets/audio/` (`voyager_violin.mp3`, `voyager_greeting.mp3`, `voyager_battle.mp3`) and referenced as `/assets/audio/...`.
  4. Vitest runs with `environment: 'node'` by default, so `Audio` must be guarded by `getAudioConstructor()` and injected via `_setAudioConstructorForTesting(ctor)` to enable mock testing.
  5. Backwards compatibility is preserved 100% by keeping existing `SoundType` and procedural synthesizers intact.
- **Unexplored areas**: None for survey scope.

## Key Decisions Made
- Recommended hybrid architecture: Web Audio API for micro-syntheses (taps, fanfare) + HTMLAudioElement for real Voyager audio files.
- Recommended singleton alarm and preview controller in `audioEngine.ts` with explicit lifecycle methods (`startAlarmPlayback`, `stopAlarmPlayback`, `previewVoyagerTrack`, `stopPreviewAudio`).
- Designed `MockAudio` framework for unit testing in Node/Vitest environments.

## Artifact Index
- D:\uống nước\.agents\teamwork\explorer_m7_survey_1\DISPATCH.md — Task assignment and incoming messages
- D:\uống nước\.agents\teamwork\explorer_m7_survey_1\BRIEFING.md — Persistent situational awareness
- D:\uống nước\.agents\teamwork\explorer_m7_survey_1\progress.md — Liveness heartbeat
- D:\uống nước\.agents\teamwork\explorer_m7_survey_1\handoff.md — Final investigation report
