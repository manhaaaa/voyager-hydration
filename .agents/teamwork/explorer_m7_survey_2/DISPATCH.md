# Task Assignment: Explorer Survey 2 (Alarm Clock UI & State Architecture)

## Identity
- Role: Explorer / Technical Investigator
- Working Directory: D:\uống nước\.agents\teamwork\explorer_m7_survey_2
- Target Project: Voyager's Cosmic Hydration (`D:\uống nước`)

## Objective
Investigate the existing UI tabs, state management, and persistence layer to design the independent alarm clock feature (time setting, enable/disable toggle, snooze, ringing alert modal, sound selector, and persistence).

## Inputs
- Authoritative User Request: `D:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Specification: `D:\uống nước\.agents\teamwork\PROJECT.md`
- Reminder Screen: `src/tabs/ReminderTab.tsx`
- Main App Container: `src/App.tsx`
- Storage Engine: `src/utils/storageEngine.ts`
- UI Components: `src/components/`

## Requirements to Investigate
1. UI Placement & UX: Where should the independent alarm clock live? Should it be an integrated section within `ReminderTab.tsx` (which currently manages hydration reminders) or an independent modal/tab? How to ensure clear separation between periodic hydration reminders and the independent clock alarm?
2. Alarm Configuration & Controls:
   - Setting hour & minute (picker or input with time validation)
   - Toggle switch (ON/OFF)
   - Sound selection dropdown or radio list with instant preview play/stop button
   - Label or cosmic theme description
3. Trigger & Ringing Behavior:
   - Periodic ticking / interval check in React (or App level) to detect when `currentHour == alarmHour && currentMinute == alarmMinute`
   - Ringing alert UI: full-screen or high-priority floating modal that appears when alarm fires, playing the selected Voyager audio in a loop
   - Action buttons: "Dừng" (Dismiss/Stop) and "Hoãn" (Snooze - e.g. +5 or +10 minutes)
   - State handling: preventing double-triggering within the same minute
4. Storage & Persistence:
   - Schema for alarm settings (`alarmHour`, `alarmMinute`, `isEnabled`, `selectedSound`, `snoozeUntil`)
   - Integration with `storageEngine.ts` (localStorage + Capacitor Preferences) so alarm state persists across app reloads.
5. Verification & Test Strategy:
   - How can alarm state and triggering logic be verified deterministically in automated tests (`vitest` with fake timers `vi.useFakeTimers()`).

## Output
Write your comprehensive analysis and recommendations to:
`D:\uống nước\.agents\teamwork\explorer_m7_survey_2\handoff.md`
Include:
- Observation (existing UI structure and storage patterns)
- Logic Chain (state flow, interval handling, snooze calculation)
- Caveats & Edge Cases (app running in background, minute boundary transitions, snooze state expiration)
- Recommendation (component interfaces, state types, and UI layout)


## 2026-10-31T17:26:55Z
You are an Explorer for project Voyager's Cosmic Hydration at D:\uống nước.
Your working directory is D:\uống nước\.agents\teamwork\explorer_m7_survey_2.
Read your instructions in D:\uống nước\.agents\teamwork\explorer_m7_survey_2\DISPATCH.md.
Also read D:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md and D:\uống nước\.agents\teamwork\PROJECT.md.

Investigate:
1. UI structure in src/tabs/ReminderTab.tsx, src/App.tsx, and src/utils/storageEngine.ts.
2. Design of independent alarm clock controls (hour/minute picker, toggle switch, sound selector, snooze logic, active ringing alert overlay).
3. State persistence schema and interval checking logic.

Write your final analysis and recommendations to:
D:\uống nước\.agents\teamwork\explorer_m7_survey_2\handoff.md
Send a completion message back when done.
