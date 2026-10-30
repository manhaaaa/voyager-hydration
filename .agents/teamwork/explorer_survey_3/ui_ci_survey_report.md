# Voyager's Cosmic Hydration — UI/UX, Component Architecture & CI/CD Specification Report

**Document ID**: `UI-CI-SURVEY-003`  
**Date**: 2026-10-30  
**Author**: teamwork_explorer (`explorer_survey_3`)  
**Target Project**: Voyager's Cosmic Hydration (Reverse: 1999 Theme)  
**Status**: APPROVED SPECIFICATION  

---

## 1. Executive Summary

This specification establishes the complete visual design system, component hierarchy, screen-by-screen UX specifications, sound synthesis architecture, and CI/CD GitHub Actions build pipeline for **Voyager's Cosmic Hydration**.

The visual language follows a playful yet sophisticated **Card-UI** philosophy characterized by deep 2px `#1E293B` slate borders, high-contrast cosmic palettes, smooth micro-animations, and 100% unlocked content (zero VIP gates, zero paywalls). All components are designed for high fidelity on mobile devices via Capacitor Android while running seamlessly in modern web browsers.

---

## 2. Card-UI Design System & Style Tokens

### 2.1 Design Philosophy & Visual Signatures
1. **Bold Card Borders**: Every interactive component, metric card, navigation bar, and dialog utilizes a high-contrast `2px solid #1E293B` (Tailwind `border-slate-800`).
2. **Tactile Elevation & Depth**: Soft bottom drop shadow (`box-shadow: 0 4px 0 #1E293B`) on buttons that depress upon tap (`active:translate-y-1 active:shadow-none`), providing a satisfying tactile feedback reminiscent of retro arcade or premium physical buttons.
3. **Cosmic Palette**:
   - Primary Galactic Blue: `#0284C7` (Sky-600) / `#38BDF8` (Sky-400)
   - Cosmic Navy & Night Sky: `#0F172A` (Slate-900) / `#1E293B` (Slate-800) / `#0A0E1A` (Deep Void)
   - Starlight Gold & Flame Accent: `#F59E0B` (Amber-500) / `#FBBF24` (Amber-400) / `#FEF08A` (Yellow-200)
   - Nebula Violet: `#8B5CF6` (Violet-500) / `#A78BFA` (Violet-400)
   - Clean Background Canvas: `#F8FAFC` (Slate-50) with subtle starry stippling or gradients.
4. **Zero Paywalls (100% Free Policy)**:
   - All VIP crowns, paywall modals, and lock icons present in traditional commercial apps (like the reference Glubbo app) are permanently eliminated.
   - All 6 companions and 4 space themes are unlocked by default.
   - The top-right crown in header is replaced with a functional **Live Weather & Hydration Bonus Widget**.

