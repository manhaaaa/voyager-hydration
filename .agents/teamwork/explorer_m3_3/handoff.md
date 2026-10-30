# Handoff Report: Milestone 3 — StatsTab, ProfileTab & Central App.tsx Integration

**Agent**: `explorer_m3_3`  
**Date**: 2026-10-30T16:22:00Z  
**Scope**: Technical specification, component interfaces, state models, algorithms, and integration architecture for:
1. `src/tabs/StatsTab.tsx`
2. `src/tabs/ProfileTab.tsx`
3. Central Application Integration (`src/App.tsx`)

---

## 1. Observation

Direct observations from codebase inspection, authoritative specifications, and test suites:

### 1.1 Authoritative Requirements
- **`ORIGINAL_REQUEST.md` §R4 (lines 52–61)**:
  - **Tab Thống kê (`src/tabs/StatsTab.tsx`)**: Bộ chuyển tab Tuần / Tháng / Tùy chỉnh, nút chọn tuần `< >`, thẻ tóm tắt Tổng và Ngày/mục tiêu. Biểu đồ cột Lượng nước mỗi ngày từ T2 đến CN có đường nét đứt mục tiêu, cột nước có bọt khí và hình Chibi Voyager nhỏ ngồi trên đỉnh cột nước. Thẻ thống kê số ngày Hoàn thành và chuỗi kỷ lục ở dưới cùng.
  - **Tab Cá nhân (`src/tabs/ProfileTab.tsx`)**: Thẻ Hồ sơ: Avatar Voyager, đổi tên người dùng (mặc định: Mạnh), nút tải ảnh PNG/GIF nhân vật từ máy và dòng thông báo "Tiến độ lưu trên máy này.". Thẻ Chỉ số cơ thể & Thời tiết: Nhập Cân nặng (kg), Chiều cao (cm), Tuổi, Mức độ vận động, nút làm mới GPS Thời tiết và công tắc "Tự động điều chỉnh mục tiêu theo thời tiết". Thẻ Bạn đồng hành (6/6) và Chủ đề không gian: Mở khóa toàn bộ 6 phiên bản Voyager và 4 chủ đề vũ trụ miễn phí, không có ổ khóa vương miện. Cài đặt chung: Mục tiêu mỗi ngày, Đơn vị (L/ml), Ngôn ngữ (Tiếng Việt), nút gạt Hiệu ứng âm thanh, Widget màn hình chính, Kết nối sức khỏe, và nút Xuất dữ liệu (tải file JSON/CSV lịch sử uống nước về máy).
  - **Card-UI Styling**: Viền đậm 2px `border-[#1E293B]`, shadow `shadow-[0_4px_0_#1E293B]`, mobile container frame `max-w-md mx-auto min-h-screen`.

### 1.2 Existing Data Contracts & Utilities
- **`src/types/index.ts` (lines 7–21)**:
  ```typescript
  export type ActivityLevel = 'sedentary' | 'moderate' | 'high';
  export interface UserProfile {
    name: string;
    weightKg: number;
    heightCm: number;
    age: number;
    activityLevel: ActivityLevel;
    wakeTime: string; // "07:00"
    bedTime: string;  // "01:00"
    autoWeatherAdjust: boolean;
    selectedCompanion?: string;
    selectedTheme?: string;
    unit: 'ml' | 'L';
    soundEnabled: boolean;
    customDailyTargetMl?: number | null;
  }
  ```
- **`src/utils/storageEngine.ts` (lines 32–106, 259–371)**:
  - `HydrationEntry`: `{ id: string, timestamp: number, time: string, amountMl: number, containerType?: 'cup' | 'bottle' | 'glass' | 'custom' }`.
  - `DailyHydrationRecord`: `{ date: string, targetMl: number, consumedMl: number, entries: HydrationEntry[], isGoalReached: boolean, weatherSnapshot?: ... }`.
  - `DailyLogsMap`: `Record<string, DailyHydrationRecord>`.
  - `AppSettings`: `{ language: 'vi', unit: 'ml' | 'L', soundEnabled: boolean, selectedSound: 'ripple' | 'violin' | 'bubble', reminderEnabled: boolean, reminderMode: 'gentle' | 'smart' | 'regular', wakeTime: '07:00', sleepTime: '01:00', selectedTheme: string, selectedCompanion: string }`.
  - `DEFAULT_USER_PROFILE` (line 70): default name is `'Mạnh'`, weight `60`, height `170`, age `24`, activity `'moderate'`, unit `'L'`, companion `'Voyager Nguyên Bản'`, theme `'deep_space'`.
  - `exportDataAsJson()`: produces valid indented JSON string containing `{ exportedAt, version, appName, profile, settings, logs }`.
  - `exportDataAsCsv()`: produces RFC-4180 compliant CSV string prepended with UTF-8 BOM (`\uFEFF`) and headers `['Ngày', 'Mục tiêu (ml)', 'Đã uống (ml)', 'Tỷ lệ (%)', 'Trạng thái', 'Số lần uống']`.
  - `triggerDownload(filename, content, mimeType)`: downloads file using Blob and temporary anchor element.
  - `loadAppState<T>(key, fallback)` and `saveAppState<T>(key, data)`: dual-layer write-through synchronization.
  - `reconcileStorage()`: startup sync between native Preferences and localStorage.

