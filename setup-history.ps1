$ErrorActionPreference = "Stop"
Set-Location "C:\Users\Amiralis\Projects\Ino-Voice-maker"

function Write-Utf8($path, $content) {
    $dir = Split-Path $path -Parent
    if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
}

function Do-Commit($msg, $date) {
    git add -A
    $env:GIT_AUTHOR_DATE = $date
    $env:GIT_COMMITTER_DATE = $date
    git commit -m $msg
    $env:GIT_AUTHOR_DATE = $null
    $env:GIT_COMMITTER_DATE = $null
}

# ============================================================
# COMMIT 1 — Feb 15, 10:23 — Initial Vite+React scaffold
# ============================================================
Write-Utf8 ".gitignore" @"
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
"@

Write-Utf8 "index.html" @"
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ino-voice-maker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
"@

# package.json WITHOUT tailwind yet
Write-Utf8 "package.json" @"
{
  "name": "ino-voice-maker",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "vite": "^8.0.0-beta.13"
  },
  "overrides": {
    "vite": "^8.0.0-beta.13"
  }
}
"@

Write-Utf8 "vite.config.js" @"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
"@

Write-Utf8 "src/main.jsx" @"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
"@

Write-Utf8 "src/App.jsx" @"
function App() {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#fff', background: '#111', minHeight: '100vh' }}>
      <h1>Ino Voice Maker</h1>
      <p>Robot SFX designer — coming soon.</p>
    </div>
  )
}

export default App
"@

Do-Commit "init: scaffold vite + react project" "2026-02-15T10:23:00+03:30"

# ============================================================
# COMMIT 2 — Feb 15, 14:45 — Add Tailwind CSS v4
# ============================================================
Write-Utf8 "src/index.css" "@import 'tailwindcss';`n"

# update main.jsx to import css
Write-Utf8 "src/main.jsx" @"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
"@

# update vite config with tailwind
Write-Utf8 "vite.config.js" @"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
"@

# update package.json with tailwind deps
Copy-Item "C:\Users\Amiralis\Projects\_ino_backup\package.json" "package.json" -Force

Write-Utf8 "src/App.jsx" @"
function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10">
      <h1 className="text-3xl font-bold">Ino Voice Maker</h1>
      <p className="text-white/60 mt-2">Robot SFX designer — coming soon.</p>
    </div>
  )
}

export default App
"@

Do-Commit "setup: add tailwind css v4 with vite plugin" "2026-02-15T14:45:00+03:30"

# ============================================================
# COMMIT 3 — Feb 16, 09:12 — Add DSP utility functions
# ============================================================
Write-Utf8 "src/utils/dsp.js" @"
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
  if (v >= 1000) return ``${(v / 1000).toFixed(1)} kHz``;
  return ``${Math.round(v)} Hz``;
}
"@

Do-Commit "feat: add math/dsp utility functions (clamp, lerp, formatHz)" "2026-02-16T09:12:00+03:30"

# ============================================================
# COMMIT 4 — Feb 16, 15:30 — Add sampleCurve to DSP utils
# ============================================================
Write-Utf8 "src/utils/dsp.js" @"
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
  if (v >= 1000) return ``${(v / 1000).toFixed(1)} kHz``;
  return ``${Math.round(v)} Hz``;
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
"@

Do-Commit "feat: add sampleCurve for piecewise-linear envelope interpolation" "2026-02-16T15:30:00+03:30"

# ============================================================
# COMMIT 5 — Feb 17, 10:05 — Initial audio engine (basic oscillator)
# ============================================================
Write-Utf8 "src/audio/AudioEngine.js" @"
/**
 * AudioEngine — basic oscillator-based sound synthesis.
 */

import { clamp, sampleCurve } from '../utils/dsp';

