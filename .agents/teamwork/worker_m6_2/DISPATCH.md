## 2026-10-31T16:30:42Z
You are teamwork_worker instance 2 for Milestone 6 Iteration 2 of Voyager's Cosmic Hydration.
Your working directory is: D:\uống nước\.agents\teamwork\worker_m6_2
Project root: D:\uống nước
Original user request: D:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md
Scope document: D:\uống nước\.agents\teamwork\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

FORENSIC AUDIT FAILURE NOTICE:
Milestone 6 Iteration 1 received an INTEGRITY VIOLATION from teamwork_auditor because `tests/unit/challengerM6Stress2.test.tsx:95` failed:
`AssertionError: expected 'sleeping' to be 'drinking'`.
Quiet hours logging suppressed the 2.5s drinking animation.

Read the Iteration 2 Explorer handoff reports before implementing:
- D:\uống nước\.agents\teamwork\explorer_m6_it2_1\handoff.md
- D:\uống nước\.agents\teamwork\explorer_m6_it2_2\handoff.md
- D:\uống nước\.agents\teamwork\explorer_m6_it2_3\handoff.md

Your File Ownership (Exclusive):
- src/tabs/TodayTab.tsx
- src/components/CosmicWaterPlanet.tsx

Tasks:
1. In `src/tabs/TodayTab.tsx`:
   Update `resolvedChibiMood` to the partitioned hierarchy:
   ```tsx
   const resolvedChibiMood = useMemo<VoyagerExpression>(() => {
     if (propQuiet) {
       return isDrinking ? 'drinking' : 'sleeping';
     }
     if (consumedMl >= goalMl) {
       return 'happy';
     }
     if (isDrinking) {
       return 'drinking';
     }
     return 'idle';
   }, [propQuiet, isDrinking, consumedMl, goalMl]);
   ```
2. In `src/components/CosmicWaterPlanet.tsx`:
   - Update `resolvedMood` to check `voyagerExpression` first:
     ```tsx
     const resolvedMood = useMemo<VoyagerExpression>(() => {
       if (voyagerExpression) return voyagerExpression;
       if (isQuietNow) return 'sleeping';
       if (truePercent >= 100) return 'happy';
       return 'idle';
     }, [voyagerExpression, isQuietNow, truePercent]);
     ```
   - Add `Number.isFinite` checks to `visualPercent` and `truePercent`:
     ```tsx
     const visualPercent = useMemo(() => {
       if (!Number.isFinite(currentMl) || !Number.isFinite(goalMl) || goalMl <= 0) return 0;
       const pct = Math.round((currentMl / goalMl) * 100);
       return Math.min(100, Math.max(0, pct));
     }, [currentMl, goalMl]);

     const truePercent = useMemo(() => {
       if (!Number.isFinite(currentMl) || !Number.isFinite(goalMl) || goalMl <= 0) return 0;
       return Math.round((currentMl / goalMl) * 100);
     }, [currentMl, goalMl]);
     ```
3. Run tests and build:
   - Run `npx vitest run tests/unit/challengerM6Stress2.test.tsx` (confirm test 1.2 now passes).
   - Run `npm test` (verify 100% pass across all 18 test files / 375+ tests).
   - Run `npm run test:e2e` (verify 100% pass across all 196 E2E tests).
   - Run `npm run build` (verify 0 TypeScript/build errors).

Deliver your complete handoff report to `D:\uống nước\.agents\teamwork\worker_m6_2\handoff.md` and send a completion message.
