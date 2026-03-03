import React, { useEffect, useState } from "react";
import GraphEditor from "./GraphEditor";
import ControlPanel from "./ControlPanel";
import PresetPanel from "./PresetPanel";
import ExportPanel from "./ExportPanel";
import { audioEngine } from "../audio/AudioEngine";
import { PRESETS } from "../audio/presets";
import { clamp, formatHz } from "../utils/dsp";
import { exportWav, exportMp4, exportJson } from "../utils/exporters";

/**
 * RobotSfxDesigner — Main page component.
 *
 * Wires together the graph editors, control panel, and preset panel.
 * Manages all sound-parameter state and delegates playback to AudioEngine.
 */

// Default starting preset — the first one
const DEFAULT = PRESETS[0].config;

export default function RobotSfxDesigner() {
  // --- State ---
  const [durationMs, setDurationMs] = useState(DEFAULT.durationMs);
  const [waveform, setWaveform] = useState(DEFAULT.waveform);
  const [masterGain, setMasterGain] = useState(DEFAULT.masterGain);
  const [detune, setDetune] = useState(DEFAULT.detune);
  const [volPoints, setVolPoints] = useState(DEFAULT.volPoints);
  const [freqPoints, setFreqPoints] = useState(DEFAULT.freqPoints);

  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Ready — pick a preset or shape the graphs, then hit Play");
  const [activePreset, setActivePreset] = useState(PRESETS[0].name);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => audioEngine.dispose();
  }, []);

  // --- Actions ---
  function stop() {
    audioEngine.stop();
    setIsPlaying(false);
    setStatus("Stopped");
  }

  async function play() {
    setStatus("Playing…");
    setIsPlaying(true);
    try {
      await audioEngine.play({
        durationMs,
        waveform,
        masterGain,
        detune,
        volPoints,
        freqPoints,
        onEnd: () => {
          setIsPlaying(false);
          setStatus("Done — tweak the curves and play again!");
        },
      });
      setStatus(`Playing (${durationMs} ms)`);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
      setIsPlaying(false);
    }
  }

  function applyPreset(preset) {
    const c = preset.config;
    setDurationMs(c.durationMs);
    setWaveform(c.waveform);
    setMasterGain(c.masterGain);
    setDetune(c.detune);
    setVolPoints([...c.volPoints]);
    setFreqPoints([...c.freqPoints]);
    setActivePreset(preset.name);
    setStatus(`Loaded "${preset.name}" — hit Play to hear it`);
  }

  function randomize() {
    setDurationMs((d) => clamp(Math.round(d * (0.7 + Math.random() * 0.6)), 80, 1500));
    setMasterGain((g) => clamp(parseFloat((g * (0.8 + Math.random() * 0.4)).toFixed(2)), 0.15, 0.8));
    setDetune(Math.round((Math.random() - 0.5) * 1200));

    // Randomize waveforms
    const wfs = ["square", "sawtooth", "triangle", "sine"];
    setWaveform(wfs[Math.floor(Math.random() * wfs.length)]);

    // Randomize envelope shapes (keep start/end structure)
    const randomEnv = (yMin, yMax, nMid = 2 + Math.floor(Math.random() * 3)) => {
      const pts = [{ x: 0, y: yMin + Math.random() * (yMax - yMin) * 0.3 }];
      for (let i = 0; i < nMid; i++) {
        pts.push({
          x: 0.1 + (i / nMid) * 0.8 + (Math.random() * 0.1),
          y: yMin + Math.random() * (yMax - yMin),
        });
      }
      pts.push({ x: 1, y: yMin + Math.random() * (yMax - yMin) * 0.2 });
      return pts;
    };

    setVolPoints(randomEnv(0, 1));
    setFreqPoints(randomEnv(150, 4000));
    setActivePreset(null);
    setStatus("Randomized! Hit Play to hear it");
  }

  // Clear active preset marker when user manually edits
  const handleVolChange = (fn) => {
    setVolPoints(fn);
    setActivePreset(null);
  };
  const handleFreqChange = (fn) => {
    setFreqPoints(fn);
    setActivePreset(null);
  };

  /** Collect all current parameters into a plain object */
  function getCurrentParams() {
    return { durationMs, waveform, masterGain, detune, volPoints, freqPoints };
  }

  /** Collect the full project state (for JSON export/import) */
  function getProjectState() {
    return {
      version: 1,
      name: activePreset || "Custom",
      params: getCurrentParams(),
    };
  }

  /** Load project state from a parsed JSON object */
  function loadProject(data) {
    try {
      const p = data?.params;
      if (!p || !Array.isArray(p.volPoints) || !Array.isArray(p.freqPoints)) {
        throw new Error("Invalid project file — missing params or envelope points");
      }
      setDurationMs(p.durationMs ?? DEFAULT.durationMs);
      setWaveform(p.waveform ?? DEFAULT.waveform);
      setMasterGain(p.masterGain ?? DEFAULT.masterGain);
      setDetune(p.detune ?? DEFAULT.detune);
      setVolPoints([...p.volPoints]);
      setFreqPoints([...p.freqPoints]);
      setActivePreset(data.name === "Custom" ? null : data.name ?? null);
      setStatus(`Loaded project "${data.name || "Untitled"}" from JSON`);
    } catch (err) {
      setStatus(`Import failed: ${err.message}`);
      alert(`Could not load project: ${err.message}`);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            🤖 Robot SFX Designer
          </h1>
          <p className="text-white/60 mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">
            Create short robotic sound effects by shaping two graphs:
            <strong className="text-white/90"> Volume</strong> (how loud over time) and
            <strong className="text-white/90"> Pitch</strong> (how high/low over time).
            Pick a preset to start, then drag the points to customize your sound.
          </p>
        </header>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: graphs */}
          <div className="flex flex-col gap-5">
            <GraphEditor
              title="🔊 Volume Over Time"
              description="Shape how loud the sound is from start to finish. Peaks = loud, valleys = quiet."
              points={volPoints}
              setPoints={handleVolChange}
              yMin={0}
              yMax={1}
              yFormat={(v) => `${Math.round(v * 100)}%`}
              curveColor="#22d3ee"
            />

            <GraphEditor
              title="🎵 Pitch Over Time"
              description="Shape how high or low the tone is. Higher values = higher beep, lower = deeper buzz."
              points={freqPoints}
              setPoints={handleFreqChange}
              yMin={150}
              yMax={5000}
              yFormat={(v) => formatHz(v)}
              curveColor="#a78bfa"
            />

            {/* How-it-works section */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
              <h3 className="text-white/70 font-semibold text-sm mb-2">💡 How It Works</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-white/50 leading-relaxed">
                <div>
                  <span className="text-cyan-400 font-medium">Volume graph</span> controls
                  loudness over time. Start at 0 (silence), ramp up for the attack, then
                  fade down for the release.
                </div>
                <div>
                  <span className="text-purple-400 font-medium">Pitch graph</span> controls
                  the frequency. Sweep upward for a rising chirp, downward for a laser zap,
                  or create steps for robotic speech.
                </div>
                <div>
                  <span className="text-white/70 font-medium">Sound type</span> changes the
                  wave shape: Square is a classic retro beep, Sawtooth is buzzy, Triangle is
                  softer, and Sine is a pure tone.
                </div>
              </div>
            </div>
          </div>

          {/* Right: controls + presets */}
          <div className="flex flex-col gap-5">
            <ControlPanel
              durationMs={durationMs}
              setDurationMs={(v) => { setDurationMs(v); setActivePreset(null); }}
              waveform={waveform}
              setWaveform={(v) => { setWaveform(v); setActivePreset(null); }}
              masterGain={masterGain}
              setMasterGain={(v) => { setMasterGain(v); setActivePreset(null); }}
              detune={detune}
              setDetune={(v) => { setDetune(v); setActivePreset(null); }}
              isPlaying={isPlaying}
              status={status}
              onPlay={play}
              onStop={stop}
              onRandomize={randomize}
            />

            <PresetPanel
              onApplyPreset={applyPreset}
              activePresetName={activePreset}
            />

            <ExportPanel
              onExportWav={() => exportWav(getCurrentParams())}
              onExportMp4={() => exportMp4(getCurrentParams())}
              onExportJson={() => exportJson(getProjectState())}
              onImportJson={loadProject}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-white/8 text-white/30 text-xs">
          Built with WebAudio API · Oscillator → Gain → Output · Envelopes automate gain and frequency over time
        </footer>
      </div>
    </div>
  );
}
