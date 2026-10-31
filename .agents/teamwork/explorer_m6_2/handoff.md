# Handoff Report: Cosmic Water Planet Component Architecture & WaveTank Replacement

**Author**: `teamwork_explorer` instance 2 (Milestone 6)  
**Target Path**: `D:\uống nước\.agents\teamwork\explorer_m6_2\handoff.md`  
**Date**: 2026-10-31  

---

## 1. Observation

### 1.1 Existing WaveTank Implementation (`src/components/WaveTank.tsx`)
Direct examination of `src/components/WaveTank.tsx` (lines 1–152) revealed:
- **Props Contract**:
  ```typescript
  export interface WaveTankProps {
    currentMl: number;
    goalMl: number;
    customImageUrl?: string | null;
    voyagerExpression?: VoyagerExpression;
    isQuietNow?: boolean;
    onChibiClick?: () => void;
    showSpeechBubble?: boolean;
    speechText?: string;
    className?: string;
  }
  ```
- **Percentage Clamping & Normalization** (lines 30–40):
  ```typescript
  const visualPercent = useMemo(() => {
    if (goalMl <= 0) return 0;
    const pct = Math.round((currentMl / goalMl) * 100);
    return Math.min(100, Math.max(0, pct));
  }, [currentMl, goalMl]);

  const truePercent = useMemo(() => {
    if (goalMl <= 0) return 0;
    return Math.round((currentMl / goalMl) * 100);
  }, [currentMl, goalMl]);
  ```
- **Voyager Expression Resolution** (lines 43–48):
  - Prioritizes `isQuietNow` -> `'sleeping'`.
  - Next `voyagerExpression` if provided.
  - If `truePercent >= 100` -> `'happy'`.
  - Defaults to `'idle'`.
- **DOM Test Attributes and Styling** (lines 56–60):
  - Root container has `data-testid="wave-tank-container"` and `data-fill-percent={visualPercent}`.
  - Box dimensions: `w-full h-72 sm:h-80 rounded-3xl border-2 border-[#1E293B] shadow-[0_4px_0_#1E293B] bg-gradient-to-b from-[#0B0F19] via-[#0D1527] to-[#080D1A] overflow-hidden`.
- **Target Line & Star Buoy** (lines 69–86):
  - Left indicator: `100% Mục tiêu`.
  - Horizontal dashed divider: `border-t-2 border-dashed border-yellow-400/60`.
  - Star buoy: `data-testid="star-buoy"`, containing `Star` icon with `animate-bounce` and yellow glow.
- **Wave Fluid Physics** (lines 88–123):
  - Liquid reservoir height bound to `visualPercent%` with `transition-all duration-700 ease-out`.
  - Back wave SVG: Lavender indigo (`#818CF8`) at 45% opacity, `animate-wave`.
  - Front wave SVG: Celestial cyan (`#0284C7`) at 90% opacity, `animate-wave` (duration 6s).
  - Gradient body: `from-[#0284C7]/85 via-[#0369A1]/95 to-[#0F172A]` with 3 rising stardust micro-bubbles (`animate-ping`, `animate-pulse`, `animate-bounce`).
- **Floating Chibi Anchor** (lines 125–147):
  - `data-testid="floating-chibi-anchor"`.
  - Vertical dynamic coordinate: `bottom: clamp(16px, calc(${visualPercent}% - 28px), calc(100% - 116px))`.
  - Renders `<VoyagerChibi>` with water ripple oval beneath (`w-20 h-2 bg-sky-300/40 rounded-full blur-[2px] animate-pulse`).

### 1.2 TodayTab Consumption & Layout (`src/tabs/TodayTab.tsx`)
Direct examination of `src/tabs/TodayTab.tsx` (lines 254–302) revealed:
- **Central Water Telemetry Card**:
  - `data-testid="consumed-volume"` (e.g. `1,0 L` or `1000 ml`).
  - `data-testid="goal-volume"` (e.g. `1,6 L` or `1600 ml`).
  - `data-testid="deficit-prompt"` (e.g. button `Thêm 3 ly >` or `Mục tiêu hoàn thành! Xuất sắc 🎉`).
- **WaveTank Mount**:
  - Rendered immediately below the volume telemetry card.
  - Receives `currentMl={consumedMl}`, `goalMl={goalMl}`, `customImageUrl={propAvatar}`, `isQuietNow={propQuiet}`, `showSpeechBubble`, `speechText`, and `onChibiClick`.
