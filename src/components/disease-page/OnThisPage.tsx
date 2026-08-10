"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, GripVertical } from "lucide-react";
import type { SectionSummary } from "@/lib/sections";
import { iconForHeading } from "@/lib/section-icons";
import { reorderSectionAction } from "@/lib/actions/authoring";
import { notifySectionIndexChanged } from "@/lib/section-events";

interface OnThisPageProps {
  sections: SectionSummary[];
  diseaseId: string;
  // Whether this reader can reorder sections at all (server-computed
  // permission) — gates the drag handle's very existence, not just its
  // usability, same "no affordance at all for a visitor" pattern every
  // other edit control in this app follows.
  canEdit: boolean;
}

// Lowercase on purpose, same reasoning as SectionCard's own
// sectionIcon helper — a plain render-helper, not a component, so
// picking an icon at render time from iconForHeading's stable,
// module-level lookup table doesn't read as "component created during
// render" to the react-hooks static-components check.
function rowIcon(heading: string) {
  const Icon = iconForHeading(heading);
  return <Icon className="size-4 shrink-0 text-secondary" aria-hidden="true" />;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
// order" reading, still using both columns for space efficiency.
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

  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface-raised p-4">
      <span className="pb-2 font-ui text-sm font-semibold text-primary">{t("onThisPage")}</span>
      <div className="columns-1 gap-x-6 sm:columns-2">
        {sections.map((section, index) => {
          const isDropBefore =
            dropZone?.blockId === section.blockId && dropZone.placement === "before";
          const isDropAfter =
            dropZone?.blockId === section.blockId && dropZone.placement === "after";

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
              {canEdit && (
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
                className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors duration-base hover:bg-border/40"
              >
                {rowIcon(section.heading)}
                <span className="min-w-0 flex-1 truncate font-ui text-sm text-primary">
                  {index + 1}. {section.heading}
                </span>
                <span className="shrink-0 rounded-full bg-border/40 px-2 py-0.5 font-ui text-xs text-secondary">
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
