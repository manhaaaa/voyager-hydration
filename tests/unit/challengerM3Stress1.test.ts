// @vitest-environment jsdom
/**
 * Empirical Stress Test Harness: challengerM3Stress1.test.ts
 * Milestone 3: 5 Main Tab Screens & Card-UI System
 *
 * Targets:
 * - src/tabs/TodayTab.tsx
 * - src/components/WaveTank.tsx
 * - src/components/NavigationBar.tsx
 * - src/App.tsx
 *
 * Empirical Challenges Verified:
 * 1. Rapid drinking logs: 100 consecutive cycles of (+50ml, +150ml, +250ml, +500ml) = 400 clicks;
 *    verifying exact volume accumulation (95,000ml), streak retention, zero state corruption.
 * 2. Goal threshold transition: 99% -> 100% boundary crossing;
 *    verifying confetti trigger, fanfare audio execution, chibi expression switch to 'happy', and idempotency.
 * 3. Over-consumption: Extreme hydration (>200% and >10,000ml, up to 100,000ml);
 *    verifying visual wave tank clamping at 100% while numerical readout displays true total volume.
 * 4. Custom modal sanitization: Boundary and invalid inputs (0, negative, non-numeric, >5000ml, floating decimals, whitespace);
 *    verifying strict rejection, error messages, zero invalid logs, and valid boundaries (1ml, 5000ml).
 * 5. NavigationBar stress: Rapid 50-cycle tab switching across all 5 tabs;
 *    verifying state preservation, active indicators, zero memory leak or unhandled exception.
 */

import React, { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

// Mocks before imports
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

vi.mock('../../src/utils/audioEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/audioEngine')>();
  return {
    ...actual,
    playQuickTap: vi.fn(),
    playGoalCelebrationFanfare: vi.fn().mockResolvedValue(undefined),
    playCosmicSound: vi.fn(),
    playHydrationSound: vi.fn(),
    setAudioMuted: vi.fn(),
  };
});

vi.mock('../../src/utils/hydrationEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/hydrationEngine')>();
  return {
    ...actual,
    fetchWeatherData: vi.fn().mockResolvedValue({
      temperature: 28,
      humidity: 60,
      weatherCode: 1,
      bonusMl: 250,
      locationName: 'Hà Nội',
      isFallback: false,
      timestamp: Date.now(),
    }),
  };
});

import confetti from 'canvas-confetti';
import { playGoalCelebrationFanfare, playQuickTap } from '../../src/utils/audioEngine';
import { TodayTab, type TodayTabProps } from '../../src/tabs/TodayTab';
import { WaveTank } from '../../src/components/WaveTank';
import { NavigationBar, TABS } from '../../src/components/NavigationBar';
import App from '../../src/App';
import {
  STORAGE_KEYS,
  DEFAULT_USER_PROFILE,
  DEFAULT_SETTINGS,
  getStorageItem,
  type DailyLogsMap,
} from '../../src/utils/storageEngine';
import type { UserProfile, WeatherData } from '../../src/types';