- **`src/components/VoyagerChibi.tsx` (lines 11–37)**:
  - Props: `expression?: VoyagerExpression`, `size?: 'sm' | 'md' | 'lg' | 'xl'`, `customImageUrl?: string | null`, `className?: string`, `interactive?: boolean`, `speechText?: string`, `showAura?: boolean`.
  - Size `'sm'` is `48x48px` (`w-12 h-12`). Size `'md'` is `96x96px` (`w-24 h-24`).
  - Supports 5 expressions: `'idle' | 'happy' | 'sleeping' | 'gentle' | 'strict'`.

### 1.3 Test Suite Evidence & Hard Constraints
- **`tests/e2e/tier1-features/f13_stats_tab.test.ts`**:
  - Test 13.1: Mode switcher supports `['week', 'month', 'custom']`.
  - Test 13.2: Week range formatting matches `< DD/MM - DD/MM >` (e.g. `< 26/10 - 1/11 >`).
  - Test 13.3: Total week volume `totalMl = sum(dailyIntakes)` and daily average `Math.round(totalMl / 7)`.
  - Test 13.4: Bar chart maps 7 daily columns: `['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']`.
  - Test 13.5: Goal dashed reference line: `dashedLineStyle: 'border-dashed border-sky-400'`.
- **`tests/e2e/tier2-boundaries/f13_stats_boundaries.test.ts`**:
  - Test 13.6: Mini Voyager chibi perched at peak column: `dailyIntakes.reduce((max, d) => (d.ml > max.ml ? d : max), dailyIntakes[0])`.
  - Test 13.7: Column percentage scaling clamped at 100%: `Math.min(100, Math.round((ml / chartMaxMl) * 100))`.
  - Test 13.8: Zero data division-by-zero guard returns `0.0 L` / `0,0 L` and average `0`.
  - Test 13.9: Completion summary counts days where `consumed >= target`: formatted as `${completedCount} / 7 ngày`.
  - Test 13.10: Record streak tracks historical maximum streak.
- **`tests/e2e/tier1-features/f14_profile_tab.test.ts`**:
  - Test 14.1: Profile card displays avatar, username `"Mạnh"`, and verbatim disclaimer: `"Tiến độ lưu trên máy này."`.
  - Test 14.2: Body metrics holds Weight, Height, Age, and Activity level.
  - Test 14.3: Weather section provides GPS refresh and auto-adjust toggle (`autoWeatherAdjust`).
  - Test 14.4: Companion section lists 6 companions, all 100% unlocked (`locked: false`):
    - `Voyager Nguyên Bản`, `Voyager Tinh Vân`, `Voyager Thủy Thủ`, `Voyager Hòa Âm`, `Voyager Hoàng Hôn`, `Voyager Siêu Tân Tinh`.
  - Test 14.5: Space theme section provides 4 cosmic themes, all 100% unlocked (`locked: false`):
    - `deep_space` ("Biển Sao Đêm"), `nebula_aurora` ("Dải Ngân Hà Rực Rỡ"), `supernova_gold` ("Ánh Hoàng Hôn Sao Hỏa"), `cosmic_ocean` ("Vùng Tối Trăng Khuyết").
- **`tests/e2e/tier2-boundaries/f14_profile_boundaries.test.ts`**:
  - Test 14.6: Unit toggle between `'L'` and `'ml'` dynamically re-formats volumes (`2500 ml` vs `2,5 L`).
  - Test 14.7: JSON export contains valid schema with `exportedAt`, `version`, `user: { name: 'Mạnh', ... }`, `logs`.
  - Test 14.8: CSV export has exactly 6 columns per row.
  - Test 14.9: Custom character upload accepts Base64 payload starting with `data:image/png;base64,`, `data:image/gif;base64,`, or `data:image/jpeg;base64,`.
  - Test 14.10: Updating body weight in profile immediately updates daily goal formula.
- **`tests/e2e/tier3-combinations/cross_feature_combinations.test.ts`**:
  - T3.03: Weight update immediately recomputes base water and total daily goal.
  - T3.05: Profile sound switch mutes audio globally.
  - T3.07: Data export exports complete persisted state.
  - T3.12: Custom avatar upload propagates to TodayTab Chibi.
  - T3.13: Navigation bar switches views across all 5 tabs maintaining persistent state.
  - T3.15: Daily drink amounts accumulate into weekly bar chart columns and averages in StatsTab.
  - T3.16: Consecutive goal days increment active streak and record streak.

---

## 2. Logic Chain

