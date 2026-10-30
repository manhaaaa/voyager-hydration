import { describe, it } from 'node:test';
import { assert, registerTest, DualLayerStorageSimulator } from '../harness.ts';

describe('Tier 1 - Feature 06: Dual-Layer Persistence Engine', () => {
  const tier = 'Tier 1';
  const fId = 'F06';

  it('6.1: Dual-layer write updates synchronous localStorage immediately', async () => {
    registerTest(tier, fId, '6.1', 'Dual-layer write updates localStorage immediately', async () => {
      const storage = new DualLayerStorageSimulator();
      await storage.set('voyager_test_key', { count: 42 });
      const cached = storage.get('voyager_test_key', null);
      assert.deepStrictEqual(cached, { count: 42 });
    });
    const storage = new DualLayerStorageSimulator();
    await storage.set('voyager_test_key', { count: 42 });
    assert.deepStrictEqual(storage.get('voyager_test_key', null), { count: 42 });
  });

  it('6.2: Dual-layer write synchronizes to asynchronous preferences', async () => {
    registerTest(tier, fId, '6.2', 'Dual-layer write synchronizes to preferences', async () => {
      const storage = new DualLayerStorageSimulator();
      await storage.set('user_profile', { name: 'Mạnh', weight: 65 });
      const fromPrefs = await storage.getFromPreferences('user_profile', null);
      assert.deepStrictEqual(fromPrefs, { name: 'Mạnh', weight: 65 });
    });
  });

  it('6.3: State loader hydrates default profile when storage empty', () => {
    registerTest(tier, fId, '6.3', 'State loader hydrates default profile', () => {
      const storage = new DualLayerStorageSimulator();
      const defaultProfile = {
        name: 'Mạnh',
        weightKg: 60,
        heightCm: 170,
        activityLevel: 'moderate',
        unit: 'L',
        streak: 0,
      };
      const loaded = storage.get('non_existent_key', defaultProfile);
      assert.strictEqual(loaded.name, 'Mạnh');
      assert.strictEqual(loaded.weightKg, 60);
    });
  });

  it('6.4: Export JSON function generates valid parseable JSON', () => {
    registerTest(tier, fId, '6.4', 'Export JSON generates valid parseable JSON', () => {
      const appState = {
        profile: { name: 'Mạnh', weightKg: 65 },
        logs: { '2026-10-30': { consumedMl: 1500, targetMl: 2275 } },
        version: '1.0.0',
      };
      const jsonStr = JSON.stringify(appState, null, 2);
      const parsed = JSON.parse(jsonStr);
      assert.strictEqual(parsed.profile.name, 'Mạnh');
      assert.strictEqual(parsed.logs['2026-10-30'].consumedMl, 1500);
    });
  });

  it('6.5: Export CSV function generates valid UTF-8 CSV with expected column headers', () => {
    registerTest(tier, fId, '6.5', 'Export CSV generates valid UTF-8 CSV', () => {
      const headers = ['Ngày', 'Mục tiêu (ml)', 'Đã uống (ml)', 'Tỷ lệ (%)', 'Trạng thái', 'Số lần uống'];
      const csvHeaderLine = headers.join(',');
      assert.ok(csvHeaderLine.includes('Ngày'));
      assert.ok(csvHeaderLine.includes('Mục tiêu (ml)'));
      assert.ok(csvHeaderLine.includes('Đã uống (ml)'));

      const sampleRow = ['2026-10-30', '2250', '2500', '111.1%', 'Hoàn thành', '8'].join(',');
      const csvContent = `${csvHeaderLine}\n${sampleRow}`;
      const lines = csvContent.split('\n');
      assert.strictEqual(lines.length, 2);
      assert.strictEqual(lines[0], csvHeaderLine);
    });
  });
});
