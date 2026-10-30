/**
 * Voyager's Cosmic Hydration - Web Audio Procedural Synthesis Engine
 * File: src/utils/audioEngine.ts
 *
 * 100% procedural sound synthesis using native Web Audio API oscillators,
 * filters, and gain nodes. Zero external audio assets required.
 */

// ============================================================================
// Types & Constants
// ============================================================================

export type SoundType = 'ripple' | 'violin' | 'bubble';
export type SoundThemeId = SoundType | 'chime';

export interface SoundOptions {
  volume?: number;       // Scaled 0.0 to 1.0 (defaults to 1.0)
  detuneCents?: number;  // Optional microtonal pitch adjustment
}

export interface AudioEngineStatus {
  isSupported: boolean;
  isUnlocked: boolean;
  isMuted: boolean;
  state: AudioContextState | 'unsupported';
}

// Master bus headroom limiter (<= 0.8, prevents digital clipping)
export const MASTER_HEADROOM_GAIN = 0.6;

// Internal engine singleton state
let audioCtx: AudioContext | null = null;
let isMuted: boolean = false;

// ============================================================================
// Lifecycle & Context Management
// ============================================================================

/**
 * Resolves standard AudioContext or webkitAudioContext across browser,
 * mobile WebView, and headless/mock test environments.
 */
function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window !== 'undefined') {
    return window.AudioContext || (window as any).webkitAudioContext || null;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).AudioContext) {
    return (globalThis as any).AudioContext;
  }
  return null;
}

/**
 * Returns true if Web Audio API is supported in the current environment.
 */
export function isAudioSupported(): boolean {
  return getAudioContextConstructor() !== null;
}

/**
 * Lazily creates or returns the singleton AudioContext instance.
 * Returns null gracefully if Web Audio API is unavailable.
 */
export function getAudioContext(): AudioContext | null {
  if (!audioCtx) {
    const Ctor = getAudioContextConstructor();
    if (Ctor) {
      try {
        audioCtx = new Ctor();
      } catch {
        audioCtx = null;
      }
    }
  }
  return audioCtx;
}

/**
 * Test utility to set or reset the internal AudioContext singleton.
 */
export function _setAudioContextForTesting(ctx: AudioContext | null): void {
  audioCtx = ctx;
}

/**
 * Unlocks AudioContext on user gesture, transitioning suspended state to running.
 */
export async function unlockAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      return (ctx.state as string) === 'running';
    } catch {
      return false;
    }
  }
  return (ctx.state as string) === 'running';
}

/**
 * Initializes AudioContext and attempts gesture unlock if suspended.
 */
export async function initAudioContext(): Promise<AudioContext | null> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    await unlockAudioContext();
  }
  return ctx;
}

/**
 * Registers passive one-time touch/click listeners to auto-unlock AudioContext on first gesture.
 */
export function registerAutoUnlockListeners(): void {
  if (typeof window === 'undefined') return;

  const unlockEvents = ['pointerdown', 'touchstart', 'keydown', 'click'];
  const handleUnlock = async () => {
    await unlockAudioContext();
    unlockEvents.forEach((evt) => {
      window.removeEventListener(evt, handleUnlock);
    });
  };

  unlockEvents.forEach((evt) => {
    window.addEventListener(evt, handleUnlock, { once: true, passive: true });
  });
}

// Auto-register listeners when running in browser
if (typeof window !== 'undefined') {
  registerAutoUnlockListeners();
}

/**
 * Mute controls
 */
export function setAudioMuted(muted: boolean): void {
  isMuted = muted;
}

export function isAudioMuted(): boolean {
  return isMuted;
}

/**
 * Returns complete engine status snapshot
 */
export function getAudioEngineStatus(): AudioEngineStatus {
  const supported = isAudioSupported();
  const ctx = getAudioContext();
  return {
    isSupported: supported,
    isUnlocked: ctx ? ctx.state === 'running' : false,
    isMuted,
    state: ctx ? ctx.state : 'unsupported',
  };
}

/**
 * Creates master gain limiter bus connected to destination.
 */
function createMasterBus(ctx: AudioContext, customVolume = 1.0): GainNode {
  const master = ctx.createGain();
  const clampedVol = Math.max(0, Math.min(1.0, customVolume));
  master.gain.setValueAtTime(MASTER_HEADROOM_GAIN * clampedVol, ctx.currentTime);
  master.connect(ctx.destination);
  return master;
}

// ============================================================================
// Procedural Synthesis Synthesizers
// ============================================================================

/**
 * Theme 1: "Gợn nhẹ" (Gentle Ripple / Water Droplet)
 * Sine drop chirp (450Hz -> 1350Hz -> 800Hz) + resonant 330Hz tail + 2200Hz lowpass filter.
 */
