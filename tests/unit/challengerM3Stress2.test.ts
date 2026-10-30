import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  isInQuietHours,
  adjustForQuietHours,
  formatNextReminderCountdown,
  scheduleNextReminders,
} from '../../src/utils/notificationEngine';

import {
  calculateBaseWater,
  calculateDailyWaterGoal,
  calculateActivityWater,
  calculateWeatherBonus,
} from '../../src/utils/hydrationEngine';

import {
  escapeCsvCell,
  DailyLogsMap,
} from '../../src/utils/storageEngine';

import {
  DAY_LABELS,
} from '../../src/tabs/StatsTab';

describe('Challenger M3 Stress 2: Empirical Algorithmic & Contract Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // 1. Reminder Schedule & Strict Quiet Hours
  // ==========================================================================
  describe('1. Reminder Schedule & Strict Quiet Hours (01:00 - 07:00)', () => {
    it('evaluates boundary conditions across day and night', () => {
      // 00:59:59 -> false (not quiet)
      expect(isInQuietHours(new Date(2026, 9, 31, 0, 59, 59), '07:00', '01:00')).toBe(false);
      // 01:00:00 -> true (quiet)
      expect(isInQuietHours(new Date(2026, 9, 31, 1, 0, 0), '07:00', '01:00')).toBe(true);
      // 03:30:00 -> true (quiet)
      expect(isInQuietHours(new Date(2026, 9, 31, 3, 30, 0), '07:00', '01:00')).toBe(true);
      // 06:59:59 -> true (quiet)
      expect(isInQuietHours(new Date(2026, 9, 31, 6, 59, 59), '07:00', '01:00')).toBe(true);
      // 07:00:00 -> false (wake up)
      expect(isInQuietHours(new Date(2026, 9, 31, 7, 0, 0), '07:00', '01:00')).toBe(false);
      // 15:00:00 -> false (daytime)
      expect(isInQuietHours(new Date(2026, 9, 31, 15, 0, 0), '07:00', '01:00')).toBe(false);
    });

    it('automatically defers any notification scheduled inside quiet hours to exactly 07:00 AM wake time', () => {
      // Alert scheduled at 02:15 AM
      const alert1 = new Date(2026, 9, 31, 2, 15, 0);
      const deferred1 = adjustForQuietHours(alert1, '07:00', '01:00');
      expect(deferred1.getHours()).toBe(7);
      expect(deferred1.getMinutes()).toBe(0);
      expect(deferred1.getDate()).toBe(31);

      // Alert scheduled at 05:45 AM
      const alert2 = new Date(2026, 9, 31, 5, 45, 0);
      const deferred2 = adjustForQuietHours(alert2, '07:00', '01:00');
      expect(deferred2.getHours()).toBe(7);
      expect(deferred2.getMinutes()).toBe(0);
      expect(deferred2.getDate()).toBe(31);

      // Alert outside quiet hours (e.g. 09:30 AM) remains untouched
      const dayAlert = new Date(2026, 9, 31, 9, 30, 0);
      const unchanged = adjustForQuietHours(dayAlert, '07:00', '01:00');
      expect(unchanged.getTime()).toBe(dayAlert.getTime());
    });

    it('scheduleNextReminders defers first alert across midnight to 07:00 AM when triggered at midnight', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 9, 31, 0, 0, 0));

      const nextTime = await scheduleNextReminders({
        enabled: true,
        mode: 'regular', // 90 min interval -> 01:30 AM -> deferred to 07:00 AM
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

    it('formats countdown string across day/night boundaries', () => {
      expect(formatNextReminderCountdown(null)).toBe('Chưa lên lịch');

      const past = new Date(Date.now() - 5000);
      expect(formatNextReminderCountdown(past)).toBe('Đến giờ uống nước!');

      const future45m = new Date(Date.now() + 45 * 60 * 1000 + 1000);
      expect(formatNextReminderCountdown(future45m)).toBe('Sau 45 phút');

      const future2h15m = new Date(Date.now() + 135 * 60 * 1000 + 1000);
      expect(formatNextReminderCountdown(future2h15m)).toBe('Sau 2 giờ 15 phút');
    });
  });

  // ==========================================================================
  // 2. Calendar Leap Year & Month Boundaries
  // ==========================================================================
  describe('2. Calendar Leap Year & Month Boundaries', () => {
    it('empirically verifies days in February 2026 (28 days, non-leap year)', () => {
      const daysFeb2026 = new Date(2026, 2, 0).getDate();
      expect(daysFeb2026).toBe(28);

      const firstDay = new Date(2026, 1, 1).getDay(); // Sunday = 0
      const leadingBlanks = (firstDay + 6) % 7;
      expect(leadingBlanks).toBe(6); // 6 empty cells before Sunday (CN)
    });

    it('empirically verifies days in February 2028 (29 days, leap year boundary)', () => {
      const daysFeb2028 = new Date(2028, 2, 0).getDate();
      expect(daysFeb2028).toBe(29);

      const firstDay = new Date(2028, 1, 1).getDay(); // Tuesday = 2
      const leadingBlanks = (firstDay + 6) % 7;
      expect(leadingBlanks).toBe(1); // 1 empty cell (Monday) before Tuesday
    });

    it('empirically verifies days in October 2026 (31 days)', () => {
      const daysOct2026 = new Date(2026, 10, 0).getDate();
      expect(daysOct2026).toBe(31);
    });

    it('simulates month navigation backwards from Jan 2026 to Dec 2025 across year boundary', () => {
      let currentMonth = { year: 2026, month: 1 };

      // Navigate backwards
      if (currentMonth.month === 1) {
        currentMonth = { year: currentMonth.year - 1, month: 12 };
      } else {
        currentMonth = { year: currentMonth.year, month: currentMonth.month - 1 };
      }

      expect(currentMonth).toEqual({ year: 2025, month: 12 });
      expect(new Date(currentMonth.year, currentMonth.month, 0).getDate()).toBe(31);

      // Navigate forward
      if (currentMonth.month === 12) {
        currentMonth = { year: currentMonth.year + 1, month: 1 };
      } else {
        currentMonth = { year: currentMonth.year, month: currentMonth.month + 1 };
      }

      expect(currentMonth).toEqual({ year: 2026, month: 1 });
    });
  });

  // ==========================================================================
  // 3. StatsTab Zero-Data Safety
  // ==========================================================================
  describe('3. StatsTab Zero-Data Safety & Numerical Stability', () => {
    it('evaluates week calculations with 0 logs across all 7 days without NaN or Infinity', () => {
      const monday = new Date(2026, 9, 26); // Oct 26, 2026
      const currentDailyTargetMl = 2000;
      const dailyLogs: DailyLogsMap = {};

      let totalMl = 0;
      let completedDays = 0;
      const items: Array<{ dayLabel: string; consumedMl: number; fillPct: number; isPeak: boolean }> = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const record = dailyLogs[dateStr];
        const consumedMl = record?.consumedMl || 0;
        const targetMl = record && record.targetMl > 0 ? record.targetMl : currentDailyTargetMl;
        const isGoalReached = targetMl > 0 && consumedMl >= targetMl;

        totalMl += consumedMl;
        if (isGoalReached) completedDays++;

        items.push({
          dayLabel: DAY_LABELS[i],
          consumedMl,
          fillPct: 0,
          isPeak: false,
        });
      }

      const peakDay = items.reduce((max, d) => (d.consumedMl > max.consumedMl ? d : max), items[0]);
      if (peakDay.consumedMl > 0) {
        peakDay.isPeak = true;
      }

      const chartMaxMl = Math.max(currentDailyTargetMl * 1.25, ...items.map((d) => d.consumedMl), 2500);
      items.forEach((item) => {
        item.fillPct = Math.min(100, Math.round((item.consumedMl / chartMaxMl) * 100));
      });

      const averageMl = Math.round(totalMl / 7);
      const completionRatePct = Math.round((completedDays / 7) * 100);
      const goalHeightPct = Math.min(100, Math.round((currentDailyTargetMl / chartMaxMl) * 100));

      expect(totalMl).toBe(0);
      expect(averageMl).toBe(0);
      expect(isNaN(averageMl)).toBe(false);
      expect(isFinite(averageMl)).toBe(true);

      expect(completedDays).toBe(0);
      expect(completionRatePct).toBe(0);
      expect(isNaN(completionRatePct)).toBe(false);

      expect(chartMaxMl).toBe(2500);
      expect(goalHeightPct).toBe(80); // 2000 / 2500 * 100 = 80%

      items.forEach((item) => {
        expect(item.fillPct).toBe(0);
        expect(item.isPeak).toBe(false);
      });

      // No peak day flagged when consumed is 0
      expect(peakDay.isPeak).toBe(false);
    });

    it('safely handles extreme zero target (currentDailyTargetMl = 0) without dividing by zero', () => {
      const chartMaxMl = Math.max(0 * 1.25, 0, 2500);
      expect(chartMaxMl).toBe(2500);

      const goalHeightPct = Math.min(100, Math.round((0 / chartMaxMl) * 100));
      expect(goalHeightPct).toBe(0);
      expect(isNaN(goalHeightPct)).toBe(false);
    });
  });

  // ==========================================================================
  // 4. Bar Chart Peak Detection
  // ==========================================================================
  describe('4. Bar Chart Peak Detection & Column Perching', () => {
    it('correctly identifies the highest drinking column among 7 days', () => {
      const items = [
        { dayLabel: 'T2', consumedMl: 600, isPeak: false },
        { dayLabel: 'T3', consumedMl: 1200, isPeak: false },
        { dayLabel: 'T4', consumedMl: 2600, isPeak: false }, // Peak
        { dayLabel: 'T5', consumedMl: 1500, isPeak: false },
        { dayLabel: 'T6', consumedMl: 2100, isPeak: false },
        { dayLabel: 'T7', consumedMl: 400, isPeak: false },
        { dayLabel: 'CN', consumedMl: 1800, isPeak: false },
      ];

      const peakDay = items.reduce((max, d) => (d.consumedMl > max.consumedMl ? d : max), items[0]);
      if (peakDay.consumedMl > 0) {
        peakDay.isPeak = true;
      }

      expect(peakDay.dayLabel).toBe('T4');
      expect(peakDay.consumedMl).toBe(2600);
      expect(peakDay.isPeak).toBe(true);

      const peaks = items.filter((d) => d.isPeak);
      expect(peaks.length).toBe(1);
    });

    it('handles ties without producing multiple peak indicators', () => {
      const items = [
        { dayLabel: 'T2', consumedMl: 2000, isPeak: false },
        { dayLabel: 'T3', consumedMl: 1000, isPeak: false },
        { dayLabel: 'T4', consumedMl: 2000, isPeak: false }, // Tie
        { dayLabel: 'T5', consumedMl: 500, isPeak: false },
        { dayLabel: 'T6', consumedMl: 800, isPeak: false },
        { dayLabel: 'T7', consumedMl: 900, isPeak: false },
        { dayLabel: 'CN', consumedMl: 1200, isPeak: false },
      ];

      const peakDay = items.reduce((max, d) => (d.consumedMl > max.consumedMl ? d : max), items[0]);
      if (peakDay.consumedMl > 0) {
        peakDay.isPeak = true;
      }

      expect(peakDay.dayLabel).toBe('T2');
      const peaks = items.filter((d) => d.isPeak);
      expect(peaks.length).toBe(1);
    });
  });

  // ==========================================================================
  // 5. ProfileTab JSON & CSV Export
  // ==========================================================================
  describe('5. ProfileTab JSON & CSV Export (365 Days & RFC-4180 BOM)', () => {
    it('creates 365 days dataset and generates RFC-4180 CSV with UTF-8 BOM', () => {
      const headers = ['Ngày', 'Mục tiêu (ml)', 'Đã uống (ml)', 'Tỷ lệ (%)', 'Trạng thái', 'Số lần uống'];
      const rows: string[] = [headers.join(',')];

      for (let i = 0; i < 365; i++) {
        const dateKey = `2026-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`;
        const targetMl = 2000;
        const consumedMl = 2100;
        const ratioPct = '105.0%';
        const status = 'Hoàn thành';
        const entriesCount = 3;

        rows.push([
          escapeCsvCell(dateKey),
          escapeCsvCell(targetMl),
          escapeCsvCell(consumedMl),
          escapeCsvCell(ratioPct),
          escapeCsvCell(status),
          escapeCsvCell(entriesCount),
        ].join(','));
      }

      const csvContent = '\uFEFF' + rows.join('\n');

      // UTF-8 BOM check
      expect(csvContent.charCodeAt(0)).toBe(0xfeff);

      const splitLines = csvContent.replace(/^\uFEFF/, '').split('\n');
      expect(splitLines.length).toBe(366); // 1 header + 365 days
      expect(splitLines[0]).toBe('Ngày,Mục tiêu (ml),Đã uống (ml),Tỷ lệ (%),Trạng thái,Số lần uống');
    });

    it('empirically verifies RFC-4180 cell escaping rules', () => {
      expect(escapeCsvCell('Simple')).toBe('Simple');
      expect(escapeCsvCell('Hello, World')).toBe('"Hello, World"');
      expect(escapeCsvCell('Reverse: "1999"')).toBe('"Reverse: ""1999"""');
      expect(escapeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
      expect(escapeCsvCell(2500)).toBe('2500');
    });
  });

  // ==========================================================================
  // 6. Body Metrics Reactivity & Goal Formula
  // ==========================================================================
  describe('6. Body Metrics Reactivity & Goal Formula', () => {
    it('recalculates daily goal immediately when weight transitions from 60kg to 85kg', () => {
      // 60 kg, moderate (+350), 0 weather
      // 60 * 35 = 2100 -> 2100 + 350 = 2450 ml
      const goal60 = calculateDailyWaterGoal(60, 'moderate', 0);
      expect(goal60).toBe(2450);

      // 85 kg, moderate (+350), 0 weather
      // 85 * 35 = 2975 -> 2975 + 350 = 3325 -> rounded to 50 = 3350 ml
      const goal85 = calculateDailyWaterGoal(85, 'moderate', 0);
      expect(goal85).toBe(3350);

      expect(goal85 - goal60).toBe(900); // +900 ml increase
    });

    it('verifies activity level impact on hydration formula', () => {
      expect(calculateActivityWater('sedentary')).toBe(0);
      expect(calculateActivityWater('moderate')).toBe(350);
      expect(calculateActivityWater('high')).toBe(700);

      const sedentaryGoal = calculateDailyWaterGoal(70, 'sedentary', 0);
      const moderateGoal = calculateDailyWaterGoal(70, 'moderate', 0);
      const highGoal = calculateDailyWaterGoal(70, 'high', 0);

      // 70 * 35 = 2450
      expect(sedentaryGoal).toBe(2450);
      expect(moderateGoal).toBe(2800);
      expect(highGoal).toBe(3150);
    });

    it('verifies weather bonus calculation and clamping', () => {
      // 28-32°C -> +250ml
      expect(calculateWeatherBonus(30, 60).total).toBe(250);
      // > 32°C -> +500ml
      expect(calculateWeatherBonus(35, 60).total).toBe(500);
      // Humidity < 40% -> +150ml
      expect(calculateWeatherBonus(25, 30).total).toBe(150);
      // Cumulative: 35°C + 30% humidity -> 500 + 150 = 650ml
      expect(calculateWeatherBonus(35, 30).total).toBe(650);
    });

    it('clamps weight bounds strictly between [20kg, 300kg]', () => {
      expect(calculateBaseWater(10)).toBe(20 * 35);
      expect(calculateBaseWater(20)).toBe(20 * 35);
      expect(calculateBaseWater(300)).toBe(300 * 35);
      expect(calculateBaseWater(500)).toBe(300 * 35);
    });
  });
});
