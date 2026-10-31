// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TodayTab from '../../src/tabs/TodayTab';
import CosmicWaterPlanet from '../../src/components/CosmicWaterPlanet';
import { VOYAGER_EXPRESSION_IMAGES } from '../../src/components/VoyagerChibi';
import { DEFAULT_USER_PROFILE, DEFAULT_SETTINGS } from '../../src/utils/storageEngine';

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

describe('Milestone 6 Empirical Challenge: Quiet Hours, Star Buoy & Metrics', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Quiet Hours & Bedtime Empirical Challenge', () => {
    it('1.1 verifies Voyager displays serene sleeping illustration without dark overlay or blur veil', () => {
      const { container } = render(
        <TodayTab
          currentMl={500}
          goalMl={2000}
          isQuietNow={true}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );

      const chibiContainer = screen.getByTestId('voyager-chibi-container');
      expect(chibiContainer.getAttribute('data-expression')).toBe('sleeping');

      // Verify serene sleeping illustration is referenced
      const avatarImg = chibiContainer.querySelector('img');
      expect(avatarImg).not.toBeNull();
      expect(avatarImg?.getAttribute('src')).toBe(VOYAGER_EXPRESSION_IMAGES.sleeping);

      // Verify no dark face-obscuring overlay or blur sheet
      expect(container.querySelector('.bg-indigo-950\\/60')).toBeNull();
      expect(container.querySelector('.backdrop-blur-\\[1px\\]')).toBeNull();
      expect(screen.getByTestId('expression-sleeping')).toBeDefined();
    });

    it('1.2 checks whether logging water during quiet hours triggers drinking interaction and returns to quiet state', () => {
      vi.useFakeTimers();

      render(
        <TodayTab
          currentMl={500}
          goalMl={2000}
          isQuietNow={true}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );

      const chibiContainer = screen.getByTestId('voyager-chibi-container');
      expect(chibiContainer.getAttribute('data-expression')).toBe('sleeping');

      // Log 150ml intake during quiet hours
      const btn150 = screen.getByTestId('quick-drink-150');
      act(() => {
        fireEvent.click(btn150);
      });

      // EMPIRICAL OBSERVATION & ASSERTION:
      // Does logging water during quiet hours trigger the drinking interaction?
      const moodDuringDrinking = chibiContainer.getAttribute('data-expression');
      console.log('Chibi expression immediately after logging drink during quiet hours:', moodDuringDrinking);

      // Advance timer by 2600ms (timer duration is 2500ms)
      act(() => {
        vi.advanceTimersByTime(2600);
      });

      const moodAfterTimerExpires = chibiContainer.getAttribute('data-expression');
      console.log('Chibi expression after drinking timer expires during quiet hours:', moodAfterTimerExpires);

      // Verify prompt requirement: logging water during quiet hours triggers drinking interaction
      // without breaking quiet hours state when the timer expires.
      expect(moodDuringDrinking).toBe('drinking');
      expect(moodAfterTimerExpires).toBe('sleeping');
    });
  });

  describe('2. Star Buoy, Percentage Clamping & Volume Metrics', () => {
    it('2.1 numerical display accurately shows actual volume even over 100% while reservoir fill clamps at 100%', () => {
      const { rerender } = render(
        <TodayTab
          currentMl={1000}
          goalMl={2000}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );

      // At 50%
      expect(screen.getByTestId('consumed-volume').textContent).toBe('1,0 L');
      expect(screen.getByTestId('goal-volume').textContent).toBe('2,0 L');
      expect(screen.getByTestId('wave-tank-container').getAttribute('data-fill-percent')).toBe('50');

      // At 100%
      rerender(
        <TodayTab
          currentMl={2000}
          goalMl={2000}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );
      expect(screen.getByTestId('consumed-volume').textContent).toBe('2,0 L');
      expect(screen.getByTestId('goal-volume').textContent).toBe('2,0 L');
      expect(screen.getByTestId('wave-tank-container').getAttribute('data-fill-percent')).toBe('100');

      // At 150% (3000ml / 2000ml)
      rerender(
        <TodayTab
          currentMl={3000}
          goalMl={2000}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );
      // Volume readout MUST show actual volume (3,0 L), NOT clamped to 2,0 L
      expect(screen.getByTestId('consumed-volume').textContent).toBe('3,0 L');
      expect(screen.getByTestId('goal-volume').textContent).toBe('2,0 L');
      // Wave tank fill percent MUST clamp cleanly at 100%
      expect(screen.getByTestId('wave-tank-container').getAttribute('data-fill-percent')).toBe('100');

      // At 250% (5000ml / 2000ml)
      rerender(
        <TodayTab
          currentMl={5000}
          goalMl={2000}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );
      expect(screen.getByTestId('consumed-volume').textContent).toBe('5,0 L');
      expect(screen.getByTestId('goal-volume').textContent).toBe('2,0 L');
      expect(screen.getByTestId('wave-tank-container').getAttribute('data-fill-percent')).toBe('100');
    });

    it('2.2 Star Buoy is anchored at 100% target orbit line', () => {
      render(
        <CosmicWaterPlanet
          currentMl={750}
          goalMl={2000}
        />
      );

      const buoy = screen.getByTestId('star-buoy');
      expect(buoy).toBeDefined();
      expect(screen.getByText('100% Mục tiêu')).toBeDefined();
    });

    it('2.3 deficit prompt accurately decrements cups and switches to complete state at 100%', () => {
      const { rerender } = render(
        <TodayTab
          currentMl={0}
          goalMl={2000}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );

      // 2000ml goal, 0 consumed -> 2000 / 250 = 8 cups
      expect(screen.getByTestId('deficit-prompt').textContent).toBe('Thêm 8 ly >');

      // Drink 250ml -> 1750 deficit -> 7 cups
      rerender(
        <TodayTab
          currentMl={250}
          goalMl={2000}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );
      expect(screen.getByTestId('deficit-prompt').textContent).toBe('Thêm 7 ly >');

      // Drink to 1900ml -> 100ml deficit -> 1 cup (ceil(100/250) = 1)
      rerender(
        <TodayTab
          currentMl={1900}
          goalMl={2000}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );
      expect(screen.getByTestId('deficit-prompt').textContent).toBe('Thêm 1 ly >');

      // Reaching exactly 2000ml -> 0 cups deficit -> Complete prompt
      rerender(
        <TodayTab
          currentMl={2000}
          goalMl={2000}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );
      expect(screen.getByTestId('deficit-prompt').textContent).toBe('Mục tiêu hoàn thành! Xuất sắc 🎉');

      // Exceeding goal (2500ml) -> stays in complete prompt
      rerender(
        <TodayTab
          currentMl={2500}
          goalMl={2000}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );
      expect(screen.getByTestId('deficit-prompt').textContent).toBe('Mục tiêu hoàn thành! Xuất sắc 🎉');
    });

    it('2.4 deficit prompt click logs 250ml intake when deficit > 0, and is disabled when complete', () => {
      const onLogDrinkMock = vi.fn();

      const { rerender } = render(
        <TodayTab
          currentMl={1500}
          goalMl={2000}
          onLogDrink={onLogDrinkMock}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );

      const promptBtn = screen.getByTestId('deficit-prompt');
      expect(promptBtn.textContent).toBe('Thêm 2 ly >');

      // Clicking deficit prompt should log 250ml
      fireEvent.click(promptBtn);
      expect(onLogDrinkMock).toHaveBeenCalledWith(250);

      // Once complete (2000ml), clicking should NOT log further intake
      onLogDrinkMock.mockClear();
      rerender(
        <TodayTab
          currentMl={2000}
          goalMl={2000}
          onLogDrink={onLogDrinkMock}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );
      fireEvent.click(promptBtn);
      expect(onLogDrinkMock).not.toHaveBeenCalled();
    });
  });

  describe('3. Custom Drink Modal during Quiet Hours & Interactions', () => {
    it('3.1 custom input submits and logs custom amount', () => {
      const onLogDrinkMock = vi.fn();

      render(
        <TodayTab
          currentMl={500}
          goalMl={2000}
          onLogDrink={onLogDrinkMock}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );

      // Open custom intake modal
      fireEvent.click(screen.getByTestId('custom-drink-button'));
      expect(screen.getByTestId('custom-intake-modal')).toBeDefined();

      // Click preset chip 330ml
      fireEvent.click(screen.getByText('330ml'));

      // Submit
      fireEvent.click(screen.getByText('Xác nhận'));

      expect(onLogDrinkMock).toHaveBeenCalledWith(330);
    });
  });
});
