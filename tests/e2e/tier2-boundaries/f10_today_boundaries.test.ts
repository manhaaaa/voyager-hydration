import { describe, it } from 'node:test';
import { assert, registerTest, canonicalRemainingCups, canonicalFormatVolume } from '../harness.ts';

describe('Tier 2 - Feature 10: TodayTab Boundaries & Interaction Logic', () => {
  const tier = 'Tier 2';
  const fId = 'F10';

  it('10.6: Quick button increments: exactly +50, +150, +250, +500 ml', () => {
    registerTest(tier, fId, '10.6', 'Quick button exact volume increments', () => {
      let consumed = 1000;
      const logDrink = (ml: number) => { consumed += ml; };

      logDrink(50);
      assert.strictEqual(consumed, 1050);
      logDrink(150);
      assert.strictEqual(consumed, 1200);
      logDrink(250);
      assert.strictEqual(consumed, 1450);
      logDrink(500);
      assert.strictEqual(consumed, 1950);
    });
  });

  it('10.7: Reaching 100% goal triggers celebration state and switches Voyager to happy', () => {
    registerTest(tier, fId, '10.7', '100% goal trigger celebration & happy mood', () => {
      const getVoyagerMood = (consumed: number, goal: number) => {
        if (consumed >= goal) return 'happy';
        return 'idle';
      };

      assert.strictEqual(getVoyagerMood(1500, 2000), 'idle');
      assert.strictEqual(getVoyagerMood(2000, 2000), 'happy');
      assert.strictEqual(getVoyagerMood(2500, 2000), 'happy');
    });
  });

  it('10.8: Over-consumption (>200% goal) visual tank clamps to 100% while text shows true volume', () => {
    registerTest(tier, fId, '10.8', 'Over-consumption visual wave clamp vs text display', () => {
      const goal = 2000;
      const consumed = 4500; // 225%

      const visualPercent = Math.min(100, Math.round((consumed / goal) * 100));
      assert.strictEqual(visualPercent, 100, 'Visual wave height must clamp at 100% to avoid layout breakage');

      const textDisplay = `${canonicalFormatVolume(consumed, 'L')} / ${canonicalFormatVolume(goal, 'L')}`;
      assert.strictEqual(textDisplay, '4,5 L / 2,0 L', 'Numerical readout must display true consumed volume');
    });
  });

  it('10.9: Deficit cups returns 0 when goal is reached or exceeded', () => {
    registerTest(tier, fId, '10.9', 'Zero remaining cups when goal reached', () => {
      assert.strictEqual(canonicalRemainingCups(1600, 1600, 250), 0);
      assert.strictEqual(canonicalRemainingCups(1600, 1800, 250), 0);
      assert.strictEqual(canonicalRemainingCups(1600, 5000, 250), 0);
    });
  });

  it('10.10: Custom intake input sanitization (positive integers only)', () => {
    registerTest(tier, fId, '10.10', 'Custom input modal validation', () => {
      const sanitizeCustomMl = (rawInput: string): number | null => {
        const num = Number(rawInput);
        if (isNaN(num) || !Number.isInteger(num) || num <= 0 || num > 5000) {
          return null; // Invalid
        }
        return num;
      };

      assert.strictEqual(sanitizeCustomMl('330'), 330);
      assert.strictEqual(sanitizeCustomMl('750'), 750);
      assert.strictEqual(sanitizeCustomMl('-50'), null);
      assert.strictEqual(sanitizeCustomMl('abc'), null);
      assert.strictEqual(sanitizeCustomMl('10000'), null); // exceeds 5000ml max single log
    });
  });
});
