// @vitest-environment jsdom
/**
 * Empirical Stress & Adversarial Test Harness: challengerM6Stress1.test.tsx
 * Milestone 6: Cosmic Water Planet & Character Visuals
 *
 * Empirical Challenges Tested:
 * 1. Extreme Hydration Percentages & Boundary Math:
 *    - 0%, 1%, 50%, 99%, 100%, 250%, 1000%
 *    - Negative values (-500ml, negative goalMl)
 *    - Division-by-zero (goalMl = 0) and NaN protection
 *    - Fluid reservoir clamping, status descriptions, and chibi positioning coordinates
 * 2. Quick Drink Stress & Timer Debounce:
 *    - 50 rapid sequential clicks on quick drink buttons
 *    - Timer debounce coalescence (timer reset on each invocation without dangling handles)
 *    - Memory leak prevention: unmount during active drinking timer
 *    - 99% -> 100% goal crossing during rapid spam maintains 'happy' expression without reversion
 * 3. Voyager Chibi Expression Matrix & Transitions:
 *    - Sanitization of all valid and invalid inputs
 *    - Overlay rendering verification (drinking, sleeping without dark veil, happy, idle, strict, gentle)
 *    - Complete 4-tier mood hierarchy: quiet hours (sleeping) > goal (happy) > transient (drinking) > idle
 *    - Cyclic state transitions under rapid user events
 */

import { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

// Mocks
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
      temperature: 26,
      humidity: 60,
      weatherCode: 1,
      bonusMl: 0,
      locationName: 'Hà Nội',
      isFallback: false,
      timestamp: Date.now(),
    }),
  };
});

import confetti from 'canvas-confetti';
import { playGoalCelebrationFanfare } from '../../src/utils/audioEngine';
import CosmicWaterPlanet from '../../src/components/CosmicWaterPlanet';
import WaveTank from '../../src/components/WaveTank';
import VoyagerChibi, {
  sanitizeExpression,
  VOYAGER_EXPRESSION_IMAGES,
  resolveAvatarSrc,
  formatSpeech,
} from '../../src/components/VoyagerChibi';
import TodayTab, { TodayTabProps } from '../../src/tabs/TodayTab';
import {
  DEFAULT_USER_PROFILE,
  DEFAULT_SETTINGS,
} from '../../src/utils/storageEngine';
import type { WeatherData, UserProfile } from '../../src/types';

