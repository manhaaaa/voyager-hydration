# Milestone 2 — Web Audio Procedural Synthesis Engine Specification Handoff Report

**Agent**: explorer_m2_1 (teamwork_spec_miner)  
**Parent / Sub-Orchestrator**: 7c380586-cf2a-4df7-b89c-a4b667536d21  
**Milestone**: Milestone 2: Audio, Persistence & Voyager Chibi  
**Target Blueprint**: `d:\uống nước\.agents\teamwork\explorer_m2_1\audio_engine_blueprint.md`  
**Date**: 2026-10-30T15:52:00Z  

---

## 1. Observation

1. **Original User Request (`ORIGINAL_REQUEST.md` line 47)**:
   > "Mục Âm báo: 3 thẻ chọn âm thanh gồm Gợn nhẹ, Violin Tinh cầu, và Chuông bong bóng (sử dụng Web Audio API tạo âm thanh ngân hà tương ứng khi bấm thử và khi nhắc)."
2. **Milestone 2 Scope (`SCOPE.md` lines 7-13)**:
   > "- **F5: Web Audio Synthesis Engine (`src/utils/audioEngine.ts`)**:
   >   - Procedural sound synthesis using native Web Audio API oscillators, filters, gain nodes (100% offline, zero external audio asset dependencies).
   >   - 3 Soundscapes:
   >     * "Gợn nhẹ" (Ripple): Sine drop (450Hz -> 1350Hz) + resonant 330Hz tail + 2200Hz lowpass filter.
   >     * "Violin Tinh cầu" (Cosmic Violin): Multi-oscillator cluster (sawtooth + detuned triangle + octave) + 5.6Hz vibrato LFO + 1850Hz body filter + 140ms cosmic delay echo.
   >     * "Chuông bong bóng" (Bubble Chime): FM crystalline ping (Carrier 1046.5Hz modulated by 2093Hz) + bubble pitch chirp (780Hz -> 1046Hz).
   >   - AudioContext auto-unlock on user gesture (`resume()`)."
3. **Core Specification Document (`spec_report.md` §3.1-3.5)**:
   - Specified Master Headroom Gain at $0.6$ ($\le 0.8$, line 65) to prevent $> 0\text{ dBFS}$ digital clipping.
   - Formulated precise node graphs, envelope timings, frequencies, and filter characteristics for all three themes.
4. **E2E Test Suite Requirements (`tests/e2e/tier1-features/f05_audio_synthesis.test.ts` lines 8-68)**:
   - Test 5.1: Verifies themes array includes `'ripple'`, `'violin'`, and `'bubble'`.
   - Test 5.2: Verifies Gentle Ripple sine drop chirp with gain envelope.
   - Test 5.3: Verifies Cosmic Violin harmonic cluster creating at least 4 sawtooth nodes with frequencies $[440, 554.37, 659.25, 880]$.
   - Test 5.4: Verifies Bubble Chime multi-pitch sequence creating at least 4 triangle nodes with pitches $[523.25, 659.25, 783.99, 1046.50]$.
   - Test 5.5: Verifies master gain limiter $\le 0.8$.
5. **E2E Boundary Tests (`tests/e2e/tier2-boundaries/f05_audio_boundaries.test.ts` lines 8-77)**:
   - Test 5.6: AudioContext resume mechanism when state is `'suspended'`.
   - Test 5.7: Global mute setting (`soundEnabled: false`) bypasses audio scheduling ($0$ nodes created).
   - Test 5.8: Rapid 10-trigger stress test executed safely without memory leak or crash.
   - Test 5.9: Headless environment missing `window.AudioContext` degrades gracefully to `null` without throwing.
   - Test 5.10: Goal celebration fanfare chord sequence plays multi-tone C-Major arpeggio.
6. **Project Test Setup (`vite.config.ts` line 26)**:
   - `test.environment: 'node'` confirms that tests run in a pure Node environment without native browser `AudioContext`.

---

## 2. Logic Chain

1. **Zero External Assets**:
   - Because `ORIGINAL_REQUEST.md` §R4 specifies procedural generation and `SCOPE.md` demands 100% offline zero-latency operation, the engine must never fetch external `.mp3` or `.wav` files.
   - All sounds must be synthesized mathematically via native Web Audio nodes (`OscillatorNode`, `GainNode`, `BiquadFilterNode`, `DelayNode`).
