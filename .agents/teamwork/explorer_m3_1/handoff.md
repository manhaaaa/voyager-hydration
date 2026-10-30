# Handoff Report: Milestone 3 — NavigationBar, WaveTank & TodayTab Specification

**Author**: `explorer_m3_1`  
**Milestone**: Milestone 3 ("5 Main Tab Screens & Card-UI System")  
**Target Components**:
1. `src/components/NavigationBar.tsx`
2. `src/components/WaveTank.tsx`
3. `src/tabs/TodayTab.tsx`
(Plus shared Card-UI patterns and Custom Intake Modal dialog)

---

## 1. Observation

Direct observations and evidence gathered from the authoritative project files and codebase:

### 1.1 Authoritative Requirements (`ORIGINAL_REQUEST.md` & `PROJECT.md`)
- **NavigationBar (§R4)**:
  - Fixed bottom navigation bar with 5 primary tabs: Nhắc nước (`reminder`), Nhật ký (`journal`), Hôm nay (`today`), Thống kê (`stats`), Cá nhân (`profile`).
  - Strict 100% Free Guarantee: Zero VIP crowns, zero paywalls, zero locked badges.
  - Card-UI styling: `2px solid #1E293B`, `shadow-[0_4px_0_#1E293B]`, tactile click feedback.
- **WaveTank / Bể Ngân Hà (§R4)**:
  - Water wave animation with celestial starlight theme dâng lên theo % mục tiêu (0-100%+).
  - Vạch đích nét đứt ngang (100% goal line) có phao ngôi sao bên phải (floating star buoy).
  - Voyager Chibi lơ lửng bobbing gently atop the liquid surface.
  - Rising cosmic bubbles and twinkling star particles.
- **TodayTab (§R4)**:
  - Header: Left: streak flame 🔥 `{streak}`, Center: "Hôm nay", Right: Weather widget (temperature, humidity, weather bonus ml, location).
  - Center: Large numerical readout of consumed / goal (e.g. `1,0 L / 1,6 L` or `1000 ml / 1600 ml`) and deficit prompt card (`Thêm X ly >`).
  - Center visual: Bể Ngân Hà (`WaveTank`) with floating `VoyagerChibi`.
  - Quick drink cluster: 4 tactile cards: `+50 ml`, `+150 ml`, `+250 ml` (default checked), `+500 ml`.
  - Custom drink button: "+ Tự nhập" opening custom amount dialog modal.
  - Starlight celebration confetti burst (`canvas-confetti`) when target is reached.
  - Procedural Web Audio feedback (`playQuickTap()` on button click, `playGoalCelebrationFanfare()` on goal achievement).

### 1.2 Automated E2E Test Suite Assertions (`tests/e2e/`)
- **`tests/e2e/tier1-features/f09_navigation_bar.test.ts`**:
  - Test 9.1: Defines exactly 5 tabs matching labels `['Hôm nay', 'Nhắc nước', 'Nhật ký', 'Thống kê', 'Cá nhân']`.
  - Test 9.2: Active tab state tracks selected identifier and highlight bar.
  - Test 9.3: Tab click handler routes to corresponding screen (`TodayTab`, `ReminderTab`, `JournalTab`, `StatsTab`, `ProfileTab`).
  - Test 9.4: `const paywallFeatures = TABS.filter((t: any) => t.isVip || t.isLocked); assert.strictEqual(paywallFeatures.length, 0);`.
  - Test 9.5: Navigation styling: `position: 'fixed'`, `borderTop: '2px solid #1E293B'`, `zIndex: 50`.
- **`tests/e2e/tier2-boundaries/f09_navigation_boundaries.test.ts`**:
  - Test 9.6: Rapid tab switching (50 switches) maintains state consistency.
  - Test 9.7: Initial default tab is `'today'`.
  - Test 9.8: Tap target touch height >= 44px (e.g. 48px to 56px) for mobile accessibility.
  - Test 9.9: Exact Vietnamese strings array: `['Nhắc nước', 'Nhật ký', 'Hôm nay', 'Thống kê', 'Cá nhân']`.
  - Test 9.10: Container class must include `fixed bottom-0 left-0 right-0 max-w-md mx-auto`.
