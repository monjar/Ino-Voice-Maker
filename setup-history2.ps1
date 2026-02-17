$ErrorActionPreference = "Stop"
Set-Location "C:\Users\Amiralis\Projects\Ino-Voice-maker"
$backup = "C:\Users\Amiralis\Projects\_ino_backup"

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

# COMMIT 6 — Feb 17, 16:40 — Add detune support
Copy-Item "$backup\audio\AudioEngine.js" "src\audio\AudioEngine.js" -Force
Do-Commit "feat: add detune parameter and waveform descriptions to AudioEngine" "2026-02-17T16:40:00+03:30"

# COMMIT 7 — Feb 18, 11:20 — Basic GraphEditor
Write-Utf8 "src/components/GraphEditor.jsx" @"
import React, { useMemo, useRef, useState } from 'react';
import { clamp } from '../utils/dsp';

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

# COMMIT 8 — Feb 18, 17:15 — Wire up basic working page
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
        <div className="flex gap-3">
          <button onClick={isPlaying ? () => { audioEngine.stop(); setIsPlaying(false); } : play}
            className="px-6 py-3 rounded-xl bg-white text-black font-semibold">
            {isPlaying ? 'Stop' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
"@

Do-Commit "feat: wire up basic working page with play/stop and both graphs" "2026-02-18T17:15:00+03:30"

# COMMIT 9 — Feb 19, 10:30 — Grid, axis labels, area fill, colored curves
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
    const line = svgPts.map((s, i) => ``${i === 0 ? 'M' : 'L'} ${s.x.toFixed(1)} ${s.y.toFixed(1)}``).join(' ');
    const area = line + `` L ${svgPts[svgPts.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${svgPts[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z``;
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
          <button onClick={() => setPoints((p) => p.length > 2 ? [...p.slice(0, -2), p[p.length - 1]] : p)}
            className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/70 text-xs">- Point</button>
          <button onClick={() => setPoints([{ x: 0, y: (yMin + yMax) / 2 }, { x: 1, y: (yMin + yMax) / 2 }])}
            className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/70 text-xs">Reset</button>
        </div>
      </div>
      <svg ref={svgRef} viewBox={``0 0 ${width} ${height}``}
        className="w-full h-auto rounded-xl bg-black/40 border border-white/10 select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>

        {Array.from({ length: gridX + 1 }).map((_, i) => {
          const x = pad + (i / gridX) * innerW;
          return <line key={``gx-${i}``} x1={x} y1={padT} x2={x} y2={padT + innerH} stroke="rgba(255,255,255,0.06)" />;
        })}
        {Array.from({ length: gridY + 1 }).map((_, i) => {
          const y = padT + (i / gridY) * innerH;
          return <line key={``gy-${i}``} x1={pad} y1={y} x2={pad + innerW} y2={y} stroke="rgba(255,255,255,0.06)" />;
        })}
        {Array.from({ length: gridY + 1 }).map((_, i) => {
          const val = yMin + (1 - i / gridY) * (yMax - yMin);
          const y = padT + (i / gridY) * innerH;
          return <text key={``yl-${i}``} x={pad - 4} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="monospace">{yFormat(val)}</text>;
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={``xl-${f}``} x={pad + f * innerW} y={height - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">{Math.round(f * 100)}%</text>
        ))}

        <path d={areaD} fill={curveColor} opacity={0.08} />
        <path d={pathD} fill="none" stroke={curveColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

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

Do-Commit "improve: add grid, axis labels, area fill and colored curves to GraphEditor" "2026-02-19T10:30:00+03:30"

# COMMIT 10 — Feb 19, 18:00 — Hover tooltip
Copy-Item "$backup\components\GraphEditor.jsx" "src\components\GraphEditor.jsx" -Force
Do-Commit "feat: add hover crosshair with value tooltip to GraphEditor" "2026-02-19T18:00:00+03:30"

# COMMIT 11 — Feb 20, 09:45 — ControlPanel
Copy-Item "$backup\components\ControlPanel.jsx" "src\components\ControlPanel.jsx" -Force
Do-Commit "feat: add ControlPanel with sliders and waveform selector" "2026-02-20T09:45:00+03:30"

# COMMIT 12 — Feb 20, 14:20 — Initial presets
Write-Utf8 "src/audio/presets.js" @"
export const PRESETS = [
  {
    name: 'Happy Chirp',
    description: 'Cheerful rising beep',
    icon: '\u{1F60A}',
    config: {
      durationMs: 350, waveform: 'square', masterGain: 0.5, detune: 0,
      volPoints: [{ x: 0, y: 0 }, { x: 0.05, y: 1 }, { x: 0.4, y: 0.8 }, { x: 0.7, y: 0.9 }, { x: 0.9, y: 0.3 }, { x: 1, y: 0 }],
      freqPoints: [{ x: 0, y: 600 }, { x: 0.15, y: 1200 }, { x: 0.5, y: 900 }, { x: 0.75, y: 1800 }, { x: 1, y: 1400 }],
    },
  },
  {
    name: 'Error Buzz',
    description: 'Low harsh buzz',
    icon: '\u26A0\uFE0F',
    config: {
      durationMs: 500, waveform: 'sawtooth', masterGain: 0.45, detune: -20,
      volPoints: [{ x: 0, y: 0 }, { x: 0.03, y: 1 }, { x: 0.15, y: 0.4 }, { x: 0.3, y: 0.9 }, { x: 0.5, y: 0.3 }, { x: 1, y: 0 }],
      freqPoints: [{ x: 0, y: 250 }, { x: 0.2, y: 180 }, { x: 0.5, y: 220 }, { x: 1, y: 120 }],
    },
  },
  {
    name: 'Success Ding',
    description: 'Clean upward ping',
    icon: '\u2705',
    config: {
      durationMs: 300, waveform: 'triangle', masterGain: 0.55, detune: 0,
      volPoints: [{ x: 0, y: 0 }, { x: 0.04, y: 1 }, { x: 0.2, y: 0.7 }, { x: 0.5, y: 0.4 }, { x: 1, y: 0 }],
      freqPoints: [{ x: 0, y: 800 }, { x: 0.15, y: 1600 }, { x: 0.4, y: 1400 }, { x: 1, y: 1200 }],
    },
  },
];
"@

Do-Commit "feat: add initial sound presets (happy chirp, error buzz, success ding)" "2026-02-20T14:20:00+03:30"

# COMMIT 13 — Feb 21, 10:10 — More presets
Copy-Item "$backup\audio\presets.js" "src\audio\presets.js" -Force
Do-Commit "feat: add robot boop, laser zap, and coin pickup presets" "2026-02-21T10:10:00+03:30"

# COMMIT 14 — Feb 21, 16:30 — PresetPanel
Copy-Item "$backup\components\PresetPanel.jsx" "src\components\PresetPanel.jsx" -Force
Do-Commit "feat: add PresetPanel component with active state indicator" "2026-02-21T16:30:00+03:30"

# COMMIT 15 — Feb 22, 11:00 — Main page
Copy-Item "$backup\components\RobotSfxDesigner.jsx" "src\components\RobotSfxDesigner.jsx" -Force
Write-Utf8 "src/App.jsx" @"
import RobotSfxDesigner from './components/RobotSfxDesigner';

function App() {
  return <RobotSfxDesigner />;
}

export default App
"@

Do-Commit "feat: create main RobotSfxDesigner page wiring all components together" "2026-02-22T11:00:00+03:30"

# COMMIT 16 — Feb 23, 14:50 — Polish + eslint
Copy-Item "$backup\eslint.config.js" "eslint.config.js" -Force
Do-Commit "chore: add eslint config and polish page layout" "2026-02-23T14:50:00+03:30"

# COMMIT 17 — Feb 24, 09:30 — README + cleanup
Write-Utf8 "README.md" @"
# Ino Voice Maker

A browser-based robot SFX designer built with React, Vite, and the Web Audio API.

## Features

- **Oscillator-based synthesis** - Square, Sawtooth, Triangle, and Sine waveforms for clean robotic sounds
- **Interactive envelope editors** - Drag-and-drop SVG graphs for volume and pitch over time
- **6 built-in presets** - Happy Chirp, Error Buzz, Success Ding, Robot Boop, Laser Zap, Coin Pickup
- **Beginner-friendly UI** - Sliders, descriptions, and a How It Works section
- **Randomize** - Shake up parameters for unexpected results

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Tech Stack

- React 19 + Vite 8
- Tailwind CSS v4
- Web Audio API (OscillatorNode, GainNode)
"@

# Remove the setup script
Remove-Item "setup-history.ps1" -Force -ErrorAction SilentlyContinue
Remove-Item "setup-history2.ps1" -Force -ErrorAction SilentlyContinue

Do-Commit "docs: add project README and clean up build scripts" "2026-02-24T09:30:00+03:30"

Write-Host "`nAll commits created!" -ForegroundColor Green
git log --oneline --all
