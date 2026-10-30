import { describe, it } from 'node:test';
import {
  assert,
  registerTest,
  canonicalIsInQuietHours,
  canonicalAdjustForQuietHours,
  canonicalSmartInterval,
} from '../harness.ts';

describe('Tier 2 - Feature 07: Notification & Quiet Hours Boundaries', () => {
  const tier = 'Tier 2';
  const fId = 'F07';

  it('7.6: Strict quiet hours check (01:00 - 07:00) spanning midnight boundary', () => {
    registerTest(tier, fId, '7.6', 'Quiet hours spanning midnight boundary', () => {
      // 00:30 is before sleep (01:00) -> NOT quiet hours
      const d0030 = new Date(2026, 9, 30, 0, 30);
      assert.strictEqual(canonicalIsInQuietHours(d0030, '07:00', '01:00'), false);

      // 01:00 is quiet hours
      const d0100 = new Date(2026, 9, 30, 1, 0);
      assert.strictEqual(canonicalIsInQuietHours(d0100, '07:00', '01:00'), true);

      // 03:45 is quiet hours
      const d0345 = new Date(2026, 9, 30, 3, 45);
      assert.strictEqual(canonicalIsInQuietHours(d0345, '07:00', '01:00'), true);

      // 06:59 is quiet hours
      const d0659 = new Date(2026, 9, 30, 6, 59);
      assert.strictEqual(canonicalIsInQuietHours(d0659, '07:00', '01:00'), true);

      // 07:00 is wake time -> NOT quiet hours
      const d0700 = new Date(2026, 9, 30, 7, 0);
      assert.strictEqual(canonicalIsInQuietHours(d0700, '07:00', '01:00'), false);

      // 14:00 is daytime -> NOT quiet hours
      const d1400 = new Date(2026, 9, 30, 14, 0);
      assert.strictEqual(canonicalIsInQuietHours(d1400, '07:00', '01:00'), false);
    });
  });

  it('7.7: adjustForQuietHours defers 02:30 AM reminder to exactly 07:00 AM wake time', () => {
    registerTest(tier, fId, '7.7', 'Quiet hours reminder deferral to 07:00 AM', () => {
      const scheduledInQuiet = new Date(2026, 9, 30, 2, 30);
      const adjusted = canonicalAdjustForQuietHours(scheduledInQuiet, '07:00', '01:00');

      assert.strictEqual(adjusted.getHours(), 7);
      assert.strictEqual(adjusted.getMinutes(), 0);
      assert.strictEqual(adjusted.getDate(), 30);
    });
  });

  it('7.8: Custom schedule (Wake 06:30, Sleep 23:30) evaluated correctly', () => {
    registerTest(tier, fId, '7.8', 'Custom wake/sleep hours evaluation', () => {
      // Quiet hours are 23:30 to 06:30
      const d2345 = new Date(2026, 9, 30, 23, 45);
      assert.strictEqual(canonicalIsInQuietHours(d2345, '06:30', '23:30'), true);

      const d0600 = new Date(2026, 9, 30, 6, 0);
      assert.strictEqual(canonicalIsInQuietHours(d0600, '06:30', '23:30'), true);

      const d0700 = new Date(2026, 9, 30, 7, 0);
      assert.strictEqual(canonicalIsInQuietHours(d0700, '06:30', '23:30'), false);
    });
  });

  it('7.9: Zero deficit suppresses repetitive reminders', () => {
    registerTest(tier, fId, '7.9', 'Zero deficit reminder suppression', () => {
      const remainingGlasses = 0;
      const interval = canonicalSmartInterval(400, remainingGlasses);
      assert.strictEqual(interval, 180); // Paused/maximum gentle interval
    });
  });

  it('7.10: Smart interval bounds clamping strictly between 45 and 150 minutes', () => {
    registerTest(tier, fId, '7.10', 'Smart interval minimum (45m) and maximum (150m) clamping', () => {
      // Minutes to sleep = 30, deficit = 10 glasses -> raw 3 min -> clamped to 45 min
      assert.strictEqual(canonicalSmartInterval(30, 10), 45);

      // Minutes to sleep = 900, deficit = 1 glass -> raw 900 min -> clamped to 150 min
      assert.strictEqual(canonicalSmartInterval(900, 1), 150);
    });
  });
});