- **`tests/e2e/tier1-features/f10_today_tab.test.ts` & `f10_today_boundaries.test.ts`**:
  - Test 10.1: Header renders streak badge 🔥 and title "Hôm nay".
  - Test 10.2: Header right renders Weather Widget with temperature, humidity, and bonus.
  - Test 10.3: Central water volume readout: `1,0 L / 1,6 L`, `canonicalRemainingCups(goal, consumed, 250)`, prompt text `Thêm 3 ly >`.
  - Test 10.4: Wave tank fill percentage: `calcFillPct = Math.min(100, Math.round((consumed / goal) * 100))`. Clamped at 100% visually.
  - Test 10.5: Quick drink cluster: `[{ amount: 50, isDefault: false }, { amount: 150, isDefault: false }, { amount: 250, isDefault: true }, { amount: 500, isDefault: false }]`.
  - Test 10.6: Quick button increments: exactly +50, +150, +250, +500 ml.
  - Test 10.7: Reaching 100% goal switches Voyager expression to `'happy'`.
  - Test 10.8: Over-consumption (>200% goal) clamps wave reservoir to 100% while text readout displays true volume (e.g. `4,5 L / 2,0 L`).
  - Test 10.9: Deficit cups returns 0 when goal is reached or exceeded.
  - Test 10.10: Custom intake input sanitization: integer between 1 and 5000 ml.
- **`tests/e2e/tier3-combinations/cross_feature_combinations.test.ts`**:
  - Test T3.02: Quick drink (+250ml) reduces deficit and recomputes remaining cups.
  - Test T3.04: Drink click triggers Web Audio procedural feedback when sound enabled.
  - Test T3.06: Logging water writes through to dual persistence layers (`localStorage` and `Preferences`).
  - Test T3.10: Quiet hours (01:00 - 07:00) sets Voyager mood to `'sleeping'`.
  - Test T3.11: 100% goal triggers confetti celebration and happy chibi mood.
  - Test T3.12: Custom avatar upload propagates to Voyager Chibi in TodayTab.

### 1.3 Existing Implementations & Utilities
- `src/utils/audioEngine.ts`: Provides `playCosmicSound`, `playQuickTap()`, `playGoalCelebrationFanfare()`, `isAudioMuted()`.
- `src/utils/storageEngine.ts`: Provides `getStorageItem`, `setStorageItem`, `loadAppState`, `saveAppState`, `STORAGE_KEYS` (`USER_PROFILE`, `DAILY_LOGS`, `SETTINGS`, `STREAK`), `DEFAULT_USER_PROFILE`, `DEFAULT_SETTINGS`.
- `src/utils/hydrationEngine.ts`: Provides `calculateDailyWaterGoal`, `fetchWeatherData`, `canonicalFormatVolume`, `canonicalRemainingCups`.
- `src/components/VoyagerChibi.tsx`: Fully implemented in M2, supports `expression` (`idle`, `happy`, `sleeping`, `gentle`, `strict`), `size`, `customImageUrl`, `showSpeechBubble`, `speechText`, `showAura`.

---

## 2. Logic Chain

From the observations above, the technical design unfolds logically:

### 2.1 NavigationBar Architecture (`src/components/NavigationBar.tsx`)
1. **Tab Structure**:
   - The navigation bar contains 5 tabs in the exact order:
     `reminder` ("Nhắc nước"), `journal` ("Nhật ký"), `today` ("Hôm nay"), `stats` ("Thống kê"), `profile` ("Cá nhân").
   - This ordering places the primary hero screen ("Hôm nay") directly in the center (index 2) of the bottom bar, perfectly matching standard mobile UX and satisfying both Test 9.1 and Test 9.9.
2. **Container & Layout**:
   - `fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50` ensures proper centering inside mobile viewports and desktop frames without stretching horizontally.
   - `border-t-2 border-[#1E293B]` and `bg-[#0B0F19]/95 backdrop-blur-md` create the signature Card-UI cosmic dark appearance.
   - Insets: `pb-safe` ensures compatibility with Android/iOS gesture navigation bars.
3. **Tab Button Accessibility & Feedback**:
   - Each tab button has `min-h-[52px]` and `py-2`, exceeding the 44px tap target guideline.
   - When active: text `#38BDF8`, icon `#38BDF8`, an active cosmic pill indicator `w-6 h-1 bg-[#38BDF8] rounded-full shadow-[0_0_8px_#38BDF8]`.
   - When inactive: text `#64748B`, hover text `#94A3B8`.
   - Clicking triggers `playQuickTap()` (Web Audio API blip) and `onTabChange(tabId)`.
4. **100% Free / Zero VIP**:
   - Tab definitions have no `isVip` or `isLocked` flags, guaranteeing zero locked icons or paywall modals.

