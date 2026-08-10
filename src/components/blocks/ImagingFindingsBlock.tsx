import { Scan } from "lucide-react";
import type { ImagingFindingsBlock } from "@/lib/editorial-blocks";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";

export function ImagingFindingsBlockView({ block }: { block: ImagingFindingsBlock }) {
  return (
    <div className="flex flex-col gap-3">
      {block.findings.map((finding) => (
        <div
          key={finding.id}
          className="flex items-start gap-3 rounded-lg border border-border bg-surface-raised p-3"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-secondary">
            <Scan className="size-4" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-reading text-base text-primary">{finding.name}</span>
              <ClinicalBadge>{finding.modality}</ClinicalBadge>
            </div>
            {finding.description && (
              <p className="font-ui text-sm text-secondary">{finding.description}</p>
            )}
            {finding.typicalUse && (
              <p className="font-ui text-sm text-secondary">
                <span className="font-medium text-primary">When to order: </span>
                {finding.typicalUse}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
