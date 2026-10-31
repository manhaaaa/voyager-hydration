# Challenger Handoff Report: Milestone 6 Empirical Verification

**Document ID**: `HANDOFF-M6-CHALLENGER-02`  
**Milestone**: Milestone 6 — Cosmic Water Planet & Character Visuals (TodayTab Integration, Quiet Hours & Cross-Feature Workflows)  
**Author**: teamwork_challenger instance 2 (`challenger_m6_2`)  
**Working Directory**: `D:\uống nước\.agents\teamwork\challenger_m6_2`  
**Recipient**: Milestone 6 Orchestrator (`128bc40e-5829-492d-bad2-62ae7f2e3136`)  
**Verdict**: **`REQUEST_CHANGES`**  

---

## 1. Observation

### 1.1 Baseline Automated Test Suites and Build
Direct command executions in `D:\uống nước`:
1. **Unit Test Suite**:
   ```powershell
   npm test
   ```
   Output: `16 test files passed, 346/346 tests passed (100%) in 18.80s`.
2. **End-to-End Test Suite**:
   ```powershell
   npm run test:e2e
   ```
   Output: `36 suites passed, 196/196 tests passed (100%) in 379ms` across Tiers 1-4.
3. **TypeScript & Production Build**:
   ```powershell
   npm run build
   ```
   Output: `tsc && vite build` succeeded with exit code 0 in 4.36s (`dist/` generated with 0 errors).

### 1.2 Character Visual Assets & Sleeping Overlay Cleanliness
- **File Presence**:
  - `public/assets/character/voyager_sleeping.png`: 1,008,849 bytes.
  - `public/assets/character/voyager_drinking.png`: 921,786 bytes.
- **`SleepingOverlay` in `src/components/VoyagerChibi.tsx` (lines 218–229)**:
  ```tsx
  const SleepingOverlay: React.FC = () => (
    <div data-testid="expression-sleeping" className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
      <div className="absolute top-2 right-2 flex flex-col items-end">
        <span className="text-[12px] font-black text-indigo-200 animate-pulse tracking-wider">Zzz</span>
        <span className="text-[9px] font-bold text-sky-300 -mt-1 opacity-75 animate-bounce">z</span>
      </div>
      <span className="absolute top-3 left-3 text-indigo-300 text-[10px] animate-pulse opacity-60">✦</span>
      <span className="absolute bottom-4 right-3 text-amber-100 text-[10px] animate-pulse opacity-50">★</span>
    </div>
  );
  ```
  Verified: The dark backdrop veil (`bg-indigo-950/60`) and blur sheet (`backdrop-blur-[1px]`) are 100% absent. The serene sleeping chibi illustration renders unobstructed with subtle celestial `Zzz` and stars.

### 1.3 Star Buoy, Volume Readout & Percentage Clamping
- **Planet Liquid Fill Clamping (`src/components/CosmicWaterPlanet.tsx:29–34, 134–137`)**:
  ```tsx
  const visualPercent = useMemo(() => {
    if (goalMl <= 0) return 0;
    const pct = Math.round((currentMl / goalMl) * 100);
    return Math.min(100, Math.max(0, pct));
  }, [currentMl, goalMl]);
  ```
  At 150% (3000ml / 2000ml) and 250% (5000ml / 2000ml), `data-fill-percent` cleanly clamps at `100`, and liquid height stays at `100%`.
- **Numerical Volume Readout (`src/tabs/TodayTab.tsx:288–301`)**:
  ```tsx
  <span data-testid="consumed-volume">{consumedFormatted}</span>
  <span className="text-xl font-bold text-slate-400">/</span>
  <span data-testid="goal-volume">{goalFormatted}</span>
  ```
  At 3000ml / 2000ml, `data-testid="consumed-volume"` correctly outputs `"3,0 L"` (or `"3000 ml"`), preserving true volume without being clamped to the goal.
