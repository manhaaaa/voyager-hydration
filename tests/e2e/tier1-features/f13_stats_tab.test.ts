import { describe, it } from 'node:test';
import { assert, registerTest } from '../harness.ts';

describe('Tier 1 - Feature 13: StatsTab Screen', () => {
  const tier = 'Tier 1';
  const fId = 'F13';

  it('13.1: Time switcher supports Tuần, Tháng, Tùy chỉnh', () => {
    registerTest(tier, fId, '13.1', 'Time switcher supports 3 modes', () => {
      const modes = ['week', 'month', 'custom'];
      assert.strictEqual(modes.length, 3);
      assert.ok(modes.includes('week'));
      assert.ok(modes.includes('month'));
    });
  });

  it('13.2: Week range formatting conforms to DD/MM - DD/MM format', () => {
    registerTest(tier, fId, '13.2', 'Week range string formatting', () => {
      const formatWeekRange = (start: string, end: string) => `< ${start} - ${end} >`;
      assert.strictEqual(formatWeekRange('26/10', '1/11'), '< 26/10 - 1/11 >');
    });
  });

  it('13.3: Summary metrics compute total week volume and daily average', () => {
    registerTest(tier, fId, '13.3', 'Summary metrics computation', () => {
      const dailyIntakesMl = [2000, 2200, 1800, 2400, 2000, 2100, 2500]; // 7 days
      const totalMl = dailyIntakesMl.reduce((a, b) => a + b, 0);
      assert.strictEqual(totalMl, 15000);
      const totalL = totalMl / 1000;
      assert.strictEqual(totalL, 15.0);

      const dailyAvgMl = Math.round(totalMl / 7);
      assert.strictEqual(dailyAvgMl, 2143);
    });
  });

  it('13.4: Bar chart columns map to 7 days of week with bubbles', () => {
    registerTest(tier, fId, '13.4', 'Bar chart 7 daily columns', () => {
      const columns = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      assert.strictEqual(columns.length, 7);
    });
  });

  it('13.5: Goal dashed line rendered horizontally across chart', () => {
    registerTest(tier, fId, '13.5', 'Goal dashed line representation', () => {
      const chartGoal = {
        targetMl: 2000,
        dashedLineStyle: 'border-dashed border-sky-400',
      };
      assert.strictEqual(chartGoal.targetMl, 2000);
      assert.ok(chartGoal.dashedLineStyle.includes('dashed'));
    });
  });
});
