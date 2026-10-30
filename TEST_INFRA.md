# Voyager's Cosmic Hydration — End-to-End Test Infrastructure Specification (Tiers 1–4)

**Document ID**: `TEST-INFRA-VCH-001`  
**Author**: teamwork_test_writer  
**Scope**: Complete E2E Opaque-Box Testing Infrastructure, 4-Tier Methodology, Runner Architecture, and Coverage Checklist  
**Status**: APPROVED & PUBLISHED  

---

## 1. Executive Summary & Test Philosophy

This document defines the opaque-box, requirement-driven End-to-End (E2E) testing infrastructure for **Voyager's Cosmic Hydration**. All test cases and assertions are derived directly and authoritatively from the user specifications in `ORIGINAL_REQUEST.md` and technical contracts in `PROJECT.md` and `SPEC-VCH-CORE-001`.

### Core Testing Principles
1. **Opaque-Box Verification**: Tests validate observable system behaviors, calculation outputs, data persistence integrity, user interaction responses, and artifact configurations without relying on hidden private module internals.
2. **Deterministic Output Derivation**: Every test assertion derives its expected value strictly from the mathematical formulas and requirements specified in `ORIGINAL_REQUEST.md` (e.g. $W_{base} = \text{weight} \times 35$, $+250\text{ ml}$ for $28^\circ\text{C}-32^\circ\text{C}$, quiet hours $01:00-07:00$, 50ml rounding).
3. **No Facade / Zero Cheating**: All tests execute genuine assertion logic. No dummy test cases, no tautological assertions (`expect(true).toBe(true)`), and no hardcoded bypasses.
4. **4-Tier Structured Pyramid**:
   - **Tier 1: Feature Coverage** (>= 5 tests per feature $\times$ 17 features = **85 tests**)
   - **Tier 2: Boundary & Corner Cases** (>= 5 tests per feature $\times$ 17 features = **85 tests**)
   - **Tier 3: Cross-Feature Combinations** (Pairwise interactions = **17 tests**)
   - **Tier 4: Real-World Application Scenarios** (Full end-to-end user journeys = **9 tests**)
   - **Total Test Suite Volume**: **196 test cases**

---

## 2. Feature Inventory Mapping

Every feature from `PROJECT.md § Feature Inventory` is mapped to its exact specification source in `ORIGINAL_REQUEST.md` and its test modules:

| Feature ID | Feature Name | Specification Anchor | Tier 1 Tests | Tier 2 Tests | Total Unit/E2E Coverage |
|---|---|---|---|---|---|
| **F01** | Project Scaffolding & Dependencies | `ORIGINAL_REQUEST.md §R1` | 5 | 5 | 10 |
| **F02** | Hydration Engine Formula ($W_{total}$) | `ORIGINAL_REQUEST.md §R2` | 5 | 5 | 10 |
| **F03** | Weather API & Geolocation (Open-Meteo) | `ORIGINAL_REQUEST.md §R2` | 5 | 5 | 10 |
| **F04** | Hydration Unit Test Suite | `ORIGINAL_REQUEST.md §Verification` | 5 | 5 | 10 |
| **F05** | Web Audio Synthesis Engine (3 sounds) | `ORIGINAL_REQUEST.md §R4` | 5 | 5 | 10 |
| **F06** | Dual-Layer Persistence Engine | `ORIGINAL_REQUEST.md §R2` | 5 | 5 | 10 |
| **F07** | Local Notification Scheduler & Quiet Hours | `ORIGINAL_REQUEST.md §R4` | 5 | 5 | 10 |
| **F08** | Voyager Chibi Character Component | `ORIGINAL_REQUEST.md §R3` | 5 | 5 | 10 |
| **F09** | Fixed Bottom Navigation Bar | `ORIGINAL_REQUEST.md §R4` | 5 | 5 | 10 |
| **F10** | TodayTab Screen (Wave Tank, Quick Log) | `ORIGINAL_REQUEST.md §R4` | 5 | 5 | 10 |
| **F11** | ReminderTab Screen (Countdown, Modes) | `ORIGINAL_REQUEST.md §R4` | 5 | 5 | 10 |
| **F12** | JournalTab Screen (Calendar, Streak Flame)| `ORIGINAL_REQUEST.md §R4` | 5 | 5 | 10 |
| **F13** | StatsTab Screen (Bar Chart, Goal Line) | `ORIGINAL_REQUEST.md §R4` | 5 | 5 | 10 |
| **F14** | ProfileTab Screen (6 Companions, 4 Themes)| `ORIGINAL_REQUEST.md §R4` | 5 | 5 | 10 |
| **F15** | Capacitor Android Configuration | `ORIGINAL_REQUEST.md §R5` | 5 | 5 | 10 |
| **F16** | Android Permissions (POST_NOTIFICATIONS) | `ORIGINAL_REQUEST.md §R5` | 5 | 5 | 10 |
| **F17** | GitHub Actions CI APK Build Workflow | `ORIGINAL_REQUEST.md §R5` | 5 | 5 | 10 |
| **T3** | Cross-Feature Pairwise Interactions | Cross-cutting specifications | — | — | 17 |
| **T4** | Real-World Application Scenarios | End-to-end user lifecycles | — | — | 9 |
| **TOTAL** | **Full E2E Suite Volume** | | **85** | **85** | **196 Tests** |

