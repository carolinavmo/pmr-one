import { getTranslations } from "next-intl/server";
import { Hand } from "lucide-react";
import type { ExaminationWorkflowBlock } from "@/lib/editorial-blocks";
import { maneuverRelationshipTerm, EXAM_METRIC_TERM_KEYS } from "@/lib/terms";
import { relationshipGlyph } from "@/lib/relationship-glyphs";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";

// The primary reason a resident opens a Disease Page (Tier 2
// Contextual Attachment) — richer than a compact search-result card,
// full detail up front rather than one line + a tap-through.
export async function ExaminationWorkflowBlockView({
  block,
}: {
  block: ExaminationWorkflowBlock;
}) {
  const t = await getTranslations("terms");

  return (
    <div className="flex flex-col gap-3">
      {block.maneuvers.map((maneuver) => {
        const metrics = [
          maneuver.sensitivity != null
            ? { label: t(EXAM_METRIC_TERM_KEYS.sensitivity), value: maneuver.sensitivity.toFixed(2) }
            : null,
          maneuver.specificity != null
            ? { label: t(EXAM_METRIC_TERM_KEYS.specificity), value: maneuver.specificity.toFixed(2) }
            : null,
        ].filter((metric): metric is { label: string; value: string } => metric !== null);

        const { Icon: RelationshipIcon, colorClass } = relationshipGlyph[maneuver.relationship];

        return (
          <div
            key={maneuver.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-3"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-secondary">
                <Hand className="size-4" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-reading text-base text-primary">
                    {maneuver.name}
                  </span>
                  <ClinicalBadge>
                    <RelationshipIcon
                      className={`mr-1 -ml-0.5 inline size-3.5 ${colorClass}`}
                      aria-hidden="true"
                    />
                    {maneuverRelationshipTerm(maneuver.relationship, t)}
                  </ClinicalBadge>
                </div>
                <p className="font-ui text-sm text-secondary">
                  <span className="font-medium text-primary">{t(EXAM_METRIC_TERM_KEYS.technique)} </span>
                  {maneuver.technique}
                </p>
                <p className="font-ui text-sm text-secondary">
                  <span className="font-medium text-primary">{t(EXAM_METRIC_TERM_KEYS.positiveFinding)} </span>
                  {maneuver.positiveFinding}
                </p>
              </div>
            </div>
            {metrics.length > 0 && <EvidenceBadge metrics={metrics} />}
          </div>
        );
      })}
    </div>
  );
}
