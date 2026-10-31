## 2026-10-31T15:31:48Z
From: 128bc40e-5829-492d-bad2-62ae7f2e3136
Task Objective:
Investigate full system integration, state management, and test suite impacts:
1. Examine all existing unit tests (`tests/unit/`) and E2E tests (`tests/e2e/`), especially tests covering `TodayTab`, `VoyagerChibi`, `WaveTank`, quick log, bedtime mode, and water levels.
2. Determine what tests will be impacted by:
   - Adding `drinking` state to `VoyagerChibi` and removing the dark overlay during quiet hours/bedtime.
   - Replacing `WaveTank` with `CosmicWaterPlanet` (or keeping backward-compatible props/DOM data-testids if necessary).
3. Verify compatibility with other tabs: `ReminderTab.tsx`, `JournalTab.tsx`, `StatsTab.tsx`, `ProfileTab.tsx`. Ensure streak, local notifications, preferences/localStorage persistence are untouched and work cleanly.
4. Formulate test update strategies and recommendations to ensure `npm test` and `npm run build` will pass with 100% success after implementation.
