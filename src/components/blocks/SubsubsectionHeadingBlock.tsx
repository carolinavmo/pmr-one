"use client";

import type { SubsubsectionHeadingBlock } from "@/lib/editorial-blocks";
import { EditableText } from "@/components/ui/EditableText";
import { updateBlockTextAction } from "@/lib/actions/authoring";
import { TEXT_ALIGN_CLASS } from "@/lib/block-alignment";
import { useEditMode, SectionEditToggle } from "@/components/disease-page/EditMode";

// One step quieter than SubsectionHeadingBlock: same fixed brand teal,
// but no tinted pill background — just colored, smaller, bold text
// with a full-width teal rule underneath, on its own line. Deliberately
// no id/slugify and no notifySectionIndexChanged, same reasoning as
// the subsection tier: not meant to be deep-linkable or counted, only
// visually styled like a heading within the surrounding section's own
// content.
//
// The Edit/Done toggle beside it reuses SectionEditToggle as-is — same
// as SubsectionHeadingBlock, it flips the enclosing section's shared
// editing state rather than opening an independent boundary, just
// giving a closer entry/exit point than the section banner above.
export function SubsubsectionHeadingBlockView({ block }: { block: SubsubsectionHeadingBlock }) {
  const { canEdit } = useEditMode();
  const textAlign = block.layout?.textAlign ?? "left";

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <EditableText
          as="h4"
          multiline={false}
          className={`w-full border-b border-[#128A99] pb-1.5 font-heading text-base font-semibold text-[#128A99] ${TEXT_ALIGN_CLASS[textAlign]}`}
          value={block.text}
          onSave={(value) => updateBlockTextAction(block.id, "text", value)}
        />
      </div>
      {canEdit && <SectionEditToggle />}
    </div>
  );
}
