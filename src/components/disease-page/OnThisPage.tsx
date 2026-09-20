"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, GripVertical } from "lucide-react";
import type { SectionSummary } from "@/lib/sections";
import { reorderSectionAction } from "@/lib/actions/authoring";
import { notifySectionIndexChanged } from "@/lib/section-events";
import { onAnySectionEditingChanged } from "@/lib/any-section-editing";

interface OnThisPageProps {
  sections: SectionSummary[];
  diseaseId: string;
  // Whether this reader can reorder sections at all (server-computed
  // permission) — gates the drag handle's very existence, not just its
  // usability, same "no affordance at all for a visitor" pattern every
  // other edit control in this app follows.
  canEdit: boolean;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Which section is "active" — DESIGN-BRIEF.md's redesign highlights
// whichever row the reader is currently at, which this app has no
// existing tracking for. A thin IntersectionObserver band near the
// top of the viewport (below TopBar's own sticky header, matching
// SectionHeadingBlockView's own scroll-mt) — a heading crossing that
// band becomes active and stays active until the next one does.
// Self-contained client-side state, no persistence, no other
// component reads it.
function useActiveSectionId(sectionIds: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);
  const idsKey = sectionIds.join("|");

  useEffect(() => {
    const ids = idsKey ? idsKey.split("|") : [];
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        );
        setActiveId(topMost.target.id);
      },
      { rootMargin: "-100px 0px -66% 0px", threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [idsKey]);

  return activeId;
}

// Inline (normal document flow) summary of the reading column's own
// sections — replaces the old floating ContentsRail. Each row jumps
// straight to its section. No "Collapse all" control anymore — that
// only made sense back when sections were a collapse/expand accordion
// (SectionCard, since simplified to an always-visible card per
// founder request); nothing left to collapse. Doesn't render its own
// "Overview" row — DiseaseSnapshot/DiseaseHeader (rendered just above
// this) already covers that content, and it isn't one of the headed
// sections getSectionSummaries reports on.
//
// #137/#138: two columns, but *vertical* reading order within them —
// CSS multi-column (`columns-2`), not the old CSS grid. A grid's
// auto-flow fills row by row (1,2 / 3,4 / 5,6...), which read as
// "1, 3, 5... then 2, 4, 6..." — not what "1, then 2 below it, then 3"
// means. `columns-2` instead fills one column fully top-to-bottom
// before continuing at the top of the next (1-6 down the left column,
// 7-11 down the right, for an 11-section page) — same "1, 2, 3 in
// order" reading, still using both columns for space efficiency —
// this happens to land on the same left/right split DESIGN-BRIEF.md's
// own reference markup produces via its 2-column grid + interleaved
// DOM order, just without needing that interleaving.
// `break-inside-avoid` on each row keeps a single row from ever being
// visually split across the column break. Editors can also drag a row
// to reorder — this drives reorderSectionAction, which moves the
// *entire* section (heading + every block under it) in the real page
// below, not just this list's own display order.
export function OnThisPage({ sections, diseaseId, canEdit }: OnThisPageProps) {
  const t = useTranslations("disease");
  const tCommon = useTranslations("common");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<{ blockId: string; placement: "before" | "after" } | null>(
    null
  );
  const activeId = useActiveSectionId(sections.map((s) => s.id));
  // A reader should never see reorder affordances — `canEdit` alone
  // only means this viewer *has* edit permission, not that they're
  // currently using it, so the handle also waits for at least one
  // section's own edit mode to be switched on (see
  // any-section-editing.ts).
  const [anySectionEditing, setAnySectionEditing] = useState(false);
  useEffect(() => onAnySectionEditingChanged(setAnySectionEditing), []);
  const showDragHandles = canEdit && anySectionEditing;

  if (sections.length === 0) return null;

  return (
    <div className="mt-5 rounded-[14px] border border-border bg-surface px-5 py-[18px]">
      <span className="mb-3.5 block font-ui text-[11px] font-black tracking-[1.6px] text-[#8C97A6] uppercase">
        {t("onThisPage")}
      </span>
      <div className="columns-1 gap-x-[30px] gap-y-1.5 sm:columns-2">
        {sections.map((section, index) => {
          const isDropBefore =
            dropZone?.blockId === section.blockId && dropZone.placement === "before";
          const isDropAfter =
            dropZone?.blockId === section.blockId && dropZone.placement === "after";
          const isActive = section.id === activeId;

          return (
            <div
              key={section.id}
              className="relative flex items-center break-inside-avoid"
              onDragOver={(e) => {
                if (!draggingId || draggingId === section.blockId) return;
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const placement = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
                setDropZone({ blockId: section.blockId, placement });
              }}
              onDragLeave={() => setDropZone(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingId && dropZone?.blockId === section.blockId) {
                  void reorderSectionAction(diseaseId, draggingId, section.blockId, dropZone.placement).then(
                    notifySectionIndexChanged
                  );
                }
                setDraggingId(null);
                setDropZone(null);
              }}
            >
              {isDropBefore && (
                <div className="absolute inset-x-2 -top-0.5 z-10 h-0.5 rounded-full bg-accent" />
              )}
              {isDropAfter && (
                <div className="absolute inset-x-2 -bottom-0.5 z-10 h-0.5 rounded-full bg-accent" />
              )}
              {showDragHandles && (
                <span
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", section.blockId);
                    setDraggingId(section.blockId);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropZone(null);
                  }}
                  aria-label={`Drag to reorder ${section.heading}`}
                  className="flex shrink-0 cursor-grab items-center px-1 text-secondary hover:text-primary active:cursor-grabbing"
                >
                  <GripVertical className="size-4" aria-hidden="true" />
                </span>
              )}
              <button
                type="button"
                onClick={() => scrollToSection(section.id)}
                aria-current={isActive ? "location" : undefined}
                className={`flex min-w-0 flex-1 items-center gap-3 rounded-[9px] px-[10px] py-[9px] text-left transition-colors duration-base ${
                  isActive ? "bg-accent-bg" : "hover:bg-border/40"
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border font-ui text-xs font-black ${
                    isActive ? "border-accent bg-accent text-white" : "border-border bg-surface-sunken text-secondary"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate font-ui text-[15px] font-bold ${
                    isActive ? "text-accent" : "text-navy"
                  }`}
                >
                  {section.heading}
                </span>
                <span className="shrink-0 rounded-[12px] border border-border bg-surface-sunken px-[10px] py-[3px] font-ui text-[12px] font-bold text-[#9AA5B4]">
                  {tCommon("minutesShort", { count: section.minutes })}
                </span>
                <ChevronRight className="size-3.5 shrink-0 text-secondary" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
