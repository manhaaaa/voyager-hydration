// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  VoyagerChibi,
  VOYAGER_ACCESSORIES,
  VOYAGER_SIZES,
  sanitizeExpression,
  resolveAvatarSrc,
  formatSpeech,
  VoyagerExpression,
  VoyagerSize,
} from '../../src/components/VoyagerChibi';

describe('Voyager Chibi Character Component Unit Tests (VoyagerChibi.tsx)', () => {
  // --------------------------------------------------------------------------
  // 1. Pure Helper Utilities & Constants
  // --------------------------------------------------------------------------
  describe('Accessories & Expression Enums', () => {
    it('recognizes all 4 canonical base visual accessories', () => {
      expect(VOYAGER_ACCESSORIES).toContain('sailor_hat');
      expect(VOYAGER_ACCESSORIES).toContain('star_cape');
      expect(VOYAGER_ACCESSORIES).toContain('star_halo');
      expect(VOYAGER_ACCESSORIES).toContain('violin');
      expect(VOYAGER_ACCESSORIES.length).toBe(4);
    });

    it('sanitizes valid expressions and defaults invalid or null ones to "idle"', () => {
      const validStates: VoyagerExpression[] = ['idle', 'happy', 'sleeping', 'gentle', 'strict'];
      for (const s of validStates) {
        expect(sanitizeExpression(s)).toBe(s);
      }
      expect(sanitizeExpression('unknown_mood')).toBe('idle');
      expect(sanitizeExpression('')).toBe('idle');
      expect(sanitizeExpression(null)).toBe('idle');
      expect(sanitizeExpression(undefined)).toBe('idle');
    });

    it('resolves avatar source and provides fallback on empty/null values', () => {
      expect(resolveAvatarSrc(null)).toBe('/assets/character/voyager_base.png');
      expect(resolveAvatarSrc('')).toBe('/assets/character/voyager_base.png');
      expect(resolveAvatarSrc('   ')).toBe('/assets/character/voyager_base.png');
      expect(resolveAvatarSrc('custom_avatar.png')).toBe('custom_avatar.png');
      expect(resolveAvatarSrc('data:image/png;base64,ABCDEF')).toBe('data:image/png;base64,ABCDEF');
    });

    it('formats speech text and clamps strings > 80 characters', () => {
      expect(formatSpeech(null)).toBeNull();
      expect(formatSpeech('')).toBeNull();
      expect(formatSpeech('   ')).toBeNull();

      const shortText = 'Uống nước nhé, thuyền trưởng!';
      expect(formatSpeech(shortText)).toBe(shortText);

      const longText = 'A'.repeat(100);
      const formatted = formatSpeech(longText);
      expect(formatted).not.toBeNull();
      expect(formatted!.length).toBe(80);
      expect(formatted!.endsWith('...')).toBe(true);
    });

    it('enforces 1:1 square aspect ratio across all size tokens', () => {
      const sizeKeys: VoyagerSize[] = ['sm', 'md', 'lg', 'xl'];
      for (const key of sizeKeys) {
        const token = VOYAGER_SIZES[key];
        expect(token.width).toBe(token.height);
        expect(token.width).toBeGreaterThan(0);
      }
      expect(VOYAGER_SIZES.sm.width).toBe(48);
      expect(VOYAGER_SIZES.md.width).toBe(96);
      expect(VOYAGER_SIZES.lg.width).toBe(144);
      expect(VOYAGER_SIZES.xl.width).toBe(192);
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Component DOM Rendering Tests
  // --------------------------------------------------------------------------
  describe('React DOM Component Rendering', () => {
    it('renders default Voyager Chibi with idle expression and md size', () => {
      render(React.createElement(VoyagerChibi, null));
      const container = screen.getByTestId('voyager-chibi-container');
      expect(container).toBeDefined();
      expect(container.getAttribute('data-expression')).toBe('idle');
      expect(container.getAttribute('data-size')).toBe('md');

      // Base accessories
      expect(screen.getByTestId('accessory-sailor-hat')).toBeDefined();
      expect(screen.getByTestId('accessory-star-halo')).toBeDefined();
      expect(screen.getByTestId('accessory-star-cape')).toBeDefined();

      // Idle overlay
      expect(screen.getByTestId('expression-idle')).toBeDefined();
    });

    it('renders happy expression with celebration sparkles and golden aura', () => {
      render(React.createElement(VoyagerChibi, { expression: 'happy', showAura: true }));
      const container = screen.getByTestId('voyager-chibi-container');
      expect(container.getAttribute('data-expression')).toBe('happy');
      expect(screen.getByTestId('expression-happy')).toBeDefined();
      expect(container.innerHTML).toContain('♥');
    });

    it('renders sleeping expression with celestial Zzz bubble overlay', () => {
      render(React.createElement(VoyagerChibi, { expression: 'sleeping' }));
      const container = screen.getByTestId('voyager-chibi-container');
      expect(container.getAttribute('data-expression')).toBe('sleeping');
      expect(screen.getByTestId('expression-sleeping')).toBeDefined();
      expect(screen.getByText('Zzz')).toBeDefined();
    });

    it('renders gentle expression with crystalline water droplet overlay', () => {
      render(React.createElement(VoyagerChibi, { expression: 'gentle' }));
      const container = screen.getByTestId('voyager-chibi-container');
      expect(container.getAttribute('data-expression')).toBe('gentle');
      expect(screen.getByTestId('expression-gentle')).toBeDefined();
    });

    it('renders strict expression with cosmic star violin and musical notes', () => {
      render(React.createElement(VoyagerChibi, { expression: 'strict' }));
      const container = screen.getByTestId('voyager-chibi-container');
      expect(container.getAttribute('data-expression')).toBe('strict');
      expect(screen.getByTestId('expression-strict')).toBeDefined();
      expect(screen.getByTestId('accessory-violin')).toBeDefined();
      expect(screen.getByText('♪')).toBeDefined();
      expect(screen.getByText('♫')).toBeDefined();
    });

    it('renders custom speech bubble when showSpeechBubble=true', () => {
      const speech = 'Dải Ngân Hà vẫy gọi!';
      render(React.createElement(VoyagerChibi, { showSpeechBubble: true, speechText: speech }));
      const bubble = screen.getByTestId('speech-bubble');
      expect(bubble).toBeDefined();
      expect(screen.getByText(speech)).toBeDefined();
    });

    it('handles interactive onClick callback when tapped', () => {
      const handleClick = vi.fn();
      render(React.createElement(VoyagerChibi, { onClick: handleClick, interactive: true }));
      const container = screen.getByTestId('voyager-chibi-container');
      fireEvent.click(container);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('falls back to default character asset when image encounters load error', () => {
      render(React.createElement(VoyagerChibi, { customImageUrl: 'https://broken-domain.invalid/non_existent.png' }));
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe('https://broken-domain.invalid/non_existent.png');

      // Trigger image error event
      fireEvent.error(img);
      expect(img.getAttribute('src')).toBe('/assets/character/voyager_base.png');
    });
  });
});
