# Handoff Report: Milestone 6 Full System Integration, State Management, and Test Suite Impacts

- **Author**: Explorer Instance 3 (`explorer_m6_3`)
- **Recipient**: Parent Orchestrator / Sub-Orchestrator
- **Scope**: Milestone 6 — Full System Integration, Test Impacts, and Tab Compatibility Analysis
- **Status**: Completed

---

## 1. Observation

### 1.1 Baseline Test Suite Execution Status
Direct execution of existing verification commands in `D:\uống nước`:
1. `npm test` (`vitest run tests/unit`):
   - **Result**: 15 test files passed, 334/334 tests passed cleanly in 10.19s.
   - Command: `cd "D:\uống nước"; npm test`
2. `npm run test:e2e` (`node --experimental-strip-types tests/e2e/runner.ts`):
   - **Result**: 36 suites, 196/196 tests passed cleanly in 370ms across all 4 Tiers (Tier 1: 85, Tier 2: 85, Tier 3: 17, Tier 4: 9).
   - Command: `cd "D:\uống nước"; npm run test:e2e`
3. `npm run build` (`tsc && vite build`):
   - **Result**: Zero TypeScript diagnostic errors, built production bundle in 3.17s (`dist/assets/index-Cg2svvoX.js`: 275.97 kB).
   - Command: `cd "D:\uống nước"; npm run build`

---

### 1.2 Direct Test Dependencies on `WaveTank`
In the codebase, `WaveTank` is NOT merely a private sub-component of `TodayTab`; it is directly imported and tested as a public contract:
- **`D:\uống nước\tests\unit\milestone3Tabs.test.tsx`**:
  - Line 7: `import { WaveTank } from '../../src/components/WaveTank';`
  - Lines 64–86:
    ```tsx
    describe('WaveTank Component (WaveTank.tsx)', () => {
      it('renders container and star buoy marker', () => {
        render(<WaveTank currentMl={1000} goalMl={2000} />);
        const container = screen.getByTestId('wave-tank-container');
        expect(container).toBeDefined();
        expect(container.getAttribute('data-fill-percent')).toBe('50');

        const starBuoy = screen.getByTestId('star-buoy');
        expect(starBuoy).toBeDefined();
      });

      it('clamps visual fill percentage to 100% on over-achievement', () => {
        render(<WaveTank currentMl={3500} goalMl={2000} />);
        const container = screen.getByTestId('wave-tank-container');
        expect(container.getAttribute('data-fill-percent')).toBe('100');
      });

      it('handles zero goal without crashing or NaN', () => {
        render(<WaveTank currentMl={0} goalMl={0} />);
        const container = screen.getByTestId('wave-tank-container');
        expect(container.getAttribute('data-fill-percent')).toBe('0');
      });
    });
    ```
- **`D:\uống nước\tests\unit\challengerM3Stress1.test.ts`**:
  - Line 65: `import { WaveTank } from '../../src/components/WaveTank';`
  - Line 285 (rendered inside `TodayTab`):
    ```ts
    const tankContainer = screen.getByTestId('wave-tank-container');
    expect(tankContainer.getAttribute('data-fill-percent')).toBe('99');
    ```
  - Lines 394–416 (direct standalone `WaveTank` renders):
    ```ts
    render(React.createElement(WaveTank, { currentMl: 4500, goalMl: 2000 }));
    const tankContainer = screen.getByTestId('wave-tank-container');
    expect(tankContainer.getAttribute('data-fill-percent')).toBe('100');
    // ...
    render(React.createElement(WaveTank, { currentMl: 12500, goalMl: 2000 }));
    // ...
    render(React.createElement(WaveTank, { currentMl: 100000, goalMl: 1500 }));
    ```
  - Line 431 (rendered inside `TodayTab`):
    ```ts
    const tankContainer = screen.getByTestId('wave-tank-container');
    expect(tankContainer.getAttribute('data-fill-percent')).toBe('100');
    ```
  - Lines 449–456 (direct zero & negative goal tests):
    ```ts
    render(React.createElement(WaveTank, { currentMl: 500, goalMl: 0 }));
    let tankContainer = screen.getByTestId('wave-tank-container');
    expect(tankContainer.getAttribute('data-fill-percent')).toBe('0');

    render(React.createElement(WaveTank, { currentMl: -100, goalMl: 2000 }));
    tankContainer = screen.getByTestId('wave-tank-container');
    expect(tankContainer.getAttribute('data-fill-percent')).toBe('0');
    ```