2. **Synthesis Parameter Harmonization**:
   - For "Gợn nhẹ": Dual sine oscillators model both the surface contact droplet chirp ($450\text{ Hz} \to 1350\text{ Hz} \to 800\text{ Hz}$) and the resonant fluid tail ($330\text{ Hz} \to 290\text{ Hz}$), lowpass filtered at $2200\text{ Hz}$.
   - For "Violin Tinh cầu": To satisfy both rich acoustic depth and E2E test 5.3 assertions, the sound engine constructs a harmonic sawtooth arpeggio cluster ($[440, 554.37, 659.25, 880]$) coupled with a $+6\text{ cents}$ detuned triangle voice, modulated by a $5.6\text{ Hz}$ delayed vibrato LFO, filtered through an $1850\text{ Hz}$ peaking wooden formant filter, and echoed through a $140\text{ ms}$ feedback delay loop.
   - For "Chuông bong bóng": The engine combines a 2:1 FM synthesizer ($f_c = 1046.5\text{ Hz}, f_m = 2093.0\text{ Hz}$) sweeping $780\text{ Hz} \to 1046.5\text{ Hz}$ for the bubble transient with a 4-note triangle sparkle cascade ($[523.25, 659.25, 783.99, 1046.50]$) to satisfy E2E test 5.4.
3. **Autoplay Policy & Mobile Lifecycle**:
   - Modern browsers and Android WebViews enforce autoplay policies blocking sound until user interaction.
   - The engine uses a lazy singleton pattern (`getAudioContext()`) to prevent premature context creation warnings.
   - Automatic gesture unlocking invokes `await ctx.resume()` whenever the context is in the `'suspended'` state.
   - A passive global event listener (`pointerdown`, `touchstart`, `keydown`) unlocks the context on the first touch.
4. **Safety & Fault Tolerance**:
   - Master gain is clamped to $0.6 \times \text{volume}$ ($\le 0.8$), ensuring headroom against digital clipping during rapid polyphony.
   - When muted (`soundEnabled: false`), functions exit immediately, bypassing node allocation.
   - In headless runtimes (Node.js/SSR), the engine returns `null` safely without throwing.
5. **Vitest Mocking Strategy**:
   - Because `vite.config.ts` runs Vitest in `'node'` environment, unit tests require a `MockAudioContext` class that tracks node creation, frequency and gain param automation curves, and `resume()` transitions.

---

## 3. Caveats

1. **Speaker Frequency Response on Budget Android Hardware**:
   - Lower frequencies in the Ripple tail ($290\text{ Hz} - 330\text{ Hz}$) may have reduced audibility on small mobile phone speakers. The upward chirp ($450\text{ Hz} \to 1350\text{ Hz}$) ensures clear acoustic audibility regardless of speaker quality.
2. **Audio Scheduling Drift**:
   - When device is heavily loaded, `ctx.currentTime` schedules remain perfectly sample-accurate, but JavaScript callback timers (`setTimeout`) may drift. The blueprint strictly uses Web Audio API hardware timeline parameter automation (`setValueAtTime`, `exponentialRampToValueAtTime`) rather than JavaScript intervals.
3. **No production code modified**:
   - In accordance with the explorer boundary rules, no production files in `src/` have been modified. The full blueprint and mock design are provided for the worker/implementer.

---

## 4. Conclusion

The procedural Web Audio synthesis engine blueprint (`d:\uống nước\.agents\teamwork\explorer_m2_1\audio_engine_blueprint.md`) provides complete, drop-in mathematical specifications, node graphs, lifecycle management, mute controls, and Vitest test mocks for:
- "Gợn nhẹ" (Ripple)
- "Violin Tinh cầu" (Cosmic Violin)
- "Chuông bong bóng" (Bubble Chime)
- Quick UI Tap blip (25ms)
- Goal Celebration Fanfare (C-Major arpeggio)

The design is 100% compliant with `ORIGINAL_REQUEST.md`, `SCOPE.md`, `spec_report.md`, and all E2E Tier 1 and Tier 2 audio assertions.

---

## 5. Verification Method

To verify this specification blueprint independently:

1. **Inspect Blueprint Document**:
   ```powershell
   Get-Content -Path "d:\uống nước\.agents\teamwork\explorer_m2_1\audio_engine_blueprint.md"
   ```
2. **Verify E2E Harmonization**:
   Inspect `tests/e2e/tier1-features/f05_audio_synthesis.test.ts` and `tests/e2e/tier2-boundaries/f05_audio_boundaries.test.ts` and verify that every assertion (sound themes list, frequency curves, oscillator counts, master gain $\le 0.8$, mute suppression, rapid concurrency, headless fallback) is explicitly covered in Section 4, 5, 6, and 7 of the blueprint.
3. **Run Existing Test Suite**:
   ```powershell
   npm test
   ```
   (Confirms current test suite remains green).
4. **Invalidation Conditions**:
   - If user request modifies the three sound themes.
   - If mobile container requires native audio playback instead of Web Audio API.
