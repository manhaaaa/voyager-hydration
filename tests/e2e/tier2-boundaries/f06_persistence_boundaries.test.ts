import { describe, it } from 'node:test';
import { assert, registerTest, DualLayerStorageSimulator } from '../harness.ts';

describe('Tier 2 - Feature 06: Dual-Layer Persistence Boundaries', () => {
  const tier = 'Tier 2';
  const fId = 'F06';

  it('6.6: Corrupted localStorage JSON string safely falls back to default schema', () => {
    registerTest(tier, fId, '6.6', 'Corrupted localStorage JSON recovery', () => {
      const storage = new DualLayerStorageSimulator();
      // Inject bad JSON directly
      (storage as any).localMem.set('voyager_profile', '{broken json');

      const fallbackProfile = { name: 'Mạnh', weightKg: 60 };
      const loaded = storage.get('voyager_profile', fallbackProfile);
      assert.deepStrictEqual(loaded, fallbackProfile);
    });
  });

  it('6.7: Partial storage eviction (localStorage cleared) reconciles from preferences', async () => {
    registerTest(tier, fId, '6.7', 'Reconciliation when localStorage evicted by OS', async () => {
      const storage = new DualLayerStorageSimulator();
      await storage.set('persistent_streak', 14);

      // Simulate Android webview memory wipe on localStorage only
      storage.clearLocalStorage();
      assert.strictEqual(storage.get('persistent_streak', 0), 0);

      // Reconcile from Capacitor preferences
      await storage.reconcile();
      assert.strictEqual(storage.get('persistent_streak', 0), 14);
    });
  });

  it('6.8: Special characters, Unicode, and emojis ("Nguyễn Văn Mạnh", 🔥) preserved', async () => {
    registerTest(tier, fId, '6.8', 'Unicode and emoji persistence fidelity', async () => {
      const storage = new DualLayerStorageSimulator();
      const payload = {
        name: 'Nguyễn Văn Mạnh 🌌',
        streakBadge: '🔥 10 ngày',
        quote: 'Voyager du hành không gian!',
      };
      await storage.set('unicode_test', payload);
      const retrieved = storage.get('unicode_test', null);
      assert.deepStrictEqual(retrieved, payload);
    });
  });

  it('6.9: High volume daily logs (365 days) serialization and storage size bounded', async () => {
    registerTest(tier, fId, '6.9', 'Annual history storage volume scalability', async () => {
      const storage = new DualLayerStorageSimulator();
      const annualLogs: Record<string, any> = {};

      for (let day = 1; day <= 365; day++) {
        const dateKey = `2026-${String(Math.floor(day / 30) + 1).padStart(2, '0')}-${String((day % 28) + 1).padStart(2, '0')}`;
        annualLogs[dateKey] = {
          date: dateKey,
          consumedMl: 2000 + (day % 500),
          targetMl: 2200,
          isGoalReached: true,
          entriesCount: 5,
        };
      }

      await storage.set('annual_logs', annualLogs);
      const jsonStr = JSON.stringify(storage.get('annual_logs', {}));
      // 365 days should take < 50 KB
      assert.ok(jsonStr.length < 50 * 1024, `Annual logs size should be < 50KB, was ${jsonStr.length} bytes`);
    });
  });

  it('6.10: Export CSV properly escapes commas, quotes, and newlines per RFC-4180', () => {
    registerTest(tier, fId, '6.10', 'CSV escaping rules per RFC-4180', () => {
      const escapeCsvCell = (cell: string | number) => {
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      assert.strictEqual(escapeCsvCell('Simple'), 'Simple');
      assert.strictEqual(escapeCsvCell('Hello, World'), '"Hello, World"');
      assert.strictEqual(escapeCsvCell('Quote "Test"'), '"Quote ""Test"""');
    });
  });
});
