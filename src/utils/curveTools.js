/**
 * Curve shape presets and smoothing algorithms for the graph editors.
 */

/* ------------------------------------------------------------------ */
/*  Preset curve shapes                                                */
/* ------------------------------------------------------------------ */

/**
 * Generate a preset curve as an array of {x, y} points.
 * All y-values are normalized 0..1 — the caller scales to yMin..yMax.
 */
const CURVE_GENERATORS = {
  /* ---- Basic ---- */
  "Linear Up": (n) =>
    Array.from({ length: n }, (_, i) => ({
      x: i / (n - 1),
      y: i / (n - 1),
    })),

  "Linear Down": (n) =>
    Array.from({ length: n }, (_, i) => ({
      x: i / (n - 1),
      y: 1 - i / (n - 1),
    })),

  "Flat High": () => [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],

  "Flat Mid": () => [
    { x: 0, y: 0.5 },
    { x: 1, y: 0.5 },
  ],

  /* ---- Easing ---- */
  "Ease In": (n) =>
    Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      return { x: t, y: t * t };
    }),

  "Ease Out": (n) =>
    Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      return { x: t, y: 1 - (1 - t) * (1 - t) };
    }),

  "Ease In-Out": (n) =>
    Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const y = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
      return { x: t, y };
    }),

  /* ---- Shapes ---- */
  "Bell Curve": (n) =>
    Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      // Gaussian-like bell
      const y = Math.exp(-18 * (t - 0.5) * (t - 0.5));
      return { x: t, y };
    }),

  "Attack-Sustain": () => [
    { x: 0, y: 0 },
    { x: 0.08, y: 0.9 },
    { x: 0.2, y: 0.75 },
    { x: 0.85, y: 0.7 },
    { x: 1, y: 0 },
  ],

  "Pluck / Decay": (n) =>
    Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      // Fast attack, exponential decay
      const y = t < 0.05 ? t / 0.05 : Math.exp(-4 * (t - 0.05));
      return { x: t, y };
    }),

  /* ---- Rhythmic ---- */
  Tremolo: (n) =>
    Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      // 4 pulses with fade
      const envelope = 1 - 0.4 * t;
      const osc = 0.5 + 0.5 * Math.sin(t * Math.PI * 8);
      return { x: t, y: osc * envelope };
    }),

  Staccato: () => [
    { x: 0, y: 0 },
    { x: 0.05, y: 0.9 },
    { x: 0.15, y: 0.1 },
    { x: 0.25, y: 0.08 },
    { x: 0.3, y: 0.85 },
    { x: 0.4, y: 0.1 },
    { x: 0.5, y: 0.08 },
    { x: 0.55, y: 0.8 },
    { x: 0.7, y: 0.3 },
    { x: 1, y: 0 },
  ],

  /* ---- Pitch-specific ---- */
  "Octave Jump": () => [
    { x: 0, y: 0.3 },
    { x: 0.45, y: 0.3 },
    { x: 0.55, y: 0.6 },
    { x: 1, y: 0.6 },
  ],

  Vibrato: (n) =>
    Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      // Subtle wobble around center
      const y = 0.5 + 0.08 * Math.sin(t * Math.PI * 12);
      return { x: t, y };
    }),

  "Siren Sweep": (n) =>
    Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const y = 0.5 + 0.4 * Math.sin(t * Math.PI * 2);
      return { x: t, y };
    }),
};

/**
 * Get a preset curve scaled to the given yMin/yMax range.
 * @param {string} name - Preset name
 * @param {number} yMin
 * @param {number} yMax
 * @param {number} numPoints - Number of points for parametric curves
 * @returns {{x:number, y:number}[]}
 */
export function getCurvePreset(name, yMin, yMax, numPoints = 12) {
  const gen = CURVE_GENERATORS[name];
  if (!gen) return null;
  const normalized = gen(numPoints);
  return normalized.map((p) => ({
    x: Math.round(p.x * 1000) / 1000,
    y: Math.round((yMin + p.y * (yMax - yMin)) * 100) / 100,
  }));
}

/** List of all available preset names */
export const CURVE_PRESET_NAMES = Object.keys(CURVE_GENERATORS);

/* ------------------------------------------------------------------ */
/*  Smoothing algorithms                                               */
/* ------------------------------------------------------------------ */

/**
 * Smooth the curve by averaging each interior point's y with its neighbors.
 * Endpoints are preserved. Can be applied multiple times for more smoothing.
 * @param {{x:number, y:number}[]} points - Sorted by x
 * @param {number} yMin
 * @param {number} yMax
 * @param {number} strength - 0..1 blend factor (0 = no change, 1 = full average)
 * @returns {{x:number, y:number}[]}
 */
export function smoothCurve(points, yMin, yMax, strength = 0.5) {
  if (points.length <= 2) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x);
  return sorted.map((p, i) => {
    if (i === 0 || i === sorted.length - 1) return { ...p };
    const prev = sorted[i - 1].y;
    const next = sorted[i + 1].y;
    const avg = (prev + p.y + next) / 3;
    const newY = p.y + (avg - p.y) * strength;
    return {
      x: p.x,
      y: Math.max(yMin, Math.min(yMax, Math.round(newY * 1000) / 1000)),
    };
  });
}

/**
 * Add intermediate points between existing points to create a smoother curve.
 * Uses Catmull-Rom-like interpolation (simplified).
 * @param {{x:number, y:number}[]} points - Sorted by x
 * @param {number} yMin
 * @param {number} yMax
 * @returns {{x:number, y:number}[]}
 */
export function subdivideCurve(points, yMin, yMax) {
  if (points.length <= 1) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const result = [sorted[0]];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    result.push({
      x: Math.round(midX * 1000) / 1000,
      y: Math.max(yMin, Math.min(yMax, Math.round(midY * 1000) / 1000)),
    });
    result.push(b);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Snap helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Snap a y-value to the nearest grid level.
 * @param {number} y - raw value
 * @param {number} yMin
 * @param {number} yMax
 * @param {number} divisions - number of grid divisions
 * @returns {number} snapped value
 */
export function snapToGrid(y, yMin, yMax, divisions = 8) {
  const range = yMax - yMin;
  const step = range / divisions;
  const snapped = Math.round((y - yMin) / step) * step + yMin;
  return Math.max(yMin, Math.min(yMax, Math.round(snapped * 1000) / 1000));
}

/**
 * Snap x-value to nearest percentage step.
 * @param {number} x - raw 0..1 value
 * @param {number} step - e.g., 0.05 for 5% steps
 * @returns {number}
 */
export function snapXToGrid(x, step = 0.05) {
  return Math.max(0, Math.min(1, Math.round(x / step) * step));
}
