/**
 * AudioEngine — oscillator-based robotic/beep sound synthesis.
 *
 * Signal chain:
 *   OscillatorNode (square/sawtooth) → GainNode (volume envelope)
 *                                    → destination
 *
 * The volume and pitch envelopes are applied via WebAudio automation.
 * Using oscillator waveforms (square, sawtooth, triangle) produces clean
 * robotic beep/boop tones instead of the airy/hissy white-noise approach.
 */

import { clamp, sampleCurve } from "../utils/dsp";

/** Supported waveform types with user-friendly labels */
export const WAVEFORMS = [
  { value: "square", label: "Square (classic beep)" },
  { value: "sawtooth", label: "Sawtooth (buzzy)" },
  { value: "triangle", label: "Triangle (soft)" },
  { value: "sine", label: "Sine (pure tone)" },
];

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.current = null; // currently playing nodes
  }

  /** Lazily initialize (or resume) the AudioContext */
  async ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  /** Stop any currently-playing sound */
  stop() {
    if (this.current) {
      try {
        this.current.osc.stop();
      } catch {
        /* already stopped */
      }
      this.current = null;
    }
  }

  /**
   * Play a sound with the given parameters.
   *
   * @param {Object} params
   * @param {number}  params.durationMs   – total duration in ms (50–5000)
   * @param {string}  params.waveform     – oscillator type: square | sawtooth | triangle | sine
   * @param {number}  params.masterGain   – overall volume 0..1
   * @param {number}  params.detune       – pitch detune in cents (-100..100)
   * @param {Array}   params.volPoints    – volume envelope [{x,y}] with y in 0..1
   * @param {Array}   params.freqPoints   – pitch envelope  [{x,y}] with y in Hz
   * @param {Function} params.onEnd       – callback when playback finishes
   */
  async play({
    durationMs,
    waveform = "square",
    masterGain = 0.6,
    detune = 0,
    volPoints,
    freqPoints,
    onEnd,
  }) {
    const ctx = await this.ensureContext();
    this.stop();

    const dur = clamp(durationMs, 50, 5000) / 1000;

    // --- Build the audio graph ---
    const osc = ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.value = 440; // will be overridden by automation
    osc.detune.value = clamp(detune, -1200, 1200);

    const gain = ctx.createGain();
    gain.gain.value = 0;

    const master = ctx.createGain();
    master.gain.value = clamp(masterGain, 0, 1);

    osc.connect(gain);
    gain.connect(master);
    master.connect(ctx.destination);

    // --- Schedule envelopes ---
    const t0 = ctx.currentTime + 0.02;
    const n = 200; // automation resolution
    const vol = sampleCurve(volPoints, n);
    const freq = sampleCurve(freqPoints, n);

    gain.gain.cancelScheduledValues(t0);
    osc.frequency.cancelScheduledValues(t0);

    for (let i = 0; i < n; i++) {
      const tt = t0 + (i / (n - 1)) * dur;
      const v = clamp(vol[i], 0, 1);
      const hz = clamp(freq[i], 50, 12000);

      // Use setValueAtTime for tight, robotic, precise scheduling
      gain.gain.setValueAtTime(v, tt);
      osc.frequency.setValueAtTime(hz, tt);
    }

    // Ensure gain goes to 0 at the end to avoid clicks
    gain.gain.setValueAtTime(0, t0 + dur);

    osc.start(t0);
    osc.stop(t0 + dur + 0.01);

    this.current = { osc, gain, master };

    // Auto-cleanup
    const doneMs = Math.ceil((dur + 0.1) * 1000);
    setTimeout(() => {
      if (this.current?.osc === osc) {
        this.current = null;
        onEnd?.();
      }
    }, doneMs);
  }

  /** Clean up */
  dispose() {
    this.stop();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

// Export a singleton so all components share the same AudioContext
export const audioEngine = new AudioEngine();
