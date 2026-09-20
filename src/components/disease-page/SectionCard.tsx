"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useEditMode, EditModeProvider, SectionEditToggle } from "@/components/disease-page/EditMode";
import { SectionHeading } from "@/components/ui/headings";

interface SectionCardProps {
  heading: ReactNode;
  children: ReactNode;
  // This section's 1-based position among the page's *headed*
  // sections — matches the number OnThisPage prints beside the same
  // heading (getSectionSummaries uses the identical counting rule).
  // `null` for the headerless leading group, which has no row in
  // OnThisPage to match. Purely a render-time label, never persisted
  // or editable — reordering sections changes it for free.
  sectionNumber: number | null;
  // Whether this reader can edit at all (server-computed permission,
  // distinct from `editing` — this section's own current toggle
  // state, read via useEditMode() below). Gates both whether a
  // per-section EditModeProvider is mounted and whether the toggle
  // button itself renders — a visitor gets neither, same DOM as a
  // page that's never heard of edit mode.
  canEdit: boolean;
  // Signed-in members get a collapse toggle on every section (each
  // starts expanded, per-section local state — not persisted). Signed-
  // out visitors never see the toggle at all, so a page they land on
  // is never missing content behind an unfamiliar control.
  isSignedIn: boolean;
}

// One section = one independent edit boundary (#136 — replaces the
// old single page-wide "Edit page" button with a toggle per section,
// "so I can individually edit"). Each SectionCard mounts its own
// EditModeProvider, so every existing useEditMode() consumer inside it
// (BlockControls, RichEditableText, every block view's own color
// picker, AlignmentPicker...) automatically becomes scoped to *this*
// section without any of those ~15+ call sites changing — React
// context always resolves to the nearest Provider up the tree, and
// nesting one per section is the entire mechanism. Two or more
// sections can be in edit mode simultaneously (each has its own
// independent state), which also means dragging a block between two
// currently-editing sections just works — BlockControls' drag handle
// only ever renders once a block's own section is editing, so cross-
// section drag is naturally available exactly when both ends are open
// and naturally unavailable otherwise, with no extra bookkeeping.
export function SectionCard({ heading, children, sectionNumber, canEdit, isSignedIn }: SectionCardProps) {
  const body = (
    <SectionCardBody heading={heading} sectionNumber={sectionNumber} canEdit={canEdit} isSignedIn={isSignedIn}>
      {children}
    </SectionCardBody>
  );
  return canEdit ? <EditModeProvider>{body}</EditModeProvider> : body;
}

function SectionCardBody({
  heading,
  children,
  sectionNumber,
  canEdit,
  isSignedIn,
}: {
  heading: ReactNode;
  children: ReactNode;
  sectionNumber: number | null;
  canEdit: boolean;
  isSignedIn: boolean;
}) {
  const { editing } = useEditMode();
  // Every section starts open, every page load — no persistence, no
  // fetch, matches "by default I want all open" exactly. Only a
  // signed-in member ever sees the control that can change it.
  const [collapsed, setCollapsed] = useState(false);

  // The collapse chevron only ever shows read-only (signed-in visitors
  // browsing, not the editor mid-edit) — SectionEditToggle is the only
  // trailing action while editing.
  const trailingActions = editing ? (
    canEdit && <SectionEditToggle />
  ) : (
    <>
      {canEdit && <SectionEditToggle />}
      {isSignedIn && (
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand section" : "Collapse section"}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors duration-base hover:bg-white/15 hover:text-white"
        >
          <ChevronDown
            className={`size-4 transition-transform duration-base ${collapsed ? "-rotate-90" : ""}`}
            aria-hidden="true"
          />
        </button>
      )}
    </>
  );

  // One stable tree regardless of `editing` — toggling used to swap
  // between two entirely different subtrees (a bare flex column vs. a
  // card with a colored banner), which meant `children` (every block
  // in the section) sat at a different depth/parent-type on each
  // render and got fully unmounted and remounted on every toggle —
  // the real cause of "clicking Edit jumps the page," one level above
  // the identical problem already fixed in BlockControls.tsx. SectionHeading
  // (headings.tsx) now owns that same discipline internally — it renders
  // `heading` at the same tree position regardless of its own `editing`
  // prop, only varying classNames and the (stateless) number badge — so
  // rendering through it unconditionally here, rather than branching
  // between two hand-rolled subtrees, keeps that guarantee.
  return (
    <div className={editing ? "flex flex-col gap-2" : "mt-6 rounded-xl bg-surface-card first:mt-0"}>
      <SectionHeading number={sectionNumber} editing={editing} actions={trailingActions}>
        {heading}
      </SectionHeading>
      <div
        className={
          editing
            ? undefined
            : `flex flex-col gap-4 border-t border-border/50 px-4 pt-4 pb-5 ${collapsed ? "hidden" : ""}`
        }
      >
        {children}
      </div>
    </div>
  );
}
