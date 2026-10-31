# Handoff Report: Independent Alarm Clock UI & State Architecture (Survey 2)

## 1. Observation

### Existing UI Structure in `src/tabs/ReminderTab.tsx`
- **Component definition & props**: Defined at lines 27-44 as `ReminderTab: React.FC<ReminderTabProps>` with props `{ settings, profile, targetMl, consumedMl, onUpdateSettings, onScheduleReminders, className }`.
- **Existing Cards Layout**:
  - **Header (lines 174-194)**: Displays title `"Nhắc nhở vũ trụ"`, subtitle `"Tiếng chuông ngân hà & nhịp sinh học"`, and an active/inactive pill badge (`isEnabled ? 'Đang hoạt động' : 'Đã tắt nhắc nhở'`).
  - **Card 1 — Next Reminder (lines 196-270)**: Features `VoyagerChibi` with a cosmic bell badge, countdown string (`data-testid="reminder-countdown"`), mode info, and master switch (`data-testid="master-reminder-toggle"`).
  - **Card 2 — Reminder Modes (lines 272-400)**: 3 selector cards for `smart` (adaptive 45-150m), `regular` (fixed 90m), and `gentle` (fixed 180m).
  - **Card 3 — Schedule & Quiet Hours (lines 402-458)**: Inputs for `wakeTime` (`"07:00"`) and `sleepTime` (`"01:00"`), with an explanation of quiet hours suppression.
  - **Card 4 — Cosmic Sound Previewer (lines 460-550)**: Sound audition list with preview buttons for procedural tones (`ripple`, `violin`, `bubble`).
- **Test ID bindings**: Tests in `tests/unit/milestone3Tabs.test.tsx` (lines 166-198) and `tests/e2e/tier1-features/f11_reminder_tab.test.ts` (lines 8-59) directly query `reminder-countdown` and `master-reminder-toggle`. Any modification must leave these DOM nodes and IDs strictly intact.

### App Root & Navigation in `src/App.tsx` and `src/components/NavigationBar.tsx`
- **Navigation Bar**: `src/components/NavigationBar.tsx` (lines 17-23) defines exactly 5 tabs in strict order: `'reminder'` ('Nhắc nước'), `'journal'` ('Nhật ký'), `'today'` ('Hôm nay'), `'stats'` ('Thống kê'), `'profile'` ('Cá nhân'). Verified in E2E tests `f09_navigation_bar.test.ts` (9.1 - 9.5).
- **Tab Routing**: `src/App.tsx` (lines 276-337) conditionally renders active tabs inside a mobile container (`max-w-md mx-auto min-h-screen pb-24`).
- **Overlay Precedents**: Confetti celebrations and modal overlays are managed directly at the app level (e.g. line 196 confetti trigger). There is currently no top-level alarm ringing modal.

### State Persistence in `src/utils/storageEngine.ts`
- **Dual-Layer Engine**: `src/utils/storageEngine.ts` implements write-through persistence: Layer 1 is synchronous `window.localStorage` (lines 128-144) for instant React hydration, and Layer 2 is asynchronous `@capacitor/preferences` (lines 150-161) for native Android `SharedPreferences`.
- **Existing Schemas**:
  - `AppSettings` (lines 57-68) stores `selectedSound`, `reminderEnabled`, `reminderMode`, `wakeTime`, `sleepTime`, `selectedTheme`, and `selectedCompanion`.
  - `STORAGE_KEYS` (lines 17-24) maps known keys (`USER_PROFILE`, `DAILY_LOGS`, `SETTINGS`, `WEATHER_CACHE`, `STREAK`, `LAST_EXPORT`).
  - No storage key or schema currently exists for an independent alarm clock.

### Test Environment & Build Status
- **Automated Tests**: Running `vitest run tests/unit` executes 19 test files with **408 passed tests (100%)** in 18.31s.
- **E2E Tests**: Running `node --experimental-strip-types tests/e2e/runner.ts` executes **196 passed tests (100%)** across Tiers 1-4.
- **Production Build**: Running `tsc && vite build` successfully transpiles and bundles 1,613 modules cleanly in 4.39s (`dist/assets/index-*.js`, 280 kB).

---

## 2. Logic Chain