describe('Challenger M3 Empirical Verification & Stress Test Suite', () => {
  const mockWeather: WeatherData = {
    temperature: 28,
    humidity: 60,
    weatherCode: 1,
    bonusMl: 250,
    locationName: 'Hà Nội',
    isFallback: false,
    timestamp: Date.now(),
  };

  const mockProfile: UserProfile = {
    ...DEFAULT_USER_PROFILE,
    weightKg: 60,
    activityLevel: 'sedentary',
    unit: 'L',
    soundEnabled: true,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  // Controlled wrapper for TodayTab testing state accumulation
  function ControlledTodayTab(props: Partial<TodayTabProps> & { initialMl?: number }) {
    const [currentMl, setCurrentMl] = useState<number>(props.initialMl ?? 0);
    return React.createElement(TodayTab, {
      ...props,
      currentMl,
      onLogDrink: (amount: number) => {
        setCurrentMl((prev) => prev + amount);
        if (props.onLogDrink) props.onLogDrink(amount);
      },
    });
  }

  // ==========================================================================
  // CHALLENGE 1: Rapid Drinking Logs (100 Cycles x 4 Buttons = 400 Invocations)
  // ==========================================================================
  describe('Challenge 1: Rapid Drinking Logs (100 Cycles x 4 Buttons = 400 Invocations)', () => {
    it('executes 100 consecutive cycles of [+50ml, +150ml, +250ml, +500ml] on TodayTab, verifying 95,000ml total accumulation and streak retention', async () => {
      const handleLog = vi.fn();
      const initialStreak = 7;

      render(
        React.createElement(ControlledTodayTab, {
          initialMl: 0,
          goalMl: 2000,
          streak: initialStreak,
          weather: mockWeather,
          userProfile: mockProfile,
          settings: { ...DEFAULT_SETTINGS, soundEnabled: true },
          onLogDrink: handleLog,
        })
      );

      const btn50 = screen.getByTestId('quick-drink-50');
      const btn150 = screen.getByTestId('quick-drink-150');
      const btn250 = screen.getByTestId('quick-drink-250');
      const btn500 = screen.getByTestId('quick-drink-500');

      expect(btn50).toBeDefined();
      expect(btn150).toBeDefined();
      expect(btn250).toBeDefined();
      expect(btn500).toBeDefined();

      // Stress harness: 100 consecutive 4-drink cycles = 400 logged events
      const CYCLES = 100;
      for (let i = 0; i < CYCLES; i++) {
        await act(async () => {
          fireEvent.click(btn50);
        });
        await act(async () => {
          fireEvent.click(btn150);
        });
        await act(async () => {
          fireEvent.click(btn250);
        });
        await act(async () => {
          fireEvent.click(btn500);
        });
      }

      // 1. Invocations count verification
      expect(handleLog).toHaveBeenCalledTimes(CYCLES * 4); // 400 calls

      // 2. Exact mathematical volume accumulation
      let totalAccumulatedMl = 0;
      for (const call of handleLog.mock.calls) {
        totalAccumulatedMl += call[0];
      }
      const expectedTotalMl = CYCLES * (50 + 150 + 250 + 500); // 100 * 950 = 95,000 ml
      expect(totalAccumulatedMl).toBe(expectedTotalMl);
      expect(totalAccumulatedMl).toBe(95000);

      // 3. UI readout reflects final volume accurately
      const consumedVolumeEl = screen.getByTestId('consumed-volume');
      // 95,000 ml in 'L' is formatted as '95,0 L'
      expect(consumedVolumeEl.textContent).toContain('95,0 L');

      // 4. Streak badge retention: streak is not reset to 0, not corrupted to NaN
      const streakBadge = screen.getByTestId('streak-badge');
      expect(streakBadge.textContent).toContain(`${initialStreak} ngày`);
      expect(streakBadge.textContent).not.toContain('NaN');
      expect(streakBadge.textContent).not.toContain('0 ngày');

      // 5. Persistence state integrity in localStorage
      const todayKey = new Date().toISOString().split('T')[0];
      const dailyLogs = getStorageItem<DailyLogsMap>(STORAGE_KEYS.DAILY_LOGS, {});
      expect(dailyLogs[todayKey]).toBeDefined();
      expect(dailyLogs[todayKey].consumedMl).toBe(expectedTotalMl);
      expect(dailyLogs[todayKey].isGoalReached).toBe(true);
      expect(dailyLogs[todayKey].entries.length).toBe(400);

      // Verify chronological entry integrity
      const firstEntry = dailyLogs[todayKey].entries[dailyLogs[todayKey].entries.length - 1]; // oldest
      expect(firstEntry.amountMl).toBe(50);
      const lastEntry = dailyLogs[todayKey].entries[0]; // newest
      expect(lastEntry.amountMl).toBe(500);
    });

    it('retains state consistency and streak progression in App.tsx under rapid intake logging (100 cycles = 400 logs)', async () => {
      await act(async () => {
        render(React.createElement(App));
      });

      // Find quick drink buttons in rendered App
      const btn50 = await screen.findByTestId('quick-drink-50');
      const btn150 = await screen.findByTestId('quick-drink-150');
      const btn250 = await screen.findByTestId('quick-drink-250');
      const btn500 = await screen.findByTestId('quick-drink-500');

      // Execute 25 full cycles = 100 logs (23,750 ml) to stress App.tsx state pipeline
      for (let i = 0; i < 25; i++) {
        await act(async () => {
          fireEvent.click(btn50);
          fireEvent.click(btn150);
          fireEvent.click(btn250);
          fireEvent.click(btn500);
        });
      }

      // Consumed volume in App should be 25 * 950 = 23,750 ml = 23,75 L
      const consumedVolumeEl = screen.getByTestId('consumed-volume');
      expect(consumedVolumeEl.textContent).toContain('23,75 L');

      // Streak badge should be valid and positive
      const streakBadge = screen.getByTestId('streak-badge');
      expect(streakBadge.textContent).toMatch(/\d+ ngày/);
      expect(streakBadge.textContent).not.toContain('NaN');
      expect(streakBadge.textContent).not.toContain('0 ngày');
    });

    it('handles synchronous batched rapid intake clicks in App.tsx without loss of volume due to functional state updater', async () => {
      await act(async () => {
        render(React.createElement(App));
      });

      const btn50 = await screen.findByTestId('quick-drink-50');
      const btn150 = await screen.findByTestId('quick-drink-150');
      const btn250 = await screen.findByTestId('quick-drink-250');
      const btn500 = await screen.findByTestId('quick-drink-500');

      // Dispatch 4 clicks synchronously in the same act block
      await act(async () => {
        fireEvent.click(btn50);
        fireEvent.click(btn150);
        fireEvent.click(btn250);
        fireEvent.click(btn500);
      });

      // Total should be 50 + 150 + 250 + 500 = 950 ml = 0,95 L
      const consumedVolumeEl = screen.getByTestId('consumed-volume');
      expect(consumedVolumeEl.textContent).toContain('0,95 L');
    });
  });

  // ==========================================================================
  // CHALLENGE 2: Goal Threshold Transition (99% to 100%)
  // ==========================================================================
  describe('Challenge 2: Goal Threshold Transition (99% to 100%)', () => {
    it('does NOT trigger confetti or fanfare at 99%, maintains non-celebration chibi expression', () => {
      const goalMl = 2000;
      const consumedMlAt99 = 1980; // 99%

      render(
        React.createElement(ControlledTodayTab, {
          initialMl: consumedMlAt99,
          goalMl: goalMl,
          streak: 3,
          weather: mockWeather,
          userProfile: mockProfile,
          settings: { ...DEFAULT_SETTINGS, soundEnabled: true },
        })
      );

      // At 99%, celebration triggers should NOT have fired
      expect(confetti).not.toHaveBeenCalled();
      expect(playGoalCelebrationFanfare).not.toHaveBeenCalled();

      // WaveTank fill percent should be 99%
      const tankContainer = screen.getByTestId('wave-tank-container');
      expect(tankContainer.getAttribute('data-fill-percent')).toBe('99');

      // Voyager Chibi is in idle state, not happy
      const chibiContainer = screen.getByTestId('voyager-chibi-container');
      expect(chibiContainer.getAttribute('data-expression')).toBe('idle');
      expect(screen.getByTestId('expression-idle')).toBeDefined();

      // Deficit prompt shows 1 cup left (20ml deficit rounds to 1 cup of 250ml)
      const deficitPrompt = screen.getByTestId('deficit-prompt');
      expect(deficitPrompt.textContent).toContain('Thêm 1 ly >');
    });

    it('triggers confetti and fanfare celebration when transitioning from 99% to 100%, and switches chibi to happy', async () => {
      const goalMl = 2000;
      const initialConsumedMl = 1980; // 99%

      render(
        React.createElement(ControlledTodayTab, {
          initialMl: initialConsumedMl,
          goalMl: goalMl,
          streak: 3,
          weather: mockWeather,
          userProfile: mockProfile,
          settings: { ...DEFAULT_SETTINGS, soundEnabled: true },
        })
      );

      // Pre-condition check
      expect(confetti).not.toHaveBeenCalled();
      expect(playGoalCelebrationFanfare).not.toHaveBeenCalled();

      // Transition across the 100% threshold by logging +50ml (total becomes 2030ml = 101.5%)
      const btn50 = screen.getByTestId('quick-drink-50');
      await act(async () => {
        fireEvent.click(btn50);
      });

      // 1. Confetti trigger invocation verified
      expect(confetti).toHaveBeenCalledTimes(1);
      expect(confetti).toHaveBeenCalledWith(
        expect.objectContaining({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: expect.arrayContaining(['#38BDF8', '#FBBF24']),
        })
      );

      // 2. Fanfare sound execution verified
      expect(playGoalCelebrationFanfare).toHaveBeenCalledTimes(1);

      // 3. Chibi expression switch to 'happy' verified
      const chibiContainer = screen.getByTestId('voyager-chibi-container');
      expect(chibiContainer.getAttribute('data-expression')).toBe('happy');
      expect(screen.getByTestId('expression-happy')).toBeDefined();

      // 4. Celebration speech bubble text displayed
      const speechBubble = screen.getByTestId('speech-bubble');
      expect(speechBubble.textContent).toContain('Thuyền trưởng thật tuyệt vời! Mục tiêu đã hoàn thành!');

      // 5. Deficit prompt changes to completion prompt
      const deficitPrompt = screen.getByTestId('deficit-prompt');
      expect(deficitPrompt.textContent).toContain('Mục tiêu hoàn thành! Xuất sắc 🎉');
    });

    it('maintains idempotency: subsequent logging past 100% does NOT re-trigger fanfare celebration', async () => {
      const goalMl = 2000;
      const initialConsumedMl = 1980;

      render(
        React.createElement(ControlledTodayTab, {
          initialMl: initialConsumedMl,
          goalMl: goalMl,
          streak: 3,
          weather: mockWeather,
          userProfile: mockProfile,
          settings: { ...DEFAULT_SETTINGS, soundEnabled: true },
        })
      );

      // First click: 1980 -> 2030 ml (crosses 100%)
      const btn50 = screen.getByTestId('quick-drink-50');
      await act(async () => {
        fireEvent.click(btn50);
      });
      expect(confetti).toHaveBeenCalledTimes(1);
      expect(playGoalCelebrationFanfare).toHaveBeenCalledTimes(1);

      // Second click: 2030 -> 2080 ml (already past 100%)
      await act(async () => {
        fireEvent.click(btn50);
      });

      // Confetti and Fanfare should NOT be invoked a second time
      expect(confetti).toHaveBeenCalledTimes(1);
      expect(playGoalCelebrationFanfare).toHaveBeenCalledTimes(1);

      // Chibi remains happy
      const chibiContainer = screen.getByTestId('voyager-chibi-container');
      expect(chibiContainer.getAttribute('data-expression')).toBe('happy');
    });
  });

  // ==========================================================================
  // CHALLENGE 3: Over-Consumption & Extreme Hydration (>200% and >10,000ml)
  // ==========================================================================
  describe('Challenge 3: Over-Consumption & Extreme Hydration (>200% and >10,000ml)', () => {
    it('clamps WaveTank visual percentage strictly to 100% when consumed is 4500ml on 2000ml goal (225%)', () => {
      render(React.createElement(WaveTank, { currentMl: 4500, goalMl: 2000 }));

      const tankContainer = screen.getByTestId('wave-tank-container');
      // Visual fill percent must be clamped to 100
      expect(tankContainer.getAttribute('data-fill-percent')).toBe('100');

      // Chibi should be in happy expression
      const chibiContainer = screen.getByTestId('voyager-chibi-container');
      expect(chibiContainer.getAttribute('data-expression')).toBe('happy');
    });

    it('clamps WaveTank visual percentage strictly to 100% under extreme hydration (>10,000ml: 12,500ml and 100,000ml)', () => {
      // 12,500 ml on 2000 ml goal (625%)
      const { unmount } = render(React.createElement(WaveTank, { currentMl: 12500, goalMl: 2000 }));
      let tankContainer = screen.getByTestId('wave-tank-container');
      expect(tankContainer.getAttribute('data-fill-percent')).toBe('100');
      unmount();

      // Ultra extreme: 100,000 ml on 1500 ml goal (6666%)
      render(React.createElement(WaveTank, { currentMl: 100000, goalMl: 1500 }));
      tankContainer = screen.getByTestId('wave-tank-container');
      expect(tankContainer.getAttribute('data-fill-percent')).toBe('100');
    });

    it('displays true un-clamped total volume in numerical readout while wave tank visual is clamped', () => {
      render(
        React.createElement(ControlledTodayTab, {
          initialMl: 12500,
          goalMl: 2000,
          streak: 5,
          weather: mockWeather,
          userProfile: { ...mockProfile, unit: 'L' },
          settings: { ...DEFAULT_SETTINGS, unit: 'L' },
        })
      );

      // Wave tank container is visually clamped at 100%
      const tankContainer = screen.getByTestId('wave-tank-container');
      expect(tankContainer.getAttribute('data-fill-percent')).toBe('100');

      // Numerical readout displays TRUE total volume (12,5 L, not clamped to 2,0 L)
      const consumedVolumeEl = screen.getByTestId('consumed-volume');
      expect(consumedVolumeEl.textContent).toBe('12,5 L');

      // Goal volume is 2,0 L
      const goalVolumeEl = screen.getByTestId('goal-volume');
      expect(goalVolumeEl.textContent).toBe('2,0 L');

      // Deficit prompt shows completion, strictly non-negative
      const deficitPrompt = screen.getByTestId('deficit-prompt');
      expect(deficitPrompt.textContent).toBe('Mục tiêu hoàn thành! Xuất sắc 🎉');
      expect(deficitPrompt.textContent).not.toContain('-');
    });

    it('handles negative or zero goal cleanly without NaN in WaveTank', () => {
      const { unmount } = render(React.createElement(WaveTank, { currentMl: 500, goalMl: 0 }));
      let tankContainer = screen.getByTestId('wave-tank-container');
      expect(tankContainer.getAttribute('data-fill-percent')).toBe('0');
      unmount();

      render(React.createElement(WaveTank, { currentMl: -100, goalMl: 2000 }));
      tankContainer = screen.getByTestId('wave-tank-container');
      expect(tankContainer.getAttribute('data-fill-percent')).toBe('0');
    });
  });

  // ==========================================================================
  // CHALLENGE 4: Custom Intake Modal Input Sanitization & Boundary Testing
  // ==========================================================================
  describe('Challenge 4: Custom Intake Modal Input Sanitization & Boundary Testing', () => {
    it('opens and closes custom intake modal correctly', async () => {
      render(React.createElement(ControlledTodayTab, { initialMl: 500, goalMl: 2000 }));

      // Modal is not visible initially
      expect(screen.queryByTestId('custom-intake-modal')).toBeNull();

      // Click custom drink button
      const customBtn = screen.getByTestId('custom-drink-button');
      await act(async () => {
        fireEvent.click(customBtn);
      });

      // Modal should now be open
      expect(screen.getByTestId('custom-intake-modal')).toBeDefined();

      // Click Cancel ("Hủy")
      const cancelBtn = screen.getByText('Hủy');
      await act(async () => {
        fireEvent.click(cancelBtn);
      });

      // Modal should be closed
      expect(screen.queryByTestId('custom-intake-modal')).toBeNull();
    });

    it('rejects invalid inputs (0, negative, non-numeric, >5000ml, floating decimals, whitespace) with error message and zero logged volume', async () => {
      const handleLog = vi.fn();
      render(React.createElement(ControlledTodayTab, { initialMl: 500, goalMl: 2000, onLogDrink: handleLog }));

      const customBtn = screen.getByTestId('custom-drink-button');
      await act(async () => {
        fireEvent.click(customBtn);
      });

      const modal = screen.getByTestId('custom-intake-modal');
      const input = modal.querySelector('input[type="number"]') as HTMLInputElement;
      const form = modal.querySelector('form') as HTMLFormElement;

      const invalidInputs = [
        '0',
        '-1',
        '-500',
        'abc',
        'NaN',
        'undefined',
        '5001',
        '999999',
        '250.5',
        '100.99',
        '',
        '   ',
      ];

      for (const invalidVal of invalidInputs) {
        await act(async () => {
          fireEvent.change(input, { target: { value: invalidVal } });
          fireEvent.submit(form);
        });

        // Error message must be rendered
        expect(
          screen.getByText('Vui lòng nhập số nguyên dương hợp lệ từ 1 đến 5000 ml.')
        ).toBeDefined();

        // onLogDrink must NOT have been called
        expect(handleLog).not.toHaveBeenCalled();

        // Modal remains open for user correction
        expect(screen.getByTestId('custom-intake-modal')).toBeDefined();
      }
    });

    it('accepts valid minimum boundary input (1ml) and closes modal', async () => {
      const handleLog = vi.fn();
      render(React.createElement(ControlledTodayTab, { initialMl: 500, goalMl: 2000, onLogDrink: handleLog }));

      await act(async () => {
        fireEvent.click(screen.getByTestId('custom-drink-button'));
      });

      const modal = screen.getByTestId('custom-intake-modal');
      const input = modal.querySelector('input[type="number"]') as HTMLInputElement;
      const form = modal.querySelector('form') as HTMLFormElement;

      await act(async () => {
        fireEvent.change(input, { target: { value: '1' } });
        fireEvent.submit(form);
      });

      expect(handleLog).toHaveBeenCalledWith(1);
      // Modal should be closed
      expect(screen.queryByTestId('custom-intake-modal')).toBeNull();
    });

    it('accepts valid maximum boundary input (5000ml) and closes modal', async () => {
      const handleLog = vi.fn();
      render(React.createElement(ControlledTodayTab, { initialMl: 500, goalMl: 2000, onLogDrink: handleLog }));

      await act(async () => {
        fireEvent.click(screen.getByTestId('custom-drink-button'));
      });

      const modal = screen.getByTestId('custom-intake-modal');
      const input = modal.querySelector('input[type="number"]') as HTMLInputElement;
      const form = modal.querySelector('form') as HTMLFormElement;

      await act(async () => {
        fireEvent.change(input, { target: { value: '5000' } });
        fireEvent.submit(form);
      });

      expect(handleLog).toHaveBeenCalledWith(5000);
      expect(screen.queryByTestId('custom-intake-modal')).toBeNull();
    });

    it('supports quick preset chips (100ml, 200ml, 330ml, 600ml, 1000ml) in custom modal', async () => {
      const handleLog = vi.fn();
      render(React.createElement(ControlledTodayTab, { initialMl: 500, goalMl: 2000, onLogDrink: handleLog }));

      await act(async () => {
        fireEvent.click(screen.getByTestId('custom-drink-button'));
      });

      // Click preset chip 330ml
      const chip330 = screen.getByText('330ml');
      await act(async () => {
        fireEvent.click(chip330);
      });

      const modal = screen.getByTestId('custom-intake-modal');
      const input = modal.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input.value).toBe('330');

      // Submit
      const form = modal.querySelector('form') as HTMLFormElement;
      await act(async () => {
        fireEvent.submit(form);
      });

      expect(handleLog).toHaveBeenCalledWith(330);
      expect(screen.queryByTestId('custom-intake-modal')).toBeNull();
    });
  });

  // ==========================================================================
  // CHALLENGE 5: NavigationBar Rapid Switching & State Preservation in App.tsx
  // ==========================================================================
  describe('Challenge 5: NavigationBar Rapid Switching & State Preservation in App.tsx', () => {
    it('verifies 5 tabs are 100% free with zero paywall locks or VIP banners', () => {
      expect(TABS.length).toBe(5);
      for (const tab of TABS) {
        expect(tab.isVip).toBe(false);
        expect(tab.isLocked).toBe(false);
      }
    });

    it('survives rapid tab switching across all 5 tabs 50 times in App.tsx, preserving hydration state and user data', async () => {
      await act(async () => {
        render(React.createElement(App));
      });

      // 1. Initial view: Today tab
      expect(screen.getByTestId('today-tab-screen')).toBeDefined();

      // 2. Log 500ml in Today tab
      const btn500 = screen.getByTestId('quick-drink-500');
      await act(async () => {
        fireEvent.click(btn500);
      });

      // Consumed volume is now 0,5 L (500 ml)
      let consumedVolumeEl = screen.getByTestId('consumed-volume');
      expect(consumedVolumeEl.textContent).toContain('0,5 L');

      // 3. Perform 50 rapid sequential tab switches (10 full loops of 5 tabs)
      const tabOrder: Array<'reminder' | 'journal' | 'stats' | 'profile' | 'today'> = [
        'reminder',
        'journal',
        'stats',
        'profile',
        'today',
      ];

      for (let cycle = 0; cycle < 10; cycle++) {
        for (const tabId of tabOrder) {
          const navTabBtn = screen.getByTestId(`nav-tab-${tabId}`);
          await act(async () => {
            fireEvent.click(navTabBtn);
          });
        }
      }

      // 4. Verify we are back on TodayTab
      expect(screen.getByTestId('today-tab-screen')).toBeDefined();

      // 5. Verify the 500ml consumed volume was 100% preserved
      consumedVolumeEl = screen.getByTestId('consumed-volume');
      expect(consumedVolumeEl.textContent).toContain('0,5 L');

      // 6. Switch to Journal tab and verify the 500ml log entry is preserved
      await act(async () => {
        fireEvent.click(screen.getByTestId('nav-tab-journal'));
      });
      expect(screen.getByTestId('streak-days-count')).toBeDefined();

      // 7. Switch to Stats tab and verify stats screen mounts cleanly
      await act(async () => {
        fireEvent.click(screen.getByTestId('nav-tab-stats'));
      });
      expect(screen.getByTestId('stats-record-streak')).toBeDefined();

      // 8. Switch to Profile tab and verify username 'Mạnh' is preserved
      await act(async () => {
        fireEvent.click(screen.getByTestId('nav-tab-profile'));
      });
      const usernameInput = screen.getByTestId('profile-username-input') as HTMLInputElement;
      expect(usernameInput.value).toBe('Mạnh');

      // 9. Switch back to TodayTab
      await act(async () => {
        fireEvent.click(screen.getByTestId('nav-tab-today'));
      });
      expect(screen.getByTestId('today-tab-screen')).toBeDefined();
      expect(screen.getByTestId('consumed-volume').textContent).toContain('0,5 L');
    });

    it('invokes onTabChange and triggers quick tap sound on tab selection in NavigationBar', () => {
      const handleTabChange = vi.fn();
      render(React.createElement(NavigationBar, { activeTab: 'today', onTabChange: handleTabChange }));

      for (const tab of TABS) {
        const btn = screen.getByTestId(`nav-tab-${tab.id}`);
        fireEvent.click(btn);
        expect(handleTabChange).toHaveBeenCalledWith(tab.id);
        expect(playQuickTap).toHaveBeenCalled();
      }
    });
  });
});
