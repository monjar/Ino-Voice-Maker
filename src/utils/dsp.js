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