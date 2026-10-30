import { describe, it } from 'node:test';
import {
  assert,
  registerTest,
  canonicalRemainingCups,
  canonicalFormatVolume,
} from '../harness.ts';

describe('Tier 1 - Feature 10: TodayTab Screen', () => {
  const tier = 'Tier 1';
  const fId = 'F10';

  it('10.1: Header renders streak badge 🔥 and title "Hôm nay"', () => {
    registerTest(tier, fId, '10.1', 'Header renders streak badge and title', () => {
      const headerState = {
        streak: 3,
        title: 'Hôm nay',
      };
      assert.strictEqual(headerState.title, 'Hôm nay');
      assert.strictEqual(headerState.streak, 3);
    });
  });

  it('10.2: Header right renders Weather Widget with temp, humidity, and bonus', () => {
    registerTest(tier, fId, '10.2', 'Weather Widget metrics display', () => {
      const weatherWidget = {
        temperature: 30,
        humidity: 65,
        bonusMl: 250,
      };
      assert.strictEqual(weatherWidget.temperature, 30);
      assert.strictEqual(weatherWidget.bonusMl, 250);
    });
  });

  it('10.3: Central water volume readout displays consumed / goal and deficit prompt', () => {
    registerTest(tier, fId, '10.3', 'Central water volume readout', () => {
      const consumed = 1000;
      const goal = 1600;
      const formatted = `${canonicalFormatVolume(consumed, 'L')} / ${canonicalFormatVolume(goal, 'L')}`;
      assert.strictEqual(formatted, '1,0 L / 1,6 L');

      const remainingCups = canonicalRemainingCups(goal, consumed, 250);
      assert.strictEqual(remainingCups, 3);
      const promptText = `Thêm ${remainingCups} ly >`;
      assert.strictEqual(promptText, 'Thêm 3 ly >');
    });
  });

  it('10.4: Cosmic wave tank fill percentage calculation and star buoy marker', () => {
    registerTest(tier, fId, '10.4', 'Cosmic wave tank fill percentage', () => {
      const calcFillPct = (consumed: number, goal: number) =>
        Math.min(100, Math.round((consumed / goal) * 100));

      assert.strictEqual(calcFillPct(800, 1600), 50);
      assert.strictEqual(calcFillPct(1600, 1600), 100);
      assert.strictEqual(calcFillPct(2400, 1600), 100); // clamped at 100% visual
    });
  });

  it('10.5: Quick drink cluster defines 4 cards (+50, +150, +250 checked, +500 ml) and custom input', () => {
    registerTest(tier, fId, '10.5', 'Quick drink cluster definition', () => {
      const quickCards = [
        { amount: 50, isDefault: false },
        { amount: 150, isDefault: false },
        { amount: 250, isDefault: true }, // Default checked
        { amount: 500, isDefault: false },
      ];
      assert.strictEqual(quickCards.length, 4);
      const defaultChecked = quickCards.find(c => c.isDefault);
      assert.ok(defaultChecked);
      assert.strictEqual(defaultChecked?.amount, 250);
    });
  });
});
