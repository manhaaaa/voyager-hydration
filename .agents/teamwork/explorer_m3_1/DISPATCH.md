## 2026-10-30T16:14:30Z
You are explorer_m3_1, a teamwork_explorer subagent for Milestone 3 ("5 Main Tab Screens & Card-UI System").
Your working directory is: d:\uống nước\.agents\teamwork\explorer_m3_1\

You MUST read the following authoritative files first:
1. `d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `d:\uống nước\.agents\teamwork\PROJECT.md` (Architecture and Feature Inventory)
3. `d:\uống nước\.agents\teamwork\sub_orch_m3\SCOPE.md` (Milestone 3 Scope)
4. Existing code in `src/types/index.ts`, `src/utils/hydrationEngine.ts`, `src/utils/audioEngine.ts`, `src/components/VoyagerChibi.tsx`.

Your Task:
Investigate and design the exact technical specification, component props, state hooks, and implementation plan for:
1. `src/components/NavigationBar.tsx`:
   - Fixed bottom navigation bar with 5 tabs: Today, Reminder, Journal, Stats, Profile.
   - Card-UI styling: 2px solid `#1E293B`, `shadow-[0_4px_0_#1E293B]`, active tab cosmic highlight, tactile click feedback.
   - 100% free, 0% paywall / zero VIP badges.
2. `src/components/WaveTank.tsx`:
   - Interactive water wave animation (SVG / canvas / CSS keyframes), dynamic fill level based on percentage (0-100%+).
   - Floating cosmic stars / bubble particles.
   - Visual mounting point for Voyager Chibi bobbing gently atop the liquid surface.
3. `src/tabs/TodayTab.tsx`:
   - Streak flame 🔥 counter with active days.
   - Weather widget displaying Open-Meteo current temp, humidity, weather bonus, and location.
   - Today's progress: Current ml vs Daily Goal ml, percentage indicator.
   - Deficit indicator card ("Cần thêm X ly nước để đạt mục tiêu!").
   - Integrated WaveTank with Voyager Chibi.
   - Quick log buttons: +50ml, +150ml, +250ml (checked by default), +500ml with Card-UI tactile styling.
   - Custom water intake modal dialog for custom amounts.
   - Confetti burst (`canvas-confetti`) when target is achieved.
   - Audio feedback integration (`playQuickTap`, `playGoalCelebrationFanfare`).

Produce a detailed, ready-to-implement specification in `d:\uống nước\.agents\teamwork\explorer_m3_1\handoff.md`.
Then report completion to parent orchestrator via send_message.
