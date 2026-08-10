"use client";

import { useState } from "react";
import { ShieldCheck, Shield, ShieldAlert } from "lucide-react";
import type { EvidenceSummaryBlock, EvidenceLevel } from "@/lib/editorial-blocks";
import { updateEvidenceSummaryAction } from "@/lib/actions/authoring";
import { RichEditableText } from "@/components/ui/RichEditableText";

const TIER_META: Record<
  EvidenceLevel,
  { label: string; icon: typeof ShieldCheck; fill: number; textClass: string; barClass: string; borderClass: string }
> = {
  strong: {
    label: "Strong Evidence",
    icon: ShieldCheck,
    fill: 90,
    textClass: "text-trust",
    barClass: "bg-trust",
    borderClass: "border-trust/30",
  },
  moderate: {
    label: "Moderate Evidence",
    icon: Shield,
    fill: 60,
    textClass: "text-accent",
    barClass: "bg-accent",
    borderClass: "border-accent/30",
  },
  limited: {
    label: "Limited Evidence",
    icon: ShieldAlert,
    fill: 25,
    textClass: "text-secondary",
    barClass: "bg-secondary",
    borderClass: "border-border",
  },
};

// A fixed 3-tier evidence-grading widget (Strong/Moderate/Limited) —
// unlike every other multi-item block, tiers can't be added, removed,
// or reordered, since the taxonomy itself is fixed; only each tier's
// description is author-editable. Each level implies its own icon,
// color, and fill amount, so nothing about identity needs storing.
export function EvidenceSummaryBlockView({
  block,
  diseaseSlug,
}: {
  block: EvidenceSummaryBlock;
  diseaseSlug: string;
}) {
  const [tiers, setTiers] = useState(block.tiers);

  const commit = (next: typeof tiers) => {
    setTiers(next);
    updateEvidenceSummaryAction(block.id, next);
  };

  if (tiers.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {tiers.map((tier, index) => {
        const meta = TIER_META[tier.level];
        const Icon = meta.icon;
        return (
          <div
            key={tier.level}
            className={`flex flex-col gap-2 rounded-lg border ${meta.borderClass} bg-surface-raised p-3`}
          >
            <div className="flex items-center gap-2">
              <Icon className={`size-4 ${meta.textClass}`} aria-hidden="true" />
              <span className={`font-ui text-sm font-semibold ${meta.textClass}`}>{meta.label}</span>
            </div>
            <RichEditableText
              as="p"
              value={tier.description}
              onSave={async (html) =>
                commit(tiers.map((t, i) => (i === index ? { ...t, description: html } : t)))
              }
              className="font-ui text-sm text-secondary"
              block={block}
              diseaseSlug={diseaseSlug}
            />
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div className={`h-full rounded-full ${meta.barClass}`} style={{ width: `${meta.fill}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