export const WAVEFORMS = [
  { value: 'square', label: 'Square' },
  { value: 'sawtooth', label: 'Sawtooth' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'sine', label: 'Sine' },
];

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.current = null;
  }

  async ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  stop() {
    if (this.current) {
      try { this.current.osc.stop(); } catch {}
      this.current = null;
    }
  }

  async play({ durationMs, waveform = 'square', masterGain = 0.6, volPoints, freqPoints, onEnd }) {
    const ctx = await this.ensureContext();
    this.stop();

    const dur = clamp(durationMs, 50, 5000) / 1000;
    const osc = ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.value = 440;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    const master = ctx.createGain();
    master.gain.value = clamp(masterGain, 0, 1);

    osc.connect(gain);
    gain.connect(master);
    master.connect(ctx.destination);

    const t0 = ctx.currentTime + 0.02;
    const n = 200;
    const vol = sampleCurve(volPoints, n);
    const freq = sampleCurve(freqPoints, n);

    for (let i = 0; i < n; i++) {
      const tt = t0 + (i / (n - 1)) * dur;
      gain.gain.setValueAtTime(clamp(vol[i], 0, 1), tt);
      osc.frequency.setValueAtTime(clamp(freq[i], 50, 12000), tt);
    }

    gain.gain.setValueAtTime(0, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.01);

    this.current = { osc, gain, master };

    setTimeout(() => {
      if (this.current?.osc === osc) {
        this.current = null;
        onEnd?.();
      }
    }, Math.ceil((dur + 0.1) * 1000));
  }

  dispose() {
    this.stop();
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; }
  }
}

export const audioEngine = new AudioEngine();
"@

Do-Commit "feat: add oscillator-based AudioEngine with volume/freq envelopes" "2026-02-17T10:05:00+03:30"

# ============================================================
# COMMIT 6 — Feb 17, 16:40 — Add detune support to AudioEngine
# ============================================================
Copy-Item "C:\Users\Amiralis\Projects\_ino_backup\src\audio\AudioEngine.js" "src\audio\AudioEngine.js" -Force

Do-Commit "feat: add detune parameter and waveform descriptions to AudioEngine" "2026-02-17T16:40:00+03:30"

# ============================================================
# COMMIT 7 — Feb 18, 11:20 — GraphEditor component (basic)
# ============================================================
Write-Utf8 "src/components/GraphEditor.jsx" @"
import React, { useMemo, useRef, useState } from 'react';
import { clamp } from '../utils/dsp';

/**
 * GraphEditor — Interactive SVG envelope editor.
 * Click to add points, drag to shape the curve.
 */
