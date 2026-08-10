"use client";

import { CircleAlert } from "lucide-react";
import type { RiskFactorBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";

// Same callout-card visual language existing risk-factor paragraphs
// already use, but backed by a real, shared risk_factor row instead
// of inline text — the first Knowledge Object block type inserted
// through the reuse-first "+" picker rather than a seed script.
// Renaming the object itself is a Pass 2+ concern (would need the
// same "editing this changes it everywhere" panel Clinical Pearl
// already has); this view is read-only text, insert/reuse only.
export function RiskFactorBlockView({ block }: { block: RiskFactorBlock }) {
  const { editing } = useEditMode();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-secondary">
        <CircleAlert className="size-4" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-reading text-base text-primary">{block.riskFactor.name}</span>
        {editing && block.riskFactor.diseaseCount > 1 && (
          <span className="font-ui text-xs font-medium text-warning">
            Also a risk factor for {block.riskFactor.diseaseCount - 1} other{" "}
            {block.riskFactor.diseaseCount - 1 === 1 ? "disease" : "diseases"}.
          </span>
        )}
      </div>
    </div>
  );
}
