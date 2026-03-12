/**
 * Audio Analyzer — Extract pitch (frequency) and volume envelopes
 * from an imported audio file (WAV/MP3).
 *
 * Uses autocorrelation-based pitch detection (YIN-inspired) and
 * RMS amplitude analysis in overlapping time windows.
 */

import { clamp } from "./dsp";

/**
 * Decode an audio File/Blob into a mono AudioBuffer.
 */
export async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } finally {
    ctx.close().catch(() => {});
  }
}

/**
 * Get a mono Float32Array from an AudioBuffer (mixes down if stereo).
 */
function getMonoSamples(audioBuffer) {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0);
  }
  const L = audioBuffer.getChannelData(0);
  const R = audioBuffer.getChannelData(1);
  const mono = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) {
    mono[i] = (L[i] + R[i]) * 0.5;
  }
  return mono;
}

/**
 * Compute RMS (root mean square) of a signal segment.
 */
function rms(samples, start, length) {
  let sum = 0;
  const end = Math.min(start + length, samples.length);
  const n = end - start;
  if (n <= 0) return 0;
  for (let i = start; i < end; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / n);
}

/**
 * Autocorrelation-based pitch detection (YIN-inspired).
 *
 * Returns { freq: number|null, confidence: number }
 *   - freq is null if no clear pitch detected
 *   - confidence ranges 0-1 (higher = more confident)
 */
