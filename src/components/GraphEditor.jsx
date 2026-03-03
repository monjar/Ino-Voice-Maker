import React, { useCallback, useMemo, useRef, useState } from "react";
import { clamp } from "../utils/dsp";
import { snapToNote, getNoteNameForFreq, ALL_NOTES } from "../utils/noteFrequencies";
import {
  getCurvePreset,
  CURVE_PRESET_NAMES,
  smoothCurve,
  subdivideCurve,
  snapToGrid,
  snapXToGrid,
} from "../utils/curveTools";

/** Small toolbar button used in both graph editors */
function ToolBtn({ children, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all border ${
        active
          ? "bg-white/15 border-white/25 text-white"
          : "bg-white/5 border-white/8 text-white/50 hover:bg-white/10 hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * GraphEditor — Interactive SVG envelope editor with snap, smooth & preset tools.
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
 *  - isPitch      : if true, enables note-snap mode
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
  isPitch = false,
}) {
  const svgRef = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [showPresets, setShowPresets] = useState(false);

  // Snap modes
  const [snapY, setSnapY] = useState("off"); // "off" | "grid" | "notes"
  const [snapX, setSnapX] = useState(false); // snap x to 5% steps

  const pad = 48;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = width - pad - padR;
  const innerH = height - padT - padB;

  const gridX = 10;
  const gridY = 4;

  /** Convert data point → SVG coords */
  const toSvg = useCallback(
    (p) => ({
      x: pad + p.x * innerW,
      y: padT + (1 - clamp((p.y - yMin) / (yMax - yMin), 0, 1)) * innerH,
    }),
    [innerW, innerH, yMin, yMax]
  );

  /** Convert SVG coords → data point */
  const fromSvg = useCallback(
    (sx, sy) => {
      const nx = clamp((sx - pad) / innerW, 0, 1);
      const ny = clamp(1 - (sy - padT) / innerH, 0, 1);
      return { x: nx, y: yMin + ny * (yMax - yMin) };
    },
    [innerW, innerH, yMin, yMax]
  );

  /** Apply active snap modes to a data point */
  const applySnap = useCallback(
    (dp, isFirstOrLast = false) => {
      let { x, y } = dp;
      // Snap X
      if (snapX && !isFirstOrLast) {
        x = snapXToGrid(x, 0.05);
      }
      // Snap Y
      if (snapY === "grid") {
        y = snapToGrid(y, yMin, yMax, 8);
      } else if (snapY === "notes" && isPitch) {
        y = snapToNote(y);
        y = clamp(y, yMin, yMax);
      }
      return { x, y };
    },
    [snapX, snapY, yMin, yMax, isPitch]
  );

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
  }, [points, toSvg, innerH]);

  /* ---- Pointer handlers ---- */
  const onPointerDown = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

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

    let np = fromSvg(mx, my);
    np = applySnap(np);
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

    const dp = fromSvg(mx, my);
    if (mx >= pad && mx <= pad + innerW && my >= padT && my <= padT + innerH) {
      const displayY = snapY === "notes" && isPitch
        ? `${getNoteNameForFreq(dp.y)} (${yFormat(dp.y)})`
        : yFormat(dp.y);
      setHoverInfo({
        svgX: mx,
        svgY: my,
        time: `${Math.round(dp.x * 100)}%`,
        value: displayY,
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

      let snapped = applySnap(dp, isFirst || isLast);
      next[dragIdx] = {
        x: isFirst ? 0 : isLast ? 1 : clamp(snapped.x, minX, maxX),
        y: clamp(snapped.y, yMin, yMax),
      };
      return next;
    });
  };

  const onPointerUp = () => setDragIdx(null);

  /* ---- Tool actions ---- */
  const removeLastMiddlePoint = () => {
    setPoints((prev) => {
      if (prev.length <= 2) return prev;
      const next = [...prev];
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

  const handleSmooth = () => {
    setPoints((prev) => smoothCurve(prev, yMin, yMax, 0.6));
  };

  const handleSubdivide = () => {
    setPoints((prev) => {
      if (prev.length >= 20) return prev; // cap at 20 points
      return subdivideCurve(prev, yMin, yMax);
    });
  };

  const handlePresetCurve = (name) => {
    const pts = getCurvePreset(name, yMin, yMax);
    if (pts) setPoints(pts);
    setShowPresets(false);
  };

  /* ---- Note grid lines for pitch snap ---- */
  const noteGridLines = useMemo(() => {
    if (snapY !== "notes" || !isPitch) return [];
    // Show note lines within visible range (one per octave C + E + G for readability)
    const lines = [];
    const importantNotes = [
      "C2","E2","G2","C3","E3","G3","C4","E4","G4",
      "C5","E5","G5","C6","E6","G6","C7","C8",
    ];
    for (const note of ALL_NOTES) {
      if (!importantNotes.includes(note.name)) continue;
      if (note.freq < yMin || note.freq > yMax) continue;
      const frac = (note.freq - yMin) / (yMax - yMin);
      const svgY = padT + (1 - frac) * innerH;
      lines.push({ y: svgY, label: note.name, freq: note.freq });
    }
    return lines;
  }, [snapY, isPitch, yMin, yMax, innerH]);

  /* ---- Tooltip width calculation ---- */
  const tooltipWidth = hoverInfo ? Math.max(95, (hoverInfo.value?.length || 10) * 6.5 + 20) : 95;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-white font-semibold text-base">{title}</h3>
          {description && (
            <p className="text-white/50 text-sm mt-0.5">{description}</p>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {/* Snap section */}
        <span className="text-white/30 text-[10px] font-semibold uppercase tracking-wider mr-0.5">
          Snap:
        </span>
        <ToolBtn
          active={snapY === "off" && !snapX}
          onClick={() => { setSnapY("off"); setSnapX(false); }}
          title="No snapping"
        >
          Off
        </ToolBtn>
        <ToolBtn
          active={snapY === "grid"}
          onClick={() => setSnapY(snapY === "grid" ? "off" : "grid")}
          title="Snap Y to grid levels"
        >
          📊 Grid
        </ToolBtn>
        {isPitch && (
          <ToolBtn
            active={snapY === "notes"}
            onClick={() => setSnapY(snapY === "notes" ? "off" : "notes")}
            title="Snap to musical notes"
          >
            🎵 Notes
          </ToolBtn>
        )}
        <ToolBtn
          active={snapX}
          onClick={() => setSnapX(!snapX)}
          title="Snap time to 5% steps"
        >
          ⏱ Time
        </ToolBtn>

        <span className="w-px h-4 bg-white/10 mx-1" />

        {/* Tools section */}
        <span className="text-white/30 text-[10px] font-semibold uppercase tracking-wider mr-0.5">
          Tools:
        </span>
        <ToolBtn onClick={handleSmooth} title="Smooth the curve (average neighbors)">
          ✨ Smooth
        </ToolBtn>
        <ToolBtn onClick={handleSubdivide} title="Add midpoints between existing points">
          ➕ Subdivide
        </ToolBtn>
        <ToolBtn onClick={removeLastMiddlePoint} title="Remove last middle point">
          ➖ Point
        </ToolBtn>
        <ToolBtn onClick={resetToFlat} title="Reset to flat line">
          ↩ Reset
        </ToolBtn>

        <span className="w-px h-4 bg-white/10 mx-1" />

        {/* Preset curves */}
        <div className="relative">
          <ToolBtn
            onClick={() => setShowPresets(!showPresets)}
            active={showPresets}
            title="Apply a preset curve shape"
          >
            📈 Shapes ▾
          </ToolBtn>
          {showPresets && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-[#1a1a2e] border border-white/15 rounded-lg shadow-2xl p-1 min-w-[150px] max-h-[240px] overflow-y-auto scrollbar-thin">
              {CURVE_PRESET_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => handlePresetCurve(name)}
                  className="block w-full text-left px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white rounded transition"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-white/30 text-[10px] mb-1.5">
        Click to add points · Drag to shape · First & last points stay at edges
      </p>

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

        {/* Note grid lines (only when note snap is active) */}
        {noteGridLines.map((nl, i) => (
          <g key={`note-${i}`}>
            <line
              x1={pad} y1={nl.y} x2={pad + innerW} y2={nl.y}
              stroke="rgba(167,139,250,0.15)" strokeWidth={1}
              strokeDasharray="4,4"
            />
            <text
              x={pad + innerW + 2}
              y={nl.y + 3}
              fill="rgba(167,139,250,0.45)"
              fontSize="7"
              fontFamily="monospace"
            >
              {nl.label}
            </text>
          </g>
        ))}

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
                <circle cx={s.x} cy={s.y} r={isEndpoint ? 10 : 8} fill={curveColor} opacity={0.15} />
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={isEndpoint ? 5.5 : 4.5}
                  fill={isEndpoint ? "#fff" : curveColor}
                  stroke={isEndpoint ? curveColor : "#fff"}
                  strokeWidth={1.5}
                />
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
              width={tooltipWidth}
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

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-white/30 text-xs">
          {points.length} point{points.length !== 1 ? "s" : ""}
          {snapY !== "off" && (
            <span className="ml-2 text-white/20">
              📍 Snap: {snapY === "grid" ? "Grid" : "Notes"}
            </span>
          )}
        </span>
        <span className="text-white/30 text-xs">
          ← Time →
        </span>
      </div>
    </div>
  );
}
