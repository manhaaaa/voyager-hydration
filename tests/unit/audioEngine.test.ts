import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isAudioSupported,
  getAudioContext,
  unlockAudioContext,
  initAudioContext,
  setAudioMuted,
  isAudioMuted,
  getAudioEngineStatus,
  playCosmicSound,
  playHydrationSound,
  playQuickTap,
  playGoalCelebrationFanfare,
  _setAudioContextForTesting,
  MASTER_HEADROOM_GAIN,
} from '../../src/utils/audioEngine';

// ============================================================================
// Mock AudioContext Framework for Vitest
// ============================================================================

class MockAudioParam {
  value: number;
  timeline: Array<{ type: string; value: number; time: number }> = [];

  constructor(initialValue: number) {
    this.value = initialValue;
  }

  setValueAtTime(val: number, time: number) {
    this.value = val;
    this.timeline.push({ type: 'setValueAtTime', value: val, time });
    return this;
  }

  exponentialRampToValueAtTime(val: number, time: number) {
    this.value = val;
    this.timeline.push({ type: 'exponentialRampToValueAtTime', value: val, time });
    return this;
  }

  linearRampToValueAtTime(val: number, time: number) {
    this.value = val;
    this.timeline.push({ type: 'linearRampToValueAtTime', value: val, time });
    return this;
  }
}

interface MockNodeRecord {
  type: string;
  node: any;
  startTime?: number;
  stopTime?: number;
}

class TestMockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime: number = 0;
  destination = { channelCount: 2 };
  nodesCreated: MockNodeRecord[] = [];

  async resume(): Promise<void> {
    this.state = 'running';
  }

  createOscillator() {
    const osc: any = {
      type: 'sine',
      frequency: new MockAudioParam(440),
      detune: new MockAudioParam(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn((t = 0) => {
        const record = this.nodesCreated.find((n) => n.node === osc);
        if (record) record.startTime = t;
      }),
      stop: vi.fn((t = 0) => {
        const record = this.nodesCreated.find((n) => n.node === osc);
        if (record) record.stopTime = t;
      }),
    };
    this.nodesCreated.push({ type: 'oscillator', node: osc });
    return osc;
  }

  createGain() {
    const gainNode: any = {
      gain: new MockAudioParam(1),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.nodesCreated.push({ type: 'gain', node: gainNode });
    return gainNode;
  }

  createBiquadFilter() {
    const filter: any = {
      type: 'lowpass',
      frequency: new MockAudioParam(350),
      Q: new MockAudioParam(1),
      gain: new MockAudioParam(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.nodesCreated.push({ type: 'biquad-filter', node: filter });
    return filter;
  }

  createDelay() {
    const delay: any = {
      delayTime: new MockAudioParam(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.nodesCreated.push({ type: 'delay', node: delay });
    return delay;
  }
}

describe('Web Audio Synthesis Engine Unit Tests (audioEngine.ts)', () => {
  let mockCtx: TestMockAudioContext;

  beforeEach(() => {
    (globalThis as any).AudioContext = TestMockAudioContext;
    mockCtx = new TestMockAudioContext();
    _setAudioContextForTesting(mockCtx as unknown as AudioContext);
    setAudioMuted(false);
  });

  afterEach(() => {
    delete (globalThis as any).AudioContext;
    _setAudioContextForTesting(null);
    setAudioMuted(false);
  });

  // --------------------------------------------------------------------------
  // 1. AudioContext Lifecycle & Unlocking
  // --------------------------------------------------------------------------
  describe('Context Lifecycle & Autoplay Unlock', () => {
    it('initializes context and detects suspended state', () => {
      expect(isAudioSupported()).toBe(true);
      const ctx = getAudioContext();
      expect(ctx).not.toBeNull();
      expect(ctx?.state).toBe('suspended');
    });

    it('unlockAudioContext transitions state from suspended to running', async () => {
      expect(mockCtx.state).toBe('suspended');
      const unlocked = await unlockAudioContext();
      expect(unlocked).toBe(true);
      expect(mockCtx.state).toBe('running');
    });

    it('initAudioContext unlocks suspended context and returns instance', async () => {
      const ctx = await initAudioContext();
      expect(ctx).toBe(mockCtx as unknown as AudioContext);
      expect(mockCtx.state).toBe('running');
    });

    it('returns engine status accurately', () => {
      const status = getAudioEngineStatus();
      expect(status.isMuted).toBe(false);
      expect(status.state).toBe('suspended');
      expect(status.isUnlocked).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Master Headroom Limiter
  // --------------------------------------------------------------------------
  describe('Master Headroom Limiter', () => {
    it('enforces master gain <= 0.8 to prevent digital clipping', () => {
      expect(MASTER_HEADROOM_GAIN).toBeLessThanOrEqual(0.8);
      expect(MASTER_HEADROOM_GAIN).toBe(0.6);
    });

    it('scales master bus according to volume option', async () => {
      await playCosmicSound('ripple', { volume: 0.5 });
      // The master gain is created first and connected to destination
      const masterGainRecord = mockCtx.nodesCreated.find((n) => n.type === 'gain');
      expect(masterGainRecord).toBeDefined();
      expect(masterGainRecord?.node.gain.value).toBeCloseTo(0.6 * 0.5, 4);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Procedural Soundscapes: Ripple, Violin, Bubble
  // --------------------------------------------------------------------------
  describe('Theme 1: "Gợn nhẹ" (Ripple)', () => {
    it('creates lowpass filter, drop chirp oscillator, and ripple body resonance', async () => {
      await playCosmicSound('ripple');

      const oscillators = mockCtx.nodesCreated.filter((n) => n.type === 'oscillator');
      const filters = mockCtx.nodesCreated.filter((n) => n.type === 'biquad-filter');
      const gains = mockCtx.nodesCreated.filter((n) => n.type === 'gain');

      expect(oscillators.length).toBe(2); // drop chirp + ripple body
      expect(filters.length).toBe(1);      // lowpass filter
      expect(gains.length).toBeGreaterThanOrEqual(3); // master + drop gain + tail gain

      // Verify filter configuration
      expect(filters[0].node.type).toBe('lowpass');
      expect(filters[0].node.frequency.value).toBe(2200);

      // Verify drop chirp start frequency 450Hz
      const oscDrop = oscillators[0].node;
      expect(oscDrop.type).toBe('sine');
      expect(oscDrop.frequency.timeline[0].value).toBe(450);

      // Verify tail frequency 330Hz
      const oscTail = oscillators[1].node;
      expect(oscTail.type).toBe('sine');
      expect(oscTail.frequency.timeline[0].value).toBe(330);
    });
  });

  describe('Theme 2: "Violin Tinh cầu" (Cosmic Space Violin)', () => {
    it('creates multi-oscillator harmonic cluster, peaking filter, and cosmic delay', async () => {
      await playCosmicSound('violin');

      const oscillators = mockCtx.nodesCreated.filter((n) => n.type === 'oscillator');
      const filters = mockCtx.nodesCreated.filter((n) => n.type === 'biquad-filter');
      const delays = mockCtx.nodesCreated.filter((n) => n.type === 'delay');

      // 4 saw + 4 tri + 1 LFO = 9 oscillators
      expect(oscillators.length).toBe(9);
      const sawOscs = oscillators.filter((o) => o.node.type === 'sawtooth');
      expect(sawOscs.length).toBe(4); // A4 (440), C#5 (554.37), E5 (659.25), A5 (880)

      const triOscs = oscillators.filter((o) => o.node.type === 'triangle');
      expect(triOscs.length).toBe(4); // detuned triangle cluster

      // Peaking filter & damping filter
      expect(filters.length).toBe(2);
      const peaking = filters.find((f) => f.node.type === 'peaking');
      expect(peaking).toBeDefined();
      expect(peaking?.node.frequency.value).toBe(1850);

      // Cosmic echo delay
      expect(delays.length).toBe(1);
      expect(delays[0].node.delayTime.value).toBe(0.140);
    });
  });

  describe('Theme 3: "Chuông bong bóng" (Bubble Chime)', () => {
    it('creates FM carrier & modulator, highpass filter, and 4 crystalline triangle notes', async () => {
      await playCosmicSound('bubble');

      const oscillators = mockCtx.nodesCreated.filter((n) => n.type === 'oscillator');
      const filters = mockCtx.nodesCreated.filter((n) => n.type === 'biquad-filter');

      // 1 carrier (sine) + 1 mod (sine) + 4 triangle sparkle notes = 6 oscillators
      expect(oscillators.length).toBe(6);

      const highpass = filters.find((f) => f.node.type === 'highpass');
      expect(highpass).toBeDefined();
      expect(highpass?.node.frequency.value).toBe(600);

      const triNotes = oscillators.filter((o) => o.node.type === 'triangle');
      expect(triNotes.length).toBe(4);
      const triPitches = triNotes.map((o) => o.node.frequency.value);
      expect(triPitches).toEqual([523.25, 659.25, 783.99, 1046.50]);
    });

    it('normalizes "chime" alias to bubble theme', async () => {
      await playCosmicSound('chime');
      const triNotes = mockCtx.nodesCreated.filter(
        (n) => n.type === 'oscillator' && n.node.type === 'triangle'
      );
      expect(triNotes.length).toBe(4);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Auxiliary Sounds: Quick Tap & Fanfare
  // --------------------------------------------------------------------------
  describe('Auxiliary Sounds', () => {
    it('playHydrationSound triggers sound identically to playCosmicSound', async () => {
      await playHydrationSound('ripple');
      expect(mockCtx.nodesCreated.length).toBeGreaterThan(0);
    });

    it('playQuickTap creates rapid 25ms sine chirp', () => {
      playQuickTap();
      const oscs = mockCtx.nodesCreated.filter((n) => n.type === 'oscillator');
      expect(oscs.length).toBe(1);
      expect(oscs[0].node.type).toBe('sine');
      expect(oscs[0].node.frequency.timeline[0].value).toBe(880);
      expect(oscs[0].node.stop).toHaveBeenCalledWith(0.025);
    });

    it('playGoalCelebrationFanfare creates C-Major arpeggio sequence', async () => {
      await playGoalCelebrationFanfare();
      const oscs = mockCtx.nodesCreated.filter((n) => n.type === 'oscillator');
      expect(oscs.length).toBe(4);
      const pitches = oscs.map((o) => o.node.frequency.value);
      expect(pitches).toEqual([523.25, 659.25, 783.99, 1046.50]);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Mute Controls & Error / Headless Resilience
  // --------------------------------------------------------------------------
  describe('Mute Controls & Fallback Resilience', () => {
    it('suppresses all node creation when audio is muted', async () => {
      setAudioMuted(true);
      expect(isAudioMuted()).toBe(true);

      await playCosmicSound('ripple');
      await playCosmicSound('violin');
      await playCosmicSound('bubble');
      playQuickTap();
      await playGoalCelebrationFanfare();

      expect(mockCtx.nodesCreated.length).toBe(0);
    });

    it('executes 10 rapid triggers without error or crash', async () => {
      const promises = Array.from({ length: 10 }).map(() => playCosmicSound('ripple'));
      await expect(Promise.all(promises)).resolves.not.toThrow();
      expect(mockCtx.nodesCreated.length).toBeGreaterThan(0);
    });

    it('gracefully degrades when AudioContext is null without throwing exceptions', async () => {
      _setAudioContextForTesting(null);
      await expect(playCosmicSound('ripple')).resolves.not.toThrow();
      expect(() => playQuickTap()).not.toThrow();
      await expect(playGoalCelebrationFanfare()).resolves.not.toThrow();
    });
  });
});
