"use client";

import type { SubsectionHeadingBlock } from "@/lib/editorial-blocks";
import { slugify } from "@/lib/slugify";
import { EditableText } from "@/components/ui/EditableText";
import { updateBlockTextAction } from "@/lib/actions/authoring";
import { TEXT_ALIGN_CLASS } from "@/lib/block-alignment";
import { useEditMode, SectionEditToggle } from "@/components/disease-page/EditMode";
import { notifySectionIndexChanged } from "@/lib/section-events";
import { SubsectionHeading, SUBSECTION_HEADING_TITLE_CLASS } from "@/components/ui/headings";
import { stripLeadingNumber } from "@/lib/heading-number";

// DESIGN-BRIEF.md's L3 "Subsection" — a tinted teal band with a heavy
// left rule and a solid number chip. `number` ("1.3") is computed by
// BlockSequence from this block's position among its section's own
// subsection_heading siblings — never parsed out of the title string
// — and `value` strips any hand-typed leading number defensively (see
// src/lib/heading-number.ts). Not counted in the "On this page" card,
// but does carry a stable anchor id (same slugify SectionHeadingBlockView
// uses) and the same scroll-mt as that heading, since IndexSidebar
// now links straight to whichever section is active's own
// subsections (getSectionIndex, disease-loader.ts).
//
// The Edit/Done toggle beside it reuses SectionEditToggle as-is — it
// just flips the *enclosing section's* shared editing state (the same
// one SectionCard's own toggle controls; subsections don't get an
// independent edit boundary), giving a much closer entry/exit point
// on a long section instead of scrolling back to the section banner.
export function SubsectionHeadingBlockView({
  block,
  number,
}: {
  block: SubsectionHeadingBlock;
  number: string | null;
}) {
  const { canEdit } = useEditMode();
  const textAlign = block.layout?.textAlign ?? "left";

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <SubsectionHeading number={number}>
          <EditableText
            as="h3"
            id={slugify(block.text)}
            multiline={false}
            className={`scroll-mt-36 font-section-heading ${SUBSECTION_HEADING_TITLE_CLASS} lg:scroll-mt-24 ${TEXT_ALIGN_CLASS[textAlign]}`}
            value={stripLeadingNumber(block.text)}
            onSave={async (value) => {
              await updateBlockTextAction(block.id, "text", value);
              notifySectionIndexChanged();
            }}
          />
        </SubsectionHeading>
      </div>
      {canEdit && <SectionEditToggle />}
    </div>
  );
}
