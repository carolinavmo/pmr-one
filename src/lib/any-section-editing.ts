"use client";

// Whether *any* section on the page currently has its own edit mode
// toggled on — each SectionCard mounts its own independent
// EditModeProvider (see EditMode.tsx), so there's no single shared
// `editing` boolean OnThisPage can read directly. Reorder affordances
// (the drag handle) are a page-structure action, not tied to any one
// section's content, but they still shouldn't show to a reader who
// hasn't opened *any* section for editing — same "no affordance at
// all until it's actually relevant" rule every other edit control in
// this app follows. A plain window CustomEvent, same pattern as
// section-events.ts, since EditModeProvider instances and OnThisPage
// live in separate parts of the tree with no convenient shared
// client-side ancestor.
const EVENT_NAME = "pmr:any-section-editing-changed";
let activeCount = 0;

export function reportSectionEditing(isEditing: boolean) {
  activeCount += isEditing ? 1 : -1;
  window.dispatchEvent(new CustomEvent<boolean>(EVENT_NAME, { detail: activeCount > 0 }));
}

export function onAnySectionEditingChanged(handler: (isEditing: boolean) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
