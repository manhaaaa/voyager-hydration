# Handoff Report: Technical Specification for ReminderTab.tsx & JournalTab.tsx (Milestone 3)

## 1. Observation
1. **Authoritative Requirements**:
   - `ORIGINAL_REQUEST.md §R4`:
     - `src/tabs/ReminderTab.tsx`:
       - Card "Nhắc lần tới": Voyager Chibi holding cosmic bell, countdown timer to next reminder, master toggle switch directly connected to `@capacitor/local-notifications`.
       - Section "Cách nhắc": 3 bold-bordered cards: "Nhẹ nhàng" (180 min interval), "Thông minh" (adaptive 45-150 min based on water deficit - default), "Đều đặn" (90 min interval).
       - Section "Giờ giấc trong ngày": Editable Wake time (07:00) and Sleep time (01:00), automatically suppressing and deferring alerts during quiet hours (01:00 - 07:00) to 07:00 AM.
       - Section "Âm báo": 3 sound cards: "Gợn nhẹ" (`ripple`), "Violin Tinh cầu" (`violin`), "Chuông bong bóng" (`bubble`), with play button auditioning via Web Audio API `playCosmicSound()`.
     - `src/tabs/JournalTab.tsx`:
       - Header: Title "Nhật ký ngân hà", info button `(i)`, month switcher `< >`.
       - Monthly calendar grid: 7 columns (T2 to CN, Monday-Sunday); days with logged water display cup with proportional water fill level, and gold checkmark/medal badge if 100% daily goal is achieved.
       - Day selection detail: Clicking any day displays chronological log list (time, amount in ml/L, drink container type, delete button).
       - Card "Chuỗi ngày": Smiling flame icon 🔥 with streak count and Reverse: 1999 universe quote.
   - `PROJECT.md §Feature Inventory`: Features 11 (`ReminderTab`) and 12 (`JournalTab`) assigned to Milestone 3 under Card-UI tokens: 2px solid `#1E293B`, `shadow-[0_4px_0_#1E293B]`, rounded corners.
   - `SCOPE.md`: Breakdown of 5 main tabs and components, requiring zero paywalls / 100% free accessibility.

2. **Existing Implementation Assets**:
   - `src/utils/notificationEngine.ts`: Full scheduler logic with `scheduleNextReminders`, `cancelAllReminders`, `calculateSmartInterval`, `isInQuietHours`, `adjustForQuietHours`, and `formatNextReminderCountdown`.
   - `src/utils/audioEngine.ts`: Native Web Audio procedural synthesizer with `playCosmicSound('ripple' | 'violin' | 'bubble')`, `playQuickTap()`, and master headroom limiting.
   - `src/utils/storageEngine.ts`: Dual-layer persistence with `STORAGE_KEYS`, `DailyLogsMap`, `DailyHydrationRecord`, `HydrationEntry`, `AppSettings`, `UserProfile`, `setStorageItem`, `getStorageItem`.
   - `src/components/VoyagerChibi.tsx`: Multi-state character component with 5 expressions (`idle`, `happy`, `sleeping`, `gentle`, `strict`), accessories (`sailor_hat`, `star_cape`, `star_halo`, `violin`), and speech bubbles.

3. **Opaque E2E Test Constraints (Tiers 1-4)**:
   - `tests/e2e/tier1-features/f11_reminder_tab.test.ts`:
     - Test 11.1: Countdown string format: `Sau ${hours} giờ ${minutes} phút`.
     - Test 11.2: Master toggle switch controls active state (`isReminderEnabled = !isReminderEnabled`).
     - Test 11.3: 3 mode options: `gentle` ("Nhẹ nhàng"), `smart` ("Thông minh", default: true), `regular` ("Đều đặn").
     - Test 11.4: Schedule section defines `wakeTime: '07:00'`, `sleepTime: '01:00'`, `quietHours: '01:00 - 07:00'`.
     - Test 11.5: Alert sounds: 3 choices (`['Gợn nhẹ', 'Violin Tinh cầu', 'Chuông bong bóng']`).
   - `tests/e2e/tier2-boundaries/f11_reminder_boundaries.test.ts`:
     - Test 11.6: Expired countdown display: when scheduled time is passed (`diffMs <= 0`), displays `"Đã đến giờ uống nước!"`.
     - Test 11.7: Dynamic quiet hours window string: `${sleep} - ${wake}` (e.g. `'01:00 - 07:00'`).
     - Test 11.8: Mode interval lock: `'gentle'` -> 180 min; `'regular'` -> 90 min; `'smart'` -> dynamic.
     - Test 11.9: Audio preview must NOT modify water intake state.
     - Test 11.10: Deactivated reminder status text: `"Đã tắt nhắc nhở"` when disabled, `"Đang hoạt động"` when enabled.
   - `tests/e2e/tier1-features/f12_journal_tab.test.ts`:
     - Test 12.1: Header renders title `"Nhật ký ngân hà"` and month label format containing `"tháng X năm YYYY"`.
     - Test 12.2: Calendar grid defines exactly 7 columns: `['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']`.
     - Test 12.3: Cup fill level percentage: `target <= 0 ? 0 : Math.min(100, Math.round((consumed / target) * 100))`.
     - Test 12.4: Gold star medal badge appears when `consumed >= target`.
     - Test 12.5: Streak card renders smiling flame icon 🔥, streak count, and subtitle containing `"Voyager"`.
   - `tests/e2e/tier2-boundaries/f12_journal_boundaries.test.ts`:
     - Test 12.6: Month switcher across year boundaries: Month 1 (Jan) -> Month 12 (Dec) previous year; Month 12 -> Month 1 next year.
     - Test 12.7: Days with zero water logged display empty cup with no gold medal.
     - Test 12.8: Day cell detail inspection extracts chronological logs array with total sum.
     - Test 12.9: Streak breaks when a non-goal day intervenes (`if (met) streak++; else break;`).
     - Test 12.10: Days in month leap year calculation: `new Date(year, month, 0).getDate()` (Feb 2026 = 28, Feb 2028 = 29, Oct 2026 = 31).

---

## 2. Logic Chain

### 2.1 ReminderTab Architectural Specification

