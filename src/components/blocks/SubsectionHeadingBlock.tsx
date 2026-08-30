"use client";

import type { SubsectionHeadingBlock } from "@/lib/editorial-blocks";
import { slugify } from "@/lib/slugify";
import { EditableText } from "@/components/ui/EditableText";
import { updateBlockTextAction } from "@/lib/actions/authoring";
import { TEXT_ALIGN_CLASS } from "@/lib/block-alignment";
import { useEditMode, SectionEditToggle } from "@/components/disease-page/EditMode";
import { notifySectionIndexChanged } from "@/lib/section-events";

// A solid teal pill (white text) — EXPERIMENTAL, local-only. Swapped
// with the section banner's own color per founder request: sections
// are now dark-navy (SectionCard.tsx), subsections now carry the
// brand teal that used to belong to the section banner. Not counted
// in the "On this page" card or numbered like a section — but does
// carry a stable anchor id (same slugify SectionHeadingBlockView
// uses) and the same scroll-mt as that heading, since IndexSidebar
// now links straight to whichever section is active's own
// subsections (getSectionIndex, disease-loader.ts).
//
// The Edit/Done toggle beside it reuses SectionEditToggle as-is — it
// just flips the *enclosing section's* shared editing state (the same
// one SectionCard's own toggle controls; subsections don't get an
// independent edit boundary), giving a much closer entry/exit point
// on a long section instead of scrolling back to the section banner.
export function SubsectionHeadingBlockView({ block }: { block: SubsectionHeadingBlock }) {
  const { canEdit } = useEditMode();
  const textAlign = block.layout?.textAlign ?? "left";

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <EditableText
          as="h3"
          id={slugify(block.text)}
          multiline={false}
          className={`scroll-mt-36 rounded-[4px] bg-[#128A99] px-3 py-2 font-heading text-lg font-semibold text-white lg:scroll-mt-24 ${TEXT_ALIGN_CLASS[textAlign]}`}
          value={block.text}
          onSave={async (value) => {
            await updateBlockTextAction(block.id, "text", value);
            notifySectionIndexChanged();
          }}
        />
      </div>
      {canEdit && <SectionEditToggle />}
    </div>
  );
}