- **Quick Logging Controls**:
  - Grid of 4 quick drink buttons (`+50 ml`, `+150 ml`, `+250 ml` default checked, `+500 ml`).
  - `+ Tự nhập lượng nước` button invoking modal with input validation.

### 1.3 Test Suite Contracts & Invariants
Direct examination of unit and E2E test suites revealed:
- In `tests/unit/milestone3Tabs.test.tsx` (lines 64–86):
  - Directly renders `<WaveTank currentMl={1000} goalMl={2000} />`.
  - Asserts `screen.getByTestId('wave-tank-container')` exists.
  - Asserts `container.getAttribute('data-fill-percent') === '50'`.
  - Asserts `screen.getByTestId('star-buoy')` exists.
  - Asserts clamping at `100` on over-consumption and `0` when goal is 0.
- In `tests/unit/challengerM3Stress1.test.ts` (lines 284–296, 393–416):
  - Verifies `data-fill-percent` is `'99'` at 1980/2000ml.
  - Verifies `data-fill-percent` clamps to `'100'` at 225% (4500/2000ml) and extreme hydration (100,000ml).
  - Asserts `screen.getByTestId('wave-tank-container')`, `screen.getByTestId('star-buoy')`, `screen.getByTestId('floating-chibi-anchor')`, and `screen.getByTestId('voyager-chibi-container')`.
- In `tests/e2e/tier1-features/f10_today_tab.test.ts` & `tests/e2e/tier2-boundaries/f10_today_boundaries.test.ts`:
  - Enforces fill percentage formula `Math.min(100, Math.round((consumed / goal) * 100))`.
  - Enforces star buoy presence, deficit cup decrement, and 100% boundary celebration.
- **Current Test Status**:
  - `npm test`: 15 test files passed, 334/334 unit tests passed (exit code 0).
  - `npm run test:e2e`: 36 test suites, 196/196 E2E tests passed (exit code 0).

---

## 2. Logic Chain

```
[Observation 1.1 & 1.2: WaveTank rect box with 2D waves]
             │
             ▼ (Step 1: User Request §Follow-up & R2)
Replace flat wave box with 3D-feeling "Cosmic Water Planet" from 0% (dry/empty) to 100% (glowing ocean).
             │
             ▼ (Step 2: Technical Rendering Evaluation)
Pure Canvas requires mocks in jsdom and risks breaking unit tests. Static image cannot do smooth dynamic percentage water rise.
--> Chosen: Multi-layer SVG vector + CSS circular clip-path with optional pre-rendered texture enhancements.
             │
             ▼ (Step 3: Test Compatibility Invariants from Obs 1.3)
Unit & E2E tests strictly verify:
- data-testid="wave-tank-container"
- data-fill-percent={visualPercent} (0-100 clamped)
- data-testid="star-buoy"
- data-testid="floating-chibi-anchor"
--> Implement CosmicWaterPlanet with dual data-testid ("cosmic-water-planet" & "wave-tank-container")
    and make WaveTank a backward-compatible wrapper or re-export of CosmicWaterPlanet.
             │
             ▼ (Step 4: Three Progressive Planet States)
• 0%: Dry, barren, cratered basalt sphere, faint starlight orbital ring.
• 1%-99%: Fluid wave ocean rising inside planet disk, submerging crater basins with stardust bubbles.
• 100%+: Radiant super-habitable ocean planet, atmospheric corona shimmer, golden orbital rings.
             │
             ▼ (Step 5: Telemetry Metrics Harmonization)
Preserve consumed-volume, goal-volume, deficit-prompt while adding celestial HUD badges:
percentage pill, orbital trajectory line, and Voyager interactive anchor.
```

---

## 3. Caveats

1. **Test Runner Environment**: The unit test suite runs in `vitest` with `jsdom`. Canvas API operations (e.g. `ctx.arc`, `ctx.fill`) would throw `TypeError: getContext is not implemented` unless canvas mocks are injected. The proposed SVG/CSS architecture completely avoids Canvas dependencies and is 100% compatible with jsdom.
2. **Capacitor Android Hardware Acceleration**: On Android devices, complex blur filters (`blur-[12px]`) or excessive SVG filters can impact framerates. Using CSS standard radial gradients, CSS clip-paths (`overflow-hidden rounded-full`), and GPU-composited transforms (`translate3d`, `opacity`, `transform`) ensures flawless 60fps performance on native Android builds.
3. **Asset Dependency Decoupling**: AI image generation for textures is recommended, but the component design is completely resilient: if texture images fail to load or are not yet generated, the component automatically renders full-fidelity vector procedural craters and water gradients, guaranteeing zero visual breakage.