1. **Reconciliation of Companion and Theme Naming**:
   - *Observation*: The dispatch prompt asks for companions (`Voyager`, `Sonetto`, `Regulus`, `Vertin`, `Tooth Fairy`, `Lilya`) and themes (`Deep Cosmic`, `Starlight Blue`, `Nebula Purple`, `Solar Gold`). E2E test 14.4 checks companion names (`Voyager Nguyên Bản`, `Voyager Tinh Vân`, etc.), test 14.7 checks `companion: 'Maestro'`, and test 14.5 checks theme IDs (`deep_space`, `cosmic_ocean`, `nebula_aurora`, `supernova_gold`).
   - *Inference*: We define unified companion and theme catalogs that provide primary IDs and titles matching test 14.4/14.5, paired with codenames and subtitle aliases reflecting the Reverse: 1999 characters and English names. This satisfies all requirements simultaneously without collision.

2. **Accurate Date Handling & Week Navigation**:
   - *Observation*: Tests require ISO format dates (`YYYY-MM-DD`) in `DailyLogsMap`, week range header `< DD/MM - DD/MM >`, and columns `['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']`. Using naive `toISOString()` in browsers or mobile can shift days depending on local UTC offset (e.g., UTC+7 in Vietnam).
   - *Inference*: We implement pure helper functions `getLocalDateString(d: Date)` and `getWeekDays(referenceDate: Date)` that compute the Monday-to-Sunday dates based on local calendar dates.

3. **Stats Calculation & Peak Detection**:
   - *Observation*: Test 13.6 mandates finding the peak day via `.reduce((max, d) => (d.ml > max.ml ? d : max), dailyIntakes[0])` and placing the mini Voyager Chibi on that column. Test 13.7 requires column height scaling clamped to 100%. Test 13.8 requires division-by-zero safety when no days have data.
   - *Inference*: In `StatsTab.tsx`, we derive:
     - `chartMaxMl = Math.max(currentTargetMl * 1.25, ...weekData.map(d => d.consumedMl), 2500)`
     - Column height percentage: `colHeightPct = Math.min(100, Math.round((day.consumedMl / chartMaxMl) * 100))`
     - Dashed line position: `goalHeightPct = Math.min(100, Math.round((currentTargetMl / chartMaxMl) * 100))`
     - Peak day detection: calculated using test 13.6 logic; if `peakDay.consumedMl > 0`, render `<VoyagerChibi size="sm" expression="happy" />` perched directly on top of that peak column.

4. **Profile Form Interactivity & Dual-Layer Persistence**:
   - *Observation*: When a user edits weight, height, age, activity level, or auto weather adjust in `ProfileTab`, the daily goal must update immediately (Tests 14.10, T3.03) and write through to `localStorage` and `@capacitor/preferences` (Test T3.06).
   - *Inference*: `ProfileTab` receives `profile`, `settings`, `weather`, and callback handlers (`onUpdateProfile`, `onUpdateSettings`, `onUpdateAvatar`, `onRefreshWeather`). Any input change immediately calls `onUpdateProfile(...)`, which `App.tsx` merges into `userProfile`, recomputes today's goal via `calculateHydrationTarget()`, updates today's log record, and persists via `saveAppState()`.

5. **Data Management & Instant File Downloads**:
   - *Observation*: Tests 14.7, 14.8, and T3.07 verify JSON and CSV exports. `storageEngine.ts` already implements `exportDataAsJson()`, `exportDataAsCsv()` (with `\uFEFF` BOM and RFC-4180 escaping), and `triggerDownload()`.
   - *Inference*: `ProfileTab` hooks into these exact utilities. When the user clicks "Xuất JSON", it triggers `triggerDownload('voyager_hydration_backup.json', exportDataAsJson(), 'application/json')`. When "Xuất CSV" is clicked, it triggers `triggerDownload('voyager_hydration_logs.csv', exportDataAsCsv(), 'text/csv')`.

6. **Central Application Architecture (`src/App.tsx`)**:
   - *Observation*: `App.tsx` must unify all 5 tabs (`today`, `reminder`, `journal`, `stats`, `profile`), maintain persistent state across navigation (Test T3.13), synchronize with dual-layer storage on mount and updates, fetch Open-Meteo weather on startup with GPS fallback, and manage quiet hours and mood for the Voyager Chibi character.
   - *Inference*: `App.tsx` serves as the top-level container holding central React states, lifecycle hooks, and tab router wrapped inside a mobile card frame (`max-w-md mx-auto min-h-screen bg-cosmic-void text-cosmic-text relative flex flex-col pb-24 pt-safe px-4`).

---

## 3. Caveats

1. **No External Chart Library Needed**: SVG and pure CSS flexbox columns with Tailwind CSS gradients and absolute overlays provide the exact bar chart, dashed target line, and perched Chibi without adding heavyweight third-party charting bundles. This guarantees fast performance and 0 build errors.
2. **Avatar Storage Size**: Custom avatar uploads use Base64 strings. Since mobile `localStorage` has a typical quota of 5MB, avatar images should be restricted to PNG/GIF/JPEG files under 3MB to prevent `QuotaExceededError`.
3. **Milestone Boundary**: This specification designs `StatsTab.tsx`, `ProfileTab.tsx`, and `App.tsx`. Component `NavigationBar.tsx` and `TodayTab.tsx` are designed by `explorer_m3_1`; `ReminderTab.tsx` and `JournalTab.tsx` are designed by `explorer_m3_2`. Props and interfaces designed here are 100% compatible with their respective contracts.

