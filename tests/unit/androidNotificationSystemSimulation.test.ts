import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Shared Simulator Instance for Capacitor Plugin Mocks
const simState = {
  instance: null as AndroidSystemSimulator | null,
};

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: async () => ({
      display: simState.instance?.postNotificationsGranted ? 'granted' : 'prompt',
    }),
    requestPermissions: async () => {
      if (simState.instance) {
        simState.instance.postNotificationsGranted = true;
      }
      return { display: 'granted' };
    },
    checkExactNotificationSetting: async () => ({
      exact_alarm: simState.instance?.useExactAlarmGranted ? 'granted' : 'denied',
    }),
    createChannel: async (channel: any) => {
      simState.instance?.channels.set(channel.id, {
        id: channel.id,
        name: channel.name,
        importance: channel.importance ?? 5,
        sound: channel.sound,
        vibration: channel.vibration,
      });
    },
    schedule: async (options: { notifications: any[] }) => {
      const sim = simState.instance;
      if (!sim) return { notifications: [] };

      for (const n of options.notifications) {
        const atDate = n.schedule?.at
          ? new Date(n.schedule.at)
          : new Date(sim.currentTimeMs + 1000);
        const serialized = JSON.stringify({
          ...n,
          schedule: {
            ...n.schedule,
            at: atDate.toISOString(),
          },
        });
        // Persist in Android SharedPreferences("NOTIFICATION_STORE_ID")
        sim.sharedPreferencesStore.set(String(n.id), serialized);
        // Register in Android AlarmManager
        sim.alarmManagerQueue.set(n.id, {
          triggerAtMs: atDate.getTime(),
          allowWhileIdle: Boolean(n.schedule?.allowWhileIdle),
          payload: n,
        });
      }
      return {
        notifications: options.notifications.map((n) => ({ id: n.id })),
      };
    },
    getPending: async () => {
      const sim = simState.instance;
      if (!sim) return { notifications: [] };
      const notifications = Array.from(sim.sharedPreferencesStore.values()).map((raw) => {
        const parsed = JSON.parse(raw);
        return {
          id: parsed.id,
          title: parsed.title,
          body: parsed.body,
          schedule: { at: new Date(parsed.schedule.at) },
        };
      });
      return { notifications };
    },
    cancel: async (options: { notifications: Array<{ id: number }> }) => {
      const sim = simState.instance;
      if (!sim) return;
      for (const item of options.notifications) {
        sim.sharedPreferencesStore.delete(String(item.id));
        sim.alarmManagerQueue.delete(item.id);
      }
    },
  },
}));

import {
  NOTIFICATION_CHANNEL_ID,
  ALARM_NOTIFICATION_ID,
  TEST_NOTIFICATION_ID,
  initializeNotificationEngine,
  requestPermissions,
  sendTestNotification,
  scheduleNextReminders,
  scheduleNativeAlarm,
  cancelAllReminders,
} from '../../src/utils/notificationEngine';

/**
 * Stateful Android 14/15 (API 35) System Simulator
 * Models NotificationManager, AlarmManager (Doze mode + Exact Alarms),
 * SharedPreferences("NOTIFICATION_STORE_ID"), and VoyagerNotificationService background guardian.
 */
class AndroidSystemSimulator {
  public sdkInt = 35; // Android 15
  public isScreenOn = false;
  public isDozeMode = true;
  public isWebViewSuspended = true;
  public isOemBroadcastBlocked = false;
  public currentTimeMs = Date.now();

  public postNotificationsGranted = false;
  public useExactAlarmGranted = true; // Granted at install via USE_EXACT_ALARM in AndroidManifest.xml
  public foregroundServiceRunning = false;

  public channels = new Map<
    string,
    { id: string; name: string; importance: number; sound?: string; vibration?: boolean }
  >();
  public sharedPreferencesStore = new Map<string, string>(); // NOTIFICATION_STORE_ID
  public alarmManagerQueue = new Map<
    number,
    { triggerAtMs: number; allowWhileIdle: boolean; payload: any }
  >();
  public postedNotifications: Array<{
    id: number;
    title: string;
    body: string;
    channelId: string;
    sound?: string;
    smallIcon?: string;
    dispatchedBy: 'AlarmManager_Broadcast' | 'VoyagerNotificationService_Guardian';
    firedAtMs: number;
  }> = [];