---

### 1.3 Assertions on `VoyagerChibi` Expressions & Quiet Hours
1. **Sleeping expression and dark overlay**:
   - `D:\uống nước\src\components\VoyagerChibi.tsx`:
     Lines 217–229:
     ```tsx
     const SleepingOverlay: React.FC = () => (
       <div data-testid="expression-sleeping" className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
         {/* Cosmic Dream Bubble Shell */}
         <div className="absolute inset-1 rounded-2xl bg-indigo-950/60 backdrop-blur-[1px] border border-indigo-400/30 shadow-[inset_0_0_12px_rgba(129,140,248,0.4)]" />
         {/* Rising Constellation Zzz */}
         <div className="absolute top-2 right-2 flex flex-col items-end">
           <span className="text-[12px] font-black text-indigo-200 animate-pulse tracking-wider">Zzz</span>
           <span className="text-[9px] font-bold text-sky-300 -mt-1 opacity-75 animate-bounce">z</span>
         </div>
         {/* Closed Eye Moonlight Glow */}
         <div className="w-12 h-4 border-b-2 border-indigo-300/80 rounded-b-full opacity-80" />
       </div>
     );
     ```
   - Direct test assertions in `tests/unit/voyagerChibi.test.ts` (lines 106–111) and `tests/unit/m2ChallengerStress.test.ts` (lines 273–277):
     ```ts
     expect(screen.getByTestId('expression-sleeping')).toBeDefined();
     expect(screen.getByTestId('voyager-chibi-container').getAttribute('data-expression')).toBe('sleeping');
     expect(screen.getByText('Zzz')).toBeDefined();
     ```
   - No test in `tests/unit/` or `tests/e2e/` asserts `bg-indigo-950`, `backdrop-blur`, or the existence of a dark sheet.
2. **Transitioning to 100% goal and Chibi expression**:
   - `D:\uống nước\tests\unit\challengerM3Stress1.test.ts` lines 337–340:
     ```ts
     // 3. Chibi expression switch to 'happy' verified
     const chibiContainer = screen.getByTestId('voyager-chibi-container');
     expect(chibiContainer.getAttribute('data-expression')).toBe('happy');
     expect(screen.getByTestId('expression-happy')).toBeDefined();
     ```
   - And line 384–386:
     ```ts
     // Chibi remains happy
     const chibiContainer = screen.getByTestId('voyager-chibi-container');
     expect(chibiContainer.getAttribute('data-expression')).toBe('happy');
     ```
3. **Expression Enum & Sanitization**:
   - `D:\uống nước\src\components\VoyagerChibi.tsx`:
     Line 7: `export type VoyagerExpression = 'idle' | 'happy' | 'sleeping' | 'gentle' | 'strict';`
     Line 44: `const valid: readonly VoyagerExpression[] = ['idle', 'happy', 'sleeping', 'gentle', 'strict'];`
     Line 49: `export const VOYAGER_EXPRESSION_IMAGES: Record<VoyagerExpression, string> = { ... }`
   - In `tests/unit/voyagerChibi.test.ts` line 30:
     `const validStates: VoyagerExpression[] = ['idle', 'happy', 'sleeping', 'gentle', 'strict'];`
   - In `tests/unit/m2ChallengerStress.test.ts` line 225:
     `const canonicalExpressions: VoyagerExpression[] = ['idle', 'happy', 'sleeping', 'gentle', 'strict'];`

---

### 1.4 Other Tabs Cross-Inspection (`ReminderTab`, `JournalTab`, `StatsTab`, `ProfileTab`)
- **`src/tabs/ReminderTab.tsx`**:
  - Uses `VoyagerChibi` at line 201: `expression={isQuietNow ? 'sleeping' : isEnabled ? 'gentle' : 'idle'}`.
  - Quiet hours schedule (01:00 - 07:00) triggers `isQuietNow = true` which displays sleeping Chibi and speech bubble `'Suýt... Tinh cầu đang say giấc 🌙'`.
  - Does NOT import `WaveTank`.