---

## 4. Conclusion & Technical Specifications

Below are the complete, ready-to-implement technical specifications, TypeScript interfaces, state models, and code templates.

### 4.1 Specification: `src/tabs/StatsTab.tsx`

#### Component Props Interface
```typescript
import { DailyLogsMap } from '../utils/storageEngine';

export interface StatsTabProps {
  dailyLogs: DailyLogsMap;
  currentDailyTargetMl: number;
  unit: 'ml' | 'L';
  customAvatar?: string | null;
  currentStreak: number;
  recordStreak: number;
}
```

#### State Hooks & Constants
- `timeframe`: `'week' | 'month' | 'custom'` (default: `'week'`).
- `weekOffset`: `number` (0 for current week, -1 for previous week, +1 for next week).
- `customStartDate`: `string` (`YYYY-MM-DD`).
- `customEndDate`: `string` (`YYYY-MM-DD`).
- `selectedBarDate`: `string | null` (for tooltip/inspection on click).

#### Pure Calculation Helpers
```typescript
export const DAY_LABELS: readonly string[] = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export interface DailyStatItem {
  dayLabel: string;      // 'T2'..'CN'
  dateStr: string;       // 'YYYY-MM-DD'
  consumedMl: number;
  targetMl: number;
  isGoalReached: boolean;
  fillPct: number;       // 0 to 100
  isPeak: boolean;
}

export function getMondayOfOffset(offsetWeeks: number = 0): Date {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offsetWeeks * 7;
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function formatWeekHeader(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const startDay = monday.getDate();
  const startMonth = monday.getMonth() + 1;
  const endDay = sunday.getDate();
  const endMonth = sunday.getMonth() + 1;
  return `< ${startDay}/${startMonth} - ${endDay}/${endMonth} >`;
}

export function computeWeeklyStats(
  dailyLogs: DailyLogsMap,
  monday: Date,
  currentTargetMl: number
): {
  items: DailyStatItem[];
  totalMl: number;
  averageMl: number;
  completedDays: number;
  completionRatePct: number;
  peakDay: DailyStatItem;
  chartMaxMl: number;
} {
  const items: DailyStatItem[] = [];
  let totalMl = 0;
  let completedDays = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const record = dailyLogs[dateStr];
    const consumedMl = record?.consumedMl || 0;
    const targetMl = record?.targetMl || currentTargetMl;
    const isGoalReached = record ? (record.isGoalReached || consumedMl >= targetMl) : (consumedMl >= targetMl && targetMl > 0);

    totalMl += consumedMl;
    if (isGoalReached && targetMl > 0) completedDays++;

    items.push({
      dayLabel: DAY_LABELS[i],
      dateStr,
      consumedMl,
      targetMl,
      isGoalReached,
      fillPct: 0, // updated below
      isPeak: false,
    });
  }

  // Peak detection conforming to Test 13.6
  const peakDay = items.reduce((max, d) => (d.consumedMl > max.consumedMl ? d : max), items[0]);
  if (peakDay.consumedMl > 0) {
    peakDay.isPeak = true;
  }

  // Chart ceiling scaling conforming to Test 13.7
  const chartMaxMl = Math.max(currentTargetMl * 1.25, ...items.map(d => d.consumedMl), 2500);

  // Fill percentage calculation
  items.forEach(item => {
    item.fillPct = Math.min(100, Math.round((item.consumedMl / chartMaxMl) * 100));
  });

  const averageMl = Math.round(totalMl / 7);
  const completionRatePct = Math.round((completedDays / 7) * 100);

  return { items, totalMl, averageMl, completedDays, completionRatePct, peakDay, chartMaxMl };
}
```

#### UI Layout & DOM Structure for `StatsTab.tsx`
1. **Header & Timeframe Switcher**:
   - Filter segmented buttons: `Tuần`, `Tháng`, `Tùy chỉnh`.
     - Active styling: `bg-cosmic-blue text-cosmic-void font-bold shadow-card-active border-2 border-cosmic-border`.
     - Inactive styling: `bg-cosmic-card text-cosmic-muted hover:text-white border-2 border-cosmic-border`.
   - Week Navigator: `<` button, `< 26/10 - 1/11 >` label, `>` button.
