import React, { useMemo } from "react";
import { PRESETS } from "../audio/presets";

/**
 * PresetPanel — List of ready-made sound presets grouped by category.
 *
 * Each preset loads a full configuration (waveform, envelopes, duration, etc.)
 * so the user can start from a known-good sound and tweak from there.
 */
export default function PresetPanel({ onApplyPreset, activePresetName }) {
  // Group presets by category, preserving order of first appearance
  const grouped = useMemo(() => {
    const map = new Map();
    for (const p of PRESETS) {
      const cat = p.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(p);
    }
    return [...map.entries()]; // [[category, presets[]], …]
  }, []);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <h3 className="text-white font-semibold mb-1">Presets</h3>
      <p className="text-white/40 text-xs mb-3">
        Start from a ready-made sound, then customize it
      </p>
      <div className="max-h-[420px] overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin">
        {grouped.map(([category, presets]) => (
          <div key={category}>
            <div className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1.5 px-1">
              {category}
            </div>
            <div className="flex flex-col gap-1.5">
              {presets.map((p) => {
                const isActive = activePresetName === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => onApplyPreset(p)}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition border cursor-pointer ${
                      isActive
                        ? "bg-cyan-500/15 border-cyan-500/30"
                        : "bg-black/20 hover:bg-black/30 border-white/8 hover:border-white/15"
                    }`}
                  >
                    <span className="text-lg mt-0.5 shrink-0">{p.icon}</span>
                    <div className="min-w-0">
                      <div className={`font-semibold text-sm ${isActive ? "text-cyan-300" : "text-white"}`}>
                        {p.name}
                      </div>
                      <div className="text-white/50 text-xs leading-snug">
                        {p.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
