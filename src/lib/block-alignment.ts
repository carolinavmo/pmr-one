import type { HorizontalAlign, VerticalAlign } from "@/lib/editorial-blocks";

// Shared class maps so every alignable block and BlockSequence/
// ResizableRow (which render the block-level width/position/row
// alignment) read from one place instead of six near-identical copies.

export const TEXT_ALIGN_CLASS: Record<HorizontalAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

// For icon-beside-text blocks (a `flex` row, icon left of text) —
// cross-axis alignment is `items-*`.
export const ROW_ITEMS_CLASS: Record<VerticalAlign, string> = {
  top: "items-start",
  middle: "items-center",
  bottom: "items-end",
};

// For icon-above-text blocks (a `flex flex-col` card, e.g. Clinical
// Pearl) — main-axis alignment is `justify-*`.
export const COLUMN_JUSTIFY_CLASS: Record<VerticalAlign, string> = {
  top: "justify-start",
  middle: "justify-center",
  bottom: "justify-end",
};

// Standalone block width (no `row`) — real percentage widths, not the
// 12-column grid span classes BlockSequence's row path uses, since a
// standalone block isn't inside a grid.
export const STANDALONE_WIDTH_CLASS: Record<string, string> = {
  "1/4": "w-full sm:w-1/4",
  "1/3": "w-full sm:w-1/3",
  "1/2": "w-full sm:w-1/2",
  "2/3": "w-full sm:w-2/3",
  "3/4": "w-full sm:w-3/4",
  full: "w-full",
};

// Horizontal position for a standalone block narrower than the
// reading column — margin-auto positioning, not flexbox, since the
// block sits alone in the sequence (no siblings to justify-content
// against).
export const STANDALONE_ALIGN_CLASS: Record<HorizontalAlign, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

// A block's own sizing within a shared row — unset/undefined keeps the
// pre-existing stretch behavior (matches the tallest sibling); set,
// the block shrinks to its own content height and sits at that edge.
export const ROW_ALIGN_SELF_CLASS: Record<VerticalAlign, string> = {
  top: "self-start",
  middle: "self-center",
  bottom: "self-end",
};