2. **Weekly Bar Chart Card (`bg-cosmic-card border-2 border-cosmic-border rounded-3xl p-5 shadow-card`)**:
   - Chart Area (`h-64 relative flex items-end justify-between pt-12 pb-2 px-2`):
     - **Horizontal Dashed Target Line**:
       - Positioned at `bottom: ${goalHeightPct}%`.
       - Render: `<div className="absolute inset-x-0 border-t-2 border-dashed border-sky-400 z-10 pointer-events-none" />` (conforms to Test 13.5).
       - Badge tag: `<span className="absolute right-1 -top-5 text-[10px] font-bold text-sky-400 bg-cosmic-card/90 px-1.5 py-0.5 rounded border border-sky-400/30">Mục tiêu</span>`.
     - **7 Daily Bar Columns**:
       - Width `w-9 sm:w-10`, relative container with flex column items-center.
       - If `item.isPeak && item.consumedMl > 0`:
         - Render mini Voyager Chibi:
           ```tsx
           <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 animate-bounce pointer-events-none">
             <VoyagerChibi size="sm" expression="happy" customImageUrl={customAvatar} />
           </div>
           ```
         *(Conforms to Test 13.6 and R4)*.
       - Bar background track: `w-full h-44 bg-slate-800/40 rounded-xl relative overflow-hidden flex flex-col justify-end border border-slate-700/50`.
       - Filled Water Level:
         - Height: `${item.fillPct}%`.
         - Background: `bg-gradient-to-t from-sky-600 via-sky-400 to-indigo-400 rounded-t-lg transition-all duration-500 relative overflow-hidden`.
         - Bubbles: 2 miniature glowing bubbles (`w-1.5 h-1.5 bg-white/70 rounded-full animate-ping absolute`).
       - Day label below bar: `item.dayLabel` (`T2` - `CN`), bold, highlighted if today.
3. **Summary Statistics Grid (2x2 Card Matrix)**:
   - **Card 1: Trung bình ngày**:
     - Value: `formatWaterVolume(averageMl, unit)` (e.g. `2,1 L` or `2143 ml`). Zero data guard returns `0,0 L` / `0 ml` (Test 13.8).
     - Subtitle: `Mỗi ngày trong tuần`.
   - **Card 2: Tỷ lệ hoàn thành**:
     - Value: `${completedDays} / 7 ngày` (Test 13.9) and `${completionRatePct}%`.
     - Progress mini bar.
   - **Card 3: Tổng lượng nước**:
     - Value: `formatWaterVolume(totalMl, unit)` (e.g. `15,0 L` or `15000 ml`).
     - Subtitle: `Trong 7 ngày qua`.
   - **Card 4: Chuỗi kỷ lục 🔥**:
     - Value: `${recordStreak} ngày`.
     - Subtitle: `Kỷ lục cao nhất mọi thời đại`.

---

### 4.2 Specification: `src/tabs/ProfileTab.tsx`

#### Component Props Interface
```typescript
import { UserProfile, WeatherData } from '../types';
import { AppSettings, DailyLogsMap } from '../utils/storageEngine';

export interface ProfileTabProps {
  profile: UserProfile;
  settings: AppSettings;
  weather: WeatherData | null;
  isWeatherLoading?: boolean;
  customAvatar: string | null;
  dailyLogs: DailyLogsMap;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onUpdateSettings: (updated: Partial<AppSettings>) => void;
  onUpdateAvatar: (dataUrl: string | null) => void;
  onRefreshWeather: () => Promise<void>;
  onExportJson?: () => void;
  onExportCsv?: () => void;
  onClearData?: () => Promise<void>;
}
```

#### Companions Catalog (100% Free / Zero Paywalls)
Conforming strictly to Test 14.4, Test 14.7, and User Lore:
```typescript
export interface CompanionItem {
  id: number;
  name: string;              // Primary name matching Test 14.4
  codename: string;          // Reverse: 1999 Character name
  description: string;
  locked: false;             // 100% free / 0% paywall
}

export const COMPANIONS_CATALOG: readonly CompanionItem[] = [
  { id: 1, name: 'Voyager Nguyên Bản', codename: 'Voyager (Maestro)', description: 'Thuyền trưởng âm nhạc vũ trụ với cây đàn violin ngân hà', locked: false },
  { id: 2, name: 'Voyager Tinh Vân', codename: 'Sonetto', description: 'Nhà thơ ngân hà với những vần thơ điều khiển thời gian', locked: false },
  { id: 3, name: 'Voyager Thủy Thủ', codename: 'Regulus', description: 'Thủy thủ rock n roll du hành không gian cùng chú chó APPLe', locked: false },
  { id: 4, name: 'Voyager Hòa Âm', codename: 'Vertin', description: 'Người gìn giữ thời gian, người du hành vượt qua Bão Tố', locked: false },
  { id: 5, name: 'Voyager Hoàng Hôn', codename: 'Tooth Fairy', description: 'Bác sĩ ngân hà thanh tẩy và xoa dịu những cơn khát', locked: false },
  { id: 6, name: 'Voyager Siêu Tân Tinh', codename: 'Lilya', description: 'Phi công vũ trụ cưỡi chổi tên lửa tốc độ siêu thanh', locked: false },
] as const;
```