### 2.1 UI Placement Rationale: Integrating into `ReminderTab.tsx`
1. Adding a 6th bottom navigation tab would violate `PROJECT.md` contracts, fail `tests/e2e/tier1-features/f09_navigation_bar.test.ts` (which tests for exactly 5 tabs with fixed labels), and cramp mobile screen touch targets on 360px-412px Android viewports.
2. An alarm clock is intrinsically a temporal alert utility. Users naturally look for alarm settings where reminders live.
3. Placing the Independent Alarm Clock as a dedicated Card Section inside `src/tabs/ReminderTab.tsx` (below or seamlessly alongside the hydration reminder cards) preserves 100% backward compatibility with all existing E2E and unit tests while giving the alarm prominent visibility.
4. To establish clear UX separation:
   - **Hydration Reminders**: Themed in `cosmic-blue` (`#38BDF8`) with `Bell` and `Droplets` icons; labelled "Nhắc nhở uống nước (Theo lượng nước thiếu hụt)".
   - **Voyager Alarm Clock**: Themed in `cosmic-gold` (`#FBBF24`) and `cosmic-purple` (`#818CF8`) with an `AlarmClock` icon; labelled "Đồng hồ báo thức Voyager (Báo thức độc lập)".
   - Dedicated explanatory badge: *"Hoạt động độc lập, chuông reo chính xác vào giờ hẹn bất kể mục tiêu uống nước."*

### 2.2 Alarm Clock Control Design
1. **Hour & Minute Setting**:
   - Primary control: Native `<input type="time" data-testid="alarm-time-input" ... />` styled with Card-UI tokens (`bg-slate-900 border-2 border-cosmic-border rounded-xl px-4 py-2 text-2xl font-black font-mono text-cosmic-gold focus:border-amber-400`).
   - Quick preset time chips below: `[06:00]`, `[07:00]`, `[07:30]`, `[08:00]`, `[+15 phút]`, `[+30 phút]`.
2. **Master Enable/Disable Toggle**:
   - Card-UI toggle switch (`data-testid="alarm-master-toggle"`) with smooth slide animation.
   - When enabled: Shows active amber glow (`bg-amber-500`) and countdown: "Chuông sẽ reo sau X giờ Y phút".
   - When disabled: Shows slate-700 background and label "Đã tắt báo thức".
3. **Voyager Sound Selection with Live Audition**:
   - Sound options menu referencing authentic Voyager assets in `public/assets/audio/`:
     * `voyager_voice_greeting`: "Voice nền & sảnh" (Lời chào buổi sáng ngân hà của Voyager).
     * `voyager_voice_battle`: "Voice vào trận" (Khởi động bản hòa tấu vũ trụ).
     * `voyager_violin`: "Tiếng đàn violin" (Giai điệu vĩ cầm Reverse: 1999).
     * `violin` / `bubble`: Procedural synthesized fallback sounds from M2.
   - Each option includes an instant "Nghe thử" / "Dừng" button (`data-testid="alarm-sound-preview-btn"`).
   - Audio preview must remain isolated and never modify hydration intake logs.
4. **Snooze (Hoãn báo thức) Duration Selector**:
   - Selector chips for snooze intervals: `5 phút`, `10 phút`, `15 phút`. Default: `5 phút`.

### 2.3 Active Ringing Alert Overlay (`AlarmRingingModal.tsx`)
1. **App-Level Placement**: The ringing modal must be mounted in `src/App.tsx` outside of the active tab view. If the user is on `TodayTab` or `JournalTab`, the alarm must still ring and display the overlay immediately.
2. **Visual & Auditory Experience**:
   - High z-index modal (`z-50`), semi-transparent backdrop blur (`bg-black/85 backdrop-blur-md`).
   - Animated Card container with glowing gold border (`border-2 border-amber-400 shadow-glow-gold`).
   - Chibi Voyager animation with sparkling aura (`expression="gentle"` or `"happy"`).
   - Giant pulsing digital clock display (`HH:mm`).
   - Continuous looping playback of the selected Voyager sound file.
3. **Action Controls**:
   - **"Dừng" (Dismiss/Stop)** (`data-testid="alarm-dismiss-btn"`): Stops audio, closes modal, marks current minute as handled so the alarm does not fire again today.
   - **"Hoãn X phút" (Snooze)** (`data-testid="alarm-snooze-btn"`): Stops audio, sets `snoozeUntil = Date.now() + snoozeMinutes * 60 * 1000`, closes modal, and displays snooze status banner in UI.

