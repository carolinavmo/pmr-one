// The section/subsection/sub-subsection number must always be a
// separate value, never text baked into a heading's own stored
// string — that's the fix for the historical "3. 3. The
// Intervertebral Disc" bug, where a derived number (SectionCard's own
// `sectionNumber`) was rendered right next to a title that already
// had its own hand-typed number in it. Existing content may still
// carry that hand-typed prefix, so every place a heading's raw stored
// text is displayed strips it defensively — this fixes the rendering
// unconditionally, regardless of whether the underlying data has been
// cleaned up yet. Matches "4. ", "4.1 ", "4.1.1 ", etc. A bare
// "12 " with no dot is deliberately NOT matched, so a title that
// legitimately starts with a number (e.g. "12 steps to...") is left
// alone.
const LEADING_NUMBER_PATTERN = /^\d+(?:\.\d+)+\s+|^\d+\.\s+/;

export function stripLeadingNumber(text: string): string {
  return text.replace(LEADING_NUMBER_PATTERN, "");
}