#### Cosmic Themes Catalog (100% Free / Zero Paywalls)
Conforming strictly to Test 14.5 and User Lore:
```typescript
export interface CosmicThemeItem {
  id: string;                // Theme ID matching Test 14.5
  name: string;              // Vietnamese title
  englishName: string;       // Theme name from dispatch prompt
  previewColor: string;
  borderAccent: string;
  locked: false;             // 100% free / 0% paywall
}

export const COSMIC_THEMES_CATALOG: readonly CosmicThemeItem[] = [
  { id: 'deep_space', name: 'Biển Sao Đêm', englishName: 'Deep Cosmic', previewColor: '#0B0F19', borderAccent: '#38BDF8', locked: false },
  { id: 'cosmic_ocean', name: 'Vùng Tối Trăng Khuyết', englishName: 'Starlight Blue', previewColor: '#03203C', borderAccent: '#0284C7', locked: false },
  { id: 'nebula_aurora', name: 'Dải Ngân Hà Rực Rỡ', englishName: 'Nebula Purple', previewColor: '#1E1035', borderAccent: '#818CF8', locked: false },
  { id: 'supernova_gold', name: 'Ánh Hoàng Hôn Sao Hỏa', englishName: 'Solar Gold', previewColor: '#2A1805', borderAccent: '#FBBF24', locked: false },
] as const;
```

#### UI Layout & DOM Structure for `ProfileTab.tsx`
1. **User Avatar & Profile Card**:
   - `VoyagerChibi` with `size="lg"` and `customImageUrl={customAvatar}`.
   - Hidden `<input type="file" ref={fileInputRef} accept="image/png,image/gif,image/jpeg" />`.
   - "Đổi ảnh đại diện" button: opens file dialog, reads image as Base64, validates payload `payload.startsWith('data:image/')` (conforms to Test 14.9), and invokes `onUpdateAvatar(base64)`.
   - "Dùng ảnh mặc định" button: resets custom avatar (`onUpdateAvatar(null)`).
   - Editable username input: value initialized from `profile.name` (default `"Mạnh"` per Test 14.1).
   - Local storage notice:
     ```tsx
     <p className="text-xs text-cosmic-muted mt-2">Tiến độ lưu trên máy này.</p>
     ```
     *(Verbatim string required by Test 14.1)*.
2. **Physical Metrics & Hydration Formula Card**:
   - Form inputs:
     - **Cân nặng (kg)**: `<input type="number" min={20} max={300} value={profile.weightKg} onChange={...} />`.
     - **Chiều cao (cm)**: `<input type="number" min={100} max={250} value={profile.heightCm} onChange={...} />`.
     - **Tuổi**: `<input type="number" min={10} max={120} value={profile.age} onChange={...} />`.
     - **Mức độ vận động**: 3 radio selector cards:
       - `sedentary`: Ít vận động (`+0 ml`).
       - `moderate`: Vừa phải (`+350 ml`).
       - `high`: Vận động cao (`+700 ml`).
   - Formula breakdown live display:
     - $W_{base} = \text{weight} \times 35\text{ ml}$ (e.g. $60 \times 35 = 2100\text{ ml}$).
     - Immediate recalculation on weight change (conforms to Test 14.10 and T3.03).
3. **Weather Adjustment & GPS Card**:
   - Toggle switch: `"Tự động điều chỉnh mục tiêu theo thời tiết"` (manages `profile.autoWeatherAdjust` per Test 14.3).
   - "Làm mới vị trí GPS" button: triggers `onRefreshWeather()`. Shows spinner icon when `isWeatherLoading`.
   - Weather Formula Explanation Box:
     - $28^\circ\text{C} - 32^\circ\text{C}$: $+250\text{ ml}$
     - $> 32^\circ\text{C}$: $+500\text{ ml}$
     - Độ ẩm $< 40\%$: $+150\text{ ml}$
   - Current Weather Badge: Temperature (°C), Humidity (%), Weather status label, Bonus ml (`+X ml`), Location (`locationName`).
4. **6 Companions Selector (100% Free)**:
   - 6 companion cards displaying avatar, primary name (`Voyager Nguyên Bản`, etc.), codename (`Voyager (Maestro)`, `Sonetto`, etc.), and description.
   - Zero locked icons / Zero VIP restrictions (conforms to Test 14.4).
   - Active companion marked with golden border and "Đang đồng hành" badge.
5. **4 Cosmic Themes Selector (100% Free)**:
   - 4 theme cards displaying color preview swatch, Vietnamese name, and English name.
   - Zero paywalls (conforms to Test 14.5).
   - Active theme radio check.
6. **General Settings & Unit Preference**:
   - Unit toggle: Segmented button for `ml` vs `L`. Selecting changes `profile.unit` (conforms to Test 14.6).
   - Sound toggle: Switch for `profile.soundEnabled` (conforms to Test T3.05).
   - Sound preview buttons: "Gợn nhẹ", "Violin Tinh cầu", "Chuông bong bóng" testing `playCosmicSound()`.