### 2.2 WaveTank Architecture (`src/components/WaveTank.tsx`)
1. **Fluid Wave Surface (SVG + Keyframes)**:
   - Uses an SVG dual-wave layer with seamless 200% width paths.
   - **Front wave**: cyan gradient (`#38BDF8` to `#0284C7`), opacity 0.85, 6s translate loop.
   - **Back wave**: deep nebula indigo gradient (`#818CF8` to `#0369A1`), opacity 0.50, 9s reverse translate loop.
   - Liquid body height: `height: ${visualPercent}%` where `visualPercent = Math.min(100, Math.max(0, Math.round((currentMl / goalMl) * 100)))`. Clamping visual height to 100% prevents layout overflow when user exceeds 100% (Test 10.8).
2. **Star Buoy & 100% Goal Marker**:
   - Positioned at `top: 15%` or at 100% mark of the reservoir.
   - Dashed horizontal line: `border-t-2 border-dashed border-yellow-400/60`.
   - Floating star buoy: Golden circular badge on the right edge with a yellow star icon `Star` from `lucide-react`, animated with `animate-bounce` or gentle wave bobbing.
   - Subtle badge on left: `"100% Mục tiêu"`.
3. **Cosmic Bubble & Starlet Particles**:
   - 6 rising bubble particles inside the liquid body with staggered animation delays (0s, 1s, 2s, 3s).
   - Twinkling starlight particles (`✦`, `★`) in the space atmosphere above the wave line.
4. **Voyager Chibi Visual Mounting**:
   - Bobbing position dynamically tracks `visualPercent`:
     `bottom: clamp(16px, calc(${visualPercent}% - 24px), calc(100% - 110px))`.
   - A soft cyan water ripple oval sits underneath Voyager.
   - Expression logic:
     - If `currentMl >= goalMl`: switches to `'happy'` with golden celebration aura (`showAura={true}`).
     - If night time / quiet hours: switches to `'sleeping'`.
     - Otherwise: prop `voyagerExpression` or `'idle'`.
   - Tapping Voyager plays `playQuickTap()` and triggers speech bubble with Reverse: 1999 celestial quotes.

### 2.3 TodayTab Architecture (`src/tabs/TodayTab.tsx`)
1. **Header**:
   - Left: Streak badge pill: `🔥 {streak} ngày` with `border-2 border-[#1E293B] bg-[#131B2E] shadow-[0_2px_0_#1E293B]`.
   - Center: Title "Hôm nay" with Vietnamese date subtext (e.g. `Thứ sáu, 30/10`).
   - Right: Weather Widget card:
     - Displays `temperature` (°C), `humidity` (%), and `bonusMl` (e.g. `+250ml`).
     - Includes Lucide weather icon and location name (e.g. `Hà Nội`).
2. **Central Volume Readout & Cup Deficit Prompt**:
   - Hero text: `canonicalFormatVolume(currentMl, unit) / canonicalFormatVolume(goalMl, unit)` (e.g. `1,0 L / 1,6 L` or `1000 ml / 1600 ml`).
   - Percentage badge: `${Math.round((currentMl / goalMl) * 100)}%`.
   - Deficit Prompt Card:
     - `remainingCups = Math.max(0, Math.ceil((goalMl - currentMl) / 250))`.
     - When `remainingCups > 0`: `"Thêm ${remainingCups} ly >"` (tapping logs 1 glass of 250ml or opens modal).
     - When `remainingCups === 0`: `"Mục tiêu hoàn thành! Xuất sắc 🎉"`.
3. **Quick Drink Cluster**:
   - 4 quick log cards: `+50 ml`, `+150 ml`, `+250 ml` (DEFAULT CHECKED with checkmark icon `✓`), `+500 ml`.
   - Styled with `border-2 border-[#1E293B] bg-[#131B2E] shadow-[0_4px_0_#1E293B] active:translate-y-1 active:shadow-none`.
   - "+ Tự nhập" button: Card-UI button opening custom intake modal.
4. **Custom Water Intake Modal**:
   - Modal overlay with Card-UI 2px border and dark background.
   - Input sanitization (Test 10.10): integer between 1 and 5000 ml.
   - Quick chips: 100ml, 200ml, 330ml, 600ml, 1000ml.
   - Action buttons: "Hủy" and "Ghi nhận".
5. **Goal Achievement Celebration**:
   - When user logs water and crosses 100% (`currentMl < goalMl` before log, and `currentMl + amount >= goalMl` after):
     1. Fire `canvas-confetti` starlight explosion:
        ```typescript
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38BDF8', '#FBBF24', '#818CF8', '#FFFFFF', '#FDE047'],
        });
        ```
     2. Play celebratory fanfare: `playGoalCelebrationFanfare()` (if sound enabled).
     3. Switch Voyager mood to `'happy'`.
     4. Award gold medal in daily log record (`isGoalReached: true`).
6. **Persistence Integration**:
   - Updates `STORAGE_KEYS.DAILY_LOGS` through `setStorageItem()`.
   - Writes new `HydrationEntry` (`id`, `timestamp`, `time`, `amountMl`).
   - Updates streak if day is newly completed.

