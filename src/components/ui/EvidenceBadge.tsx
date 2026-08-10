"use client";

import { useState } from "react";
import { Info } from "lucide-react";

interface EvidenceMetric {
  label: string;
  value: string;
}

interface EvidenceBadgeProps {
  metrics: EvidenceMetric[];
  triggerLabel?: string;
}

// Hidden by default, revealed on interaction — the "why this test"
// pattern (Tier 2). Never present unprompted on a card; never names the
// relationship type or shows a raw number without a label.
export function EvidenceBadge({
  metrics,
  triggerLabel = "Why this test",
}: EvidenceBadgeProps) {
  const [open, setOpen] = useState(false);

  if (metrics.length === 0) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-3 font-ui text-sm text-secondary transition-colors duration-base hover:bg-border/40"
      >
        <Info className="size-3.5" aria-hidden="true" />
        {triggerLabel}
      </button>
      {open && (
        <span className="inline-flex flex-wrap gap-2">
          {metrics.map((metric) => (
            <span
              key={metric.label}
              className="inline-flex items-center rounded-full border border-border bg-surface-raised px-3 py-1 font-ui text-sm text-primary"
            >
              {metric.label}: {metric.value}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
