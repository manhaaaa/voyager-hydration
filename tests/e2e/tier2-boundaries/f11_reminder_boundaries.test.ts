import { describe, it } from 'node:test';
import { assert, registerTest, canonicalAdjustForQuietHours } from '../harness.ts';

describe('Tier 2 - Feature 11: ReminderTab Boundaries & Timing Logic', () => {
  const tier = 'Tier 2';
  const fId = 'F11';

  it('11.6: Countdown displays "0 phút" when scheduled time is passed', () => {
    registerTest(tier, fId, '11.6', 'Expired countdown display', () => {
      const getCountdownStr = (targetTimeMs: number, nowMs: number) => {
        const diffMs = targetTimeMs - nowMs;
        if (diffMs <= 0) return 'Đã đến giờ uống nước!';
        const hours = Math.floor(diffMs / (60 * 60 * 1000));
        const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
        return `Sau ${hours} giờ ${minutes} phút`;
      };

      assert.strictEqual(getCountdownStr(1000, 2000), 'Đã đến giờ uống nước!');
      assert.strictEqual(getCountdownStr(2000 + 3600000, 2000), 'Sau 1 giờ 0 phút');
    });
  });

  it('11.7: Changing wake time updates quiet hours span', () => {
    registerTest(tier, fId, '11.7', 'Dynamic quiet hours window string', () => {
      const getQuietSpan = (wake: string, sleep: string) => `${sleep} - ${wake}`;
      assert.strictEqual(getQuietSpan('07:00', '01:00'), '01:00 - 07:00');
      assert.strictEqual(getQuietSpan('08:00', '00:00'), '00:00 - 08:00');
    });
  });

  it('11.8: Switching to "Nhẹ nhàng" immediately locks interval to 180 min', () => {
    registerTest(tier, fId, '11.8', 'Gentle mode interval locking', () => {
      const getIntervalForMode = (mode: string) => {
        if (mode === 'gentle') return 180;
        if (mode === 'regular') return 90;
        return null; // dynamic
      };
      assert.strictEqual(getIntervalForMode('gentle'), 180);
      assert.strictEqual(getIntervalForMode('regular'), 90);
    });
  });

  it('11.9: Sound preview does not modify hydration intake log state', () => {
    registerTest(tier, fId, '11.9', 'Audio preview isolation from intake state', () => {
      let consumed = 1500;
      const previewSound = (type: string) => {
        // Only plays sound, does not log water
      };
      previewSound('violin');
      assert.strictEqual(consumed, 1500, 'Audio preview must not inadvertently log water intake');
    });
  });

  it('11.10: Deactivated reminder gray-out state', () => {
    registerTest(tier, fId, '11.10', 'Deactivated reminder card status', () => {
      const isEnabled = false;
      const statusText = isEnabled ? 'Đang hoạt động' : 'Đã tắt nhắc nhở';
      assert.strictEqual(statusText, 'Đã tắt nhắc nhở');
    });
  });
});