### 2.4 State Persistence Schema & Dual-Layer Integration
1. Define a dedicated interface `AlarmClockConfig` and default object:
   ```typescript
   export interface AlarmClockConfig {
     isEnabled: boolean;
     time: string;                  // "HH:mm", e.g. "07:30"
     selectedSound: string;         // "voyager_violin" | "voyager_voice_greeting" | "voyager_voice_battle"
     snoozeMinutes: number;         // 5 | 10 | 15
     snoozeUntil: number | null;    // Epoch millisecond timestamp or null
     lastDismissedKey: string | null; // e.g. "2026-11-01 07:30" to prevent double-firing in same minute
   }

   export const DEFAULT_ALARM_CONFIG: AlarmClockConfig = {
     isEnabled: false,
     time: '07:30',
     selectedSound: 'voyager_violin',
     snoozeMinutes: 5,
     snoozeUntil: null,
     lastDismissedKey: null,
   };
   ```
2. In `src/utils/storageEngine.ts`:
   - Add key: `STORAGE_KEYS.ALARM_CLOCK = 'voyager_alarm_clock'`.
   - Export helper functions: `loadAlarmConfig()` and `saveAlarmConfig(config)`.
   - Include `STORAGE_KEYS.ALARM_CLOCK` in `clearAllStorage()` and export payload in `exportDataAsJson()`.
   - Utilizes dual-layer persistence (synchronous `localStorage` + asynchronous `@capacitor/preferences`).

### 2.5 Interval Checking Engine & Edge-Case Protection
1. **Checking Frequency**:
   - Run a 1-second interval (`setInterval(checkAlarm, 1000)`) in `src/App.tsx` (or custom hook `useAlarmClock`).
   - Checking every 1s has negligible CPU footprint (< 0.001ms per tick) and guarantees that minute transitions are never missed due to timer jitter or drift.
