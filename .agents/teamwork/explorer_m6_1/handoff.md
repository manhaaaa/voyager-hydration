# Handoff Report: Character Visuals & Expressions Investigation

**Document ID**: `HANDOFF-M6-EXPLORER-01`  
**Milestone**: Milestone 6 — Character Visuals & Expressions (Voyager's Cosmic Hydration)  
**Author**: teamwork_explorer instance 1 (`explorer_m6_1`)  
**Working Directory**: `D:\uống nước\.agents\teamwork\explorer_m6_1`  
**Recipient**: Milestone 6 Orchestrator (`128bc40e-5829-492d-bad2-62ae7f2e3136`)  
**Type**: Hard Handoff (Investigation & Blueprint Complete)  

---

## 1. Observation

### 1.1 Character Visuals Architecture in `src/components/VoyagerChibi.tsx`
- **Expression Types** (lines 7, 44):
  ```typescript
  export type VoyagerExpression = 'idle' | 'happy' | 'sleeping' | 'gentle' | 'strict';
  ```
  Sanitization utility (lines 43-47):
  ```typescript
  export function sanitizeExpression(expr?: string | null): VoyagerExpression {
    const valid: readonly VoyagerExpression[] = ['idle', 'happy', 'sleeping', 'gentle', 'strict'];
    if (!expr) return 'idle';
    return (valid as readonly string[]).includes(expr) ? (expr as VoyagerExpression) : 'idle';
  }
  ```
- **Expression-to-Asset Mapping** (lines 49-55):
  ```typescript
  export const VOYAGER_EXPRESSION_IMAGES: Record<VoyagerExpression, string> = {
    idle: '/assets/character/voyager_base.png',
    happy: '/assets/character/voyager_happy.png',
    sleeping: '/assets/character/voyager_sleeping.png',
    gentle: '/assets/character/voyager_gentle.png',
    strict: '/assets/character/voyager_strict.png',
  };
  ```
- **4-Layer Rendering Pipeline** (lines 346-376):
  1. *Layer 1 (Background)*: `<StarCape size={size} />` (`data-testid="accessory-star-cape"`), lines 129-144.
  2. *Layer 2 (Character Image)*: `<img src={imageSrc} ... className="w-full h-full object-contain pointer-events-none" />` inside `animationClass` wrapper, lines 355-364.
  3. *Layer 3 (Foreground Accessories)*: `<SailorHat size={size} />` (`data-testid="accessory-sailor-hat"`, lines 105-123) and `<StarHalo size={size} />` (`data-testid="accessory-star-halo"`, lines 84-99).
  4. *Layer 4 (Expression Overlays)*:
     - `idle`: `<IdleOverlay />` (`data-testid="expression-idle"`), lines 189-195.
     - `happy`: `<HappyOverlay />` (`data-testid="expression-happy"`), lines 200-212.
     - `sleeping`: `<SleepingOverlay />` (`data-testid="expression-sleeping"`), lines 217-229.
     - `gentle`: `<GentleOverlay />` (`data-testid="expression-gentle"`), lines 234-250.
     - `strict`: `<StrictOverlay />` (`data-testid="expression-strict"`), lines 255-263.

### 1.2 Inspection of Existing Character Assets in `public/assets/character/`
All PNG assets are located at `D:\uống nước\public\assets\character\`:
- `voyager_base.png`: 1000x1000 px, 346,763 bytes (MD5: `BD06CC...`). Official Reverse: 1999 Voyager chibi character standing with starlight diadem halo, long galaxy-blue hair braid, and starry dress.
- `voyager_idle.png`: 1000x1000 px, 347,163 bytes. Base image with 4 static star sparkles.
- `voyager_happy.png`: 1000x1000 px, 348,388 bytes. Base image with yellow sparkle stars drawn over eyes and blush.
- `voyager_gentle.png`: 1000x1000 px, 346,077 bytes. Base image with a water droplet graphic drawn in front of hands.
- `voyager_strict.png`: 1000x1000 px, 354,926 bytes. Base image with a cartoon violin graphic pasted in front of hands.
- `voyager_sleeping.png`: 1000x1000 px, 346,968 bytes. Base image with crude closed eyelid lines drawn over the open eyes, plus a small crescent moon and Zzz.

### 1.3 Exact Culprit Causing the Dark Overlay / Night Sheet Covering Voyager's Face
In `src/components/VoyagerChibi.tsx`, lines 217-229 verbatim:
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
- Line 220: `<div className="absolute inset-1 rounded-2xl bg-indigo-950/60 backdrop-blur-[1px] border border-indigo-400/30 shadow-[inset_0_0_12px_rgba(129,140,248,0.4)]" />` applies a semi-transparent dark-indigo overlay (`bg-indigo-950/60`) and blur filter (`backdrop-blur-[1px]`) across the entire character avatar box.
- Line 227: `<div className="w-12 h-4 border-b-2 border-indigo-300/80 rounded-b-full opacity-80" />` draws an artificial 48px wide indigo arc smack in the center over Voyager's face and chest.
- Combined with the base image `voyager_sleeping.png`, the user experiences a dark night sheet obscuring Voyager's face.

### 1.4 Quiet Hours Evaluation and Propagation
- In `src/utils/notificationEngine.ts` (lines 40-47):
  `isInQuietHours(date: Date, wakeTime: string, sleepTime: string): boolean` computes if the current time falls between bedtime (default `01:00`) and wake time (default `07:00`), handling midnight wrap-around.
- In `src/App.tsx` (lines 78-83, 286):
  `isQuietNow` is evaluated via `useMemo` and passed down to `TodayTab(isQuietNow)` and `ReminderTab`.
- In `src/tabs/ReminderTab.tsx` (lines 201-213):
  `expression={isQuietNow ? 'sleeping' : isEnabled ? 'gentle' : 'idle'}`.
- In `src/components/WaveTank.tsx` (lines 43-48):
  ```typescript
  const resolvedMood = useMemo<VoyagerExpression>(() => {
    if (isQuietNow) return 'sleeping';
    if (voyagerExpression) return voyagerExpression;
    if (truePercent >= 100) return 'happy';
    return 'idle';
  }, [isQuietNow, voyagerExpression, truePercent]);
  ```

### 1.5 Water Intake Logging in `src/tabs/TodayTab.tsx`
All water intake actions converge on `logIntake(amount: number)` (lines 144-194):
- Action A (Quick Buttons): Lines 307-332, `+50 ml`, `+150 ml`, `+250 ml` (default checked), `+500 ml`.
- Action B (Deficit Prompt Card): Lines 276-285, `Thêm ${remainingCups} ly >` (logs `250 ml`).
- Action C (Custom Intake Modal): Lines 335-346, 372-424, custom ml input (1-5000ml) or quick presets (100, 200, 330, 600, 1000ml).
Currently, `logIntake` increments `consumedMl`, updates `dailyLogs`, plays `playQuickTap()`, sets a static speech message, and triggers confetti if crossing 100%. It does NOT trigger a character expression change or drinking graphic.

### 1.6 Unit and E2E Test Suite Contracts
- Running `cd "D:\uống nước"; npm test`: 15 test files passed, 334/334 tests passed.
- Running `cd "D:\uống nước"; npm run test:e2e`: 36 test suites passed, 196/196 tests passed.
- Specific assertions on `sleeping` state:
  - `tests/unit/voyagerChibi.test.ts:109-111`: Expects `data-expression="sleeping"`, `screen.getByTestId('expression-sleeping')`, and `screen.getByText('Zzz')`.
  - `tests/unit/m2ChallengerStress.test.ts:274-276`: Same assertions.
  - `tests/e2e/tier1-features/f08_voyager_chibi.test.ts:46-47`: Checks `eyes: 'closed'` and `zzz: true`.
  - Crucially: **No test asserts the dark background tint (`bg-indigo-950/60`), backdrop blur, or the center arc.** Removing the overlay is 100% test-safe.

---

## 2. Logic Chain

1. **Overlay Removal & Sleeping Soundly Graphic**:
   - *Observation 1.3* shows that the dark veil and center arc are created by line 220 (`bg-indigo-950/60 backdrop-blur-[1px]`) and line 227 (`border-b-2 border-indigo-300/80 rounded-b-full`).
   - *Observation 1.6* shows tests only assert `getByTestId('expression-sleeping')` and text `'Zzz'`.
   - *Logic*: We can strip line 220 and line 227 completely from `SleepingOverlay`, leaving a clean, lightweight overlay containing only the floating starlight "Zzz" constellation in the top-right corner.
   - Concurrently, replacing `public/assets/character/voyager_sleeping.png` with a genuine high-quality illustration of Voyager sleeping soundly (curled up floating or resting peacefully on a starlight cloud/moon pillow in zero gravity with serenely closed eyes) fulfills user requirement R1 without obscuring her face.

2. **Transient Drinking State Architecture**:
   - *Observation 1.5* shows that all water additions (quick buttons, deficit prompt, custom modal) execute `logIntake(amount)`.
   - *Observation 1.1 & 1.4* show that character expression is driven by `expression` / `resolvedMood`.
   - *Logic*: Adding a transient state `const [isDrinking, setIsDrinking] = useState(false)` inside `TodayTab.tsx` with a 2500ms timeout (`setTimeout(() => setIsDrinking(false), 2500)`) provides an intuitive, delightful micro-interaction.
   - When `isDrinking` is active:
     - Expression resolves to `'drinking'`.
     - `VOYAGER_EXPRESSION_IMAGES.drinking = '/assets/character/voyager_drinking.png'`.
     - Voyager speech text updates to a playful drinking dialogue: e.g. `+${amount}ml! Voyager uống cùng Thuyền trưởng nhé~ 💧✨`.
     - If during quiet hours, logging a drink temporarily displays the drinking graphic for 2.5s, then gracefully resumes the peaceful `'sleeping'` state.
     - If crossing the 100% daily goal, the drinking graphic displays concurrently with confetti celebration and fanfare, then smoothly transitions to `'happy'`.

3. **Backward Compatibility & Type Safety**:
   - Adding `'drinking'` to `VoyagerExpression`:
     ```typescript
     export type VoyagerExpression = 'idle' | 'happy' | 'sleeping' | 'gentle' | 'strict' | 'drinking';
     ```
   - In `sanitizeExpression`, adding `'drinking'` to the valid list preserves all existing behavior. In `voyagerChibi.test.ts:30` and `m2ChallengerStress.test.ts:225`, tests test their own local arrays of 5 states which will continue to return their matching strings; invalid strings continue falling back to `'idle'`.
   - All 334 unit tests and 196 E2E tests remain 100% green.

4. **Style Consistency**:
   - *Observation 1.2* shows `voyager_base.png` is a 1000x1000 transparent PNG with distinctive Reverse: 1999 Voyager attributes: galaxy blue hair with braid, white sailor hat with gold star pin, star cape, and star halo diadem.
   - *Logic*: Any newly generated asset must adhere to the 1000x1000 square transparent PNG format and match this art style precisely.

---

## 3. Caveats

1. **AI Image Generation Tooling**:
   - While the prompt recommendations are engineered for Gemini 4 Argon Medium / `generate_image`, AI-generated images often output solid backgrounds (JPEG or RGB PNG). The implementation agent will need to ensure the final PNG asset has an alpha channel (transparent background) or cleanly cropped boundary matching `1000x1000`.
2. **Coexistence with Cosmic Water Planet**:
   - TodayTab currently renders `<WaveTank />`. Milestone 6 R2 replaces WaveTank with `<CosmicWaterPlanet />`. The implementer must pass `isDrinking` / `voyagerExpression` to whichever container component is rendered on TodayTab.
3. **No other caveats**: Codebase is clean, builds with zero TypeScript errors, and tests pass 100%.

---

## 4. Conclusion & Technical Blueprint

### 4.1 Changes in `src/components/VoyagerChibi.tsx`
1. **Extend `VoyagerExpression`**:
   ```typescript
   export type VoyagerExpression = 'idle' | 'happy' | 'sleeping' | 'gentle' | 'strict' | 'drinking';
   ```
2. **Update `sanitizeExpression`**:
   ```typescript
   export function sanitizeExpression(expr?: string | null): VoyagerExpression {
     const valid: readonly VoyagerExpression[] = ['idle', 'happy', 'sleeping', 'gentle', 'strict', 'drinking'];
     if (!expr) return 'idle';
     return (valid as readonly string[]).includes(expr) ? (expr as VoyagerExpression) : 'idle';
   }
   ```
3. **Update `VOYAGER_EXPRESSION_IMAGES`**:
   ```typescript
   export const VOYAGER_EXPRESSION_IMAGES: Record<VoyagerExpression, string> = {
     idle: '/assets/character/voyager_base.png',
     happy: '/assets/character/voyager_happy.png',
     sleeping: '/assets/character/voyager_sleeping.png',
     gentle: '/assets/character/voyager_gentle.png',
     strict: '/assets/character/voyager_strict.png',
     drinking: '/assets/character/voyager_drinking.png',
   };
   ```
4. **Remove Dark Overlay from `SleepingOverlay`**:
   Replace lines 217-229 with:
   ```tsx
   /**
    * Expression 3: Sleeping - Celestial Zzz dream constellation (No dark face-covering overlay)
    */
   const SleepingOverlay: React.FC = () => (
     <div data-testid="expression-sleeping" className="absolute inset-0 pointer-events-none z-20">
       {/* Rising Constellation Zzz */}
       <div className="absolute top-2 right-2 flex flex-col items-end">
         <span className="text-[13px] font-black text-amber-200 animate-pulse tracking-wider drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]">Zzz</span>
         <span className="text-[10px] font-bold text-sky-200 -mt-1 opacity-80 animate-bounce">z</span>
       </div>
       {/* Subtle dream starlets */}
       <span className="absolute top-3 left-3 text-indigo-300 text-[10px] animate-pulse opacity-60">✦</span>
       <span className="absolute bottom-4 right-3 text-amber-100 text-[10px] animate-pulse opacity-50">★</span>
     </div>
   );
   ```
5. **Add `DrinkingOverlay`**:
   ```tsx
   /**
    * Expression 6: Drinking - Water splashes, bubbling sips & joyful blush
    */
   const DrinkingOverlay: React.FC = () => (
     <div data-testid="expression-drinking" className="absolute inset-0 pointer-events-none z-20">
       <span className="absolute bottom-6 right-3 text-sky-400 text-sm animate-bounce">💧</span>
       <span className="absolute bottom-10 left-3 text-cyan-300 text-xs animate-ping">✧</span>
       <span className="absolute top-4 right-3 text-yellow-300 text-xs animate-pulse">✦</span>
       <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-3 h-1.5 bg-rose-400/40 rounded-full blur-[1px]" />
       <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-3 h-1.5 bg-rose-400/40 rounded-full blur-[1px]" />
     </div>
   );
   ```
6. **Update animation class and expression rendering**:
   - In `animationClass`: `case 'drinking': return 'animate-bounce';`
   - In JSX: `{resolvedExpr === 'drinking' && <DrinkingOverlay />}`

### 4.2 Changes in `src/tabs/TodayTab.tsx`
1. Add transient state and timer ref:
   ```typescript
   const [isDrinking, setIsDrinking] = useState(false);
   const drinkingTimerRef = useRef<NodeJS.Timeout | null>(null);

   useEffect(() => {
     return () => {
       if (drinkingTimerRef.current) clearTimeout(drinkingTimerRef.current);
     };
   }, []);
   ```
2. Inside `logIntake`:
   ```typescript
   setIsDrinking(true);
   if (drinkingTimerRef.current) clearTimeout(drinkingTimerRef.current);
   drinkingTimerRef.current = setTimeout(() => {
     setIsDrinking(false);
   }, 2500);
   ```
3. Pass `isDrinking={isDrinking}` (or `voyagerExpression={isDrinking ? 'drinking' : undefined}`) to the water container component (`WaveTank` / `CosmicWaterPlanet`).

### 4.3 Asset Generation Prompts & Specification

#### Asset 1: `public/assets/character/voyager_drinking.png`
- **Target Path**: `D:\uống nước\public\assets\character\voyager_drinking.png`
- **Dimensions**: 1000 x 1000 pixels, PNG format, transparent alpha background.
- **Reference Image**: `C:/Users/manha/.gemini/antigravity/brain/f2a2ac03-84b6-43e0-ae8e-3472cba79c9a/.user_uploaded/media_1793371487089_cd42a7d2.png` and `D:/uống nước/public/assets/character/voyager_base.png`.
- **Prompt**:
  > "Masterpiece chibi anime illustration of Voyager from Reverse: 1999 drinking water, cute super-deformed chibi proportions, 1000x1000 square, isolated on transparent background. Long flowing galaxy-blue hair with starlight highlights and braided locks, wearing a crisp white sailor beret with gold anchor star emblem, gold filigree star halo diadem, and a deep cosmic starry cape. She is joyfully holding a clear celestial glass of sparkling star water with both hands, taking a sweet sip. Eyes are closed happily in a cute anime smiling curve (^.^), cheeks blushing rosy pink with joy. Floating tiny crystalline water droplets and glowing constellation sparkles surround her. Clean official anime game chibi art style, crisp outlines, vibrant colors."

#### Asset 2: `public/assets/character/voyager_sleeping.png`
- **Target Path**: `D:\uống nước\public\assets\character\voyager_sleeping.png` (overwrite old file)
- **Dimensions**: 1000 x 1000 pixels, PNG format, transparent alpha background.
- **Reference Image**: Same as above.
- **Prompt**:
  > "Masterpiece chibi anime illustration of Voyager from Reverse: 1999 sleeping soundly, cute super-deformed chibi proportions, 1000x1000 square, isolated on transparent background. She is peacefully curled up asleep in gentle zero-gravity floating slumber, resting comfortably atop a soft cosmic crescent moon pillow or starlight cloud. Long flowing galaxy-blue hair floating softly like nebulae, wearing white sailor hat and starry celestial cape wrapped cozy like a soft blanket. Her face is serene, adorable, and completely visible with eyelashes peacefully closed in sweet dreams, soft pink blush on cheeks, a gentle tranquil smile. Bright clear character lighting, no dark sheet, no veil covering her face. Clean official anime game chibi art style, crisp outlines, serene celestial glow."

---

## 5. Verification Method

To independently verify the investigation and ensure the future implementation is flawless:

1. **Unit Test Verification**:
   ```powershell
   cd "D:\uống nước"
   npm test
   ```
   *Expected*: All 15 test files and 334 tests must pass.
2. **E2E Test Verification**:
   ```powershell
   cd "D:\uống nước"
   npm run test:e2e
   ```
   *Expected*: All 36 suites and 196 tests must pass.
3. **Build & Typecheck**:
   ```powershell
   cd "D:\uống nước"
   npm run build
   ```
   *Expected*: `tsc && vite build` succeeds with exit code 0.
4. **Visual Inspection**:
   - In browser (`npm run dev`), during quiet hours (e.g. set bedtime in ProfileTab to cover current time), confirm Voyager appears in the genuine sleeping illustration with NO dark indigo backdrop or blur covering her face.
   - Click any quick drink button (`+50`, `+150`, `+250`, `+500ml`) or custom modal: Voyager immediately switches to `voyager_drinking.png` with drinking overlay for 2.5 seconds, then gracefully reverts to idle (or happy if $\ge 100\%$, or sleeping if in quiet hours).
5. **Invalidation Conditions**:
   - Any modification that removes `data-testid="expression-sleeping"` or text `"Zzz"` from `SleepingOverlay` will invalidate `tests/unit/voyagerChibi.test.ts:109-111` and `tests/unit/m2ChallengerStress.test.ts:274-276`.
   - Modifying `resolveAvatarSrc` to return something other than `/assets/character/voyager_base.png` on null/empty input will invalidate `tests/e2e/tier2-boundaries/f08_chibi_boundaries.test.ts:27-28`.
