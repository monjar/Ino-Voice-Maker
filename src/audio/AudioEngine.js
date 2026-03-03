/**
 * AudioEngine — oscillator-based robotic/beep sound synthesis.
 *
 * Signal chain (when detune ≠ 0 a second oscillator is added for thick unison):
 *
 *   OscillatorNode (main)    ──┐
 *                              ├─→ GainNode (vol envelope) → MasterGain → destination
 *   OscillatorNode (detuned) ──┘
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
      try { this.current.osc.stop(); } catch { /* already stopped */ }
      try { this.current.osc2?.stop(); } catch { /* ok */ }
      this.current = null;
    }
  }

  /**
   * Build the audio graph and schedule envelopes on an arbitrary AudioContext.
   * Used for both real-time playback and offline rendering.
   *
   * @returns {{ osc, osc2, gain, master, t0, dur }}
   */
  _buildGraph(ctx, {
    durationMs,
    waveform = "square",
    masterGain: masterGainVal = 0.6,
    detune = 0,
    volPoints,
    freqPoints,
  }, startTime = null) {
    const dur = clamp(durationMs, 50, 5000) / 1000;
    const t0 = startTime ?? ctx.currentTime + 0.02;
    const detuneVal = clamp(detune, -1200, 1200);

    // --- Main oscillator ---
    const osc = ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.value = 440;

    // --- Volume envelope gain ---
    const gain = ctx.createGain();
    gain.gain.value = 0;

    // --- Master volume ---
    const master = ctx.createGain();
    master.gain.value = clamp(masterGainVal, 0, 1);

    osc.connect(gain);

    // --- Second detuned oscillator for a thick chorus/unison effect ---
    let osc2 = null;
    if (Math.abs(detuneVal) > 0) {
      osc2 = ctx.createOscillator();
      osc2.type = waveform;
      osc2.frequency.value = 440;
      osc2.detune.value = detuneVal;
      osc2.connect(gain);
    }

    gain.connect(master);
    master.connect(ctx.destination);

    // --- Schedule envelopes ---
    const n = 200;
    const vol = sampleCurve(volPoints, n);
    const freq = sampleCurve(freqPoints, n);

    gain.gain.cancelScheduledValues(t0);
    osc.frequency.cancelScheduledValues(t0);

    for (let i = 0; i < n; i++) {
      const tt = t0 + (i / (n - 1)) * dur;
      const v = clamp(vol[i], 0, 1);
      const hz = clamp(freq[i], 50, 12000);

      gain.gain.setValueAtTime(v, tt);
      osc.frequency.setValueAtTime(hz, tt);
      if (osc2) osc2.frequency.setValueAtTime(hz, tt);
    }

    gain.gain.setValueAtTime(0, t0 + dur);

    osc.start(t0);
    osc.stop(t0 + dur + 0.01);
    if (osc2) {
      osc2.start(t0);
      osc2.stop(t0 + dur + 0.01);
    }

    return { osc, osc2, gain, master, t0, dur };
  }

  /**
   * Play a sound with the given parameters (real-time).
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

    const { osc, osc2, gain, master, dur } = this._buildGraph(ctx, {
      durationMs, waveform, masterGain, detune, volPoints, freqPoints,
    });

    this.current = { osc, osc2, gain, master };

    const doneMs = Math.ceil((dur + 0.1) * 1000);
    setTimeout(() => {
      if (this.current?.osc === osc) {
        this.current = null;
        onEnd?.();
      }
    }, doneMs);
  }

  /**
   * Render the sound offline and return an AudioBuffer.
   */
  async renderOffline(params) {
    const dur = clamp(params.durationMs, 50, 5000) / 1000;
    const sampleRate = 44100;
    const length = Math.ceil((dur + 0.05) * sampleRate);
    const offlineCtx = new OfflineAudioContext(1, length, sampleRate);

    this._buildGraph(offlineCtx, params, 0.01);

    const buffer = await offlineCtx.startRendering();
    return buffer;
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
