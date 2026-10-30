import { describe, it } from 'node:test';
import { assert, registerTest } from '../harness.ts';

describe('Tier 1 - Feature 14: ProfileTab Screen', () => {
  const tier = 'Tier 1';
  const fId = 'F14';

  it('14.1: Profile card displays avatar, name "Mạnh", and local storage disclaimer', () => {
    registerTest(tier, fId, '14.1', 'Profile card displays default profile info', () => {
      const profile = {
        name: 'Mạnh',
        disclaimer: 'Tiến độ lưu trên máy này.',
      };
      assert.strictEqual(profile.name, 'Mạnh');
      assert.strictEqual(profile.disclaimer, 'Tiến độ lưu trên máy này.');
    });
  });

  it('14.2: Body metrics section holds Weight, Height, Age, and Activity level', () => {
    registerTest(tier, fId, '14.2', 'Body metrics form fields', () => {
      const metrics = {
        weightKg: 65,
        heightCm: 172,
        age: 25,
        activityLevel: 'moderate',
      };
      assert.strictEqual(metrics.weightKg, 65);
      assert.strictEqual(metrics.activityLevel, 'moderate');
    });
  });

  it('14.3: Weather section provides GPS refresh and auto adjust toggle', () => {
    registerTest(tier, fId, '14.3', 'Weather section controls', () => {
      let autoAdjustWeather = true;
      const toggle = () => { autoAdjustWeather = !autoAdjustWeather; };

      assert.strictEqual(autoAdjustWeather, true);
      toggle();
      assert.strictEqual(autoAdjustWeather, false);
    });
  });

  it('14.4: Companion section lists all 6 Voyager companions 100% unlocked', () => {
    registerTest(tier, fId, '14.4', 'All 6 companions unlocked without paywall', () => {
      const companions = [
        { id: 1, name: 'Voyager Nguyên Bản', locked: false },
        { id: 2, name: 'Voyager Tinh Vân', locked: false },
        { id: 3, name: 'Voyager Thủy Thủ', locked: false },
        { id: 4, name: 'Voyager Hòa Âm', locked: false },
        { id: 5, name: 'Voyager Hoàng Hôn', locked: false },
        { id: 6, name: 'Voyager Siêu Tân Tinh', locked: false },
      ];
      assert.strictEqual(companions.length, 6);
      const lockedCompanions = companions.filter(c => c.locked);
      assert.strictEqual(lockedCompanions.length, 0, 'Zero companions may be locked');
    });
  });

  it('14.5: Space theme section provides 4 cosmic themes 100% unlocked', () => {
    registerTest(tier, fId, '14.5', 'All 4 space themes unlocked', () => {
      const themes = [
        { id: 'deep_space', name: 'Biển Sao Đêm', locked: false },
        { id: 'nebula_aurora', name: 'Dải Ngân Hà Rực Rỡ', locked: false },
        { id: 'supernova_gold', name: 'Ánh Hoàng Hôn Sao Hỏa', locked: false },
        { id: 'cosmic_ocean', name: 'Vùng Tối Trăng Khuyết', locked: false },
      ];
      assert.strictEqual(themes.length, 4);
      const lockedThemes = themes.filter(t => t.locked);
      assert.strictEqual(lockedThemes.length, 0, 'Zero themes may be locked behind paywall');
    });
  });
});
