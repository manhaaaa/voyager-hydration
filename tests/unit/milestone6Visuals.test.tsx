// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CosmicWaterPlanet from '../../src/components/CosmicWaterPlanet';
import WaveTank from '../../src/components/WaveTank';
import VoyagerChibi, {
  sanitizeExpression,
  VOYAGER_EXPRESSION_IMAGES,
  resolveAvatarSrc,
} from '../../src/components/VoyagerChibi';
import TodayTab from '../../src/tabs/TodayTab';
import { DEFAULT_USER_PROFILE, DEFAULT_SETTINGS } from '../../src/utils/storageEngine';

describe('Milestone 6: Cosmic Water Planet & Character Visuals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CosmicWaterPlanet Component', () => {
    it('renders 0% dry barren state correctly', () => {
      render(<CosmicWaterPlanet currentMl={0} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('0');

      const planet = screen.getByTestId('cosmic-water-planet');
      expect(planet).toBeDefined();

      const starBuoy = screen.getByTestId('star-buoy');
      expect(starBuoy).toBeDefined();

      const anchor = screen.getByTestId('floating-chibi-anchor');
      expect(anchor).toBeDefined();

      expect(screen.getByText(/Tinh cầu cằn cỗi/)).toBeDefined();
    });

    it('renders 50% progressive rising ocean state correctly', () => {
      render(<CosmicWaterPlanet currentMl={1000} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('50');
      expect(screen.getByText(/Đại dương dâng tràn/)).toBeDefined();
    });

    it('renders 100% radiant super-habitable state with corona glow', () => {
      render(<CosmicWaterPlanet currentMl={2000} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('100');
      expect(screen.getByText(/Hành tinh đại dương hoàn hảo/)).toBeDefined();

      const chibiContainer = screen.getByTestId('voyager-chibi-container');
      expect(chibiContainer.getAttribute('data-expression')).toBe('happy');
    });

    it('clamps visual fill percent at 100 on over-achievement', () => {
      render(<CosmicWaterPlanet currentMl={4000} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('100');
    });

    it('handles zero or negative goal safely without crashing', () => {
      render(<CosmicWaterPlanet currentMl={500} goalMl={0} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('0');
    });
  });

  describe('WaveTank Backward-Compatibility Wrapper', () => {
    it('seamlessly proxies props and test IDs to CosmicWaterPlanet', () => {
      render(<WaveTank currentMl={1500} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('75');
      expect(screen.getByTestId('star-buoy')).toBeDefined();
      expect(screen.getByTestId('floating-chibi-anchor')).toBeDefined();
    });
  });

  describe('VoyagerChibi Character & Drinking Expression', () => {
    it('sanitizes and maps drinking expression correctly', () => {
      expect(sanitizeExpression('drinking')).toBe('drinking');
      expect(VOYAGER_EXPRESSION_IMAGES.drinking).toBe('/assets/character/voyager_drinking.png');
      expect(resolveAvatarSrc(null, 'drinking')).toBe('/assets/character/voyager_drinking.png');
    });

    it('renders drinking overlay with water splash icons', () => {
      render(<VoyagerChibi expression="drinking" />);
      const container = screen.getByTestId('voyager-chibi-container');
      expect(container.getAttribute('data-expression')).toBe('drinking');
      expect(screen.getByTestId('expression-drinking')).toBeDefined();
      expect(screen.getByText('💧')).toBeDefined();
    });

    it('renders sleeping overlay with Zzz text without dark obscuring veil', () => {
      const { container } = render(<VoyagerChibi expression="sleeping" />);
      expect(screen.getByTestId('expression-sleeping')).toBeDefined();
      expect(screen.getByText('Zzz')).toBeDefined();
      // Ensure dark face-covering veil and center arc are absent
      expect(container.querySelector('.bg-indigo-950\\/60')).toBeNull();
      expect(container.querySelector('.backdrop-blur-\\[1px\\]')).toBeNull();
    });
  });

  describe('TodayTab Integration & Mood Hierarchy', () => {
    it('activates transient drinking state upon logging intake below goal', () => {
      vi.useFakeTimers();

      render(
        <TodayTab
          currentMl={500}
          goalMl={2000}
          streak={5}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );

      const btn150 = screen.getByTestId('quick-drink-150');
      act(() => {
        fireEvent.click(btn150);
      });

      // While drinking, Chibi switches to 'drinking'
      const chibiContainer = screen.getByTestId('voyager-chibi-container');
      expect(chibiContainer.getAttribute('data-expression')).toBe('drinking');
      expect(screen.getByTestId('expression-drinking')).toBeDefined();

      // Fast-forward past transient timeout (2500ms)
      act(() => {
        vi.advanceTimersByTime(2600);
      });

      // Reverts back to idle
      expect(chibiContainer.getAttribute('data-expression')).toBe('idle');

      vi.useRealTimers();
    });

    it('respects quiet hours hierarchy (sleeping) over drinking', () => {
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
      expect(screen.getByTestId('expression-sleeping')).toBeDefined();
    });

    it('respects goal achievement hierarchy (happy) over drinking', () => {
      render(
        <TodayTab
          currentMl={2000}
          goalMl={2000}
          userProfile={DEFAULT_USER_PROFILE}
          settings={DEFAULT_SETTINGS}
        />
      );

      const chibiContainer = screen.getByTestId('voyager-chibi-container');
      expect(chibiContainer.getAttribute('data-expression')).toBe('happy');
      expect(screen.getByTestId('expression-happy')).toBeDefined();
    });
  });
});