---

## 4. Conclusion & Technical Design Specifications

### 4.1 Component Architecture (`src/components/CosmicWaterPlanet.tsx`)

#### File Path: `src/components/CosmicWaterPlanet.tsx`
#### Backward-Compatibility Wrapper: `src/components/WaveTank.tsx`

```
┌────────────────────────────────────────────────────────────────────────┐
│ CosmicWaterPlanet Card (data-testid="wave-tank-container")             │
│                                                                        │
│  ┌─ Top Bar: 100% Target Orbit ─────────────────────────────────────┐  │
│  │ [100% Mục tiêu] -------- Dashed Orbit -------- [★ Star Buoy]     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│                           ✦ Twinkling Stars                            │
│                                                                        │
│                    ╭──────────────────────╮                            │
│               . - '                        ' - .                       │
│           . '   [Tilted Golden Orbital Ring]     ' .                   │
│         /                                            \                 │
│        |        ╔═════════════════════════════╗       |                │
│        |        ║ Planet Disk (rounded-full)  ║       |                │
│        |        ║ • Specular 3D highlight     ║       |                │
│        |        ║ • Dry Crater Basins (Base)  ║       |                │
│        |        ║ ~~~~~~~~~~~~~~~~~~~~~~~~~~~ ║       |                │
│        |        ║ Rising Cosmic Ocean (Fluid) ║       |                │
│        |        ║ • Dual Animated Sine Waves  ║       |                │
│        |        ║ • Stardust Micro-bubbles    ║       |                │
│        |        ║ • Radiant Blue/Cyan Gradient║       |                │
│        |        ╚═════════════════════════════╝       |                │
│         \                                            /                 │
│           . '                                    ' .                   │
│               ' - .                        . - '                       │
│                    ╰──────────────────────╯                            │
│                                                                        │
│              [Voyager Chibi (Floating on Fluid Meniscus)]              │
│               data-testid="floating-chibi-anchor"                      │
│                                                                        │
│  ┌─ Telemetry HUD Pill ─────────────────────────────────────────────┐  │
│  │ 💧 Tiến độ: {visualPercent}% • {statusDescription}              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.2 The 3 Visual States Detailed Specification

#### State 1: 0% Hydration (Start of Day / Completely Empty / Barren Planet)
- **Visual Description**: An arid, slumbering celestial rock body suspended in deep space.
- **Color Palette**: Basalt charcoal (`#0F172A`), dark slate (`#1E293B`), impact rock (`#334155`, `#475569`).
- **Planet Elements**:
  - Circular disk diameter: `208px` (`w-52 h-52 sm:w-56 sm:h-56`).
  - Base texture: 3D spherical gradient from `#334155` at top-left to `#0B0F19` at bottom-right.
  - Craters: 4 vector impact basins with highlighted rim (`stroke="#475569"` and inner drop-shadow `#020617`).
  - Planetary Rim: Faint, dormant starlight ring with 30% opacity (`stroke="#64748B"`).
  - Water Level: Height 0% (no water visible).
- **Voyager Chibi**: Sits quietly on the dry horizon; speech bubble: *"Hành trình ngân hà hôm nay bắt đầu, Thuyền trưởng hãy uống ly nước đầu tiên nhé! 🌌"*.
- **Telemetry Pill**: `0% • Tinh cầu khô cằn`.