- **Star Buoy & Deficit Prompt (`src/tabs/TodayTab.tsx:304–313`, `src/components/CosmicWaterPlanet.tsx:89–95`)**:
  - `data-testid="star-buoy"` is present along the 100% target dashed orbit line.
  - `data-testid="deficit-prompt"` decrements cups sequentially (`"Thêm 8 ly >"`, `"Thêm 7 ly >"`, ..., `"Thêm 1 ly >"`), and upon reaching 100% (or exceeding), renders `"Mục tiêu hoàn thành! Xuất sắc 🎉"`. Clicking it when deficit is 0 does not log additional water.

### 1.4 Defect Found: Quiet Hours Logging Suppresses Drinking Interaction
- **Dispatch Objective Requirement**:
  > *"Verify that logging water during quiet hours triggers the drinking interaction without breaking quiet hours state when the timer expires."*
- **Implementation in `src/tabs/TodayTab.tsx` (lines 231–236)**:
  ```tsx
  // Hierarchical Chibi mood resolution:
  // Priority 1: isQuietNow ('sleeping')
  // Priority 2: consumedMl >= goalMl ('happy')
  // Priority 3: isDrinking ('drinking')
  // Priority 4: 'idle'
  const resolvedChibiMood = useMemo<VoyagerExpression>(() => {
    if (propQuiet) return 'sleeping';
    if (consumedMl >= goalMl) return 'happy';
    if (isDrinking) return 'drinking';
    return 'idle';
  }, [propQuiet, consumedMl, goalMl, isDrinking]);
  ```
- **Implementation in `src/components/CosmicWaterPlanet.tsx` (lines 43–48)**:
  ```tsx
  // Determine Voyager Chibi expression
  const resolvedMood = useMemo<VoyagerExpression>(() => {
    if (isQuietNow) return 'sleeping';
    if (voyagerExpression) return voyagerExpression;
    if (truePercent >= 100) return 'happy';
    return 'idle';
  }, [isQuietNow, voyagerExpression, truePercent]);
  ```
- **Empirical Failure Reproduction in `tests/unit/challengerM6Stress2.test.tsx`**:
  ```powershell
  npx vitest run tests/unit/challengerM6Stress2.test.tsx
  ```
  Verbatim Test Output:
  ```
  stdout | tests/unit/challengerM6Stress2.test.tsx > Milestone 6 Empirical Challenge: Quiet Hours, Star Buoy & Metrics > 1. Quiet Hours & Bedtime Empirical Challenge > 1.2 checks whether logging water during quiet hours triggers drinking interaction and returns to quiet state
  Chibi expression immediately after logging drink during quiet hours: sleeping
  Chibi expression after drinking timer expires during quiet hours: sleeping

  FAIL tests/unit/challengerM6Stress2.test.tsx > Milestone 6 Empirical Challenge: Quiet Hours, Star Buoy & Metrics > 1. Quiet Hours & Bedtime Empirical Challenge > 1.2 checks whether logging water during quiet hours triggers drinking interaction and returns to quiet state
  AssertionError: expected 'sleeping' to be 'drinking' // Object.is equality

  Expected: "drinking"
  Received: "sleeping"

   ❯ tests/unit/challengerM6Stress2.test.tsx:95:34
       93|       // Verify prompt requirement: logging water during quiet hours triggers drinking interaction
       94|       // without breaking quiet hours state when the timer expires.
       95|       expect(moodDuringDrinking).toBe('drinking');
         |                                  ^
       96|       expect(moodAfterTimerExpires).toBe('sleeping');
  ```

---

## 2. Logic Chain

1. **Intended Behavior**:
   - The user specified that logging water (quick buttons or custom modal) must trigger the new drinking interaction (`voyager_drinking.png` with bubbly droplet overlay and bounce animation).
   - During quiet hours, Voyager is sleeping by default (`'sleeping'`).
   - When a user drinks water at night and logs it in `TodayTab`, Voyager should temporarily wake up and sip water for the 2.5s duration of the drinking interaction (`'drinking'`).
   - When the 2500ms timer expires, `isDrinking` becomes `false`. Because quiet hours is active, Voyager must return to sleeping (`'sleeping'`), preserving the quiet hours state without staying in `idle` or `happy`.