2. **Double-Trigger Prevention Logic**:
   - Construct a minute key string: `currentMinuteKey = `${now.toDateString()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`.
   - Firing condition:
     ```typescript
     const isTimeMatch = currentH === alarmH && currentM === alarmM;
     const isSnoozeMatch = alarmConfig.snoozeUntil !== null && nowMs >= alarmConfig.snoozeUntil;

     if (alarmConfig.isEnabled && (isTimeMatch || isSnoozeMatch)) {
       if (alarmConfig.lastDismissedKey !== currentMinuteKey) {
         triggerAlarmRinging();
       }
     }
     ```
   - When the user clicks "Dừng" at 07:30:15, `lastDismissedKey` is set to `"Sun Nov 01 2026 07:30"`.
   - During the remaining 45 seconds of minute 07:30, `alarmConfig.lastDismissedKey === currentMinuteKey`, completely suppressing re-triggers.
   - At 07:31:00, `isTimeMatch` becomes `false`, remaining idle.
   - The next morning at 07:30, `now.toDateString()` is `"Mon Nov 02 2026"`, differing from `lastDismissedKey`, allowing the alarm to trigger reliably.
3. **Snooze Expiration Handling**:
   - When snooze is activated, `snoozeUntil` is stored as an exact timestamp (e.g. `nowMs + 5 * 60 * 1000`).
   - When `nowMs >= snoozeUntil`, the alarm rings again. Upon dismiss or re-snooze, `snoozeUntil` is cleared or advanced, and `lastDismissedKey` is updated to the current minute.
4. **Mobile Background & Sleep Mode**:
   - In mobile WebView (Capacitor Android), background tabs may be throttled.
   - Mitigation: When setting or toggling the alarm, schedule a matching high-importance alert notification via `@capacitor/local-notifications`. When the user taps the notification or opens the app, the app detects that the alarm time has arrived and immediately displays the ringing overlay.

---

## 3. Caveats

1. **Audio File Availability**: Survey 1 and Survey 3 are responsible for sourcing and integrating the audio files into `public/assets/audio/`. The UI components must gracefully handle missing files by falling back to procedural synthesizer sounds (`violin` or `bubble` from `audioEngine.ts`) if an audio asset fails to load.
2. **Browser Autoplay Policies**: Modern browsers require user interaction before playing audio with sound. In web mode, if the user leaves the tab open overnight without interacting, the browser might block unprompted audio playback.
   - *Mitigation*: The app already registers gesture auto-unlock listeners (`registerAutoUnlockListeners()` in `audioEngine.ts`). When the alarm triggers, the modal overlay appears immediately with a prominent visual flashing alert so the user can interact even if audio is initially restricted.
3. **Capacitor Mobile Background Audio**: Android background execution limits may suspend Web Audio when the app is in the background. As noted in Section 2.5, scheduling a native local notification alongside the in-app timer ensures the phone rings and alerts the user natively.

---

## 4. Conclusion

1. **Component Placement**: The independent alarm clock controls should be placed as a dedicated, beautifully styled Card Section inside `src/tabs/ReminderTab.tsx` titled **"Đồng hồ báo thức Voyager"**, preserving the 5-tab structure of `NavigationBar.tsx` and preventing breaking changes in existing tests.
2. **Ringing Modal**: An `AlarmRingingModal` component must be rendered at the root of `src/App.tsx`, controlled by a global alarm state hook, ensuring the alarm alerts the user regardless of which tab is active.
3. **Controls Provided**:
   - Time picker (HTML5 `<input type="time">` + quick chips).
   - Card-UI master toggle (`alarm-master-toggle`).
   - Sound selector with "Nghe thử" / "Dừng" audio preview for authentic Voyager voice lines and violin melody.
   - Snooze selector (5, 10, 15 minutes).
4. **State Persistence**:
   - Dedicated `AlarmClockConfig` stored under `STORAGE_KEYS.ALARM_CLOCK = 'voyager_alarm_clock'`.
   - Dual-layer storage synchronization (`localStorage` + `@capacitor/preferences`).
5. **Interval Checking & Deduplication**:
   - 1-second interval ticker in `App.tsx` / `useAlarmClock`.
   - Minute-key tracking (`lastDismissedKey`) prevents duplicate triggering within the same minute while ensuring accurate daily recurring triggers and snooze re-triggers.

---

## 5. Verification Method

### 5.1 Automated Unit Tests (Vitest with Fake Timers)
Create a dedicated test file `tests/unit/alarmClock.test.tsx` verifying:
1. **Initial Rendering & Presets**:
   - Renders time input, master toggle, sound choices, and snooze duration selector in `ReminderTab`.
   - Defaults match `DEFAULT_ALARM_CONFIG` (`isEnabled: false`, `time: '07:30'`, sound: `'voyager_violin'`).
2. **Toggle & Persistence**:
   - Clicking `alarm-master-toggle` flips `isEnabled` and writes to `storageEngine`.
   - Changing time to `'08:15'` updates stored configuration.
3. **Triggering with Fake Timers**:
   - Set system time to `07:29:55` via `vi.setSystemTime(new Date('2026-11-01T07:29:55'))`.
   - Advance timers by 6,000ms via `vi.advanceTimersByTime(6000)`.
   - Assert `data-testid="alarm-ringing-modal"` is rendered in DOM.
   - Assert audio engine looping play was called.
4. **Dismissal & Deduplication**:
   - Click `data-testid="alarm-dismiss-btn"`.
   - Assert modal unmounts and audio stops.
   - Advance timers by another 30,000ms (still within minute 07:30).
   - Assert modal does NOT re-appear.
5. **Snooze Logic**:
   - Trigger alarm, then click `data-testid="alarm-snooze-btn"`.
   - Assert modal unmounts, audio stops, and snooze state indicates next ring at `07:35`.
   - Advance timers by 4 minutes -> modal does not ring.
   - Advance timers by 1 minute (total 5m) -> modal rings again.

### 5.2 Verification Commands
Run the following commands in `D:\uống nước`:
```bash
# 1. Run all unit tests
npm test

# 2. Run E2E test suite (ensure 100% pass, 0 regressions)
npm run test:e2e

# 3. Verify TypeScript and Vite production build
npm run build
```

**Invalidation Conditions**:
- Any regression in existing unit tests (`milestone3Tabs.test.tsx`, `audioEngine.test.ts`) or E2E tests (`f09_navigation_bar.test.ts`, `f11_reminder_tab.test.ts`).
- Failure of `AlarmRingingModal` to mount when user is on a tab other than `reminder`.
- Alarm firing multiple times within the same 60-second window.