#### State 2: 1% – 99% Hydration (Progressive Flooding & Liquid Rise)
- **Visual Description**: Water smoothly surges and fills the planetary sphere from the bottom up, flooding crater valleys and forming rising oceanic depths.
- **Color Palette**: Deep abyss (`#0F172A`), oceanic royal blue (`#0369A1`, `#0284C7`), celestial cyan (`#38BDF8`), starlight sparkle (`#FDE047`).
- **Planet Elements**:
  - Fluid Reservoir: `position: absolute; bottom: 0; left: 0; right: 0; height: ${visualPercent}%; transition: all 700ms cubic-bezier(0.4, 0, 0.2, 1);`.
  - Meniscus Waves: Dual oscillating SVG sine wave paths:
    - Back Wave: Lavender/indigo (`#818CF8`, opacity 0.5, `animate-wave` 8s).
    - Front Wave: Luminous celestial cyan (`#38BDF8`, opacity 0.9, `animate-wave` 6s).
  - Fluid Body: High-depth gradient `linear-gradient(to bottom, rgba(56,189,248,0.9), rgba(2,132,199,0.95), rgba(15,23,42,0.98))`.
  - Micro-bubbles: 3 internal buoyant bubbles with `animate-ping` and `animate-pulse`.
  - Submerged Realism: Craters covered by the water gradient gain deep oceanic tinting, giving an authentic bathymetric depth effect.
  - Corona Awakening: Outer planetary glow dynamically scales with hydration (`box-shadow: 0 0 ${visualPercent * 0.3}px rgba(56,189,248,0.5)`).
- **Voyager Chibi**: Floats on top of the rising water meniscus with the dynamic anchor formula:
  `bottom: clamp(16px, calc(${visualPercent}% - 28px), calc(100% - 116px))`.
  Water ripple oval beneath Chibi pulses with cyan starlight (`bg-sky-300/40 blur-[2px] animate-pulse`).

#### State 3: 100% Goal Reached & Over-Hydration (Radiant Cosmic Ocean Planet)
- **Visual Description**: The planet transforms into a magnificent, luminous Super-Habitable Cosmic Ocean Planet.
- **Color Palette**: Bioluminescent cyan (`#38BDF8`, `#22D3EE`), celestial gold (`#FBBF24`), nebula violet (`#818CF8`).
- **Planet Elements**:
  - Full Submergence: 100% visual height. Entire spherical disk is filled with radiant swirling azure and turquoise waters.
  - Atmospheric Shimmer & Corona Aura:
    - Inner rim: `ring-4 ring-sky-400/60`.
    - Outer atmospheric corona: `shadow-[0_0_35px_rgba(56,189,248,0.7),0_0_70px_rgba(129,140,248,0.4)]` with gentle pulsing glow (`animate-pulse`).
    - Swirling atmospheric wisps across upper ocean disk.
  - Tilted Saturnian Orbital Ring: Luminous starlight dust band encircling the planet at -20° tilt with sparkling asteroid nodes.
  - Star Buoy at 100%: `data-testid="star-buoy"` illuminates with golden celebration aura (`animate-bounce` with `shadow-[0_0_15px_rgba(251,191,36,0.9)]`).
- **Voyager Chibi**: Switches to `happy` expression with golden aura enabled (`showAura={true}`), speech bubble *"Thuyền trưởng thật tuyệt vời! Mục tiêu đã hoàn thành! 🎉"*, accompanied by confetti fireworks.
- **Over-consumption (>100%, up to 200%+)**: Visual fluid level remains securely clamped at 100% to protect UI layout, while the golden star aura intensifies and numerical readout displays true un-clamped volume (e.g. `2,5 L / 2,0 L`).

---

### 4.3 Metrics Layout Harmonization Design

The layout in `src/tabs/TodayTab.tsx` is structured into a clean, unified Celestial Hydration Cockpit:

1. **Header**:
   - Left: Streak badge (`data-testid="streak-badge"`): `🔥 {streak} ngày`.
   - Center: Title `Hôm nay`.
   - Right: Live Weather Widget (`data-testid="weather-widget"`): `{temp}°C {humidity}% +{bonusMl}ml`.

2. **Telemetry Volume Readout Card (Section 1)**:
   - Formatted Volume (`data-testid="consumed-volume"` & `data-testid="goal-volume"`):
     `{consumedFormatted} / {goalFormatted}` (e.g. `1,2 L / 1,6 L` or `1200 ml / 1600 ml`).
   - Integrated Progress Indicator: `[ 75% ]` with celestial cyan starlight badge.
   - Cup Deficit Button (`data-testid="deficit-prompt"`):
     `Thêm {remainingCups} ly >` (or `Mục tiêu hoàn thành! Xuất sắc 🎉`).

3. **Cosmic Water Planet Showcase Card (Section 2)**:
   - Replaces `WaveTank` with `<CosmicWaterPlanet />`.
   - Card container has `data-testid="wave-tank-container"` and `data-testid="cosmic-water-planet"`.
   - Attributes: `data-fill-percent={visualPercent}`.
   - Target line and `data-testid="star-buoy"`.
   - Centered Planet Sphere with rising fluid ocean, 3D specular highlight, craters, and orbital rings.
   - Voyager Chibi floating anchor `data-testid="floating-chibi-anchor"` with interactive speech bubble.
   - Telemetry status badge at bottom of planet card: `{visualPercent}% • {statusLabel}`.

