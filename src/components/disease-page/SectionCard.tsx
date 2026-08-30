"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useEditMode, EditModeProvider, SectionEditToggle } from "@/components/disease-page/EditMode";

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

  // Non-editable UI chrome, not part of the heading's own text — sits
  // beside it (never inside the EditableText h2) so it's never at risk
  // of getting swept into a save, and never needs the section renumbered
  // by hand after a reorder. Sized to match the heading's own font size
  // in each branch below (28px/36px full-size while editing per
  // SectionHeadingBlockView's own className; 21px/28px inside the
  // display card's colored title bar, matching that bar's own [&>h2]
  // override).
  function numberLabel(sizeClass: string, extraClass = "", colorClass = "text-primary") {
    if (sectionNumber == null) return null;
    return (
      <span className={`shrink-0 font-heading font-semibold ${colorClass} ${sizeClass} ${extraClass}`} aria-hidden="true">
        {sectionNumber}.
      </span>
    );
  }

  // One stable tree regardless of `editing` — toggling used to swap
  // between two entirely different subtrees (a bare flex column vs. a
  // card with a colored banner), which meant `children` (every block
  // in the section) sat at a different depth/parent-type on each
  // render and got fully unmounted and remounted on every toggle —
  // the real cause of "clicking Edit jumps the page," one level above
  // the identical problem already fixed in BlockControls.tsx. Only the
  // *styling* differs by branch below; element types and nesting are
  // identical either way, so children — and the heading block's own
  // internals, and SectionEditToggle — survive the toggle intact.
  //
  // heading is now always wrapped in the same min-w-0 flex-1 div in
  // both branches (previously only the editing branch did this), so
  // both branches use the [&_h2] descendant selector to reach the h2
  // inside it — a [&>h2] direct-child selector, which the read-only
  // branch used to rely on, would stop matching now that heading is
  // one level deeper here too.
  //
  // items-start (not items-baseline) while editing: `heading` here is
  // BlockControls' full editing chrome (a hover "+" insert row sits
  // above every block, headings included), not a bare h2 — flex
  // baseline alignment against that multi-row content lands on its
  // bottom edge, not the heading text. mt-4 on the number and
  // [&_h2]:!mt-0 on the heading both cancel out to the same offset
  // instead, so both start at the same y.
  return (
    <div className={editing ? "flex flex-col gap-2" : "mt-6 rounded-xl bg-surface-card first:mt-0"}>
      <div
        className={
          editing
            ? "flex items-start justify-between gap-2"
            : "flex items-center gap-3 rounded-[4px] bg-[#0f172a] px-4 py-3.5"
        }
      >
        <div
          className={
            editing
              ? "flex min-w-0 flex-1 items-start gap-2 [&_h2]:!mt-0"
              : "flex min-w-0 flex-1 items-baseline gap-2 [&_h2]:!mt-0 [&_h2]:!text-[21px] [&_h2]:!leading-[28px] [&_h2]:!text-white"
          }
        >
          {editing
            ? numberLabel("text-[28px] leading-[36px] tracking-[-0.2px]", "mt-4")
            : numberLabel("text-[21px] leading-[28px]", "", "text-white")}
          <div className="min-w-0 flex-1">{heading}</div>
        </div>
        {canEdit && <SectionEditToggle />}
        {!editing && isSignedIn && (
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
      </div>
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