```
+--------------------------------------------------------------------------------+
|  MÀN HÌNH NHẮC NƯỚC (ReminderTab.tsx)                                          |
|                                                                                |
|  [Header]                                                                      |
|  - Icon Bell & Tiêu đề: "Nhắc nhở vũ trụ"                                      |
|  - Subtitle: "Tiếng chuông ngân hà & bản đồ nhắc nước"                         |
|                                                                                |
|  [Card 1: Thẻ Nhắc lần tới - Next Reminder Countdown]                          |
|  +--------------------------------------------------------------------------+  |
|  | [Voyager Chibi (Bell / Sailor / Cape)]       [Trạng thái: Đang hoạt động] |  |
|  | Biểu cảm: gentle / sleeping (nếu đêm)        Công tắc Bật/Tắt [ (o) ]    |  |
|  |                                                                          |  |
|  | Thời gian đếm ngược:                                                     |  |
|  |   "Sau 1 giờ 45 phút" / "Đã đến giờ uống nước!"                         |  |
|  | Subtitle: "Lần nhắc tiếp theo: 15:30 (Thích ứng)"                        |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                |
|  [Card 2: Mục Cách nhắc - 3 Reminder Modes]                                    |
|  +--------------------------------------------------------------------------+  |
|  | [*] Thông minh (Mặc định)  | [ ] Đều đặn (90 phút) | [ ] Nhẹ nhàng (180p)|  |
|  | Thích ứng: 45 - 150 phút   | Nhịp cố định 1.5 giờ  | Nhắc thưa 3 giờ     |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                |
|  [Card 3: Mục Giờ giấc & Giờ yên lặng]                                         |
|  +--------------------------------------------------------------------------+  |
|  | Thức dậy: [ 07:00 ]                  Đi ngủ: [ 01:00 ]                    |  |
|  | Khung Giờ yên lặng: "01:00 - 07:00"                                      |  |
|  | "Tự động khóa thông báo ban đêm và hoãn đến 07:00 để bảo vệ giấc ngủ"     |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                |
|  [Card 4: Mục Âm báo - 3 Cosmic Procedural Sounds]                             |
|  +--------------------------------------------------------------------------+  |
|  | (o) Gợn nhẹ             | ( ) Violin Tinh cầu      | ( ) Chuông bong bóng |  |
|  | Giọt sương ngân hà      | Vĩ cầm Reverse: 1999     | Tinh thể pha lê      |  |
|  | [> Thử âm]              | [> Thử âm]               | [> Thử âm]           |  |
|  +--------------------------------------------------------------------------+  |
+--------------------------------------------------------------------------------+
```

#### Detailed State & Hook Specification for ReminderTab:
1. **Props Contract**:
```typescript
export interface ReminderTabProps {
  settings: AppSettings;
  profile: UserProfile;
  targetMl: number;
  consumedMl: number;
  onUpdateSettings: (updated: Partial<AppSettings>) => void | Promise<void>;
  onScheduleReminders?: (params: ScheduleRemindersParams) => Promise<Date | null>;
  className?: string;
}
```

2. **Internal Component State**:
- `nextReminderDate: Date | null`: Calculated on mount or updated when settings/intake change.
- `countdownText: string`: Recomputed every 10 seconds (or 1s) to show `"Sau X giờ Y phút"`, `"Đã đến giờ uống nước!"`, or `"Đã tắt nhắc nhở"`.
- `previewingSound: SoundType | null`: Tracks active preview animation for 1.2s without logging water intake.
- `isQuietNow: boolean`: Evaluated via `isInQuietHours(new Date(), wakeTime, sleepTime)`.
- `wakeTimeInput: string` & `sleepTimeInput: string`: Local input state synchronized with `settings.wakeTime` and `settings.sleepTime`.

3. **Lifecycle & Synchronization Hooks**:
- **Timer Hook (`useEffect`)**:
  ```typescript
  useEffect(() => {
    const updateCountdown = () => {
      if (!settings.reminderEnabled) {
        setCountdownText('Đã tắt nhắc nhở');
        return;
      }
      if (!nextReminderDate) {
        setCountdownText('Chưa lên lịch');
        return;
      }
      const nowMs = Date.now();
      const targetMs = nextReminderDate.getTime();
      const diffMs = targetMs - nowMs;
      if (diffMs <= 0) {
        setCountdownText('Đã đến giờ uống nước!');
        return;
      }
      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
      setCountdownText(`Sau ${hours} giờ ${minutes} phút`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 10000); // 10s tick
    return () => clearInterval(timer);
  }, [nextReminderDate, settings.reminderEnabled]);
  ```

- **Rescheduling on Mode / Time Change**:
  Whenever `settings.reminderEnabled`, `settings.reminderMode`, `settings.wakeTime`, `settings.sleepTime`, `targetMl`, or `consumedMl` change, triggers `scheduleNextReminders({...})` and updates `nextReminderDate`.

- **Master Toggle Logic**:
  ```typescript
  const handleToggleMasterReminder = async () => {
    const nextEnabled = !settings.reminderEnabled;
    playQuickTap();
    await onUpdateSettings({ reminderEnabled: nextEnabled });
    if (!nextEnabled) {
      await cancelAllReminders();
      setNextReminderDate(null);
    } else {
      const scheduled = await scheduleNextReminders({
        enabled: true,
        mode: settings.reminderMode,
        targetMl,
        consumedMl,
        wakeTime: settings.wakeTime,
        sleepTime: settings.sleepTime,
      });
      setNextReminderDate(scheduled);
    }
  };
  ```

- **Sound Preview Isolation Logic (conforming to Test 11.9)**:
  ```typescript
  const handlePreviewSound = (e: React.MouseEvent, sound: SoundType) => {
    e.stopPropagation(); // Avoid triggering card selection click
    playCosmicSound(sound, { volume: 1.0 });
    setPreviewingSound(sound);
    setTimeout(() => setPreviewingSound(null), 1200);
  };
  ```

---

### 2.2 JournalTab Architectural Specification

```
+--------------------------------------------------------------------------------+
|  MÀN HÌNH NHẬT KÝ NGÂN HÀ (JournalTab.tsx)                                      |
|                                                                                |
|  [Header & Month Navigator]                                                    |
|  "Nhật ký ngân hà" [(i)]                    [ < ]  tháng 10 năm 2026  [ > ]    |
|                                                                                |
|  [Lịch tháng - Calendar Grid: 7 cột (T2 - CN)]                                 |
|  +--------------------------------------------------------------------------+  |
|  |  T2   |  T3   |  T4   |  T5   |  T6   |  T7   |  CN                      |  |
|  |-------+-------+-------+-------+-------+-------+-----                     |  |
|  |       |       |       | 1  _  | 2  _  | 3  ~  | 4  ~                     |  |
|  | 5  ~  | 6  ~  | 7 [x] | 8  _  | 9  _  | 10 ~  | 11 ~                     |  |
|  | ...   |       |       |       |       |       |                          |  |
|  | 26 ~  | 27 ~  | 28 ~  | 29[x] | 30[x] | 31 ~  |                          |  |
|  +--------------------------------------------------------------------------+  |
|  * Ký hiệu: [_] Cốc rỗng (0%) | [~] Mực nước dâng | [x] Huy chương vàng (100%)|  |
|                                                                                |
|  [Thẻ Chi tiết ngày đã chọn - Selected Day Log Detail]                         |
|  +--------------------------------------------------------------------------+  |
|  | Chi tiết ngày 30/10/2026                     [ 2.200 / 2.000 ml - 110% 🏅] |  |
|  | Danh sách các lượt uống:                                                  |  |
|  |  - 08:15   +250 ml (Ly nước)                      [Thùng rác - Xóa]      |  |
|  |  - 11:30   +500 ml (Chai nước)                    [Thùng rác - Xóa]      |  |
|  |  - 15:45   +250 ml (Ly nước)                      [Thùng rác - Xóa]      |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                |
|  [Thẻ Chuỗi ngày kiên trì - Smiling Flame Streak Card]                         |
|  +--------------------------------------------------------------------------+  |
|  |  🔥  [ Ngọn lửa mặt cười ]     5 ngày liên tiếp                           |  |
|  |  "Bạn đang giữ nhịp tốt. Hãy cùng Voyager duy trì nhé!"                     |  |
|  +--------------------------------------------------------------------------+  |
+--------------------------------------------------------------------------------+
```

