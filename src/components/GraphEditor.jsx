import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  yMin: dataYMin,
  yMax: dataYMax,
  yFormat,
  curveColor = "#22d3ee",
  height = 180,
  width = 600,
  isPitch = false,
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Drag state
  const [dragIdx, setDragIdx] = useState(null);
  const dragStartRef = useRef(null); // stores origPoints & start data coords for multi-drag

  // Hover & presets
  const [hoverInfo, setHoverInfo] = useState(null);
  const [showPresets, setShowPresets] = useState(false);

  // Multi-select: Set of sorted-indices
  const [selected, setSelected] = useState(new Set());

  // Snap modes
  const [snapY, setSnapY] = useState("off");
  const [snapX, setSnapX] = useState(false);

  // Vertical zoom: viewable Y range (defaults to full data range)
  const [viewYMin, setViewYMin] = useState(dataYMin);
  const [viewYMax, setViewYMax] = useState(dataYMax);

  // Use view range for rendering; data range for clamping actual point values
  const yMin = viewYMin;
  const yMax = viewYMax;

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
      if (snapX && !isFirstOrLast) {
        x = snapXToGrid(x, 0.05);
      }
      if (snapY === "grid") {
        y = snapToGrid(y, dataYMin, dataYMax, 8);
      } else if (snapY === "notes" && isPitch) {
        y = snapToNote(y);
        y = clamp(y, dataYMin, dataYMax);
      }
      return { x, y };
    },
    [snapX, snapY, dataYMin, dataYMax, isPitch]
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

  /** Sorted points — used for rendering & index mapping */
  const sortedPoints = useMemo(
    () => [...points].sort((a, b) => a.x - b.x),
    [points]
  );

  /* ================================================================ */
  /*  Keyboard shortcuts                                               */
  /* ================================================================ */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKeyDown = (e) => {
      // Ctrl+A — select all
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setSelected(new Set(sortedPoints.map((_, i) => i)));
      }
      // Escape — deselect
      if (e.key === "Escape") {
        setSelected(new Set());
      }
      // Delete / Backspace — remove selected middle points
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selected.size === 0) return;
        e.preventDefault();
        setPoints((prev) => {
          const sorted = [...prev].sort((a, b) => a.x - b.x);
          const keep = sorted.filter((_, i) => {
            if (i === 0 || i === sorted.length - 1) return true;
            return !selected.has(i);
          });
          return keep.length >= 2 ? keep : prev;
        });
        setSelected(new Set());
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [sortedPoints, selected, setPoints]);

  /* ================================================================ */
  /*  Vertical zoom                                                    */
  /* ================================================================ */
  const zoomY = useCallback(
    (factor, center) => {
      const range = viewYMax - viewYMin;
      const newRange = range / factor;
      const minRange = (dataYMax - dataYMin) * 0.02;
      const maxRange = dataYMax - dataYMin;
      const clampedRange = clamp(newRange, minRange, maxRange);
      const centerFrac = (center - viewYMin) / range;
      let newMin = center - centerFrac * clampedRange;
      let newMax = center + (1 - centerFrac) * clampedRange;
      if (newMin < dataYMin) { newMax += dataYMin - newMin; newMin = dataYMin; }
      if (newMax > dataYMax) { newMin -= newMax - dataYMax; newMax = dataYMax; }
      newMin = Math.max(dataYMin, newMin);
      newMax = Math.min(dataYMax, newMax);
      setViewYMin(Math.round(newMin * 1000) / 1000);
      setViewYMax(Math.round(newMax * 1000) / 1000);
    },
    [viewYMin, viewYMax, dataYMin, dataYMax]
  );

  const resetZoom = useCallback(() => {
    setViewYMin(dataYMin);
    setViewYMax(dataYMax);
  }, [dataYMin, dataYMax]);

  const isZoomed = viewYMin !== dataYMin || viewYMax !== dataYMax;

  // Scroll wheel zoom on SVG
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const scaleY = height / rect.height;
      const my = (e.clientY - rect.top) * scaleY;
      const frac = clamp(1 - (my - padT) / innerH, 0, 1);
      const center = viewYMin + frac * (viewYMax - viewYMin);
      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      zoomY(factor, center);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomY, height, innerH, viewYMin, viewYMax]);

  /* ---- Pointer handlers — multi-select & multi-drag ---- */
  const onPointerDown = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const hitRadius = 14;
    let hitSortedIdx = -1;
    for (let i = 0; i < sortedPoints.length; i++) {
      const s = toSvg(sortedPoints[i]);
      const dx = s.x - mx;
      const dy = s.y - my;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        hitSortedIdx = i;
        break;
      }
    }

    if (hitSortedIdx >= 0) {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl) {
        // Toggle this point in selection
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(hitSortedIdx)) next.delete(hitSortedIdx);
          else next.add(hitSortedIdx);
          return next;
        });
      } else if (!selected.has(hitSortedIdx)) {
        // If clicking unselected point without Ctrl, start fresh selection
        setSelected(new Set([hitSortedIdx]));
      }
      // Start drag
      const origIdx = points.indexOf(sortedPoints[hitSortedIdx]);
      setDragIdx(origIdx);
      const dp = fromSvg(mx, my);
      dragStartRef.current = { dataX: dp.x, dataY: dp.y, origPoints: [...sortedPoints] };
      return;
    }

    // Clicked empty area — deselect & add new point
    setSelected(new Set());
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

    if (dragIdx == null || !dragStartRef.current) return;

    // Compute delta in data space from drag start
    const deltaX = dp.x - dragStartRef.current.dataX;
    const deltaY = dp.y - dragStartRef.current.dataY;
    const origPts = dragStartRef.current.origPoints;

    // Determine which indices to move
    const dragSortedIdx = sortedPoints.indexOf(points[dragIdx]);
    const movingIndices = selected.size > 0 && selected.has(dragSortedIdx)
      ? selected
      : new Set([dragSortedIdx]);

    setPoints(() => {
      const next = origPts.map((p, i) => {
        if (!movingIndices.has(i)) return { ...p };
        const isFirst = i === 0;
        const isLast = i === origPts.length - 1;
        let newX = isFirst ? 0 : isLast ? 1 : p.x + deltaX;
        let newY = p.y + deltaY;
        newX = isFirst ? 0 : isLast ? 1 : clamp(newX, 0.005, 0.995);
        newY = clamp(newY, dataYMin, dataYMax);
        const snapped = applySnap({ x: newX, y: newY }, isFirst || isLast);
        return {
          x: isFirst ? 0 : isLast ? 1 : snapped.x,
          y: snapped.y,
        };
      });
      return next.sort((a, b) => a.x - b.x);
    });
  };

  const onPointerUp = () => {
    setDragIdx(null);
    dragStartRef.current = null;
  };

  /* ---- Tool actions ---- */
  const removeLastMiddlePoint = () => {
    setPoints((prev) => {
      if (prev.length <= 2) return prev;
      const next = [...prev];
      next.splice(next.length - 2, 1);
      return next;
    });
    setSelected(new Set());
  };

  const resetToFlat = () => {
    const mid = (dataYMin + dataYMax) / 2;
    setPoints([
      { x: 0, y: mid },
      { x: 1, y: mid },
    ]);
    setSelected(new Set());
  };

  const handleSmooth = () => {
    setPoints((prev) => smoothCurve(prev, dataYMin, dataYMax, 0.6));
  };

  const handleSubdivide = () => {
    setPoints((prev) => {
      if (prev.length >= 20) return prev;
      return subdivideCurve(prev, dataYMin, dataYMax);
    });
    setSelected(new Set());
  };

  const handlePresetCurve = (name) => {
    const pts = getCurvePreset(name, dataYMin, dataYMax);
    if (pts) setPoints(pts);
    setShowPresets(false);
    setSelected(new Set());
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

  const selText = selected.size > 0 ? ` · ${selected.size} selected` : "";

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="rounded-2xl bg-white/5 border border-white/10 p-4 shadow-lg outline-none focus:ring-1 focus:ring-white/15"
    >
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

        {/* Zoom section */}
        <span className="text-white/30 text-[10px] font-semibold uppercase tracking-wider mr-0.5">
          Zoom:
        </span>
        <ToolBtn onClick={() => zoomY(1.4, (yMin + yMax) / 2)} title="Zoom in (vertical)">
          🔍+
        </ToolBtn>
        <ToolBtn onClick={() => zoomY(1 / 1.4, (yMin + yMax) / 2)} title="Zoom out (vertical)">
          🔍−
        </ToolBtn>
        {isZoomed && (
          <ToolBtn onClick={resetZoom} title="Reset zoom to full range">
            ↕ Fit
          </ToolBtn>
        )}

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
        Click to add · Drag to move · Ctrl+Click multi-select · Ctrl+A select all · Scroll to zoom Y · Del removes selected
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
        {sortedPoints.map((p, i, arr) => {
            const s = toSvg(p);
            const isEndpoint = i === 0 || i === arr.length - 1;
            const isSel = selected.has(i);
            return (
              <g key={`pt-${i}`} style={{ cursor: "grab" }}>
                {/* Selection ring */}
                {isSel && (
                  <circle
                    cx={s.x} cy={s.y} r={isEndpoint ? 13 : 11}
                    fill="none" stroke="#facc15" strokeWidth={2}
                    opacity={0.7} strokeDasharray="3,2"
                  />
                )}
                {/* Glow */}
                <circle cx={s.x} cy={s.y} r={isEndpoint ? 10 : 8} fill={isSel ? "#facc15" : curveColor} opacity={0.15} />
                {/* Dot */}
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={isEndpoint ? 5.5 : 4.5}
                  fill={isSel ? "#facc15" : isEndpoint ? "#fff" : curveColor}
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
          {points.length} point{points.length !== 1 ? "s" : ""}{selText}
          {snapY !== "off" && (
            <span className="ml-2 text-white/20">
              📍 Snap: {snapY === "grid" ? "Grid" : "Notes"}
            </span>
          )}
          {isZoomed && (
            <span className="ml-2 text-white/20">
              🔍 {yFormat(viewYMin)} – {yFormat(viewYMax)}
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
