# Task Assignment: Worker M7 (Milestone 7 Implementation)

## Identity
- Role: Implementation Worker
- Working Directory: D:\uống nước\.agents\teamwork\worker_m7
- Target Project: Voyager's Cosmic Hydration (`D:\uống nước`)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Inputs
- Authoritative User Request: `D:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Specification: `D:\uống nước\.agents\teamwork\PROJECT.md`
- Audio Architecture Explorer Report: `D:\uống nước\.agents\teamwork\explorer_m7_survey_1\handoff.md`
- Alarm UI Explorer Report: `D:\uống nước\.agents\teamwork\explorer_m7_survey_2\handoff.md`
- Audio Sourcing & Test Explorer Report: `D:\uống nước\.agents\teamwork\explorer_m7_survey_3\handoff.md`

## Files You Own Exclusively
- `public/assets/audio/voyager_greeting.mp3`
- `public/assets/audio/voyager_battle.mp3`
- `public/assets/audio/voyager_violin.mp3`
- `src/utils/audioEngine.ts`
- `src/utils/storageEngine.ts`
- `src/components/AlarmRingingModal.tsx`
- `src/tabs/ReminderTab.tsx`
- `src/App.tsx`
- `tests/unit/alarmClock.test.ts`
- `tests/unit/alarmAudio.test.tsx`

## Implementation Checklist
1. **Download Authentic Voyager Audio Files**:
   Create directory `public/assets/audio/` if it does not exist.
   Download using curl / Invoke-WebRequest from the verified GitHub raw URLs:
   - `voyager_greeting.mp3`: `https://raw.githubusercontent.com/Escartem/Reverse1999Dump/8339b91f10492bfc67f495d66fd79ae594d219d4/audio/en/hero3048/mainstory/010-32e57a412866751e768de1a61a29121b.mp3`
   - `voyager_battle.mp3`: `https://raw.githubusercontent.com/Escartem/Reverse1999Dump/8339b91f10492bfc67f495d66fd79ae594d219d4/audio/en/hero3048/skill/018-cb62b0a54fcebd172c2946d52dd5524e.mp3`
   - `voyager_violin.mp3`: `https://raw.githubusercontent.com/Escartem/Reverse1999Dump/8339b91f10492bfc67f495d66fd79ae594d219d4/audio/en/hero3048/skill/034-951296e11fbd3c7c30e6df305fa8b337.mp3`
   Verify file sizes are > 20 KB and valid audio files.

2. **Extend Audio Engine (`src/utils/audioEngine.ts`)**:
   - Keep all existing procedural synthesis functions and types intact.
   - Implement `VOYAGER_AUDIO_TRACKS` registry.
   - Implement `previewVoyagerTrack(trackId, onEnded)` with `HTMLAudioElement` and one-shot preview.
   - Implement `stopPreviewAudio()`.
   - Implement `startAlarmPlayback(trackId)` with `HTMLAudioElement` and `loop = true`.
   - Implement `stopAlarmPlayback()`.
   - Implement `isAlarmPlaying()`.
   - Implement `_setAudioConstructorForTesting(ctor)` to allow injecting `MockAudio` in Node/Vitest.

3. **Extend Storage Engine (`src/utils/storageEngine.ts`)**:
   - Add `AlarmClockConfig` interface:
     `{ isEnabled: boolean, time: string, selectedSound: string, snoozeMinutes: number, snoozeUntil: number | null, lastDismissedKey: string | null }`
   - Add `STORAGE_KEYS.ALARM_CLOCK = 'voyager_alarm_clock'`.
   - Export `loadAlarmConfig(): Promise<AlarmClockConfig>` and `saveAlarmConfig(config: AlarmClockConfig): Promise<void>`.
   - Update `exportDataAsJson()` and `clearAllStorage()` to include alarm clock config.

4. **Create `src/components/AlarmRingingModal.tsx`**:
   - High z-index modal (`z-50`) with backdrop blur.
   - Card-UI styled with amber/gold glowing border.
   - Digital clock display, pulsing bell animation, Voyager Chibi illustration.
   - "Dừng" button (`data-testid="alarm-dismiss-btn"`) to dismiss and stop audio.
   - "Hoãn X phút" button (`data-testid="alarm-snooze-btn"`) to snooze and stop audio.