- **`src/tabs/JournalTab.tsx`**:
  - Does NOT import `VoyagerChibi` or `WaveTank`.
  - Relies solely on `STORAGE_KEYS.DAILY_LOGS` and `currentStreak`.
- **`src/tabs/StatsTab.tsx`**:
  - Uses `VoyagerChibi` at line 296 with `size="sm"` and `expression="happy"`, perched atop the peak daily column.
  - Does NOT import `WaveTank`.
- **`src/tabs/ProfileTab.tsx`**:
  - Uses `VoyagerChibi` at line 174 with `size="lg"`, `expression="happy"`, and `customAvatar`.
  - Does NOT import `WaveTank`.
  - Contains export JSON/CSV functions that serialize `STORAGE_KEYS.DAILY_LOGS` and user profile.
- **`src/App.tsx`**:
  - Manages root state: `dailyLogs`, `streak`, `recordStreak`, `profile`, `settings`, `customAvatar`, `weather`.
  - Synchronizes to both `localStorage` and `@capacitor/preferences`.
  - When water is logged, increments volume, checks if crossing 100%, increments `streak`, triggers confetti/fanfare if enabled.

---

## 2. Logic Chain

### Step 2.1: Why Deleting `WaveTank.tsx` Would Break Existing Tests
1. **Observation 1.2**: `milestone3Tabs.test.tsx` (line 7) and `challengerM3Stress1.test.ts` (line 65) explicitly execute `import { WaveTank } from '../../src/components/WaveTank'`.
2. If `WaveTank.tsx` is deleted from the filesystem, `tsc` (in `npm run build`) and Vitest (in `npm test`) will fail immediately with `Cannot find module '../../src/components/WaveTank'`.
3. Furthermore, tests in `challengerM3Stress1.test.ts` (lines 394, 407, 413, 449, 454) directly instantiate `<WaveTank currentMl={...} goalMl={...} />` and assert that `data-fill-percent` is clamped at 100 for over-consumption and 0 for negative/zero goal.
4. **Deduction**: `WaveTank.tsx` MUST remain available in `src/components/` with its complete public interface (`WaveTankProps`, `WaveTank`) intact.

### Step 2.2: Why `TodayTab.tsx` Must Preserve `data-testid="wave-tank-container"`
1. **Observation 1.2**: In `challengerM3Stress1.test.ts` lines 285 and 431, `TodayTab` is rendered and tested via `screen.getByTestId('wave-tank-container')` to assert `data-fill-percent` is `99` and `100`.
2. When `CosmicWaterPlanet` replaces `WaveTank` inside `TodayTab.tsx`, if the rendered element does not expose `data-testid="wave-tank-container"`, lines 285 and 431 will fail with `TestingLibraryElementError: Unable to find an element by: [data-testid="wave-tank-container"]`.
3. **Deduction**: The `CosmicWaterPlanet` component (or its container in `TodayTab`) must provide backward-compatible data attributes:
   - Primary Milestone 6 identifier: `data-testid="cosmic-water-planet"`
   - Backward-compatibility identifier: `data-testid="wave-tank-container"` (e.g. as outer wrapper or container testid)
   - Fill percentage contract: `data-fill-percent={visualPercent}` where `visualPercent = Math.min(100, Math.max(0, Math.round((currentMl / goalMl) * 100)))`.

### Step 2.3: Safe Removal of Bedtime Dark Overlay
1. **Observation 1.3**: In `VoyagerChibi.tsx`, `SleepingOverlay` renders a dark indigo veil (`bg-indigo-950/60 backdrop-blur-[1px] border border-indigo-400/30`) over the character.
2. In `tests/unit/voyagerChibi.test.ts` and `m2ChallengerStress.test.ts`, tests strictly assert `data-testid="expression-sleeping"` and `screen.getByText('Zzz')`.
3. Removing `bg-indigo-950/60` and `backdrop-blur-[1px]` while retaining `<div data-testid="expression-sleeping">` and the floating `Zzz` text will:
   - Satisfy Milestone 6 R1 ("không có lớp overlay tối màu che khuất khuôn mặt/nhân vật").
   - Leave 100% of existing sleeping assertions valid and passing.