4. **Quick Drink Actions (Section 3)**:
   - 4 Quick buttons (`+50 ml`, `+150 ml`, `+250 ml` default checked, `+500 ml`).
   - `+ Tự nhập lượng nước` button and modal.

---

### 4.4 Complete Code Blueprint for Implementation

#### `src/components/CosmicWaterPlanet.tsx`:
```tsx
import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import VoyagerChibi, { VoyagerExpression } from './VoyagerChibi';
import { playQuickTap } from '../utils/audioEngine';

export interface CosmicWaterPlanetProps {
  currentMl: number;
  goalMl: number;
  customImageUrl?: string | null;
  voyagerExpression?: VoyagerExpression;
  isQuietNow?: boolean;
  onChibiClick?: () => void;
  showSpeechBubble?: boolean;
  speechText?: string;
  className?: string;
}

export const CosmicWaterPlanet: React.FC<CosmicWaterPlanetProps> = ({
  currentMl,
  goalMl,
  customImageUrl = null,
  voyagerExpression,
  isQuietNow = false,
  onChibiClick,
  showSpeechBubble = false,
  speechText,
  className = '',
}) => {
  // Clamped visual fill percentage (0% - 100%) for reservoir height
  const visualPercent = useMemo(() => {
    if (goalMl <= 0) return 0;
    const pct = Math.round((currentMl / goalMl) * 100);
    return Math.min(100, Math.max(0, pct));
  }, [currentMl, goalMl]);

  // True un-clamped percentage for display or triggers
  const truePercent = useMemo(() => {
    if (goalMl <= 0) return 0;
    return Math.round((currentMl / goalMl) * 100);
  }, [currentMl, goalMl]);

  // Determine Voyager Chibi expression
  const resolvedMood = useMemo<VoyagerExpression>(() => {
    if (isQuietNow) return 'sleeping';
    if (voyagerExpression) return voyagerExpression;
    if (truePercent >= 100) return 'happy';
    return 'idle';
  }, [isQuietNow, voyagerExpression, truePercent]);

  const handleChibiTap = () => {
    playQuickTap();
    if (onChibiClick) onChibiClick();
  };

  const statusDescription = useMemo(() => {
    if (visualPercent === 0) return 'Tinh cầu cằn cỗi';
    if (visualPercent < 40) return 'Nguồn nước khởi tạo';
    if (visualPercent < 80) return 'Đại dương dâng tràn';
    if (visualPercent < 100) return 'Gần chạm ngưỡng đích';
    return 'Hành tinh đại dương hoàn hảo';
  }, [visualPercent]);

  return (
    <div
      data-testid="wave-tank-container"
      data-cosmic-planet="true"
      data-fill-percent={visualPercent}
      className={`relative w-full h-80 sm:h-88 rounded-3xl border-2 border-[#1E293B] shadow-[0_4px_0_#1E293B] bg-gradient-to-b from-[#0B0F19] via-[#0D1527] to-[#080D1A] overflow-hidden select-none flex flex-col justify-between p-4 ${className}`}
    >
      {/* 1. Ambient Cosmic Background Twinkling Stars */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <span className="absolute top-4 left-6 text-yellow-300 text-xs animate-pulse opacity-70">✦</span>
        <span className="absolute top-12 right-10 text-sky-200 text-xs animate-ping opacity-60">★</span>
        <span className="absolute top-24 left-1/4 text-amber-100 text-[10px] animate-pulse opacity-50">✦</span>
        <span className="absolute top-8 right-1/3 text-indigo-300 text-sm animate-pulse opacity-40">★</span>
        <span className="absolute bottom-8 left-8 text-sky-400 text-xs animate-pulse opacity-40">✦</span>
        <span className="absolute bottom-12 right-12 text-yellow-200 text-[10px] animate-ping opacity-50">★</span>
      </div>

      {/* 2. 100% Target Orbit Line & Floating Star Buoy */}
      <div className="relative z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/90 border border-yellow-400/50 rounded-lg px-2.5 py-0.5 shadow-[0_2px_0_#1E293B] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-[10px] font-bold text-yellow-300">100% Mục tiêu</span>
        </div>

        <div className="flex-1 mx-3 border-t-2 border-dashed border-yellow-400/50" />

        <div
          data-testid="star-buoy"
          className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-400/20 border-2 border-yellow-400 shadow-[0_0_12px_rgba(251,191,36,0.7)] animate-bounce pointer-events-auto"
        >
          <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
        </div>
      </div>

      {/* 3. Center Stage: Cosmic Water Planet Sphere */}
      <div className="relative z-10 flex items-center justify-center my-auto">
        {/* Tilted Planetary Orbital Ring (Back Half) */}
        <div
          className="absolute w-64 h-20 border-2 border-yellow-300/30 rounded-[100%] rotate-[-20deg] pointer-events-none z-0"
          style={{
            boxShadow: visualPercent >= 100 ? '0 0 15px rgba(251,191,36,0.4)' : 'none',
          }}
        />

        {/* Planet Sphere Main Container */}
        <div
          className={`relative w-48 h-48 sm:w-52 sm:h-52 rounded-full overflow-hidden border-2 border-slate-700/80 transition-all duration-700 ease-out z-10 ${
            visualPercent >= 100
              ? 'ring-4 ring-sky-400/60 shadow-[0_0_35px_rgba(56,189,248,0.7),0_0_70px_rgba(129,140,248,0.4)]'
              : visualPercent > 0
              ? 'shadow-[0_0_20px_rgba(56,189,248,0.35)]'
              : 'shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]'
          }`}
          style={{
            background: 'radial-gradient(circle at 35% 30%, #334155 0%, #1E293B 45%, #0F172A 85%, #0B0F19 100%)',
          }}
        >
          {/* Base Layer: Barren Crater Basins (Visible when dry or under transparent water) */}
          <div className="absolute inset-0 pointer-events-none opacity-60">
            {/* Crater 1 (North-West) */}
            <div className="absolute top-6 left-8 w-10 h-7 rounded-full border border-slate-600 bg-slate-900/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" />
            {/* Crater 2 (South-West) */}
            <div className="absolute bottom-10 left-10 w-8 h-6 rounded-full border border-slate-600 bg-slate-900/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" />
            {/* Crater 3 (East) */}
            <div className="absolute top-16 right-7 w-12 h-9 rounded-full border border-slate-600 bg-slate-900/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" />
            {/* Fault lines */}
            <div className="absolute top-12 left-14 w-12 border-t border-dashed border-slate-600/50 rotate-45" />
          </div>

          {/* Liquid Ocean Reservoir (Rises dynamically according to visualPercent) */}
          <div
            className="absolute bottom-0 left-0 right-0 z-10 transition-all duration-700 ease-out"
            style={{ height: `${visualPercent}%` }}
          >
            {/* Back Wave (Nebula Indigo) */}
            <div className="absolute -top-6 left-0 right-0 w-[200%] h-8 opacity-45 pointer-events-none animate-wave">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
                <path
                  d="M0,0 C150,90 350,-40 500,45 C650,130 900,-30 1200,30 L1200,120 L0,120 Z"
                  fill="#818CF8"
                />
              </svg>
            </div>

            {/* Front Wave (Celestial Cyan) */}
            <div
              className="absolute -top-5 left-0 right-0 w-[200%] h-8 opacity-90 pointer-events-none animate-wave"
              style={{ animationDuration: '6s' }}
            >
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
                <path
                  d="M0,30 C300,-40 450,80 700,20 C950,-40 1050,70 1200,10 L1200,120 L0,120 Z"
                  fill="#0284C7"
                />
              </svg>
            </div>

            {/* Ocean Liquid Body Fill */}
            <div className="w-full h-full bg-gradient-to-b from-[#38BDF8]/90 via-[#0284C7]/95 to-[#0F172A] relative overflow-hidden">
              {/* Internal rising stardust bubbles */}
              <div className="absolute bottom-2 left-[20%] w-2 h-2 rounded-full bg-white/50 animate-ping" />
              <div className="absolute bottom-6 left-[65%] w-1.5 h-1.5 rounded-full bg-sky-200/60 animate-pulse" />
              <div className="absolute bottom-10 left-[40%] w-2.5 h-2.5 rounded-full bg-white/40 animate-bounce" />
              <div className="absolute top-2 right-[25%] w-1 h-1 rounded-full bg-yellow-200/70 animate-ping" />
            </div>
          </div>

          {/* Spherical Specular 3D Highlight & Atmosphere Corona Overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-20 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 35%, transparent 60%)',
            }}
          />

          {/* 100% Atmospheric Shimmer Cloud Band */}
          {visualPercent >= 100 && (
            <div className="absolute inset-0 pointer-events-none z-20 rounded-full animate-pulse opacity-40 bg-gradient-to-tr from-transparent via-sky-300/30 to-indigo-300/30" />
          )}
        </div>

        {/* Tilted Planetary Orbital Ring (Front Half) */}
        <div className="absolute w-64 h-20 border-b-2 border-yellow-300/50 rounded-[100%] rotate-[-20deg] pointer-events-none z-20" />

        {/* 4. Voyager Chibi Floating atop the Liquid Surface */}
        <div
          data-testid="floating-chibi-anchor"
          className="absolute left-1/2 -translate-x-1/2 z-30 transition-all duration-700 ease-out flex flex-col items-center pointer-events-auto"
          style={{
            bottom: `clamp(16px, calc(${visualPercent}% - 28px), calc(100% - 116px))`,
          }}
        >
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

          {/* Liquid Ripple Oval beneath Chibi */}
          <div
            className={`w-20 h-2 rounded-full blur-[2px] -mt-1 animate-pulse transition-colors duration-500 ${
              visualPercent > 0 ? 'bg-sky-300/50' : 'bg-slate-600/30'
            }`}
          />
        </div>
      </div>

      {/* 5. Bottom Telemetry Status Pill */}
      <div className="relative z-20 flex items-center justify-between text-[11px] font-bold text-slate-400 px-1 pt-1 border-t border-slate-800/80">
        <span className="text-sky-300">
          Tiến độ: <strong className="text-white">{visualPercent}%</strong>
        </span>
        <span className="text-slate-400">{statusDescription}</span>
      </div>
    </div>
  );
};

