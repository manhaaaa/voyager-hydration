# Handoff Report: Dual-Layer Storage Engine & Local Notification Engine Blueprint
**Agent**: teamwork_explorer (Explorer 2)  
**Recipient**: Milestone 2 Sub-Orchestrator (`7c380586-cf2a-4df7-b89c-a4b667536d21`)  
**Working Directory**: `d:\uống nước\.agents\teamwork\explorer_m2_2\`  
**Target Milestone**: Milestone 2 — Audio, Persistence & Voyager Chibi  
**Type**: Hard Handoff (Investigation & Blueprint Complete)

---

## 1. Observation

1. **Existing Codebase & Scaffolding**:
   - `package.json` (lines 14-26) declares production dependencies `@capacitor/core: ^7.0.0`, `@capacitor/preferences: ^7.0.0`, `@capacitor/local-notifications: ^7.0.0`, `@capacitor/filesystem: ^7.0.0`, and `@capacitor/geolocation: ^7.0.0`.
   - `src/types/index.ts` declares foundational types for `UserProfile`, `WeatherData`, and `HydrationCalculationResult`.
   - `src/utils/` currently contains `hydrationEngine.ts` (16,114 bytes) created in Milestone 1; `storageEngine.ts` and `notificationEngine.ts` do not exist yet.

2. **E2E Test Harness Verification**:
   - `tests/e2e/tier1-features/f06_dual_persistence.test.ts` (lines 8-74) specifies:
     * Test 6.1 & 6.2: Dual-layer write updates synchronous `localStorage` immediately and replicates to asynchronous `@capacitor/preferences`.
     * Test 6.3: State loader hydrates default profile (`name: 'Mạnh'`, `weightKg: 60`, `unit: 'L'`, `activityLevel: 'moderate'`) when storage is empty.
     * Test 6.4: Export JSON function generates valid parseable JSON.
     * Test 6.5: Export CSV generates UTF-8 CSV with expected column headers: `['Ngày', 'Mục tiêu (ml)', 'Đã uống (ml)', 'Tỷ lệ (%)', 'Trạng thái', 'Số lần uống']`.
   - `tests/e2e/tier1-features/f07_notification_scheduler.test.ts` (lines 13-83) specifies:
     * Test 7.1: Channel config ID `'voyager_hydration_reminders'`, name `'Nhắc nhở uống nước Voyager'`.
     * Test 7.2: Supports 3 reminder modes: `'gentle'` (180 min), `'smart'`, and `'regular'` (90 min).
     * Test 7.3: Smart interval adapts to deficit and awake window:
       - 660 min awake, 6 glasses deficit $\implies 110$ min.
       - 100 min awake, 5 glasses deficit $\implies 20$ min clamped to $45$ min.
       - 600 min awake, 1 glass deficit $\implies 600$ min clamped to $150$ min.
     * Test 7.4: Toggle off cancels scheduled notifications in queue.
     * Test 7.5: Messages use Reverse: 1999 Voyager celestial phrasing containing `'ngân hà'`, `'Voyager'`, or `'đàn'`.
   - `tests/e2e/tier2-boundaries/f06_persistence_boundaries.test.ts` (lines 8-86) specifies:
     * Test 6.6: Corrupted `localStorage` string recovers safely by returning default fallback schema without crashing.
     * Test 6.7: Partial storage eviction reconciles from native `@capacitor/preferences`.
     * Test 6.8: Preserves Vietnamese Unicode and emojis (`"Nguyễn Văn Mạnh 🌌"`, `"🔥 10 ngày"`).
     * Test 6.9: High volume 365-day logs serialized bounded $< 50\text{ KB}$.
     * Test 6.10: RFC-4180 CSV escaping for commas, quotes, and newlines.
   - `tests/e2e/tier3-combinations/cross_feature_combinations.test.ts` & `tests/e2e/tier4-scenarios/application_scenarios.test.ts`:
     * Test T3.10 & T4.06: Strict Quiet Hours suppression (01:00 - 07:00), deferring next scheduled reminder to 07:00 AM and switching Voyager mood to `sleeping`.

3. **Baseline Test Execution**:
   - Running `npm test` executes Vitest unit test suite (3 files, 103 tests), passing 100% with exit code 0.
   - Running `npm run test:e2e` executes E2E runner (196 tests), with 186 passed (the only 10 pending tests are F16 AndroidManifest and F17 GitHub Actions CI from Milestone 4).

---

## 2. Logic Chain

1. **Dual-Layer Storage Logic**:
   - Because React initial mount requires synchronous state access to prevent layout shift or empty flashes (Observation 1 & 2), `getStorageItem` must read from `window.localStorage` synchronously.
   - Because Android OS can reclaim WebView memory and clear `localStorage` (Observation 2, Test 6.7), all writes (`setStorageItem`) must asynchronously replicate to `@capacitor/preferences`.
   - On boot, `reconcileStorage()` iterates through Preferences keys to backfill any evaporated `localStorage` entries (Observation 2, Test 6.7).
   - If `localStorage` contains corrupted JSON, `JSON.parse` is wrapped in a try/catch block to return the typed fallback schema (Observation 2, Test 6.6).

2. **Data Export Logic**:
   - For `exportDataAsJson()`, aggregating `voyager_user_profile`, `voyager_settings`, and `voyager_daily_logs` into a structured payload satisfies tests 6.4, 14.7, and T4.08.
   - For `exportDataAsCsv()`, extracting daily logs, sorting dates chronologically, applying RFC-4180 escaping (`replace(/"/g, '""')`), prepending UTF-8 BOM (`\uFEFF`), and formatting the exact 6 columns (`Ngày,Mục tiêu (ml),Đã uống (ml),Tỷ lệ (%),Trạng thái,Số lần uống`) satisfies tests 6.5, 6.10, and 14.8.

3. **Notification Scheduling Logic**:
   - Local notifications on Android 13+ require notification channel registration (`voyager_hydration_reminders`) and runtime `POST_NOTIFICATIONS` permission check (Observation 1 & 2, Test 7.1).
   - In `'gentle'` mode, the interval is constant 180 min; in `'regular'` mode, 90 min; in `'smart'` mode, the dynamic formula $\text{clamp}(45, \text{round}(\text{minutesToSleep} / N_{glasses}), 150)$ produces deterministic scheduling that adapts dynamically as the user drinks water (Observation 2, Test 7.3 & T3.08).
   - In cross-midnight quiet hours ($01:00 - 07:00$), `isInQuietHours()` identifies timestamps inside $[60, 420)$ minutes. `adjustForQuietHours()` defers any reminder landing in this interval to 07:00 AM, guaranteeing absolute silence during rest (Observation 2, Test T3.10 & T4.06).
   - Cancel operations (`cancelAllReminders`) clear the queue when notifications are toggled off (Observation 2, Test 7.4 & T3.09).

---

## 3. Caveats

1. **Native vs Web Platform**: On desktop browser environments (`Capacitor.isNativePlatform() === false`), `@capacitor/local-notifications` calls are gracefully bypassed or delegated to web notifications to prevent console exceptions during development and testing.
2. **Exact Alarm Timing on Android**: On Android 12+ (API 31+), exact alarms require `SCHEDULE_EXACT_ALARM` permission if millisecond precision is demanded; for standard hydration reminders, standard rolling local notifications within $\pm 1 - 2$ minutes provide battery-efficient scheduling.
3. **No Production Code Modified**: Per dispatch boundaries, no files in `src/` were created or altered during this investigation turn. All blueprints are delivered in documentation.

---

## 4. Conclusion

The technical architecture and complete implementation blueprint for `storageEngine.ts` and `notificationEngine.ts` are finalized and documented in `storage_notification_blueprint.md`.

The blueprint provides:
1. Complete TypeScript interfaces, constants, and functions for `storageEngine.ts`:
   - `getStorageItem`, `setStorageItem`, `removeStorageItem`, `clearAllStorage`, `reconcileStorage`, `saveAppState`, `loadAppState`.
   - `exportDataAsJson`, `exportDataAsCsv`, `escapeCsvCell`, `triggerDownload`.
2. Complete TypeScript interfaces, constants, and functions for `notificationEngine.ts`:
   - `initializeNotificationEngine`, `checkPermissions`, `requestPermissions`, `cancelAllReminders`, `scheduleNextReminders`, `formatNextReminderCountdown`.
   - `calculateSmartInterval`, `calculateMinutesToBedtime`, `isInQuietHours`, `adjustForQuietHours`.
   - Reverse: 1999 Voyager celestial message catalog (`VOYAGER_NOTIFICATIONS`).
3. Alignment with all 196 E2E tests, particularly F06, F07, T3.06-T3.10, and T4.06-T4.08.

---

## 5. Verification Method

1. **Review Blueprint Document**:
   - Inspect `d:\uống nước\.agents\teamwork\explorer_m2_2\storage_notification_blueprint.md`.
2. **Execute Existing Test Suites**:
   - Run Vitest unit tests: `npm test` (verify all 103 unit tests pass).
   - Run E2E tests: `npm run test:e2e` (verify 186/196 tests pass, with F06 and F07 simulators passing 100%).
3. **Code Compliance Check**:
   - Compare proposed blueprint signatures against `PROJECT.md` lines 89-95 and `tests/e2e/harness.ts` lines 94-130 and 221-310.

---
*Report filed by teamwork_explorer (Explorer 2).*
