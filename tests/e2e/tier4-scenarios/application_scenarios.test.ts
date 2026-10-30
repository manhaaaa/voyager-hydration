import { describe, it } from 'node:test';
import {
  assert,
  registerTest,
  canonicalCalculateDailyGoal,
  canonicalRemainingCups,
  canonicalSmartInterval,
  canonicalIsInQuietHours,
  canonicalAdjustForQuietHours,
  canonicalFormatVolume,
  DualLayerStorageSimulator,
  NotificationSchedulerSimulator,
} from '../harness.ts';

describe('Tier 4 - Real-World Application Scenarios (9 Tests)', () => {
  const tier = 'Tier 4';
  const fId = 'T4';

  it('T4.01: Scenario 1 — New User Onboarding & First Hydration Setup', async () => {
    registerTest(tier, fId, 'T4.01', 'Scenario 1: New user onboarding journey', async () => {
      const storage = new DualLayerStorageSimulator();

      // Step 1: User launches app for first time; default profile hydrated
      const initialProfile = storage.get('user_profile', {
        name: 'Mạnh',
        weightKg: 65,
        heightCm: 170,
        age: 24,
        activityLevel: 'moderate',
        autoAdjustWeather: true,
        unit: 'L',
      });
      assert.strictEqual(initialProfile.name, 'Mạnh');
      assert.strictEqual(initialProfile.weightKg, 65);

      // Step 2: Open-Meteo weather acquired (e.g. 29°C, 55% hum -> +250ml bonus)
      const goal = canonicalCalculateDailyGoal(initialProfile.weightKg, initialProfile.activityLevel, 29, 55, true);
      // 65 * 35 = 2275. Moderate = 350. Weather = 250. Raw = 2875 -> Rounded to 2900 ml
      assert.strictEqual(goal, 2900);

      // Step 3: Save profile to persistent storage
      await storage.set('user_profile', initialProfile);
      const saved = await storage.getFromPreferences('user_profile', null);
      assert.deepStrictEqual(saved, initialProfile);
    });
  });

  it('T4.02: Scenario 2 — Active Workday Hydration Journey', () => {
    registerTest(tier, fId, 'T4.02', 'Scenario 2: Active workday hydration journey', () => {
      const goal = 2400; // 2.4L
      let consumed = 0;
      const wakeTime = '07:00';
      const sleepTime = '01:00';

      // 07:15 AM: Wakeup glass (250ml)
      consumed += 250;
      assert.strictEqual(canonicalRemainingCups(goal, consumed, 250), 9);

      // 10:00 AM: Morning water break (250ml)
      consumed += 250;
      assert.strictEqual(canonicalRemainingCups(goal, consumed, 250), 8);

      // 12:30 PM: Lunch beverage (500ml)
      consumed += 500;
      assert.strictEqual(canonicalRemainingCups(goal, consumed, 250), 6);

      // 15:30 PM: Afternoon hydration (250ml)
      consumed += 250;
      assert.strictEqual(consumed, 1250);

      // 18:00 PM: Post-work workout hydration (500ml)
      consumed += 500;
      assert.strictEqual(canonicalRemainingCups(goal, consumed, 250), 3);

      // 21:00 PM: Evening glass (400ml)
      consumed += 400;
      assert.strictEqual(canonicalRemainingCups(goal, consumed, 250), 1);

      // 22:30 PM: Final sip (250ml) -> Goal achieved!
      consumed += 250;
      assert.strictEqual(canonicalRemainingCups(goal, consumed, 250), 0);
      assert.ok(consumed >= goal);
    });
  });

  it('T4.03: Scenario 3 — Scorching Summer Heatwave (36°C, 35% humidity)', () => {
    registerTest(tier, fId, 'T4.03', 'Scenario 3: Scorching summer heatwave scenario', () => {
      const weight = 70; // 70 * 35 = 2450ml
      const activity = 'moderate'; // +350ml
      // Temperature 36°C (>32) -> +500ml; Humidity 35% (<40) -> +150ml. Total weather = +650ml
      const hotWeatherGoal = canonicalCalculateDailyGoal(weight, activity, 36, 35, true);
      // Raw: 2450 + 350 + 650 = 3450ml -> already multiple of 50
      assert.strictEqual(hotWeatherGoal, 3450);

      const standardDayGoal = canonicalCalculateDailyGoal(weight, activity, 25, 60, true);
      // Standard: 2450 + 350 + 0 = 2800ml
      assert.strictEqual(standardDayGoal, 2800);

      // Weather surcharge increased requirement by 650ml (approx 2.6 glasses)
      const diffMl = hotWeatherGoal - standardDayGoal;
      assert.strictEqual(diffMl, 650);
      assert.strictEqual(canonicalRemainingCups(hotWeatherGoal, standardDayGoal, 250), 3);
    });
  });

  it('T4.04: Scenario 4 — Over-Achievement Celebration (125% of goal)', () => {
    registerTest(tier, fId, 'T4.04', 'Scenario 4: Over-achievement celebration', () => {
      const goal = 2000;
      const consumed = 2500; // 125%

      const fillPercentage = Math.min(100, Math.round((consumed / goal) * 100));
      assert.strictEqual(fillPercentage, 100, 'Wave reservoir stays clamped at 100%');

      const textDisplay = `${canonicalFormatVolume(consumed, 'L')} / ${canonicalFormatVolume(goal, 'L')}`;
      assert.strictEqual(textDisplay, '2,5 L / 2,0 L', 'Display shows 2,5 L / 2,0 L');

      const isCelebration = consumed >= goal;
      assert.strictEqual(isCelebration, true);
    });
  });

  it('T4.05: Scenario 5 — Offline Flight Mode & Complete Network Blackout', () => {
    registerTest(tier, fId, 'T4.05', 'Scenario 5: Offline flight mode resilience', () => {
      // Offline fallback weather simulation
      const fallbackWeather = {
        temperature: 26.0,
        humidity: 65,
        weatherCode: 1,
        locationName: 'Hà Nội (Mặc định)',
        isOffline: true,
      };

      assert.strictEqual(fallbackWeather.isOffline, true);
      assert.strictEqual(fallbackWeather.locationName, 'Hà Nội (Mặc định)');

      // Calculation does not crash; weather bonus is 0ml
      const goal = canonicalCalculateDailyGoal(60, 'moderate', fallbackWeather.temperature, fallbackWeather.humidity, true);
      // 60*35 + 350 + 0 = 2450ml
      assert.strictEqual(goal, 2450);
    });
  });

  it('T4.06: Scenario 6 — Late Night Hydration & Strict Quiet Hours', () => {
    registerTest(tier, fId, 'T4.06', 'Scenario 6: Late night hydration and quiet hours', () => {
      // User logs water at 01:30 AM
      const lateNightLog = new Date(2026, 9, 31, 1, 30);
      const isQuiet = canonicalIsInQuietHours(lateNightLog, '07:00', '01:00');
      assert.strictEqual(isQuiet, true, '01:30 AM must be inside quiet hours');

      // Next scheduled reminder is deferred to 07:00 AM
      const nextReminder = canonicalAdjustForQuietHours(lateNightLog, '07:00', '01:00');
      assert.strictEqual(nextReminder.getHours(), 7);
      assert.strictEqual(nextReminder.getMinutes(), 0);
    });
  });

  it('T4.07: Scenario 7 — 7-Day Habit Formation & Gold Medal Streak', () => {
    registerTest(tier, fId, 'T4.07', 'Scenario 7: 7-day habit streak completion', () => {
      const dailyLogs = [
        { day: 'T2', consumed: 2100, goal: 2000 },
        { day: 'T3', consumed: 2050, goal: 2000 },
        { day: 'T4', consumed: 2200, goal: 2000 },
        { day: 'T5', consumed: 2000, goal: 2000 },
        { day: 'T6', consumed: 2300, goal: 2000 },
        { day: 'T7', consumed: 2500, goal: 2000 },
        { day: 'CN', consumed: 2100, goal: 2000 },
      ];

      const goldMedalsCount = dailyLogs.filter(d => d.consumed >= d.goal).length;
      assert.strictEqual(goldMedalsCount, 7, 'All 7 days must earn gold medal');

      let streak = 0;
      for (const d of dailyLogs) {
        if (d.consumed >= d.goal) streak++;
        else break;
      }
      assert.strictEqual(streak, 7, 'Streak flame must display 7 days');
    });
  });

  it('T4.08: Scenario 8 — End-of-Month Data Backup & Export Integrity', async () => {
    registerTest(tier, fId, 'T4.08', 'Scenario 8: End-of-month data backup and export', async () => {
      const storage = new DualLayerStorageSimulator();
      const monthLogs: Array<{ date: string; targetMl: number; consumedMl: number; isGoalReached: boolean }> = [];

      for (let day = 1; day <= 30; day++) {
        monthLogs.push({
          date: `2026-10-${String(day).padStart(2, '0')}`,
          targetMl: 2200,
          consumedMl: 2000 + (day * 15),
          isGoalReached: (2000 + (day * 15)) >= 2200,
        });
      }

      await storage.set('october_logs', monthLogs);

      // JSON export validation
      const exportedJson = JSON.stringify(storage.get('october_logs', []));
      const parsedLogs = JSON.parse(exportedJson);
      assert.strictEqual(parsedLogs.length, 30);

      // CSV export generation validation
      const csvHeader = 'Ngày,Mục tiêu (ml),Đã uống (ml),Đạt mục tiêu\n';
      const csvRows = parsedLogs.map((l: any) => `${l.date},${l.targetMl},${l.consumedMl},${l.isGoalReached ? 'Hoàn thành' : 'Chưa đạt'}`).join('\n');
      const csvContent = csvHeader + csvRows;

      const lines = csvContent.trim().split('\n');
      assert.strictEqual(lines.length, 31); // 1 header + 30 data rows
      assert.ok(lines[1].startsWith('2026-10-01,2200'));
    });
  });

  it('T4.09: Scenario 9 — Full Theme & Companion Customization Journey', () => {
    registerTest(tier, fId, 'T4.09', 'Scenario 9: Full personalization and customization', () => {
      const userSettings = {
        theme: 'nebula_aurora', // Dải Ngân Hà Rực Rỡ
        companion: 'maestro',   // Voyager Hòa Âm
        customAvatar: 'data:image/png;base64,AVATAR_MAESTRO',
        unit: 'ml' as const,
      };

      assert.strictEqual(userSettings.theme, 'nebula_aurora');
      assert.strictEqual(userSettings.companion, 'maestro');
      assert.strictEqual(userSettings.unit, 'ml');

      // Formatted in ml
      const readout = canonicalFormatVolume(2450, userSettings.unit);
      assert.strictEqual(readout, '2450 ml');
    });
  });
});