---

## 3. Test Architecture & Runner Invocation

### 3.1 Directory Layout
```
d:/uống nước/
├── tests/
│   ├── e2e/
│   │   ├── harness.ts                     # Assertion utilities, oracle models, mocks
│   │   ├── runner.ts                      # Standalone test runner & reporter
│   │   ├── tier1-features/
│   │   │   ├── f01_scaffolding.test.ts
│   │   │   ├── f02_hydration_formula.test.ts
│   │   │   ├── f03_weather_geolocation.test.ts
│   │   │   ├── f04_unit_test_suite.test.ts
│   │   │   ├── f05_audio_synthesis.test.ts
│   │   │   ├── f06_dual_persistence.test.ts
│   │   │   ├── f07_notification_scheduler.test.ts
│   │   │   ├── f08_voyager_chibi.test.ts
│   │   │   ├── f09_navigation_bar.test.ts
│   │   │   ├── f10_today_tab.test.ts
│   │   │   ├── f11_reminder_tab.test.ts
│   │   │   ├── f12_journal_tab.test.ts
│   │   │   ├── f13_stats_tab.test.ts
│   │   │   ├── f14_profile_tab.test.ts
│   │   │   ├── f15_capacitor_config.test.ts
│   │   │   ├── f16_android_permissions.test.ts
│   │   │   └── f17_github_actions_ci.test.ts
│   │   ├── tier2-boundaries/
│   │   │   ├── f01_scaffolding_boundaries.test.ts
│   │   │   ├── f02_hydration_boundaries.test.ts
│   │   │   ├── f03_weather_boundaries.test.ts
│   │   │   ├── f04_unit_test_boundaries.test.ts
│   │   │   ├── f05_audio_boundaries.test.ts
│   │   │   ├── f06_persistence_boundaries.test.ts
│   │   │   ├── f07_notification_boundaries.test.ts
│   │   │   ├── f08_chibi_boundaries.test.ts
│   │   │   ├── f09_navigation_boundaries.test.ts
│   │   │   ├── f10_today_boundaries.test.ts
│   │   │   ├── f11_reminder_boundaries.test.ts
│   │   │   ├── f12_journal_boundaries.test.ts
│   │   │   ├── f13_stats_boundaries.test.ts
│   │   │   ├── f14_profile_boundaries.test.ts
│   │   │   ├── f15_capacitor_boundaries.test.ts
│   │   │   ├── f16_permissions_boundaries.test.ts
│   │   │   └── f17_ci_boundaries.test.ts
│   │   ├── tier3-combinations/
│   │   │   └── cross_feature_combinations.test.ts
│   │   └── tier4-scenarios/
│   │       └── application_scenarios.test.ts
│   └── unit/
│       └── hydrationEngine.test.ts
├── TEST_INFRA.md                          # This architecture specification
└── TEST_READY.md                          # Readiness checklist & summary
```

