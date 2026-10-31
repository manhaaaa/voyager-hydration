## 2026-10-31T15:48:18Z
You are teamwork_worker for Milestone 6 of Voyager's Cosmic Hydration.
Your working directory is: D:\uống nước\.agents\teamwork\worker_m6_1
Project root: D:\uống nước
Original user request: D:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md
Scope document: D:\uống nước\.agents\teamwork\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Technical Input & Handoffs:
Read the 3 Explorer handoff reports before implementing:
- D:\uống nước\.agents\teamwork\explorer_m6_1\handoff.md (Character visuals & expressions blueprint)
- D:\uống nước\.agents\teamwork\explorer_m6_2\handoff.md (CosmicWaterPlanet component blueprint)
- D:\uống nước\.agents\teamwork\explorer_m6_3\handoff.md (Integration & test suite impact analysis)

Generated Character Image Sources:
Two high-fidelity assets have been generated using Gemini AI:
1. Drinking asset: C:\Users\manha\.gemini\antigravity-cli\brain\128bc40e-5829-492d-bad2-62ae7f2e3136\voyager_drinking_1793461603738.jpg
2. Sleeping asset: C:\Users\manha\.gemini\antigravity-cli\brain\128bc40e-5829-492d-bad2-62ae7f2e3136\voyager_sleeping_1793461624588.jpg

Your File Ownership (Exclusive):
- public/assets/character/
- src/components/VoyagerChibi.tsx
- src/components/CosmicWaterPlanet.tsx
- src/components/WaveTank.tsx
- src/tabs/TodayTab.tsx

Tasks:
1. Process and install the two generated images into `public/assets/character/`:
   - `public/assets/character/voyager_drinking.png` (process the JPEG source to transparent PNG or install properly)
   - `public/assets/character/voyager_sleeping.png` (replace the old sleeping image)
   (Note: you can write a short node script with `sharp` or pure node buffer manipulation/pngjs if installed, or convert with available tools).
2. Update `src/components/VoyagerChibi.tsx`:
   - Add `'drinking'` to `VoyagerExpression` enum, `sanitizeExpression`, and `VOYAGER_EXPRESSION_IMAGES`.
   - Remove the dark veil overlay (`bg-indigo-950/60 backdrop-blur-[1px]`) and center arc from `SleepingOverlay`. Retain `data-testid="expression-sleeping"` and `Zzz` text.
   - Add `DrinkingOverlay` with `data-testid="expression-drinking"`.
   - Add `'drinking'` case in `animationClass`.
3. Create `src/components/CosmicWaterPlanet.tsx` per `explorer_m6_2`'s detailed specification:
   - 0%: barren cratered rock sphere.
   - 1%-99%: dynamic fluid ocean rising with dual animated sine waves, bubbles, and bathymetric crater shading.
   - 100%: glowing super-habitable ocean world with atmospheric corona and golden orbital rings.
   - Include `data-testid="wave-tank-container"` (and `data-testid="cosmic-water-planet"`), `data-fill-percent={visualPercent}`, `data-testid="star-buoy"`, and `data-testid="floating-chibi-anchor"`.
4. Update `src/components/WaveTank.tsx`:
   - Keep as backward-compatible wrapper or re-export of `CosmicWaterPlanet` to preserve existing test suite imports.
5. Update `src/tabs/TodayTab.tsx`:
   - Replace old WaveTank usage with `CosmicWaterPlanet`.
   - Implement transient `isDrinking` state (2.5s) upon logging water.
   - Ensure hierarchical mood priority: `isQuietNow` ('sleeping') > `consumed >= goal` ('happy') > `isDrinking` ('drinking') > 'idle'.
   - Harmonize water volume metrics (`consumed-volume`, `goal-volume`, `deficit-prompt`).
6. Build & Test Verification:
   - Run `npm test` and verify all 334+ unit tests pass 100%.
   - Run `npm run test:e2e` and verify all 196 E2E tests pass 100%.
   - Run `npm run build` and verify TypeScript compilation and Vite build succeed with 0 errors.

Deliver a comprehensive handoff report to `D:\uống nước\.agents\teamwork\worker_m6_1\handoff.md` including exact build & test execution results, and send a notification message when complete.