function synthesizeRipple(ctx: AudioContext, master: GainNode, volume: number): void {
  const t0 = ctx.currentTime;

  // 1. Resonant Lowpass Filter
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2200, t0);
  filter.Q.setValueAtTime(1.2, t0);
  filter.connect(master);

  // 2. Drop Chirp Oscillator (upward sweep then downward decay)
  const oscDrop = ctx.createOscillator();
  const gainDrop = ctx.createGain();
  oscDrop.type = 'sine';
  oscDrop.frequency.setValueAtTime(450, t0);
  oscDrop.frequency.exponentialRampToValueAtTime(1350, t0 + 0.040);
  oscDrop.frequency.linearRampToValueAtTime(800, t0 + 0.120);

  gainDrop.gain.setValueAtTime(0.001, t0);
  gainDrop.gain.linearRampToValueAtTime(0.50 * volume, t0 + 0.005);
  gainDrop.gain.exponentialRampToValueAtTime(0.001, t0 + 0.180);

  oscDrop.connect(gainDrop);
  gainDrop.connect(filter);

  // 3. Ripple Body Tail Resonance
  const oscTail = ctx.createOscillator();
  const gainTail = ctx.createGain();
  oscTail.type = 'sine';
  oscTail.frequency.setValueAtTime(330, t0);
  oscTail.frequency.linearRampToValueAtTime(290, t0 + 0.350);

  gainTail.gain.setValueAtTime(0.001, t0);
  gainTail.gain.linearRampToValueAtTime(0.22 * volume, t0 + 0.030);
  gainTail.gain.exponentialRampToValueAtTime(0.001, t0 + 0.380);

  oscTail.connect(gainTail);
  gainTail.connect(filter);

  // Start and stop
  oscDrop.start(t0);
  oscTail.start(t0);
  oscDrop.stop(t0 + 0.40);
  oscTail.stop(t0 + 0.40);
}

/**
 * Theme 2: "Violin Tinh cầu" (Cosmic Space Violin)
 * Multi-oscillator harmonic cluster (Sawtooth + detuned Triangle) + 5.6Hz vibrato LFO + 1850Hz body filter + 140ms echo delay.
 */
function synthesizeViolin(ctx: AudioContext, master: GainNode, volume: number): void {
  const t0 = ctx.currentTime;

  // 1. Acoustic Formant Peaking Filter (1850 Hz body resonance)
  const bodyFilter = ctx.createBiquadFilter();
  bodyFilter.type = 'peaking';
  bodyFilter.frequency.setValueAtTime(1850, t0);
  bodyFilter.Q.setValueAtTime(2.4, t0);
  bodyFilter.gain.setValueAtTime(4.0, t0);
  bodyFilter.connect(master);

  // 2. Cosmic Space Echo Delay (140ms delay with 1400Hz damping)
  const delay = ctx.createDelay(1.0);
  delay.delayTime.setValueAtTime(0.140, t0);
  const delayGain = ctx.createGain();
  delayGain.gain.setValueAtTime(0.32, t0);
  const dampFilter = ctx.createBiquadFilter();
  dampFilter.type = 'lowpass';
  dampFilter.frequency.setValueAtTime(1400, t0);

  delay.connect(dampFilter);
  dampFilter.connect(delayGain);
  delayGain.connect(delay);
  delayGain.connect(master);

  // 3. ADSR Master Bowing Envelope
  const adsr = ctx.createGain();
  adsr.gain.setValueAtTime(0.001, t0);
  adsr.gain.linearRampToValueAtTime(0.45 * volume, t0 + 0.120); // Attack
  adsr.gain.linearRampToValueAtTime(0.35 * volume, t0 + 0.220); // Decay
  adsr.gain.setValueAtTime(0.35 * volume, t0 + 0.650);         // Sustain
  adsr.gain.exponentialRampToValueAtTime(0.001, t0 + 1.250);   // Release

  adsr.connect(bodyFilter);
  adsr.connect(delay);

  // 4. Expressive Vibrato LFO (5.6 Hz human bowing rate)
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(5.6, t0);
  lfoGain.gain.setValueAtTime(0, t0);
  lfoGain.gain.linearRampToValueAtTime(12.0, t0 + 0.200); // Delayed vibrato onset
  lfo.connect(lfoGain);
  lfo.start(t0);
  lfo.stop(t0 + 1.35);

  // 5. String Chord Cluster [440, 554.37, 659.25, 880] (A4, C#5, E5, A5)
  const chordNotes = [440, 554.37, 659.25, 880];
  chordNotes.forEach((freq, idx) => {
    // Sawtooth harmonic voice
    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(freq, t0);
    lfoGain.connect(saw.frequency);

    const sawGain = ctx.createGain();
    sawGain.gain.setValueAtTime(0.12, t0);
    saw.connect(sawGain);
    sawGain.connect(adsr);

    saw.start(t0 + idx * 0.015);
    saw.stop(t0 + 1.35);

    // Warm detuned triangle voice (+6 cents)
    const tri = ctx.createOscillator();
    tri.type = 'triangle';
    tri.frequency.setValueAtTime(freq * 1.0035, t0);
    lfoGain.connect(tri.frequency);

    const triGain = ctx.createGain();
    triGain.gain.setValueAtTime(0.08, t0);
    tri.connect(triGain);
    triGain.connect(adsr);

    tri.start(t0 + idx * 0.015);
    tri.stop(t0 + 1.35);
  });
}

