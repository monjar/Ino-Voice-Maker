export const PRESETS = [
  {
    name: 'Happy Chirp',
    description: 'Cheerful rising beep',
    icon: '\u{1F60A}',
    config: {
      durationMs: 350, waveform: 'square', masterGain: 0.5, detune: 0,
      volPoints: [{ x: 0, y: 0 }, { x: 0.05, y: 1 }, { x: 0.4, y: 0.8 }, { x: 0.7, y: 0.9 }, { x: 0.9, y: 0.3 }, { x: 1, y: 0 }],
      freqPoints: [{ x: 0, y: 600 }, { x: 0.15, y: 1200 }, { x: 0.5, y: 900 }, { x: 0.75, y: 1800 }, { x: 1, y: 1400 }],
    },
  },
  {
    name: 'Error Buzz',
    description: 'Low harsh buzz',
    icon: '\u26A0\uFE0F',
    config: {
      durationMs: 500, waveform: 'sawtooth', masterGain: 0.45, detune: -20,
      volPoints: [{ x: 0, y: 0 }, { x: 0.03, y: 1 }, { x: 0.15, y: 0.4 }, { x: 0.3, y: 0.9 }, { x: 0.5, y: 0.3 }, { x: 1, y: 0 }],
      freqPoints: [{ x: 0, y: 250 }, { x: 0.2, y: 180 }, { x: 0.5, y: 220 }, { x: 1, y: 120 }],
    },
  },
  {
    name: 'Success Ding',
    description: 'Clean upward ping',
    icon: '\u2705',
    config: {
      durationMs: 300, waveform: 'triangle', masterGain: 0.55, detune: 0,
      volPoints: [{ x: 0, y: 0 }, { x: 0.04, y: 1 }, { x: 0.2, y: 0.7 }, { x: 0.5, y: 0.4 }, { x: 1, y: 0 }],
      freqPoints: [{ x: 0, y: 800 }, { x: 0.15, y: 1600 }, { x: 0.4, y: 1400 }, { x: 1, y: 1200 }],
    },
  },
];