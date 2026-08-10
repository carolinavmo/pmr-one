"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { useEditMode } from "@/components/disease-page/EditMode";
import { resizeRowAction } from "@/lib/actions/authoring";
import { ROW_ALIGN_SELF_CLASS } from "@/lib/block-alignment";
import type { VerticalAlign } from "@/lib/editorial-blocks";

type RowWidth = "1/4" | "1/3" | "1/2" | "2/3" | "3/4";

// Five snap points, indexed left to right — the right side is always
// 12 minus whichever column count the left side lands on, so a drag
// (or an arrow key) only ever needs to move one index and the pair
// falls out of it automatically (3/9, 4/8, 6/6, 8/4, 9/3).
const SNAPS: { width: RowWidth; cols: number; label: string }[] = [
  { width: "1/4", cols: 3, label: "25%" },
  { width: "1/3", cols: 4, label: "33%" },
  { width: "1/2", cols: 6, label: "50%" },
  { width: "2/3", cols: 8, label: "66%" },
  { width: "3/4", cols: 9, label: "75%" },
];

const widthClass: Record<RowWidth, string> = {
  "1/4": "w-full sm:w-1/4",
  "1/3": "w-full sm:w-1/3",
  "1/2": "w-full sm:w-1/2",
  "2/3": "w-full sm:w-2/3",
  "3/4": "w-full sm:w-3/4",
};

function colsToWidth(cols: number): RowWidth {
  return SNAPS.reduce((closest, snap) =>
    Math.abs(snap.cols - cols) < Math.abs(closest.cols - cols) ? snap : closest
  ).width;
}

function widthToIndex(width: RowWidth): number {
  const i = SNAPS.findIndex((s) => s.width === width);
  return i === -1 ? 2 : i;
}

const complement = (width: RowWidth): RowWidth =>
  colsToWidth(12 - SNAPS[widthToIndex(width)].cols);

interface ResizableRowProps {
  leftIds: string[];
  leftWidth: RowWidth;
  leftAlign?: VerticalAlign;
  leftNode: ReactNode;
  rightIds: string[];
  rightWidth: RowWidth;
  rightAlign?: VerticalAlign;
  rightNode: ReactNode;
}

// Replaces the old discrete width dropdown with a real divider: drag
// it and the two blocks resize together, snapped to fixed stops
// (25/33/50/66/75%) rather than free pixel resizing — "structured and
// predictable," not a general-purpose split pane. Works for any block
// type on either side (illustration, table, prose, anything
// combine-able) since this component only ever renders whatever node
// it's handed; it has no idea what's inside.
//
// Flexbox, not the 12-column CSS grid every other row (Card Grid's
// 3-4 uniform members) still uses — a real sibling element can sit
// between two flex children and take up its own width with zero
// layout math, where a grid item would need either absolute
// positioning or a fake zero-width column. That's also why this only
// ever handles exactly 2 members: a "grow this, shrink that" divider
// naturally describes a pair, not an arbitrary row size.
export function ResizableRow({
  leftIds,
  leftWidth,
  leftAlign,
  leftNode,
  rightIds,
  rightWidth,
  rightAlign,
  rightNode,
}: ResizableRowProps) {
  const { editing } = useEditMode();
  const containerRef = useRef<HTMLDivElement>(null);
  // Only set while actively dragging (or just after, until the commit
  // lands) — null means "trust the server-given widths as-is," which
  // matters because those two props aren't guaranteed complementary
  // (older data, or a future non-drag write) until a drag makes them so.
  const [liveLeft, setLiveLeft] = useState<RowWidth | null>(null);
  const [dragging, setDragging] = useState(false);

  const displayLeft = liveLeft ?? leftWidth;
  const displayRight = liveLeft ? complement(liveLeft) : rightWidth;

  const commit = useCallback(
    (nextLeft: RowWidth) => {
      resizeRowAction(leftIds, nextLeft, rightIds, complement(nextLeft));
    },
    [leftIds, rightIds]
  );

  // A drag session's move/up handlers are re-created per pointerdown
  // (not stable useCallbacks) so they can freely reference each other
  // for cleanup without a declaration-order problem — `cleanupRef`
  // just gives the unmount effect below something to call if a drag
  // is still in flight when the component goes away.
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  if (!editing) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className={`${widthClass[leftWidth]} ${leftAlign ? ROW_ALIGN_SELF_CLASS[leftAlign] : ""}`}>
          {leftNode}
        </div>
        <div className={`${widthClass[rightWidth]} ${rightAlign ? ROW_ALIGN_SELF_CLASS[rightAlign] : ""}`}>
          {rightNode}
        </div>
      </div>
    );
  }

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startIndex = widthToIndex(displayLeft);
    // Plain closure variable, not a functional setState updater — commit
    // needs to read "wherever the drag ended up" on pointerup, but firing
    // a Server Action from inside a setState updater is a React foul
    // (updaters must be pure); this is the same value, tracked outside
    // React's state instead.
    let snapped = displayLeft;
    setLiveLeft(displayLeft);
    setDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMove = (ev: PointerEvent) => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const colWidthPx = containerWidth / 12;
      const deltaCols = (ev.clientX - startX) / colWidthPx;
      const targetCols = SNAPS[startIndex].cols + deltaCols;
      let nearestIndex = 0;
      let nearestDist = Infinity;
      SNAPS.forEach((snap, i) => {
        const dist = Math.abs(snap.cols - targetCols);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = i;
        }
      });
      snapped = SNAPS[nearestIndex].width;
      setLiveLeft(snapped);
    };

    const handleUp = () => {
      cleanupRef.current = null;
      setDragging(false);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      commit(snapped);
    };

    cleanupRef.current = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const index = widthToIndex(displayLeft);
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      const next = SNAPS[index - 1].width;
      setLiveLeft(next);
      commit(next);
    } else if (e.key === "ArrowRight" && index < SNAPS.length - 1) {
      e.preventDefault();
      const next = SNAPS[index + 1].width;
      setLiveLeft(next);
      commit(next);
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-1 sm:flex-row sm:items-stretch">
      <div
        className={`${widthClass[displayLeft]} sm:pr-2 ${leftAlign ? ROW_ALIGN_SELF_CLASS[leftAlign] : ""}`}
      >
        {leftNode}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize columns"
        aria-valuemin={0}
        aria-valuemax={SNAPS.length - 1}
        aria-valuenow={widthToIndex(displayLeft)}
        aria-valuetext={`${SNAPS[widthToIndex(displayLeft)].label} / ${SNAPS[widthToIndex(displayRight)].label}`}
        tabIndex={0}
        onPointerDown={startDrag}
        onKeyDown={onKeyDown}
        className="group relative hidden shrink-0 touch-none items-stretch justify-center sm:flex sm:w-3 sm:cursor-col-resize sm:outline-none"
      >
        <div
          className={`w-px rounded-full transition-colors duration-base ${
            dragging ? "bg-accent" : "bg-border group-hover:bg-accent group-focus-visible:bg-accent"
          }`}
        />
        <GripVertical
          className={`absolute top-1/2 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 text-secondary transition-colors duration-base group-hover:text-accent group-focus-visible:text-accent ${
            dragging ? "text-accent" : ""
          }`}
          aria-hidden="true"
        />
      </div>
      <div
        className={`${widthClass[displayRight]} sm:pl-2 ${rightAlign ? ROW_ALIGN_SELF_CLASS[rightAlign] : ""}`}
      >
        {rightNode}
      </div>
    </div>
  );
}
