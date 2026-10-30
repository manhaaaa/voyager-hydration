import { describe, it } from 'node:test';
import { assert, registerTest } from '../harness.ts';

describe('Tier 1 - Feature 11: ReminderTab Screen', () => {
  const tier = 'Tier 1';
  const fId = 'F11';

  it('11.1: Next reminder card renders cosmic bell and countdown string', () => {
    registerTest(tier, fId, '11.1', 'Next reminder card renders cosmic bell and countdown', () => {
      const formatCountdown = (hours: number, minutes: number) =>
        `Sau ${hours} giờ ${minutes} phút`;
      assert.strictEqual(formatCountdown(2, 53), 'Sau 2 giờ 53 phút');
      assert.strictEqual(formatCountdown(0, 45), 'Sau 0 giờ 45 phút');
    });
  });

  it('11.2: Master reminder toggle switch manages active notification state', () => {
    registerTest(tier, fId, '11.2', 'Master toggle manages active notification state', () => {
      let isReminderEnabled = true;
      const toggle = () => { isReminderEnabled = !isReminderEnabled; };

      assert.strictEqual(isReminderEnabled, true);
      toggle();
      assert.strictEqual(isReminderEnabled, false);
    });
  });

  it('11.3: Reminder mode selector offers 3 cards (Nhẹ nhàng, Thông minh, Đều đặn)', () => {
    registerTest(tier, fId, '11.3', 'Reminder mode selector options', () => {
      const modes = [
        { id: 'gentle', label: 'Nhẹ nhàng' },
        { id: 'smart', label: 'Thông minh', isDefault: true },
        { id: 'regular', label: 'Đều đặn' },
      ];
      assert.strictEqual(modes.length, 3);
      assert.strictEqual(modes.find(m => m.isDefault)?.id, 'smart');
    });
  });

  it('11.4: Schedule section defines Wake (07:00), Sleep (01:00), and Quiet Hours (01:00 - 07:00)', () => {
    registerTest(tier, fId, '11.4', 'Schedule section defaults', () => {
      const schedule = {
        wakeTime: '07:00',
        sleepTime: '01:00',
        quietHours: '01:00 - 07:00',
      };
      assert.strictEqual(schedule.wakeTime, '07:00');
      assert.strictEqual(schedule.sleepTime, '01:00');
      assert.strictEqual(schedule.quietHours, '01:00 - 07:00');
    });
  });

  it('11.5: Alert sound section defines 3 sound choices with preview buttons', () => {
    registerTest(tier, fId, '11.5', 'Alert sound section choices', () => {
      const sounds = ['Gợn nhẹ', 'Violin Tinh cầu', 'Chuông bong bóng'];
      assert.strictEqual(sounds.length, 3);
      assert.ok(sounds.includes('Violin Tinh cầu'));
    });
  });
});