5. **Update `src/tabs/ReminderTab.tsx`**:
   - Add dedicated Card Section "Đồng hồ báo thức Voyager" (amber/gold theme).
   - Time input (`data-testid="alarm-time-input"`) with presets (`06:00`, `07:00`, `07:30`, `08:00`).
   - Master toggle (`data-testid="alarm-master-toggle"`).
   - Sound audition list for Voyager audio tracks (`voyager_violin`, `voyager_greeting`, `voyager_battle`) and procedural fallbacks, each with "Nghe thử" / "Dừng" button (`data-testid="alarm-sound-preview-btn"`).
   - Snooze selector (5m, 10m, 15m).
   - Preserve all existing elements, test IDs (`reminder-countdown`, `master-reminder-toggle`), and props intact!

6. **Update `src/App.tsx`**:
   - Load and save `alarmConfig`.
   - 1-second interval ticker to check if alarm should trigger:
     * Compare `currentHour === alarmHour && currentMinute === alarmMinute` OR `snoozeUntil !== null && now >= snoozeUntil`.
     * Check `lastDismissedKey !== currentMinuteKey` to prevent re-triggering in the same minute.
   - When triggered: call `startAlarmPlayback(alarmConfig.selectedSound)` and show `AlarmRingingModal`.
   - On dismiss: call `stopAlarmPlayback()`, update `lastDismissedKey = currentMinuteKey`, `snoozeUntil = null`, save config.
   - On snooze: call `stopAlarmPlayback()`, set `snoozeUntil = Date.now() + snoozeMinutes * 60 * 1000`, `lastDismissedKey = currentMinuteKey`, save config.

7. **Automated Test Suites**:
   - `tests/unit/alarmClock.test.ts`: Test time matching, snooze expiry, duplicate minute prevention, persistence.
   - `tests/unit/alarmAudio.test.tsx`: Test UI rendering, preview trigger, alarm modal dismiss and snooze using mocked Audio.

8. **Execute Verification**:
   - Run `npm test` -> must pass 100% of all tests (408 existing + all new tests).
   - Run `npm run test:e2e` -> all 196 tests must pass 100%.
   - Run `npm run build` -> tsc and vite build must succeed with 0 errors.

## Output
Write your detailed report to:
`D:\uống nước\.agents\teamwork\worker_m7\handoff.md`
Include:
- Files modified / created
- Build and test commands executed with exact output and exit codes
- Verification results


## 2026-10-31T17:43:11Z
You are Worker M7 for project Voyager's Cosmic Hydration at D:\uống nước.
Your working directory is D:\uống nước\.agents\teamwork\worker_m7.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Read your task instructions in D:\uống nước\.agents\teamwork\worker_m7\DISPATCH.md.
Also read:
- D:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md
- D:\uống nước\.agents\teamwork\PROJECT.md
- D:\uống nước\.agents\teamwork\explorer_m7_survey_1\handoff.md
- D:\uống nước\.agents\teamwork\explorer_m7_survey_2\handoff.md
- D:\uống nước\.agents\teamwork\explorer_m7_survey_3\handoff.md

Implement Milestone 7:
1. Download authentic Voyager (Reverse: 1999) audio files (.mp3) into public/assets/audio/.
2. Extend src/utils/audioEngine.ts with real audio playback, preview, and alarm looping.
3. Extend src/utils/storageEngine.ts with AlarmClockConfig and persistence.
4. Create src/components/AlarmRingingModal.tsx.
5. Update src/tabs/ReminderTab.tsx with dedicated Alarm section.
6. Update src/App.tsx with alarm state, 1s interval ticker, and AlarmRingingModal.
7. Add automated tests in tests/unit/alarmClock.test.ts and tests/unit/alarmAudio.test.tsx.
8. Execute npm test, npm run test:e2e, and npm run build. Verify 100% pass and 0 errors.

Write your completion report to D:\uống nước\.agents\teamwork\worker_m7\handoff.md.
Send a message when complete.
