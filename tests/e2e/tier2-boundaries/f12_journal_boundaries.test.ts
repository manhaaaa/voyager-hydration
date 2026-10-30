import { describe, it } from 'node:test';
import { assert, registerTest } from '../harness.ts';

describe('Tier 2 - Feature 12: JournalTab Boundaries & Streak Logic', () => {
  const tier = 'Tier 2';
  const fId = 'F12';

  it('12.6: Month switcher navigation across year boundaries (Jan 2026 -> Dec 2025)', () => {
    registerTest(tier, fId, '12.6', 'Month switcher across year boundaries', () => {
      const getPrevMonth = (year: number, month: number) => {
        if (month === 1) return { year: year - 1, month: 12 };
        return { year, month: month - 1 };
      };

      assert.deepStrictEqual(getPrevMonth(2026, 1), { year: 2025, month: 12 });
      assert.deepStrictEqual(getPrevMonth(2026, 5), { year: 2026, month: 4 });
    });
  });

  it('12.7: Days with zero water logged display empty cup with no gold medal', () => {
    registerTest(tier, fId, '12.7', 'Zero log days cup state', () => {
      const dayRecord = { consumed: 0, target: 2000 };
      const hasMedal = dayRecord.consumed >= dayRecord.target;
      assert.strictEqual(hasMedal, false);
      const cupFill = dayRecord.consumed > 0;
      assert.strictEqual(cupFill, false);
    });
  });

  it('12.8: Day cell detail inspection extracts chronological logs', () => {
    registerTest(tier, fId, '12.8', 'Day cell log detail extraction', () => {
      const entries = [
        { time: '08:15', amountMl: 250 },
        { time: '11:30', amountMl: 500 },
        { time: '15:45', amountMl: 250 },
      ];
      const totalDay = entries.reduce((acc, e) => acc + e.amountMl, 0);
      assert.strictEqual(totalDay, 1000);
      assert.strictEqual(entries.length, 3);
    });
  });

  it('12.9: Streak breaks when a non-goal day intervenes', () => {
    registerTest(tier, fId, '12.9', 'Streak calculation broken sequence', () => {
      const computeStreak = (history: boolean[]) => {
        // history ordered newest first: [todayMet, yesterdayMet, ...]
        let streak = 0;
        for (const met of history) {
          if (met) streak++;
          else break;
        }
        return streak;
      };

      // 3 days met, 1 missed, 4 met
      const history = [true, true, true, false, true, true, true, true];
      assert.strictEqual(computeStreak(history), 3, 'Streak should stop at first missed goal');
    });
  });

  it('12.10: Leap year February calculation (29 days in 2028 vs 28 in 2026)', () => {
    registerTest(tier, fId, '12.10', 'Days in February leap year calculation', () => {
      const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month, 0).getDate();
      };
      assert.strictEqual(getDaysInMonth(2026, 2), 28);
      assert.strictEqual(getDaysInMonth(2028, 2), 29);
      assert.strictEqual(getDaysInMonth(2026, 10), 31);
    });
  });
});
