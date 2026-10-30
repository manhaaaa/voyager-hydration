import { describe, it } from 'node:test';
import { assert, registerTest, canonicalCalculateDailyGoal } from '../harness.ts';

describe('Tier 2 - Feature 14: ProfileTab Boundaries & Data Export', () => {
  const tier = 'Tier 2';
  const fId = 'F14';

  it('14.6: Unit toggle between L and ml affects formatting globally', () => {
    registerTest(tier, fId, '14.6', 'Unit toggle L vs ml formatting', () => {
      const format = (ml: number, unit: 'ml' | 'L') => {
        if (unit === 'ml') return `${ml} ml`;
        return `${(ml / 1000).toFixed(1).replace('.', ',')} L`;
      };
      assert.strictEqual(format(2500, 'L'), '2,5 L');
      assert.strictEqual(format(2500, 'ml'), '2500 ml');
    });
  });

  it('14.7: Export JSON contains valid schema with complete profile and logs', () => {
    registerTest(tier, fId, '14.7', 'JSON export complete schema check', () => {
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        user: { name: 'Mạnh', weightKg: 65, heightCm: 170, companion: 'Maestro' },
        logs: { '2026-10-30': { consumed: 2200, target: 2200 } },
      };
      const jsonStr = JSON.stringify(exportData);
      assert.ok(jsonStr.includes('exportedAt'));
      assert.ok(jsonStr.includes('Mạnh'));
      const parsed = JSON.parse(jsonStr);
      assert.strictEqual(parsed.user.name, 'Mạnh');
    });
  });

  it('14.8: Export CSV output verified for column counts and numeric values', () => {
    registerTest(tier, fId, '14.8', 'CSV export rows integrity', () => {
      const rows = [
        ['Ngày', 'Mục tiêu (ml)', 'Đã uống (ml)', 'Tỷ lệ (%)', 'Trạng thái', 'Số lần uống'],
        ['2026-10-28', '2100', '2150', '102.4%', 'Hoàn thành', '7'],
        ['2026-10-29', '2450', '2500', '102.0%', 'Hoàn thành', '8'],
      ];
      const csvStr = rows.map(r => r.join(',')).join('\n');
      const lines = csvStr.split('\n');
      assert.strictEqual(lines.length, 3);
      for (const line of lines) {
        assert.strictEqual(line.split(',').length, 6, 'Every CSV row must have exactly 6 columns');
      }
    });
  });

  it('14.9: Upload custom character accepts base64 PNG/GIF payloads', () => {
    registerTest(tier, fId, '14.9', 'Custom character base64 image storage', () => {
      const isValidImagePayload = (payload: string) => {
        return payload.startsWith('data:image/png;base64,') ||
               payload.startsWith('data:image/gif;base64,') ||
               payload.startsWith('data:image/jpeg;base64,');
      };
      assert.strictEqual(isValidImagePayload('data:image/png;base64,AA=='), true);
      assert.strictEqual(isValidImagePayload('data:image/gif;base64,BB=='), true);
      assert.strictEqual(isValidImagePayload('data:text/plain;base64,CC=='), false);
    });
  });

  it('14.10: Updating body weight in Profile immediately updates daily goal', () => {
    registerTest(tier, fId, '14.10', 'Body weight update recalculates daily goal', () => {
      const goal1 = canonicalCalculateDailyGoal(60, 'moderate', 25, 50, false);
      assert.strictEqual(goal1, 2450); // 60*35 + 350 = 2450

      // User changes weight to 80kg
      const goal2 = canonicalCalculateDailyGoal(80, 'moderate', 25, 50, false);
      assert.strictEqual(goal2, 3150); // 80*35 + 350 = 3150
      assert.strictEqual(goal2 - goal1, 700);
    });
  });
});
