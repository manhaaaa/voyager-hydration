# Scope: Milestone 3 — 5 Main Tab Screens & Card-UI System

## Objective
Implement all 5 primary user-facing tab screens, bottom navigation bar, reusable Card-UI components, modal dialogs, and top-level application state integration for "Voyager's Cosmic Hydration" in React 18 + TypeScript + Tailwind CSS.

## Architecture & Component Breakdown
1. **State Store & Provider / Context**:
   - Central application state in `src/App.tsx` (or custom hook `useHydrationState.ts`) connecting `storageEngine.ts`, `hydrationEngine.ts`, `audioEngine.ts`, and `notificationEngine.ts`.
   - Dual-layer storage synchronization on every state change.
   - Weather fetching on mount with GPS / fallback coordinates.

2. **Components**:
   - `src/components/NavigationBar.tsx`: Fixed bottom bar, 5 tabs (Today, Reminder, Journal, Stats, Profile), 0 paywalls.
   - `src/components/Card.tsx` / `src/components/Modal.tsx`: Card-UI tokens (2px solid `#1E293B`, `shadow-[0_4px_0_#1E293B]`, active depress effect).
   - `src/components/WaveTank.tsx`: Liquid wave animation, floating cosmic stars, level percentage.
   - `src/components/VoyagerChibi.tsx`: Already implemented in M2, wired dynamically to intake percentage and state.

3. **Tabs**:
   - `src/tabs/TodayTab.tsx`: Streak counter, weather info, wave tank + Voyager Chibi, deficit indicator, quick log buttons (+50, +150, +250 checked, +500ml), custom modal, confetti celebration, sound trigger.
   - `src/tabs/ReminderTab.tsx`: Next alert countdown, cosmic bell chibi, on/off toggle, 3 reminder modes (Gentle, Regular, Smart), quiet hours schedule, 3 sound previews.
   - `src/tabs/JournalTab.tsx`: Monthly calendar grid with cup fill levels, gold completion badges, drinking log list with delete/edit, streak card with Reverse: 1999 quote.
   - `src/tabs/StatsTab.tsx`: Week/Month/Custom tabs, bar chart with dashed target line, mini Voyager icon perched on columns, average intake and completion rate metrics.
   - `src/tabs/ProfileTab.tsx`: User avatar & custom upload, username edit (Mạnh), physical metrics & activity level, weather adjustment toggle, 6 companions (100% free), 4 cosmic themes, ml/L unit toggle, JSON & CSV export buttons.

4. **App Root**:
   - `src/App.tsx`: Tab container, header with cosmic styling, responsive container with max-width mobile viewport frame (`max-w-md mx-auto min-h-screen`).

## Dependencies
- Milestone 1 (Types, Hydration Engine, Weather API)
- Milestone 2 (Audio Engine, Dual Persistence, Notification Engine, VoyagerChibi Component)

## Completion Criteria
1. Full TypeScript typing across all components and tabs without errors.
2. `npm test` passes all unit tests.
3. `npm run build` succeeds cleanly (`tsc && vite build`).
4. 100% free / 0% paywall: No VIP locked buttons, banners, or restricted companions.
5. Card-UI styling strictly adhered to: 2px solid `#1E293B`, `shadow-[0_4px_0_#1E293B]`, rounded corners.