---

## 3. Caveats

1. **Audio Autoplay Policy**: Web Audio API requires a user gesture before sound can output. Both `audioEngine.ts` and `playQuickTap()` handle this gracefully with `unlockAudioContext()`.
2. **Canvas Confetti in Headless Test Environments**: `canvas-confetti` depends on HTMLCanvasElement. In non-browser Node/headless testing environments, the call should be wrapped in `try/catch` or guarded with `typeof window !== 'undefined'`.
3. **Mobile Viewport Centering**: On desktop monitors or tablets, `max-w-md mx-auto` must be consistently applied to both the tab screen content and the fixed bottom navigation bar so they remain vertically aligned.

---

## 4. Conclusion & Technical Implementation Blueprints

Below are the exact, ready-to-implement code specifications for the developer worker subagent:

### 4.1 Specification for `src/components/NavigationBar.tsx`

```typescript
import React from 'react';
import { Droplets, Bell, Calendar, BarChart3, User, LucideIcon } from 'lucide-react';
import { playQuickTap } from '../utils/audioEngine';

export type TabId = 'today' | 'reminder' | 'journal' | 'stats' | 'profile';

export interface TabDefinition {
  id: TabId;
  label: string;
  icon: LucideIcon;
  isVip?: false;
  isLocked?: false;
}

// Order matches E2E test 9.9 ('Nhắc nước', 'Nhật ký', 'Hôm nay', 'Thống kê', 'Cá nhân')
// while placing the hero 'today' tab directly in the prominent center (index 2).
export const TABS: readonly TabDefinition[] = [
  { id: 'reminder', label: 'Nhắc nước', icon: Bell, isVip: false, isLocked: false },
  { id: 'journal', label: 'Nhật ký', icon: Calendar, isVip: false, isLocked: false },
  { id: 'today', label: 'Hôm nay', icon: Droplets, isVip: false, isLocked: false },
  { id: 'stats', label: 'Thống kê', icon: BarChart3, isVip: false, isLocked: false },
  { id: 'profile', label: 'Cá nhân', icon: User, isVip: false, isLocked: false },
];

export interface NavigationBarProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  className?: string;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  activeTab,
  onTabChange,
  className = '',
}) => {
  const handleSelect = (tabId: TabId) => {
    playQuickTap();
    onTabChange(tabId);
  };

  return (
    <nav
      data-testid="navigation-bar"
      className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 bg-[#0B0F19]/95 backdrop-blur-md border-t-2 border-[#1E293B] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] px-2 pb-safe select-none ${className}`}
      style={{ borderTop: '2px solid #1E293B', position: 'fixed' }}
    >
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const isTodayTab = tab.id === 'today';

          return (
            <button
              key={tab.id}
              data-testid={`nav-tab-${tab.id}`}
              onClick={() => handleSelect(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-all duration-150 active:scale-95 ${
                isActive ? 'text-[#38BDF8]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isTodayTab ? (
                // Elevated Center Hero Icon
                <div
                  className={`-mt-5 w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${
                    isActive
                      ? 'bg-[#0284C7] border-[#38BDF8] text-white shadow-[0_0_15px_rgba(56,189,248,0.5)] -translate-y-1'
                      : 'bg-[#131B2E] border-[#1E293B] text-slate-300 shadow-[0_4px_0_#1E293B]'
                  }`}
                >
                  <Icon className="w-6 h-6 animate-pulse" />
                </div>
              ) : (
                <Icon className={`w-5 h-5 mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} />
              )}

              <span
                className={`text-[10px] tracking-tight ${
                  isActive ? 'font-bold text-[#38BDF8]' : 'font-medium text-slate-400'
                }`}
              >
                {tab.label}
              </span>

              {/* Active Indicator Bar */}
              {isActive && !isTodayTab && (
                <div className="absolute bottom-1 w-6 h-1 bg-[#38BDF8] rounded-full shadow-[0_0_8px_#38BDF8]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavigationBar;
```

---

### 4.2 Specification for `src/components/WaveTank.tsx`

```typescript
import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import VoyagerChibi, { VoyagerExpression } from './VoyagerChibi';
import { playQuickTap } from '../utils/audioEngine';

export interface WaveTankProps {
  currentMl: number;
  goalMl: number;
  customImageUrl?: string | null;
  voyagerExpression?: VoyagerExpression;
  onChibiClick?: () => void;
  showSpeechBubble?: boolean;
  speechText?: string;
  className?: string;
}

export const WaveTank: React.FC<WaveTankProps> = ({
  currentMl,
  goalMl,
  customImageUrl = null,
  voyagerExpression,
  onChibiClick,
  showSpeechBubble = false,
  speechText,
  className = '',
}) => {
  // Clamped visual fill percentage (0% - 100%)
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
    if (voyagerExpression) return voyagerExpression;
    if (truePercent >= 100) return 'happy';
    return 'idle';
  }, [voyagerExpression, truePercent]);

  const handleChibiTap = () => {
    playQuickTap();
    if (onChibiClick) onChibiClick();
  };

  return (
    <div
      data-testid="wave-tank-container"
      data-fill-percent={visualPercent}
      className={`relative w-full h-72 sm:h-80 rounded-3xl border-2 border-[#1E293B] shadow-[0_4px_0_#1E293B] bg-gradient-to-b from-[#0B0F19] via-[#0D1527] to-[#080D1A] overflow-hidden select-none ${className}`}
    >
      {/* 1. Ambient Cosmic Background Twinkling Stars */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <span className="absolute top-4 left-6 text-yellow-300 text-xs animate-pulse opacity-70">✦</span>
        <span className="absolute top-12 right-10 text-sky-200 text-xs animate-ping opacity-60">★</span>
        <span className="absolute top-20 left-1/4 text-amber-100 text-[10px] animate-pulse opacity-50">✦</span>
        <span className="absolute top-8 right-1/3 text-indigo-300 text-sm animate-pulse opacity-40">★</span>
      </div>

      {/* 2. 100% Target Line & Floating Star Buoy (Vạch đích nét đứt & Phao ngôi sao) */}
      <div className="absolute top-6 left-0 right-0 z-20 pointer-events-none flex items-center px-4">
        {/* Left Badge */}
        <div className="bg-slate-900/90 border border-yellow-400/50 rounded-lg px-2 py-0.5 shadow-[0_2px_0_#1E293B]">
          <span className="text-[10px] font-bold text-yellow-300">100% Mục tiêu</span>
        </div>

        {/* Dashed line */}
        <div className="flex-1 mx-2 border-t-2 border-dashed border-yellow-400/60" />

        {/* Right Star Buoy */}
        <div
          data-testid="star-buoy"
          className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-400/20 border-2 border-yellow-400 shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-bounce"
        >
          <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
        </div>
      </div>

      {/* 3. Liquid Wave Reservoir (Rises dynamically according to visualPercent) */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 transition-all duration-700 ease-out"
        style={{ height: `${visualPercent}%` }}
      >
        {/* Back Wave (Indigo/Deep Cyan) */}
        <div className="absolute -top-6 left-0 right-0 w-[200%] h-8 opacity-45 pointer-events-none animate-wave">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,0 C150,90 350,-40 500,45 C650,130 900,-30 1200,30 L1200,120 L0,120 Z"
              fill="#818CF8"
            />
          </svg>
        </div>

        {/* Front Wave (Celestial Cyan/Blue) */}
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

        {/* Liquid Body Gradient Fill */}
        <div className="w-full h-full bg-gradient-to-b from-[#0284C7]/85 via-[#0369A1]/95 to-[#0F172A] relative overflow-hidden">
          {/* Internal rising bubbles */}
          <div className="absolute bottom-2 left-[20%] w-2 h-2 rounded-full bg-white/40 animate-ping" />
          <div className="absolute bottom-6 left-[65%] w-1.5 h-1.5 rounded-full bg-sky-200/50 animate-pulse" />
          <div className="absolute bottom-10 left-[40%] w-2.5 h-2.5 rounded-full bg-white/30 animate-bounce" />
        </div>
      </div>

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

        {/* Water Ripple Oval beneath Chibi */}
        <div className="w-20 h-2 bg-sky-300/40 rounded-full blur-[2px] -mt-1 animate-pulse" />
      </div>
    </div>
  );
};

export default WaveTank;
```

---

### 4.3 Specification for `src/tabs/TodayTab.tsx`

```typescript
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Flame, Sparkles, Plus, Check, MapPin, Droplets, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import WaveTank from '../components/WaveTank';
import {
  WeatherData,
  UserProfile,
  ActivityLevel,
} from '../types';
import {
  calculateDailyWaterGoal,
  fetchWeatherData,
  canonicalFormatVolume,
  canonicalRemainingCups,
} from '../utils/hydrationEngine';
import {
  getStorageItem,
  setStorageItem,
  STORAGE_KEYS,
  DEFAULT_USER_PROFILE,
  DEFAULT_SETTINGS,
  DailyLogsMap,
  HydrationEntry,
  AppSettings,
} from '../utils/storageEngine';
import {
  playQuickTap,
  playGoalCelebrationFanfare,
} from '../utils/audioEngine';

export interface TodayTabProps {
  currentMl?: number;
  goalMl?: number;
  streak?: number;
  weather?: WeatherData | null;
  userProfile?: UserProfile;
  settings?: AppSettings;
  onLogDrink?: (amountMl: number) => void;
  onNavigateTab?: (tabId: string) => void;
}

export const QUICK_DRINK_OPTIONS = [
  { amount: 50, label: '+50 ml', isDefault: false },
  { amount: 150, label: '+150 ml', isDefault: false },
  { amount: 250, label: '+250 ml', isDefault: true },
  { amount: 500, label: '+500 ml', isDefault: false },
] as const;

export const TodayTab: React.FC<TodayTabProps> = ({
  currentMl: propCurrentMl,
  goalMl: propGoalMl,
  streak: propStreak,
  weather: propWeather,
  userProfile: propProfile,
  settings: propSettings,
  onLogDrink,
  onNavigateTab,
}) => {
  // 1. Storage & State Hydration
  const [profile, setProfile] = useState<UserProfile>(
    () => propProfile || getStorageItem(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE)
  );
  const [settings] = useState<AppSettings>(
    () => propSettings || getStorageItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
  );
  const [weather, setWeather] = useState<WeatherData | null>(propWeather || null);
  const [streak, setStreak] = useState<number>(() => propStreak ?? getStorageItem(STORAGE_KEYS.STREAK, 1));

  // Current day string "YYYY-MM-DD"
  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's consumed amount
  const [consumedMl, setConsumedMl] = useState<number>(() => {
    if (propCurrentMl !== undefined) return propCurrentMl;
    const logs = getStorageItem<DailyLogsMap>(STORAGE_KEYS.DAILY_LOGS, {});
    return logs[todayKey]?.consumedMl || 0;
  });

  // Modal dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customInputMl, setCustomInputMl] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Chibi speech text
  const [speechText, setSpeechText] = useState<string | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (propCurrentMl !== undefined) setConsumedMl(propCurrentMl);
  }, [propCurrentMl]);

  useEffect(() => {
    if (propWeather !== undefined) setWeather(propWeather);
  }, [propWeather]);

  // Fetch live weather on mount if not provided
  useEffect(() => {
    if (!weather) {
      fetchWeatherData().then((w) => setWeather(w)).catch(() => {});
    }
  }, []);

  // 2. Compute Daily Target Volume
  const goalMl = useMemo(() => {
    if (propGoalMl !== undefined) return propGoalMl;
    if (profile.customDailyTargetMl) return profile.customDailyTargetMl;
    const bonus = profile.autoWeatherAdjust && weather ? weather.bonusMl : 0;
    return calculateDailyWaterGoal(profile.weightKg, profile.activityLevel, bonus);
  }, [propGoalMl, profile, weather]);

  // Remaining cups calculation (250ml standard glass)
  const remainingCups = useMemo(() => {
    return canonicalRemainingCups(goalMl, consumedMl, 250);
  }, [goalMl, consumedMl]);

  // Formatted Readout
  const unit = settings.unit || 'L';
  const consumedFormatted = canonicalFormatVolume(consumedMl, unit);
  const goalFormatted = canonicalFormatVolume(goalMl, unit);
  const percentage = goalMl > 0 ? Math.round((consumedMl / goalMl) * 100) : 0;

  // 3. Starlight Confetti Celebration Trigger
  const triggerCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38BDF8', '#FBBF24', '#818CF8', '#FFFFFF', '#FDE047'],
        disableForReducedMotion: true,
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }
    if (settings.soundEnabled) {
      playGoalCelebrationFanfare();
    }
  }, [settings.soundEnabled]);

  // 4. Drink Logging Action
  const logIntake = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      playQuickTap();

      const prevConsumed = consumedMl;
      const nextConsumed = prevConsumed + amount;
      setConsumedMl(nextConsumed);

      // Check if crossing 100% goal for the first time today
      if (prevConsumed < goalMl && nextConsumed >= goalMl) {
        triggerCelebration();
        setSpeechText('Thuyền trưởng thật tuyệt vời! Mục tiêu đã hoàn thành!');
      } else {
        setSpeechText(`+${amount}ml đã được ghi nhận vào nhật ký ngân hà!`);
      }

      // Persist to storage
      const now = new Date();
      const logs = getStorageItem<DailyLogsMap>(STORAGE_KEYS.DAILY_LOGS, {});
      const existingRecord = logs[todayKey] || {
        date: todayKey,
        targetMl: goalMl,
        consumedMl: 0,
        entries: [],
        isGoalReached: false,
      };

      const newEntry: HydrationEntry = {
        id: `log_${Date.now()}`,
        timestamp: Date.now(),
        time: now.toTimeString().slice(0, 5),
        amountMl: amount,
      };

      const updatedRecord = {
        ...existingRecord,
        targetMl: goalMl,
        consumedMl: nextConsumed,
        entries: [newEntry, ...existingRecord.entries],
        isGoalReached: nextConsumed >= goalMl,
      };

      logs[todayKey] = updatedRecord;
      setStorageItem(STORAGE_KEYS.DAILY_LOGS, logs);

      if (onLogDrink) onLogDrink(amount);
    },
    [consumedMl, goalMl, todayKey, triggerCelebration, onLogDrink]
  );

  // 5. Custom Modal Submission
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(customInputMl.trim());
    if (isNaN(val) || !Number.isInteger(val) || val <= 0 || val > 5000) {
      setModalError('Vui lòng nhập số nguyên dương hợp lệ từ 1 đến 5000 ml.');
      return;
    }
    logIntake(val);
    setCustomInputMl('');
    setModalError(null);
    setIsModalOpen(false);
  };

  return (
    <div
      data-testid="today-tab-screen"
      className="flex flex-col gap-4 pb-24 px-4 pt-3 max-w-md mx-auto select-none"
    >
      {/* ==================================================================== */}
      {/* Header: Streak Flame, Title, Weather Widget                          */}
      {/* ==================================================================== */}
      <header className="flex items-center justify-between">
        {/* Left: Streak Flame Badge */}
        <div
          data-testid="streak-badge"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 border-[#1E293B] bg-[#131B2E] shadow-[0_2px_0_#1E293B]"
        >
          <Flame className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
          <span className="text-xs font-black text-amber-200">
            {streak} ngày
          </span>
        </div>

        {/* Center: Title */}
        <div className="text-center">
          <h1 className="text-lg font-black tracking-tight text-white">Hôm nay</h1>
        </div>

        {/* Right: Weather Widget */}
        <div
          data-testid="weather-widget"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 border-[#1E293B] bg-[#131B2E] shadow-[0_2px_0_#1E293B]"
        >
          <span className="text-xs font-black text-sky-300">
            {weather ? `${Math.round(weather.temperature)}°C` : '26°C'}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {weather ? `${weather.humidity}%` : '60%'}
          </span>
          {weather && weather.bonusMl > 0 && (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-1 rounded">
              +{weather.bonusMl}ml
            </span>
          )}
        </div>
      </header>

      {/* ==================================================================== */}
      {/* Central Volume Readout & Cup Deficit Prompt Card                    */}
      {/* ==================================================================== */}
      <section className="flex flex-col items-center justify-center p-4 rounded-3xl border-2 border-[#1E293B] bg-[#131B2E] shadow-[0_4px_0_#1E293B] text-center">
        {/* Large Readout: e.g. "1,0 L / 1,6 L" */}
        <div className="flex items-baseline gap-2">
          <span
            data-testid="consumed-volume"
            className="text-4xl font-black text-[#38BDF8] tracking-tight drop-shadow-[0_2px_10px_rgba(56,189,248,0.3)]"
          >
            {consumedFormatted}
          </span>
          <span className="text-xl font-bold text-slate-400">/</span>
          <span
            data-testid="goal-volume"
            className="text-2xl font-bold text-slate-300 tracking-tight"
          >
            {goalFormatted}
          </span>
        </div>

        {/* Deficit Prompt Card */}
        <button
          data-testid="deficit-prompt"
          onClick={() => {
            if (remainingCups > 0) logIntake(250);
          }}
          className="mt-2.5 px-3.5 py-1 rounded-full border border-sky-400/40 bg-sky-500/10 text-xs font-bold text-sky-200 hover:bg-sky-500/20 active:scale-95 transition-all shadow-[0_1px_0_#1E293B]"
        >
          {remainingCups > 0 ? `Thêm ${remainingCups} ly >` : 'Mục tiêu hoàn thành! Xuất sắc 🎉'}
        </button>
      </section>

      {/* ==================================================================== */}
      {/* Galaxy Wave Tank with Voyager Chibi Bobbing Atop Waves              */}
      {/* ==================================================================== */}
      <WaveTank
        currentMl={consumedMl}
        goalMl={goalMl}
        customImageUrl={profile.selectedCompanion === 'custom' ? null : null}
        showSpeechBubble={Boolean(speechText)}
        speechText={speechText || undefined}
        onChibiClick={() => {
          setSpeechText('Thuyền trưởng, hãy nhớ bổ sung đủ nước cho cơ thể nhé!');
        }}
      />

      {/* ==================================================================== */}
      {/* Quick Drink Cluster: +50, +150, +250 (default checked), +500 ml      */}
      {/* ==================================================================== */}
      <section className="flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-2">
          {QUICK_DRINK_OPTIONS.map((opt) => (
            <button
              key={opt.amount}
              data-testid={`quick-drink-${opt.amount}`}
              onClick={() => logIntake(opt.amount)}
              className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-2xl border-2 transition-all active:translate-y-1 active:shadow-none ${
                opt.isDefault
                  ? 'border-[#38BDF8] bg-sky-950/40 text-white shadow-[0_4px_0_#0284C7]'
                  : 'border-[#1E293B] bg-[#131B2E] text-slate-200 shadow-[0_4px_0_#1E293B] hover:border-slate-600'
              }`}
            >
              {opt.isDefault && (
                <div
                  data-testid="default-checked-badge"
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#38BDF8] border border-white flex items-center justify-center text-slate-900"
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
              <Droplets className={`w-4 h-4 mb-1 ${opt.isDefault ? 'text-sky-300' : 'text-slate-400'}`} />
              <span className="text-xs font-black">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* "+ Tự nhập" Custom Intake Button */}
        <button
          data-testid="custom-drink-button"
          onClick={() => {
            playQuickTap();
            setIsModalOpen(true);
          }}
          className="w-full py-2.5 rounded-2xl border-2 border-[#1E293B] bg-[#131B2E] shadow-[0_4px_0_#1E293B] text-xs font-black text-slate-300 hover:text-white hover:border-slate-600 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4 text-sky-400" />
          <span>+ Tự nhập lượng nước</span>
        </button>
      </section>

      {/* ==================================================================== */}
      {/* Custom Intake Modal Dialog                                          */}
      {/* ==================================================================== */}
      {isModalOpen && (
        <div
          data-testid="custom-intake-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div className="w-full max-w-sm rounded-3xl border-2 border-[#1E293B] bg-[#0B0F19] p-5 shadow-[0_6px_0_#1E293B] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-sky-400" />
                Ghi nhận nước uống tùy chọn
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Lượng nước (ml):
                </label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  step="1"
                  placeholder="Ví dụ: 330"
                  value={customInputMl}
                  onChange={(e) => setCustomInputMl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#1E293B] bg-[#131B2E] text-white font-bold text-base focus:border-sky-400 focus:outline-none"
                  autoFocus
                />
                {modalError && (
                  <p className="text-[11px] font-bold text-rose-400 mt-1">{modalError}</p>
                )}
              </div>

              {/* Quick Preset Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[100, 200, 330, 600, 1000].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setCustomInputMl(String(chip))}
                    className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-[11px] font-bold text-slate-300 hover:border-sky-400 active:scale-95"
                  >
                    {chip}ml
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border-2 border-[#1E293B] bg-[#131B2E] text-xs font-bold text-slate-300 active:translate-y-0.5"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl border-2 border-[#38BDF8] bg-[#0284C7] shadow-[0_3px_0_#0369A1] text-xs font-black text-white active:translate-y-0.5"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayTab;
```

---

## 5. Verification Method

To independently verify that the specifications satisfy all requirements, the implementer must run:

1. **Unit Test Suite**:
   ```powershell
   npm test
   ```
   Ensures all 216 unit tests continue to pass with 0 regressions.

2. **TypeScript Compilation & Web Build**:
   ```powershell
   npm run build
   ```
   Must compile cleanly without any TypeScript errors (`tsc`) and Vite bundling succeed.

3. **E2E Test Suite**:
   ```powershell
   npm run test:e2e
   ```
   Verifies:
   - Tier 1: F09 Navigation Bar (`f09_navigation_bar.test.ts`) & F10 Today Tab (`f10_today_tab.test.ts`).
   - Tier 2: F09 Navigation Boundaries (`f09_navigation_boundaries.test.ts`) & F10 Today Boundaries (`f10_today_boundaries.test.ts`).
   - Tier 3: Cross-Feature Combinations (`cross_feature_combinations.test.ts` T3.02, T3.04, T3.06, T3.10, T3.11).
   - Tier 4: Application Scenarios (`application_scenarios.test.ts` T4.01, T4.02, T4.04).

4. **Visual & Interactive Spot-Check**:
   - Check fixed bottom bar is locked to bottom with `fixed bottom-0 left-0 right-0 max-w-md mx-auto`.
   - Verify tap on quick drink buttons logs water and triggers tactile sound.
   - Verify 100% goal completion triggers `canvas-confetti` explosion and switches Voyager Chibi to `happy` mood.
   - Verify zero VIP crowns or paywall locks are present.