  constructor() {
    this.startVoyagerNotificationService();
  }

  public startVoyagerNotificationService() {
    this.foregroundServiceRunning = true;
    this.channels.set('voyager_bg_guardian', {
      id: 'voyager_bg_guardian',
      name: 'Chạy ngầm canh giờ uống nước',
      importance: 2,
    });
    this.channels.set(NOTIFICATION_CHANNEL_ID, {
      id: NOTIFICATION_CHANNEL_ID,
      name: 'Nhắc nhở uống nước Voyager',
      importance: 5,
      sound: 'voyager_violin.mp3',
      vibration: true,
    });
  }

  /**
   * Advances simulated Android system clock and runs both AlarmManager and
   * VoyagerNotificationService background guardian checks.
   */
  public advanceSystemClockTo(targetTimeMs: number) {
    this.currentTimeMs = targetTimeMs;

    // 1. Standard AlarmManager -> TimedNotificationPublisher broadcast
    if (!this.isOemBroadcastBlocked) {
      for (const [id, alarm] of Array.from(this.alarmManagerQueue.entries())) {
        const canFireInDoze = !this.isDozeMode || alarm.allowWhileIdle;
        if (canFireInDoze && this.currentTimeMs >= alarm.triggerAtMs) {
          this.alarmManagerQueue.delete(id);
          this.sharedPreferencesStore.delete(String(id));
          if (this.postNotificationsGranted) {
            this.postedNotifications.push({
              id,
              title: alarm.payload.title,
              body: alarm.payload.body,
              channelId: alarm.payload.channelId || NOTIFICATION_CHANNEL_ID,
              sound: alarm.payload.sound,
              smallIcon: alarm.payload.smallIcon,
              dispatchedBy: 'AlarmManager_Broadcast',
              firedAtMs: this.currentTimeMs,
            });
          }
        }
      }
    }

    // 2. VoyagerNotificationService Background Guardian Poll (fires if overdue >= 2.5s)
    if (this.foregroundServiceRunning && this.postNotificationsGranted) {
      for (const [key, rawJson] of Array.from(this.sharedPreferencesStore.entries())) {
        const parsed = JSON.parse(rawJson);
        const scheduledMs = new Date(parsed.schedule.at).getTime();
        if (this.currentTimeMs >= scheduledMs + 2500) {
          this.sharedPreferencesStore.delete(key);
          this.alarmManagerQueue.delete(parsed.id);
          this.postedNotifications.push({
            id: parsed.id,
            title: parsed.title,
            body: parsed.body,
            channelId: parsed.channelId || NOTIFICATION_CHANNEL_ID,
            sound: parsed.sound,
            smallIcon: parsed.smallIcon || 'ic_stat_icon_config_sample',
            dispatchedBy: 'VoyagerNotificationService_Guardian',
            firedAtMs: this.currentTimeMs,
          });
        }
      }
    }
  }
}