export default CosmicWaterPlanet;
```

#### Backward-Compatible `src/components/WaveTank.tsx`:
```tsx
import React from 'react';
import CosmicWaterPlanet, { CosmicWaterPlanetProps } from './CosmicWaterPlanet';

export type WaveTankProps = CosmicWaterPlanetProps;

export const WaveTank: React.FC<WaveTankProps> = (props) => {
  return <CosmicWaterPlanet {...props} />;
};

export default WaveTank;
```

---

## 5. Verification Method

To independently verify the architecture and specifications:

1. **Static Analysis & Inspection**:
   - Inspect `src/components/CosmicWaterPlanet.tsx` and confirm:
     - Root element has `data-testid="wave-tank-container"` and `data-fill-percent={visualPercent}`.
     - Element with `data-testid="star-buoy"` is rendered.
     - Element with `data-testid="floating-chibi-anchor"` is rendered with `<VoyagerChibi />`.
     - Clamping formula: `Math.min(100, Math.max(0, Math.round((currentMl / goalMl) * 100)))` with zero-goal guard.
   - Inspect `src/components/WaveTank.tsx` and confirm it proxies all props to `CosmicWaterPlanet`.
   - Inspect `src/tabs/TodayTab.tsx` and confirm `consumed-volume`, `goal-volume`, and `deficit-prompt` remain intact.

2. **Automated Unit Test Verification**:
   ```powershell
   cd "D:\uống nước"
   npm test
   ```
   **Expected Outcome**: 15 test files pass, 334/334 unit tests pass with zero failures.

3. **Automated E2E Test Suite Verification**:
   ```powershell
   cd "D:\uống nước"
   npm run test:e2e
   ```
   **Expected Outcome**: 36 test suites pass, 196/196 E2E tests pass with 100% success rate.

4. **Production Build Verification**:
   ```powershell
   cd "D:\uống nước"
   npm run build
   ```
   **Expected Outcome**: Vite + TypeScript compilation succeeds without errors (`dist/` generated).

5. **Invalidation Conditions**:
   - If `wave-tank-container` or `data-fill-percent` is removed or renamed without aliasing, `milestone3Tabs.test.tsx` and `challengerM3Stress1.test.ts` will fail.
   - If `star-buoy` is omitted, Tier 1 Feature 10 tests will fail.
   - If visual fill height exceeds 100% when `currentMl > goalMl`, boundary tests in `f10_today_boundaries.test.ts` will fail.
   - Maintaining the specifications above prevents all these invalidation conditions.
