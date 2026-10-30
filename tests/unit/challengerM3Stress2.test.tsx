// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Components & Tabs under test
import { ReminderTab } from '../../src/tabs/ReminderTab';
import { JournalTab } from '../../src/tabs/JournalTab';
import { StatsTab } from '../../src/tabs/StatsTab';
import { ProfileTab } from '../../src/tabs/ProfileTab';

// Engines & Algorithms
import {
  isInQuietHours,
  adjustForQuietHours,
  scheduleNextReminders,
} from '../../src/utils/notificationEngine';

import {
  calculateBaseWater,
} from '../../src/utils/hydrationEngine';

import {
  exportDataAsJson,
  exportDataAsCsv,
  escapeCsvCell,
  STORAGE_KEYS,
  DEFAULT_USER_PROFILE,
  DEFAULT_SETTINGS,
  DailyLogsMap,
  AppSettings,
} from '../../src/utils/storageEngine';
import type { UserProfile } from '../../src/types';

describe('Empirical Challenger 2: Milestone 3 Tabs & Card-UI Stress Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  // ==========================================================================
  // Stress Suite 1: Reminder Schedule & Quiet Hours (Day/Night Boundaries)
  // ==========================================================================
  describe('1. Reminder Schedule & Strict Quiet Hours (01:00 - 07:00)', () => {
    it('accurately evaluates quiet hours boundary conditions [01:00, 07:00)', () => {
      // 00:59:59 PM (Just before quiet hours) -> NOT quiet
      const preQuiet = new Date(2026, 9, 31, 0, 59, 59);
      expect(isInQuietHours(preQuiet, '07:00', '01:00')).toBe(false);

      // 01:00:00 AM (Quiet hours starts immediately) -> QUIET
      const quietStart = new Date(2026, 9, 31, 1, 0, 0);
      expect(isInQuietHours(quietStart, '07:00', '01:00')).toBe(true);

      // Deep night: 03:30:00 AM -> QUIET
      const deepNight = new Date(2026, 9, 31, 3, 30, 0);
      expect(isInQuietHours(deepNight, '07:00', '01:00')).toBe(true);

      // 06:59:00 AM (Last minute of quiet hours) -> QUIET
      const preWake = new Date(2026, 9, 31, 6, 59, 0);
      expect(isInQuietHours(preWake, '07:00', '01:00')).toBe(true);

      // 07:00:00 AM (Exact wake time) -> NOT quiet
      const wakeTime = new Date(2026, 9, 31, 7, 0, 0);
      expect(isInQuietHours(wakeTime, '07:00', '01:00')).toBe(false);

      // Afternoon: 14:30:00 PM -> NOT quiet
      const afternoon = new Date(2026, 9, 31, 14, 30, 0);
      expect(isInQuietHours(afternoon, '07:00', '01:00')).toBe(false);
    });

    it('automatically defers any notification scheduled inside quiet hours to exactly 07:00 AM wake time', () => {
      // 1. Notification scheduled at 01:15 AM
      const alert1 = new Date(2026, 9, 31, 1, 15, 0);
      const deferred1 = adjustForQuietHours(alert1, '07:00', '01:00');
      expect(deferred1.getHours()).toBe(7);
      expect(deferred1.getMinutes()).toBe(0);
      expect(deferred1.getDate()).toBe(31);

      // 2. Notification scheduled at 04:45 AM
      const alert2 = new Date(2026, 9, 31, 4, 45, 0);
      const deferred2 = adjustForQuietHours(alert2, '07:00', '01:00');
      expect(deferred2.getHours()).toBe(7);
      expect(deferred2.getMinutes()).toBe(0);
      expect(deferred2.getDate()).toBe(31);

      // 3. Notification scheduled at 06:59 AM
      const alert3 = new Date(2026, 9, 31, 6, 59, 0);
      const deferred3 = adjustForQuietHours(alert3, '07:00', '01:00');
      expect(deferred3.getHours()).toBe(7);
      expect(deferred3.getMinutes()).toBe(0);
      expect(deferred3.getDate()).toBe(31);

      // 4. Notification scheduled outside quiet hours (e.g. 08:30 AM) remains untouched
      const normalAlert = new Date(2026, 9, 31, 8, 30, 0);
      const unchanged = adjustForQuietHours(normalAlert, '07:00', '01:00');
      expect(unchanged.getTime()).toBe(normalAlert.getTime());
    });

    it('scheduleNextReminders defers first alert across midnight to 07:00 AM when triggered at midnight', async () => {
      // Freeze time to 2026-10-31 00:00:00
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 9, 31, 0, 0, 0));

      // With regular mode (90 min interval), alert is initially cursorTime = 00:00 + 90m = 01:30 AM
      // 01:30 AM falls into quiet hours [01:00, 07:00), so it MUST defer to 07:00 AM!
      const nextTime = await scheduleNextReminders({
        enabled: true,
        mode: 'regular',
        targetMl: 2000,
        consumedMl: 500,
        wakeTime: '07:00',
        sleepTime: '01:00',
      });

      expect(nextTime).not.toBeNull();
      expect(nextTime!.getHours()).toBe(7);
      expect(nextTime!.getMinutes()).toBe(0);
      expect(nextTime!.getDate()).toBe(31);
    });

    it('ReminderTab UI handles countdown and switches Chibi to sleeping expression during quiet hours', async () => {
      // Freeze time at 03:00 AM (deep quiet hours)
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 9, 31, 3, 0, 0));

      const mockSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        reminderEnabled: true,
        wakeTime: '07:00',
        sleepTime: '01:00',
      };

      const scheduledAt7 = new Date(2026, 9, 31, 7, 0, 0); // 4 hours in future

      await act(async () => {
        render(
          <ReminderTab
            settings={mockSettings}
            targetMl={2000}
            consumedMl={500}
            onUpdateSettings={vi.fn()}
            onScheduleReminders={async () => scheduledAt7}
          />
        );
      });

      // Verify quiet hours reminder card states
      expect(screen.getByText('01:00 - 07:00')).toBeDefined();
      expect(
        screen.getByText(/Thông báo tự động khóa trong khung Giờ yên lặng/i)
      ).toBeDefined();

      // In quiet hours, speech bubble displays sleeping Voyager quote
      expect(screen.getByText('Suýt... Tinh cầu đang say giấc 🌙')).toBeDefined();

      // Countdown should calculate diff: 4 hours 0 minutes
      const countdown = screen.getByTestId('reminder-countdown');
      expect(countdown.textContent).toBe('Sau 4 giờ 0 phút');
    });

    it('ReminderTab accurately transitions countdown text across overdue and disabled states', async () => {
      vi.useFakeTimers();
      const baseNow = new Date(2026, 9, 31, 10, 0, 0);
      vi.setSystemTime(baseNow);

      const mockSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        reminderEnabled: true,
      };

      // Case A: Next reminder is in 25 minutes
      const alert25m = new Date(baseNow.getTime() + 25 * 60 * 1000);
      let renderResult: any;
      await act(async () => {
        renderResult = render(
          <ReminderTab
            settings={mockSettings}
            targetMl={2000}
            consumedMl={500}
            onUpdateSettings={vi.fn()}
            onScheduleReminders={async () => alert25m}
          />
        );
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByTestId('reminder-countdown').textContent).toBe('Sau 0 giờ 25 phút');

      // Case B: Time advances past scheduled time -> "Đã đến giờ uống nước!"
      await act(async () => {
        vi.setSystemTime(new Date(baseNow.getTime() + 26 * 60 * 1000));
        vi.advanceTimersByTime(10000);
      });

      expect(screen.getByTestId('reminder-countdown').textContent).toBe('Đã đến giờ uống nước!');

      // Case C: Reminders disabled -> "Đã tắt nhắc nhở"
      await act(async () => {
        renderResult.rerender(
          <ReminderTab
            settings={{ ...mockSettings, reminderEnabled: false }}
            targetMl={2000}
            consumedMl={500}
            onUpdateSettings={vi.fn()}
          />
        );
      });

      expect(screen.getByTestId('reminder-countdown').textContent).toBe('Đã tắt nhắc nhở');
    });
  });

  // ==========================================================================
  // Stress Suite 2: Calendar Leap Year & Month Boundaries
  // ==========================================================================
  describe('2. Calendar Leap Year & Month Boundaries (JournalTab.tsx)', () => {
    it('empirically renders exactly 28 days for February 2026 (non-leap year)', () => {
      vi.useFakeTimers();
      // Set date to Feb 15, 2026
      vi.setSystemTime(new Date(2026, 1, 15));

      render(<JournalTab />);

      // Verify month label
      expect(screen.getByText('tháng 2 năm 2026')).toBeDefined();

      // Day 28 must exist in DOM
      expect(screen.getByTestId('calendar-day-28')).toBeDefined();

      // Day 29 must NOT exist in Feb 2026
      expect(screen.queryByTestId('calendar-day-29')).toBeNull();
    });

    it('empirically renders exactly 29 days for February 2028 (leap year boundary)', () => {
      vi.useFakeTimers();
      // Set date to Feb 15, 2028
      vi.setSystemTime(new Date(2028, 1, 15));

      render(<JournalTab />);

      // Verify month label
      expect(screen.getByText('tháng 2 năm 2028')).toBeDefined();

      // Day 29 must exist in leap year Feb 2028
      expect(screen.getByTestId('calendar-day-29')).toBeDefined();

      // Day 30 must NOT exist in February
      expect(screen.queryByTestId('calendar-day-30')).toBeNull();
    });

    it('empirically renders exactly 31 days for October 2026', () => {
      vi.useFakeTimers();
      // Set date to Oct 20, 2026
      vi.setSystemTime(new Date(2026, 9, 20));

      render(<JournalTab />);

      expect(screen.getByText('tháng 10 năm 2026')).toBeDefined();
      expect(screen.getByTestId('calendar-day-31')).toBeDefined();
      expect(screen.queryByTestId('calendar-day-32')).toBeNull();
    });

    it('navigates backwards across year boundary from January 2026 to December 2025', () => {
      vi.useFakeTimers();
      // Set date to Jan 10, 2026
      vi.setSystemTime(new Date(2026, 0, 10));

      render(<JournalTab />);

      // Initial state: Jan 2026
      expect(screen.getByText('tháng 1 năm 2026')).toBeDefined();
      expect(screen.getByTestId('calendar-day-31')).toBeDefined();

      // Click ChevronLeft (Tháng trước)
      const prevBtn = screen.getByLabelText('Tháng trước');
      fireEvent.click(prevBtn);

      // Must transition to December 2025 with 31 days
      expect(screen.getByText('tháng 12 năm 2025')).toBeDefined();
      expect(screen.getByTestId('calendar-day-31')).toBeDefined();
      expect(screen.queryByTestId('calendar-day-32')).toBeNull();

      // Click ChevronRight (Tháng sau) -> Returns to January 2026
      const nextBtn = screen.getByLabelText('Tháng sau');
      fireEvent.click(nextBtn);
      expect(screen.getByText('tháng 1 năm 2026')).toBeDefined();
    });

    it('renders golden medal badge on days where 100% of target is met', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 9, 15));

      const mockLogs: DailyLogsMap = {
        '2026-10-10': {
          date: '2026-10-10',
          targetMl: 2000,
          consumedMl: 2200,
          isGoalReached: true,
          entries: [{ id: '1', timestamp: 1730000000000, time: '09:00', amountMl: 2200 }],
        },
        '2026-10-11': {
          date: '2026-10-11',
          targetMl: 2000,
          consumedMl: 1000,
          isGoalReached: false,
          entries: [{ id: '2', timestamp: 1730000000000, time: '10:00', amountMl: 1000 }],
        },
      };

      render(<JournalTab dailyLogs={mockLogs} defaultTargetMl={2000} />);

      // Day 10 has >= 100% -> gold-medal-badge present
      const day10 = screen.getByTestId('calendar-day-10');
      expect(day10.querySelector('[data-testid="gold-medal-badge"]')).not.toBeNull();

      // Day 11 has 50% -> no gold medal badge
      const day11 = screen.getByTestId('calendar-day-11');
      expect(day11.querySelector('[data-testid="gold-medal-badge"]')).toBeNull();
    });
  });

  // ==========================================================================
  // Stress Suite 3: StatsTab Zero-Data Safety
  // ==========================================================================
  describe('3. StatsTab Zero-Data Safety & Numerical Stability (StatsTab.tsx)', () => {
    it('safely handles empty logs (0 entries across all 7 days) without NaN or Infinity', () => {
      render(
        <StatsTab
          dailyLogs={{}}
          currentDailyTargetMl={2000}
          unit="L"
          currentStreak={0}
          recordStreak={0}
        />
      );

      // Average intake must be 0,0 L (not NaN or undefined)
      const avgIntake = screen.getByTestId('stats-average-intake');
      expect(avgIntake.textContent).toBe('0,0 L');
      expect(avgIntake.textContent).not.toContain('NaN');
      expect(avgIntake.textContent).not.toContain('Infinity');

      // Total volume must be 0,0 L
      const totalVol = screen.getByTestId('stats-total-volume');
      expect(totalVol.textContent).toBe('0,0 L');

      // Completion count must be 0 / 7
      const completion = screen.getByTestId('stats-completion-count');
      expect(completion.textContent).toContain('0 / 7 ngày');
      expect(screen.getByText('Tỷ lệ 0%')).toBeDefined();

      // Record streak
      const recordStreak = screen.getByTestId('stats-record-streak');
      expect(recordStreak.textContent).toBe('0 ngày');

      // When all days are 0, peak Chibi must NOT be rendered
      expect(screen.queryByTestId('peak-column-chibi')).toBeNull();
    });

    it('safely handles ml unit and currentDailyTargetMl = 0 without dividing by zero', () => {
      render(
        <StatsTab
          dailyLogs={{}}
          currentDailyTargetMl={0}
          unit="ml"
          currentStreak={0}
          recordStreak={0}
        />
      );

      const avgIntake = screen.getByTestId('stats-average-intake');
      expect(avgIntake.textContent).toBe('0 ml');
      expect(avgIntake.textContent).not.toContain('NaN');

      const totalVol = screen.getByTestId('stats-total-volume');
      expect(totalVol.textContent).toBe('0 ml');
    });
  });

  // ==========================================================================
  // Stress Suite 4: Bar Chart Peak Detection & Chibi Placement
  // ==========================================================================
  describe('4. Bar Chart Peak Detection (StatsTab.tsx)', () => {
    it('perches mini Voyager Chibi exactly on the highest drinking column', () => {
      vi.useFakeTimers();
      // Set to Friday, Oct 30, 2026 -> Monday is Oct 26, 2026
      vi.setSystemTime(new Date(2026, 9, 30));

      const mockLogs: DailyLogsMap = {
        '2026-10-26': { date: '2026-10-26', consumedMl: 800, targetMl: 2000, entries: [], isGoalReached: false },
        '2026-10-27': { date: '2026-10-27', consumedMl: 1200, targetMl: 2000, entries: [], isGoalReached: false },
        '2026-10-28': { date: '2026-10-28', consumedMl: 2800, targetMl: 2000, entries: [], isGoalReached: true }, // PEAK (Wednesday - T4)
        '2026-10-29': { date: '2026-10-29', consumedMl: 1500, targetMl: 2000, entries: [], isGoalReached: false },
        '2026-10-30': { date: '2026-10-30', consumedMl: 2100, targetMl: 2000, entries: [], isGoalReached: true },
        '2026-10-31': { date: '2026-10-31', consumedMl: 500, targetMl: 2000, entries: [], isGoalReached: false },
        '2026-11-01': { date: '2026-11-01', consumedMl: 1800, targetMl: 2000, entries: [], isGoalReached: false },
      };

      render(
        <StatsTab
          dailyLogs={mockLogs}
          currentDailyTargetMl={2000}
          unit="L"
        />
      );

      // Peak chibi badge must exist
      const peakChibi = screen.getByTestId('peak-column-chibi');
      expect(peakChibi).toBeDefined();

      // Peak header banner must display 2,8 L
      expect(screen.getByText('Đỉnh: 2,8 L')).toBeDefined();

      // Total ml = 800 + 1200 + 2800 + 1500 + 2100 + 500 + 1800 = 10,700 ml = 10,7 L
      const total = screen.getByTestId('stats-total-volume');
      expect(total.textContent).toBe('10,7 L');

      // Completed days: 2800 and 2100 are >= 2000 -> 2 days
      const completed = screen.getByTestId('stats-completion-count');
      expect(completed.textContent).toContain('2 / 7 ngày');
    });

    it('handles ties for peak consumption gracefully without duplication', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 9, 30));

      // Both Monday and Wednesday have 2000ml
      const mockLogs: DailyLogsMap = {
        '2026-10-26': { date: '2026-10-26', consumedMl: 2000, targetMl: 2000, entries: [], isGoalReached: true },
        '2026-10-28': { date: '2026-10-28', consumedMl: 2000, targetMl: 2000, entries: [], isGoalReached: true },
      };

      render(<StatsTab dailyLogs={mockLogs} currentDailyTargetMl={2000} unit="L" />);

      // Exactly 1 peak chibi rendered
      const chibis = screen.getAllByTestId('peak-column-chibi');
      expect(chibis.length).toBe(1);
    });
  });

  // ==========================================================================
  // Stress Suite 5: ProfileTab JSON & CSV Export (365 Days & RFC-4180 BOM)
  // ==========================================================================
  describe('5. ProfileTab JSON & CSV Export Stress Testing (365 Days)', () => {
    it('generates 365 days of data, exports JSON, and verifies valid schema fidelity', () => {
      // 1. Generate 365 daily logs with various edge characters
      const largeLogsMap: DailyLogsMap = {};
      const startDate = new Date(2025, 10, 1); // 2025-11-01

      for (let i = 0; i < 365; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        largeLogsMap[dateStr] = {
          date: dateStr,
          targetMl: 2000,
          consumedMl: i % 2 === 0 ? 2200 : 1500,
          isGoalReached: i % 2 === 0,
          entries: [
            {
              id: `log_${i}_1`,
              timestamp: d.getTime() + 9 * 3600 * 1000,
              time: '09:00',
              amountMl: 500,
              containerType: 'glass',
            },
            {
              id: `log_${i}_2`,
              timestamp: d.getTime() + 14 * 3600 * 1000,
              time: '14:00',
              amountMl: i % 2 === 0 ? 1700 : 1000,
              containerType: 'bottle',
            },
          ],
        };
      }

      // Persist to localStorage
      localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(largeLogsMap));
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(DEFAULT_USER_PROFILE));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));

      // Execute exportDataAsJson
      const exportedJsonStr = exportDataAsJson();
      expect(typeof exportedJsonStr).toBe('string');
      expect(exportedJsonStr.length).toBeGreaterThan(10000);

      // Verify parseable JSON
      const parsed = JSON.parse(exportedJsonStr);
      expect(parsed.appName).toBe("Voyager's Cosmic Hydration");
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.exportedAt).toBeTruthy();
      expect(parsed.profile.name).toBe('Mạnh');
      expect(parsed.settings.language).toBe('vi');

      // Verify all 365 days exist in exported JSON
      const exportedDates = Object.keys(parsed.logs);
      expect(exportedDates.length).toBe(365);
      expect(parsed.logs['2025-11-01'].consumedMl).toBe(2200);
    });

    it('exports 365 days to RFC-4180 CSV with UTF-8 BOM (\\uFEFF) and correct escaping', () => {
      // Create dataset with special characters: commas, quotes, line breaks
      const testLogs: DailyLogsMap = {
        '2026-10-01': {
          date: '2026-10-01',
          targetMl: 2000,
          consumedMl: 2500,
          isGoalReached: true,
          entries: [{ id: '1', timestamp: 1730000000000, time: '08:00', amountMl: 2500 }],
        },
        '2026-10-02': {
          date: '2026-10-02',
          targetMl: 2000,
          consumedMl: 1200,
          isGoalReached: false,
          entries: [],
        },
      };

      localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(testLogs));

      const csvContent = exportDataAsCsv();

      // 1. Must start with UTF-8 BOM (\uFEFF) for Excel on Windows
      expect(csvContent.charCodeAt(0)).toBe(0xfeff);

      // 2. Header validation
      const lines = csvContent.replace(/^\uFEFF/, '').split('\n');
      expect(lines[0]).toBe('Ngày,Mục tiêu (ml),Đã uống (ml),Tỷ lệ (%),Trạng thái,Số lần uống');

      // 3. Row count validation (1 header + 2 data rows)
      expect(lines.length).toBe(3);

      // Row 1: 2026-10-01, 2000, 2500, 125.0%, Hoàn thành, 1
      expect(lines[1]).toContain('2026-10-01,2000,2500,125.0%,Hoàn thành,1');

      // Row 2: 2026-10-02, 2000, 1200, 60.0%, Đang thực hiện, 0
      expect(lines[2]).toContain('2026-10-02,2000,1200,60.0%,Đang thực hiện,0');
    });

    it('empirically verifies RFC-4180 escaping on strings containing commas, quotes, and newlines', () => {
      // Test individual cell escaper
      expect(escapeCsvCell('Simple text')).toBe('Simple text');
      expect(escapeCsvCell('Text, with comma')).toBe('"Text, with comma"');
      expect(escapeCsvCell('Text with "quotes"')).toBe('"Text with ""quotes"""');
      expect(escapeCsvCell('Text with\nnewline')).toBe('"Text with\nnewline"');
      expect(escapeCsvCell('Complex, "quoted" & \nmultiline')).toBe('"Complex, ""quoted"" & \nmultiline"');
    });

    it('ProfileTab renders both JSON and CSV export buttons', () => {
      render(<ProfileTab />);

      const jsonBtn = screen.getByTestId('export-json-button');
      expect(jsonBtn).toBeDefined();
      expect(jsonBtn.textContent).toContain('Xuất JSON');

      const csvBtn = screen.getByTestId('export-csv-button');
      expect(csvBtn).toBeDefined();
      expect(csvBtn.textContent).toContain('Xuất CSV (Excel)');
    });
  });

  // ==========================================================================
  // Stress Suite 6: Body Metrics & Hydration Formula Reactivity
  // ==========================================================================
  describe('6. Body Metrics Reactivity & Goal Formula (ProfileTab.tsx)', () => {
    it('immediately updates daily goal formula when weight changes from 60kg to 85kg', () => {
      const handleUpdateProfile = vi.fn();

      const initialProfile: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        weightKg: 60,
        activityLevel: 'moderate',
        autoWeatherAdjust: false,
      };

      const { rerender } = render(
        <ProfileTab
          profile={initialProfile}
          onUpdateProfile={handleUpdateProfile}
        />
      );

      // Initial state: 60 kg
      // W_base = 60 * 35 = 2100 ml
      // W_act = 350 ml (moderate)
      // W_total = 2100 + 350 = 2450 ml (2,5 L)
      expect(screen.getByText('60 kg × 35 = 2100 ml')).toBeDefined();
      expect(screen.getByText('2450 ml (2,5 L)')).toBeDefined();

      const weightInput = screen.getByTestId('input-weight') as HTMLInputElement;
      expect(weightInput.value).toBe('60');

      // User changes weight from 60kg to 85kg
      fireEvent.change(weightInput, { target: { value: '85' } });
      expect(handleUpdateProfile).toHaveBeenCalledWith({ weightKg: 85 });

      // Rerender with 85kg
      // W_base = 85 * 35 = 2975 ml
      // W_act = 350 ml
      // W_total = 2975 + 350 = 3325 ml -> rounded to 50 = 3350 ml (3,4 L)
      const updatedProfile: UserProfile = {
        ...initialProfile,
        weightKg: 85,
      };

      rerender(
        <ProfileTab
          profile={updatedProfile}
          onUpdateProfile={handleUpdateProfile}
        />
      );

      expect(screen.getByText('85 kg × 35 = 2975 ml')).toBeDefined();
      expect(screen.getByText('3350 ml (3,4 L)')).toBeDefined();
    });

    it('reacts to activity level changes (sedentary +0ml, moderate +350ml, high +700ml)', () => {
      const handleUpdateProfile = vi.fn();

      const profile: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        weightKg: 70,
        activityLevel: 'sedentary',
        autoWeatherAdjust: false,
      };

      const { rerender } = render(
        <ProfileTab profile={profile} onUpdateProfile={handleUpdateProfile} />
      );

      // 70 * 35 = 2450 ml + 0 = 2450 ml (2,5 L)
      expect(screen.getByText('2450 ml (2,5 L)')).toBeDefined();

      // Change to High (+700ml)
      // 2450 + 700 = 3150 ml (3,2 L)
      rerender(
        <ProfileTab
          profile={{ ...profile, activityLevel: 'high' }}
          onUpdateProfile={handleUpdateProfile}
        />
      );

      expect(screen.getByText('3150 ml (3,1 L)')).toBeDefined();
    });

    it('reacts to auto weather adjustment toggle and live weather bonus', () => {
      const handleUpdateProfile = vi.fn();

      const profile: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        weightKg: 60,
        activityLevel: 'sedentary',
        autoWeatherAdjust: true, // Auto adjust enabled
      };

      const mockWeather = {
        temperature: 33, // > 32°C -> +500 ml
        humidity: 35,    // < 40% -> +150 ml
        weatherCode: 0,
        bonusMl: 650,    // Total bonus 650 ml
        locationName: 'Hà Nội',
        isFallback: false,
        timestamp: Date.now(),
      };

      // W_base = 60 * 35 = 2100
      // W_act = 0
      // W_weather = 650
      // Raw = 2750 ml -> rounded = 2750 ml (2,8 L)
      render(
        <ProfileTab
          profile={profile}
          weather={mockWeather}
          onUpdateProfile={handleUpdateProfile}
        />
      );

      expect(screen.getByText('2750 ml (2,8 L)')).toBeDefined();

      // Click auto weather adjust toggle switch
      const toggle = screen.getByTestId('weather-auto-adjust-toggle');
      fireEvent.click(toggle);
      expect(handleUpdateProfile).toHaveBeenCalledWith({ autoWeatherAdjust: false });
    });

    it('enforces weight bounds [20kg, 300kg] in calculateBaseWater', () => {
      // Under minimum (< 20) clamped to 20
      expect(calculateBaseWater(10)).toBe(20 * 35);
      expect(calculateBaseWater(-5)).toBe(60 * 35); // Invalid defaults to 60

      // Over maximum (> 300) clamped to 300
      expect(calculateBaseWater(350)).toBe(300 * 35);

      // Valid boundary
      expect(calculateBaseWater(20)).toBe(700);
      expect(calculateBaseWater(300)).toBe(10500);
    });
  });
});