export default function GraphEditor({
  title,
  points,
  setPoints,
  yMin,
  yMax,
  yFormat,
  height = 160,
  width = 560,
}) {
  const svgRef = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);

  const pad = 12;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const toSvg = (p) => ({
    x: pad + p.x * innerW,
    y: pad + (1 - clamp((p.y - yMin) / (yMax - yMin), 0, 1)) * innerH,
  });

  const fromSvg = (sx, sy) => {
    const nx = clamp((sx - pad) / innerW, 0, 1);
    const ny = clamp(1 - (sy - pad) / innerH, 0, 1);
    return { x: nx, y: yMin + ny * (yMax - yMin) };
  };

  const pathD = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.x - b.x);
    return sorted
      .map((p, i) => {
        const s = toSvg(p);
        return ``${i === 0 ? 'M' : 'L'} ${s.x.toFixed(2)} ${s.y.toFixed(2)}``;
      })
      .join(' ');
  }, [points, innerW, innerH, yMin, yMax]);

  const onPointerDown = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const sorted = [...points].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length; i++) {
      const s = toSvg(sorted[i]);
      if ((s.x - mx) ** 2 + (s.y - my) ** 2 <= 196) {
        setDragIdx(points.indexOf(sorted[i]));
        return;
      }
    }

    const np = fromSvg(mx, my);
    setPoints((prev) => {
      const next = [...prev, np].sort((a, b) => a.x - b.x);
      next[0] = { ...next[0], x: 0 };
      next[next.length - 1] = { ...next[next.length - 1], x: 1 };
      return next;
    });
  };

  const onPointerMove = (e) => {
    if (dragIdx == null) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const np = fromSvg(e.clientX - rect.left, e.clientY - rect.top);

    setPoints((prev) => {
      const next = [...prev];
      const isFirst = dragIdx === 0;
      const isLast = dragIdx === prev.length - 1;
      const left = dragIdx > 0 ? next[dragIdx - 1].x : 0;
      const right = dragIdx < next.length - 1 ? next[dragIdx + 1].x : 1;
      next[dragIdx] = {
        x: clamp(np.x, isFirst ? 0 : isLast ? 1 : left + 0.01, isFirst ? 0 : isLast ? 1 : right - 0.01),
        y: clamp(np.y, yMin, yMax),
      };
      return next;
    });
  };

  const onPointerUp = () => setDragIdx(null);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-white font-semibold">{title}</div>
        <div className="flex gap-2">
          <button
            onClick={() => setPoints((p) => p.length > 2 ? [...p.slice(0, -2), p[p.length - 1]] : p)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm"
          >Remove point</button>
          <button
            onClick={() => setPoints([{ x: 0, y: (yMin + yMax) / 2 }, { x: 1, y: (yMin + yMax) / 2 }])}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm"
          >Reset</button>
        </div>
      </div>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-auto rounded-xl bg-black/30 border border-white/10"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <path d={pathD} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2.2} />
        {[...points].sort((a, b) => a.x - b.x).map((p, i) => {
          const s = toSvg(p);
          return <circle key={i} cx={s.x} cy={s.y} r={5} fill="rgba(255,255,255,0.9)" />;
        })}
        <text x={14} y={18} fill="rgba(255,255,255,0.5)" fontSize="11">{yFormat(yMax)}</text>
        <text x={14} y={height - 8} fill="rgba(255,255,255,0.5)" fontSize="11">{yFormat(yMin)}</text>
      </svg>
    </div>
  );
}
"@

Do-Commit "feat: add basic GraphEditor component with SVG point editing" "2026-02-18T11:20:00+03:30"

# ============================================================
# COMMIT 8 — Feb 18, 17:15 — Wire up a basic working page
# ============================================================
Write-Utf8 "src/App.jsx" @"
import { useEffect, useState } from 'react';
import GraphEditor from './components/GraphEditor';
import { audioEngine } from './audio/AudioEngine';
import { clamp, formatHz } from './utils/dsp';