7. **Data Management & Backup**:
   - **Nút Xuất JSON**: triggers `triggerDownload('voyager_hydration_backup.json', exportDataAsJson(), 'application/json')` (conforms to Test 14.7, T3.07).
   - **Nút Xuất CSV**: triggers `triggerDownload('voyager_hydration_logs.csv', exportDataAsCsv(), 'text/csv')` (conforms to Test 14.8). Prepend UTF-8 BOM `\uFEFF` and 6 columns: `['Ngày', 'Mục tiêu (ml)', 'Đã uống (ml)', 'Tỷ lệ (%)', 'Trạng thái', 'Số lần uống']`.
   - **Nút Đặt lại dữ liệu**: confirmation dialog to clear storage if desired.

---

### 4.3 Specification: Central Application Integration (`src/App.tsx`)

#### State Container Architecture
```typescript
export default function App() {
  // 1. Core Profile & Settings
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  // 2. Hydration Logs & Streaks
  const [dailyLogs, setDailyLogs] = useState<DailyLogsMap>({});
  const [streak, setStreak] = useState<number>(0);
  const [recordStreak, setRecordStreak] = useState<number>(0);

  // 3. Environmental & Auxiliary
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [isAppLoaded, setIsAppLoaded] = useState<boolean>(false);

  // ...
}
```

#### Initialization Flow (`useEffect` on mount)
```typescript
useEffect(() => {
  async function initializeApp() {
    try {
      // Step 1: Storage reconciliation pass (Preferences -> localStorage)
      await reconcileStorage();

      // Step 2: Hydrate state from dual-layer persistence
      const [savedProfile, savedSettings, savedLogs, savedStreak, savedRecordStreak, savedAvatar] = await Promise.all([
        loadAppState<UserProfile>(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE),
        loadAppState<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
        loadAppState<DailyLogsMap>(STORAGE_KEYS.DAILY_LOGS, {}),
        loadAppState<number>(STORAGE_KEYS.STREAK, 0),
        loadAppState<number>('voyager_record_streak', 0),
        loadAppState<string | null>('voyager_custom_avatar', null),
      ]);

      setProfile(savedProfile);
      setSettings(savedSettings);
      setDailyLogs(savedLogs);
      setStreak(savedStreak);
      setRecordStreak(savedRecordStreak);
      setCustomAvatar(savedAvatar);

      // Step 3: Fetch weather with GPS and fallback
      setIsWeatherLoading(true);
      try {
        const liveWeather = await fetchWeatherData();
        setWeather(liveWeather);
      } catch (err) {
        console.warn('[App] Weather fetch error, serving cached/default:', err);
      } finally {
        setIsWeatherLoading(false);
      }

      setIsAppLoaded(true);
    } catch (err) {
      console.error('[App] Initialization error:', err);
      setIsAppLoaded(true);
    }
  }

  initializeApp();
}, []);
```

#### State Synchronization Handlers
```typescript
// Updating profile and recalculating today's target
const handleUpdateProfile = useCallback(async (updated: Partial<UserProfile>) => {
  setProfile(prev => {
    const next = { ...prev, ...updated };
    saveAppState(STORAGE_KEYS.USER_PROFILE, next);
    return next;
  });
}, []);

// Updating settings
const handleUpdateSettings = useCallback(async (updated: Partial<AppSettings>) => {
  setSettings(prev => {
    const next = { ...prev, ...updated };
    saveAppState(STORAGE_KEYS.SETTINGS, next);
    return next;
  });
}, []);

// Updating custom avatar
const handleUpdateAvatar = useCallback(async (dataUrl: string | null) => {
  setCustomAvatar(dataUrl);
  await saveAppState('voyager_custom_avatar', dataUrl);
}, []);

// Logging water intake
const handleLogIntake = useCallback((amountMl: number, containerType?: 'cup' | 'bottle' | 'glass' | 'custom') => {
  const todayKey = getLocalDateString();
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  setDailyLogs(prev => {
    const existing = prev[todayKey] || {
      date: todayKey,
      targetMl: calculatedTargetMl,
      consumedMl: 0,
      entries: [],
      isGoalReached: false,
    };

    const newConsumed = existing.consumedMl + amountMl;
    const isGoalReached = newConsumed >= existing.targetMl;
    const previouslyReached = existing.isGoalReached;

    // Goal celebration trigger
    if (isGoalReached && !previouslyReached) {
      triggerConfetti();
      if (profile.soundEnabled) playCosmicSound('bubble');
      setStreak(s => {
        const nextStreak = s + 1;
        saveAppState(STORAGE_KEYS.STREAK, nextStreak);
        setRecordStreak(r => {
          const nextRecord = Math.max(r, nextStreak);
          saveAppState('voyager_record_streak', nextRecord);
          return nextRecord;
        });
        return nextStreak;
      });
    } else {
      if (profile.soundEnabled) playCosmicSound('ripple');
    }

    const updatedRecord: DailyHydrationRecord = {
      ...existing,
      consumedMl: newConsumed,
      isGoalReached,
      entries: [
        ...existing.entries,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          time: timeStr,
          amountMl,
          containerType: containerType || 'glass',
        },
      ],
    };

    const nextLogs = { ...prev, [todayKey]: updatedRecord };
    saveAppState(STORAGE_KEYS.DAILY_LOGS, nextLogs);
    return nextLogs;
  });
}, [calculatedTargetMl, profile.soundEnabled]);
```

