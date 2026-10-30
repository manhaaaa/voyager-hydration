import { describe, it } from 'node:test';
import {
  assert,
  registerTest,
  canonicalCalculateBaseWater,
  canonicalCalculateActivityWater,
  canonicalCalculateWeatherWater,
  canonicalRoundToNearest50,
  canonicalCalculateDailyGoal,
} from '../harness.ts';

describe('Tier 1 - Feature 02: Hydration Engine Formula', () => {
  const tier = 'Tier 1';
  const fId = 'F02';

  it('2.1: W_base correctly computes weight * 35 ml', () => {
    registerTest(tier, fId, '2.1', 'W_base correctly computes weight * 35 ml', () => {
      assert.strictEqual(canonicalCalculateBaseWater(40), 1400);
      assert.strictEqual(canonicalCalculateBaseWater(60), 2100);
      assert.strictEqual(canonicalCalculateBaseWater(70), 2450);
      assert.strictEqual(canonicalCalculateBaseWater(80), 2800);
    });
    assert.strictEqual(canonicalCalculateBaseWater(60), 2100);
    assert.strictEqual(canonicalCalculateBaseWater(70), 2450);
  });

  it('2.2: W_activity returns +0, +350, +700 ml for sedentary, moderate, high', () => {
    registerTest(tier, fId, '2.2', 'W_activity returns 0, 350, 700 ml', () => {
      assert.strictEqual(canonicalCalculateActivityWater('sedentary'), 0);
      assert.strictEqual(canonicalCalculateActivityWater('moderate'), 350);
      assert.strictEqual(canonicalCalculateActivityWater('high'), 700);
    });
    assert.strictEqual(canonicalCalculateActivityWater('sedentary'), 0);
    assert.strictEqual(canonicalCalculateActivityWater('moderate'), 350);
    assert.strictEqual(canonicalCalculateActivityWater('high'), 700);
  });

  it('2.3: W_weather temperature tiers: <28°C (+0), 28-32°C (+250), >32°C (+500)', () => {
    registerTest(tier, fId, '2.3', 'W_weather temperature tiers', () => {
      assert.strictEqual(canonicalCalculateWeatherWater(25, 50, true).tempBonus, 0);
      assert.strictEqual(canonicalCalculateWeatherWater(28, 50, true).tempBonus, 250);
      assert.strictEqual(canonicalCalculateWeatherWater(30, 50, true).tempBonus, 250);
      assert.strictEqual(canonicalCalculateWeatherWater(32, 50, true).tempBonus, 250);
      assert.strictEqual(canonicalCalculateWeatherWater(33, 50, true).tempBonus, 500);
      assert.strictEqual(canonicalCalculateWeatherWater(38, 50, true).tempBonus, 500);
    });
    assert.strictEqual(canonicalCalculateWeatherWater(30, 50, true).tempBonus, 250);
    assert.strictEqual(canonicalCalculateWeatherWater(35, 50, true).tempBonus, 500);
  });

  it('2.4: W_weather humidity tier and cumulative addition with temperature', () => {
    registerTest(tier, fId, '2.4', 'W_weather humidity tier and cumulative addition', () => {
      // Normal temp, normal humidity
      const c1 = canonicalCalculateWeatherWater(24, 60, true);
      assert.strictEqual(c1.humidBonus, 0);
      assert.strictEqual(c1.total, 0);

      // Normal temp, arid humidity (<40%)
      const c2 = canonicalCalculateWeatherWater(24, 35, true);
      assert.strictEqual(c2.humidBonus, 150);
      assert.strictEqual(c2.total, 150);

      // Hot (30°C) + arid (35%) -> 250 + 150 = 400
      const c3 = canonicalCalculateWeatherWater(30, 35, true);
      assert.strictEqual(c3.total, 400);

      // Very hot (35°C) + arid (30%) -> 500 + 150 = 650
      const c4 = canonicalCalculateWeatherWater(35, 30, true);
      assert.strictEqual(c4.total, 650);
    });
    assert.strictEqual(canonicalCalculateWeatherWater(35, 30, true).total, 650);
  });

  it('2.5: Rounding to nearest 50 ml and total daily goal synthesis', () => {
    registerTest(tier, fId, '2.5', 'Rounding to nearest 50 ml and total goal', () => {
      assert.strictEqual(canonicalRoundToNearest50(2120), 2100);
      assert.strictEqual(canonicalRoundToNearest50(2125), 2150);
      assert.strictEqual(canonicalRoundToNearest50(2149), 2150);
      assert.strictEqual(canonicalRoundToNearest50(2175), 2200);

      // Example: 60kg, moderate (+350), 30°C (+250) -> 2100 + 350 + 250 = 2700
      const goal = canonicalCalculateDailyGoal(60, 'moderate', 30, 50, true);
      assert.strictEqual(goal, 2700);

      // Example: 62kg (2170), sedentary (+0), 25°C (+0) -> 2170 rounded to 50 -> 2150
      const goal2 = canonicalCalculateDailyGoal(62, 'sedentary', 25, 50, true);
      assert.strictEqual(goal2, 2150);
    });
    assert.strictEqual(canonicalRoundToNearest50(2125), 2150);
  });
});