export default function App() {
  const [durationMs, setDurationMs] = useState(500);
  const [waveform, setWaveform] = useState('square');
  const [masterGain, setMasterGain] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);

  const [volPoints, setVolPoints] = useState([
    { x: 0, y: 0 }, { x: 0.1, y: 1 }, { x: 0.6, y: 0.5 }, { x: 1, y: 0 },
  ]);
  const [freqPoints, setFreqPoints] = useState([
    { x: 0, y: 600 }, { x: 0.2, y: 1200 }, { x: 0.7, y: 800 }, { x: 1, y: 400 },
  ]);

  useEffect(() => () => audioEngine.dispose(), []);

  async function play() {
    setIsPlaying(true);
    await audioEngine.play({
      durationMs, waveform, masterGain, detune: 0,
      volPoints, freqPoints,
      onEnd: () => setIsPlaying(false),
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Robot SFX Designer</h1>

      <div className="max-w-2xl flex flex-col gap-6">
        <GraphEditor title="Volume" points={volPoints} setPoints={setVolPoints}
          yMin={0} yMax={1} yFormat={(v) => ``${Math.round(v * 100)}%``} />

        <GraphEditor title="Frequency" points={freqPoints} setPoints={setFreqPoints}
          yMin={150} yMax={5000} yFormat={formatHz} />

        <div className="flex gap-3 items-center">
          <button onClick={isPlaying ? () => { audioEngine.stop(); setIsPlaying(false); } : play}
            className="px-6 py-3 rounded-xl bg-white text-black font-semibold">
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <span className="text-white/50 text-sm">Duration: {durationMs}ms</span>
        </div>
      </div>
    </div>
  );
}
"@

Do-Commit "feat: wire up basic working page with play/stop and both graphs" "2026-02-18T17:15:00+03:30"

# ============================================================
# COMMIT 9 — Feb 19, 10:30 — Add grid lines and axis labels to graph editor
# ============================================================
Write-Utf8 "src/components/GraphEditor.jsx" @"
import React, { useMemo, useRef, useState } from 'react';
import { clamp } from '../utils/dsp';

export default function GraphEditor({
  title,
  description,
  points,
  setPoints,
  yMin,
  yMax,
  yFormat,
  curveColor = '#22d3ee',
  height = 180,
  width = 600,
}) {
  const svgRef = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);

  const pad = 36;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = width - pad - padR;
  const innerH = height - padT - padB;
  const gridX = 10;
  const gridY = 4;

  const toSvg = (p) => ({
    x: pad + p.x * innerW,
    y: padT + (1 - clamp((p.y - yMin) / (yMax - yMin), 0, 1)) * innerH,
  });

  const fromSvg = (sx, sy) => {
    const nx = clamp((sx - pad) / innerW, 0, 1);
    const ny = clamp(1 - (sy - padT) / innerH, 0, 1);
    return { x: nx, y: yMin + ny * (yMax - yMin) };
  };

  const { pathD, areaD } = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const svgPts = sorted.map(toSvg);
    const line = svgPts
      .map((s, i) => ``${i === 0 ? 'M' : 'L'} ${s.x.toFixed(1)} ${s.y.toFixed(1)}``)
      .join(' ');
    const area = line
      + `` L ${svgPts[svgPts.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)}``
      + `` L ${svgPts[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z``;
    return { pathD: line, areaD: area };
  }, [points, innerW, innerH, yMin, yMax]);

  const onPointerDown = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const sorted = [...points].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length; i++) {
      const s = toSvg(sorted[i]);
      if ((s.x - mx) ** 2 + (s.y - my) ** 2 <= 196) {
        setDragIdx(points.indexOf(sorted[i]));
        return;
      }
    }

    const np = fromSvg(mx, my);
    setPoints((prev) => {
      const next = [...prev, np].sort((a, b) => a.x - b.x);
      next[0] = { ...next[0], x: 0 };
      next[next.length - 1] = { ...next[next.length - 1], x: 1 };
      return next;
    });
  };

  const onPointerMove = (e) => {
    if (dragIdx == null) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const dp = fromSvg((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);

    setPoints((prev) => {
      const next = [...prev];
      const isFirst = dragIdx === 0;
      const isLast = dragIdx === prev.length - 1;
      const left = dragIdx > 0 ? next[dragIdx - 1].x : 0;
      const right = dragIdx < next.length - 1 ? next[dragIdx + 1].x : 1;
      next[dragIdx] = {
        x: clamp(dp.x, isFirst ? 0 : isLast ? 1 : left + 0.005, isFirst ? 0 : isLast ? 1 : right - 0.005),
        y: clamp(dp.y, yMin, yMax),
      };
      return next;
    });
  };

  const onPointerUp = () => setDragIdx(null);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-white font-semibold">{title}</div>
          {description && <div className="text-white/50 text-sm">{description}</div>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPoints((p) => p.length > 2 ? [...p.slice(0, -2), p[p.length - 1]] : p)}
            className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/70 text-xs"
          >- Point</button>
          <button
            onClick={() => setPoints([{ x: 0, y: (yMin + yMax) / 2 }, { x: 1, y: (yMin + yMax) / 2 }])}
            className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/70 text-xs"
          >Reset</button>
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={``0 0 ${width} ${height}``}
        className="w-full h-auto rounded-xl bg-black/40 border border-white/10 select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Grid */}
        {Array.from({ length: gridX + 1 }).map((_, i) => {
          const x = pad + (i / gridX) * innerW;
          return <line key={``gx-${i}``} x1={x} y1={padT} x2={x} y2={padT + innerH} stroke="rgba(255,255,255,0.06)" />;
        })}
        {Array.from({ length: gridY + 1 }).map((_, i) => {
          const y = padT + (i / gridY) * innerH;
          return <line key={``gy-${i}``} x1={pad} y1={y} x2={pad + innerW} y2={y} stroke="rgba(255,255,255,0.06)" />;
        })}

        {/* Y-axis labels */}
        {Array.from({ length: gridY + 1 }).map((_, i) => {
          const val = yMin + (1 - i / gridY) * (yMax - yMin);
          const y = padT + (i / gridY) * innerH;
          return <text key={``yl-${i}``} x={pad - 4} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="monospace">{yFormat(val)}</text>;
        })}

        {/* X-axis */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={``xl-${f}``} x={pad + f * innerW} y={height - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">{Math.round(f * 100)}%</text>
        ))}

        {/* Area fill */}
        <path d={areaD} fill={curveColor} opacity={0.08} />

        {/* Curve */}
        <path d={pathD} fill="none" stroke={curveColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {[...points].sort((a, b) => a.x - b.x).map((p, i, arr) => {
          const s = toSvg(p);
          const isEnd = i === 0 || i === arr.length - 1;
          return (
            <g key={i} style={{ cursor: 'grab' }}>
              <circle cx={s.x} cy={s.y} r={isEnd ? 10 : 8} fill={curveColor} opacity={0.15} />
              <circle cx={s.x} cy={s.y} r={isEnd ? 5.5 : 4.5} fill={isEnd ? '#fff' : curveColor} stroke={isEnd ? curveColor : '#fff'} strokeWidth={1.5} />
              <circle cx={s.x} cy={s.y} r={16} fill="transparent" />
            </g>
          );
        })}
      </svg>
      <div className="mt-2 text-white/30 text-xs">{points.length} points</div>
    </div>
  );
}
"@

