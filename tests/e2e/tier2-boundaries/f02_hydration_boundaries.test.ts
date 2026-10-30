import { describe, it } from 'node:test';
import {
  assert,
  registerTest,
  canonicalCalculateBaseWater,
  canonicalCalculateWeatherWater,
  canonicalCalculateDailyGoal,
} from '../harness.ts';

describe('Tier 2 - Feature 02: Hydration Engine Formula Boundaries', () => {
  const tier = 'Tier 2';
  const fId = 'F02';

  it('2.6: Extreme weight boundary: 20 kg (min) and 300 kg (max)', () => {
    registerTest(tier, fId, '2.6', 'Extreme weight boundary clamping', () => {
      // Clamped min 20kg -> 700ml
      assert.strictEqual(canonicalCalculateBaseWater(20), 700);
      assert.strictEqual(canonicalCalculateBaseWater(15), 700); // clamped to 20kg

      // Clamped max 300kg -> 10500ml
      assert.strictEqual(canonicalCalculateBaseWater(300), 10500);
      assert.strictEqual(canonicalCalculateBaseWater(350), 10500); // clamped to 300kg
    });
    assert.strictEqual(canonicalCalculateBaseWater(20), 700);
    assert.strictEqual(canonicalCalculateBaseWater(300), 10500);
  });

  it('2.7: Invalid weight sanitization: 0 kg, negative, and NaN fallback to 60 kg (2100 ml)', () => {
    registerTest(tier, fId, '2.7', 'Invalid weight sanitization fallback', () => {
      assert.strictEqual(canonicalCalculateBaseWater(0), 2100);
      assert.strictEqual(canonicalCalculateBaseWater(-25), 2100);
      assert.strictEqual(canonicalCalculateBaseWater(NaN), 2100);
    });
    assert.strictEqual(canonicalCalculateBaseWater(0), 2100);
    assert.strictEqual(canonicalCalculateBaseWater(-10), 2100);
  });

  it('2.8: Exact temperature thresholds: exactly 28.0°C, 32.0°C, 32.1°C, 27.9°C', () => {
    registerTest(tier, fId, '2.8', 'Exact temperature thresholds verification', () => {
      // 27.9°C is < 28 -> +0 ml
      assert.strictEqual(canonicalCalculateWeatherWater(27.9, 50, true).tempBonus, 0);

      // 28.0°C is in [28, 32] -> +250 ml
      assert.strictEqual(canonicalCalculateWeatherWater(28.0, 50, true).tempBonus, 250);

      // 32.0°C is in [28, 32] -> +250 ml
      assert.strictEqual(canonicalCalculateWeatherWater(32.0, 50, true).tempBonus, 250);

      // 32.1°C is > 32 -> +500 ml
      assert.strictEqual(canonicalCalculateWeatherWater(32.1, 50, true).tempBonus, 500);
    });
    assert.strictEqual(canonicalCalculateWeatherWater(28.0, 50, true).tempBonus, 250);
    assert.strictEqual(canonicalCalculateWeatherWater(32.1, 50, true).tempBonus, 500);
  });

  it('2.9: Exact humidity thresholds: exactly 40.0%, 39.9%, 0% arid, 100% saturation', () => {
    registerTest(tier, fId, '2.9', 'Exact humidity thresholds verification', () => {
      // 40.0% is not < 40 -> +0 ml
      assert.strictEqual(canonicalCalculateWeatherWater(25, 40.0, true).humidBonus, 0);

      // 39.9% is < 40 -> +150 ml
      assert.strictEqual(canonicalCalculateWeatherWater(25, 39.9, true).humidBonus, 150);

      // 0.0% is < 40 -> +150 ml
      assert.strictEqual(canonicalCalculateWeatherWater(25, 0.0, true).humidBonus, 150);

      // 100.0% is not < 40 -> +0 ml
      assert.strictEqual(canonicalCalculateWeatherWater(25, 100.0, true).humidBonus, 0);
    });
    assert.strictEqual(canonicalCalculateWeatherWater(25, 40.0, true).humidBonus, 0);
    assert.strictEqual(canonicalCalculateWeatherWater(25, 39.9, true).humidBonus, 150);
  });

  it('2.10: Combined extreme conditions and autoWeatherAdjust toggle', () => {
    registerTest(tier, fId, '2.10', 'Combined extreme weather and autoWeatherAdjust toggle', () => {
      // 45°C + 15% humidity with autoAdjust = true -> 500 + 150 = 650 ml
      const extreme = canonicalCalculateWeatherWater(45, 15, true);
      assert.strictEqual(extreme.total, 650);

      // Same extreme with autoAdjust = false -> 0 ml
      const disabled = canonicalCalculateWeatherWater(45, 15, false);
      assert.strictEqual(disabled.total, 0);

      // Overall daily goal with autoAdjust = false (60kg sedentary -> 2100 ml)
      const goalDisabled = canonicalCalculateDailyGoal(60, 'sedentary', 45, 15, false);
      assert.strictEqual(goalDisabled, 2100);

      // Same with autoAdjust = true -> 2100 + 650 = 2750 ml
      const goalEnabled = canonicalCalculateDailyGoal(60, 'sedentary', 45, 15, true);
      assert.strictEqual(goalEnabled, 2750);
    });
    assert.strictEqual(canonicalCalculateWeatherWater(45, 15, false).total, 0);
  });
});
