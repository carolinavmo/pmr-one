"use client";

import type { SectionHeadingBlock } from "@/lib/editorial-blocks";
import { slugify } from "@/lib/slugify";
import { EditableText } from "@/components/ui/EditableText";
import { updateBlockTextAction } from "@/lib/actions/authoring";
import { TEXT_ALIGN_CLASS } from "@/lib/block-alignment";
import { notifySectionIndexChanged } from "@/lib/section-events";
import { useEditMode } from "@/components/disease-page/EditMode";
import { SECTION_HEADING_TITLE_CLASS } from "@/components/ui/headings";
import { stripLeadingNumber } from "@/lib/heading-number";

// Carries a stable anchor id so the Sprint 3 Contents rail (left nav)
// can link straight to it. `value` is stripped of any hand-typed
// leading number ("4. ", "4.1 " …) before display — SectionCard's own
// `sectionNumber` (derived from position, never from this text) is
// the only number ever shown, via the SectionHeading eyebrow. Fixes
// the "3. 3. The Intervertebral Disc" duplication regardless of
// whether the underlying stored text has been cleaned up.
export function SectionHeadingBlockView({
  block,
}: {
  block: SectionHeadingBlock;
}) {
  const { editing } = useEditMode();
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
      // of a general page-compaction pass. No
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
      //
      // Two treatments: raw/plain while this section is actively being
      // edited (matches every other heading's editing-mode look), or
      // DESIGN-BRIEF.md's L2 title style — sized for the navy
      // SectionHeading card SectionCard wraps this in when read-only.
      className={
        editing
          ? `mt-8 scroll-mt-36 font-section-heading text-[38px] leading-[46px] tracking-[-0.2px] font-black text-primary first:mt-0 lg:scroll-mt-24 ${TEXT_ALIGN_CLASS[textAlign]}`
          : // scroll-mt-[100px] — SIDEBAR-BAND-SPEC.md's own value,
            // clearing the sticky TopBar on a rail/deep-link jump. The
            // read-only path had no scroll-margin at all before this
            // (only the editing branch above did), a real pre-existing
            // gap this also happens to fix.
            `scroll-mt-[100px] font-section-heading ${SECTION_HEADING_TITLE_CLASS} ${TEXT_ALIGN_CLASS[textAlign]}`
      }
      value={stripLeadingNumber(block.text)}
      onSave={async (value) => {
        await updateBlockTextAction(block.id, "text", value);
        notifySectionIndexChanged();
      }}
    />
  );
}