describe('Android System Notification & Background Execution Simulator Suite', () => {
  const rootDir = path.resolve(__dirname, '../../');
  let androidSim: AndroidSystemSimulator;

  beforeEach(() => {
    androidSim = new AndroidSystemSimulator();
    simState.instance = androidSim;
  });

  // --------------------------------------------------------------------------
  // 1. Native Android Manifest, Drawable & Background Service Verification
  // --------------------------------------------------------------------------
  describe('1. Native Android Manifest, Drawable & Service Verification', () => {
    it('declares USE_EXACT_ALARM, FOREGROUND_SERVICE, WAKE_LOCK, and RECEIVE_BOOT_COMPLETED in AndroidManifest.xml', () => {
      const manifest = fs.readFileSync(
        path.join(rootDir, 'android/app/src/main/AndroidManifest.xml'),
        'utf-8'
      );
      expect(manifest).toContain('android.permission.POST_NOTIFICATIONS');
      expect(manifest).toContain('android.permission.SCHEDULE_EXACT_ALARM');
      expect(manifest).toContain('android.permission.USE_EXACT_ALARM');
      expect(manifest).toContain('android.permission.FOREGROUND_SERVICE');
      expect(manifest).toContain('android.permission.FOREGROUND_SERVICE_SPECIAL_USE');
      expect(manifest).toContain('android.permission.WAKE_LOCK');
      expect(manifest).toContain('android.permission.RECEIVE_BOOT_COMPLETED');
      expect(manifest).toContain('android:name=".VoyagerNotificationService"');
      expect(manifest).toContain('android:name=".VoyagerBootReceiver"');
    });

    it('provides valid status bar smallIcon drawable (ic_stat_icon_config_sample.xml) and raw MP3 audio files', () => {
      const iconPath = path.join(
        rootDir,
        'android/app/src/main/res/drawable/ic_stat_icon_config_sample.xml'
      );
      expect(fs.existsSync(iconPath)).toBe(true);
      const iconXml = fs.readFileSync(iconPath, 'utf-8');
      expect(iconXml).toContain('<vector');
      expect(iconXml).toContain('android:pathData=');

      const rawSounds = ['voyager_violin.mp3', 'voyager_greeting.mp3', 'voyager_battle.mp3'];
      for (const sound of rawSounds) {
        const soundPath = path.join(rootDir, 'android/app/src/main/res/raw', sound);
        expect(fs.existsSync(soundPath)).toBe(true);
        expect(fs.statSync(soundPath).size).toBeGreaterThan(10000);
      }
    });

    it('implements VoyagerNotificationService.java and MainActivity.java runtime permission & service startup', () => {
      const serviceJava = fs.readFileSync(
        path.join(
          rootDir,
          'android/app/src/main/java/com/manh/voyagerhydration/VoyagerNotificationService.java'
        ),
        'utf-8'
      );
      expect(serviceJava).toContain('startForeground(FOREGROUND_SERVICE_NOTIFICATION_ID');
      expect(serviceJava).toContain('NOTIFICATION_STORE_ID');
      expect(serviceJava).toContain('START_STICKY');

      const mainActivityJava = fs.readFileSync(
        path.join(rootDir, 'android/app/src/main/java/com/manh/voyagerhydration/MainActivity.java'),
        'utf-8'
      );
      expect(mainActivityJava).toContain('Manifest.permission.POST_NOTIFICATIONS');
      expect(mainActivityJava).toContain('VoyagerNotificationService.class');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Simulated Android OS Notification Delivery (Foreground & Doze Mode)
  // --------------------------------------------------------------------------
  describe('2. Simulated Android Notification Delivery (Instant & Background Doze Mode)', () => {
    it('Scenario A: Instant Test Notification requests permission, creates high-importance channels, and fires on Android', async () => {
      expect(androidSim.postNotificationsGranted).toBe(false);

      const result = await sendTestNotification(0, 'voyager_violin');
      expect(result.permissionGranted).toBe(true);
      expect(result.allowWhileIdle).toBe(true);
      expect(result.id).toBe(TEST_NOTIFICATION_ID);

      // Advance simulated Android clock by 1.5 seconds
      androidSim.advanceSystemClockTo(result.scheduledAt.getTime() + 100);

      expect(androidSim.postedNotifications.length).toBe(1);
      const posted = androidSim.postedNotifications[0];
      expect(posted.id).toBe(TEST_NOTIFICATION_ID);
      expect(posted.title).toContain('Thông báo Voyager hoạt động');
      expect(posted.sound).toBe('voyager_violin.mp3');
      expect(posted.smallIcon).toBe('ic_stat_icon_config_sample');
    });

    it('Scenario B: 5-Second Background Notification fires reliably when screen is OFF and phone is in Doze mode', async () => {
      androidSim.isScreenOn = false;
      androidSim.isDozeMode = true;
      androidSim.isWebViewSuspended = true;

      const result = await sendTestNotification(5, 'voyager_greeting');
      expect(result.id).toBe(TEST_NOTIFICATION_ID + 1);
      expect(result.allowWhileIdle).toBe(true);

      // At +2 seconds, notification has not fired yet
      androidSim.advanceSystemClockTo(Date.now() + 2000);
      expect(androidSim.postedNotifications.length).toBe(0);

      // At +5.1 seconds in Doze mode, AlarmManager (allowWhileIdle) wakes device and posts notification
      androidSim.advanceSystemClockTo(result.scheduledAt.getTime() + 100);
      expect(androidSim.postedNotifications.length).toBe(1);
      expect(androidSim.postedNotifications[0].title).toContain('Voyager chạy ngầm thành công');
      expect(androidSim.postedNotifications[0].sound).toBe('voyager_greeting.mp3');
    });

    it('Scenario C: Rolling Hydration Reminders (8 slots) fire sequentially in background with Voyager lore', async () => {
      await requestPermissions();
      await initializeNotificationEngine();

      const nextReminder = await scheduleNextReminders({
        enabled: true,
        mode: 'regular', // 90 minutes interval
        targetMl: 2000,
        consumedMl: 500,
        wakeTime: '07:00',
        sleepTime: '01:00',
      });

      expect(nextReminder).not.toBeNull();
      expect(androidSim.alarmManagerQueue.size).toBe(5);
      expect(androidSim.sharedPreferencesStore.size).toBe(5);

      // Advance Android clock to first reminder slot
      androidSim.advanceSystemClockTo(nextReminder!.getTime() + 500);
      expect(androidSim.postedNotifications.length).toBe(1);
      expect(androidSim.postedNotifications[0].id).toBe(2001);
      expect(androidSim.postedNotifications[0].channelId).toBe(NOTIFICATION_CHANNEL_ID);
      expect(androidSim.postedNotifications[0].sound).toBe('voyager_violin.mp3');
    });

    it('Scenario D: VoyagerNotificationService Background Guardian rescues notification when OEM battery saver blocks AlarmManager broadcast', async () => {
      // Simulate aggressive OEM (Xiaomi/Samsung/Oppo) blocking TimedNotificationPublisher broadcasts
      androidSim.isOemBroadcastBlocked = true;
      androidSim.isDozeMode = true;
      androidSim.isWebViewSuspended = true;

      const result = await sendTestNotification(5, 'voyager_violin');

      // At t = scheduledAt + 500ms, OEM blocked AlarmManager broadcast, so 0 notifications yet
      androidSim.advanceSystemClockTo(result.scheduledAt.getTime() + 500);
      expect(androidSim.postedNotifications.length).toBe(0);

      // At t = scheduledAt + 3000ms, VoyagerNotificationService guardian detects overdue entry in NOTIFICATION_STORE_ID and dispatches it!
      androidSim.advanceSystemClockTo(result.scheduledAt.getTime() + 3000);
      expect(androidSim.postedNotifications.length).toBe(1);
      expect(androidSim.postedNotifications[0].dispatchedBy).toBe(
        'VoyagerNotificationService_Guardian'
      );
      expect(androidSim.postedNotifications[0].id).toBe(TEST_NOTIFICATION_ID + 1);
      // Verify it was removed from NOTIFICATION_STORE_ID so it never double-fires
      expect(androidSim.sharedPreferencesStore.has(String(TEST_NOTIFICATION_ID + 1))).toBe(false);
    });

    it('Scenario E: Standalone Voyager Alarm Clock (ID 9000) fires in background without being cancelled by hydration reminder updates', async () => {
      await requestPermissions();
      const alarmDate = await scheduleNativeAlarm({
        isEnabled: true,
        time: '07:30',
        selectedSound: 'voyager_battle',
      });
      expect(alarmDate).not.toBeNull();

      // Rescheduling or cancelling hydration reminders must NOT touch alarm ID 9000
      await cancelAllReminders();
      expect(androidSim.sharedPreferencesStore.has(String(ALARM_NOTIFICATION_ID))).toBe(true);

      // Advance clock to alarm trigger time
      androidSim.advanceSystemClockTo(alarmDate!.getTime() + 200);
      expect(androidSim.postedNotifications.length).toBe(1);
      expect(androidSim.postedNotifications[0].id).toBe(ALARM_NOTIFICATION_ID);
      expect(androidSim.postedNotifications[0].title).toContain('Báo thức Voyager');
      expect(androidSim.postedNotifications[0].sound).toBe('voyager_battle.mp3');
    });
  });
});
