"use client";

import { useTranslations } from "next-intl";
import type { OverallProgress } from "@/lib/study-planner";

const SIZE = 100;
const RADIUS = 40;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Segment {
  value: number;
  className: string; // Tailwind `stroke-*` class — resolves via the
  // same CSS-variable-backed tokens as everywhere else, so this stays
  // correct in dark mode without a separate dark-mode branch.
}

// Hand-built SVG ring — no charting library, same approach as
// AnalyticsLineChart.tsx. Status-like meaning (done / active / not
// yet) maps to the app's existing meaningful color roles (trust /
// accent / a muted border) rather than the 8-color decorative
// category palette, matching the "meaningful roles get meaningful
// tokens" convention used everywhere else in this codebase.
export function OverallProgressCard({ progress }: { progress: OverallProgress }) {
  const t = useTranslations("studyPlanner");
  const { completed, inProgress, pending, total } = progress;

  const segments: Segment[] =
    total === 0
      ? [{ value: 1, className: "stroke-border" }]
      : [
          { value: completed, className: "stroke-trust" },
          { value: inProgress, className: "stroke-accent" },
          { value: pending, className: "stroke-border" },
        ];

  let cumulative = 0;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/40 bg-surface-raised p-3.5 shadow-sm">
      <h2 className="font-ui text-sm font-medium text-primary">{t("overallProgressHeading")}</h2>
      <div className="flex items-center gap-5">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="size-24 shrink-0"
          role="img"
          aria-label={t("overallProgressAriaLabel", { percent })}
        >
          {/* Each ring segment is rotated -90° individually (not the
              whole <svg>) so stroke-dasharray's default start point
              (3 o'clock) becomes 12 o'clock, while the percentage
              <text> below stays upright with no counter-rotation. */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            className="stroke-border/40"
            strokeWidth={STROKE}
          />
          {segments.map((segment, i) => {
            const length = (segment.value / (total || 1)) * CIRCUMFERENCE;
            const dashoffset = -cumulative;
            cumulative += length;
            if (segment.value === 0) return null;
            return (
              <circle
                key={i}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                className={segment.className}
                strokeWidth={STROKE}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={dashoffset}
                strokeLinecap={segments.length > 1 ? "butt" : "round"}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            );
          })}
          <text
            x={SIZE / 2}
            y={SIZE / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-primary font-heading text-[22px] font-semibold"
          >
            {percent}%
          </text>
        </svg>

        <ul className="flex flex-col gap-2 font-ui text-sm">
          <li className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full bg-trust" />
            <span className="text-secondary">{t("completedLabel")}</span>
            <span className="font-medium text-primary">{completed}</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full bg-accent" />
            <span className="text-secondary">{t("inProgressLabel")}</span>
            <span className="font-medium text-primary">{inProgress}</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full bg-border" />
            <span className="text-secondary">{t("pendingLabel")}</span>
            <span className="font-medium text-primary">{pending}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
