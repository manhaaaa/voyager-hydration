// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

const mockLocalNotifications = vi.hoisted(() => ({
  createChannel: vi.fn().mockResolvedValue(undefined),
  checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
  requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
  getPending: vi.fn().mockResolvedValue({ notifications: [] }),
  cancel: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue({ notifications: [] }),
  addListener: vi.fn().mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: mockLocalNotifications,
}));

import { Capacitor } from '@capacitor/core';
import {
  NOTIFICATION_CHANNEL_ID,
  ALARM_NOTIFICATION_ID,
  ANDROID_SOUND_CHANNELS,
  initializeNotificationEngine,
  scheduleNativeAlarm,
  scheduleNextReminders,
  resolveAndroidNotificationSound,
} from '../../src/utils/notificationEngine';
import {
  _setAudioConstructorForTesting,
  isAlarmPlaying,
  stopAlarmPlayback,
  setAudioMuted,
} from '../../src/utils/audioEngine';
import App from '../../src/App';

class MockAudioElement {
  src: string;
  volume: number = 1.0;
  loop: boolean = false;
  currentTime: number = 0;
  paused: boolean = true;
  onended: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;

  static instances: MockAudioElement[] = [];

  constructor(src: string = '') {
    this.src = src;
    MockAudioElement.instances.push(this);
  }

  play = vi.fn().mockImplementation(async () => {
    this.paused = false;
    return Promise.resolve();
  });

  pause = vi.fn().mockImplementation(() => {
    this.paused = true;
  });

  load = vi.fn();
}

describe('Android Notification Permission & App Ringtone Playback Tests', () => {
  beforeEach(() => {
    MockAudioElement.instances = [];
    _setAudioConstructorForTesting(MockAudioElement as unknown as typeof Audio);
    setAudioMuted(false);
    stopAlarmPlayback();
    vi.clearAllMocks();
    mockLocalNotifications.createChannel.mockResolvedValue(undefined);
    mockLocalNotifications.checkPermissions.mockResolvedValue({ display: 'granted' });
    mockLocalNotifications.requestPermissions.mockResolvedValue({ display: 'granted' });
    mockLocalNotifications.getPending.mockResolvedValue({ notifications: [] });
    mockLocalNotifications.cancel.mockResolvedValue(undefined);
    mockLocalNotifications.schedule.mockResolvedValue({ notifications: [] });
    mockLocalNotifications.addListener.mockResolvedValue({
      remove: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    stopAlarmPlayback();
    _setAudioConstructorForTesting(null);
    vi.restoreAllMocks();
  });

  it('1. verifies Voyager audio files exist in android/app/src/main/res/raw for native Android NotificationManager', () => {
    const rawDir = path.resolve(process.cwd(), 'android/app/src/main/res/raw');
    expect(fs.existsSync(rawDir)).toBe(true);

    const requiredFiles = ['voyager_violin.mp3', 'voyager_greeting.mp3', 'voyager_battle.mp3'];
    for (const file of requiredFiles) {
      const fullPath = path.join(rawDir, file);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(10000);
    }
  });

  it('2. creates Android notification channels with custom Voyager ringtone files when running on native Android', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    await initializeNotificationEngine();

    // 1 default hydration channel + 4 alarm channels = 5 channels
    expect(mockLocalNotifications.createChannel).toHaveBeenCalledTimes(5);

    // Check hydration reminder channel has sound: 'voyager_violin.mp3'
    expect(mockLocalNotifications.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        id: NOTIFICATION_CHANNEL_ID,
        importance: 4,
        sound: 'voyager_violin.mp3',
      })
    );

    // Check alarm channels have importance: 5 and custom soundFile
    expect(mockLocalNotifications.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ANDROID_SOUND_CHANNELS.voyager_battle.channelId,
        importance: 5,
        sound: 'voyager_battle.mp3',
      })
    );
  });

  it('3. requests permission (if needed) and schedules native Android alarm with custom app sound when permission is granted', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    mockLocalNotifications.checkPermissions.mockResolvedValueOnce({ display: 'prompt' });
    mockLocalNotifications.requestPermissions.mockResolvedValueOnce({ display: 'granted' });

    const scheduledDate = await scheduleNativeAlarm({
      isEnabled: true,
      time: '07:30',
      selectedSound: 'voyager_battle',
      snoozeUntil: null,
    });

    expect(scheduledDate).toBeInstanceOf(Date);
    expect(mockLocalNotifications.requestPermissions).toHaveBeenCalledTimes(1);
    expect(mockLocalNotifications.schedule).toHaveBeenCalledTimes(1);

    const scheduledPayload = mockLocalNotifications.schedule.mock.calls[0][0];
    expect(scheduledPayload.notifications[0]).toMatchObject({
      id: ALARM_NOTIFICATION_ID,
      channelId: 'voyager_alarm_voyager_battle',
      sound: 'voyager_battle.mp3',
      schedule: expect.objectContaining({
        allowWhileIdle: true,
      }),
      extra: {
        isAlarm: true,
        alarmTime: '07:30',
        selectedSound: 'voyager_battle',
      },
    });
  });

  it('4. schedules hydration reminders with voyager_violin.mp3 custom sound on Android when permission is granted', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    await scheduleNextReminders({
      enabled: true,
      mode: 'regular',
      targetMl: 2000,
      consumedMl: 500,
    });

    expect(mockLocalNotifications.schedule).toHaveBeenCalledTimes(1);
    const items = mockLocalNotifications.schedule.mock.calls[0][0].notifications;
    expect(items.length).toBe(5);
    for (const item of items) {
      expect(item.channelId).toBe(NOTIFICATION_CHANNEL_ID);
      expect(item.sound).toBe('voyager_violin.mp3');
      expect((item.schedule as any).allowWhileIdle).toBe(true);
    }
  });

  it('5. triggers in-app Voyager alarm audio and modal when Android fires localNotificationReceived', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    let receivedCallback: ((notification: any) => void) | null = null;
    mockLocalNotifications.addListener.mockImplementation(
      async (eventName: string, cb: any) => {
        if (eventName === 'localNotificationReceived') {
          receivedCallback = cb;
        }
        return { remove: async () => {} };
      }
    );

    render(<App />);

    // Wait for listener registration
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(receivedCallback).not.toBeNull();

    // Simulate Android delivering the alarm notification
    await act(async () => {
      receivedCallback!({
        id: ALARM_NOTIFICATION_ID,
        title: '⏰ Báo thức Voyager!',
        body: 'Đã đến giờ hẹn',
        extra: {
          isAlarm: true,
          alarmTime: '07:30',
          selectedSound: 'voyager_greeting',
        },
      });
    });

    // Verify AlarmRingingModal opens and Voyager audio plays in loop
    expect(screen.getByTestId('alarm-ringing-modal')).toBeDefined();
    expect(isAlarmPlaying()).toBe(true);
    expect(MockAudioElement.instances.length).toBeGreaterThanOrEqual(1);
    const lastAudio = MockAudioElement.instances[MockAudioElement.instances.length - 1];
    expect(lastAudio.src).toContain('voyager_greeting.mp3');
    expect(lastAudio.loop).toBe(true);
    expect(lastAudio.play).toHaveBeenCalled();
  });

  it('6. resolves fallback sound channel safely for unknown sound IDs', () => {
    const resolved = resolveAndroidNotificationSound('unknown_id');
    expect(resolved.channelId).toBe('voyager_alarm_voyager_violin');
    expect(resolved.soundFile).toBe('voyager_violin.mp3');
  });
});
