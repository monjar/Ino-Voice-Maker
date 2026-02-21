/**
 * Sound presets — each one sets up waveform, envelopes, and parameters
 * to create a distinct robotic sound effect.
 */
export const PRESETS = [
  {
    name: "Happy Chirp",
    description: "Cheerful rising beep — great for confirmations & power-ups",
    icon: "😊",
    config: {
      durationMs: 350,
      waveform: "square",
      masterGain: 0.5,
      detune: 0,
      volPoints: [
        { x: 0, y: 0 },
        { x: 0.05, y: 1 },
        { x: 0.4, y: 0.8 },
        { x: 0.7, y: 0.9 },
        { x: 0.9, y: 0.3 },
        { x: 1, y: 0 },
      ],
      freqPoints: [
        { x: 0, y: 600 },
        { x: 0.15, y: 1200 },
        { x: 0.5, y: 900 },
        { x: 0.75, y: 1800 },
        { x: 1, y: 1400 },
      ],
    },
  },
  {
    name: "Error Buzz",
    description: "Low harsh buzz — perfect for errors & wrong answers",
    icon: "⚠️",
    config: {
      durationMs: 500,
      waveform: "sawtooth",
      masterGain: 0.45,
      detune: -20,
      volPoints: [
        { x: 0, y: 0 },
        { x: 0.03, y: 1 },
        { x: 0.15, y: 0.4 },
        { x: 0.3, y: 0.9 },
        { x: 0.5, y: 0.3 },
        { x: 1, y: 0 },
      ],
      freqPoints: [
        { x: 0, y: 250 },
        { x: 0.2, y: 180 },
        { x: 0.5, y: 220 },
        { x: 1, y: 120 },
      ],
    },
  },
  {
    name: "Success Ding",
    description: "Clean upward ping — ideal for success & achievements",
    icon: "✅",
    config: {
      durationMs: 300,
      waveform: "triangle",
      masterGain: 0.55,
      detune: 0,
      volPoints: [
        { x: 0, y: 0 },
        { x: 0.04, y: 1 },
        { x: 0.2, y: 0.7 },
        { x: 0.5, y: 0.4 },
        { x: 1, y: 0 },
      ],
      freqPoints: [
        { x: 0, y: 800 },
        { x: 0.15, y: 1600 },
        { x: 0.4, y: 1400 },
        { x: 1, y: 1200 },
      ],
    },
  },
  {
    name: "Robot Boop",
    description: "Short descending boop — classic robot acknowledgement",
    icon: "🤖",
    config: {
      durationMs: 200,
      waveform: "square",
      masterGain: 0.5,
      detune: 0,
      volPoints: [
        { x: 0, y: 0 },
        { x: 0.06, y: 1 },
        { x: 0.5, y: 0.6 },
        { x: 1, y: 0 },
      ],
      freqPoints: [
        { x: 0, y: 1400 },
        { x: 0.3, y: 800 },
        { x: 1, y: 400 },
      ],
    },
  },
  {
    name: "Laser Zap",
    description: "Fast downward sweep — for shooting & zapping effects",
    icon: "⚡",
    config: {
      durationMs: 180,
      waveform: "sawtooth",
      masterGain: 0.45,
      detune: 10,
      volPoints: [
        { x: 0, y: 0 },
        { x: 0.02, y: 1 },
        { x: 0.3, y: 0.7 },
        { x: 1, y: 0 },
      ],
      freqPoints: [
        { x: 0, y: 3000 },
        { x: 0.1, y: 2000 },
        { x: 0.5, y: 600 },
        { x: 1, y: 150 },
      ],
    },
  },
  {
    name: "Coin Pickup",
    description: "Two-note rising chime — for collectibles & rewards",
    icon: "🪙",
    config: {
      durationMs: 280,
      waveform: "square",
      masterGain: 0.45,
      detune: 0,
      volPoints: [
        { x: 0, y: 0 },
        { x: 0.04, y: 0.9 },
        { x: 0.3, y: 0.1 },
        { x: 0.4, y: 0 },
        { x: 0.44, y: 0.95 },
        { x: 0.75, y: 0.5 },
        { x: 1, y: 0 },
      ],
      freqPoints: [
        { x: 0, y: 988 },
        { x: 0.35, y: 988 },
        { x: 0.42, y: 1319 },
        { x: 1, y: 1319 },
      ],
    },
  },
];