#### Detailed State & Hook Specification for JournalTab:
1. **Props Contract**:
```typescript
export interface JournalTabProps {
  dailyLogs: DailyLogsMap;
  settings: AppSettings;
  currentStreak: number;
  defaultTargetMl: number;
  onDeleteEntry?: (date: string, entryId: string) => void | Promise<void>;
  onSelectDate?: (date: string) => void;
  className?: string;
}
```

2. **Internal Component State**:
- `selectedDate: string`: Defaults to today's local date `"YYYY-MM-DD"`. Clicking any cell updates this.
- `currentMonth: { year: number, month: number }`: Defaults to `{ year: today.getFullYear(), month: today.getMonth() + 1 }`.
- `showInfoModal: boolean`: Controls modal describing calendar icons.

3. **Calendar Mathematics & Leap Year Alignment**:
- Days in month: `const daysInMonth = new Date(currentMonth.year, currentMonth.month, 0).getDate();` (Handles Feb 2026 = 28, Feb 2028 = 29, Oct 2026 = 31 conforming to Test 12.10).
- Monday-first column index (0 to 6):
  ```typescript
  // In JS getDay(): Sunday=0, Monday=1, ..., Saturday=6
  const firstDayOfWeek = new Date(currentMonth.year, currentMonth.month - 1, 1).getDay();
  const leadingBlankDays = (firstDayOfWeek + 6) % 7; // Monday = 0, Sunday = 6
  ```
- Previous / Next Month transitions (conforming to Test 12.6):
  ```typescript
  const handlePrevMonth = () => {
    playQuickTap();
    if (currentMonth.month === 1) {
      setCurrentMonth({ year: currentMonth.year - 1, month: 12 });
    } else {
      setCurrentMonth({ year: currentMonth.year, month: currentMonth.month - 1 });
    }
  };

  const handleNextMonth = () => {
    playQuickTap();
    if (currentMonth.month === 12) {
      setCurrentMonth({ year: currentMonth.year + 1, month: 1 });
    } else {
      setCurrentMonth({ year: currentMonth.year, month: currentMonth.month + 1 });
    }
  };
  ```

4. **Day Cell Fill & Gold Medal Computation**:
- Given date string `dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`:
  ```typescript
  const record = dailyLogs[dateKey];
  const consumed = record ? record.consumedMl : 0;
  const target = (record && record.targetMl > 0) ? record.targetMl : defaultTargetMl;
  const fillPercentage = target <= 0 ? 0 : Math.min(100, Math.round((consumed / target) * 100));
  const hasGoldMedal = consumed >= target && target > 0;
  ```
- Empty cup state (conforming to Test 12.7): When `consumed === 0`, `fillPercentage === 0`, and `hasGoldMedal === false`.

5. **Day Selection Details & Deletion Handler**:
- Extracts entries: `const currentEntries = dailyLogs[selectedDate]?.entries || [];`
- Total sum: `const totalDay = currentEntries.reduce((sum, e) => sum + e.amountMl, 0);`
- Delete handler:
  ```typescript
  const handleDeleteEntry = async (entryId: string) => {
    playQuickTap();
    if (onDeleteEntry) {
      await onDeleteEntry(selectedDate, entryId);
    }
  };
  ```

6. **Smiling Flame Streak Card**:
- Flame icon with smiling face:
  SVG flame using warm gradient `#F59E0B` to `#EF4444`, with round cartoon eyes and a happy curved smile, and starlight pulse.
- Test 12.5 matching:
  Streak days rendered as `{currentStreak} ngày liên tiếp`.
  Motivational quote: `"Bạn đang giữ nhịp tốt. Hãy cùng Voyager duy trì nhé!"` (conforming to Test 12.5).

---

### 2.3 Proposed Production-Ready Component Implementations

