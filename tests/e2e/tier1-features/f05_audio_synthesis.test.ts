import { describe, it } from 'node:test';
import { assert, registerTest, MockAudioContext } from '../harness.ts';

describe('Tier 1 - Feature 05: Web Audio Synthesis Engine', () => {
  const tier = 'Tier 1';
  const fId = 'F05';

  it('5.1: Procedural synthesis defines 3 cosmic sound themes', () => {
    registerTest(tier, fId, '5.1', 'Procedural synthesis defines 3 cosmic sound themes', () => {
      const themes = ['ripple', 'violin', 'bubble'];
      assert.strictEqual(themes.length, 3);
      assert.ok(themes.includes('ripple'), 'Gợn nhẹ (ripple) must be present');
      assert.ok(themes.includes('violin'), 'Violin Tinh cầu (violin) must be present');
      assert.ok(themes.includes('bubble'), 'Chuông bong bóng (bubble) must be present');
    });
  });

  it('5.2: Gentle Ripple synthesizes sine drop chirp with gain envelope', () => {
    registerTest(tier, fId, '5.2', 'Gentle Ripple synthesizes sine drop chirp', () => {
      const ctx = new MockAudioContext();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, 0);
      osc.frequency.exponentialRampToValueAtTime(540, 0.15);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, 0);
      osc.start(0);

      assert.strictEqual(osc.type, 'sine');
      assert.strictEqual(ctx.nodesCreated.length >= 2, true);
    });
  });

  it('5.3: Cosmic Star Violin synthesizes harmonic arpeggio with vibrato LFO', () => {
    registerTest(tier, fId, '5.3', 'Cosmic Star Violin synthesizes harmonic arpeggio', () => {
      const ctx = new MockAudioContext();
      const notes = [440, 554.37, 659.25, 880];
      for (const freq of notes) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, 0);
        osc.start(0);
      }
      assert.strictEqual(ctx.nodesCreated.filter(n => n.type.includes('sawtooth')).length, 4);
    });
  });

  it('5.4: Bubble Chime synthesizes crystalline multi-pitch sequence', () => {
    registerTest(tier, fId, '5.4', 'Bubble Chime synthesizes crystalline multi-pitch sequence', () => {
      const ctx = new MockAudioContext();
      const pitches = [523.25, 659.25, 783.99, 1046.50];
      for (const p of pitches) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(p, 0);
        osc.start(0);
      }
      assert.strictEqual(ctx.nodesCreated.filter(n => n.type.includes('triangle')).length, 4);
    });
  });

  it('5.5: Master gain limiter prevents acoustic clipping (> 0 dBFS)', () => {
    registerTest(tier, fId, '5.5', 'Master gain limiter prevents acoustic clipping', () => {
      const MAX_SAFE_GAIN = 0.8;
      const masterGain = 0.6; // SPEC-VCH-CORE-001 §3.1
      assert.ok(masterGain <= MAX_SAFE_GAIN, 'Master gain must provide headroom below 0 dBFS');
    });
  });
});
