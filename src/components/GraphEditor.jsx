import React, { useMemo, useRef, useState } from "react";
import { clamp } from "../utils/dsp";

/**
 * GraphEditor — Interactive SVG envelope editor.
 *
 * Lets users click to add control points and drag them to shape
 * a piecewise-linear curve (volume or pitch over time).
 *
 * Props:
 *  - title        : heading text
 *  - description  : helper text under the title
 *  - points       : [{x: 0..1, y: number}]
 *  - setPoints    : state setter
 *  - yMin / yMax  : range for the y axis
 *  - yFormat      : (number) => string for axis labels
 *  - curveColor   : stroke colour for the curve (default cyan)
 *  - height/width : SVG dimensions (scales responsively)
 */
export default function GraphEditor({
  title,
  description,
  points,
  setPoints,
  yMin,
  yMax,
  yFormat,
  curveColor = "#22d3ee",
  height = 180,
  width = 600,
}) {
  const svgRef = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null); // {x, y, value}

  const pad = 48; // left padding for labels
  const padR = 12;
  const padT = 12;
  const padB = 24; // bottom for time labels
  const innerW = width - pad - padR;
  const innerH = height - padT - padB;

  const gridX = 10;
  const gridY = 4;

  /** Convert data point → SVG coords */
  const toSvg = (p) => ({
    x: pad + p.x * innerW,
    y: padT + (1 - clamp((p.y - yMin) / (yMax - yMin), 0, 1)) * innerH,
  });

  /** Convert SVG coords → data point */
  const fromSvg = (sx, sy) => {
    const nx = clamp((sx - pad) / innerW, 0, 1);
    const ny = clamp(1 - (sy - padT) / innerH, 0, 1);
    return { x: nx, y: yMin + ny * (yMax - yMin) };
  };

  /** Build SVG path with filled area */
  const { pathD, areaD } = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const svgPts = sorted.map(toSvg);
    const line = svgPts
      .map((s, i) => `${i === 0 ? "M" : "L"} ${s.x.toFixed(1)} ${s.y.toFixed(1)}`)
      .join(" ");
    const area =
      line +
      ` L ${svgPts[svgPts.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)}` +
      ` L ${svgPts[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
    return { pathD: line, areaD: area };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, innerW, innerH, yMin, yMax]);

  const onPointerDown = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Check if clicking near an existing point
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const hitRadius = 14;
    for (let i = 0; i < sorted.length; i++) {
      const s = toSvg(sorted[i]);
      const dx = s.x - mx;
      const dy = s.y - my;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        const origIdx = points.indexOf(sorted[i]);
        setDragIdx(origIdx);
        return;
      }
    }

    // Add new point at click position
    const np = fromSvg(mx, my);
    setPoints((prev) => {
      const next = [...prev, np].sort((a, b) => a.x - b.x);
      next[0] = { ...next[0], x: 0 };
      next[next.length - 1] = { ...next[next.length - 1], x: 1 };
      return next;
    });
  };

  const onPointerMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Show hover info
    const dp = fromSvg(mx, my);
    if (mx >= pad && mx <= pad + innerW && my >= padT && my <= padT + innerH) {
      setHoverInfo({
        svgX: mx,
        svgY: my,
        time: `${Math.round(dp.x * 100)}%`,
        value: yFormat(dp.y),
      });
    } else {
      setHoverInfo(null);
    }

    if (dragIdx == null) return;

    setPoints((prev) => {
      const next = [...prev];
      const isFirst = dragIdx === 0;
      const isLast = dragIdx === prev.length - 1;
      const left = dragIdx > 0 ? next[dragIdx - 1].x : 0;
      const right = dragIdx < next.length - 1 ? next[dragIdx + 1].x : 1;
      const minX = isFirst ? 0 : isLast ? 1 : left + 0.005;
      const maxX = isFirst ? 0 : isLast ? 1 : right - 0.005;

      next[dragIdx] = {
        x: clamp(dp.x, minX, maxX),
        y: clamp(dp.y, yMin, yMax),
      };
      return next;
    });
  };

  const onPointerUp = () => setDragIdx(null);

  const removeLastMiddlePoint = () => {
    setPoints((prev) => {
      if (prev.length <= 2) return prev;
      const next = [...prev];
      // Remove the second-to-last point (last middle point)
      next.splice(next.length - 2, 1);
      return next;
    });
  };

  const resetToFlat = () => {
    const mid = (yMin + yMax) / 2;
    setPoints([
      { x: 0, y: mid },
      { x: 1, y: mid },
    ]);
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-white font-semibold text-base">{title}</h3>
          {description && (
            <p className="text-white/50 text-sm mt-0.5">{description}</p>
          )}
          <p className="text-white/40 text-xs mt-1">
            Click to add points · Drag to shape · First &amp; last points stay at edges
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={removeLastMiddlePoint}
            className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/70 hover:text-white text-xs transition"
            title="Remove the last middle point"
          >
            − Point
          </button>
          <button
            onClick={resetToFlat}
            className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/70 hover:text-white text-xs transition"
            title="Reset to flat line"
          >
            Reset
          </button>
        </div>
      </div>

      {/* SVG canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto rounded-xl bg-black/40 border border-white/10 select-none"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          onPointerUp();
          setHoverInfo(null);
        }}
      >
        {/* Grid lines */}
        {Array.from({ length: gridX + 1 }).map((_, i) => {
          const x = pad + (i / gridX) * innerW;
          return (
            <line
              key={`gx-${i}`}
              x1={x} y1={padT} x2={x} y2={padT + innerH}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1}
            />
          );
        })}
        {Array.from({ length: gridY + 1 }).map((_, i) => {
          const y = padT + (i / gridY) * innerH;
          return (
            <line
              key={`gy-${i}`}
              x1={pad} y1={y} x2={pad + innerW} y2={y}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1}
            />
          );
        })}

        {/* Y-axis labels */}
        {Array.from({ length: gridY + 1 }).map((_, i) => {
          const frac = 1 - i / gridY;
          const val = yMin + frac * (yMax - yMin);
          const y = padT + (i / gridY) * innerH;
          return (
            <text
              key={`yl-${i}`}
              x={pad - 4}
              y={y + 4}
              textAnchor="end"
              fill="rgba(255,255,255,0.35)"
              fontSize="9"
              fontFamily="monospace"
            >
              {yFormat(val)}
            </text>
          );
        })}

        {/* X-axis time labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <text
            key={`xl-${frac}`}
            x={pad + frac * innerW}
            y={height - 4}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize="9"
            fontFamily="monospace"
          >
            {Math.round(frac * 100)}%
          </text>
        ))}

        {/* Filled area under curve */}
        <path d={areaD} fill={curveColor} opacity={0.08} />

        {/* Curve line */}
        <path
          d={pathD}
          fill="none"
          stroke={curveColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Control points */}
        {[...points]
          .sort((a, b) => a.x - b.x)
          .map((p, i, arr) => {
            const s = toSvg(p);
            const isEndpoint = i === 0 || i === arr.length - 1;
            return (
              <g key={`pt-${i}`} style={{ cursor: "grab" }}>
                {/* Glow */}
                <circle cx={s.x} cy={s.y} r={isEndpoint ? 10 : 8} fill={curveColor} opacity={0.15} />
                {/* Dot */}
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={isEndpoint ? 5.5 : 4.5}
                  fill={isEndpoint ? "#fff" : curveColor}
                  stroke={isEndpoint ? curveColor : "#fff"}
                  strokeWidth={1.5}
                />
                {/* Invisible hit area */}
                <circle cx={s.x} cy={s.y} r={16} fill="transparent" />
              </g>
            );
          })}

        {/* Hover crosshair + value tooltip */}
        {hoverInfo && dragIdx == null && (
          <>
            <line
              x1={hoverInfo.svgX} y1={padT} x2={hoverInfo.svgX} y2={padT + innerH}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="3,3"
            />
            <line
              x1={pad} y1={hoverInfo.svgY} x2={pad + innerW} y2={hoverInfo.svgY}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="3,3"
            />
            <rect
              x={hoverInfo.svgX + 8}
              y={hoverInfo.svgY - 22}
              width={90}
              height={20}
              rx={4}
              fill="rgba(0,0,0,0.75)"
            />
            <text
              x={hoverInfo.svgX + 14}
              y={hoverInfo.svgY - 8}
              fill="rgba(255,255,255,0.8)"
              fontSize="10"
              fontFamily="monospace"
            >
              {hoverInfo.time} → {hoverInfo.value}
            </text>
          </>
        )}
      </svg>

      {/* Point count indicator */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-white/30 text-xs">
          {points.length} point{points.length !== 1 ? "s" : ""}
        </span>
        <span className="text-white/30 text-xs">
          ← Time →
        </span>
      </div>
    </div>
  );
}
