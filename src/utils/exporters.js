/**
 * Export utilities — WAV, MP4 (WebM audio), and JSON export.
 */

import { audioEngine } from "../audio/AudioEngine";

/**
 * Convert an AudioBuffer to a WAV Blob.
 */
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const data = buffer.getChannelData(0);
  const dataLength = data.length * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Trigger a browser download of a Blob.
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export the current sound as a .wav file.
 */
export async function exportWav(params, filename = "robot-sfx.wav") {
  const buffer = await audioEngine.renderOffline(params);
  const blob = audioBufferToWav(buffer);
  downloadBlob(blob, filename);
}

/**
 * Export the current sound as an .mp4 (actually WebM/Opus audio container).
 * Uses MediaRecorder on an OfflineAudioContext streamed through a live context.
 */
export async function exportMp4(params, filename = "robot-sfx.mp4") {
  // Render offline first to get the audio buffer
  const buffer = await audioEngine.renderOffline(params);

  // Create a live AudioContext to stream through MediaRecorder
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const dest = ctx.createMediaStreamDestination();

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(dest);

  // Pick a supported mime type for the container
  const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
    ? "audio/mp4"
    : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";

  const recorder = new MediaRecorder(dest.stream, { mimeType });
  const chunks = [];

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      ctx.close().catch(() => {});
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const finalName = filename.replace(/\.\w+$/, `.${ext}`);
      const blob = new Blob(chunks, { type: mimeType });
      downloadBlob(blob, finalName);
      resolve();
    };

    recorder.onerror = (e) => {
      ctx.close().catch(() => {});
      reject(e);
    };

    recorder.start();
    source.start();

    // Stop after the buffer duration + small buffer
    const durationMs = Math.ceil(buffer.duration * 1000) + 100;
    setTimeout(() => {
      try { recorder.stop(); } catch { /* ok */ }
    }, durationMs);
  });
}

/**
 * Export the full project state as a .json file.
 */
export function exportJson(state, filename = "robot-sfx-project.json") {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, filename);
}