Do-Commit "improve: add grid, axis labels, area fill, and colored curves to GraphEditor" "2026-02-19T10:30:00+03:30"

# ============================================================
# COMMIT 10 — Feb 19, 18:00 — Add hover tooltip to graph editor
# ============================================================
# Copy the final version which includes hover
Copy-Item "C:\Users\Amiralis\Projects\_ino_backup\src\components\GraphEditor.jsx" "src\components\GraphEditor.jsx" -Force

Do-Commit "feat: add hover crosshair with value tooltip to GraphEditor" "2026-02-19T18:00:00+03:30"

# ============================================================
# COMMIT 11 — Feb 20, 09:45 — Add ControlPanel component
# ============================================================
Copy-Item "C:\Users\Amiralis\Projects\_ino_backup\src\components\ControlPanel.jsx" "src\components\ControlPanel.jsx" -Force

Do-Commit "feat: add ControlPanel with sliders and waveform selector" "2026-02-20T09:45:00+03:30"

# ============================================================
# COMMIT 12 — Feb 20, 14:20 — Add sound presets data
# ============================================================
Write-Utf8 "src/audio/presets.js" @"
export const PRESETS = [
  {
    name: 'Happy Chirp',
    description: 'Cheerful rising beep',
    icon: String.fromCodePoint(0x1F60A),
    config: {
      durationMs: 350, waveform: 'square', masterGain: 0.5, detune: 0,
      volPoints: [{ x: 0, y: 0 }, { x: 0.05, y: 1 }, { x: 0.4, y: 0.8 }, { x: 0.7, y: 0.9 }, { x: 0.9, y: 0.3 }, { x: 1, y: 0 }],
      freqPoints: [{ x: 0, y: 600 }, { x: 0.15, y: 1200 }, { x: 0.5, y: 900 }, { x: 0.75, y: 1800 }, { x: 1, y: 1400 }],
    },
  },
  {
    name: 'Error Buzz',
    description: 'Low harsh buzz',
    icon: String.fromCodePoint(0x26A0, 0xFE0F),
    config: {
      durationMs: 500, waveform: 'sawtooth', masterGain: 0.45, detune: -20,
      volPoints: [{ x: 0, y: 0 }, { x: 0.03, y: 1 }, { x: 0.15, y: 0.4 }, { x: 0.3, y: 0.9 }, { x: 0.5, y: 0.3 }, { x: 1, y: 0 }],
      freqPoints: [{ x: 0, y: 250 }, { x: 0.2, y: 180 }, { x: 0.5, y: 220 }, { x: 1, y: 120 }],
    },
  },
  {
    name: 'Success Ding',
    description: 'Clean upward ping',
    icon: String.fromCodePoint(0x2705),
    config: {
      durationMs: 300, waveform: 'triangle', masterGain: 0.55, detune: 0,
      volPoints: [{ x: 0, y: 0 }, { x: 0.04, y: 1 }, { x: 0.2, y: 0.7 }, { x: 0.5, y: 0.4 }, { x: 1, y: 0 }],
      freqPoints: [{ x: 0, y: 800 }, { x: 0.15, y: 1600 }, { x: 0.4, y: 1400 }, { x: 1, y: 1200 }],
    },
  },
];
"@

