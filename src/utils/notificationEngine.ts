/**
 * Voyager's Cosmic Hydration - Local Notification Scheduler Engine
 * File: src/utils/notificationEngine.ts
 *
 * Local notifications scheduler integrated with @capacitor/local-notifications.
 * Features:
 * - 3 Reminder Modes: Nhẹ nhàng (Gentle), Thông minh (Smart), Đều đặn (Regular)
 * - Dynamic interval calculation based on remaining glasses and time to sleep
 * - Strict Quiet Hours enforcement (01:00 - 07:00), deferring alerts to wakeTime (07:00 AM)
 * - Thematic Reverse: 1999 Voyager celestial messages
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// ============================================================================
// Constants & Configuration
// ============================================================================

export const NOTIFICATION_CHANNEL_ID = 'voyager_hydration_reminders';
export const NOTIFICATION_CHANNEL_NAME = 'Nhắc nhở uống nước Voyager';
export const NOTIFICATION_CHANNEL_DESCRIPTION = 'Kênh thông báo nhắc nhở uống nước vũ trụ Reverse: 1999';

export const ALARM_NOTIFICATION_ID = 9000;

export const ANDROID_SOUND_CHANNELS: Record<string, { channelId: string; name: string; soundFile: string }> = {
  voyager_violin: {
    channelId: 'voyager_alarm_voyager_violin',
    name: 'Báo thức Voyager - Violin Tinh cầu',
    soundFile: 'voyager_violin.mp3',
  },
  voyager_greeting: {
    channelId: 'voyager_alarm_voyager_greeting',
    name: 'Báo thức Voyager - Lời chào Tinh cầu',
    soundFile: 'voyager_greeting.mp3',
  },
  voyager_battle: {
    channelId: 'voyager_alarm_voyager_battle',
    name: 'Báo thức Voyager - Khúc dạo đầu Vũ trụ',
    soundFile: 'voyager_battle.mp3',
  },
  bubble: {
    channelId: 'voyager_alarm_bubble',
    name: 'Báo thức Voyager - Chuông pha lê',
    soundFile: 'voyager_violin.mp3',
  },
};

export function resolveAndroidNotificationSound(soundId?: string): {
  channelId: string;
  soundFile: string;
} {
  if (soundId && ANDROID_SOUND_CHANNELS[soundId]) {
    return {
      channelId: ANDROID_SOUND_CHANNELS[soundId].channelId,
      soundFile: ANDROID_SOUND_CHANNELS[soundId].soundFile,
    };
  }
  return {
    channelId: ANDROID_SOUND_CHANNELS.voyager_violin.channelId,
    soundFile: ANDROID_SOUND_CHANNELS.voyager_violin.soundFile,
  };
}

export const REMINDER_MODES = {
  GENTLE: 'gentle',
  SMART: 'smart',
  REGULAR: 'regular',
} as const;

export type ReminderMode = typeof REMINDER_MODES[keyof typeof REMINDER_MODES];

export const FIXED_INTERVALS = {
  GENTLE: 180, // 3 hours (180 minutes)
  REGULAR: 90,  // 1.5 hours (90 minutes)
} as const;

export const SMART_INTERVAL_BOUNDS = {
  MIN_MINUTES: 45,
  MAX_MINUTES: 150,
  DEFAULT_MINUTES: 110,
  GOAL_MET_MINUTES: 180,
} as const;

// ============================================================================
// Celestial Phrasing Matrix (Reverse: 1999 Voyager Lore)
// ============================================================================

export interface ThematicNotificationTemplate {
  title: string;
  body: string;
  chibiMood: 'idle' | 'happy' | 'sleeping' | 'gentle' | 'strict';
}

export const VOYAGER_NOTIFICATIONS: ThematicNotificationTemplate[] = [
  {
    title: 'Voyager nhắc bạn ✨',
    body: 'Một nốt nhạc ngân hà vừa ngân lên... Hãy uống một ngụm nước để tinh cầu luôn tràn đầy sức sống nhé!',
    chibiMood: 'gentle',
  },
  {
    title: 'Vũ trụ khát nước rồi! 🌌',
    body: 'Vũ trụ khát nước rồi! Voyager đã chuẩn bị sẵn một ly nước mát cho bạn rồi đây!',
    chibiMood: 'idle',
  },
  {
    title: 'Tiếng đàn thúc giục 🎻',
    body: 'Tiếng đàn thúc giục 🎻: Chuyến du hành hôm nay sắp kết thúc mà mục tiêu nước vẫn chưa xong!',
    chibiMood: 'strict',
  },
  {
    title: 'Bình minh tinh cầu ☀️',
    body: 'Bình minh ngân hà thức giấc! Voyager chúc thuyền trưởng một ngày tràn đầy năng lượng cùng ly nước đầu tiên!',
    chibiMood: 'happy',
  },
  {
    title: 'Bản giao hưởng sao đêm 🌠',
    body: 'Mỗi giọt nước là một vì sao lấp lánh... Hãy nạp năng lượng cùng Voyager nào!',
    chibiMood: 'gentle',
  },
];

export interface ScheduleRemindersParams {
  enabled: boolean;
  mode: ReminderMode;
  targetMl: number;
  consumedMl: number;
  wakeTime?: string;     // Default: "07:00"
  sleepTime?: string;    // Default: "01:00"
  cupSize?: number;      // Default: 250
}

// ============================================================================
// Pure Calculation Algorithms
// ============================================================================

/**
 * Calculates adaptive smart interval based on awake minutes remaining and cup deficit.
 * Clamps dynamically between [45m, 150m].
 * Returns 180m when goal is reached (deficit <= 0).
 */