### 3.2 Dual Runner Compatibility
The test suite is built to execute under two primary modalities:
1. **Node 20+ Native Test Runner with Experimental Strip-Types**:
   ```bash
   node --experimental-strip-types tests/e2e/runner.ts
   ```
   Or targeting specific tiers:
   ```bash
   node --experimental-strip-types --test tests/e2e/tier1-features/*.test.ts
   ```
2. **Vitest E2E Invocation**:
   ```bash
   npx vitest run tests/e2e
   ```
   Or npm script in `package.json`:
   ```bash
   npm run test:e2e
   ```

---

## 4. 4-Tier Test Methodology & Coverage Details

### 4.1 Tier 1: Feature Coverage (85 Tests)
Ensures every core feature operates correctly under nominal conditions:
- **F01 (Scaffolding)**: Verifies package.json scripts, production dependencies (`lucide-react`, `canvas-confetti`, Capacitor packages), styling setup (`tailwindcss`, `postcss`), TypeScript configuration, and Vite setup.
- **F02 (Formula)**: Verifies $W_{base} = \text{weight} \times 35$, activity tiers (+0, +350, +700 ml), weather tiers (+250 ml for 28-32°C, +500 ml for >32°C, +150 ml for <40% humidity), and rounding to nearest 50 ml.
- **F03 (Weather & GPS)**: Validates Open-Meteo URL construction, weather payload deserialization, Hanoi fallback (`21.0285, 105.8542`), Vinh fallback (`18.6734, 105.6813`), and weather caching.
- **F04 (Unit Tests)**: Confirms presence and structure of unit tests in `tests/unit/hydrationEngine.test.ts`.
- **F05 (Audio)**: Checks procedural generation of 3 sounds ("Gợn nhẹ", "Violin Tinh cầu", "Chuông bong bóng") and master limiter.
- **F06 (Storage)**: Validates dual-layer write-through (`localStorage` + `@capacitor/preferences`), state hydration, and JSON/CSV export formatting.
- **F07 (Notifications)**: Validates notification channel ID, 3 scheduling modes, smart interval calculation, and reminder cancellation.
- **F08 (Voyager Chibi)**: Validates rendering of 5 expressions (`idle`, `happy`, `sleeping`, `gentle`, `strict`) and accessories.
- **F09 (Navigation)**: Validates fixed 5-tab bar, active tab indicators, click routing, and 0% paywall policy.
- **F10 (TodayTab)**: Validates streak badge, weather widget, current/goal readout, wave tank fill math, and quick drink buttons (+50, +150, +250 checked, +500 ml).
- **F11 (ReminderTab)**: Validates countdown timer, cosmic bell, 3 modes, schedule (07:00 / 01:00), and sound preview.
- **F12 (JournalTab)**: Validates monthly calendar grid, cup fill levels, gold medals, and smiling flame streak card.
- **F13 (StatsTab)**: Validates week/month tabs, daily columns, dashed target line, and completion stats.
- **F14 (ProfileTab)**: Validates user profile card, body metric inputs, 6 unlocked companions, 4 unlocked space themes, and export buttons.
- **F15 (Capacitor Config)**: Validates `appId` (`com.manh.voyagerhydration`), `appName` (`Voyager Hydration`), and `webDir` (`dist`).
- **F16 (Permissions)**: Validates `POST_NOTIFICATIONS`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `INTERNET`.
- **F17 (CI Workflow)**: Validates `.github/workflows/build-apk.yml`, Node 20, Java 21, `./gradlew assembleDebug`, artifact upload.

### 4.2 Tier 2: Boundary & Corner Cases (85 Tests)
Exposes the application to extreme, malformed, and boundary inputs:
- Zero, negative, and extreme weights (20 kg, 300 kg, invalid input sanitization).
- Exact weather temperature boundaries: exactly 28.0°C, exactly 32.0°C, 32.1°C, 27.9°C.
- Exact humidity boundaries: exactly 40.0%, 39.9%, 0% extreme arid, 100% saturation.
- Complete network blackout and offline weather fallback.
- Over-consumption (>200% goal) visual tank clamp vs numerical readout.
- Strict quiet hours enforcement ($01:00-07:00$) across midnight boundary.
- Web Audio autoplay policy `'suspended'` unlock and rapid multi-tap stress.
- Corrupted `localStorage` recovery and dual-layer synchronization.
- Calendar month and year transitions (Dec -> Jan, leap years).
- Zero division protection when computing weekly averages or deficit cups.

