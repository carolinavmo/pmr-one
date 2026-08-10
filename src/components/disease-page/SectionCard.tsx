"use client";

import type { ReactNode } from "react";
import { useEditMode, EditModeProvider, SectionEditToggle } from "@/components/disease-page/EditMode";
import { CARD_COLOR_TINT } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";

interface SectionCardProps {
  heading: ReactNode;
  children: ReactNode;
  // The disease's resolved branch color (getDiseaseBranchColor) — the
  // exact same color IndexSidebar.tsx tints this disease's immediate
  // parent topic with while its page is open. `null` for a disease
  // with no topic assigned yet, falling back to the old flat tint.
  branchColor: CardColor | null;
  // Whether this reader can edit at all (server-computed permission,
  // distinct from `editing` — this section's own current toggle
  // state, read via useEditMode() below). Gates both whether a
  // per-section EditModeProvider is mounted and whether the toggle
  // button itself renders — a visitor gets neither, same DOM as a
  // page that's never heard of edit mode.
  canEdit: boolean;
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
export function SectionCard({ heading, children, branchColor, canEdit }: SectionCardProps) {
  const body = (
    <SectionCardBody heading={heading} branchColor={branchColor} canEdit={canEdit}>
      {children}
    </SectionCardBody>
  );
  return canEdit ? <EditModeProvider>{body}</EditModeProvider> : body;
}

function SectionCardBody({
  heading,
  children,
  branchColor,
  canEdit,
}: {
  heading: ReactNode;
  children: ReactNode;
  branchColor: CardColor | null;
  canEdit: boolean;
}) {
  const { editing } = useEditMode();

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">{heading}</div>
          <SectionEditToggle />
        </div>
        {children}
      </div>
    );
  }

  const headerTint = branchColor ? CARD_COLOR_TINT[branchColor] : "bg-surface-raised";

  return (
    <div className="mt-6 rounded-xl bg-surface-card first:mt-0">
      <div className={`flex items-center gap-3 rounded-t-xl px-4 py-3.5 ${headerTint}`}>
        <div className="min-w-0 flex-1 [&>h2]:!mt-0 [&>h2]:!text-[21px] [&>h2]:!leading-[28px]">
          {heading}
        </div>
        {canEdit && <SectionEditToggle />}
      </div>
      <div className="flex flex-col gap-4 border-t border-border/50 px-4 pt-4 pb-5">{children}</div>
    </div>
  );
}
