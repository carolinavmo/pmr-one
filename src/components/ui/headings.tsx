import type { ReactNode } from "react";

// DESIGN-BRIEF.md's "Heading hierarchy" — five levels, distinguished
// by *form*, not size alone, so a reader can tell the level without
// comparing two headings side by side. Fill weight descends: solid
// navy (L2) → teal tint (L3) → rule only (L4) → plain (L5) — never
// two consecutive levels with the same treatment.
//
// Every level's number/eyebrow is a component prop, never
// concatenated into the title string — the actual fix for the
// historical "3. 3. The Intervertebral Disc" duplication (see
// src/lib/heading-number.ts for the companion defensive strip, since
// existing content may still carry a hand-typed number in its stored
// text).
//
// These are presentational only: `children` is typically an
// already-editable node (EditableText/RichEditableText) rendered by
// the calling block-view component, which keeps ownership of the
// actual content and its own editing logic. These components own only
// the level's visual chrome — fill, rule, chip, eyebrow.

// ---------- L1 · Page ----------
// Plain text, no number, no rule. Once per page.
export const PAGE_HEADING_CLASS = "text-[44px] leading-none font-black tracking-[-1.5px] text-navy";

export function PageHeading({ children }: { children: ReactNode }) {
  return <div className={PAGE_HEADING_CLASS}>{children}</div>;
}

// ---------- L2 · Section ----------
// A filled navy card — the *only* heading with a background. The
// number lives in the eyebrow ("SECTION 4"), never in the title.
export const SECTION_HEADING_TITLE_CLASS =
  "text-[25px] leading-[1.12] font-black tracking-[-0.6px] text-white";

export function SectionHeading({
  number,
  editing = false,
  actions,
  children,
}: {
  number: number | null;
  // SectionCard renders this in both its editing and read-only states
  // (rather than branching between two different subtrees itself) so
  // `children` — the actual heading block, with its own EditableText
  // machinery — always sits at the same tree position and is never
  // unmounted/remounted by the toggle. That remount was a real, already-
  // fixed bug ("clicking Edit jumps the page") — see SectionCard.tsx's
  // own comment. Only the number badge (a stateless leaf) differs by
  // element type between the two states, which is harmless.
  editing?: boolean;
  // Trailing slot (the spec's own "✎ Edit" affordance) — sits inside
  // the navy card, pushed right by the title's own flex-1.
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={
        editing
          ? "flex items-start justify-between gap-2"
          : "flex items-center gap-3.5 rounded-[13px] bg-navy-fill px-5 py-[15px]"
      }
    >
      <div className={editing ? "flex min-w-0 flex-1 items-start gap-2" : "flex min-w-0 flex-1 flex-col gap-0.5"}>
        {number != null &&
          (editing ? (
            <span
              className="mt-4 shrink-0 font-section-heading text-[38px] leading-[46px] font-black tracking-[-0.2px] text-primary"
              aria-hidden="true"
            >
              {number}.
            </span>
          ) : (
            <div className="text-[11px] font-black tracking-[1.6px] text-[#7FCBD1]" aria-hidden="true">
              SECTION {number}
            </div>
          ))}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {actions}
    </div>
  );
}

// ---------- L3 · Subsection ----------
// A tinted teal band with a heavy left rule and a solid number chip
// ("1.3") — filled, but not solid, so it reads below the navy section.
export const SUBSECTION_HEADING_TITLE_CLASS = "text-[23px] font-black tracking-[-0.5px] text-navy";

export function SubsectionHeading({
  number,
  children,
}: {
  number: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-r-xl border-l-[7px] border-accent bg-accent-bg py-[14px] px-5">
      {number != null && (
        <span className="shrink-0 rounded-[7px] bg-accent px-[11px] py-[5px] text-[13.5px] font-black text-white">
          {number}
        </span>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// ---------- L4 · Sub-subsection ----------
// Teal left rule, navy text, no fill and no number — for question-
// style headings inside a subsection.
export const SUBSUBSECTION_HEADING_TITLE_CLASS = "text-[19.5px] font-black tracking-[-0.25px] text-navy";

export function SubsubsectionHeading({ children }: { children: ReactNode }) {
  return <div className="border-l-[5px] border-accent pl-[15px]">{children}</div>;
}

// ---------- L5 · Run-in ----------
// Rare. Teal bold lead-in on the same line as body text — used
// instead of inventing a sixth block-level heading.
export function RunInHeading({ children }: { children: ReactNode }) {
  return <span className="font-black text-[16.5px] tracking-[0.2px] text-accent">{children}</span>;
}