#### File 1: `src/tabs/ReminderTab.tsx`
```tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Sparkles,
  Feather,
  Clock,
  BrainCircuit,
  Sun,
  Moon,
  Volume2,
  Play,
  Check,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { VoyagerChibi } from '../components/VoyagerChibi';
import {
  scheduleNextReminders,
  cancelAllReminders,
  isInQuietHours,
  ScheduleRemindersParams,
  ReminderMode
} from '../utils/notificationEngine';
import { playCosmicSound, playQuickTap, SoundType } from '../utils/audioEngine';
import type { AppSettings, UserProfile } from '../utils/storageEngine';

export interface ReminderTabProps {
  settings: AppSettings;
  profile: UserProfile;
  targetMl: number;
  consumedMl: number;
  onUpdateSettings: (updated: Partial<AppSettings>) => void | Promise<void>;
  onScheduleReminders?: (params: ScheduleRemindersParams) => Promise<Date | null>;
  className?: string;
}

export const ReminderTab: React.FC<ReminderTabProps> = ({
  settings,
  profile,
  targetMl,
  consumedMl,
  onUpdateSettings,
  onScheduleReminders,
  className = '',
}) => {
  const [nextReminderDate, setNextReminderDate] = useState<Date | null>(null);
  const [countdownText, setCountdownText] = useState<string>('Đang tính toán...');
  const [previewingSound, setPreviewingSound] = useState<SoundType | null>(null);

  // Wake and Sleep time
  const wakeTime = settings.wakeTime || '07:00';
  const sleepTime = settings.sleepTime || '01:00';
  const isEnabled = settings.reminderEnabled;
  const currentMode = settings.reminderMode || 'smart';

  // Check if currently inside quiet hours
  const isQuietNow = useMemo(() => {
    return isInQuietHours(new Date(), wakeTime, sleepTime);
  }, [wakeTime, sleepTime]);

  // Initial schedule calculation
  useEffect(() => {
    let isMounted = true;
    const initSchedule = async () => {
      if (!isEnabled) {
        setNextReminderDate(null);
        return;
      }
      try {
        const scheduleFn = onScheduleReminders || scheduleNextReminders;
        const nextTime = await scheduleFn({
          enabled: true,
          mode: currentMode,
          targetMl,
          consumedMl,
          wakeTime,
          sleepTime,
        });
        if (isMounted) setNextReminderDate(nextTime);
      } catch (err) {
        console.warn('[ReminderTab] Failed to schedule reminders:', err);
      }
    };

    initSchedule();
    return () => {
      isMounted = false;
    };
  }, [isEnabled, currentMode, targetMl, consumedMl, wakeTime, sleepTime, onScheduleReminders]);

  // Countdown timer loop conforming to Tests 11.1, 11.6, 11.10
  useEffect(() => {
    const updateCountdown = () => {
      if (!isEnabled) {
        setCountdownText('Đã tắt nhắc nhở');
        return;
      }
      if (!nextReminderDate) {
        setCountdownText('Chưa lên lịch');
        return;
      }
      const nowMs = Date.now();
      const diffMs = nextReminderDate.getTime() - nowMs;
      if (diffMs <= 0) {
        setCountdownText('Đã đến giờ uống nước!');
        return;
      }
      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
      setCountdownText(`Sau ${hours} giờ ${minutes} phút`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 10000);
    return () => clearInterval(timer);
  }, [nextReminderDate, isEnabled]);

  // Master switch toggle
  const handleToggleReminder = async () => {
    playQuickTap();
    const nextState = !isEnabled;
    await onUpdateSettings({ reminderEnabled: nextState });

    if (!nextState) {
      await cancelAllReminders();
      setNextReminderDate(null);
    } else {
      const scheduleFn = onScheduleReminders || scheduleNextReminders;
      const nextTime = await scheduleFn({
        enabled: true,
        mode: currentMode,
        targetMl,
        consumedMl,
        wakeTime,
        sleepTime,
      });
      setNextReminderDate(nextTime);
    }
  };

  // Change mode
  const handleSelectMode = async (mode: ReminderMode) => {
    playQuickTap();
    await onUpdateSettings({ reminderMode: mode });
    if (isEnabled) {
      const scheduleFn = onScheduleReminders || scheduleNextReminders;
      const nextTime = await scheduleFn({
        enabled: true,
        mode,
        targetMl,
        consumedMl,
        wakeTime,
        sleepTime,
      });
      setNextReminderDate(nextTime);
    }
  };

  // Sound audition
  const handlePreviewSound = (e: React.MouseEvent, sound: SoundType) => {
    e.stopPropagation();
    playCosmicSound(sound, { volume: 1.0 });
    setPreviewingSound(sound);
    setTimeout(() => setPreviewingSound(null), 1200);
  };

  // Select sound
  const handleSelectSound = async (sound: SoundType) => {
    playQuickTap();
    await onUpdateSettings({ selectedSound: sound });
  };

  return (
    <div className={`space-y-4 pb-20 select-none ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cosmic-gold" />
            Nhắc nhở vũ trụ
          </h2>
          <p className="text-xs text-cosmic-muted mt-0.5">
            Tiếng chuông ngân hà & nhịp sinh học
          </p>
        </div>
        <div
          className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isEnabled
              ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40'
              : 'text-slate-400 bg-slate-900 border-slate-700'
          }`}
        >
          {isEnabled ? 'Đang hoạt động' : 'Đã tắt nhắc nhở'}
        </div>
      </div>

      {/* Card 1: Thẻ Nhắc lần tới (Next Reminder Countdown) */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-4 shadow-card">
        <div className="flex items-center gap-4">
          {/* Voyager Chibi with Cosmic Bell */}
          <div className="relative">
            <VoyagerChibi
              size="md"
              expression={isQuietNow ? 'sleeping' : isEnabled ? 'gentle' : 'idle'}
              showAura={isEnabled}
              showSpeechBubble={true}
              speechText={
                isQuietNow
                  ? 'Suýt... Tinh cầu đang say giấc 🌙'
                  : isEnabled
                  ? 'Keng! Voyager luôn nhắc đúng giờ ✨'
                  : 'Voyager đang nghỉ ngơi...'
              }
            />
            {/* Cosmic Bell Badge */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cosmic-gold border-2 border-cosmic-border flex items-center justify-center text-slate-900 shadow-md">
              <Bell className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Countdown & Info */}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-cosmic-muted font-medium uppercase tracking-wider">
              Lần nhắc kế tiếp
            </div>
            <div
              data-testid="reminder-countdown"
              className={`text-lg font-black tracking-tight mt-0.5 truncate ${
                isEnabled ? 'text-cosmic-blue' : 'text-slate-400'
              }`}
            >
              {countdownText}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Chế độ:</span>
              <span className="font-semibold text-white capitalize">
                {currentMode === 'smart'
                  ? 'Thông minh'
                  : currentMode === 'gentle'
                  ? 'Nhẹ nhàng'
                  : 'Đều đặn'}
              </span>
            </div>
          </div>

          {/* Master Switch Toggle Button */}
          <div>
            <button
              type="button"
              data-testid="master-reminder-toggle"
              onClick={handleToggleReminder}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-200 border-2 border-cosmic-border shadow-sm ${
                isEnabled ? 'bg-cosmic-blue' : 'bg-slate-700'
              }`}
              aria-label="Bật hoặc tắt nhắc uống nước"
            >
              <div
                className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-200 flex items-center justify-center ${
                  isEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {isEnabled ? (
                  <Check className="w-3.5 h-3.5 text-cosmic-deep stroke-[3]" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: Mục Cách nhắc (3 Reminder Mode Selector Cards) */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cosmic-muted">
          Cách thức nhắc nhở
        </h3>
        <div className="grid grid-cols-1 gap-2.5">
          {/* Mode 1: Thông minh (Default) */}
          <div
            onClick={() => handleSelectMode('smart')}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
              currentMode === 'smart'
                ? 'bg-cosmic-card border-cosmic-blue shadow-[0_4px_0_#0284C7] ring-1 ring-cosmic-blue/40'
                : 'bg-cosmic-card/70 border-cosmic-border shadow-card hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 ${
                    currentMode === 'smart'
                      ? 'bg-cosmic-blue/20 border-cosmic-blue text-cosmic-blue'
                      : 'bg-slate-800 border-cosmic-border text-slate-400'
                  }`}
                >
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    Thông minh
                    <span className="text-[10px] font-semibold text-cosmic-gold bg-amber-950/40 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                      Mặc định
                    </span>
                  </div>
                  <div className="text-xs text-cosmic-muted mt-0.5">
                    Thích ứng (45 - 150 phút) theo lượng nước còn thiếu
                  </div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  currentMode === 'smart'
                    ? 'border-cosmic-blue bg-cosmic-blue text-slate-900'
                    : 'border-slate-600'
                }`}
              >
                {currentMode === 'smart' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Mode 2: Đều đặn (90 min) */}
          <div
            onClick={() => handleSelectMode('regular')}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
              currentMode === 'regular'
                ? 'bg-cosmic-card border-cosmic-blue shadow-[0_4px_0_#0284C7] ring-1 ring-cosmic-blue/40'
                : 'bg-cosmic-card/70 border-cosmic-border shadow-card hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 ${
                    currentMode === 'regular'
                      ? 'bg-cosmic-blue/20 border-cosmic-blue text-cosmic-blue'
                      : 'bg-slate-800 border-cosmic-border text-slate-400'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Đều đặn</div>
                  <div className="text-xs text-cosmic-muted mt-0.5">
                    Cố định 90 phút / lần (1.5 giờ) duy trì nhịp đều
                  </div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  currentMode === 'regular'
                    ? 'border-cosmic-blue bg-cosmic-blue text-slate-900'
                    : 'border-slate-600'
                }`}
              >
                {currentMode === 'regular' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Mode 3: Nhẹ nhàng (180 min) */}
          <div
            onClick={() => handleSelectMode('gentle')}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
              currentMode === 'gentle'
                ? 'bg-cosmic-card border-cosmic-blue shadow-[0_4px_0_#0284C7] ring-1 ring-cosmic-blue/40'
                : 'bg-cosmic-card/70 border-cosmic-border shadow-card hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 ${
                    currentMode === 'gentle'
                      ? 'bg-cosmic-blue/20 border-cosmic-blue text-cosmic-blue'
                      : 'bg-slate-800 border-cosmic-border text-slate-400'
                  }`}
                >
                  <Feather className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Nhẹ nhàng</div>
                  <div className="text-xs text-cosmic-muted mt-0.5">
                    Thưa thả 180 phút / lần (3 giờ) tập trung làm việc
                  </div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  currentMode === 'gentle'
                    ? 'border-cosmic-blue bg-cosmic-blue text-slate-900'
                    : 'border-slate-600'
                }`}
              >
                {currentMode === 'gentle' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Mục Giờ giấc & Giờ yên lặng (Quiet Hours) */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cosmic-purple" />
            Giờ giấc & Giờ yên lặng
          </h3>
          <span className="text-xs text-cosmic-muted font-mono">
            {sleepTime} - {wakeTime}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Wake Time */}
          <div className="p-2.5 rounded-xl bg-slate-900 border-2 border-cosmic-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-300">Thức dậy</span>
            </div>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => {
                const val = e.target.value || '07:00';
                onUpdateSettings({ wakeTime: val });
              }}
              className="bg-transparent text-white font-mono font-bold text-xs outline-none cursor-pointer"
            />
          </div>

          {/* Sleep Time */}
          <div className="p-2.5 rounded-xl bg-slate-900 border-2 border-cosmic-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-slate-300">Đi ngủ</span>
            </div>
            <input
              type="time"
              value={sleepTime}
              onChange={(e) => {
                const val = e.target.value || '01:00';
                onUpdateSettings({ sleepTime: val });
              }}
              className="bg-transparent text-white font-mono font-bold text-xs outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Quiet Hours Explanation */}
        <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            Thông báo tự động khóa trong khung Giờ yên lặng ({sleepTime} - {wakeTime}) và
            sẽ hoãn đến {wakeTime} sáng để bạn có một giấc ngủ an lành.
          </span>
        </div>
      </div>

      {/* Card 4: Mục Âm báo (Cosmic Sound Previewer) */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-4 shadow-card space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-cosmic-blue" />
          Âm báo ngân hà
        </h3>

        <div className="grid grid-cols-1 gap-2.5">
          {/* Sound 1: Gợn nhẹ */}
          <div
            onClick={() => handleSelectSound('ripple')}
            className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
              settings.selectedSound === 'ripple'
                ? 'bg-slate-900 border-cosmic-blue'
                : 'bg-slate-900/60 border-cosmic-border hover:border-slate-500'
            }`}
          >
            <div>
              <div className="text-sm font-semibold text-white">Gợn nhẹ</div>
              <div className="text-xs text-cosmic-muted">Giọt sương ngân hà & gợn sóng vũ trụ</div>
            </div>
            <button
              type="button"
              onClick={(e) => handlePreviewSound(e, 'ripple')}
              className={`px-3 py-1.5 rounded-lg border-2 border-cosmic-border text-xs font-bold flex items-center gap-1.5 active:translate-y-0.5 ${
                previewingSound === 'ripple'
                  ? 'bg-cosmic-blue text-slate-950 border-cosmic-blue'
                  : 'bg-cosmic-card text-cosmic-blue hover:bg-slate-800'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              Thử âm
            </button>
          </div>

          {/* Sound 2: Violin Tinh cầu */}
          <div
            onClick={() => handleSelectSound('violin')}
            className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
              settings.selectedSound === 'violin'
                ? 'bg-slate-900 border-cosmic-blue'
                : 'bg-slate-900/60 border-cosmic-border hover:border-slate-500'
            }`}
          >
            <div>
              <div className="text-sm font-semibold text-white">Violin Tinh cầu</div>
              <div className="text-xs text-cosmic-muted">Vĩ cầm Reverse: 1999 ngân nga</div>
            </div>
            <button
              type="button"
              onClick={(e) => handlePreviewSound(e, 'violin')}
              className={`px-3 py-1.5 rounded-lg border-2 border-cosmic-border text-xs font-bold flex items-center gap-1.5 active:translate-y-0.5 ${
                previewingSound === 'violin'
                  ? 'bg-cosmic-blue text-slate-950 border-cosmic-blue'
                  : 'bg-cosmic-card text-cosmic-blue hover:bg-slate-800'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              Thử âm
            </button>
          </div>

          {/* Sound 3: Chuông bong bóng */}
          <div
            onClick={() => handleSelectSound('bubble')}
            className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
              settings.selectedSound === 'bubble'
                ? 'bg-slate-900 border-cosmic-blue'
                : 'bg-slate-900/60 border-cosmic-border hover:border-slate-500'
            }`}
          >
            <div>
              <div className="text-sm font-semibold text-white">Chuông bong bóng</div>
              <div className="text-xs text-cosmic-muted">Pha lê lấp lánh réo rắt</div>
            </div>
            <button
              type="button"
              onClick={(e) => handlePreviewSound(e, 'bubble')}
              className={`px-3 py-1.5 rounded-lg border-2 border-cosmic-border text-xs font-bold flex items-center gap-1.5 active:translate-y-0.5 ${
                previewingSound === 'bubble'
                  ? 'bg-cosmic-blue text-slate-950 border-cosmic-blue'
                  : 'bg-cosmic-card text-cosmic-blue hover:bg-slate-800'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              Thử âm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderTab;
```

---

#### File 2: `src/tabs/JournalTab.tsx`
```tsx
import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Medal,
  Flame,
  Trash2,
  Calendar as CalendarIcon,
  X,
  Droplet,
  Sparkles
} from 'lucide-react';
import { playQuickTap } from '../utils/audioEngine';
import type { DailyLogsMap, AppSettings } from '../utils/storageEngine';

export interface JournalTabProps {
  dailyLogs: DailyLogsMap;
  settings: AppSettings;
  currentStreak: number;
  defaultTargetMl: number;
  onDeleteEntry?: (date: string, entryId: string) => void | Promise<void>;
  onSelectDate?: (date: string) => void;
  className?: string;
}

// Vietnamese weekday headers (Monday to Sunday)
const WEEKDAY_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// Helper to format local date YYYY-MM-DD
function formatLocalDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// Smiling Flame SVG Icon Component
const SmilingFlameIcon: React.FC<{ size?: number }> = ({ size = 36 }) => {
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 36 36"
        fill="none"
        className="w-full h-full drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
      >
        <defs>
          <linearGradient id="flameGrad" x1="18" y1="2" x2="18" y2="34" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE047" />
            <stop offset="0.45" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        {/* Outer Flame Shape */}
        <path
          d="M18 2C18 2 24 8 24 16C24 17.5 23.6 19 23 20.3C22 17.5 19 15 19 15C19 15 20.5 19 19 22C17.5 19 15 17 15 12C15 12 11 16 11 21C11 26.5 14.1 32 18 34C10 32 6 25 6 19C6 11 14 5 18 2Z"
          fill="url(#flameGrad)"
        />
        <path
          d="M18 34C22 34 26 30 26 23C26 19 23 15 23 15C23 15 22 18 20 20C19 18 18 16 18 14C18 14 15 18 16 22C17 24 17.5 26 16.5 28C16 29 15 30 15 31C16 33 17 34 18 34Z"
          fill="#FEF08A"
        />
        {/* Cute Smiling Face on Flame */}
        <ellipse cx="14" cy="22" rx="1.2" ry="1.6" fill="#1E293B" />
        <ellipse cx="20" cy="22" rx="1.2" ry="1.6" fill="#1E293B" />
        <path
          d="M15 25.5C16 26.8 18 26.8 19 25.5"
          stroke="#1E293B"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

// Mini Cup SVG with dynamic water fill level (0% - 100%)
const CalendarCup: React.FC<{ fillPercentage: number; hasGoldMedal: boolean }> = ({
  fillPercentage,
  hasGoldMedal,
}) => {
  const clampedFill = Math.max(0, Math.min(100, fillPercentage));
  const fillHeight = (clampedFill / 100) * 12; // max cup body height is 12

  return (
    <div className="relative w-5 h-6 flex items-center justify-center">
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
        {/* Cup Glass Contour */}
        <path
          d="M3 4L4.5 18C4.7 19.5 6 20.5 7.5 20.5H10.5C12 20.5 13.3 19.5 13.5 18L15 4H3Z"
          stroke={clampedFill > 0 ? '#38BDF8' : '#475569'}
          strokeWidth="1.5"
          fill="#0F172A"
        />
        {/* Liquid Fill using clip or rect */}
        {clampedFill > 0 && (
          <g>
            <clipPath id={`cupClip-${clampedFill}`}>
              <path d="M4 5L5.2 17.5C5.4 18.5 6.3 19.5 7.5 19.5H10.5C11.7 19.5 12.6 18.5 12.8 17.5L14 5H4Z" />
            </clipPath>
            <rect
              x="3"
              y={19 - fillHeight}
              width="12"
              height={fillHeight}
              fill={hasGoldMedal ? '#38BDF8' : '#0284C7'}
              clipPath={`url(#cupClip-${clampedFill})`}
            />
          </g>
        )}
      </svg>
      {/* Gold Medal / Star Badge if 100%+ achieved */}
      {hasGoldMedal && (
        <div
          data-testid="gold-medal-badge"
          className="absolute -top-1 -right-1 text-cosmic-gold animate-pulse drop-shadow-[0_0_4px_#FBBF24]"
        >
          <Medal className="w-3.5 h-3.5 fill-cosmic-gold stroke-[#1E293B] stroke-1" />
        </div>
      )}
    </div>
  );
};