function detectPitch(samples, start, windowSize, sampleRate, minFreq = 60, maxFreq = 5000) {
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);
  const end = Math.min(start + windowSize, samples.length);
  const actualSize = end - start;

  if (actualSize < maxPeriod * 2) {
    return { freq: null, confidence: 0 };
  }

  // Step 1: Compute difference function d(tau)
  const halfSize = Math.floor(actualSize / 2);
  const d = new Float32Array(halfSize);
  for (let tau = 0; tau < halfSize; tau++) {
    let sum = 0;
    for (let j = 0; j < halfSize; j++) {
      const diff = samples[start + j] - samples[start + j + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference function (CMND)
  const cmnd = new Float32Array(halfSize);
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += d[tau];
    cmnd[tau] = d[tau] / (runningSum / tau);
  }

  // Step 3: Absolute threshold — find first tau where cmnd dips below threshold
  const threshold = 0.15;
  let bestTau = -1;
  let bestVal = 1;

  for (let tau = minPeriod; tau < Math.min(maxPeriod, halfSize); tau++) {
    if (cmnd[tau] < threshold) {
      // Find the local minimum from here
      while (tau + 1 < halfSize && cmnd[tau + 1] < cmnd[tau]) {
        tau++;
      }
      bestTau = tau;
      bestVal = cmnd[tau];
      break;
    }
  }

  // Fallback: if threshold not met, find global minimum in range
  if (bestTau < 0) {
    for (let tau = minPeriod; tau < Math.min(maxPeriod, halfSize); tau++) {
      if (cmnd[tau] < bestVal) {
        bestVal = cmnd[tau];
        bestTau = tau;
      }
    }
  }

  if (bestTau < 0 || bestVal > 0.5) {
    return { freq: null, confidence: 0 };
  }

  // Step 4: Parabolic interpolation for sub-sample accuracy
  let refinedTau = bestTau;
  if (bestTau > 0 && bestTau < halfSize - 1) {
    const s0 = cmnd[bestTau - 1];
    const s1 = cmnd[bestTau];
    const s2 = cmnd[bestTau + 1];
    const denom = 2 * s1 - s2 - s0;
    if (Math.abs(denom) > 1e-10) {
      refinedTau = bestTau + (s0 - s2) / (2 * denom);
    }
  }

  const freq = sampleRate / refinedTau;
  const confidence = 1 - clamp(bestVal, 0, 1);

  return { freq, confidence };
}

/**
 * Analyze an AudioBuffer and extract volume + pitch envelopes.
 *
 * @param {AudioBuffer} audioBuffer — decoded audio
 * @param {Object} options
 * @param {number} options.resolution — number of output points (10–500, default 80)
 * @param {number} options.smoothing — smoothing passes (0–10, default 2)
 * @param {number} options.pitchConfidence — min confidence to accept pitch (0–1, default 0.3)
 * @param {number} options.minFreq — minimum detectable frequency Hz (default 60)
 * @param {number} options.maxFreq — maximum detectable frequency Hz (default 5000)
 *
 * @returns {{ volPoints, freqPoints, durationMs, info }}
 */
export function analyzeAudio(audioBuffer, options = {}) {
  const {
    resolution = 80,
    smoothing = 2,
    pitchConfidence = 0.3,
    minFreq = 60,
    maxFreq = 5000,
    normalizePitch = true,
    targetPitchMin = 200,
    targetPitchMax = 3000,
  } = options;

  const sampleRate = audioBuffer.sampleRate;
  const samples = getMonoSamples(audioBuffer);
  const totalSamples = samples.length;
  const durationSec = totalSamples / sampleRate;
  const durationMs = Math.round(durationSec * 1000);

  // Window size: at least 2 periods of the lowest frequency for pitch detection
  const minWindowSamples = Math.ceil(sampleRate / minFreq) * 4;
  const windowSize = Math.max(minWindowSamples, Math.floor(totalSamples / resolution));
  const hopSize = Math.floor(totalSamples / resolution);

  // Raw analysis
  const rawVol = [];
  const rawFreq = [];
  const rawConfidence = [];

  for (let i = 0; i < resolution; i++) {
    const start = Math.floor(i * hopSize);

    // Volume: RMS
    const vol = rms(samples, start, windowSize);
    rawVol.push(vol);

    // Pitch: autocorrelation
    const { freq, confidence } = detectPitch(samples, start, windowSize, sampleRate, minFreq, maxFreq);
    rawFreq.push(freq);
    rawConfidence.push(confidence);
  }

  // Normalize volume to 0-1
  const maxVol = Math.max(...rawVol, 1e-10);
  const normVol = rawVol.map((v) => v / maxVol);

  // Fill gaps in pitch (where detection failed) with interpolation
  const filledFreq = fillPitchGaps(rawFreq, rawConfidence, pitchConfidence, minFreq, maxFreq);

  // Normalize pitch — map the detected range to the target range using log scale
  // This preserves relative pitch intervals (e.g. octave relationships) while
  // spreading the curve across the editor's useful range
  const normalizedFreq = normalizePitch
    ? normalizePitchEnvelope(filledFreq, targetPitchMin, targetPitchMax)
    : filledFreq;

  // Apply smoothing
  const smoothedVol = applySmoothing(normVol, smoothing);
  const smoothedFreq = applySmoothing(normalizedFreq, smoothing);

  // Convert to point arrays
  const volPoints = smoothedVol.map((v, i) => ({
    x: resolution === 1 ? 0 : i / (resolution - 1),
    y: clamp(v, 0, 1),
  }));

  const freqPoints = smoothedFreq.map((f, i) => ({
    x: resolution === 1 ? 0 : i / (resolution - 1),
    y: clamp(f, minFreq, maxFreq),
  }));

  // Ensure first and last points are at x=0 and x=1
  if (volPoints.length > 0) {
    volPoints[0].x = 0;
    volPoints[volPoints.length - 1].x = 1;
  }
  if (freqPoints.length > 0) {
    freqPoints[0].x = 0;
    freqPoints[freqPoints.length - 1].x = 1;
  }

  // Calculate how many frames had confident pitch detection
  const confidentFrames = rawConfidence.filter((c) => c >= pitchConfidence).length;

  return {
    volPoints,
    freqPoints,
    durationMs,
    info: {
      sampleRate,
      totalSamples,
      durationSec: Math.round(durationSec * 100) / 100,
      windowSize,
      pitchConfidenceRate: Math.round((confidentFrames / resolution) * 100),
    },
  };
}

/**
 * Normalize pitch envelope using log-frequency mapping.
 * Maps the detected pitch range onto [targetMin, targetMax] while
 * preserving relative pitch intervals (logarithmic scaling).
 */
function normalizePitchEnvelope(freqs, targetMin, targetMax) {
  const valid = freqs.filter((f) => f != null && f > 0);
  if (valid.length === 0) return freqs;

  // Compute the actual detected range in log space
  const logFreqs = valid.map((f) => Math.log2(f));
  const srcMin = Math.min(...logFreqs);
  const srcMax = Math.max(...logFreqs);
  const srcRange = srcMax - srcMin;

  const dstLogMin = Math.log2(targetMin);
  const dstLogMax = Math.log2(targetMax);

  return freqs.map((f) => {
    if (f == null || f <= 0) return targetMin;
    const logF = Math.log2(f);
    // Map from source log range to destination log range
    const t = srcRange > 0.01 ? (logF - srcMin) / srcRange : 0.5;
    const mapped = dstLogMin + t * (dstLogMax - dstLogMin);
    return Math.pow(2, mapped);
  });
}

/**
 * Fill gaps in pitch array where detection failed,
 * using linear interpolation from nearest confident neighbors.
 */
function fillPitchGaps(freqs, confidences, minConf, minFreq, maxFreq) {
  const n = freqs.length;
  const result = new Array(n);
  const defaultFreq = 440; // fallback if nothing detected

  // Find first and last confident frames
  let firstConf = -1;
  let lastConf = -1;
  for (let i = 0; i < n; i++) {
    if (confidences[i] >= minConf && freqs[i] != null) {
      if (firstConf < 0) firstConf = i;
      lastConf = i;
    }
  }

  if (firstConf < 0) {
    // No confident detections at all — return flat default
    return new Array(n).fill(defaultFreq);
  }

  // Copy confident values
  for (let i = 0; i < n; i++) {
    if (confidences[i] >= minConf && freqs[i] != null) {
      result[i] = clamp(freqs[i], minFreq, maxFreq);
    } else {
      result[i] = null;
    }
  }

  // Extend edges
  for (let i = 0; i < firstConf; i++) result[i] = result[firstConf];
  for (let i = lastConf + 1; i < n; i++) result[i] = result[lastConf];

  // Interpolate interior gaps
  let prev = firstConf;
  for (let i = firstConf + 1; i <= lastConf; i++) {
    if (result[i] != null) {
      // Fill gap between prev and i
      if (i - prev > 1) {
        for (let j = prev + 1; j < i; j++) {
          const t = (j - prev) / (i - prev);
          result[j] = result[prev] + t * (result[i] - result[prev]);
        }
      }
      prev = i;
    }
  }

  return result;
}

/**
 * Simple moving-average smoothing with multiple passes.
 */
function applySmoothing(values, passes) {
  let arr = [...values];
  for (let p = 0; p < passes; p++) {
    const next = [...arr];
    for (let i = 1; i < arr.length - 1; i++) {
      next[i] = arr[i - 1] * 0.25 + arr[i] * 0.5 + arr[i + 1] * 0.25;
    }
    arr = next;
  }
  return arr;
}
