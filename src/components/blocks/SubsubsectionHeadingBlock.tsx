"use client";

import type { SubsubsectionHeadingBlock } from "@/lib/editorial-blocks";
import { EditableText } from "@/components/ui/EditableText";
import { updateBlockTextAction } from "@/lib/actions/authoring";
import { TEXT_ALIGN_CLASS } from "@/lib/block-alignment";
import { useEditMode, SectionEditToggle } from "@/components/disease-page/EditMode";
import { SubsubsectionHeading, SUBSUBSECTION_HEADING_TITLE_CLASS } from "@/components/ui/headings";
import { stripLeadingNumber } from "@/lib/heading-number";

// DESIGN-BRIEF.md's L4 "Sub-subsection" — a teal left rule, navy
// title text, no fill and no number (per headings-spec.html's own
// `.h-ssub`, a *left* rule — not the bottom underline this used
// before). Deliberately no id/slugify and no notifySectionIndexChanged,
// same reasoning as the subsection tier: not meant to be deep-linkable
// or counted, only visually styled like a heading within the
// surrounding section's own content. `value` strips any hand-typed
// leading number defensively (see src/lib/heading-number.ts) — this
// level has no derived number of its own to show even if one is
// present in the stored text.
//
// The Edit/Done toggle beside it reuses SectionEditToggle as-is — same
// as SubsectionHeadingBlock, it flips the enclosing section's shared
// editing state rather than opening an independent boundary, just
// giving a closer entry/exit point than the section banner above.
export function SubsubsectionHeadingBlockView({ block }: { block: SubsubsectionHeadingBlock }) {
  const { canEdit } = useEditMode();
  const textAlign = block.layout?.textAlign ?? "left";

  return (
    <div className="mt-6 flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <SubsubsectionHeading>
          <EditableText
            as="h4"
            multiline={false}
            className={`w-full font-section-heading ${SUBSUBSECTION_HEADING_TITLE_CLASS} ${TEXT_ALIGN_CLASS[textAlign]}`}
            value={stripLeadingNumber(block.text)}
            onSave={(value) => updateBlockTextAction(block.id, "text", value)}
          />
        </SubsubsectionHeading>
      </div>
      {canEdit && <SectionEditToggle />}
    </div>
  );
}
