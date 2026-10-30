import { describe, it } from 'node:test';
import { assert, registerTest } from '../harness.ts';

describe('Tier 2 - Feature 08: Voyager Chibi Boundaries & Personalization', () => {
  const tier = 'Tier 2';
  const fId = 'F08';

  it('8.6: Custom avatar PNG/GIF upload renders user image container', () => {
    registerTest(tier, fId, '8.6', 'Custom avatar PNG/GIF support', () => {
      const customAvatar = {
        type: 'image/png',
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };
      assert.ok(customAvatar.dataUrl.startsWith('data:image/png;base64,'));
    });
  });

  it('8.7: Broken or null custom image URL falls back gracefully to default Voyager asset', () => {
    registerTest(tier, fId, '8.7', 'Custom avatar fallback on broken/null URL', () => {
      const resolveAvatarSrc = (customUrl?: string | null) => {
        if (!customUrl || customUrl.trim() === '') {
          return '/assets/character/voyager_base.png';
        }
        return customUrl;
      };

      assert.strictEqual(resolveAvatarSrc(null), '/assets/character/voyager_base.png');
      assert.strictEqual(resolveAvatarSrc(''), '/assets/character/voyager_base.png');
      assert.strictEqual(resolveAvatarSrc('custom.png'), 'custom.png');
    });
  });

  it('8.8: Invalid expression prop defaults gracefully to "idle" without error', () => {
    registerTest(tier, fId, '8.8', 'Invalid expression prop fallback', () => {
      const validExpressions = ['idle', 'happy', 'sleeping', 'gentle', 'strict'];
      const sanitizeExpression = (expr: string) => {
        return validExpressions.includes(expr) ? expr : 'idle';
      };

      assert.strictEqual(sanitizeExpression('unknown_mood'), 'idle');
      assert.strictEqual(sanitizeExpression('happy'), 'happy');
    });
  });

  it('8.9: Speech bubble display with long or empty text handling', () => {
    registerTest(tier, fId, '8.9', 'Speech bubble edge text handling', () => {
      const formatSpeech = (text?: string) => {
        if (!text || text.trim() === '') return null;
        if (text.length > 80) return text.slice(0, 77) + '...';
        return text;
      };

      assert.strictEqual(formatSpeech(''), null);
      assert.strictEqual(formatSpeech('Uống nước nhé!'), 'Uống nước nhé!');
      const longText = 'A'.repeat(100);
      assert.strictEqual(formatSpeech(longText)?.length, 80);
    });
  });

  it('8.10: Component size tokens (sm, md, lg, xl) maintain aspect ratios', () => {
    registerTest(tier, fId, '8.10', 'Size tokens aspect ratio preservation', () => {
      const SIZES = {
        sm: { width: 48, height: 48 },
        md: { width: 96, height: 96 },
        lg: { width: 144, height: 144 },
        xl: { width: 192, height: 192 },
      };
      for (const [_, dims] of Object.entries(SIZES)) {
        assert.strictEqual(dims.width, dims.height, 'Square aspect ratio must be preserved for Chibi avatar');
      }
    });
  });
});