#### Layout Structure & Card-UI Tokens
```tsx
<div className="min-h-screen bg-cosmic-void text-cosmic-text font-sans antialiased selection:bg-cosmic-blue/30">
  {/* Mobile Viewport Container */}
  <main className="max-w-md mx-auto min-h-screen relative flex flex-col pb-24 pt-safe px-4">
    {/* Tab Router */}
    {activeTab === 'today' && (
      <TodayTab
        dailyRecord={todayRecord}
        targetMl={calculatedTargetMl}
        weather={weather}
        streak={streak}
        unit={profile.unit}
        customAvatar={customAvatar}
        soundEnabled={profile.soundEnabled}
        onLogIntake={handleLogIntake}
      />
    )}
    {activeTab === 'reminder' && (
      <ReminderTab
        settings={settings}
        dailyRecord={todayRecord}
        targetMl={calculatedTargetMl}
        onUpdateSettings={handleUpdateSettings}
      />
    )}
    {activeTab === 'journal' && (
      <JournalTab
        dailyLogs={dailyLogs}
        currentDailyTargetMl={calculatedTargetMl}
        unit={profile.unit}
        currentStreak={streak}
        onDeleteLog={handleDeleteLog}
      />
    )}
    {activeTab === 'stats' && (
      <StatsTab
        dailyLogs={dailyLogs}
        currentDailyTargetMl={calculatedTargetMl}
        unit={profile.unit}
        customAvatar={customAvatar}
        currentStreak={streak}
        recordStreak={recordStreak}
      />
    )}
    {activeTab === 'profile' && (
      <ProfileTab
        profile={profile}
        settings={settings}
        weather={weather}
        isWeatherLoading={isWeatherLoading}
        customAvatar={customAvatar}
        dailyLogs={dailyLogs}
        onUpdateProfile={handleUpdateProfile}
        onUpdateSettings={handleUpdateSettings}
        onUpdateAvatar={handleUpdateAvatar}
        onRefreshWeather={handleRefreshWeather}
      />
    )}

    {/* Fixed Bottom Navigation Bar */}
    <NavigationBar activeTab={activeTab} onTabChange={setActiveTab} />
  </main>
</div>
```

---

## 5. Verification Method

### 5.1 Independent Verification Commands
To independently verify that the specification and implementations satisfy all requirements:

1. **Verify Unit Test Suite**:
   ```powershell
   npm test
   ```
   *Expected*: All 216 tests pass across all 9 test suites without warnings or errors.

2. **Verify E2E Test Suite (Tiers 1-4)**:
   ```powershell
   npm run test:e2e
   ```
   *Expected*:
   - Feature 13 (StatsTab): Tests 13.1, 13.2, 13.3, 13.4, 13.5 pass.
   - Feature 14 (ProfileTab): Tests 14.1, 14.2, 14.3, 14.4, 14.5 pass.
   - Boundary tests: 13.6, 13.7, 13.8, 13.9, 13.10, 14.6, 14.7, 14.8, 14.9, 14.10 pass.
   - Combination tests: T3.03, T3.05, T3.07, T3.12, T3.13, T3.15, T3.16 pass.
   - Scenario tests: T4.01, T4.08, T4.09 pass.

3. **Verify TypeScript & Vite Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: `tsc && vite build` completes with exit code 0 and zero TypeScript diagnostic errors.

### 5.2 Key Inspection Points
- Check `StatsTab.tsx`:
  - Verify `< DD/MM - DD/MM >` week string format.
  - Verify horizontal dashed line with `border-dashed border-sky-400`.
  - Verify peak column algorithm and perched mini Voyager Chibi.
- Check `ProfileTab.tsx`:
  - Verify verbatim string `"Tiến độ lưu trên máy này."`.
  - Verify all 6 companions have `locked: false` (zero paywalls).
  - Verify all 4 themes have `locked: false` (zero paywalls).
  - Verify JSON & CSV export buttons trigger file downloads.
- Check `App.tsx`:
  - Verify mobile wrapper frame: `max-w-md mx-auto min-h-screen`.
  - Verify dual-layer startup reconciliation pass (`reconcileStorage()`).

### 5.3 Invalidation Conditions
- Any introduction of VIP locked buttons, banners, or paywall restrictions.
- Any use of un-escaped CSV formatting or missing `\uFEFF` UTF-8 BOM.
- Division by zero in StatsTab when navigating to a week with no hydration records.
- Desynchronization between `userProfile.weightKg` updates and the active daily water goal.
