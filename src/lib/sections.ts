import type { EditorialBlock, SectionHeadingBlock } from "@/lib/editorial-blocks";
import { slugify } from "@/lib/slugify";
import { estimateReadingMinutes } from "@/lib/reading-time";

export interface Section {
  headingBlock: SectionHeadingBlock | null;
  blocks: EditorialBlock[];
}

// Splits the flat sequence at every section_heading. The very first
// section can come up with `headingBlock: null` when DiseaseSnapshot
// has already lifted the disease's own "Overview" heading out of the
// sequence (extractSnapshot in DiseaseSnapshot.tsx) — whatever's left
// over from that section still needs to render, just without a heading
// of its own to key an accordion off of. Shared by BlockSequence (the
// accordion render) and OnThisPage (the inline section summary) so
// both agree on exactly where one section ends and the next begins.
export function splitIntoSections(blocks: EditorialBlock[]): Section[] {
  const sections: Section[] = [];
  let current: Section = { headingBlock: null, blocks: [] };
  for (const block of blocks) {
    if (block.type === "section_heading") {
      if (current.headingBlock || current.blocks.length > 0) sections.push(current);
      current = { headingBlock: block, blocks: [] };
    } else {
      current.blocks.push(block);
    }
  }
  sections.push(current);
  return sections;
}

export interface SectionSummary {
  id: string;
  heading: string;
  minutes: number;
  // The heading block's real editorial_block id — distinct from `id`
  // above (an anchor slug, for scroll-to-section). Needed so OnThisPage
  // can drive reorderSectionAction (#137), which moves a whole section
  // by its heading block's id, not by a slug the database knows nothing
  // about.
  blockId: string;
}

// One row per real (headed) section, for OnThisPage — skips the
// headerless leading group (DiseaseSnapshot's already-rendered
// Overview) since there's no heading text to label a row with there.
// `id` matches exactly what SectionHeadingBlockView renders on the
// heading itself (slugify(text)), so `#id` links and
// document.getElementById(id) both resolve to the same element.
export function getSectionSummaries(blocks: EditorialBlock[]): SectionSummary[] {
  return splitIntoSections(blocks)
    .filter(
      (section): section is Section & { headingBlock: SectionHeadingBlock } =>
        section.headingBlock !== null
    )
    .map((section) => ({
      id: slugify(section.headingBlock.text),
      heading: section.headingBlock.text,
      minutes: estimateReadingMinutes(section.blocks),
      blockId: section.headingBlock.id,
    }));
}