### Step 2.4: Priority Order of Chibi Expressions (Crucial Conflict Prevention)
1. **Observation 1.3**: When `TodayTab` crosses 100% of the daily goal (lines 337–340 of `challengerM3Stress1.test.ts`), the test asserts:
   `expect(chibiContainer.getAttribute('data-expression')).toBe('happy')`
2. If logging water triggers a transient `'drinking'` state that unconditionally overrides the mood, transitioning from 99% to 100% would result in `data-expression="drinking"` instead of `data-expression="happy"`, causing a regression in `challengerM3Stress1.test.ts` line 339!
3. Furthermore, during quiet hours, `isQuietNow` must keep the character in `'sleeping'` even if the user logs a midnight drink.
4. **Deduction**: In `TodayTab.tsx` (and `WaveTank` / `CosmicWaterPlanet`), the resolved expression MUST follow strict hierarchical priority:
   ```
   Priority 1: isQuietNow === true               => 'sleeping'
   Priority 2: explicit voyagerExpression prop   => voyagerExpression
   Priority 3: consumedMl >= goalMl (100% goal) => 'happy'
   Priority 4: isDrinking === true (transient)   => 'drinking'
   Priority 5: Default                           => 'idle'
   ```
   This guarantees that:
   - Quiet hours always shows sleeping Voyager soundly.
   - Crossing 100% triggers celebratory `happy` mood without test breakage.
   - Drinking below 100% triggers `drinking` animation.

### Step 2.5: TypeScript Compilation Integrity (`npm run build`)
1. **Observation 1.3**: `VOYAGER_EXPRESSION_IMAGES` is typed `Record<VoyagerExpression, string>`.
2. When `'drinking'` is added to `VoyagerExpression`:
   - `VOYAGER_EXPRESSION_IMAGES` must define a key for `drinking`: `drinking: '/assets/character/voyager_drinking.png'`.
   - `sanitizeExpression` must include `'drinking'` in its `valid` list.
   - `animationClass` switch statement must include case `'drinking'`.
3. With these additions, `tsc` will type-check with zero diagnostics.

### Step 2.6: Cross-Tab Isolation & State Integrity
1. **Observation 1.4**: All tabs communicate through props passed down from `App.tsx` and dual-layer persistence keys (`STORAGE_KEYS.USER_PROFILE`, `STORAGE_KEYS.SETTINGS`, `STORAGE_KEYS.DAILY_LOGS`, `STORAGE_KEYS.STREAK`, `'voyager_record_streak'`).
2. Milestone 6 changes are localized to:
   - `src/components/VoyagerChibi.tsx` (sleeping overlay clean-up, drinking expression, drinking asset).
   - `src/components/CosmicWaterPlanet.tsx` (new celestial planet visual component).
   - `src/tabs/TodayTab.tsx` (rendering CosmicWaterPlanet, wiring transient drinking state).
   - `src/components/WaveTank.tsx` (kept for backward compatibility, optionally delegating or coexisting).
3. No schema changes are made to `STORAGE_KEYS`, `UserProfile`, `AppSettings`, or `DailyLogsMap`.
4. Therefore, `ReminderTab`, `JournalTab`, `StatsTab`, `ProfileTab`, local notification scheduling, streak accumulation, and JSON/CSV data export remain 100% intact and unaffected.

---

## 3. Caveats

1. **Asset Generation Prerequisite**:
   - The implementer must ensure the new image assets (`voyager_drinking.png` and updated `voyager_sleeping.png`) are placed in `public/assets/character/` before running production builds if asset bundling checks are enabled.
   - In `resolveAvatarSrc`, ensure that if `voyager_drinking.png` fails to load, it falls back gracefully to `/assets/character/voyager_base.png`.