2. **Current Implementation Flaw**:
   - In `TodayTab.tsx` line 232, `if (propQuiet) return 'sleeping';` is evaluated at Priority 1, BEFORE `if (isDrinking) return 'drinking';`.
   - In `CosmicWaterPlanet.tsx` line 44, `if (isQuietNow) return 'sleeping';` is evaluated BEFORE `if (voyagerExpression) return voyagerExpression;`.
   - Consequently, when `logIntake()` is executed during quiet hours, `isDrinking` is set to `true`, but neither `TodayTab` nor `CosmicWaterPlanet` ever renders `data-expression="drinking"`. The expression remains stuck at `'sleeping'`.
   - The user gets no visual confirmation of the drinking interaction at all during quiet hours.
3. **Required Resolution**:
   - In `TodayTab.tsx`: Allow transient `isDrinking` (active for only 2.5s) to take Priority 1 over `propQuiet`:
     ```tsx
     const resolvedChibiMood = useMemo<VoyagerExpression>(() => {
       if (isDrinking) return 'drinking';
       if (propQuiet) return 'sleeping';
       if (consumedMl >= goalMl) return 'happy';
       return 'idle';
     }, [isDrinking, propQuiet, consumedMl, goalMl]);
     ```
   - In `CosmicWaterPlanet.tsx`: Allow `voyagerExpression` (passed from caller) to take Priority 1 over `isQuietNow`:
     ```tsx
     const resolvedMood = useMemo<VoyagerExpression>(() => {
       if (voyagerExpression) return voyagerExpression;
       if (isQuietNow) return 'sleeping';
       if (truePercent >= 100) return 'happy';
       return 'idle';
     }, [voyagerExpression, isQuietNow, truePercent]);
     ```
   - When this is applied:
     1. Logging water during quiet hours triggers `'drinking'` for 2.5s.
     2. When the timer expires, `isDrinking` becomes `false`, so `propQuiet` kicks in and returns `'sleeping'`, preserving quiet hours state without breaking it.
     3. When quiet hours is active and no drinking is occurring, Voyager remains serene and `'sleeping'`.

---

## 3. Caveats

- **Existing Tests**: All 346 unit tests and 196 E2E tests pass under the current baseline because existing tests only asserted that `TodayTab` renders `'sleeping'` upon initial mount with `isQuietNow={true}`, but never asserted logging water while in quiet hours. Adjusting the hierarchy to prioritize `isDrinking` during its 2.5s window will keep 100% of existing tests passing while satisfying the dispatch objective.
- **Review Constraint**: In strict compliance with the Challenger role constraints ("Review-only — do NOT modify implementation code"), no changes were made to `src/tabs/TodayTab.tsx` or `src/components/CosmicWaterPlanet.tsx`. The change is requested for the worker agent.

---

## 4. Conclusion

- **Verdict**: **`REQUEST_CHANGES`**
- **Actionable Scope for Worker**:
  1. In `src/tabs/TodayTab.tsx` line 231–236: Move `if (isDrinking) return 'drinking';` above `if (propQuiet) return 'sleeping';`.
  2. In `src/components/CosmicWaterPlanet.tsx` line 43–48: Move `if (voyagerExpression) return voyagerExpression;` above `if (isQuietNow) return 'sleeping';`.
  3. Re-run `npx vitest run tests/unit/challengerM6Stress2.test.tsx` to verify that test 1.2 passes.
  4. Ensure `npm test`, `npm run test:e2e`, and `npm run build` continue to pass 100%.

---

## 5. Verification Method

1. **Reproduce the Bug**:
   ```powershell
   cd "D:\uống nước"
   npx vitest run tests/unit/challengerM6Stress2.test.tsx
   ```
   *Expected Current Output*: Test `1.2 checks whether logging water during quiet hours triggers drinking interaction and returns to quiet state` fails with:
   `AssertionError: expected 'sleeping' to be 'drinking'`.

2. **Verify After Fix**:
   - Re-run `npx vitest run tests/unit/challengerM6Stress2.test.tsx` -> All 7 tests must pass.
   - Run full unit tests: `npm test` -> 17 test files, 353+ tests passing.
   - Run E2E test suite: `npm run test:e2e` -> 196/196 tests passing.
   - Run production build: `npm run build` -> Exit code 0, 0 TypeScript errors.