export function calculateSmartInterval(minutesToSleep: number, remainingGlasses: number): number {
  if (remainingGlasses <= 0) {
    return SMART_INTERVAL_BOUNDS.GOAL_MET_MINUTES; // 180 min
  }
  const raw = minutesToSleep / remainingGlasses;
  return Math.max(
    SMART_INTERVAL_BOUNDS.MIN_MINUTES,
    Math.min(SMART_INTERVAL_BOUNDS.MAX_MINUTES, Math.round(raw))
  );
}

/**
 * Calculates remaining minutes until bedtime.
 * Handles cross-midnight schedules (e.g. wakeTime 07:00, bedtime 01:00).
 */
export function calculateMinutesToBedtime(now: Date, bedtime = '01:00', wakeTime = '07:00'): number {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [sleepH, sleepM] = bedtime.split(':').map(Number);
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);

  const sleepMinutes = sleepH * 60 + sleepM;
  const wakeMinutes = wakeH * 60 + wakeM;

  if (sleepMinutes < wakeMinutes) {
    // Bedtime is past midnight (e.g. 01:00) while wakeTime is 07:00
    if (currentMinutes >= wakeMinutes) {
      // Daytime: 07:00 to 23:59
      return (24 * 60 - currentMinutes) + sleepMinutes;
    } else if (currentMinutes < sleepMinutes) {
      // Midnight: 00:00 to 01:00
      return sleepMinutes - currentMinutes;
    } else {
      // Inside quiet hours: 01:00 to 07:00
      return 0;
    }
  } else {
    // Standard same-day bedtime (e.g. 23:00)
    return Math.max(0, sleepMinutes - currentMinutes);
  }
}

/**
 * Evaluates whether a timestamp falls strictly within quiet hours.
 * Cross-midnight example: sleepTime = "01:00", wakeTime = "07:00".
 * 01:00 is quiet, 06:59 is quiet, 07:00 is NOT quiet, 00:30 is NOT quiet.
 */
export function isInQuietHours(date: Date, wakeTime = '07:00', sleepTime = '01:00'): boolean {
  const currentTotal = date.getHours() * 60 + date.getMinutes();

  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  const [sleepH, sleepM] = sleepTime.split(':').map(Number);
  const wakeTotal = wakeH * 60 + wakeM;     // 7 * 60 = 420
  const sleepTotal = sleepH * 60 + sleepM;   // 1 * 60 = 60

  if (sleepTotal < wakeTotal) {
    // Cross-midnight window: [sleepTotal, wakeTotal), e.g. [60, 420)
    return currentTotal >= sleepTotal && currentTotal < wakeTotal;
  } else {
    // Same-day evening window: e.g. [23:00, 24:00) U [00:00, 07:00)
    return currentTotal >= sleepTotal || currentTotal < wakeTotal;
  }
}

/**
 * If scheduledDate falls in quiet hours, defers notification to wakeTime (07:00 AM).
 */