### 2.2 Tailwind CSS Configuration (`tailwind.config.js`)
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmic: {
          void: '#0A0E1A',
          dark: '#0F172A',
          border: '#1E293B',
          card: '#FFFFFF',
          sky: '#38BDF8',
          blue: '#0284C7',
          deep: '#0369A1',
          gold: '#F59E0B',
          amber: '#FBBF24',
          star: '#FEF08A',
          violet: '#8B5CF6',
          nebula: '#A78BFA',
          canvas: '#F8FAFC',
        }
      },
      borderWidth: {
        '2': '2px',
        '3': '3px',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'card-border': '0 4px 0 #1E293B',
        'card-border-sm': '0 2px 0 #1E293B',
        'card-border-lg': '0 6px 0 #1E293B',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        wave: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        bubble: {
          '0%': { transform: 'translateY(100%) scale(0.5)', opacity: '0.2' },
          '50%': { opacity: '0.8' },
          '100%': { transform: 'translateY(-20%) scale(1.2)', opacity: '0' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        }
      },
      animation: {
        float: 'float 3.5s ease-in-out infinite',
        wave: 'wave 8s linear infinite',
        bubble: 'bubble 4s ease-in infinite',
        twinkle: 'twinkle 2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
```

### 2.3 Global Layout & Fixed Bottom Navigation Bar
The viewport is optimized for mobile aspect ratios (`max-w-md mx-auto min-h-screen relative pb-24 font-sans text-slate-800 bg-slate-50 selection:bg-sky-200`).

The **Fixed Bottom Navigation Bar** anchors the user experience across 5 dedicated views:
```tsx
// Fixed Bottom Bar Architecture
<nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t-2 border-[#1E293B] px-2 py-2 flex justify-around items-center z-50 shadow-lg">
  {TABS.map((tab) => {
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className="flex flex-col items-center justify-center flex-1 py-1 transition-transform active:scale-90"
      >
        <tab.Icon className={`w-6 h-6 stroke-[2.2] ${isActive ? 'text-[#0284C7]' : 'text-slate-400'}`} />
        <span className={`text-[11px] mt-1 font-bold ${isActive ? 'text-[#1E293B]' : 'text-slate-400'}`}>
          {tab.label}
        </span>
        {isActive && <div className="h-1 w-7 bg-[#0284C7] rounded-full mt-0.5" />}
      </button>
    );
  })}
</nav>
```

| Tab ID | Vietnamese Label | English Meaning | Lucide Icon | Core Purpose |
|---|---|---|---|---|
| `reminder` | **Nhắc nước** | Reminder | `Bell` | Countdown timer, smart modes, quiet hours, sound tests |
| `journal` | **Nhật ký** | Journal | `BookOpen` | Monthly calendar grid, intake cup levels, gold medals, streak |
| `today` | **Hôm nay** | Today (Default) | `Droplets` | Streak badge, weather widget, galaxy water tank, quick log |
| `stats` | **Thống kê** | Statistics | `BarChart2` | Week/Month/Custom chart, daily target line, mini Voyager atop column |
| `profile` | **Cá nhân** | Profile | `Settings` | User avatar, custom image upload, body metrics, companions, themes, data export |

---

## 3. Voyager Chibi Component Architecture (`src/components/VoyagerChibi.tsx`)

### 3.1 Character Canon & Lore Elements
Voyager is the cosmic celestial traveler from *Reverse: 1999*. The Chibi representation captures her iconic design cues:
- **Hair**: Lustrous cosmic navy-teal locks braided with glowing golden starlight beads.
- **Sailor Hat & Star Halo**: White crisp sailor cap crowned with a multifaceted golden star diadem.
- **Star Cape**: Translucent stardust mantle depicting the constellations of the deep cosmos.
- **Cosmic Star Violin & Bow**: An astral translucent violin through which Voyager plays the harmonies of the universe.
- **Footwear**: Starlight white boots adorned with golden stellar spurs.

### 3.2 5 Expression States
The component accepts a `state` prop supporting 5 dynamic emotional expressions:
1. `idle`:
   - Serene smiling face, large star-dusted purple-blue eyes, hands gently clasped in front.
   - Gentle floating animation (`animate-float`).
   - Ideal for standard standby in TodayTab and ReminderTab.
2. `happy`:
   - Sparkle eyes (`^ _ ^`), blushing rosy cheeks, joyful celestial sparkles and mini stars radiating outward.
   - Triggered upon logging water and reaching daily 100% goal.
3. `sleeping`:
   - Eyes peacefully closed in sweet slumber (`u _ u`), soft cosmic translucent bubble with floating `Zzz` constellations.
   - Triggered automatically during Quiet Hours (`01:00 - 07:00`) or when inactive.
4. `gentle`:
   - Warm encouraging tilted head, holding a glowing crystalline water drop offering it to the user.
   - Used in the "Nhẹ nhàng" gentle reminder mode.
5. `strict` (Playing Violin):
   - Confident focused expression, holding the star violin with bow gliding across the cosmic strings.
   - Golden musical notes (`♪ ♫ ♩`) drifting upward.
   - Used in "Đều đặn" mode and when water deficit remains high towards evening.

### 3.3 Custom Image / GIF Upload Support
The component supports user personalization. If the user uploads a custom avatar or animated GIF in the Profile tab:
- Checks `customImageUrl` property from store.
- If present, renders the custom image within a double-bordered circular/rounded cosmic frame with star halo ornaments.
- Falls back gracefully to the SVG/PNG Voyager asset if loading fails or URL is null.

### 3.4 Component Interface & Prop Types
```typescript
export type VoyagerExpression = 'idle' | 'happy' | 'sleeping' | 'gentle' | 'strict';

export interface VoyagerChibiProps {
  state?: VoyagerExpression;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  customImageUrl?: string | null;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  showSpeechBubble?: boolean;
  speechText?: string;
}
```

---

## 4. Deep-Dive Specification of the 5 Main Screens

### 4.1 Tab 1: Hôm nay (`src/tabs/TodayTab.tsx`)

#### A. Header Section
- **Left Element — Streak Badge**:
  - Container: `flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border-2 border-[#1E293B] rounded-2xl shadow-card-border-sm`
  - Icon: Animated smiling flame 🔥
  - Text: `{streak} ngày` in bold `text-sm font-extrabold text-[#1E293B]`
- **Center Element — Title**:
  - Text: `Hôm nay` (`text-2xl font-black text-[#1E293B] tracking-tight`)
- **Right Element — Weather Hydration Widget**:
  - Container: `flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border-2 border-[#1E293B] rounded-2xl shadow-card-border-sm cursor-pointer`
  - Display: Weather symbol (☀️ / ⛅ / 🌧️), temperature (`31°C`), humidity (`65%`), and bonus: `+250ml`
  - Click Interaction: Opens modal detailing Open-Meteo GPS coordinates, current temperature, and rationale for the weather bonus.

#### B. Main Water Display & Deficit Prompt
- **Primary Volume Readout**:
  - Display: `<span className="text-5xl font-black text-[#1E293B]">{formatVolume(current)}</span> <span className="text-2xl font-bold text-slate-400">/ {formatVolume(goal)}</span>`
  - Toggle between Liters (`1,0 / 1,6 L`) and Milliliters (`1000 / 1600 ml`).
- **Deficit Prompt**:
  - Calculation: `const deficitCups = Math.ceil(Math.max(0, goal - current) / defaultCupSize);`
  - Display: Pill button `Thêm {deficitCups} ly >` (`text-xs font-bold text-slate-600 bg-slate-100 border border-slate-300 px-3 py-1 rounded-full hover:bg-slate-200 transition-colors`).
  - Clicking automatically prompts a quick 250ml log or opens intake modal.

#### C. Bể Ngân Hà (Cosmic Water Tank)
- **Container**:
  - Sizing: `relative w-full h-80 rounded-3xl border-2 border-[#1E293B] overflow-hidden bg-gradient-to-b from-slate-900 via-sky-950 to-[#0A0E1A] shadow-card-border`
  - Embedded Elements: Starlight dots twinkling in background, seabed cosmic rocks/coral.
- **Dynamic Water Level & Wave Animation**:
  - Fill percentage: `const fillPercentage = Math.min(100, Math.round((current / goal) * 100));`
  - Rising water layer styled with height transition (`transition-all duration-700 ease-out`).
  - Dual SVG sine waves with opposing translation speeds create a lifelike undulating celestial liquid surface.
  - Rising bubbles (`animate-bubble`) floating from tank bottom to surface.
- **Target Dashed Line & Phao Ngôi Sao (Star Float)**:
  - Horizontal line: `absolute top-[18%] left-0 right-0 border-t-2 border-dashed border-sky-300/80 z-20 pointer-events-none`
  - Right marker: Attached wooden/cosmic pole with a bobbing **Star Float** (red/white float or glowing golden star float) keeping vigil at the 100% threshold.
- **Center Character**:
  - Voyager Chibi floats dynamically atop the rising water surface (`transform: translateY(...)`).
  - State dynamically switches to `happy` when `current >= goal`.
  - Tapping Voyager plays a cosmic quote speech bubble ("Bạn đã uống đủ nước chưa, thuyền trưởng?") and a gentle ripple sound.

#### D. Quick Log Action Cluster (Cụm nút bấm)
- **Custom Input Trigger**:
  - Located on right above the 4 cards: `+ Tự nhập` button with `Plus` icon.
  - Opens a clean modal with a numeric input or quick slider for arbitrary amounts (e.g., 330ml, 750ml).
- **4 Quick Buttons (Thẻ nút bấm có viền đậm)**:
  - Grid: `grid grid-cols-4 gap-2.5 mt-4`
  - Cards:
    1. `+50 ml` — Small cup icon (Trà / nước hớp)
    2. `+150 ml` — Mug icon (Cốc cà phê / nước ấm)
    3. `+250 ml` — Tall glass icon (Ly nước chuẩn) — **Default marked with a checkmark badge at top-right**
    4. `+500 ml` — Water bottle icon (Bình thể thao)
  - Styling: `bg-white border-2 border-[#1E293B] rounded-2xl p-2.5 flex flex-col items-center justify-between shadow-card-border hover:bg-sky-50 active:translate-y-1 active:shadow-none transition-all`
- **Celebration Trigger**:
  - Reaching 100% goal triggers `canvas-confetti` starlight explosion with gold and cyan stars, accompanied by the "Violin Tinh cầu" fanfare sound.

---

### 4.2 Tab 2: Nhắc nước (`src/tabs/ReminderTab.tsx`)

#### A. Thẻ Nhắc lần tới (Next Reminder Card)
- **Container**: `border-2 border-[#1E293B] rounded-3xl bg-white p-5 shadow-card-border relative overflow-hidden`
- **Visuals**:
  - Top row: Voyager holding a glowing celestial bell (`Cosmic Bell`).
  - Giant Countdown: `Sau {hours} giờ {minutes} phút` in bold `text-3xl font-black text-[#1E293B]`.
  - Sub-row: "Lần nhắc tiếp theo vào lúc {nextTimeStr}".
- **Master Toggle Switch**:
  - Row: `flex justify-between items-center pt-3 border-t-2 border-slate-100 mt-3`
  - Label: `Nhắc uống nước`
  - Toggle: Custom toggle switch with `#1E293B` border and smooth sliding cyan thumb.
  - When switched on: requests `@capacitor/local-notifications` permission and schedules notification queue.

#### B. Thẻ Cách nhắc (Reminder Modes)
- **3 Option Cards**:
  1. `Nhẹ nhàng`: Feather icon. Infrequent alerts (every 3 hours). Gentle Voyager icon.
  2. `Thông minh` (Default): Clock with star badge. Dynamically calculates interval:
     $$\text{Interval (minutes)} = \frac{\text{Minutes remaining until bedtime}}{\max\left(1, \frac{\text{Deficit ml}}{250\text{ ml}}\right)}$$
     Automatically adapts if user drinks ahead of schedule!
  3. `Đều đặn`: Whistle icon / Violin icon. Strict reminder every 60 or 90 minutes regardless of deficit.
- **Card Selection Style**: Selected card receives a dark navy checkmark badge at top-right and `border-sky-500 bg-sky-50/50` highlight.

#### C. Giờ giấc trong ngày (Schedule & Quiet Hours)
- **Card Layout**: Split grid with `border-2 border-[#1E293B] rounded-3xl bg-white p-4 shadow-card-border`
- **Time Pickers**:
  - `Thức dậy`: Sun icon ☀️, default `07:00` (interactive time selector modal).
  - `Đi ngủ`: Moon icon 🌙, default `01:00` (interactive time selector modal).
- **Giờ yên lặng (Quiet Hours)**:
  - Cloud icon ☁️, displays `01:00 - 07:00`.
  - Explicit guarantee: Notifications are strictly muted during this period to ensure uninterrupted sleep.

#### D. Âm báo (Cosmic Alert Sounds)
- **3 Audio Cards**:
  1. `Gợn nhẹ` (Gentle Ripple): Calming water wave sound.
  2. `Violin Tinh cầu` (Cosmic Violin): Resonant violin harmonic melody.
  3. `Chuông bong bóng` (Bubble Chime): Cascading glassy bubbles.
- **Preview Button**: Each card features a speaker icon button to test the audio instantly via Web Audio API.

---

### 4.3 Tab 3: Nhật ký ngân hà (`src/tabs/JournalTab.tsx`)

#### A. Header & Month Navigation
- **Header**: `Nhật ký ngân hà` with an `(i)` info icon button displaying streak rules and logging tips.
- **Month Selector**:
  - Row: `< tháng 10 năm 2026 >`
  - Prev/Next buttons inside rounded `border-2 border-[#1E293B]` square buttons.

#### B. Monthly Calendar Grid
- **Columns**: 7 columns representing `T2`, `T3`, `T4`, `T5`, `T6`, `T7`, `CN`.
- **Day Cell Design**:
  - Heavy `2px border-[#1E293B]` rounded-2xl aspect-square relative flex flex-col items-center justify-between p-1.5.
  - Active / selected day highlighted with cyan background.
  - Water cup icon representing fill percentage for that historical day.
  - **Gold Medal Badge**: If total logged water for the day $\ge$ that day's goal, a glowing golden medal with checkmark (`🏆` / golden circle badge) is pinned to the top-right of the cup.
  - Tap interaction: Clicking any past day opens a breakdown dialog showing exact log entries (e.g. `08:15: +250ml`, `11:30: +500ml`).

#### C. Chuỗi ngày (Streak Card)
- **Card Design**:
  - `border-2 border-[#1E293B] rounded-3xl bg-white p-5 shadow-card-border flex items-center gap-5`
- **Visuals**:
  - Left: Large smiling flame mascot with rosy cheeks and radiant energy rays.
  - Right:
    - Number: `{streak}` in `text-4xl font-black text-[#1E293B]`
    - Label: `ngày liên tiếp`
    - Subtitle: `Bạn đang giữ nhịp tốt. Hãy cùng Voyager duy trì nhé!`

---

### 4.4 Tab 4: Thống kê (`src/tabs/StatsTab.tsx`)

#### A. Tab Switcher & Time Navigator
- **Segmented Control**: 3-button pill switch with 2px borders:
  - `Tuần` (Week - Active default)
  - `Tháng` (Month)
  - `Tùy chỉnh` (Custom)
- **Date Range Selector**: `< 26/10 - 1/11 >` with arrow navigation.

#### B. Metric Summary Card
- **Two Columns**:
  - Left Column: `{totalWeekLiters} L` / `Tổng`
  - Right Column: `{dailyAverageLiters} / {targetLiters} L` / `Ngày/mục tiêu`

#### C. Bar Chart: Lượng nước mỗi ngày
- **Container**: `border-2 border-[#1E293B] rounded-3xl bg-white p-5 shadow-card-border`
- **Goal Dashed Line**:
  - Horizontal dashed line representing target (e.g. 1.6L) across the chart with a target float marker on the left.
- **7 Daily Water Columns (T2 - CN)**:
  - Each column is styled as a rounded glass cylinder (`rounded-2xl border-2 border-[#1E293B] overflow-hidden bg-slate-100 h-48 relative flex flex-col justify-end`).
  - Filled with animated gradient water and bubbles.
  - **Mini Voyager Chibi**: Sits perched atop the column of the current day or peak day with legs dangling playfully over the water!
  - Amount label (e.g. `1,0`) above the column.
  - Day label (`T2` - `CN`) below the column.

#### D. Bottom Statistics Cards
- **Grid (2 columns)**:
  - Card 1: `Hoàn thành`: displays `{completedDays} / 7 ngày` with a target icon.
  - Card 2: `Chuỗi kỷ lục`: displays `{bestStreak} ngày` with a trophy icon.

---

### 4.5 Tab 5: Cá nhân (`src/tabs/ProfileTab.tsx`)

#### A. Hồ sơ người dùng (User Profile Card)
- **Avatar & Name**:
  - Circular avatar frame with `border-2 border-[#1E293B]` containing Voyager avatar (or custom uploaded avatar).
  - Username: Default "Mạnh" with an edit button opening a rename dialog.
  - Custom Upload Button: `+ Tải ảnh nhân vật (PNG/GIF)` supporting custom files from device storage.
  - Notice text: `Tiến độ lưu trên máy này.`

#### B. Chỉ số cơ thể & Thời tiết (Body Metrics & Weather Engine)
- **Form Inputs**:
  - Cân nặng (kg): Number input (e.g. 65 kg)
  - Chiều cao (cm): Number input (e.g. 170 cm)
  - Tuổi: Number input (e.g. 25)
  - Mức vận động: 3 segmented cards (`Ít (+0ml)`, `Vừa (+350ml)`, `Cao (+700ml)`).
- **Weather Automation**:
  - Shows current detected GPS coordinates or fallback city (Hà Nội / Vinh).
  - Button: `Làm mới vị trí GPS` (queries `@capacitor/geolocation` and refreshes Open-Meteo).
  - Toggle Switch: `Tự động điều chỉnh mục tiêu theo thời tiết`.

#### C. Bạn đồng hành 6/6 (100% Unlocked, Zero Paywall)
- Display all 6 Voyager variants, fully selectable with no crown lock:
  1. **Voyager Nguyên Bản** (Classic Star Sailor)
  2. **Voyager Tinh Vân** (Nebula Dreamer)
  3. **Voyager Thủy Thủ** (Deep Blue Sailor)
  4. **Voyager Hòa Âm** (Violin Maestro)
  5. **Voyager Hoàng Hôn** (Starlight Twilight)
  6. **Voyager Siêu Tân Tinh** (Supernova Radiance)

#### D. Chủ đề không gian (4 Space Themes Unlocked)
- 4 Full Color Schemes:
  1. **Biển Sao Đêm** (Cosmic Ocean — Default Cyan & Slate)
  2. **Dải Ngân Hà Rực Rỡ** (Milky Way Aurora — Violet & Indigo)
  3. **Ánh Hoàng Hôn Sao Hỏa** (Martian Twilight — Amber & Deep Blue)
  4. **Vùng Tối Trăng Khuyết** (Lunar Midnight — Monochrome Slate & Silver)

#### E. Cài đặt chung & Xuất dữ liệu
- **App Settings**:
  - Mục tiêu mỗi ngày: Auto or manual override.
  - Đơn vị: `L` / `ml`.
  - Ngôn ngữ: `Tiếng Việt`.
  - Hiệu ứng âm thanh: Toggle on/off.
  - Widget màn hình chính: Instructions & configuration.
  - Kết nối sức khỏe: Local health sync toggle.
- **Data Export Suite**:
  - `Xuất file JSON`: Downloads complete state history, user preferences, and daily logs.
  - `Xuất file CSV`: Generates and triggers download of a clean spreadsheet formatted:
    `Ngày, Mục tiêu (ml), Đã uống (ml), Đạt mục tiêu, Số lần uống`

---

## 5. Web Audio API Cosmic Sound Synthesizer

To guarantee 100% reliability offline without external media file dependencies or broken asset paths, audio alerts are generated natively via the Web Audio API:

```typescript
// src/services/audioService.ts
class CosmicAudioService {
  private ctx: AudioContext | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Sound 1: Gợn nhẹ (Gentle Water Ripple)
  playGentleRipple() {
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.4);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  // Sound 2: Violin Tinh cầu (Cosmic Star Violin)
  playCosmicViolin() {
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Harmonic arpeggio: A4 (440Hz), C#5 (554Hz), E5 (659Hz), A5 (880Hz)
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.18;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteTime);

      // Add gentle vibrato
      const lfo = this.ctx!.createOscillator();
      const lfoGain = this.ctx!.createGain();
      lfo.frequency.setValueAtTime(5.5, noteTime);
      lfoGain.gain.setValueAtTime(6, noteTime);
      lfo.connect(osc.frequency);
      lfo.start(noteTime);
      lfo.stop(noteTime + 0.4);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.4);
    });
  }

  // Sound 3: Chuông bong bóng (Bubble Chime)
  playBubbleChime() {
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const pitches = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    pitches.forEach((freq, i) => {
      const t = now + i * 0.09;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 0.8, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.04);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  }
}

export const cosmicAudio = new CosmicAudioService();
```

---

## 6. GitHub Actions CI/CD Build Automation Specification

File Path: `.github/workflows/build-apk.yml`

```yaml
name: Build Android APK

on:
  push:
    branches:
      - main
      - master
  pull_request:
    branches:
      - main
      - master
  workflow_dispatch:

jobs:
  build-apk:
    name: Build & Package Android APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Setup Java JDK 21 (Temurin)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: 21

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v3

      - name: Install Dependencies
        run: npm ci

      - name: Run Test Suite
        run: npm test -- --run

      - name: Build Web Production Assets
        run: npm run build

      - name: Sync Capacitor Android
        run: npx cap sync android

      - name: Make Gradle Wrapper Executable
        run: chmod +x android/gradlew

      - name: Assemble Debug APK
        working-directory: android
        run: ./gradlew assembleDebug --stacktrace

      - name: Upload Debug APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: voyager-cosmic-hydration-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error
          retention-days: 30
```

---

## 7. Component Architecture Hierarchy

```
src/
├── components/
│   ├── VoyagerChibi.tsx          # 5 expressions, cape, hat, violin, upload fallback
│   ├── CosmicWaveTank.tsx        # Undulating galaxy water, target dashed line, star float
│   ├── WeatherBadge.tsx          # GPS temp/humidity & weather bonus breakdown
│   ├── QuickLogGrid.tsx          # +50, +150, +250 (checked), +500ml 2px border buttons
│   ├── CustomLogModal.tsx        # Custom ml entry dialog
│   ├── BottomNav.tsx             # 5 fixed tabs with 2px top border & active indicators
│   └── CelebrationConfetti.tsx   # canvas-confetti star burst at 100%
├── tabs/
│   ├── TodayTab.tsx              # Tab 1: Streak, weather, volume readout, tank, quick log
│   ├── ReminderTab.tsx           # Tab 2: Countdown, cosmic bell, 3 modes, quiet hours, sound preview
│   ├── JournalTab.tsx            # Tab 3: Monthly grid, cup levels, gold medals, streak card
│   ├── StatsTab.tsx              # Tab 4: Week/Month/Custom, dashed goal line, sitting Voyager, totals
│   └── ProfileTab.tsx            # Tab 5: User profile, body stats, 6 companions, 4 themes, export
├── services/
│   ├── audioService.ts           # Web Audio API 3 cosmic tones
│   ├── hydrationEngine.ts        # W_total formula, Open-Meteo GPS & fallback
│   ├── notificationService.ts    # Capacitor local notifications with quiet hours
│   └── exportService.ts          # JSON & CSV data generation
├── types/
│   └── hydration.ts              # Global TypeScript interfaces & data contracts
├── App.tsx                       # Tab container, store initialization, offline hydration
└── main.tsx                      # Vite React entry point
```

---

## 8. Verification Strategy & Acceptance Checklist

| Requirement | Target Verification Method | Expected Outcome |
|---|---|---|
| Card-UI 2px Slate Border | Visual check & CSS selector check (`border-2 border-[#1E293B]`) | All cards, buttons, navbars render crisp 2px solid slate borders |
| Fixed 5-Tab Navigation | Render check & responsive layout inspection | Bottom bar remains fixed across all scroll views with active tab indicators |
| 100% Free / Zero Paywall | DOM audit for VIP crowns, locks, and premium banners | No crown badges, 6/6 companions unlocked, 4/4 themes selectable |
| VoyagerChibi Expressions | Unit/Component test with 5 state props | Correct accessories (cape, hat, violin) and facial expressions render |
| Custom Image Support | User avatar upload simulation (PNG/GIF) | Uploaded blob/data URL renders gracefully with fallback |
| Web Audio API Sounds | AudioContext execution in browser | 3 distinct procedural cosmic audio tones play without external files |
| GitHub Actions CI | YAML linter and workflow schema audit | Valid workflow running on Node 20, Java 21, building debug APK |

This completes the survey and technical design specification for the UI, components, and CI automation.
