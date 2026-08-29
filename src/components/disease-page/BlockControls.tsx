"use client";

import { useState, type ReactNode } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Columns2, GripVertical, Copy, Check } from "lucide-react";
import type { EditorialBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { useBlockDnd, type DropZone } from "@/components/disease-page/BlockDnd";
import {
  deleteBlockAction,
  moveBlockAction,
  combineWithAdjacentBlockAction,
  removeFromRowAction,
  getBlockForClipboardAction,
} from "@/lib/actions/authoring";
import { writeBlockClipboard } from "@/lib/block-clipboard";
import { BlockPicker } from "@/components/disease-page/BlockPicker";
import { AlignmentPicker } from "@/components/disease-page/AlignmentPicker";
import { notifySectionIndexChanged } from "@/lib/section-events";

// Section headings stay full-width and out of any row — they anchor
// the Contents rail and drive the "nearest heading" context hint, both
// of which assume one heading spans the whole column on its own line.
const LAYOUT_INCOMPATIBLE_TYPES = new Set(["section_heading"]);

// Text/prose blocks only — the alignment picker's "text align" and
// "text vertical align" controls need one piece of running text to
// apply to, which most other block types (tables, algorithms,
// timelines, stat cards...) don't have a single obvious one of.
const ALIGNABLE_TYPES = new Set([
  "paragraph",
  "section_heading",
  "key_point",
  "clinical_pearl",
  "warning_pitfall",
  "learning_objective",
  "self_check",
  "overview",
  // Not prose, but reuses this same picker for its own caption's text
  // align plus the standard standalone block width/position controls
  // (SimpleImageBlock.tsx) — cheaper than a bespoke control for a
  // block deliberately kept this simple.
  "simple_image",
  "highlight_card",
  "icon_text",
  "icon_list",
  "medical_illustration",
  "image_comparison",
]);

// Block types whose insert path is fully wired end-to-end today, so
// move/delete are safe to offer too. A type only earns a spot here
// once the registry marks it "available" and it has real move/delete
// semantics (Pass 2 will grow this list, not restructure it).
const MANAGEABLE_TYPES = new Set([
  "paragraph",
  "section_heading",
  "subsection_heading",
  "subsubsection_heading",
  "key_point",
  "clinical_pearl",
  "risk_factor",
  "warning_pitfall",
  "learning_objective",
  "examination_workflow",
  "imaging_findings",
  "reference_list",
  "medical_illustration",
  "timeline",
  "infographic",
  "comparison_table",
  "treatment_algorithm",
  "rehabilitation_progression",
  "self_check",
  "tabs",
  "media_tabs",
  "rich_table",
  "evidence_summary",
  "stat_card",
  "image_comparison",
  "image_row",
  "callout_banner",
  "citation_card",
  "badge_row",
  "icon_list",
  "photo_card_gallery",
  "overview",
  "simple_image",
  "highlight_card",
  "icon_text",
]);

interface BlockControlsProps {
  diseaseId: string;
  block: EditorialBlock;
  contextHint?: string;
  children: ReactNode;
}

// Wraps every top-level block with a "+" inserter above it (universal
// — any available block type can go anywhere) and, for block types
// whose insert path is fully wired (MANAGEABLE_TYPES), a small
// delete/move toolbar. Renders only its children when edit mode is
// off — BlockSequence renders one of these per block unconditionally,
// so it never needs to know about edit mode itself.
export function BlockControls({
  diseaseId,
  block,
  contextHint,
  children,
}: BlockControlsProps) {
  const { editing } = useEditMode();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Drop-target state for this specific block — which of its four drop
  // zones (§below) a drag is currently hovering, so the right indicator
  // renders on the right edge. Called unconditionally (before the
  // `!editing` early return below) even though it's only ever read
  // once editing is true — same rules-of-hooks requirement
  // TopicTreeItem's own separator early-return already ran into.
  const [dropZone, setDropZone] = useState<DropZone | null>(null);
  const dnd = useBlockDnd();

  if (!editing) return <>{children}</>;

  const position = block.position ?? 0;
  const isManageable = MANAGEABLE_TYPES.has(block.type);
  const canLayout = !LAYOUT_INCOMPATIBLE_TYPES.has(block.type);
  const isAlignable = ALIGNABLE_TYPES.has(block.type);
  const inRow = Boolean(block.layout?.row);
  const isDragging = dnd?.draggingId === block.id;

  return (
    <div
      className="group/block relative flex flex-col gap-1"
      onDragOver={(e) => {
        if (!dnd?.draggingId || dnd.draggingId === block.id) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const fraction = (e.clientY - rect.top) / rect.height;
        // Outer quarters reorder this block's *position* on the page
        // (before/after); the middle half stacks the dragged block
        // into this one's column (#132) — only offered when this
        // block can actually hold a row cell (not a section heading).
        // Stack zones fall back to plain before/after on a heading, so
        // the whole block surface always does *something* sensible.
        if (!canLayout) {
          setDropZone(fraction < 0.5 ? "before" : "after");
        } else if (fraction < 0.25) {
          setDropZone("before");
        } else if (fraction < 0.5) {
          setDropZone("stack-above");
        } else if (fraction < 0.75) {
          setDropZone("stack-below");
        } else {
          setDropZone("after");
        }
      }}
      onDragLeave={() => setDropZone(null)}
      onDrop={(e) => {
        e.preventDefault();
        if (dropZone) dnd?.requestDrop(block.id, dropZone);
        setDropZone(null);
      }}
    >
      {(dropZone === "before" || dropZone === "after") && (
        <div
          className={`absolute inset-x-0 z-10 h-0.5 rounded-full bg-accent ${
            dropZone === "before" ? "-top-0.5" : "-bottom-0.5"
          }`}
        />
      )}
      {(dropZone === "stack-above" || dropZone === "stack-below") && (
        <div className="pointer-events-none absolute inset-0 z-10 rounded-lg ring-2 ring-accent ring-inset">
          <div
            className={`absolute inset-x-4 h-0.5 rounded-full bg-accent ${
              dropZone === "stack-above" ? "top-1" : "bottom-1"
            }`}
          />
        </div>
      )}
      <div className="relative flex h-3 items-center justify-center">
        <div className="absolute inset-x-0 top-1/2 h-px bg-border opacity-0 group-hover/block:opacity-100" />
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((open) => !open)}
            aria-label="Insert block"
            className="flex size-6 items-center justify-center rounded-full border border-border bg-surface-raised text-secondary opacity-0 shadow-sm transition-opacity duration-base group-hover/block:opacity-100 hover:text-accent"
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
          {pickerOpen && (
            <div className="absolute top-7 left-1/2 z-10 -translate-x-1/2">
              <BlockPicker
                diseaseId={diseaseId}
                afterPosition={position}
                contextHint={contextHint}
                onClose={() => setPickerOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2">
        <div className={`min-w-0 flex-1 ${isDragging ? "opacity-40" : ""}`}>{children}</div>
        {(isManageable || canLayout || isAlignable) && (
          <div className="relative flex shrink-0 flex-col gap-0.5 opacity-0 transition-opacity duration-base group-hover/block:opacity-100">
            <button
              type="button"
              aria-label="Drag to reorder"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", block.id);
                dnd?.startDrag(block.id);
              }}
              onDragEnd={() => dnd?.endDrag()}
              className="flex size-6 cursor-grab items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary active:cursor-grabbing"
            >
              <GripVertical className="size-3.5" aria-hidden="true" />
            </button>
            {isAlignable && <AlignmentPicker block={block} />}
            {isManageable && (
              <>
                <button
                  type="button"
                  aria-label="Move up"
                  className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
                  onClick={async () => {
                    await moveBlockAction(diseaseId, block.id, position, "up");
                    if (block.type === "section_heading") notifySectionIndexChanged();
                  }}
                >
                  <ChevronUp className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
                  onClick={async () => {
                    await moveBlockAction(diseaseId, block.id, position, "down");
                    if (block.type === "section_heading") notifySectionIndexChanged();
                  }}
                >
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                </button>
              </>
            )}
            {canLayout && (
              <button
                type="button"
                aria-label={inRow ? "Remove from row" : "Layout"}
                aria-pressed={inRow}
                title={inRow ? "Remove from row" : "Combine with adjacent block"}
                className={`flex size-6 items-center justify-center rounded hover:bg-border/40 ${
                  inRow ? "text-accent" : "text-secondary hover:text-primary"
                }`}
                onClick={() =>
                  inRow
                    ? removeFromRowAction(diseaseId, block.id)
                    : setLayoutOpen((open) => !open)
                }
              >
                <Columns2 className="size-3.5" aria-hidden="true" />
              </button>
            )}
            {isManageable && (
              <button
                type="button"
                aria-label="Copy block"
                title="Copy — paste it anywhere via the + inserter"
                className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
                onClick={async () => {
                  const clip = await getBlockForClipboardAction(block.id);
                  if (!clip) return;
                  writeBlockClipboard(clip);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? (
                  <Check className="size-3.5 text-trust" aria-hidden="true" />
                ) : (
                  <Copy className="size-3.5" aria-hidden="true" />
                )}
              </button>
            )}
            {isManageable && (
              <button
                type="button"
                aria-label="Delete block"
                className="flex size-6 items-center justify-center rounded text-secondary hover:bg-warning/10 hover:text-warning"
                onClick={async () => {
                  await deleteBlockAction(block.id);
                  if (block.type === "section_heading") notifySectionIndexChanged();
                }}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            )}
            {layoutOpen && !inRow && (
              <div className="absolute top-0 right-7 z-10 w-48 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
                <div className="flex flex-col gap-1">
                  <span className="font-ui text-xs font-medium text-secondary">Combine with</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLayoutOpen(false);
                      combineWithAdjacentBlockAction(diseaseId, block.id, "previous");
                    }}
                    className="rounded px-2 py-1 text-left font-ui text-xs text-primary hover:bg-border/40"
                  >
                    Block above
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLayoutOpen(false);
                      combineWithAdjacentBlockAction(diseaseId, block.id, "next");
                    }}
                    className="rounded px-2 py-1 text-left font-ui text-xs text-primary hover:bg-border/40"
                  >
                    Block below
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