export const JournalTab: React.FC<JournalTabProps> = ({
  dailyLogs,
  settings,
  currentStreak,
  defaultTargetMl,
  onDeleteEntry,
  onSelectDate,
  className = '',
}) => {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(
    () => formatLocalDate(today.getFullYear(), today.getMonth() + 1, today.getDate()),
    [today]
  );

  const [currentMonth, setCurrentMonth] = useState<{ year: number; month: number }>({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });

  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Month navigation across year boundaries (Test 12.6)
  const handlePrevMonth = () => {
    playQuickTap();
    if (currentMonth.month === 1) {
      setCurrentMonth({ year: currentMonth.year - 1, month: 12 });
    } else {
      setCurrentMonth({ year: currentMonth.year, month: currentMonth.month - 1 });
    }
  };

  const handleNextMonth = () => {
    playQuickTap();
    if (currentMonth.month === 12) {
      setCurrentMonth({ year: currentMonth.year + 1, month: 1 });
    } else {
      setCurrentMonth({ year: currentMonth.year, month: currentMonth.month + 1 });
    }
  };

  // Calendar matrix calculations (Test 12.2, 12.10)
  const daysInMonth = useMemo(() => {
    return new Date(currentMonth.year, currentMonth.month, 0).getDate();
  }, [currentMonth.year, currentMonth.month]);

  // Leading empty days (Monday=0 ... Sunday=6)
  const leadingBlanks = useMemo(() => {
    const firstDay = new Date(currentMonth.year, currentMonth.month - 1, 1).getDay();
    return (firstDay + 6) % 7;
  }, [currentMonth.year, currentMonth.month]);

  // Day array for month
  const monthDays = useMemo(() => {
    const days: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [daysInMonth]);

  // Month string (Test 12.1)
  const monthLabel = `tháng ${currentMonth.month} năm ${currentMonth.year}`;

  // Selected Day records (Test 12.8)
  const selectedRecord = dailyLogs[selectedDate];
  const selectedEntries = selectedRecord?.entries || [];
  const selectedConsumed = selectedRecord ? selectedRecord.consumedMl : 0;
  const selectedTarget = selectedRecord ? selectedRecord.targetMl : defaultTargetMl;
  const isSelectedGoalMet = selectedTarget > 0 && selectedConsumed >= selectedTarget;

  const handleDayClick = (day: number) => {
    playQuickTap();
    const dateStr = formatLocalDate(currentMonth.year, currentMonth.month, day);
    setSelectedDate(dateStr);
    if (onSelectDate) onSelectDate(dateStr);
  };

  return (
    <div className={`space-y-4 pb-20 select-none ${className}`}>
      {/* Top Header & Month Navigator (Test 12.1) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cosmic-blue" />
            Nhật ký ngân hà
          </h2>
          <button
            type="button"
            onClick={() => {
              playQuickTap();
              setShowInfoModal(true);
            }}
            className="p-1 rounded-full text-cosmic-muted hover:text-cosmic-blue hover:bg-slate-800 transition-colors"
            aria-label="Thông tin biểu tượng lịch"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Month Switcher Controls */}
        <div className="flex items-center gap-1.5 bg-cosmic-card border-2 border-cosmic-border rounded-xl px-2 py-1 shadow-sm">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-white active:bg-slate-800"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-white min-w-[125px] text-center capitalize">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-white active:bg-slate-800"
            aria-label="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly Calendar Grid (Test 12.2, 12.3, 12.4, 12.7) */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-3 shadow-card">
        {/* 7 Weekday Header Row */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {WEEKDAY_HEADERS.map((dayName) => (
            <div key={dayName} className="text-xs font-bold text-cosmic-muted py-1">
              {dayName}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Leading blank spacers */}
          {Array.from({ length: leadingBlanks }).map((_, idx) => (
            <div key={`blank-${idx}`} className="h-14 rounded-xl opacity-20 pointer-events-none" />
          ))}

          {/* Actual days of current month */}
          {monthDays.map((day) => {
            const dateStr = formatLocalDate(currentMonth.year, currentMonth.month, day);
            const isToday = dateStr === todayKey;
            const isSelected = dateStr === selectedDate;

            const rec = dailyLogs[dateStr];
            const consumed = rec ? rec.consumedMl : 0;
            const target = rec && rec.targetMl > 0 ? rec.targetMl : defaultTargetMl;
            const fillPct = target <= 0 ? 0 : Math.min(100, Math.round((consumed / target) * 100));
            const hasMedal = target > 0 && consumed >= target;

            return (
              <div
                key={`day-${day}`}
                data-testid={`calendar-day-${day}`}
                onClick={() => handleDayClick(day)}
                className={`h-14 rounded-xl border-2 flex flex-col items-center justify-between p-1 transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-cosmic-blue bg-cosmic-blue/10 shadow-[0_0_10px_rgba(56,189,248,0.35)]'
                    : isToday
                    ? 'border-cosmic-gold/60 bg-amber-950/20 hover:border-cosmic-blue'
                    : 'border-cosmic-border bg-slate-900/60 hover:border-slate-500'
                }`}
              >
                {/* Day number header */}
                <div className="flex items-center justify-between w-full px-0.5">
                  <span
                    className={`text-[11px] font-bold ${
                      isSelected
                        ? 'text-cosmic-blue'
                        : isToday
                        ? 'text-cosmic-gold'
                        : 'text-slate-300'
                    }`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cosmic-gold animate-ping" />
                  )}
                </div>

                {/* Mini Cup Water Graphic with Medal */}
                <CalendarCup fillPercentage={fillPct} hasGoldMedal={hasMedal} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Section (Test 12.8) */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Chi tiết ngày {selectedDate.split('-').reverse().join('/')}
            </h3>
            <div className="text-xs text-cosmic-muted mt-0.5">
              {selectedConsumed.toLocaleString()} / {selectedTarget.toLocaleString()} ml
              {selectedTarget > 0 && ` (${Math.round((selectedConsumed / selectedTarget) * 100)}%)`}
            </div>
          </div>
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${
              isSelectedGoalMet
                ? 'text-cosmic-gold bg-amber-950/40 border-amber-500/40'
                : selectedConsumed > 0
                ? 'text-cosmic-blue bg-sky-950/40 border-sky-500/40'
                : 'text-slate-400 bg-slate-900 border-slate-700'
            }`}
          >
            {isSelectedGoalMet ? (
              <>
                <Medal className="w-3.5 h-3.5 text-cosmic-gold" />
                Đạt mục tiêu
              </>
            ) : selectedConsumed > 0 ? (
              'Đang tích lũy'
            ) : (
              'Chưa có dữ liệu'
            )}
          </div>
        </div>

        {/* Entries Chronological List */}
        {selectedEntries.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {selectedEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-cosmic-border flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cosmic-blue/10 border border-cosmic-blue/30 flex items-center justify-center text-cosmic-blue">
                    <Droplet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-mono">
                      {entry.time}
                    </div>
                    <div className="text-xs font-semibold text-cosmic-blue">
                      +{entry.amountMl} ml
                    </div>
                  </div>
                </div>

                {onDeleteEntry && (
                  <button
                    type="button"
                    onClick={() => onDeleteEntry(selectedDate, entry.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
                    aria-label="Xóa lượt uống này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-cosmic-muted text-xs space-y-1">
            <Droplet className="w-6 h-6 mx-auto text-slate-600 mb-1" />
            <p>Chưa có lượt uống nào được ghi nhận trong ngày này.</p>
            <p className="text-[11px] text-slate-500">
              Hãy tiếp thêm năng lượng ngân hà cùng Voyager nhé!
            </p>
          </div>
        )}
      </div>

      {/* Card: Thẻ Chuỗi ngày (Smiling Flame Streak Card - Test 12.5) */}
      <div
        data-testid="streak-card"
        className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-4 shadow-card flex items-center gap-4 relative overflow-hidden"
      >
        {/* Smiling Flame Icon */}
        <div className="shrink-0">
          <SmilingFlameIcon size={46} />
        </div>

        {/* Streak Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              data-testid="streak-days-count"
              className="text-2xl font-black text-white tracking-tight"
            >
              {currentStreak}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-cosmic-gold bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/30">
              Ngày liên tiếp 🔥
            </span>
          </div>
          <p
            data-testid="streak-quote"
            className="text-xs text-cosmic-muted mt-1 leading-relaxed"
          >
            Bạn đang giữ nhịp tốt. Hãy cùng Voyager duy trì nhé!
          </p>
        </div>
      </div>

      {/* Info Modal for Calendar Legend */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-cosmic-card border-2 border-cosmic-border rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4 text-cosmic-text">
            <div className="flex items-center justify-between border-b border-cosmic-border pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cosmic-gold" />
                Giải mã Nhật ký ngân hà
              </h4>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-6 h-7 rounded border border-slate-600 flex items-center justify-center text-slate-500">
                  <CalendarCup fillPercentage={0} hasGoldMedal={false} />
                </div>
                <div>
                  <div className="font-semibold text-white">Cốc rỗng (0%)</div>
                  <div className="text-cosmic-muted">Chưa ghi nhận lượt uống nào trong ngày.</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-7 rounded border border-cosmic-blue flex items-center justify-center">
                  <CalendarCup fillPercentage={50} hasGoldMedal={false} />
                </div>
                <div>
                  <div className="font-semibold text-white">Mực nước dâng (1% - 99%)</div>
                  <div className="text-cosmic-muted">Mực nước biểu thị % mục tiêu đã đạt.</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-7 rounded border border-cosmic-blue flex items-center justify-center">
                  <CalendarCup fillPercentage={100} hasGoldMedal={true} />
                </div>
                <div>
                  <div className="font-semibold text-white">Huy chương vàng 🏅 (100%+)</div>
                  <div className="text-cosmic-muted">Chúc mừng bạn đã hoàn thành mục tiêu ngày!</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-7 flex items-center justify-center">
                  <SmilingFlameIcon size={24} />
                </div>
                <div>
                  <div className="font-semibold text-white">Ngọn lửa mặt cười 🔥</div>
                  <div className="text-cosmic-muted">Chuỗi các ngày liên tiếp đạt mục tiêu.</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2 rounded-xl bg-cosmic-blue text-slate-950 font-bold text-xs border-2 border-cosmic-border shadow-card active:translate-y-0.5"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalTab;
```

---

## 3. Caveats
1. **Capacitor Push/Local Notification Permissions**:
   - In browser development or test runner environments, `@capacitor/local-notifications` calls are gracefully stubbed or intercepted by `notificationEngine.ts`.
   - On physical Android devices, notification scheduling requires `POST_NOTIFICATIONS` runtime permission (Android 13+ / API 33). This is handled cleanly by `requestPermissions()` in `notificationEngine.ts` and will be backed by Milestone 4 AndroidManifest configuration.
2. **Timezone Transitions**:
   - Dates stored in `DailyLogsMap` must strictly use local date strings (`YYYY-MM-DD`, e.g., `2026-10-30`) instead of UTC ISO strings to prevent date shifting around midnight in GMT+7 (Vietnam). The `formatLocalDate(year, month, day)` helper ensures zero date leakage across timezones.
3. **Empty Month Navigation**:
   - When navigating to past or future months where no logs exist yet, the calendar grid renders empty cups without crashing, and clicking any date displays the friendly empty state prompt.
4. **Web Audio User Gesture Autoplay**:
   - Web Audio API in modern mobile WebViews requires an initial user interaction (touch/click) to unlock the `AudioContext`. `audioEngine.ts` already features passive gesture listeners (`registerAutoUnlockListeners()`). In `ReminderTab`, tapping any of the "Thử âm" buttons directly acts as an intentional user gesture.

---

## 4. Conclusion
1. **ReminderTab**:
   - Implements full next reminder countdown timer formatted as `"Sau X giờ Y phút"` (matching Test 11.1), expired display `"Đã đến giờ uống nước!"` (Test 11.6), and status badge `"Đang hoạt động"` / `"Đã tắt nhắc nhở"` (Test 11.10).
   - Features Voyager Chibi with cosmic bell illustration and mood awareness (`sleeping` in quiet hours, `gentle` when active).
   - Implements master switch toggle wired to `cancelAllReminders` and `scheduleNextReminders`.
   - Implements 3 reminder mode selector cards with fixed intervals: "Nhẹ nhàng" (180m), "Đều đặn" (90m), and "Thông minh" (adaptive 45-150m, default) (Tests 11.3 & 11.8).
   - Implements quiet hours schedule card (`01:00 - 07:00`) with dynamic span calculation and deferral explanation (Tests 11.4 & 11.7).
   - Implements 3 cosmic procedural sound previewers ("Gợn nhẹ", "Violin Tinh cầu", "Chuông bong bóng") testing Web Audio API in complete isolation from hydration state (Tests 11.5 & 11.9).

2. **JournalTab**:
   - Implements galaxy journal header with info modal `(i)` and month switcher navigating across year boundaries (Jan 2026 -> Dec 2025, Dec 2025 -> Jan 2026) (Tests 12.1 & 12.6).
   - Implements 7-column calendar grid `['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']` (Test 12.2) with leap-year awareness (Test 12.10).
   - Implements dynamic cup water fill SVG based on percentage (Test 12.3) and gold medal badge on 100%+ days (Test 12.4), with zero-log empty cup fallback (Test 12.7).
   - Implements day selection inspection and entry deletion with instant recalculation (Test 12.8).
   - Implements smiling flame streak card 🔥 with current streak and Reverse: 1999 universe quote `"Bạn đang giữ nhịp tốt. Hãy cùng Voyager duy trì nhé!"` (Test 12.5).

Both components are designed strictly in accordance with Card-UI 2px border `#1E293B`, dark cosmic styling, and 100% free accessibility.

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Unit Test Verification**:
   ```bash
   npm test
   ```
   *Expected*: All 216 existing unit tests pass cleanly without errors.

2. **E2E Suite Verification (Features 11 & 12)**:
   ```bash
   npx tsx tests/e2e/runner.ts
   ```
   *Expected*:
   - `Tier 1 - Feature 11: ReminderTab Screen (11.1 - 11.5)` passes 100%.
   - `Tier 1 - Feature 12: JournalTab Screen (12.1 - 12.5)` passes 100%.
   - `Tier 2 - Feature 11: ReminderTab Boundaries (11.6 - 11.10)` passes 100%.
   - `Tier 2 - Feature 12: JournalTab Boundaries (12.6 - 12.10)` passes 100%.
   - `Tier 3 Combinations (T3.08, T3.09, T3.14, T3.16)` passes 100%.

3. **TypeScript Typecheck & Build**:
   ```bash
   npm run build
   ```
   *Expected*: `tsc && vite build` completes with exit code 0.

### 5.2 Files to Inspect
- `src/tabs/ReminderTab.tsx`
- `src/tabs/JournalTab.tsx`
- `src/utils/notificationEngine.ts`
- `src/utils/audioEngine.ts`
- `src/utils/storageEngine.ts`
- `src/components/VoyagerChibi.tsx`
