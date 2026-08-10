"use client";

import { useRef, useState } from "react";
import type { DailyCount } from "@/lib/analytics";

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 220;
const PAD_LEFT = 32;
const PAD_RIGHT = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

const SHORT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

// A single-series line/area chart with a hover crosshair, built as
// plain SVG rather than pulling in a charting library for one chart.
// Single series needs no legend (the section heading above already
// names it) — see the dataviz skill's interaction/accessibility rules.
export function AnalyticsLineChart({ data, label }: { data: DailyCount[]; label: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const plotWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const maxValue = Math.max(...data.map((d) => d.count), 3);
  const n = data.length;

  const xFor = (i: number) => PAD_LEFT + (n === 1 ? 0 : (i / (n - 1)) * plotWidth);
  const yFor = (value: number) => PAD_TOP + plotHeight - (value / maxValue) * plotHeight;

  const linePoints = data.map((d, i) => `${xFor(i)},${yFor(d.count)}`).join(" ");
  const areaPoints = `${xFor(0)},${yFor(0)} ${linePoints} ${xFor(n - 1)},${yFor(0)}`;

  // 4 recessive horizontal gridlines at nice fractions of the max —
  // not full axis ticks, just enough for the eye to gauge magnitude.
  const gridFractions = [0, 0.25, 0.5, 0.75, 1];

  function handleMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fraction = (event.clientX - rect.left) / rect.width;
    const index = Math.round(fraction * (n - 1));
    setHoverIndex(Math.min(n - 1, Math.max(0, index)));
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  // Flip the tooltip to the left half once the point is past the
  // chart's midpoint so it never runs off the right edge.
  const tooltipAnchorsLeft = hoverIndex !== null && hoverIndex > n / 2;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-[180px] w-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        role="img"
        aria-label={`${label} over the last ${n} days`}
      >
        {gridFractions.map((f) => (
          <line
            key={f}
            x1={PAD_LEFT}
            x2={VIEW_WIDTH - PAD_RIGHT}
            y1={PAD_TOP + plotHeight * (1 - f)}
            y2={PAD_TOP + plotHeight * (1 - f)}
            className="stroke-border"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <text
          x={PAD_LEFT - 6}
          y={PAD_TOP + 4}
          textAnchor="end"
          className="fill-secondary font-ui text-[10px]"
        >
          {maxValue}
        </text>
        <text x={PAD_LEFT - 6} y={PAD_TOP + plotHeight} textAnchor="end" className="fill-secondary font-ui text-[10px]">
          0
        </text>

        <polygon points={areaPoints} className="fill-accent/10" />
        <polyline
          points={linePoints}
          fill="none"
          className="stroke-accent"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {hovered && (
          <>
            <line
              x1={xFor(hoverIndex!)}
              x2={xFor(hoverIndex!)}
              y1={PAD_TOP}
              y2={PAD_TOP + plotHeight}
              className="stroke-secondary/40"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={xFor(hoverIndex!)}
              cy={yFor(hovered.count)}
              r={4}
              className="fill-accent stroke-surface"
              strokeWidth={2}
            />
          </>
        )}

        <text x={PAD_LEFT} y={VIEW_HEIGHT - 6} className="fill-secondary font-ui text-[10px]">
          {SHORT_DATE.format(new Date(data[0].date + "T00:00:00"))}
        </text>
        <text
          x={VIEW_WIDTH - PAD_RIGHT}
          y={VIEW_HEIGHT - 6}
          textAnchor="end"
          className="fill-secondary font-ui text-[10px]"
        >
          {SHORT_DATE.format(new Date(data[n - 1].date + "T00:00:00"))}
        </text>
      </svg>

      {hovered && (
        <div
          className={`pointer-events-none absolute top-0 flex flex-col gap-0.5 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 shadow-md ${
            tooltipAnchorsLeft ? "right-0" : "left-0"
          }`}
          style={
            tooltipAnchorsLeft
              ? { right: `${100 - (xFor(hoverIndex!) / VIEW_WIDTH) * 100}%`, marginRight: 8 }
              : { left: `${(xFor(hoverIndex!) / VIEW_WIDTH) * 100}%`, marginLeft: 8 }
          }
        >
          <span className="font-ui text-xs font-medium text-primary">
            {SHORT_DATE.format(new Date(hovered.date + "T00:00:00"))}
          </span>
          <span className="font-ui text-xs text-secondary">
            {hovered.count} {label.toLowerCase()}
          </span>
        </div>
      )}
    </div>
  );
}
