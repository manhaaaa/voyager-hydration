// @vitest-environment jsdom
/**
 * Empirical Stress & Adversarial Test Harness: challengerM6Stress3.test.tsx
 * Milestone 6 Iteration 2: Empirical Challenge: NaN Guards, Boundary Hydration & Volume Readout
 *
 * Specific Verification Objectives:
 * 1. Verify NaN and non-finite inputs to currentMl or goalMl in CosmicWaterPlanet.tsx
 *    do NOT emit console warnings/errors and resolve safely to 0%.
 * 2. Verify visual clamping at 100% on extreme over-consumption while numerical readout
 *    displays true un-clamped volume in TodayTab.
 * 3. Matrix of edge values: Infinity, -Infinity, NaN, negative, zero, sub-percentages,
 *    and multi-liter over-consumption under both 'L' and 'ml' unit settings.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import CosmicWaterPlanet from '../../src/components/CosmicWaterPlanet';
import TodayTab from '../../src/tabs/TodayTab';
import { DEFAULT_USER_PROFILE, DEFAULT_SETTINGS } from '../../src/utils/storageEngine';
import type { WeatherData, UserProfile } from '../../src/types';

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

vi.mock('../../src/utils/audioEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/audioEngine')>();
  return {
    ...actual,
    playQuickTap: vi.fn(),
    playGoalCelebrationFanfare: vi.fn().mockResolvedValue(undefined),
  };
});

describe('Challenger M6 It2 Empirical Verification Suite: NaN Guards & Volume Clamping', () => {
  let warnSpy: any;
  let errorSpy: any;

  const mockWeather: WeatherData = {
    temperature: 26,
    humidity: 60,
    weatherCode: 1,
    bonusMl: 0,
    locationName: 'Hà Nội',
    isFallback: false,
    timestamp: Date.now(),
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    warnSpy = vi.spyOn(console, 'warn');
    errorSpy = vi.spyOn(console, 'error');
  });

  afterEach(() => {
    cleanup();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    localStorage.clear();
  });

  // ==========================================================================
  // 1. NaN and Non-Finite Input Matrix Verification (CosmicWaterPlanet)
  // ==========================================================================
  describe('1. NaN and Non-Finite Input Matrix Verification', () => {
    const invalidInputCases = [
      { name: 'currentMl is NaN', currentMl: NaN, goalMl: 2000 },
      { name: 'goalMl is NaN', currentMl: 1000, goalMl: NaN },
      { name: 'both currentMl and goalMl are NaN', currentMl: NaN, goalMl: NaN },
      { name: 'currentMl is positive Infinity', currentMl: Infinity, goalMl: 2000 },
      { name: 'currentMl is negative Infinity', currentMl: -Infinity, goalMl: 2000 },
      { name: 'goalMl is positive Infinity', currentMl: 1000, goalMl: Infinity },
      { name: 'goalMl is negative Infinity', currentMl: 1000, goalMl: -Infinity },
      { name: 'both are Infinity', currentMl: Infinity, goalMl: Infinity },
      { name: 'both are negative Infinity', currentMl: -Infinity, goalMl: -Infinity },
      { name: 'currentMl is positive Infinity, goalMl is negative Infinity', currentMl: Infinity, goalMl: -Infinity },
      { name: 'goalMl is zero', currentMl: 1000, goalMl: 0 },
      { name: 'goalMl is negative zero (-0)', currentMl: 1000, goalMl: -0 },
      { name: 'goalMl is negative number (-2000)', currentMl: 1000, goalMl: -2000 },
      { name: 'currentMl is undefined (runtime cast)', currentMl: undefined as any, goalMl: 2000 },
      { name: 'goalMl is null (runtime cast)', currentMl: 1000, goalMl: null as any },
    ];

    invalidInputCases.forEach(({ name, currentMl, goalMl }) => {
      it(`evaluates safely to 0% with ZERO console warnings/errors when: ${name}`, () => {
        const { unmount } = render(
          <CosmicWaterPlanet currentMl={currentMl} goalMl={goalMl} />
        );

        // Verify container data-fill-percent is strictly string '0'
        const container = screen.getByTestId('wave-tank-container');
        expect(container.getAttribute('data-fill-percent')).toBe('0');

        // Verify textual readout in the status pill
        expect(screen.getByText('Tinh cầu cằn cỗi (0%)')).toBeDefined();
        expect(screen.getByText('0%')).toBeDefined();

        // Verify Chibi mood does not crash and defaults to idle
        const chibi = screen.getByTestId('voyager-chibi-container');
        expect(chibi.getAttribute('data-expression')).toBe('idle');

        // Verify planet visuals reflect dry basalt state
        const planet = screen.getByTestId('cosmic-water-planet');
        expect(planet.className).toContain('shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]');
        expect(planet.className).not.toContain('ring-4');

        // Strictly verify NO React or DOM warnings/errors were emitted
        const reactFillPercentWarnings = warnSpy.mock.calls.filter((call: any[]) =>
          call.some((arg) => typeof arg === 'string' && (arg.includes('data-fill-percent') || arg.includes('NaN')))
        );
        expect(reactFillPercentWarnings.length).toBe(0);

        const reactErrors = errorSpy.mock.calls.filter((call: any[]) =>
          call.some((arg) => typeof arg === 'string' && (arg.includes('NaN') || arg.includes('Error')))
        );
        expect(reactErrors.length).toBe(0);

        unmount();
      });
    });

    it('safely respects quiet hours mood even with NaN inputs', () => {
      render(<CosmicWaterPlanet currentMl={NaN} goalMl={NaN} isQuietNow={true} />);

      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('0');

      const chibi = screen.getByTestId('voyager-chibi-container');
      expect(chibi.getAttribute('data-expression')).toBe('sleeping');
    });

    it('safely respects caller-provided voyagerExpression even with NaN inputs', () => {
      render(
        <CosmicWaterPlanet
          currentMl={NaN}
          goalMl={NaN}
          voyagerExpression="drinking"
          isQuietNow={true}
        />
      );

      const chibi = screen.getByTestId('voyager-chibi-container');
      expect(chibi.getAttribute('data-expression')).toBe('drinking');
    });
  });

  // ==========================================================================
  // 2. Extreme Over-Consumption: Visual Clamping vs True Numerical Readout
  // ==========================================================================
  describe('2. Extreme Over-Consumption: Visual Clamping vs True Numerical Readout', () => {
    const overConsumptionCases = [
      { consumedMl: 2000, goalMl: 2000, expectedVisual: '100', expectedL: '2,0 L', expectedMl: '2000 ml' },
      { consumedMl: 2500, goalMl: 2000, expectedVisual: '100', expectedL: '2,5 L', expectedMl: '2500 ml' },
      { consumedMl: 3000, goalMl: 2000, expectedVisual: '100', expectedL: '3,0 L', expectedMl: '3000 ml' },
      { consumedMl: 5000, goalMl: 2000, expectedVisual: '100', expectedL: '5,0 L', expectedMl: '5000 ml' },
      { consumedMl: 10000, goalMl: 2000, expectedVisual: '100', expectedL: '10,0 L', expectedMl: '10000 ml' },
      { consumedMl: 50000, goalMl: 2000, expectedVisual: '100', expectedL: '50,0 L', expectedMl: '50000 ml' },
      { consumedMl: 1000000, goalMl: 2000, expectedVisual: '100', expectedL: '1000,0 L', expectedMl: '1000000 ml' },
    ];

    overConsumptionCases.forEach(({ consumedMl, goalMl, expectedVisual, expectedL, expectedMl }) => {
      it(`verifies visual clamping at 100% while displaying true un-clamped volume for ${consumedMl}ml (L unit)`, () => {
        const profileL: UserProfile = {
          ...DEFAULT_USER_PROFILE,
          unit: 'L',
        };

        const { unmount } = render(
          <TodayTab
            currentMl={consumedMl}
            goalMl={goalMl}
            userProfile={profileL}
            settings={DEFAULT_SETTINGS}
            weather={mockWeather}
          />
        );

        // 1. Numerical readout MUST show TRUE un-clamped volume
        const consumedElement = screen.getByTestId('consumed-volume');
        expect(consumedElement.textContent).toBe(expectedL);

        const goalElement = screen.getByTestId('goal-volume');
        expect(goalElement.textContent).toBe('2,0 L');

        // 2. Visual reservoir container MUST be clamped to 100%
        const tank = screen.getByTestId('wave-tank-container');
        expect(tank.getAttribute('data-fill-percent')).toBe(expectedVisual);

        // 3. Status text in CosmicWaterPlanet displays 100%
        expect(screen.getByText('Hành tinh đại dương hoàn hảo (100%)')).toBeDefined();

        // 4. Deficit prompt confirms completion
        expect(screen.getByTestId('deficit-prompt').textContent).toBe('Mục tiêu hoàn thành! Xuất sắc 🎉');

        // 5. Chibi expression is celebratory 'happy'
        const chibi = screen.getByTestId('voyager-chibi-container');
        expect(chibi.getAttribute('data-expression')).toBe('happy');

        unmount();
      });

      it(`verifies visual clamping at 100% while displaying true un-clamped volume for ${consumedMl}ml (ml unit)`, () => {
        const profileMl: UserProfile = {
          ...DEFAULT_USER_PROFILE,
          unit: 'ml',
        };

        const { unmount } = render(
          <TodayTab
            currentMl={consumedMl}
            goalMl={goalMl}
            userProfile={profileMl}
            settings={{ ...DEFAULT_SETTINGS, unit: 'ml' }}
            weather={mockWeather}
          />
        );

        // 1. Numerical readout MUST show TRUE un-clamped volume in ml
        const consumedElement = screen.getByTestId('consumed-volume');
        expect(consumedElement.textContent).toBe(expectedMl);

        const goalElement = screen.getByTestId('goal-volume');
        expect(goalElement.textContent).toBe('2000 ml');

        // 2. Visual reservoir container MUST be clamped to 100%
        const tank = screen.getByTestId('wave-tank-container');
        expect(tank.getAttribute('data-fill-percent')).toBe(expectedVisual);

        unmount();
      });
    });

    it('verifies CosmicWaterPlanet internal ocean element height does not exceed 100%', () => {
      const { container } = render(
        <CosmicWaterPlanet currentMl={100000} goalMl={2000} />
      );

      // Find the liquid ocean reservoir inside planet
      const oceanBody = container.querySelector('[style*="height: 100%"]');
      expect(oceanBody).not.toBeNull();

      // Ensure no style has height > 100% (e.g. "5000%")
      const blownOutElement = container.querySelector('[style*="height: 5000%"]');
      expect(blownOutElement).toBeNull();

      // Floating Chibi anchor bottom offset is safely clamped
      const anchor = screen.getByTestId('floating-chibi-anchor');
      expect(anchor.getAttribute('style')).toContain('calc(100% - 116px)');
    });
  });

  // ==========================================================================
  // 3. Sub-Percentage and Rounding Boundary Verification
  // ==========================================================================
  describe('3. Sub-Percentage and Rounding Boundary Verification', () => {
    it('rounds sub-percentage hydration predictably at 0.5% threshold', () => {
      // 9ml out of 2000ml = 0.45% -> Math.round is 0%
      const { rerender } = render(<CosmicWaterPlanet currentMl={9} goalMl={2000} />);
      expect(screen.getByTestId('wave-tank-container').getAttribute('data-fill-percent')).toBe('0');
      expect(screen.getByText('Tinh cầu cằn cỗi (0%)')).toBeDefined();

      // 10ml out of 2000ml = 0.50% -> Math.round is 1%
      rerender(<CosmicWaterPlanet currentMl={10} goalMl={2000} />);
      expect(screen.getByTestId('wave-tank-container').getAttribute('data-fill-percent')).toBe('1');
      expect(screen.getByText('Nguồn nước khởi tạo')).toBeDefined();

      // 1989ml out of 2000ml = 99.45% -> Math.round is 99%
      rerender(<CosmicWaterPlanet currentMl={1989} goalMl={2000} />);
      expect(screen.getByTestId('wave-tank-container').getAttribute('data-fill-percent')).toBe('99');
      expect(screen.getByText('Gần chạm ngưỡng đích')).toBeDefined();

      // 1990ml out of 2000ml = 99.50% -> Math.round is 100%
      rerender(<CosmicWaterPlanet currentMl={1990} goalMl={2000} />);
      expect(screen.getByTestId('wave-tank-container').getAttribute('data-fill-percent')).toBe('100');
      expect(screen.getByText('Hành tinh đại dương hoàn hảo (100%)')).toBeDefined();
    });
  });
});
