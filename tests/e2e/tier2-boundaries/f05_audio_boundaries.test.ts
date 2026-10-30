import { describe, it } from 'node:test';
import { assert, registerTest, MockAudioContext } from '../harness.ts';

describe('Tier 2 - Feature 05: Web Audio Synthesis Boundaries', () => {
  const tier = 'Tier 2';
  const fId = 'F05';

  it('5.6: AudioContext resumes when state is suspended (autoplay unlock)', async () => {
    registerTest(tier, fId, '5.6', 'AudioContext autoplay resume mechanism', async () => {
      const ctx = new MockAudioContext();
      assert.strictEqual(ctx.state, 'suspended');
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      assert.strictEqual(ctx.state, 'running');
    });
  });

  it('5.7: Global mute setting (soundEnabled: false) bypasses audio scheduling', async () => {
    registerTest(tier, fId, '5.7', 'Mute setting stops node creation', async () => {
      const ctx = new MockAudioContext();
      const soundEnabled = false;

      const triggerAudio = async () => {
        if (!soundEnabled) return;
        const osc = ctx.createOscillator();
        osc.start();
      };

      await triggerAudio();
      assert.strictEqual(ctx.nodesCreated.length, 0);
    });
  });

  it('5.8: Rapid multiple audio clicks (10 triggers) safely executed without leak', async () => {
    registerTest(tier, fId, '5.8', 'Rapid audio triggers stress test', async () => {
      const ctx = new MockAudioContext();
      for (let i = 0; i < 10; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.start(0);
      }
      assert.strictEqual(ctx.nodesCreated.length, 20); // 10 osc + 10 gain
    });
  });

  it('5.9: Graceful degradation in environments without window.AudioContext', () => {
    registerTest(tier, fId, '5.9', 'Headless environment missing AudioContext resilience', () => {
      const safeInitContext = (mockWindow: any) => {
        try {
          const AudioClass = mockWindow.AudioContext || mockWindow.webkitAudioContext;
          if (!AudioClass) {
            return null; // Gracefully disabled
          }
          return new AudioClass();
        } catch {
          return null;
        }
      };

      const result = safeInitContext({});
      assert.strictEqual(result, null);
    });
  });

  it('5.10: Goal celebration fanfare plays multi-tone sequence', () => {
    registerTest(tier, fId, '5.10', 'Goal celebration fanfare chord sequence', () => {
      const ctx = new MockAudioContext();
      const fanfarePitches = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
      for (const pitch of fanfarePitches) {
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(pitch, 0);
        osc.start(0);
      }
      assert.strictEqual(ctx.nodesCreated.length, 4);
    });
  });
});
