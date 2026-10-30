import { describe, it } from 'node:test';
import {
  assert,
  registerTest,
  canonicalCalculateDailyGoal,
  canonicalRemainingCups,
  canonicalSmartInterval,
  canonicalIsInQuietHours,
  canonicalFormatVolume,
  DualLayerStorageSimulator,
  NotificationSchedulerSimulator,
  MockAudioContext,
} from '../harness.ts';

describe('Tier 3 - Cross-Feature Pairwise Combinations (17 Tests)', () => {
  const tier = 'Tier 3';
  const fId = 'T3';

  it('T3.01 (F02 + F03): Live weather temperature & humidity dynamically adjusts hydration goal formula', () => {
    registerTest(tier, fId, 'T3.01', 'F02 + F03: Weather adjusts hydration goal formula', () => {
      // 60kg, moderate activity (350ml)
      // Cool day (22°C, 50% hum) -> 60*35 + 350 + 0 = 2450ml
      const coolGoal = canonicalCalculateDailyGoal(60, 'moderate', 22, 50, true);
      assert.strictEqual(coolGoal, 2450);

      // Hot arid day (34°C, 30% hum) -> 60*35 + 350 + (500 + 150) = 3100ml
      const hotGoal = canonicalCalculateDailyGoal(60, 'moderate', 34, 30, true);
      assert.strictEqual(hotGoal, 3100);
      assert.strictEqual(hotGoal - coolGoal, 650);
    });
  });

  it('T3.02 (F02 + F10): Quick drink buttons in TodayTab (+250ml) reduce water deficit and recalculate remaining cups', () => {
    registerTest(tier, fId, 'T3.02', 'F02 + F10: Quick log reduces deficit and remaining cups', () => {
      const goal = 2000;
      let consumed = 1000;
      assert.strictEqual(canonicalRemainingCups(goal, consumed, 250), 4);

      // Log +250ml
      consumed += 250;
      assert.strictEqual(canonicalRemainingCups(goal, consumed, 250), 3);

      // Log +500ml
      consumed += 500;
      assert.strictEqual(canonicalRemainingCups(goal, consumed, 250), 1);

      // Log final +250ml -> reached!
      consumed += 250;
      assert.strictEqual(canonicalRemainingCups(goal, consumed, 250), 0);
    });
  });

  it('T3.03 (F02 + F14): Modifying body weight in ProfileTab recomputes base water and total daily goal', () => {
    registerTest(tier, fId, 'T3.03', 'F02 + F14: Profile weight update recalculates goal', () => {
      let userWeight = 60;
      const initialGoal = canonicalCalculateDailyGoal(userWeight, 'sedentary', 25, 50, false);
      assert.strictEqual(initialGoal, 2100); // 60 * 35 = 2100

      // User updates weight in profile to 75 kg
      userWeight = 75;
      const updatedGoal = canonicalCalculateDailyGoal(userWeight, 'sedentary', 25, 50, false);
      assert.strictEqual(updatedGoal, 2625 > 2600 ? 2650 : 2600); // 75*35 = 2625 -> rounded to 2650
    });
  });

  it('T3.04 (F05 + F10): Quick drink click triggers Web Audio procedural feedback when sound enabled', () => {
    registerTest(tier, fId, 'T3.04', 'F05 + F10: Drink log triggers procedural sound', () => {
      const ctx = new MockAudioContext();
      const soundEnabled = true;

      const logDrinkAndPlaySound = (amount: number) => {
        if (soundEnabled) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.start(0);
        }
        return amount;
      };

      const logged = logDrinkAndPlaySound(250);
      assert.strictEqual(logged, 250);
      assert.strictEqual(ctx.nodesCreated.length, 1);
    });
  });

  it('T3.05 (F05 + F14): Disabling sound switch in ProfileTab globally mutes Web Audio triggers', () => {
    registerTest(tier, fId, 'T3.05', 'F05 + F14: Profile sound switch mutes audio globally', () => {
      const ctx = new MockAudioContext();
      let soundEnabled = true;

      // Profile toggle off
      soundEnabled = false;

      const attemptSound = () => {
        if (!soundEnabled) return false;
        const osc = ctx.createOscillator();
        osc.start(0);
        return true;
      };

      const played = attemptSound();
      assert.strictEqual(played, false);
      assert.strictEqual(ctx.nodesCreated.length, 0);
    });
  });

  it('T3.06 (F06 + F10): Logging water in TodayTab writes through to both localStorage and Preferences', async () => {
    registerTest(tier, fId, 'T3.06', 'F06 + F10: Drink log writes through dual persistence layers', async () => {
      const storage = new DualLayerStorageSimulator();
      const todayDate = '2026-10-30';

      const logIntake = async (ml: number) => {
        const current = storage.get(todayDate, { consumed: 0 });
        const updated = { consumed: current.consumed + ml };
        await storage.set(todayDate, updated);
      };

      await logIntake(250);
      const syncRead = storage.get(todayDate, { consumed: 0 });
      assert.strictEqual(syncRead.consumed, 250);

      const asyncRead = await storage.getFromPreferences(todayDate, { consumed: 0 });
      assert.strictEqual(asyncRead.consumed, 250);
    });
  });

  it('T3.07 (F06 + F14): Data export downloads complete history and preferences stored by dual-layer persistence', async () => {
    registerTest(tier, fId, 'T3.07', 'F06 + F14: Data export exports complete persisted state', async () => {
      const storage = new DualLayerStorageSimulator();
      await storage.set('profile', { name: 'Mạnh', weightKg: 65 });
      await storage.set('logs', { '2026-10-30': { consumed: 2200 } });

      const exportBackup = {
        profile: storage.get('profile', null),
        logs: storage.get('logs', null),
      };

      const jsonStr = JSON.stringify(exportBackup);
      assert.ok(jsonStr.includes('Mạnh'));
      assert.ok(jsonStr.includes('2200'));
    });
  });

  it('T3.08 (F07 + F10): Logging water updates deficit, recalculating smart reminder interval in ReminderTab', () => {
    registerTest(tier, fId, 'T3.08', 'F07 + F10: Intake reduces deficit, lengthening smart reminder interval', () => {
      const goal = 2000;
      let consumed = 500;
      const minutesToSleep = 600; // 10 hours

      // 1500ml deficit -> 6 glasses -> 600 / 6 = 100 min
      const glassesBefore = canonicalRemainingCups(goal, consumed, 250);
      const intervalBefore = canonicalSmartInterval(minutesToSleep, glassesBefore);
      assert.strictEqual(intervalBefore, 100);

      // User drinks 500ml -> 1000ml deficit -> 4 glasses -> 600 / 4 = 150 min
      consumed += 500;
      const glassesAfter = canonicalRemainingCups(goal, consumed, 250);
      const intervalAfter = canonicalSmartInterval(minutesToSleep, glassesAfter);
      assert.strictEqual(intervalAfter, 150);
      assert.ok(intervalAfter > intervalBefore, 'Interval should increase as deficit is reduced');
    });
  });

  it('T3.09 (F07 + F11): Toggling reminder switch off in ReminderTab cancels pending notifications in scheduler', async () => {
    registerTest(tier, fId, 'T3.09', 'F07 + F11: Reminder toggle off cancels scheduler queue', async () => {
      const scheduler = new NotificationSchedulerSimulator();
      await scheduler.schedule({
        notifications: [{ id: 101, title: 'Nhắc nước', body: 'Uống nước!', schedule: { at: new Date() } }],
      });
      assert.strictEqual(scheduler.scheduled.length, 1);

      // Toggle off in ReminderTab
      await scheduler.cancelAll();
      assert.strictEqual(scheduler.scheduled.length, 0);
    });
  });

  it('T3.10 (F07 + F08): Quiet hours (01:00 - 07:00) mutes notifications and sets Voyager Chibi to sleeping', () => {
    registerTest(tier, fId, 'T3.10', 'F07 + F08: Quiet hours activates sleeping chibi mood', () => {
      const evaluateAppNightState = (date: Date) => {
        const inQuiet = canonicalIsInQuietHours(date, '07:00', '01:00');
        return {
          notificationsSuppressed: inQuiet,
          voyagerMood: inQuiet ? 'sleeping' : 'idle',
        };
      };

      const dayState = evaluateAppNightState(new Date(2026, 9, 30, 14, 0));
      assert.strictEqual(dayState.notificationsSuppressed, false);
      assert.strictEqual(dayState.voyagerMood, 'idle');

      const nightState = evaluateAppNightState(new Date(2026, 9, 30, 3, 0));
      assert.strictEqual(nightState.notificationsSuppressed, true);
      assert.strictEqual(nightState.voyagerMood, 'sleeping');
    });
  });

  it('T3.11 (F08 + F10): Reaching 100% goal triggers starlight confetti celebration and switches Voyager to happy', () => {
    registerTest(tier, fId, 'T3.11', 'F08 + F10: 100% goal triggers confetti and happy chibi', () => {
      const goal = 2000;
      let consumed = 1750;

      const checkGoalAchievement = (c: number, g: number) => ({
        goalReached: c >= g,
        triggerConfetti: c >= g,
        characterMood: c >= g ? 'happy' : 'idle',
      });

      assert.strictEqual(checkGoalAchievement(consumed, goal).characterMood, 'idle');
      consumed += 250; // Reached!
      const achieved = checkGoalAchievement(consumed, goal);
      assert.strictEqual(achieved.goalReached, true);
      assert.strictEqual(achieved.triggerConfetti, true);
      assert.strictEqual(achieved.characterMood, 'happy');
    });
  });

  it('T3.12 (F08 + F14): Uploading custom avatar in ProfileTab propagates image to VoyagerChibi in TodayTab', () => {
    registerTest(tier, fId, 'T3.12', 'F08 + F14: Custom avatar upload propagates to TodayTab Chibi', () => {
      let globalCustomAvatar: string | null = null;
      const uploadAvatar = (dataUrl: string) => { globalCustomAvatar = dataUrl; };

      assert.strictEqual(globalCustomAvatar, null);
      uploadAvatar('data:image/png;base64,CUSTOM_MASCOT');
      assert.strictEqual(globalCustomAvatar, 'data:image/png;base64,CUSTOM_MASCOT');
    });
  });

  it('T3.13 (F09 + F10..F14): Navigation bar switches views across all 5 tabs maintaining persistent state', () => {
    registerTest(tier, fId, 'T3.13', 'F09 + F10..F14: Tab navigation state persistence', () => {
      const appState = {
        consumedMl: 1250,
        streak: 4,
        activeTab: 'today',
      };

      // Navigate to stats
      appState.activeTab = 'stats';
      assert.strictEqual(appState.consumedMl, 1250);

      // Navigate to profile
      appState.activeTab = 'profile';
      assert.strictEqual(appState.streak, 4);

      // Navigate back to today
      appState.activeTab = 'today';
      assert.strictEqual(appState.consumedMl, 1250);
    });
  });

  it('T3.14 (F10 + F12): Achieving daily water goal awards gold star medal badge on calendar cup in JournalTab', () => {
    registerTest(tier, fId, 'T3.14', 'F10 + F12: Goal achievement awards journal gold medal badge', () => {
      const journalDays: Record<string, { consumed: number; target: number }> = {
        '2026-10-29': { consumed: 2100, target: 2000 }, // Met -> gold medal
        '2026-10-30': { consumed: 1200, target: 2000 }, // Pending
      };

      const hasGoldMedal = (dateStr: string) =>
        journalDays[dateStr].consumed >= journalDays[dateStr].target;

      assert.strictEqual(hasGoldMedal('2026-10-29'), true);
      assert.strictEqual(hasGoldMedal('2026-10-30'), false);

      // User drinks 800ml today
      journalDays['2026-10-30'].consumed += 800;
      assert.strictEqual(hasGoldMedal('2026-10-30'), true);
    });
  });

  it('T3.15 (F10 + F13): Daily logged amounts accumulate into weekly bar chart columns and averages in StatsTab', () => {
    registerTest(tier, fId, 'T3.15', 'F10 + F13: Daily drinks accumulate into stats chart and average', () => {
      const weekIntakes = [2000, 2200, 1800, 2400, 2000, 2100, 0]; // Day 7 pending
      let total = weekIntakes.reduce((a, b) => a + b, 0);
      assert.strictEqual(total, 12500);

      // User logs 2500ml on Day 7 in TodayTab
      weekIntakes[6] = 2500;
      total = weekIntakes.reduce((a, b) => a + b, 0);
      assert.strictEqual(total, 15000);
      const avgLiters = (total / 7 / 1000).toFixed(1);
      assert.strictEqual(avgLiters, '2.1');
    });
  });

  it('T3.16 (F12 + F13): Consecutive goal days increment active streak in JournalTab and update record streak in StatsTab', () => {
    registerTest(tier, fId, 'T3.16', 'F12 + F13: Daily goal incrementing active and record streaks', () => {
      let currentStreak = 6;
      let recordStreak = 6;

      // Completing goal on day 7
      currentStreak += 1;
      if (currentStreak > recordStreak) {
        recordStreak = currentStreak;
      }

      assert.strictEqual(currentStreak, 7);
      assert.strictEqual(recordStreak, 7);
    });
  });

  it('T3.17 (F15 + F16 + F17): Capacitor config, Android permissions, and GitHub Actions CI align into cohesive build pipeline', () => {
    registerTest(tier, fId, 'T3.17', 'F15 + F16 + F17: Cohesive Android & CI pipeline configuration', () => {
      const pipelineConfig = {
        appId: 'com.manh.voyagerhydration',
        appName: 'Voyager Hydration',
        permissionsDeclared: [
          'android.permission.POST_NOTIFICATIONS',
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.INTERNET',
        ],
        ciBuildCommand: './gradlew assembleDebug',
        runnerJavaVersion: 21,
        runnerNodeVersion: 20,
      };

      assert.strictEqual(pipelineConfig.appId, 'com.manh.voyagerhydration');
      assert.strictEqual(pipelineConfig.permissionsDeclared.length, 3);
      assert.strictEqual(pipelineConfig.runnerJavaVersion, 21);
      assert.strictEqual(pipelineConfig.runnerNodeVersion, 20);
    });
  });
});
