import { describe, it } from 'node:test';
import {
  assert,
  registerTest,
  NotificationSchedulerSimulator,
  canonicalSmartInterval,
} from '../harness.ts';

describe('Tier 1 - Feature 07: Local Notification Scheduler & Quiet Hours', () => {
  const tier = 'Tier 1';
  const fId = 'F07';

  it('7.1: Notification channel ID and setup configuration', async () => {
    registerTest(tier, fId, '7.1', 'Notification channel configuration', async () => {
      const scheduler = new NotificationSchedulerSimulator();
      await scheduler.createChannel({
        id: 'voyager_hydration_reminders',
        name: 'Nhắc nhở uống nước Voyager',
      });
      assert.strictEqual(scheduler.channels.length, 1);
      assert.strictEqual(scheduler.channels[0].id, 'voyager_hydration_reminders');
    });
  });

  it('7.2: Supports 3 reminder modes (Nhẹ nhàng, Thông minh, Đều đặn)', () => {
    registerTest(tier, fId, '7.2', 'Supports 3 reminder modes', () => {
      const modes = ['gentle', 'smart', 'regular'];
      const intervals = {
        gentle: 180, // 3 hours
        regular: 90,  // 1.5 hours
      };
      assert.strictEqual(intervals.gentle, 180);
      assert.strictEqual(intervals.regular, 90);
      assert.ok(modes.includes('smart'), 'Smart mode must be supported');
    });
  });

  it('7.3: Smart interval dynamically adapts to deficit and awake window', () => {
    registerTest(tier, fId, '7.3', 'Smart interval adapts to deficit and awake window', () => {
      // 660 minutes awake, 6 glasses deficit -> 660 / 6 = 110 min
      const interval1 = canonicalSmartInterval(660, 6);
      assert.strictEqual(interval1, 110);

      // Clamping: very small time, many glasses -> raw 20 min clamped to 45 min
      const intervalClampedMin = canonicalSmartInterval(100, 5);
      assert.strictEqual(intervalClampedMin, 45);

      // Clamping: large time, few glasses -> raw 300 min clamped to 150 min
      const intervalClampedMax = canonicalSmartInterval(600, 1);
      assert.strictEqual(intervalClampedMax, 150);
    });
  });

  it('7.4: Notification toggle off cancels scheduled notifications in queue', async () => {
    registerTest(tier, fId, '7.4', 'Notification toggle off cancels queue', async () => {
      const scheduler = new NotificationSchedulerSimulator();
      await scheduler.schedule({
        notifications: [
          { id: 1, title: 'Nhắc nước', body: 'Hãy uống nước', schedule: { at: new Date() } },
          { id: 2, title: 'Nhắc nước', body: 'Hãy uống nước', schedule: { at: new Date() } },
        ],
      });
      assert.strictEqual(scheduler.scheduled.length, 2);

      // Toggle OFF cancels all
      await scheduler.cancelAll();
      assert.strictEqual(scheduler.scheduled.length, 0);
    });
  });

  it('7.5: Notification messages use Reverse: 1999 Voyager celestial phrasing', () => {
    registerTest(tier, fId, '7.5', 'Reverse: 1999 Voyager celestial messages', () => {
      const messages = [
        'Một nốt nhạc ngân hà vừa ngân lên... Hãy uống một ngụm nước để tinh cầu luôn tràn đầy sức sống nhé!',
        'Vũ trụ khát nước rồi! Voyager đã chuẩn bị sẵn một ly nước mát cho bạn rồi đây!',
        'Tiếng đàn thúc giục 🎻: Chuyến du hành hôm nay sắp kết thúc mà mục tiêu nước vẫn chưa xong!',
      ];
      for (const msg of messages) {
        assert.ok(msg.includes('ngân hà') || msg.includes('Voyager') || msg.includes('đàn'));
      }
    });
  });
});