### 4.3 Tier 3: Cross-Feature Combinations (17 Tests)
Validates pairwise interactions across functional subsystems:
1. **F02 + F03**: Live weather integration dynamically shifts hydration goal formula.
2. **F02 + F10**: Quick drink log immediately reduces water deficit and recalculates remaining cups.
3. **F02 + F14**: Modifying body weight in ProfileTab recomputes base water and total daily goal.
4. **F05 + F10**: Quick drink click triggers Web Audio procedural feedback when sound enabled.
5. **F05 + F14**: Disabling sound switch in ProfileTab globally mutes Web Audio triggers.
6. **F06 + F10**: Logging water in TodayTab writes through to both `localStorage` and `@capacitor/preferences`.
7. **F06 + F14**: Data export downloads complete history and preferences stored by dual-layer persistence.
8. **F07 + F10**: Logging water updates deficit, recalculating smart reminder interval in ReminderTab.
9. **F07 + F11**: Toggling reminder switch off in ReminderTab cancels pending notifications in scheduler.
10. **F07 + F08**: Quiet hours ($01:00-07:00$) mutes notifications and sets Voyager Chibi to `sleeping`.
11. **F08 + F10**: Reaching 100% goal triggers starlight confetti celebration and switches Voyager to `happy`.
12. **F08 + F14**: Uploading custom avatar in ProfileTab propagates image to VoyagerChibi in TodayTab.
13. **F09 + F10-F14**: Navigation bar switches views across all 5 tabs maintaining persistent state.
14. **F10 + F12**: Achieving daily water goal awards gold star medal badge on calendar cup in JournalTab.
15. **F10 + F13**: Daily logged amounts accumulate into weekly bar chart columns and averages in StatsTab.
16. **F12 + F13**: Consecutive goal days increment active streak in JournalTab and update record streak in StatsTab.
17. **F15 + F16 + F17**: Capacitor config, Android permissions, and GitHub Actions CI align into a cohesive APK build pipeline.

### 4.4 Tier 4: Real-World Application Scenarios (9 Tests)
End-to-end simulations of actual user operational workflows:
1. **Scenario 1: Onboarding Journey**: New user sets weight 65kg, moderate activity, fetches GPS weather, receives 2625ml goal rounded to 2650ml.
2. **Scenario 2: Active Workday Hydration**: User wakes at 07:00, logs morning 250ml, logs midday 500ml, tracks deficit countdown and smart interval pacing.
3. **Scenario 3: Scorching Summer Day**: Ambient 36°C with 35% humidity triggers +650ml weather surcharge, expanding daily target and cup count.
4. **Scenario 4: Over-achievement Celebration**: User logs 3000ml against 2400ml target (125%), wave tank visually clamps to 100%, celebration confetti fires, happy mood.
5. **Scenario 5: Offline Flight Mode**: Complete network and GPS blackout triggers Hanoi fallback coordinates, offline indicator, and default weather bonus (+0ml).
6. **Scenario 6: Late Night Hydration & Quiet Hours**: User drinks at 01:30 AM; quiet hours suppress all notification triggers until 07:00 AM.
7. **Scenario 7: 7-Day Habit Formation Streak**: 7 consecutive days of achieving goal; Journal reflects 7 gold medals; streak counter increments to 7.
8. **Scenario 8: End-of-Month Data Backup**: 30 days of hydration logs exported to JSON and CSV; verified RFC-4180 compliance and zero data corruption.
9. **Scenario 9: Complete Theme & Companion Customization**: User switches to "Dải Ngân Hà" theme, selects "Voyager Hòa Âm", uploads custom avatar, switches unit to `ml`.

---

## 5. Verification & Acceptance Criteria
- Every test file must execute without fatal unhandled exceptions or runner crashes.
- Test runner outputs structured table with passes, failures, and execution times.
- 100% of the 196 test cases execute against the application's contracts and files.

*End of Test Infrastructure Specification.*
