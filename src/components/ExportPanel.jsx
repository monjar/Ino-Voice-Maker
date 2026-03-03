import React, { useRef, useState } from "react";

/**
 * ExportPanel — Buttons for exporting as WAV/MP4/JSON and importing from JSON.
 */
export default function ExportPanel({ onExportWav, onExportMp4, onExportJson, onImportJson }) {
  const [exporting, setExporting] = useState(null); // 'wav' | 'mp4' | 'json' | null
  const fileInputRef = useRef(null);

  async function handleExport(type, fn) {
    setExporting(type);
    try {
      await fn();
    } catch (err) {
      console.error(`Export ${type} failed:`, err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(null);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        onImportJson(data);
      } catch (err) {
        alert(`Invalid JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);

    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  const btnClass = (type) =>
    `flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition border cursor-pointer ${
      exporting === type
        ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-300 opacity-70"
        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <h3 className="text-white font-semibold mb-1">Export & Import</h3>
      <p className="text-white/40 text-xs mb-3">
        Download your creation or load a saved project
      </p>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleExport("wav", onExportWav)}
          disabled={!!exporting}
          className={btnClass("wav")}
        >
          {exporting === "wav" ? "Rendering…" : "📁 Export WAV"}
        </button>

        <button
          onClick={() => handleExport("mp4", onExportMp4)}
          disabled={!!exporting}
          className={btnClass("mp4")}
        >
          {exporting === "mp4" ? "Recording…" : "🎬 Export MP4 / WebM"}
        </button>

        <button
          onClick={() => handleExport("json", onExportJson)}
          disabled={!!exporting}
          className={btnClass("json")}
        >
          {exporting === "json" ? "Saving…" : "💾 Save Project (JSON)"}
        </button>

        <div className="border-t border-white/8 my-1" />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!!exporting}
          className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition border cursor-pointer bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
        >
          📂 Load Project (JSON)
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <p className="text-white/30 text-xs mt-2">
        WAV = lossless audio · MP4/WebM = compressed · JSON = reloadable project file
      </p>
    </div>
  );
}