/**
 * Theme 3: "Chuông bong bóng" (Bubble Chime / Crystalline Ping)
 * FM crystalline bell (carrier 1046.5Hz modulated by 2093Hz) + bubble chirp (780Hz -> 1046Hz) + triangle sparkles.
 */
function synthesizeBubble(ctx: AudioContext, master: GainNode, volume: number): void {
  const t0 = ctx.currentTime;

  // 1. Highpass Filter (600Hz, eliminates muddiness)
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(600, t0);
  filter.connect(master);

  // 2. FM Bubble Carrier & Modulator
  const carrier = ctx.createOscillator();
  const carrierGain = ctx.createGain();
  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(780, t0);
  carrier.frequency.exponentialRampToValueAtTime(1046.50, t0 + 0.035); // Bubble rising chirp

  carrierGain.gain.setValueAtTime(0.001, t0);
  carrierGain.gain.linearRampToValueAtTime(0.40 * volume, t0 + 0.002);
  carrierGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.850);

  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  mod.type = 'sine';
  mod.frequency.setValueAtTime(2093.00, t0); // 2:1 harmonic ratio for crystalline chime

  modGain.gain.setValueAtTime(750, t0);
  modGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.090);

  mod.connect(modGain);
  modGain.connect(carrier.frequency);

  carrier.connect(carrierGain);
  carrierGain.connect(filter);

  carrier.start(t0);
  mod.start(t0);
  carrier.stop(t0 + 0.85);
  mod.stop(t0 + 0.85);

  // 3. Crystalline Multi-Pitch Sequence (Triangle Arpeggio: C5, E5, G5, C6)
  const pitches = [523.25, 659.25, 783.99, 1046.50];
  pitches.forEach((p, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(p, t0 + i * 0.035);

    g.gain.setValueAtTime(0.001, t0 + i * 0.035);
    g.gain.linearRampToValueAtTime(0.12 * volume, t0 + i * 0.035 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.035 + 0.450);

    osc.connect(g);
    g.connect(filter);

    osc.start(t0 + i * 0.035);
    osc.stop(t0 + i * 0.035 + 0.50);
  });
}

// ============================================================================
// Public Playback APIs
// ============================================================================

/**
 * Plays one of the three celestial soundscapes ('ripple', 'violin', 'bubble').
 * Safe against autoplay restrictions, muted states, and headless environments.
 */
export async function playCosmicSound(
  theme: SoundThemeId,
  options: SoundOptions = {}
): Promise<void> {
  if (isMuted) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    await unlockAudioContext();
  }

  const vol = options.volume !== undefined ? options.volume : 1.0;
  const master = createMasterBus(ctx, vol);

  // Normalize 'chime' alias to 'bubble'
  const normalizedTheme: SoundType = theme === 'chime' ? 'bubble' : theme;

  switch (normalizedTheme) {
    case 'ripple':
      synthesizeRipple(ctx, master, vol);
      break;
    case 'violin':
      synthesizeViolin(ctx, master, vol);
      break;
    case 'bubble':
      synthesizeBubble(ctx, master, vol);
      break;
    default:
      synthesizeRipple(ctx, master, vol);
      break;
  }
}

/**
 * Semantic alias for playing hydration reminder or logging sound.
 */
export async function playHydrationSound(type: SoundThemeId): Promise<void> {
  return playCosmicSound(type);
}

/**
 * Rapid percussive tactile tap sound for buttons (25ms blip, 880Hz -> 440Hz).
 */
export function playQuickTap(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    unlockAudioContext().catch(() => {});
  }

  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, t0);
  osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.020);

  gain.gain.setValueAtTime(0.15 * MASTER_HEADROOM_GAIN, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.025);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t0);
  osc.stop(t0 + 0.025);
}

/**
 * Triumphant C-Major celebratory fanfare when daily goal is reached.
 * Arpeggiated [C5, E5, G5, C6] sequence.
 */
export async function playGoalCelebrationFanfare(): Promise<void> {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    await unlockAudioContext();
  }

  const t0 = ctx.currentTime;
  const master = createMasterBus(ctx, 0.9);
  const fanfarePitches = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

  fanfarePitches.forEach((pitch, idx) => {
    const noteTime = t0 + idx * 0.080;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, noteTime);

    gain.gain.setValueAtTime(0.001, noteTime);
    gain.gain.linearRampToValueAtTime(0.25, noteTime + 0.010);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.600);

    osc.connect(gain);
    gain.connect(master);

    osc.start(noteTime);
    osc.stop(noteTime + 0.650);
  });
}