2. **Visual vs Numerical Clamping**:
   - Tests in `challengerM3Stress1.test.ts` (lines 430–445) verify that while `data-fill-percent` is clamped to 100%, the numerical readout (`data-testid="consumed-volume"`) must display the TRUE un-clamped volume (e.g. `12,5 L` on a 2,0 L goal). `CosmicWaterPlanet` must adhere strictly to this distinction.
3. **Transient Drinking Duration**:
   - When using `setTimeout` for transient `isDrinking` state in `TodayTab.tsx`, use a timeout between 2000ms and 3000ms (recommended: 2500ms). Ensure unmount cleanup (`clearTimeout`) is implemented to prevent memory leaks or act warnings in tests.

---

## 4. Conclusion & Actionable Implementation Plan

### 4.1 Component Architecture Recommendations

#### 1. `src/components/VoyagerChibi.tsx`:
```typescript
export type VoyagerExpression = 'idle' | 'happy' | 'sleeping' | 'gentle' | 'strict' | 'drinking';

export function sanitizeExpression(expr?: string | null): VoyagerExpression {
  const valid: readonly VoyagerExpression[] = [
    'idle', 'happy', 'sleeping', 'gentle', 'strict', 'drinking'
  ];
  if (!expr) return 'idle';
  return (valid as readonly string[]).includes(expr) ? (expr as VoyagerExpression) : 'idle';
}

export const VOYAGER_EXPRESSION_IMAGES: Record<VoyagerExpression, string> = {
  idle: '/assets/character/voyager_base.png',
  happy: '/assets/character/voyager_happy.png',
  sleeping: '/assets/character/voyager_sleeping.png',
  gentle: '/assets/character/voyager_gentle.png',
  strict: '/assets/character/voyager_strict.png',
  drinking: '/assets/character/voyager_drinking.png',
};

// SleepingOverlay: Remove dark night veil; keep testable elements
const SleepingOverlay: React.FC = () => (
  <div data-testid="expression-sleeping" className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
    {/* Rising Constellation Zzz */}
    <div className="absolute top-2 right-2 flex flex-col items-end">
      <span className="text-[12px] font-black text-indigo-200 animate-pulse tracking-wider">Zzz</span>
      <span className="text-[9px] font-bold text-sky-300 -mt-1 opacity-75 animate-bounce">z</span>
    </div>
    {/* Gentle starlight sparkles */}
    <span className="absolute bottom-2 left-2 text-sky-200 text-xs animate-pulse opacity-70">✦</span>
  </div>
);

// DrinkingOverlay: Cute water sips and cosmic bubbles
const DrinkingOverlay: React.FC = () => (
  <div data-testid="expression-drinking" className="absolute inset-0 pointer-events-none z-20">
    <span className="absolute top-1 left-2 text-sky-300 text-sm animate-bounce">💧</span>
    <span className="absolute top-2 right-3 text-cyan-200 text-xs animate-ping">✦</span>
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-sky-400/40 rounded-full blur-[1px] animate-pulse" />
  </div>
);
```