export function adjustForQuietHours(scheduledDate: Date, wakeTime = '07:00', sleepTime = '01:00'): Date {
  if (!isInQuietHours(scheduledDate, wakeTime, sleepTime)) {
    return new Date(scheduledDate);
  }
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  const adjusted = new Date(scheduledDate);
  adjusted.setHours(wakeH, wakeM, 0, 0);

  // If wakeTime has already passed today, advance to wakeTime tomorrow
  if (adjusted.getTime() <= scheduledDate.getTime()) {
    adjusted.setDate(adjusted.getDate() + 1);
  }
  return adjusted;
}

// ============================================================================
// Capacitor LocalNotifications Integration
// ============================================================================

/**
 * Initializes Android notification channel (required for Android 8.0+ / API 26).
 */
export async function initializeNotificationEngine(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // 1. Default hydration reminder channel with Voyager Violin ringtone
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: NOTIFICATION_CHANNEL_NAME,
      description: NOTIFICATION_CHANNEL_DESCRIPTION,
      importance: 4,      // High importance (heads-up banner)
      visibility: 1,      // Public on lockscreen
      vibration: true,
      sound: 'voyager_violin.mp3',
    });

    // 2. Dedicated Alarm Clock channels mapped to each Voyager audio asset in res/raw
    for (const cfg of Object.values(ANDROID_SOUND_CHANNELS)) {
      await LocalNotifications.createChannel({
        id: cfg.channelId,
        name: cfg.name,
        description: `${cfg.name} (Reverse: 1999)`,
        importance: 5,    // Max importance for alarm alerts
        visibility: 1,
        vibration: true,
        sound: cfg.soundFile,
      });
    }
  } catch (err) {
    console.warn('[NotificationEngine] Channel creation error:', err);
  }
}

/**
 * Checks notification permission status.
 */
export async function checkPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return true;
  }
  try {
    const status = await LocalNotifications.checkPermissions();
    return status.display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Requests notification permission (Android 13+ POST_NOTIFICATIONS).
 */
export async function requestPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
    return true;
  }
  try {
    const status = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Cancels all currently scheduled hydration reminders (excluding standalone alarm ID 9000).
 */
export async function cancelAllReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const pending = await LocalNotifications.getPending();
    const reminderIds = pending.notifications
      .filter((n) => n.id !== ALARM_NOTIFICATION_ID)
      .map((n) => ({ id: n.id }));
    if (reminderIds.length > 0) {
      await LocalNotifications.cancel({
        notifications: reminderIds,
      });
    }
  } catch (err) {
    console.warn('[NotificationEngine] cancelAllReminders failed:', err);
  }
}

/**
 * Cancels the standalone native Android alarm notification (ID 9000).
 */
export async function cancelNativeAlarm(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: ALARM_NOTIFICATION_ID }],
    });
  } catch (err) {
    console.warn('[NotificationEngine] cancelNativeAlarm failed:', err);
  }
}

/**
 * Schedules a standalone native Android alarm notification with the selected Voyager sound.
 */
export async function scheduleNativeAlarm(config: {
  isEnabled: boolean;
  time: string;
  selectedSound: string;
  snoozeUntil?: number | null;
}): Promise<Date | null> {
  if (!config.isEnabled) {
    await cancelNativeAlarm();
    return null;
  }

  const now = new Date();
  let targetDate: Date;

  if (config.snoozeUntil && config.snoozeUntil > now.getTime()) {
    targetDate = new Date(config.snoozeUntil);
  } else {
    const [hStr, mStr] = (config.time || '07:30').split(':');
    const alarmH = parseInt(hStr, 10) || 7;
    const alarmM = parseInt(mStr, 10) || 30;
    targetDate = new Date(now);
    targetDate.setHours(alarmH, alarmM, 0, 0);
    if (targetDate.getTime() <= now.getTime()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
  }

  if (Capacitor.isNativePlatform()) {
    try {
      let granted = await checkPermissions();
      if (!granted) {
        granted = await requestPermissions();
      }
      if (!granted) {
        return targetDate;
      }

      await initializeNotificationEngine();
      await cancelNativeAlarm();

      const { channelId, soundFile } = resolveAndroidNotificationSound(config.selectedSound);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: ALARM_NOTIFICATION_ID,
            title: '⏰ Báo thức Voyager!',
            body: `Đã đến giờ hẹn (${config.time}) — Cùng Voyager khởi đầu ngày mới tràn đầy năng lượng! ✨`,
            schedule: { at: targetDate, allowWhileIdle: true },
            channelId,
            sound: soundFile,
            extra: {
              isAlarm: true,
              alarmTime: config.time,
              selectedSound: config.selectedSound,
            },
          },
        ],
      });
    } catch (err) {
      console.warn('[NotificationEngine] scheduleNativeAlarm failed:', err);
    }
  }

  return targetDate;
}

