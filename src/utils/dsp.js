/**
 * Math & DSP utility functions for the SFX designer.
 */

/** Clamp a value between min and max */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** Linear interpolation */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Format a Hz value as human-readable string */
export function formatHz(v) {
  if (v >= 1000) return ` kHz`;
  return ` Hz`;
}

/**
 * Sample a piecewise-linear curve defined by points [{x:0..1, y:number}]
 * into an array of nSamples evenly-spaced values.
 */
export function sampleCurve(points, nSamples) {
  const pts = [...points].sort((a, b) => a.x - b.x);
  const out = new Array(nSamples);
  let j = 0;
  for (let i = 0; i < nSamples; i++) {
    const x = i / (nSamples - 1);
    while (j < pts.length - 2 && x > pts[j + 1].x) j++;
    const a = pts[j];
    const b = pts[j + 1];
    const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
    out[i] = lerp(a.y, b.y, clamp(t, 0, 1));
  }
  return out;
}