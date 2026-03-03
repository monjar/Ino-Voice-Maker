/**
 * Musical note frequencies for snap-to-note feature.
 * Covers C2 (65 Hz) through C8 (4186 Hz) — the useful range for SFX design.
 * Standard A4 = 440 Hz tuning.
 */

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Generate all note frequencies from C2 to C8 */
function generateNotes() {
  const notes = [];
  // MIDI note 36 = C2, MIDI note 108 = C8
  for (let midi = 36; midi <= 108; midi++) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const octave = Math.floor(midi / 12) - 1;
    const name = NOTE_NAMES[midi % 12] + octave;
    notes.push({ midi, freq: Math.round(freq * 100) / 100, name });
  }
  return notes;
}

export const ALL_NOTES = generateNotes();

/** All unique frequencies for snap targets */
export const NOTE_FREQUENCIES = ALL_NOTES.map((n) => n.freq);

/**
 * Find the closest musical note frequency to a given Hz value.
 * Returns the snapped frequency.
 */
export function snapToNote(hz) {
  let closest = ALL_NOTES[0];
  let minDist = Infinity;
  for (const note of ALL_NOTES) {
    // Use log-scale distance for musical correctness
    const dist = Math.abs(Math.log2(hz / note.freq));
    if (dist < minDist) {
      minDist = dist;
      closest = note;
    }
  }
  return closest.freq;
}

/**
 * Get the note name for a given frequency (nearest note).
 */
export function getNoteNameForFreq(hz) {
  let closest = ALL_NOTES[0];
  let minDist = Infinity;
  for (const note of ALL_NOTES) {
    const dist = Math.abs(Math.log2(hz / note.freq));
    if (dist < minDist) {
      minDist = dist;
      closest = note;
    }
  }
  return closest.name;
}
