/**
 * AudioEngine â€” basic oscillator-based sound synthesis.
 */

import { clamp, sampleCurve } from '../utils/dsp';

export const WAVEFORMS = [
  { value: 'square', label: 'Square' },
  { value: 'sawtooth', label: 'Sawtooth' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'sine', label: 'Sine' },
];

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.current = null;
  }

  async ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  stop() {
    if (this.current) {
      try { this.current.osc.stop(); } catch {}
      this.current = null;
    }
  }

  async play({ durationMs, waveform = 'square', masterGain = 0.6, volPoints, freqPoints, onEnd }) {
    const ctx = await this.ensureContext();
    this.stop();

    const dur = clamp(durationMs, 50, 5000) / 1000;
    const osc = ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.value = 440;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    const master = ctx.createGain();
    master.gain.value = clamp(masterGain, 0, 1);

    osc.connect(gain);
    gain.connect(master);
    master.connect(ctx.destination);

    const t0 = ctx.currentTime + 0.02;
    const n = 200;
    const vol = sampleCurve(volPoints, n);
    const freq = sampleCurve(freqPoints, n);

    for (let i = 0; i < n; i++) {
      const tt = t0 + (i / (n - 1)) * dur;
      gain.gain.setValueAtTime(clamp(vol[i], 0, 1), tt);
      osc.frequency.setValueAtTime(clamp(freq[i], 50, 12000), tt);
    }

    gain.gain.setValueAtTime(0, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.01);

    this.current = { osc, gain, master };

    setTimeout(() => {
      if (this.current?.osc === osc) {
        this.current = null;
        onEnd?.();
      }
    }, Math.ceil((dur + 0.1) * 1000));
  }

  dispose() {
    this.stop();
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; }
  }
}

export const audioEngine = new AudioEngine();