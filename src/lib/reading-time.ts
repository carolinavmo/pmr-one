import type { EditorialBlock } from "@/lib/editorial-blocks";

const WORDS_PER_MINUTE = 200;

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    if (value.length > 3) out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
}

// A rough estimate, not a precise one — walks every string value on
// every block (paragraph body, timeline step descriptions, table
// cells, badge labels, ids, everything) rather than a per-type prose
// extractor, since block shapes are too varied for a hand-written
// switch to stay worth maintaining for what's ultimately just a soft
// "~N min" reading-time hint. The noise this picks up along the way
// (uuids, icon names, color names) adds a roughly constant handful of
// "words" per block — negligible against a real page's actual prose.
export function estimateReadingMinutes(blocks: EditorialBlock[]): number {
  return estimateReadingMinutesFromValues(blocks);
}

// A cheaper variant for list-page contexts (the library home's
// Browse-by-area rows) that only need a rough per-page minute count
// for many pages at once — takes each page's raw `content_config`
// rows straight from the DB rather than going through the full
// disease loader's block resolution (which also hydrates referenced
// objects like maneuvers/illustrations via extra joins, expensive to
// do for every page in a region just to count words). Undercounts
// references-object blocks whose prose lives on the referenced row
// rather than in content_config — acceptable for a "~N min" hint,
// same "rough, not precise" tradeoff estimateReadingMinutes already
// makes.
export function estimateReadingMinutesFromValues(values: unknown[]): number {
  const strings: string[] = [];
  for (const value of values) collectStrings(value, strings);
  const text = strings.join(" ").replace(/<[^>]+>/g, " ");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}
