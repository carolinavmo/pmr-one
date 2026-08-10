"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface EditModeValue {
  editing: boolean;
  setEditing: (value: boolean) => void;
}

// Default value (no Provider in the tree — a visitor, or any signed-in
// user who isn't editor/admin) means "not editable," full stop — the
// DOM ends up identical to a page that has never heard of edit mode,
// not just visually hidden.
const EditModeContext = createContext<EditModeValue>({
  editing: false,
  setEditing: () => {},
});

export function useEditMode() {
  return useContext(EditModeContext);
}

// Only ever rendered by the page when session.user.role is already
// known to be editor/admin — wraps already-server-rendered block
// output (passed as children) without converting any of it to client
// code. Defaults off: "editing the real page" should still default to
// reading the real page.
export function EditModeProvider({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  return (
    <EditModeContext.Provider value={{ editing, setEditing }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function EditModeToggle() {
  const { editing, setEditing } = useEditMode();
  return (
    <Button
      type="button"
      variant={editing ? "primary" : "secondary"}
      onClick={() => setEditing(!editing)}
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
  return (
    <button
      type="button"
      onClick={() => setEditing(!editing)}
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