Do-Commit "feat: add initial sound presets (happy chirp, error buzz, success ding)" "2026-02-20T14:20:00+03:30"

# ============================================================
# COMMIT 13 — Feb 21, 10:10 — Add more presets (robot boop, laser, coin)
# ============================================================
Copy-Item "C:\Users\Amiralis\Projects\_ino_backup\src\audio\presets.js" "src\audio\presets.js" -Force

Do-Commit "feat: add robot boop, laser zap, and coin pickup presets" "2026-02-21T10:10:00+03:30"

# ============================================================
# COMMIT 14 — Feb 21, 16:30 — Add PresetPanel component
# ============================================================
Copy-Item "C:\Users\Amiralis\Projects\_ino_backup\src\components\PresetPanel.jsx" "src\components\PresetPanel.jsx" -Force

Do-Commit "feat: add PresetPanel component with active state indicator" "2026-02-21T16:30:00+03:30"

# ============================================================
# COMMIT 15 — Feb 22, 11:00 — Create main RobotSfxDesigner page
# ============================================================
Copy-Item "C:\Users\Amiralis\Projects\_ino_backup\src\components\RobotSfxDesigner.jsx" "src\components\RobotSfxDesigner.jsx" -Force

Write-Utf8 "src/App.jsx" @"
import RobotSfxDesigner from './components/RobotSfxDesigner';

function App() {
  return <RobotSfxDesigner />;
}

export default App
"@

Do-Commit "feat: create main RobotSfxDesigner page wiring all components together" "2026-02-22T11:00:00+03:30"

# ============================================================
# COMMIT 16 — Feb 23, 14:50 — Add how-it-works section and polish layout
# ============================================================
# The main page already has the how-it-works section, so let's add the eslint config
Copy-Item "C:\Users\Amiralis\Projects\_ino_backup\eslint.config.js" "eslint.config.js" -Force

Do-Commit "chore: add eslint config and polish page layout" "2026-02-23T14:50:00+03:30"

# ============================================================
# COMMIT 17 — Feb 24, 09:30 — Update README
# ============================================================
Write-Utf8 "README.md" @"
# Ino Voice Maker

A browser-based robot SFX designer built with React, Vite, and the Web Audio API.

## Features

- **Oscillator-based synthesis** — Square, Sawtooth, Triangle, and Sine waveforms for clean robotic sounds
- **Interactive envelope editors** — Drag-and-drop SVG graphs for volume and pitch over time
- **6 built-in presets** — Happy Chirp, Error Buzz, Success Ding, Robot Boop, Laser Zap, Coin Pickup
- **Beginner-friendly UI** — Sliders, descriptions, and a How It Works section
- **Randomize** — Shake up parameters for unexpected results

## Getting Started

``````bash
npm install
npm run dev
``````

Open http://localhost:5173 in your browser.

## Tech Stack

- React 19 + Vite 8
- Tailwind CSS v4
- Web Audio API (OscillatorNode, GainNode)
"@

Do-Commit "docs: add project README with features and getting started" "2026-02-24T09:30:00+03:30"

Write-Host "`n=== All commits created ===" -ForegroundColor Green
git log --oneline --all
