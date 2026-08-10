"use client";

import type { SectionHeadingBlock } from "@/lib/editorial-blocks";
import { slugify } from "@/lib/slugify";
import { EditableText } from "@/components/ui/EditableText";
import { updateBlockTextAction } from "@/lib/actions/authoring";
import { TEXT_ALIGN_CLASS } from "@/lib/block-alignment";
import { notifySectionIndexChanged } from "@/lib/section-events";

// Carries a stable anchor id so the Sprint 3 Contents rail (left nav)
// can link straight to it.
export function SectionHeadingBlockView({
  block,
}: {
  block: SectionHeadingBlock;
}) {
  const textAlign = block.layout?.textAlign ?? "left";

  return (
    <EditableText
      as="h2"
      id={slugify(block.text)}
      multiline={false}
      // Section breaks get extra space beyond the tight rhythm within
      // one section (VISUAL_IDENTITY.md §4) — mt-10 (40px) on top of
      // the parent's 24px block gap (page.tsx's reading column) = 64px
      // before every new section, vs. 24px between two blocks within
      // one. Trimmed down from mt-16/96px-over-a-32px-gap (founder
      // request — felt too spacious both before a heading and in the
      // gap right after it) while still reading as clearly more than
      // the in-section rhythm. Trimmed further (mt-10 → mt-8) as part
      // of a general page-compaction pass. H2 per PM&R Atlas Design
      // System doc: Poppins SemiBold, 28px/36px, -0.2px tracking. No
      // vertical-align control here (unlike the other 6 alignable
      // types) — a bare single-line heading has no container height to
      // position itself within, so AlignmentPicker deliberately omits
      // it for section_heading.
      //
      // scroll-mt clears TopBar's own sticky header when a hash link
      // (OnThisPage, the sidebar section index) jumps straight to a
      // heading — without it the browser's native anchor scroll puts
      // the heading right at the viewport's top edge, which the fixed
      // header then covers entirely. Two breakpoints because the
      // header itself is two different heights: ~129px below `lg`
      // (TopBar wraps to a second row for the mobile logo), ~69px at
      // `lg`+ (Sidebar carries the logo instead) — measured directly
      // rather than guessed, each with a little headroom on top.
      className={`mt-8 scroll-mt-36 font-heading text-[28px] leading-[36px] tracking-[-0.2px] font-semibold text-primary first:mt-0 lg:scroll-mt-24 ${TEXT_ALIGN_CLASS[textAlign]}`}
      value={block.text}
      onSave={async (value) => {
        await updateBlockTextAction(block.id, "text", value);
        notifySectionIndexChanged();
      }}
    />
  );
}
