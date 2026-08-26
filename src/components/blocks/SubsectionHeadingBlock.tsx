"use client";

import type { SubsectionHeadingBlock } from "@/lib/editorial-blocks";
import { EditableText } from "@/components/ui/EditableText";
import { updateBlockTextAction } from "@/lib/actions/authoring";
import { TEXT_ALIGN_CLASS } from "@/lib/block-alignment";

// Same fixed brand teal as the section header bar (SectionCard.tsx),
// just tinted instead of solid — "similar style, lighter background."
// Deliberately no id/slugify and no notifySectionIndexChanged: this
// heading isn't meant to be deep-linkable or counted, only visually
// styled like one within the surrounding section's own content.
export function SubsectionHeadingBlockView({ block }: { block: SubsectionHeadingBlock }) {
  const textAlign = block.layout?.textAlign ?? "left";

  return (
    <EditableText
      as="h3"
      multiline={false}
      className={`rounded-[4px] bg-[#128A99]/10 px-3 py-2 font-heading text-lg font-semibold text-[#128A99] ${TEXT_ALIGN_CLASS[textAlign]}`}
      value={block.text}
      onSave={(value) => updateBlockTextAction(block.id, "text", value)}
    />
  );
}