describe('Challenger M6 Empirical Verification & Stress Test Suite', () => {
  const mockWeather: WeatherData = {
    temperature: 26,
    humidity: 60,
    weatherCode: 1,
    bonusMl: 0,
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

  // Controlled wrapper for TodayTab
  function ControlledTodayTab(props: Partial<TodayTabProps> & { initialMl?: number }) {
    const [currentMl, setCurrentMl] = useState<number>(props.initialMl ?? 0);
    return (
      <TodayTab
        {...props}
        currentMl={currentMl}
        onLogDrink={(amount: number) => {
          setCurrentMl((prev) => prev + amount);
          if (props.onLogDrink) props.onLogDrink(amount);
        }}
      />
    );
  }

  // ==========================================================================
  // SUITE 1: Extreme Hydration Percentages & Boundary Math
  // ==========================================================================
  describe('Suite 1: Extreme Hydration Percentages & Boundary Math', () => {
    it('1.1: 0% Hydration — renders barren planet basalt state with 0% fill', () => {
      render(<CosmicWaterPlanet currentMl={0} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('0');
      expect(screen.getByText('Tinh cầu cằn cỗi (0%)')).toBeDefined();
      expect(screen.getByText('0%')).toBeDefined();

      const planet = screen.getByTestId('cosmic-water-planet');
      expect(planet.className).toContain('shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]');
      expect(planet.className).not.toContain('ring-4');

      const chibi = screen.getByTestId('voyager-chibi-container');
      expect(chibi.getAttribute('data-expression')).toBe('idle');
    });

    it('1.2: 1% Hydration — initiates ocean water level at minimal non-zero boundary', () => {
      render(<CosmicWaterPlanet currentMl={20} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('1');
      expect(screen.getByText('Nguồn nước khởi tạo')).toBeDefined();
      expect(screen.getByText('1%')).toBeDefined();

      const planet = screen.getByTestId('cosmic-water-planet');
      expect(planet.className).toContain('shadow-[0_0_20px_rgba(56,189,248,0.35)]');
    });

    it('1.3: 50% Hydration — renders midway rising ocean reservoir with waves', () => {
      render(<CosmicWaterPlanet currentMl={1000} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('50');
      expect(screen.getByText('Đại dương dâng tràn')).toBeDefined();
      expect(screen.getByText('50%')).toBeDefined();

      const anchor = screen.getByTestId('floating-chibi-anchor');
      expect(anchor.getAttribute('style')).toContain('calc(50% - 28px)');
      expect(anchor.getAttribute('style')).toContain('16px');
      expect(anchor.getAttribute('style')).toContain('calc(100% - 116px)');
    });

    it('1.4: 99% Hydration — approaches near-target threshold while remaining in pre-target state', () => {
      render(<CosmicWaterPlanet currentMl={1980} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('99');
      expect(screen.getByText('Gần chạm ngưỡng đích')).toBeDefined();
      expect(screen.getByText('99%')).toBeDefined();

      const chibi = screen.getByTestId('voyager-chibi-container');
      expect(chibi.getAttribute('data-expression')).toBe('idle');
    });

    it('1.5: 100% Hydration — unlocks super-habitable ocean state, corona glow, and happy Chibi', () => {
      render(<CosmicWaterPlanet currentMl={2000} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('100');
      expect(screen.getByText('Hành tinh đại dương hoàn hảo (100%)')).toBeDefined();
      expect(screen.getByText('100%')).toBeDefined();

      const planet = screen.getByTestId('cosmic-water-planet');
      expect(planet.className).toContain('ring-4 ring-sky-400/60');
      expect(planet.className).toContain('shadow-[0_0_35px_rgba(56,189,248,0.7),0_0_70px_rgba(129,140,248,0.4)]');

      const chibi = screen.getByTestId('voyager-chibi-container');
      expect(chibi.getAttribute('data-expression')).toBe('happy');
    });

    it('1.6: 250% Hydration (Over-achievement) — clamps visual height to 100% while retaining aura', () => {
      render(<CosmicWaterPlanet currentMl={5000} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('100');
      expect(screen.getByText('Hành tinh đại dương hoàn hảo (100%)')).toBeDefined();

      const chibi = screen.getByTestId('voyager-chibi-container');
      expect(chibi.getAttribute('data-expression')).toBe('happy');
      // Chibi wrapper includes aura ring
      const avatarFrame = chibi.querySelector('.aspect-square');
      expect(avatarFrame?.className).toContain('ring-2 ring-yellow-400');
    });

    it('1.7: 1000% Hydration (Extreme flood) — strictly preserves max bounds without layout overflow', () => {
      render(<CosmicWaterPlanet currentMl={20000} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('100');

      const anchor = screen.getByTestId('floating-chibi-anchor');
      expect(anchor.getAttribute('style')).toContain('calc(100% - 28px)');
      expect(anchor.getAttribute('style')).toContain('calc(100% - 116px)');
    });

    it('1.8: Negative Hydration (-500ml) — clamps safely to 0% without negative dimensions', () => {
      render(<CosmicWaterPlanet currentMl={-500} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('0');
      expect(screen.getByText('Tinh cầu cằn cỗi (0%)')).toBeDefined();
    });

    it('1.9: Division-by-zero protection (goalMl = 0) — safely yields 0% without NaN or Infinity', () => {
      render(<CosmicWaterPlanet currentMl={500} goalMl={0} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('0');
      expect(screen.getByText('Tinh cầu cằn cỗi (0%)')).toBeDefined();
    });

    it('1.10: Negative goal (goalMl = -2000) — safely yields 0% without crashing', () => {
      render(<CosmicWaterPlanet currentMl={500} goalMl={-2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('0');
    });

    it('1.11: WaveTank wrapper seamless backward-compatibility across extreme values', () => {
      const { rerender } = render(<WaveTank currentMl={0} goalMl={1500} />);
      expect(screen.getByTestId('wave-tank-container').getAttribute('data-fill-percent')).toBe('0');

      rerender(<WaveTank currentMl={1500} goalMl={1500} />);
      expect(screen.getByTestId('wave-tank-container').getAttribute('data-fill-percent')).toBe('100');

      rerender(<WaveTank currentMl={3000} goalMl={1500} />);
      expect(screen.getByTestId('wave-tank-container').getAttribute('data-fill-percent')).toBe('100');
    });

    it('1.12: NaN inputs (currentMl=NaN or goalMl=NaN) evaluation without crashing React tree', () => {
      // Testing currentMl = NaN
      const { rerender } = render(<CosmicWaterPlanet currentMl={NaN} goalMl={2000} />);
      expect(screen.getByTestId('wave-tank-container')).toBeDefined();

      // Testing goalMl = NaN
      rerender(<CosmicWaterPlanet currentMl={500} goalMl={NaN} />);
      expect(screen.getByTestId('wave-tank-container')).toBeDefined();
    });
  });

  // ==========================================================================
  // SUITE 2: Quick Drink Stress, Rapid Spam & Timer Debounce
  // ==========================================================================
  describe('Suite 2: Quick Drink Stress, Rapid Spam & Timer Debounce', () => {
    it('2.1: Rapid sequential drink logging (50 clicks) maintains drinking state with debounced timer', async () => {
      vi.useFakeTimers();

      render(
        <ControlledTodayTab
          initialMl={0}
          goalMl={15000}
          streak={3}
          weather={mockWeather}
          userProfile={mockProfile}
          settings={DEFAULT_SETTINGS}
        />
      );

      const btn50 = screen.getByTestId('quick-drink-50');

      // Rapidly fire 50 sequential clicks
      for (let i = 0; i < 50; i++) {
        act(() => {
          fireEvent.click(btn50);
        });
      }

      // During the spam, Chibi must be in 'drinking' expression
      const chibi = screen.getByTestId('voyager-chibi-container');
      expect(chibi.getAttribute('data-expression')).toBe('drinking');
      expect(screen.getByTestId('expression-drinking')).toBeDefined();

      // Advance by 2400ms (within 2500ms debounce) — still drinking
      act(() => {
        vi.advanceTimersByTime(2400);
      });
      expect(chibi.getAttribute('data-expression')).toBe('drinking');

      // Advance past the 2500ms threshold (total 2600ms) — reverts to idle
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(chibi.getAttribute('data-expression')).toBe('idle');
      expect(screen.queryByTestId('expression-drinking')).toBeNull();

      vi.useRealTimers();
    });

    it('2.2: Timer cleanup on unmount prevents memory leaks and stale state updates', () => {
      vi.useFakeTimers();

      const { unmount } = render(
        <TodayTab
          currentMl={200}
          goalMl={2000}
          userProfile={mockProfile}
          settings={DEFAULT_SETTINGS}
        />
      );

      // Trigger drinking timer
      const btn250 = screen.getByTestId('quick-drink-250');
      act(() => {
        fireEvent.click(btn250);
      });

      // Unmount while timer is ticking
      unmount();

      // Advance timers by 5000ms past the timer duration
      expect(() => {
        act(() => {
          vi.advanceTimersByTime(5000);
        });
      }).not.toThrow();

      vi.useRealTimers();
    });

    it('2.3: Goal crossing (99% -> 100%) during rapid drinking triggers celebration and switches to happy', async () => {
      vi.useFakeTimers();

      render(
        <ControlledTodayTab
          initialMl={1900}
          goalMl={2000}
          weather={mockWeather}
          userProfile={mockProfile}
          settings={DEFAULT_SETTINGS}
        />
      );

      const btn150 = screen.getByTestId('quick-drink-150');

      // Click +150ml: 1900 -> 2050ml (crosses 2000ml goal)
      act(() => {
        fireEvent.click(btn150);
      });

      // Confetti & audio fanfare must be triggered
      expect(confetti).toHaveBeenCalled();
      expect(playGoalCelebrationFanfare).toHaveBeenCalled();

      // Chibi must switch immediately to 'happy' (Priority 2)
      const chibi = screen.getByTestId('voyager-chibi-container');
      expect(chibi.getAttribute('data-expression')).toBe('happy');
      expect(screen.getByTestId('expression-happy')).toBeDefined();

      // After 3000ms, chibi must REMAIN 'happy' (not revert to idle)
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(chibi.getAttribute('data-expression')).toBe('happy');

      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // SUITE 3: Expression Matrix, Transitions & Hierarchy
  // ==========================================================================
  describe('Suite 3: Expression Matrix, Transitions & Hierarchy', () => {
    it('3.1: Sanitizes all valid and invalid expression strings to valid enums', () => {
      expect(sanitizeExpression('idle')).toBe('idle');
      expect(sanitizeExpression('happy')).toBe('happy');
      expect(sanitizeExpression('sleeping')).toBe('sleeping');
      expect(sanitizeExpression('gentle')).toBe('gentle');
      expect(sanitizeExpression('strict')).toBe('strict');
      expect(sanitizeExpression('drinking')).toBe('drinking');

      // Invalid inputs fallback to 'idle'
      expect(sanitizeExpression(null)).toBe('idle');
      expect(sanitizeExpression(undefined)).toBe('idle');
      expect(sanitizeExpression('')).toBe('idle');
      expect(sanitizeExpression('angry')).toBe('idle');
      expect(sanitizeExpression('crying')).toBe('idle');
      expect(sanitizeExpression('xyz123')).toBe('idle');
    });

    it('3.2: Resolves correct avatar image paths for all 6 expressions', () => {
      expect(VOYAGER_EXPRESSION_IMAGES.drinking).toBe('/assets/character/voyager_drinking.png');
      expect(resolveAvatarSrc(null, 'idle')).toBe('/assets/character/voyager_base.png');
      expect(resolveAvatarSrc(null, 'happy')).toBe('/assets/character/voyager_happy.png');
      expect(resolveAvatarSrc(null, 'sleeping')).toBe('/assets/character/voyager_sleeping.png');
      expect(resolveAvatarSrc(null, 'drinking')).toBe('/assets/character/voyager_drinking.png');
      expect(resolveAvatarSrc(null, 'gentle')).toBe('/assets/character/voyager_gentle.png');
      expect(resolveAvatarSrc(null, 'strict')).toBe('/assets/character/voyager_strict.png');

      // Custom URL overrides built-in expressions
      expect(resolveAvatarSrc('https://example.com/custom.png', 'happy')).toBe(
        'https://example.com/custom.png'
      );
    });

    it('3.3: Renders SleepingOverlay without dark obscuring sheet or heavy blur', () => {
      const { container } = render(<VoyagerChibi expression="sleeping" />);
      expect(screen.getByTestId('expression-sleeping')).toBeDefined();
      expect(screen.getByText('Zzz')).toBeDefined();
      expect(screen.getByText('z')).toBeDefined();

      // Assert that dark sheet (bg-indigo-950/60) and blur are absent
      expect(container.querySelector('.bg-indigo-950\\/60')).toBeNull();
      expect(container.querySelector('.backdrop-blur-\\[1px\\]')).toBeNull();
    });

    it('3.4: Renders DrinkingOverlay with animated water droplets and blush', () => {
      render(<VoyagerChibi expression="drinking" />);
      expect(screen.getByTestId('expression-drinking')).toBeDefined();
      expect(screen.getByText('💧')).toBeDefined();
      expect(screen.getByText('✧')).toBeDefined();
      expect(screen.getByText('✦')).toBeDefined();

      const container = screen.getByTestId('voyager-chibi-container');
      expect(container.querySelector('.animate-bounce')).toBeDefined();
    });

    it('3.5: Strict 4-Tier Mood Hierarchy: Quiet Hours (sleeping) trumps drinking and goal', () => {
      render(
        <TodayTab
          currentMl={3000}
          goalMl={2000}
          isQuietNow={true}
          weather={mockWeather}
          userProfile={mockProfile}
          settings={DEFAULT_SETTINGS}
        />
      );

      // Even though currentMl (3000) >= goalMl (2000), quiet hours takes priority
      const chibi = screen.getByTestId('voyager-chibi-container');
      expect(chibi.getAttribute('data-expression')).toBe('sleeping');
      expect(screen.getByTestId('expression-sleeping')).toBeDefined();
      expect(screen.queryByTestId('expression-happy')).toBeNull();
    });

    it('3.6: Strict 4-Tier Mood Hierarchy: Goal achievement (happy) trumps transient drinking', () => {
      render(
        <TodayTab
          currentMl={2000}
          goalMl={2000}
          isQuietNow={false}
          weather={mockWeather}
          userProfile={mockProfile}
          settings={DEFAULT_SETTINGS}
        />
      );

      // Reaching goal makes chibi happy
      const chibi = screen.getByTestId('voyager-chibi-container');
      expect(chibi.getAttribute('data-expression')).toBe('happy');

      // Logging additional drink retains happy (does not drop to drinking)
      const btn50 = screen.getByTestId('quick-drink-50');
      act(() => {
        fireEvent.click(btn50);
      });
      expect(chibi.getAttribute('data-expression')).toBe('happy');
    });

    it('3.7: Speech text truncation and formatting (formatSpeech helper)', () => {
      expect(formatSpeech(null)).toBeNull();
      expect(formatSpeech('')).toBeNull();
      expect(formatSpeech('   ')).toBeNull();
      expect(formatSpeech('Uống nước nhé!')).toBe('Uống nước nhé!');

      // Truncates long strings > 80 chars
      const longText = 'A'.repeat(90);
      const formatted = formatSpeech(longText);
      expect(formatted?.length).toBe(80);
      expect(formatted?.endsWith('...')).toBe(true);
    });
  });
});
