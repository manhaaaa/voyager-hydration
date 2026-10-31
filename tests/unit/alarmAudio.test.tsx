// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  previewVoyagerTrack,
  stopPreviewAudio,
  startAlarmPlayback,
  stopAlarmPlayback,
  isAlarmPlaying,
  _setAudioConstructorForTesting,
  VOYAGER_AUDIO_TRACKS,
  MASTER_HEADROOM_GAIN,
  setAudioMuted,
} from '../../src/utils/audioEngine';
import AlarmRingingModal from '../../src/components/AlarmRingingModal';
import ReminderTab from '../../src/tabs/ReminderTab';
import { DEFAULT_SETTINGS, DEFAULT_ALARM_CONFIG, AlarmClockConfig } from '../../src/utils/storageEngine';

// Standard Mock HTMLAudioElement
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

describe('Alarm Audio & Component Tests (alarmAudio.test.tsx)', () => {
  beforeEach(() => {
    MockAudioElement.instances = [];
    _setAudioConstructorForTesting(MockAudioElement as unknown as typeof Audio);
    setAudioMuted(false);
    stopAlarmPlayback();
    stopPreviewAudio();
  });

  afterEach(() => {
    stopAlarmPlayback();
    stopPreviewAudio();
    _setAudioConstructorForTesting(null);
    vi.restoreAllMocks();
  });

  describe('1. Audio Engine Real Asset & Looping Playback Tests', () => {
    it('creates Audio instance with correct track src and non-looping for preview', () => {
      const audio = previewVoyagerTrack('voyager_violin');
      expect(audio).toBeDefined();
      expect(MockAudioElement.instances.length).toBe(1);

      const instance = MockAudioElement.instances[0];
      expect(instance.src).toBe(VOYAGER_AUDIO_TRACKS.voyager_violin.src);
      expect(instance.loop).toBe(false);
      expect(instance.volume).toBeCloseTo(MASTER_HEADROOM_GAIN, 2);
      expect(instance.play).toHaveBeenCalled();
    });

    it('stops previous preview when starting a new preview', () => {
      previewVoyagerTrack('voyager_violin');
      expect(MockAudioElement.instances.length).toBe(1);
      const firstInstance = MockAudioElement.instances[0];

      previewVoyagerTrack('voyager_battle');
      expect(firstInstance.pause).toHaveBeenCalled();
      expect(firstInstance.currentTime).toBe(0);
      expect(MockAudioElement.instances.length).toBe(2);
    });

    it('invokes onEnded callback and resets state when audio finishes', () => {
      const onEnded = vi.fn();
      const audio = previewVoyagerTrack('voyager_greeting', onEnded);
      expect(audio).toBeDefined();

      const instance = MockAudioElement.instances[0];
      expect(instance.onended).toBeDefined();
      instance.onended!();
      expect(onEnded).toHaveBeenCalled();
    });

    it('starts looping playback and updates isAlarmPlaying() to true', () => {
      expect(isAlarmPlaying()).toBe(false);

      startAlarmPlayback('voyager_violin');
      expect(isAlarmPlaying()).toBe(true);
      expect(MockAudioElement.instances.length).toBe(1);

      const alarmInstance = MockAudioElement.instances[0];
      expect(alarmInstance.loop).toBe(true);
      expect(alarmInstance.play).toHaveBeenCalled();
    });

    it('stops looping playback and resets isAlarmPlaying() to false on stopAlarmPlayback', () => {
      startAlarmPlayback('voyager_battle');
      expect(isAlarmPlaying()).toBe(true);
      const alarmInstance = MockAudioElement.instances[0];

      stopAlarmPlayback();
      expect(alarmInstance.pause).toHaveBeenCalled();
      expect(alarmInstance.currentTime).toBe(0);
      expect(isAlarmPlaying()).toBe(false);
    });

    it('does not play sound when audio engine is globally muted', () => {
      setAudioMuted(true);
      const audio = previewVoyagerTrack('voyager_violin');
      expect(audio).toBeNull();
      expect(MockAudioElement.instances.length).toBe(0);

      startAlarmPlayback('voyager_violin');
      expect(isAlarmPlaying()).toBe(false);
    });
  });

  describe('2. AlarmRingingModal UI Component Tests', () => {
    it('does not render into DOM when isOpen is false', () => {
      const { container } = render(
        <AlarmRingingModal
          isOpen={false}
          alarmTime="07:30"
          snoozeMinutes={5}
          onDismiss={vi.fn()}
          onSnooze={vi.fn()}
        />
      );

      expect(screen.queryByTestId('alarm-ringing-modal')).toBeNull();
      expect(container.firstChild).toBeNull();
    });

    it('renders with prominent styling and character visuals when isOpen is true', () => {
      render(
        <AlarmRingingModal
          isOpen={true}
          alarmTime="07:30"
          snoozeMinutes={5}
          soundName="Violin Tinh cầu (Voyager Theme)"
          onDismiss={vi.fn()}
          onSnooze={vi.fn()}
        />
      );

      const modal = screen.getByTestId('alarm-ringing-modal');
      expect(modal).toBeDefined();
      expect(screen.getByText('Báo thức Voyager')).toBeDefined();
      expect(screen.getByText(/07:30/)).toBeDefined();
      expect(screen.getByText('Violin Tinh cầu (Voyager Theme)')).toBeDefined();
      expect(screen.getByTestId('alarm-dismiss-btn')).toBeDefined();
      expect(screen.getByTestId('alarm-snooze-btn')).toBeDefined();
    });

    it('triggers onDismiss callback when Dừng chuông button is clicked', () => {
      const handleDismiss = vi.fn();
      render(
        <AlarmRingingModal
          isOpen={true}
          alarmTime="07:30"
          snoozeMinutes={5}
          onDismiss={handleDismiss}
          onSnooze={vi.fn()}
        />
      );

      const dismissBtn = screen.getByTestId('alarm-dismiss-btn');
      fireEvent.click(dismissBtn);
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });

    it('triggers onSnooze callback when Hoãn button is clicked', () => {
      const handleSnooze = vi.fn();
      render(
        <AlarmRingingModal
          isOpen={true}
          alarmTime="07:30"
          snoozeMinutes={10}
          onDismiss={vi.fn()}
          onSnooze={handleSnooze}
        />
      );

      const snoozeBtn = screen.getByTestId('alarm-snooze-btn');
      expect(snoozeBtn.textContent).toContain('Hoãn 10p');
      fireEvent.click(snoozeBtn);
      expect(handleSnooze).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. ReminderTab Dedicated Alarm Clock Section Tests', () => {
    it('renders dedicated Alarm Clock card with time input and toggle switch', () => {
      render(
        <ReminderTab
          settings={DEFAULT_SETTINGS}
          targetMl={2000}
          consumedMl={800}
          onUpdateSettings={vi.fn()}
        />
      );

      expect(screen.getByText('Đồng hồ báo thức Voyager')).toBeDefined();
      expect(screen.getByTestId('alarm-master-toggle')).toBeDefined();
      expect(screen.getByTestId('alarm-time-input')).toBeDefined();

      const timeInput = screen.getByTestId('alarm-time-input') as HTMLInputElement;
      expect(timeInput.value).toBe('07:30');
    });

    it('toggles alarm enable state on master toggle click', async () => {
      const handleUpdateAlarm = vi.fn();
      const initialConfig: AlarmClockConfig = {
        ...DEFAULT_ALARM_CONFIG,
        isEnabled: false,
      };

      render(
        <ReminderTab
          settings={DEFAULT_SETTINGS}
          targetMl={2000}
          consumedMl={800}
          alarmConfig={initialConfig}
          onUpdateAlarmConfig={handleUpdateAlarm}
          onUpdateSettings={vi.fn()}
        />
      );

      const toggle = screen.getByTestId('alarm-master-toggle');
      await act(async () => {
        fireEvent.click(toggle);
      });

      expect(handleUpdateAlarm).toHaveBeenCalledWith({ isEnabled: true });
    });

    it('updates alarm time when quick preset chips are clicked', async () => {
      const handleUpdateAlarm = vi.fn();

      render(
        <ReminderTab
          settings={DEFAULT_SETTINGS}
          targetMl={2000}
          consumedMl={800}
          alarmConfig={DEFAULT_ALARM_CONFIG}
          onUpdateAlarmConfig={handleUpdateAlarm}
          onUpdateSettings={vi.fn()}
        />
      );

      const presetBtn = screen.getByText('06:00');
      await act(async () => {
        fireEvent.click(presetBtn);
      });

      expect(handleUpdateAlarm).toHaveBeenCalledWith({ time: '06:00' });
    });

    it('triggers sound preview when Nghe thử button is clicked', async () => {
      render(
        <ReminderTab
          settings={DEFAULT_SETTINGS}
          targetMl={2000}
          consumedMl={800}
          alarmConfig={DEFAULT_ALARM_CONFIG}
          onUpdateSettings={vi.fn()}
        />
      );

      const previewButtons = screen.getAllByTestId('alarm-sound-preview-btn');
      expect(previewButtons.length).toBeGreaterThanOrEqual(3);

      // Click the first preview button (Violin Tinh cầu)
      await act(async () => {
        fireEvent.click(previewButtons[0]);
      });

      expect(MockAudioElement.instances.length).toBe(1);
      expect(MockAudioElement.instances[0].src).toContain('voyager_violin');
      expect(MockAudioElement.instances[0].play).toHaveBeenCalled();

      // Button text switches to Dừng
      expect(previewButtons[0].textContent).toContain('Dừng');

      // Click again to halt preview
      await act(async () => {
        fireEvent.click(previewButtons[0]);
      });

      expect(MockAudioElement.instances[0].pause).toHaveBeenCalled();
      expect(previewButtons[0].textContent).toContain('Nghe thử');
    });
  });
});
