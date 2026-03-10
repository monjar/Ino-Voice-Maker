import React, { useRef, useState, useCallback } from "react";
import { decodeAudioFile, analyzeAudio } from "../utils/audioAnalyzer";

/**
 * AudioImportPanel — Import an audio file (WAV/MP3) and convert it to
 * the app's volume + pitch curve format for editing.
 */
export default function AudioImportPanel({ onImport }) {
  const fileInputRef = useRef(null);
  const [state, setState] = useState("idle"); // idle | loading | preview | error
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState("");

  // Analysis settings
  const [resolution, setResolution] = useState(80);
  const [smoothing, setSmoothing] = useState(2);
  const [pitchConfidence, setPitchConfidence] = useState(0.3);
  const [minFreq, setMinFreq] = useState(60);
  const [maxFreq, setMaxFreq] = useState(5000);

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setState("loading");
    setError(null);

    try {
      const buffer = await decodeAudioFile(file);
      setAudioBuffer(buffer);

      // Run initial analysis
      const result = analyzeAudio(buffer, {
        resolution,
        smoothing,
        pitchConfidence,
        minFreq,
        maxFreq,
      });
      setPreview(result);
      setState("preview");
    } catch (err) {
      setError(err.message);
      setState("error");
    }

    // Reset input so same file can be re-selected
    e.target.value = "";
  }, [resolution, smoothing, pitchConfidence, minFreq, maxFreq]);

  /** Re-analyze with updated settings */
  const reanalyze = useCallback(() => {
    if (!audioBuffer) return;
    try {
      const result = analyzeAudio(audioBuffer, {
        resolution,
        smoothing,
        pitchConfidence,
        minFreq,
        maxFreq,
      });
      setPreview(result);
    } catch (err) {
      setError(err.message);
    }
  }, [audioBuffer, resolution, smoothing, pitchConfidence, minFreq, maxFreq]);

  /** Apply the analyzed curves to the main editor */
  const handleApply = useCallback(() => {
    if (!preview) return;
    onImport({
      volPoints: preview.volPoints,
      freqPoints: preview.freqPoints,
      durationMs: Math.min(preview.durationMs, 5000),
    });
    setState("idle");
    setAudioBuffer(null);
    setPreview(null);
  }, [preview, onImport]);

  const handleCancel = () => {
    setState("idle");
    setAudioBuffer(null);
    setPreview(null);
    setError(null);
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <h3 className="text-white font-semibold mb-1">🎤 Import Audio</h3>
      <p className="text-white/40 text-xs mb-3">
        Import a voice recording or audio file and convert it to editable curves
      </p>

      {state === "idle" && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-3 py-3 rounded-xl text-sm font-semibold transition border cursor-pointer
              bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20
              text-amber-300 hover:from-amber-500/20 hover:to-orange-500/20 hover:text-amber-200"
          >
            🎵 Import WAV / MP3
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,audio/wav,audio/mpeg,audio/mp3"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-white/30 text-xs mt-2">
            Audio will be analyzed for pitch &amp; volume, then mapped to editable curves.
            Best with short clips (voice, sound effects). Some data loss is expected.
          </p>
        </>
      )}

      {state === "loading" && (
        <div className="text-center py-6">
          <div className="inline-block w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-white/60 text-sm">Analyzing "{fileName}"…</p>
        </div>
      )}

      {state === "error" && (
        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-sm font-medium">Import failed</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
          </div>
          <button onClick={handleCancel} className={cancelBtnClass}>
            Try Again
          </button>
        </div>
      )}

      {state === "preview" && preview && (
        <div className="space-y-3">
          {/* File info */}
          <div className="bg-white/5 rounded-xl p-3 text-xs">
            <p className="text-white/80 font-medium mb-1">📄 {fileName}</p>
            <div className="grid grid-cols-2 gap-1 text-white/50">
              <span>Duration: {preview.info.durationSec}s</span>
              <span>Sample rate: {preview.info.sampleRate} Hz</span>
              <span>Pitch confidence: {preview.info.pitchConfidenceRate}%</span>
              <span>Points: {preview.volPoints.length}</span>
            </div>
          </div>

          {/* Mini curve previews */}
          <div className="grid grid-cols-2 gap-2">
            <MiniCurvePreview
              points={preview.volPoints}
              label="Volume"
              color="#22d3ee"
              yMin={0}
              yMax={1}
            />
            <MiniCurvePreview
              points={preview.freqPoints}
              label="Pitch"
              color="#a78bfa"
              yMin={minFreq}
              yMax={maxFreq}
            />
          </div>

          {/* Accuracy controls */}
          <details className="group">
            <summary className="text-white/50 text-xs cursor-pointer hover:text-white/70 select-none">
              ⚙️ Analysis Settings (click to adjust)
            </summary>
            <div className="mt-2 space-y-2 bg-white/3 rounded-lg p-3">
              <SliderControl
                label="Resolution (points)"
                value={resolution}
                min={10}
                max={300}
                step={5}
                onChange={setResolution}
                format={(v) => `${v} pts`}
              />
              <SliderControl
                label="Smoothing"
                value={smoothing}
                min={0}
                max={10}
                step={1}
                onChange={setSmoothing}
                format={(v) => v === 0 ? "Off" : `${v}×`}
              />
              <SliderControl
                label="Pitch Confidence"
                value={pitchConfidence}
                min={0.05}
                max={0.8}
                step={0.05}
                onChange={setPitchConfidence}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <SliderControl
                label="Min Frequency"
                value={minFreq}
                min={30}
                max={300}
                step={10}
                onChange={setMinFreq}
                format={(v) => `${v} Hz`}
              />
              <SliderControl
                label="Max Frequency"
                value={maxFreq}
                min={1000}
                max={8000}
                step={100}
                onChange={setMaxFreq}
                format={(v) => `${(v / 1000).toFixed(1)} kHz`}
              />
              <button
                onClick={reanalyze}
                className="w-full px-2 py-1.5 rounded-lg text-xs font-medium
                  bg-amber-500/10 border border-amber-500/20 text-amber-300
                  hover:bg-amber-500/20 transition cursor-pointer"
              >
                🔄 Re-analyze
              </button>
            </div>
          </details>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={handleCancel} className={cancelBtnClass}>
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition border cursor-pointer
                bg-gradient-to-r from-green-500/15 to-emerald-500/15 border-green-500/25
                text-green-300 hover:from-green-500/25 hover:to-emerald-500/25"
            >
              ✅ Apply to Editor
            </button>
          </div>

          {preview.info.pitchConfidenceRate < 50 && (
            <p className="text-amber-400/70 text-xs">
              ⚠️ Low pitch detection confidence ({preview.info.pitchConfidenceRate}%).
              The pitch curve may not be accurate — try adjusting settings or using
              a cleaner recording.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

const cancelBtnClass =
  "flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition border cursor-pointer " +
  "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70";

/** Tiny inline SVG curve preview */
function MiniCurvePreview({ points, label, color, yMin, yMax }) {
  const w = 140;
  const h = 50;
  const pad = 4;

  const toSvg = (pt) => {
    const sx = pad + pt.x * (w - 2 * pad);
    const sy = h - pad - ((pt.y - yMin) / (yMax - yMin)) * (h - 2 * pad);
    return `${sx},${sy}`;
  };

  const pathD =
    points.length > 0
      ? "M " + points.map(toSvg).join(" L ")
      : "";

  return (
    <div className="bg-white/5 rounded-lg p-2">
      <p className="text-white/50 text-[10px] font-medium mb-1">{label}</p>
      <svg width={w} height={h} className="w-full" viewBox={`0 0 ${w} ${h}`}>
        <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} />
      </svg>
    </div>
  );
}

/** Small labeled slider */
function SliderControl({ label, value, min, max, step, onChange, format }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-white/40 text-[10px] w-28 shrink-0">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-amber-400"
      />
      <span className="text-white/50 text-[10px] w-12 text-right">{format(value)}</span>
    </div>
  );
}
