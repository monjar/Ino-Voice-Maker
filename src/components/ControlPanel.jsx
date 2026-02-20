import React from "react";
import { WAVEFORMS } from "../audio/AudioEngine";

/**
 * ControlPanel — User-friendly controls for the sound parameters.
 *
 * Uses sliders + labels with plain-English descriptions so non-technical
 * users can understand what each control does.
 */

function Slider({ label, help, value, onChange, min, max, step = 1, unit = "" }) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-white/80 text-sm font-medium">{label}</span>
        <span className="text-white/50 text-xs font-mono tabular-nums">
          {typeof value === "number" && step < 1 ? value.toFixed(2) : value}
          {unit && ` ${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value, 10))}
        className="w-full h-1.5 appearance-none bg-white/10 rounded-full outline-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md
                   [&::-webkit-slider-thumb]:hover:bg-cyan-300 [&::-webkit-slider-thumb]:transition"
      />
      {help && <span className="text-white/35 text-xs leading-tight">{help}</span>}
    </label>
  );
}

export default function ControlPanel({
  durationMs,
  setDurationMs,
  waveform,
  setWaveform,
  masterGain,
  setMasterGain,
  detune,
  setDetune,
  isPlaying,
  status,
  onPlay,
  onStop,
  onRandomize,
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <h3 className="text-white font-semibold mb-1">Sound Controls</h3>
      <p className="text-white/40 text-xs mb-4">
        Tweak how your sound effect behaves
      </p>

      <div className="flex flex-col gap-4">
        {/* Waveform selector */}
        <div className="flex flex-col gap-1.5">
          <span className="text-white/80 text-sm font-medium">Sound Type</span>
          <div className="grid grid-cols-2 gap-1.5">
            {WAVEFORMS.map((w) => (
              <button
                key={w.value}
                onClick={() => setWaveform(w.value)}
                className={`px-2.5 py-2 rounded-lg text-xs text-left transition border ${
                  waveform === w.value
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-white/5 border-white/8 text-white/60 hover:bg-white/10 hover:text-white/80"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <span className="text-white/35 text-xs">
            Changes the character of the beep sound
          </span>
        </div>

        <Slider
          label="Duration"
          help="How long the sound plays (shorter = snappier)"
          value={durationMs}
          onChange={setDurationMs}
          min={50}
          max={2000}
          step={10}
          unit="ms"
        />

        <Slider
          label="Volume"
          help="Overall loudness — keep it moderate to avoid clipping"
          value={masterGain}
          onChange={setMasterGain}
          min={0}
          max={1}
          step={0.01}
        />

        <Slider
          label="Detune"
          help="Slightly shift the pitch up or down for variation"
          value={detune}
          onChange={setDetune}
          min={-100}
          max={100}
          step={1}
          unit="cents"
        />
      </div>

      {/* Play / Stop / Randomize */}
      <div className="flex gap-2 mt-5">
        <button
          onClick={isPlaying ? onStop : onPlay}
          className={`flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition border cursor-pointer ${
            isPlaying
              ? "bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-300"
              : "bg-cyan-500 hover:bg-cyan-400 border-cyan-400 text-black"
          }`}
        >
          {isPlaying ? "⏹ Stop" : "▶ Play Sound"}
        </button>
        <button
          onClick={onRandomize}
          className="px-4 py-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white text-sm font-semibold transition cursor-pointer"
          title="Randomize all parameters"
        >
          🎲
        </button>
      </div>

      {/* Status */}
      <div className="mt-3 text-xs text-white/40">
        {status}
      </div>
    </div>
  );
}
