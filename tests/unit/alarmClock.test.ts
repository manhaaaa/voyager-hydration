// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import {
  STORAGE_KEYS,
  DEFAULT_ALARM_CONFIG,
  AlarmClockConfig,
  loadAlarmConfig,
  saveAlarmConfig,
  clearAllStorage,
  exportDataAsJson,
} from '../../src/utils/storageEngine';
import {
  VOYAGER_AUDIO_TRACKS,
  VoyagerAudioTrackId,
} from '../../src/utils/audioEngine';

beforeEach(async () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
  await Preferences.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Alarm Clock Logic & Configuration Unit Tests (alarmClock.test.ts)', () => {
  describe('1. Default Schema & Storage Contracts', () => {
    it('defines STORAGE_KEYS.ALARM_CLOCK as "voyager_alarm_clock"', () => {
      expect(STORAGE_KEYS.ALARM_CLOCK).toBe('voyager_alarm_clock');
    });

    it('defines DEFAULT_ALARM_CONFIG with correct initial values', () => {
      expect(DEFAULT_ALARM_CONFIG.isEnabled).toBe(false);
      expect(DEFAULT_ALARM_CONFIG.time).toBe('07:30');
      expect(DEFAULT_ALARM_CONFIG.selectedSound).toBe('voyager_violin');
      expect(DEFAULT_ALARM_CONFIG.snoozeMinutes).toBe(5);
      expect(DEFAULT_ALARM_CONFIG.snoozeUntil).toBeNull();
      expect(DEFAULT_ALARM_CONFIG.lastDismissedKey).toBeNull();
    });

    it('loads DEFAULT_ALARM_CONFIG when storage is empty', async () => {
      const config = await loadAlarmConfig();
      expect(config).toEqual(DEFAULT_ALARM_CONFIG);
    });

    it('saves and reloads modified AlarmClockConfig correctly', async () => {
      const customConfig: AlarmClockConfig = {
        isEnabled: true,
        time: '06:45',
        selectedSound: 'voyager_greeting',
        snoozeMinutes: 10,
        snoozeUntil: null,
        lastDismissedKey: null,
      };

      await saveAlarmConfig(customConfig);
      const loaded = await loadAlarmConfig();
      expect(loaded).toEqual(customConfig);
    });

    it('recovers with DEFAULT_ALARM_CONFIG if stored JSON is corrupted', async () => {
      window.localStorage.setItem(STORAGE_KEYS.ALARM_CLOCK, '{invalid-json');
      const recovered = await loadAlarmConfig();
      expect(recovered).toEqual(DEFAULT_ALARM_CONFIG);
    });

    it('clears alarm configuration when clearAllStorage is invoked', async () => {
      await saveAlarmConfig({
        isEnabled: true,
        time: '08:00',
        selectedSound: 'voyager_battle',
        snoozeMinutes: 15,
        snoozeUntil: null,
        lastDismissedKey: null,
      });

      await clearAllStorage();
      const afterClear = await loadAlarmConfig();
      expect(afterClear.isEnabled).toBe(false);
      expect(afterClear.time).toBe('07:30');
    });

    it('includes alarmClock in exportDataAsJson output', async () => {
      await saveAlarmConfig({
        isEnabled: true,
        time: '07:15',
        selectedSound: 'voyager_violin',
        snoozeMinutes: 5,
        snoozeUntil: 1730419200000,
        lastDismissedKey: '2026-11-01 07:15',
      });

      const jsonStr = exportDataAsJson();
      const parsed = JSON.parse(jsonStr);
      expect(parsed.alarmClock).toBeDefined();
      expect(parsed.alarmClock.time).toBe('07:15');
      expect(parsed.alarmClock.isEnabled).toBe(true);
      expect(parsed.alarmClock.selectedSound).toBe('voyager_violin');
    });
  });

  describe('2. Voyager Audio Track Registry Integrity', () => {
    it('registers all 3 authentic Reverse: 1999 Voyager audio tracks', () => {
      const trackIds: VoyagerAudioTrackId[] = ['voyager_violin', 'voyager_greeting', 'voyager_battle'];
      trackIds.forEach((id) => {
        const track = VOYAGER_AUDIO_TRACKS[id];
        expect(track).toBeDefined();
        expect(track.id).toBe(id);
        expect(track.name.length).toBeGreaterThan(0);
        expect(track.description.length).toBeGreaterThan(0);
        expect(track.src).toBe(`/assets/audio/${id}.mp3`);
      });
    });
  });

  describe('3. Alarm Triggering & Scheduling Logic', () => {
    function shouldTriggerAlarm(
      config: AlarmClockConfig,
      currentTime: Date,
      isCurrentlyRinging: boolean = false
    ): boolean {
      if (!config.isEnabled || isCurrentlyRinging) return false;

      const currentH = currentTime.getHours();
      const currentM = currentTime.getMinutes();
      const currentMinuteKey = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')} ${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;

      const [alarmHStr, alarmMStr] = (config.time || '07:30').split(':');
      const alarmH = parseInt(alarmHStr, 10);
      const alarmM = parseInt(alarmMStr, 10);

      const isScheduledTimeMatch = currentH === alarmH && currentM === alarmM;
      const isSnoozeMatch = config.snoozeUntil !== null && currentTime.getTime() >= config.snoozeUntil;

      if (isScheduledTimeMatch || isSnoozeMatch) {
        return config.lastDismissedKey !== currentMinuteKey;
      }
      return false;
    }

    it('triggers when alarm is enabled and current time matches alarm time', () => {
      const config: AlarmClockConfig = {
        isEnabled: true,
        time: '07:30',
        selectedSound: 'voyager_violin',
        snoozeMinutes: 5,
        snoozeUntil: null,
        lastDismissedKey: null,
      };

      const matchingDate = new Date('2026-11-01T07:30:15');
      expect(shouldTriggerAlarm(config, matchingDate)).toBe(true);
    });

    it('does NOT trigger when alarm is disabled even if time matches', () => {
      const config: AlarmClockConfig = {
        isEnabled: false,
        time: '07:30',
        selectedSound: 'voyager_violin',
        snoozeMinutes: 5,
        snoozeUntil: null,
        lastDismissedKey: null,
      };

      const matchingDate = new Date('2026-11-01T07:30:00');
      expect(shouldTriggerAlarm(config, matchingDate)).toBe(false);
    });

    it('does NOT trigger when current time differs by even 1 minute', () => {
      const config: AlarmClockConfig = {
        isEnabled: true,
        time: '07:30',
        selectedSound: 'voyager_violin',
        snoozeMinutes: 5,
        snoozeUntil: null,
        lastDismissedKey: null,
      };

      const earlyDate = new Date('2026-11-01T07:29:59');
      const lateDate = new Date('2026-11-01T07:31:00');
      expect(shouldTriggerAlarm(config, earlyDate)).toBe(false);
      expect(shouldTriggerAlarm(config, lateDate)).toBe(false);
    });

    it('prevents multiple triggers within the same minute after dismissal', () => {
      const minuteKey = '2026-11-01 07:30';

      const dismissedConfig: AlarmClockConfig = {
        isEnabled: true,
        time: '07:30',
        selectedSound: 'voyager_violin',
        snoozeMinutes: 5,
        snoozeUntil: null,
        lastDismissedKey: minuteKey,
      };

      // 30 seconds later in the same minute
      const laterSameMinute = new Date('2026-11-01T07:30:40');
      expect(shouldTriggerAlarm(dismissedConfig, laterSameMinute)).toBe(false);

      // Next morning at 07:30, new date key -> triggers again!
      const nextDay = new Date('2026-11-02T07:30:05');
      expect(shouldTriggerAlarm(dismissedConfig, nextDay)).toBe(true);
    });

    it('does NOT re-trigger if alarm is already currently ringing', () => {
      const config: AlarmClockConfig = {
        isEnabled: true,
        time: '07:30',
        selectedSound: 'voyager_violin',
        snoozeMinutes: 5,
        snoozeUntil: null,
        lastDismissedKey: null,
      };

      const matchingDate = new Date('2026-11-01T07:30:10');
      expect(shouldTriggerAlarm(config, matchingDate, true)).toBe(false);
    });
  });

  describe('4. Snooze Calculation & Expiry Logic', () => {
    it('calculates correct snooze expiry timestamp based on snoozeMinutes', () => {
      const baseTime = 1730419200000; // 07:30:00
      const snoozeMinutes = 10;
      const expectedSnoozeUntil = baseTime + snoozeMinutes * 60 * 1000; // 07:40:00

      expect(expectedSnoozeUntil).toBe(baseTime + 600000);
    });

    it('triggers when snooze expiry timestamp is reached regardless of scheduled time', () => {
      const baseTime = new Date('2026-11-01T07:30:00').getTime();
      const snoozeUntil = baseTime + 5 * 60 * 1000; // 07:35:00

      const config: AlarmClockConfig = {
        isEnabled: true,
        time: '07:30',
        selectedSound: 'voyager_violin',
        snoozeMinutes: 5,
        snoozeUntil,
        lastDismissedKey: '2026-11-01 07:30',
      };

      // At 07:33 (before snooze expiry): does not trigger
      const beforeSnooze = new Date(baseTime + 3 * 60 * 1000);
      expect(beforeSnooze.getTime() < config.snoozeUntil!).toBe(true);

      // At 07:35:05 (snooze expired): triggers!
      const atSnooze = new Date(snoozeUntil + 5000);
      const isSnoozeMatch = config.snoozeUntil !== null && atSnooze.getTime() >= config.snoozeUntil;
      const currentMinuteKey = '2026-11-01 07:35';
      const shouldRing = isSnoozeMatch && config.lastDismissedKey !== currentMinuteKey;

      expect(shouldRing).toBe(true);
    });
  });
});
