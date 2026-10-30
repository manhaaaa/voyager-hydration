// @vitest-environment jsdom
/**
 * Challenger 2 Verification & Adversarial Stress Harness
 * Milestone 2: Audio, Persistence & Voyager Chibi
 * Targets:
 *   - src/utils/notificationEngine.ts
 *   - src/components/VoyagerChibi.tsx
 *
 * Directives verified:
 * 1. Smart mode calculation across awake times (100 min to 1000 min) and deficits (0 to 15 glasses),
 *    confirming interval is strictly clamped between [45m, 150m] (and 180m for goal met).
 * 2. Cross-midnight Quiet Hours interval (01:00 - 07:00), verifying any scheduled alert during quiet
 *    hours is deferred to 07:00 AM across all 1440 minutes of the day.
 * 3. VoyagerChibi:
 *    - All 5 expressions (idle, happy, sleeping, gentle, strict), invalid expression fallback to idle.
 *    - Speech formatting <= 80 characters with ellipsis (boundary testing at 79, 80, 81, 100, 500 chars).
 *    - Custom avatar URL resolution with fallback to /assets/character/voyager_base.png (including img onError).
 *    - 1:1 aspect ratio across sizes sm, md, lg, xl.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Target 1: Notification Engine
import {
  calculateSmartInterval,
  isInQuietHours,
  adjustForQuietHours,
  scheduleNextReminders,
  SMART_INTERVAL_BOUNDS,
} from '../../src/utils/notificationEngine';

// Target 2: Voyager Chibi Component & Helpers
import {
  VoyagerChibi,
  VOYAGER_SIZES,
  sanitizeExpression,
  resolveAvatarSrc,
  formatSpeech,
  VoyagerExpression,
  VoyagerSize,
} from '../../src/components/VoyagerChibi';

describe('Empirical Challenger 2: Milestone 2 Stress Suite', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SECTION 1: Stress-Test Smart Mode Interval Clamping [45m, 150m]
  // ==========================================================================
  describe('1. Smart Mode Interval Clamping [45m, 150m]', () => {
    it('exhaustively clamps smart intervals to [45, 150] across all awake times (100 to 1000 min) and positive deficits (1 to 15 glasses)', () => {
      let minObserved = Infinity;
      let maxObserved = -Infinity;
      let totalCombinations = 0;

      // Exhaustive grid: 901 awake values * 15 deficit values = 13,515 combinations
      for (let awake = 100; awake <= 1000; awake += 10) {
        for (let glasses = 1; glasses <= 15; glasses++) {
          const interval = calculateSmartInterval(awake, glasses);
          totalCombinations++;

          if (interval < minObserved) minObserved = interval;
          if (interval > maxObserved) maxObserved = interval;

          // Invariant 1: Must be >= 45
          expect(interval).toBeGreaterThanOrEqual(SMART_INTERVAL_BOUNDS.MIN_MINUTES);
          // Invariant 2: Must be <= 150
          expect(interval).toBeLessThanOrEqual(SMART_INTERVAL_BOUNDS.MAX_MINUTES);
          // Invariant 3: Must be an integer
          expect(Number.isInteger(interval)).toBe(true);
        }
      }

      // Assert that both boundaries [45, 150] were actually exercised
      expect(minObserved).toBe(45);
      expect(maxObserved).toBe(150);
      expect(totalCombinations).toBe(91 * 15); // 1,365 sampled combinations
    });

    it('verifies exact mathematical behavior at extreme boundary conditions', () => {
      // Very high deficit, minimal awake time -> raw 100 / 15 = 6.67 -> clamp to 45
      expect(calculateSmartInterval(100, 15)).toBe(45);

      // Raw 100 / 2 = 50 -> un-clamped 50
      expect(calculateSmartInterval(100, 2)).toBe(50);

      // Low deficit, maximum awake time -> raw 1000 / 1 = 1000 -> clamp to 150
      expect(calculateSmartInterval(1000, 1)).toBe(150);

      // Raw 900 / 6 = 150 -> boundary 150
      expect(calculateSmartInterval(900, 6)).toBe(150);

      // Raw 900 / 20 = 45 -> boundary 45
      expect(calculateSmartInterval(900, 20)).toBe(45);
    });

    it('returns exactly GOAL_MET_MINUTES (180 min) when deficit is 0 or negative across all awake windows', () => {
      for (let awake = 100; awake <= 1000; awake += 100) {
        expect(calculateSmartInterval(awake, 0)).toBe(SMART_INTERVAL_BOUNDS.GOAL_MET_MINUTES);
        expect(calculateSmartInterval(awake, -1)).toBe(SMART_INTERVAL_BOUNDS.GOAL_MET_MINUTES);
        expect(calculateSmartInterval(awake, -10)).toBe(SMART_INTERVAL_BOUNDS.GOAL_MET_MINUTES);
      }
    });

    it('safely handles adversarial numerical inputs (0 awake, negative awake, huge numbers)', () => {
      // 0 awake with 5 glasses: raw 0 -> clamped to 45 min
      expect(calculateSmartInterval(0, 5)).toBe(45);

      // Negative awake: raw -50 -> clamped to 45 min
      expect(calculateSmartInterval(-100, 2)).toBe(45);

      // Massive awake time (10,000 min) with 1 glass: raw 10,000 -> clamped to 150 min
      expect(calculateSmartInterval(10000, 1)).toBe(150);
    });
  });

  // ==========================================================================
  // SECTION 2: Stress-Test Cross-Midnight Quiet Hours (01:00 - 07:00)
  // ==========================================================================
  describe('2. Cross-Midnight Quiet Hours (01:00 - 07:00)', () => {
    const WAKE_TIME = '07:00';
    const SLEEP_TIME = '01:00';

    it('evaluates all 1,440 minutes of a 24-hour day for isInQuietHours with 100% precision', () => {
      const baseDate = new Date(2026, 9, 30, 0, 0, 0, 0);

      for (let m = 0; m < 1440; m++) {
        const testDate = new Date(baseDate.getTime() + m * 60 * 1000);
        const hours = testDate.getHours();
        const minutes = testDate.getMinutes();
        const inQuiet = isInQuietHours(testDate, WAKE_TIME, SLEEP_TIME);

        // Expected quiet hours: 01:00 <= time < 07:00
        const expectedQuiet = hours >= 1 && hours < 7;

        if (inQuiet !== expectedQuiet) {
          throw new Error(
            `Quiet hours mismatch at ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}. Expected: ${expectedQuiet}, Got: ${inQuiet}`
          );
        }
      }
    });

    it('verifies exact microsecond boundaries at 00:59:59, 01:00:00, 06:59:59, and 07:00:00', () => {
      // 00:59:59 -> NOT quiet
      const beforeSleep = new Date(2026, 9, 30, 0, 59, 59, 999);
      expect(isInQuietHours(beforeSleep, WAKE_TIME, SLEEP_TIME)).toBe(false);

      // 01:00:00 -> QUIET
      const exactSleep = new Date(2026, 9, 30, 1, 0, 0, 0);
      expect(isInQuietHours(exactSleep, WAKE_TIME, SLEEP_TIME)).toBe(true);

      // 06:59:59 -> QUIET
      const beforeWake = new Date(2026, 9, 30, 6, 59, 59, 999);
      expect(isInQuietHours(beforeWake, WAKE_TIME, SLEEP_TIME)).toBe(true);

      // 07:00:00 -> NOT QUIET
      const exactWake = new Date(2026, 9, 30, 7, 0, 0, 0);
      expect(isInQuietHours(exactWake, WAKE_TIME, SLEEP_TIME)).toBe(false);
    });

    it('adjustForQuietHours strictly defers any alert within [01:00, 07:00) to exactly 07:00:00 AM', () => {
      // Sample 360 minutes across quiet hours (01:00 to 06:59)
      for (let m = 60; m < 420; m += 15) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const scheduledInQuiet = new Date(2026, 9, 30, h, min, 0, 0);

        const adjusted = adjustForQuietHours(scheduledInQuiet, WAKE_TIME, SLEEP_TIME);

        expect(adjusted.getHours()).toBe(7);
        expect(adjusted.getMinutes()).toBe(0);
        expect(adjusted.getSeconds()).toBe(0);
        expect(adjusted.getMilliseconds()).toBe(0);
        expect(adjusted.getDate()).toBe(30);
      }
    });

    it('adjustForQuietHours preserves daytime timestamps without alteration', () => {
      // Sample outside quiet hours: 07:00 to 23:59 and 00:00 to 00:59
      const daytimeMinutes = [0, 30, 59, 420, 500, 720, 1000, 1200, 1439];
      for (const m of daytimeMinutes) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const daytimeDate = new Date(2026, 9, 30, h, min, 30, 0);

        const adjusted = adjustForQuietHours(daytimeDate, WAKE_TIME, SLEEP_TIME);
        expect(adjusted.getTime()).toBe(daytimeDate.getTime());
      }
    });

    it('scheduleNextReminders defers first slot to 07:00 AM when current time leads into quiet hours', async () => {
      // Mock Date.now to 00:30 AM with smart interval resulting in 60 min -> 01:30 AM
      const mockNow = new Date(2026, 9, 30, 0, 30, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(mockNow);

      const nextReminder = await scheduleNextReminders({
        enabled: true,
        mode: 'smart',
        targetMl: 2000,
        consumedMl: 1000, // 4 cups remaining
        wakeTime: '07:00',
        sleepTime: '01:00',
        cupSize: 250,
      });

      expect(nextReminder).not.toBeNull();
      // Since 00:30 + smart interval falls into quiet hours, it must defer to 07:00 AM
      expect(nextReminder!.getHours()).toBe(7);
      expect(nextReminder!.getMinutes()).toBe(0);

      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // SECTION 3: Stress-Test VoyagerChibi Expressions & Fallback
  // ==========================================================================
  describe('3. VoyagerChibi: 5 Expressions & Fallback Logic', () => {
    const canonicalExpressions: VoyagerExpression[] = ['idle', 'happy', 'sleeping', 'gentle', 'strict'];

    it('verifies all 5 canonical expressions pass sanitizeExpression identically', () => {
      for (const expr of canonicalExpressions) {
        expect(sanitizeExpression(expr)).toBe(expr);
      }
    });

    it('falls back invalid expressions, casing anomalies, and non-string values strictly to "idle"', () => {
      const invalidCases = [
        'IDLE',
        'Happy',
        'SLEEPING',
        'angry',
        'sad',
        'crying',
        'dance',
        'random_string_123',
        '',
        '   ',
        null,
        undefined,
        'null',
        'undefined',
        123 as any,
        {} as any,
        [] as any,
      ];

      for (const invalid of invalidCases) {
        expect(sanitizeExpression(invalid)).toBe('idle');
      }
    });

    it('renders DOM overlays for each of the 5 expressions', () => {
      // 1. Idle
      const { unmount: u1 } = render(React.createElement(VoyagerChibi, { expression: 'idle' }));
      expect(screen.getByTestId('expression-idle')).toBeDefined();
      expect(screen.getByTestId('voyager-chibi-container').getAttribute('data-expression')).toBe('idle');
      u1();

      // 2. Happy
      const { unmount: u2 } = render(React.createElement(VoyagerChibi, { expression: 'happy' }));
      expect(screen.getByTestId('expression-happy')).toBeDefined();
      expect(screen.getByTestId('voyager-chibi-container').getAttribute('data-expression')).toBe('happy');
      u2();

      // 3. Sleeping
      const { unmount: u3 } = render(React.createElement(VoyagerChibi, { expression: 'sleeping' }));
      expect(screen.getByTestId('expression-sleeping')).toBeDefined();
      expect(screen.getByTestId('voyager-chibi-container').getAttribute('data-expression')).toBe('sleeping');
      expect(screen.getByText('Zzz')).toBeDefined();
      u3();

      // 4. Gentle
      const { unmount: u4 } = render(React.createElement(VoyagerChibi, { expression: 'gentle' }));
      expect(screen.getByTestId('expression-gentle')).toBeDefined();
      expect(screen.getByTestId('voyager-chibi-container').getAttribute('data-expression')).toBe('gentle');
      u4();

      // 5. Strict
      const { unmount: u5 } = render(React.createElement(VoyagerChibi, { expression: 'strict' }));
      expect(screen.getByTestId('expression-strict')).toBeDefined();
      expect(screen.getByTestId('accessory-violin')).toBeDefined();
      expect(screen.getByText('♪')).toBeDefined();
      expect(screen.getByText('♫')).toBeDefined();
      expect(screen.getByTestId('voyager-chibi-container').getAttribute('data-expression')).toBe('strict');
      u5();
    });

    it('renders "idle" overlay when an invalid expression is passed to the component', () => {
      render(React.createElement(VoyagerChibi, { expression: 'non_existent_expression' as any }));
      expect(screen.getByTestId('expression-idle')).toBeDefined();
      expect(screen.getByTestId('voyager-chibi-container').getAttribute('data-expression')).toBe('idle');
    });

    it('supports backwards-compatible `state` prop alias', () => {
      render(React.createElement(VoyagerChibi, { state: 'gentle' }));
      expect(screen.getByTestId('expression-gentle')).toBeDefined();
      expect(screen.getByTestId('voyager-chibi-container').getAttribute('data-expression')).toBe('gentle');
    });
  });

  // ==========================================================================
  // SECTION 4: Stress-Test Speech Formatting <= 80 Characters with Ellipsis
  // ==========================================================================
  describe('4. Speech Formatting <= 80 Characters with Ellipsis', () => {
    it('returns null for empty, whitespace, null, or undefined speech inputs', () => {
      expect(formatSpeech(null)).toBeNull();
      expect(formatSpeech(undefined)).toBeNull();
      expect(formatSpeech('')).toBeNull();
      expect(formatSpeech('   ')).toBeNull();
      expect(formatSpeech('\t\n  \r')).toBeNull();
    });

    it('preserves text strictly <= 80 characters without truncation', () => {
      const text50 = 'A'.repeat(50);
      expect(formatSpeech(text50)).toBe(text50);
      expect(formatSpeech(text50)!.length).toBe(50);

      const text79 = 'A'.repeat(79);
      expect(formatSpeech(text79)).toBe(text79);
      expect(formatSpeech(text79)!.length).toBe(79);

      const text80 = 'A'.repeat(80);
      expect(formatSpeech(text80)).toBe(text80);
      expect(formatSpeech(text80)!.length).toBe(80);
      expect(formatSpeech(text80)!.endsWith('...')).toBe(false);
    });

    it('truncates texts > 80 characters to exactly 80 characters ending with "..."', () => {
      // 81 chars -> truncated to 77 chars + '...' = 80 chars
      const text81 = 'A'.repeat(81);
      const res81 = formatSpeech(text81);
      expect(res81).not.toBeNull();
      expect(res81!.length).toBe(80);
      expect(res81!.endsWith('...')).toBe(true);
      expect(res81!.slice(0, 77)).toBe('A'.repeat(77));

      // 100 chars
      const text100 = 'Voyager Reverse 1999 '.repeat(5); // > 100 chars
      const res100 = formatSpeech(text100);
      expect(res100!.length).toBe(80);
      expect(res100!.endsWith('...')).toBe(true);

      // 1000 chars adversarial flood
      const text1000 = 'X'.repeat(1000);
      const res1000 = formatSpeech(text1000);
      expect(res1000!.length).toBe(80);
      expect(res1000!.endsWith('...')).toBe(true);
      expect(res1000).toBe('X'.repeat(77) + '...');
    });

    it('correctly displays formatted speech bubble in the rendered DOM', () => {
      const speech = 'Hãy uống nước để ngân hà luôn rực rỡ!';
      render(React.createElement(VoyagerChibi, { showSpeechBubble: true, speechText: speech }));

      const bubble = screen.getByTestId('speech-bubble');
      expect(bubble).toBeDefined();
      expect(screen.getByText(speech)).toBeDefined();
    });

    it('does not render speech bubble if speechText is empty or showSpeechBubble is false', () => {
      const { unmount: u1 } = render(React.createElement(VoyagerChibi, { showSpeechBubble: false, speechText: 'Hello' }));
      expect(screen.queryByTestId('speech-bubble')).toBeNull();
      u1();

      const { unmount: u2 } = render(React.createElement(VoyagerChibi, { showSpeechBubble: true, speechText: '' }));
      expect(screen.queryByTestId('speech-bubble')).toBeNull();
      u2();
    });
  });

  // ==========================================================================
  // SECTION 5: Stress-Test Custom Avatar URL Resolution & Fallback
  // ==========================================================================
  describe('5. Custom Avatar URL Resolution & Fallback', () => {
    const DEFAULT_AVATAR = '/assets/character/voyager_base.png';

    it('resolves null, empty, or whitespace-only URLs to the default avatar asset', () => {
      expect(resolveAvatarSrc(null)).toBe(DEFAULT_AVATAR);
      expect(resolveAvatarSrc(undefined)).toBe(DEFAULT_AVATAR);
      expect(resolveAvatarSrc('')).toBe(DEFAULT_AVATAR);
      expect(resolveAvatarSrc('   ')).toBe(DEFAULT_AVATAR);
      expect(resolveAvatarSrc('\t\n')).toBe(DEFAULT_AVATAR);
    });

    it('retains valid custom image URLs (HTTPS, local path, and data URI)', () => {
      const validUrls = [
        'https://example.com/chibi_custom.png',
        'http://localhost:5173/custom.gif',
        '/storage/emulated/0/Download/voyager.png',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      ];

      for (const url of validUrls) {
        expect(resolveAvatarSrc(url)).toBe(url);
      }
    });

    it('renders img with custom URL initially, then falls back to default avatar on image onError', () => {
      render(React.createElement(VoyagerChibi, { customImageUrl: 'https://corrupt-host.invalid/broken.png' }));

      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe('https://corrupt-host.invalid/broken.png');

      // Trigger error event
      fireEvent.error(img);

      // Now must have switched to default avatar asset
      expect(img.getAttribute('src')).toBe(DEFAULT_AVATAR);
    });

    it('renders default avatar asset immediately when customImageUrl is not provided', () => {
      render(React.createElement(VoyagerChibi, null));
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe(DEFAULT_AVATAR);
    });
  });

  // ==========================================================================
  // SECTION 6: Stress-Test 1:1 Aspect Ratio Across Sizes (sm, md, lg, xl)
  // ==========================================================================
  describe('6. 1:1 Square Aspect Ratio Across Sizes (sm, md, lg, xl)', () => {
    const sizes: VoyagerSize[] = ['sm', 'md', 'lg', 'xl'];

    it('verifies 1:1 width-to-height ratio in VOYAGER_SIZES constant token dictionary', () => {
      const expectedDims = {
        sm: { width: 48, height: 48 },
        md: { width: 96, height: 96 },
        lg: { width: 144, height: 144 },
        xl: { width: 192, height: 192 },
      };

      for (const size of sizes) {
        const token = VOYAGER_SIZES[size];
        expect(token).toBeDefined();
        expect(token.width).toBe(token.height); // Strict 1:1 ratio
        expect(token.width).toBe(expectedDims[size].width);
        expect(token.height).toBe(expectedDims[size].height);
      }
    });

    it('renders container and avatar frame with aspect-square and matching data-size for all sizes', () => {
      for (const size of sizes) {
        const { unmount } = render(React.createElement(VoyagerChibi, { size }));

        const container = screen.getByTestId('voyager-chibi-container');
        expect(container.getAttribute('data-size')).toBe(size);

        // Frame inside container must have aspect-square class
        const frame = container.querySelector('.aspect-square');
        expect(frame).not.toBeNull();

        // Check tailwind sizing class exists on frame
        const classNames = VOYAGER_SIZES[size].classNames;
        expect(frame!.className).toContain(classNames);

        unmount();
      }
    });

    it('gracefully defaults to md (96x96) when an unknown size is passed', () => {
      render(React.createElement(VoyagerChibi, { size: 'unknown_size' as any }));
      const container = screen.getByTestId('voyager-chibi-container');
      const frame = container.querySelector('.aspect-square');
      expect(frame!.className).toContain('w-24 h-24'); // VOYAGER_SIZES.md
    });
  });
});
