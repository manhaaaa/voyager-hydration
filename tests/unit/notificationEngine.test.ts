import { describe, it, expect } from 'vitest';
import {
  NOTIFICATION_CHANNEL_ID,
  REMINDER_MODES,
  FIXED_INTERVALS,
  SMART_INTERVAL_BOUNDS,
  VOYAGER_NOTIFICATIONS,
  calculateSmartInterval,
  calculateMinutesToBedtime,
  isInQuietHours,
  adjustForQuietHours,
  formatNextReminderCountdown,
  scheduleNextReminders,
  cancelAllReminders,
  checkPermissions,
  requestPermissions,
} from '../../src/utils/notificationEngine';

describe('Local Notification Scheduler Engine Unit Tests (notificationEngine.ts)', () => {
  // --------------------------------------------------------------------------
  // 1. Channel Configuration & Modes
  // --------------------------------------------------------------------------
  describe('Channel Configuration & Constants', () => {
    it('defines canonical channel ID and modes', () => {
      expect(NOTIFICATION_CHANNEL_ID).toBe('voyager_hydration_reminders');
      expect(REMINDER_MODES.GENTLE).toBe('gentle');
      expect(REMINDER_MODES.SMART).toBe('smart');
      expect(REMINDER_MODES.REGULAR).toBe('regular');
    });

    it('defines fixed intervals for gentle (180m) and regular (90m)', () => {
      expect(FIXED_INTERVALS.GENTLE).toBe(180);
      expect(FIXED_INTERVALS.REGULAR).toBe(90);
    });

    it('defines smart interval bounds between 45m and 150m', () => {
      expect(SMART_INTERVAL_BOUNDS.MIN_MINUTES).toBe(45);
      expect(SMART_INTERVAL_BOUNDS.MAX_MINUTES).toBe(150);
      expect(SMART_INTERVAL_BOUNDS.DEFAULT_MINUTES).toBe(110);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Smart Interval Calculation & Clamping
  // --------------------------------------------------------------------------
  describe('Smart Interval Calculation (calculateSmartInterval)', () => {
    it('calculates dynamic interval: 660 min awake with 6 cups deficit -> 110 min', () => {
      const interval = calculateSmartInterval(660, 6);
      expect(interval).toBe(110);
    });

    it('clamps to minimum 45 minutes when deficit is high and time is short', () => {
      // 100 min awake, 5 cups deficit -> raw 20 min -> clamped to 45 min
      const interval = calculateSmartInterval(100, 5);
      expect(interval).toBe(45);
    });

    it('clamps to maximum 150 minutes when deficit is low and time is long', () => {
      // 600 min awake, 1 cup deficit -> raw 600 min -> clamped to 150 min
      const interval = calculateSmartInterval(600, 1);
      expect(interval).toBe(150);
    });

    it('returns 180 min (paused / max gentle) when deficit is zero or negative', () => {
      expect(calculateSmartInterval(400, 0)).toBe(180);
      expect(calculateSmartInterval(400, -2)).toBe(180);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Bedtime Calculation
  // --------------------------------------------------------------------------
  describe('Awake Window Calculation (calculateMinutesToBedtime)', () => {
    it('calculates remaining minutes across midnight (14:00 to 01:00)', () => {
      // 14:00 to 24:00 = 10h = 600 min; + 1h (01:00) = 660 min
      const now = new Date(2026, 9, 30, 14, 0);
      const minutes = calculateMinutesToBedtime(now, '01:00', '07:00');
      expect(minutes).toBe(660);
    });

    it('calculates remaining minutes after midnight (00:30 to 01:00)', () => {
      const now = new Date(2026, 9, 30, 0, 30);
      const minutes = calculateMinutesToBedtime(now, '01:00', '07:00');
      expect(minutes).toBe(30);
    });

    it('returns 0 when current time is already inside quiet hours (02:00)', () => {
      const now = new Date(2026, 9, 30, 2, 0);
      const minutes = calculateMinutesToBedtime(now, '01:00', '07:00');
      expect(minutes).toBe(0);
    });

    it('calculates remaining minutes for same-day bedtime (14:00 to 23:00)', () => {
      const now = new Date(2026, 9, 30, 14, 0);
      const minutes = calculateMinutesToBedtime(now, '23:00', '07:00');
      expect(minutes).toBe(9 * 60); // 540 min
    });
  });

  // --------------------------------------------------------------------------
  // 4. Strict Quiet Hours Enforcement
  // --------------------------------------------------------------------------
  describe('Quiet Hours Enforcement (isInQuietHours & adjustForQuietHours)', () => {
    it('evaluates cross-midnight quiet hours (01:00 - 07:00) accurately', () => {
      // 00:30 -> Not quiet
      expect(isInQuietHours(new Date(2026, 9, 30, 0, 30), '07:00', '01:00')).toBe(false);

      // 01:00 -> Quiet
      expect(isInQuietHours(new Date(2026, 9, 30, 1, 0), '07:00', '01:00')).toBe(true);

      // 03:45 -> Quiet
      expect(isInQuietHours(new Date(2026, 9, 30, 3, 45), '07:00', '01:00')).toBe(true);

      // 06:59 -> Quiet
      expect(isInQuietHours(new Date(2026, 9, 30, 6, 59), '07:00', '01:00')).toBe(true);

      // 07:00 -> Not quiet
      expect(isInQuietHours(new Date(2026, 9, 30, 7, 0), '07:00', '01:00')).toBe(false);

      // 14:00 -> Not quiet
      expect(isInQuietHours(new Date(2026, 9, 30, 14, 0), '07:00', '01:00')).toBe(false);
    });

    it('defers 02:30 AM alert to exactly 07:00 AM wake time', () => {
      const scheduled = new Date(2026, 9, 30, 2, 30);
      const adjusted = adjustForQuietHours(scheduled, '07:00', '01:00');

      expect(adjusted.getHours()).toBe(7);
      expect(adjusted.getMinutes()).toBe(0);
      expect(adjusted.getDate()).toBe(30);
    });

    it('leaves daytime alert unchanged', () => {
      const scheduled = new Date(2026, 9, 30, 14, 30);
      const adjusted = adjustForQuietHours(scheduled, '07:00', '01:00');

      expect(adjusted.getTime()).toBe(scheduled.getTime());
    });

    it('handles custom schedule (Sleep 23:30, Wake 06:30)', () => {
      expect(isInQuietHours(new Date(2026, 9, 30, 23, 45), '06:30', '23:30')).toBe(true);
      expect(isInQuietHours(new Date(2026, 9, 30, 6, 0), '06:30', '23:30')).toBe(true);
      expect(isInQuietHours(new Date(2026, 9, 30, 7, 0), '06:30', '23:30')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Thematic Phrasing Matrix (Reverse: 1999)
  // --------------------------------------------------------------------------
  describe('Celestial Voyager Messages', () => {
    it('contains at least 5 celestial notification templates', () => {
      expect(VOYAGER_NOTIFICATIONS.length).toBeGreaterThanOrEqual(5);
    });

    it('all templates strictly reference celestial Voyager lore', () => {
      for (const t of VOYAGER_NOTIFICATIONS) {
        expect(
          t.body.includes('ngân hà') ||
            t.body.includes('Voyager') ||
            t.body.includes('đàn') ||
            t.body.includes('sao') ||
            t.body.includes('vũ trụ') ||
            t.body.includes('tinh cầu')
        ).toBe(true);
        expect(t.title).toBeTruthy();
        expect(t.chibiMood).toBeTruthy();
      }
    });
  });

  // --------------------------------------------------------------------------
  // 6. Countdown Formatter
  // --------------------------------------------------------------------------
  describe('Countdown Formatter (formatNextReminderCountdown)', () => {
    it('returns "Chưa lên lịch" when date is null', () => {
      expect(formatNextReminderCountdown(null)).toBe('Chưa lên lịch');
    });

    it('returns "Đến giờ uống nước!" when target date is in the past', () => {
      const past = new Date(Date.now() - 5000);
      expect(formatNextReminderCountdown(past)).toBe('Đến giờ uống nước!');
    });

    it('formats hours and minutes accurately', () => {
      // 2h 53m ahead
      const future = new Date(Date.now() + (2 * 60 + 53) * 60 * 1000 + 1000);
      const res = formatNextReminderCountdown(future);
      expect(res).toContain('2 giờ');
      expect(res).toContain('phút');
    });

    it('formats minutes only when under 1 hour', () => {
      const future = new Date(Date.now() + 35 * 60 * 1000 + 1000);
      expect(formatNextReminderCountdown(future)).toBe('Sau 35 phút');
    });
  });

  // --------------------------------------------------------------------------
  // 7. Scheduling Pipeline & Permissions
  // --------------------------------------------------------------------------
  describe('Scheduler Pipeline & Permissions', () => {
    it('scheduleNextReminders returns null when enabled is false', async () => {
      const nextTime = await scheduleNextReminders({
        enabled: false,
        mode: 'smart',
        targetMl: 2000,
        consumedMl: 500,
      });
      expect(nextTime).toBeNull();
    });

    it('scheduleNextReminders returns future date when enabled is true', async () => {
      const nextTime = await scheduleNextReminders({
        enabled: true,
        mode: 'gentle',
        targetMl: 2000,
        consumedMl: 500,
        wakeTime: '07:00',
        sleepTime: '01:00',
      });
      expect(nextTime).toBeInstanceOf(Date);
      expect(nextTime!.getTime()).toBeGreaterThan(Date.now());
    });

    it('checkPermissions and requestPermissions execute without throwing', async () => {
      await expect(checkPermissions()).resolves.toBeDefined();
      await expect(requestPermissions()).resolves.toBeDefined();
    });

    it('cancelAllReminders executes safely', async () => {
      await expect(cancelAllReminders()).resolves.not.toThrow();
    });
  });
});