/**
 * Schedules rolling reminders pipeline (up to 5 rolling slots).
 * Adapts to mode, deficit, awake window, and strict quiet hours.
 * Returns the timestamp of the very next reminder.
 */
export async function scheduleNextReminders(params: ScheduleRemindersParams): Promise<Date | null> {
  const {
    enabled,
    mode = 'smart',
    targetMl,
    consumedMl,
    wakeTime = '07:00',
    sleepTime = '01:00',
    cupSize = 250,
  } = params;

  // If disabled, cancel all pending notifications and return null
  if (!enabled) {
    await cancelAllReminders();
    return null;
  }

  // Cancel existing queue before rescheduling
  await cancelAllReminders();

  const now = new Date();
  const deficit = Math.max(0, targetMl - consumedMl);
  const remainingGlasses = deficit === 0 ? 0 : Math.ceil(deficit / cupSize);

  // Determine interval in minutes
  let intervalMinutes: number;
  if (mode === 'gentle') {
    intervalMinutes = FIXED_INTERVALS.GENTLE; // 180 min
  } else if (mode === 'regular') {
    intervalMinutes = FIXED_INTERVALS.REGULAR; // 90 min
  } else {
    // Mode: 'smart'
    const minutesToSleep = calculateMinutesToBedtime(now, sleepTime, wakeTime);
    intervalMinutes = calculateSmartInterval(minutesToSleep, remainingGlasses);
  }

  // Compute 5 rolling reminder slots
  const notificationsToSchedule: Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date; allowWhileIdle?: boolean };
    channelId: string;
    sound?: string;
    extra: Record<string, any>;
  }> = [];

  let nextScheduledTime: Date | null = null;
  let cursorTime = new Date(now.getTime() + intervalMinutes * 60 * 1000);

  for (let slot = 1; slot <= 5; slot++) {
    let slotTime = new Date(cursorTime);
    if (isInQuietHours(slotTime, wakeTime, sleepTime)) {
      slotTime = adjustForQuietHours(slotTime, wakeTime, sleepTime);
    }

    if (slot === 1) {
      nextScheduledTime = new Date(slotTime);
    }

    const templateIndex = (slot - 1) % VOYAGER_NOTIFICATIONS.length;
    const template = VOYAGER_NOTIFICATIONS[templateIndex];

    notificationsToSchedule.push({
      id: 2000 + slot,
      title: template.title,
      body: template.body,
      schedule: { at: slotTime, allowWhileIdle: true },
      channelId: NOTIFICATION_CHANNEL_ID,
      sound: 'voyager_violin.mp3',
      extra: {
        slotIndex: slot,
        mode,
        deficitMl: deficit,
      },
    });

    // Advance cursor for next slot
    cursorTime = new Date(slotTime.getTime() + intervalMinutes * 60 * 1000);
  }

  if (Capacitor.isNativePlatform() && notificationsToSchedule.length > 0) {
    try {
      let granted = await checkPermissions();
      if (!granted) {
        granted = await requestPermissions();
      }
      if (granted) {
        await initializeNotificationEngine();
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule,
        });
      }
    } catch (err) {
      console.warn('[NotificationEngine] LocalNotifications.schedule failed:', err);
    }
  }

  return nextScheduledTime;
}

/**
 * Formats a human-readable countdown string for the next reminder (e.g. "Sau 2 giờ 53 phút").
 */
export function formatNextReminderCountdown(targetDate: Date | null): string {
  if (!targetDate) return 'Chưa lên lịch';

  const diffMs = targetDate.getTime() - Date.now();
  if (diffMs <= 0) return 'Đến giờ uống nước!';

  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `Sau ${minutes} phút`;
  }
  return `Sau ${hours} giờ ${minutes} phút`;
}
