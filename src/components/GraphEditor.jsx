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
    const line = svgPts.map((s, i) => `  `).join(' ');
    const area = line + ` L   L   Z`;
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
      <svg ref={svgRef} viewBox={`0 0  `}
        className="w-full h-auto rounded-xl bg-black/40 border border-white/10 select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>

        {Array.from({ length: gridX + 1 }).map((_, i) => {
          const x = pad + (i / gridX) * innerW;
          return <line key={`gx-`} x1={x} y1={padT} x2={x} y2={padT + innerH} stroke="rgba(255,255,255,0.06)" />;
        })}
        {Array.from({ length: gridY + 1 }).map((_, i) => {
          const y = padT + (i / gridY) * innerH;
          return <line key={`gy-`} x1={pad} y1={y} x2={pad + innerW} y2={y} stroke="rgba(255,255,255,0.06)" />;
        })}
        {Array.from({ length: gridY + 1 }).map((_, i) => {
          const val = yMin + (1 - i / gridY) * (yMax - yMin);
          const y = padT + (i / gridY) * innerH;
          return <text key={`yl-`} x={pad - 4} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="monospace">{yFormat(val)}</text>;
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={`xl-`} x={pad + f * innerW} y={height - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">{Math.round(f * 100)}%</text>
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