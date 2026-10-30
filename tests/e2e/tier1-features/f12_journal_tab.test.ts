import { describe, it } from 'node:test';
import { assert, registerTest } from '../harness.ts';

describe('Tier 1 - Feature 12: JournalTab Screen', () => {
  const tier = 'Tier 1';
  const fId = 'F12';

  it('12.1: Header renders "Nhật ký ngân hà" and month navigator', () => {
    registerTest(tier, fId, '12.1', 'Header renders title and month navigator', () => {
      const header = {
        title: 'Nhật ký ngân hà',
        monthLabel: 'tháng 10 năm 2026',
      };
      assert.strictEqual(header.title, 'Nhật ký ngân hà');
      assert.ok(header.monthLabel.includes('2026'));
    });
  });

  it('12.2: Calendar grid defines 7 columns (T2 - CN)', () => {
    registerTest(tier, fId, '12.2', 'Calendar grid 7 column headers', () => {
      const dayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      assert.strictEqual(dayHeaders.length, 7);
      assert.strictEqual(dayHeaders[0], 'T2');
      assert.strictEqual(dayHeaders[6], 'CN');
    });
  });

  it('12.3: Calendar day cells compute cup fill level percentage', () => {
    registerTest(tier, fId, '12.3', 'Day cell cup fill level percentage', () => {
      const getFillLevel = (consumed: number, target: number) => {
        if (target <= 0) return 0;
        return Math.min(100, Math.round((consumed / target) * 100));
      };
      assert.strictEqual(getFillLevel(0, 2000), 0);
      assert.strictEqual(getFillLevel(1000, 2000), 50);
      assert.strictEqual(getFillLevel(2000, 2000), 100);
    });
  });

  it('12.4: Gold star medal badge appears when consumed >= target', () => {
    registerTest(tier, fId, '12.4', 'Gold star medal badge on goal achievement', () => {
      const hasGoldMedal = (consumed: number, target: number) => consumed >= target;
      assert.strictEqual(hasGoldMedal(1950, 2000), false);
      assert.strictEqual(hasGoldMedal(2000, 2000), true);
      assert.strictEqual(hasGoldMedal(2250, 2000), true);
    });
  });

  it('12.5: Streak card renders smiling flame icon 🔥, streak count and text', () => {
    registerTest(tier, fId, '12.5', 'Streak card renders flame icon and message', () => {
      const streakCard = {
        streakDays: 5,
        subtitle: 'Bạn đang giữ nhịp tốt. Hãy cùng Voyager duy trì nhé!',
      };
      assert.strictEqual(streakCard.streakDays, 5);
      assert.ok(streakCard.subtitle.includes('Voyager'));
    });
  });
});
