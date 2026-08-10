"use client";

const EVENT_NAME = "pmr:section-index-changed";

// IndexSidebar's per-disease section list is fetched once per page
// load, keyed only on the active disease slug (see IndexSidebar.tsx) —
// renaming a section heading, adding/removing one, or reordering
// sections (via OnThisPage's drag, the generic block-drag system, or
// the up/down move buttons) never changes the slug, so nothing would
// otherwise tell the sidebar to refetch. Every editing call site that
// can change a disease's section list calls notifySectionIndexChanged()
// once its server action settles; IndexSidebar listens and refetches.
// A plain window CustomEvent rather than a new React Context — the two
// ends (BlockControls/BlockDnd/BlockPicker/SectionHeadingBlockView/
// OnThisPage vs. the shell's IndexSidebar) live in separate parts of
// the tree with no convenient shared client-side ancestor to host one.
export function notifySectionIndexChanged() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function onSectionIndexChanged(handler: () => void): () => void {
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