#### 2. `src/components/CosmicWaterPlanet.tsx`:
- Export `CosmicWaterPlanetProps` with compatible prop signatures (`currentMl`, `goalMl`, `customImageUrl`, `voyagerExpression`, `isQuietNow`, `onChibiClick`, `showSpeechBubble`, `speechText`, `className`).
- Container DOM attributes:
  ```tsx
  <div
    data-testid="wave-tank-container"
    data-component="cosmic-water-planet"
    data-fill-percent={visualPercent}
    className={`relative w-full h-72 sm:h-80 rounded-3xl border-2 border-[#1E293B] shadow-[0_4px_0_#1E293B] bg-gradient-to-b from-[#070B14] via-[#0D1527] to-[#050811] overflow-hidden select-none ${className}`}
  >
    {/* Inner Planet Element */}
    <div data-testid="cosmic-water-planet" className="relative w-full h-full flex items-center justify-center">
      {/* 100% Star Buoy / Target ring */}
      <div data-testid="star-buoy" className="absolute top-4 right-4 ...">
        <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
      </div>

      {/* Spherical Water Planet with 0% to 100% Fill Mask */}
      {/* ... */}

      {/* Floating Voyager Chibi */}
      <div data-testid="floating-chibi-anchor" className="absolute z-30 ...">
        <VoyagerChibi
          expression={resolvedMood}
          size="md"
          customImageUrl={customImageUrl}
          showAura={truePercent >= 100}
          showSpeechBubble={showSpeechBubble}
          speechText={speechText}
          interactive={true}
          onClick={handleChibiTap}
        />
      </div>
    </div>
  </div>
  ```

#### 3. `src/components/WaveTank.tsx`:
- Preserve `WaveTank.tsx` in `src/components/` so all existing imports and tests run without any file missing errors. It can optionally wrap `CosmicWaterPlanet` or remain standalone.

#### 4. `src/tabs/TodayTab.tsx`:
- Import and render `CosmicWaterPlanet`:
  ```tsx
  const [isDrinking, setIsDrinking] = useState(false);
  const drinkingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // In logIntake:
  if (prevConsumed < goalMl && nextConsumed >= goalMl) {
    triggerCelebration();
    setSpeechText('Thuyền trưởng thật tuyệt vời! Mục tiêu đã hoàn thành! 🎉');
  } else {
    setSpeechText(`+${amount}ml đã được ghi nhận vào nhật ký ngân hà! ✨`);
    setIsDrinking(true);
    if (drinkingTimerRef.current) clearTimeout(drinkingTimerRef.current);
    drinkingTimerRef.current = setTimeout(() => {
      setIsDrinking(false);
    }, 2500);
  }

  // Resolved mood in TodayTab:
  const resolvedChibiMood = useMemo<VoyagerExpression>(() => {
    if (propQuiet) return 'sleeping';
    if (consumedMl >= goalMl) return 'happy';
    if (isDrinking) return 'drinking';
    return 'idle';
  }, [propQuiet, consumedMl, goalMl, isDrinking]);
  ```

---

## 5. Verification Method

To verify full system integration, state management, and test suite health after Milestone 6 implementation:

### 5.1 Project Verification Commands
Run the following commands in sequence from the project root (`d:\uống nước`):

```bash
# 1. Run all Unit Tests (Must pass 334+ tests, 0 failures)
npm test

# 2. Run all End-to-End Tests across Tiers 1-4 (Must pass 196/196 tests, 0 failures)
npm run test:e2e

# 3. Run TypeScript Typecheck and Vite Production Build (Must pass with 0 errors)
npm run build
```

### 5.2 Specific Test Assertions to Inspect
1. **`tests/unit/challengerM3Stress1.test.ts`**:
   - Challenge 1: 100 cycles x 4 quick drink buttons = 400 clicks, 95,000ml volume accumulation -> PASS.
   - Challenge 2: 99% -> 100% goal crossing triggers `happy` expression, confetti, and fanfare -> PASS.
   - Challenge 3: Over-consumption (>200% and >10,000ml) visual clamping at 100% while text readout shows true volume -> PASS.
2. **`tests/unit/milestone3Tabs.test.tsx`**:
   - `WaveTank` standalone tests for 50% fill, 100% clamp, and 0% goal -> PASS.
   - `TodayTab` quick drink +250ml default option and deficit prompt -> PASS.
   - `ReminderTab` quiet hours (01:00 - 07:00) window display -> PASS.
3. **`tests/unit/voyagerChibi.test.ts` & `m2ChallengerStress.test.ts`**:
   - `expression-sleeping` and text `'Zzz'` present -> PASS.
   - All 5 canonical expressions + `drinking` sanitized properly -> PASS.

### 5.3 Invalidation Conditions
The implementation will be invalidated if:
1. `npm test` fails with any missing element error on `wave-tank-container` or `expression-sleeping`.
2. `npm test` fails because `drinking` mood overrides `happy` when reaching 100% goal.
3. `npm run build` fails with TypeScript type mismatch in `VOYAGER_EXPRESSION_IMAGES` or `VoyagerExpression`.
4. Dark overlay veil is still present over Voyager Chibi during quiet hours/bedtime.
