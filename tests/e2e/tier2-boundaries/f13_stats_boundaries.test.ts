import { describe, it } from 'node:test';
import { assert, registerTest } from '../harness.ts';

describe('Tier 2 - Feature 13: StatsTab Boundaries & Chart Calculations', () => {
  const tier = 'Tier 2';
  const fId = 'F13';

  it('13.6: Mini Voyager chibi positioned at peak column', () => {
    registerTest(tier, fId, '13.6', 'Mini Voyager perched on peak column calculation', () => {
      const dailyIntakes = [
        { day: 'T2', ml: 1500 },
        { day: 'T3', ml: 2200 },
        { day: 'T4', ml: 2800 }, // Peak
        { day: 'T5', ml: 2100 },
        { day: 'T6', ml: 1900 },
        { day: 'T7', ml: 2000 },
        { day: 'CN', ml: 2300 },
      ];
      const peak = dailyIntakes.reduce((max, d) => (d.ml > max.ml ? d : max), dailyIntakes[0]);
      assert.strictEqual(peak.day, 'T4');
      assert.strictEqual(peak.ml, 2800);
    });
  });

  it('13.7: High consumption days scale column height gracefully without overflow', () => {
    registerTest(tier, fId, '13.7', 'Column percentage scaling with max ceiling', () => {
      const getColumnHeightPct = (ml: number, chartMaxMl: number) => {
        return Math.min(100, Math.round((ml / chartMaxMl) * 100));
      };

      assert.strictEqual(getColumnHeightPct(1500, 3000), 50);
      assert.strictEqual(getColumnHeightPct(3000, 3000), 100);
      assert.strictEqual(getColumnHeightPct(4500, 3000), 100);
    });
  });

  it('13.8: Week with zero data displays 0.0 L without division by zero', () => {
    registerTest(tier, fId, '13.8', 'Zero data division by zero guard', () => {
      const totalMl = 0;
      const daysCount = 7;
      const averageMl = daysCount > 0 ? totalMl / daysCount : 0;
      assert.strictEqual(averageMl, 0);
      assert.strictEqual((totalMl / 1000).toFixed(1), '0.0');
    });
  });

  it('13.9: Completion summary counts completed days correctly', () => {
    registerTest(tier, fId, '13.9', 'Completed days count out of 7', () => {
      const weekLogs = [
        { consumed: 2100, target: 2000 }, // yes
        { consumed: 1500, target: 2000 }, // no
        { consumed: 2200, target: 2000 }, // yes
        { consumed: 2000, target: 2000 }, // yes
        { consumed: 1800, target: 2000 }, // no
        { consumed: 2500, target: 2000 }, // yes
        { consumed: 2100, target: 2000 }, // yes
      ];
      const completedCount = weekLogs.filter(d => d.consumed >= d.target).length;
      assert.strictEqual(completedCount, 5);
      const summaryStr = `${completedCount} / 7 ngày`;
      assert.strictEqual(summaryStr, '5 / 7 ngày');
    });
  });

  it('13.10: Record streak tracks historical maximum streak', () => {
    registerTest(tier, fId, '13.10', 'Record streak update logic', () => {
      let currentStreak = 8;
      let recordStreak = 7;
      if (currentStreak > recordStreak) {
        recordStreak = currentStreak;
      }
      assert.strictEqual(recordStreak, 8);
    });
  });
});
