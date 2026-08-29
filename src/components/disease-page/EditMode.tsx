"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface EditModeValue {
  editing: boolean;
  setEditing: (value: boolean) => void;
  // Whether *this viewer* has edit permission at all — distinct from
  // `editing` (the current on/off toggle state). A block deep inside a
  // section (SubsectionHeadingBlockView, SubsubsectionHeadingBlockView)
  // needs this to decide whether to render its own SectionEditToggle,
  // and can't infer it from `editing` alone (false means either "no
  // permission" or "permission, just toggled off" — indistinguishable
  // without this field). Always true wherever EditModeProvider is
  // actually mounted (see its own comment below); the default context
  // value below is the only place this is ever false.
  canEdit: boolean;
}

// Default value (no Provider in the tree — a visitor, or any signed-in
// user who isn't editor/admin) means "not editable," full stop — the
// DOM ends up identical to a page that has never heard of edit mode,
// not just visually hidden.
const EditModeContext = createContext<EditModeValue>({
  editing: false,
  setEditing: () => {},
  canEdit: false,
});

export function useEditMode() {
  return useContext(EditModeContext);
}

// Toggling `editing` can change a large amount of content's height —
// every block in that section gains hover/insert chrome (the "+"
// inserter row above each block, BlockControls' toolbar column, etc.)
// even before anything is hovered. Without compensation, the browser
// keeps the same raw scroll offset while the content sitting at that
// offset shifts underneath it, so whatever you were looking at slides
// out from under you — reported as "the page kind of scrolls... does
// not stay in that section." Measuring the toggle button's own
// position immediately before and after the update, then nudging
// window.scrollBy by the difference, keeps it (and whatever you were
// reading near it) in the same screen position either way.
//
// flushSync, not requestAnimationFrame: a plain setEditing() call
// schedules the re-render for whenever React gets to it, which isn't
// guaranteed to have happened (let alone been painted) by the time a
// later rAF callback runs — that race was the actual bug in an
// earlier version of this fix (the "after" measurement could still
// read the pre-toggle layout). flushSync forces React to apply the
// update and its DOM changes immediately, synchronously, so the very
// next line already sees the new layout — no timing assumption needed.
function useScrollPreservingToggle(editing: boolean, setEditing: (value: boolean) => void) {
  const ref = useRef<HTMLButtonElement>(null);
  const onClick = () => {
    const before = ref.current?.getBoundingClientRect().top ?? null;
    flushSync(() => {
      setEditing(!editing);
    });
    const after = ref.current?.getBoundingClientRect().top;
    if (before != null && after != null && after !== before) {
      window.scrollBy(0, after - before);
    }
  };
  return { ref, onClick };
}

// Only ever rendered by the page when session.user.role is already
// known to be editor/admin — wraps already-server-rendered block
// output (passed as children) without converting any of it to client
// code. Defaults off: "editing the real page" should still default to
// reading the real page.
export function EditModeProvider({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  return (
    <EditModeContext.Provider value={{ editing, setEditing, canEdit: true }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function EditModeToggle() {
  const { editing, setEditing } = useEditMode();
  const { ref, onClick } = useScrollPreservingToggle(editing, setEditing);
  return (
    <Button
      ref={ref}
      type="button"
      variant={editing ? "primary" : "secondary"}
      onClick={onClick}
      className="gap-2"
    >
      <Pencil className="size-4" aria-hidden="true" />
      {editing ? "Done editing" : "Edit page"}
    </Button>
  );
}

// Small, per-section version of EditModeToggle (#136 — "instead of Edit
// Page, a button on all sections, so I can individually edit"). Reads
// whichever EditModeProvider is nearest in the tree, exactly like every
// other useEditMode() consumer (BlockControls, RichEditableText, every
// block view's own color picker) — so dropping one of these next to a
// section's heading, inside that section's own EditModeProvider, is
// the entire mechanism: no section-id bookkeeping, no lifted state,
// just Context resolving to the closest Provider up the tree.
export function SectionEditToggle() {
  const { editing, setEditing } = useEditMode();
  const { ref, onClick } = useScrollPreservingToggle(editing, setEditing);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-pressed={editing}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-ui text-xs font-medium transition-colors duration-base ${
        editing
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-secondary hover:border-accent hover:text-accent"
      }`}
    >
      <Pencil className="size-3" aria-hidden="true" />
      {editing ? "Done" : "Edit"}
    </button>
  );
}

// Minimal per-section edit boundary for the one place that doesn't
// have SectionCard's heading+tint treatment to hang a toggle off of —
// the rare "blocks that appear before the disease's first heading"
// preamble (BlockSequence's own `!section.headingBlock` branch). Same
// "own EditModeProvider + a toggle" shape SectionCard uses internally,
// without the card visuals. `canEdit` (not `editing`) gates whether
// this renders anything extra at all — a visitor gets back exactly
// `children` with no wrapper, same DOM as before this feature existed.
export function EditableSection({
  children,
  canEdit,
}: {
  children: ReactNode;
  canEdit: boolean;
}) {
  if (!canEdit) return <>{children}</>;
  return (
    <EditModeProvider>
      <div className="flex flex-col gap-2">
        <div className="flex justify-end">
          <SectionEditToggle />
        </div>
        {children}
      </div>
    </EditModeProvider>
  );
}
