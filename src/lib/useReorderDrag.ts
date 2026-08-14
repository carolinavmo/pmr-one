"use client";

import { useEffect, useRef, useState } from "react";

// Pointer-events-based drag reordering — lifted from AtlasIndex.tsx,
// where it was proven across two independent drag scopes (sections,
// pages) but stayed private to that file. Generic over string ids,
// nothing here is Atlas-specific. AtlasIndex.tsx keeps its own copy
// rather than importing this one, to avoid touching an already-shipped
// feature for a pure refactor with no user-facing change.

// Drop-on-a-row reordering: dropping the dragged id onto a target row
// inserts it immediately before that row. Simpler than tracking a
// precise before/after boundary per row (BlockControls.tsx's approach,
// needed there for its row/stack-into-columns drop zones) — a flat
// list reorder doesn't need that precision.
export function reorderIds(ids: string[], draggedId: string, dropTargetId: string): string[] {
  if (draggedId === dropTargetId) return ids;
  const without = ids.filter((id) => id !== draggedId);
  const idx = without.indexOf(dropTargetId);
  if (idx === -1) return ids;
  without.splice(idx, 0, draggedId);
  return without;
}

// Native HTML5 drag-and-drop (draggable + onDragStart/onDragOver/onDrop)
// turned out unreliable in practice — browsers vary in how forgiving
// they are about the initial grab, trackpads in particular routinely
// fail to register a dragstart at all. Pointer events don't have that
// problem: a plain pointerdown/pointermove/pointerup sequence tracked
// on `window`, with manual rect hit-testing against each row's own ref
// to figure out which row the pointer is currently over. `ids`/
// `onReorder` are read fresh on every pointerdown via the arguments
// closed over by `startDrag`, so a stale prop from an earlier render
// is never in play.
export function useReorderDrag(ids: string[], onReorder: (orderedIds: string[]) => void) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  function registerRow(id: string) {
    return (el: HTMLElement | null) => {
      if (el) rowRefs.current.set(id, el);
      else rowRefs.current.delete(id);
    };
  }

  function startDrag(id: string) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      setDraggedId(id);
      // Plain closure variable, not a functional setState updater —
      // handleUp needs to read "wherever the pointer ended up" once,
      // outside React's own state.
      let currentOverId: string | null = null;
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";

      const handleMove = (ev: PointerEvent) => {
        let found: string | null = null;
        for (const [rowId, el] of rowRefs.current) {
          const rect = el.getBoundingClientRect();
          if (ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
            found = rowId;
            break;
          }
        }
        currentOverId = found;
        setOverId(found);
      };

      // commit:false is what a lost pointer (pointercancel — the
      // browser interrupting the gesture for its own reasons: a stylus
      // lift, a system gesture, the tab losing focus mid-drag) needs:
      // clean the drag state back up without treating "wherever the
      // pointer happened to be last" as an intentional drop.
      const end = (commit: boolean) => {
        cleanupRef.current = null;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleCancel);
        document.body.style.removeProperty("cursor");
        document.body.style.removeProperty("user-select");
        if (commit && currentOverId && currentOverId !== id) {
          onReorder(reorderIds(ids, id, currentOverId));
        }
        setDraggedId(null);
        setOverId(null);
      };
      const handleUp = () => end(true);
      const handleCancel = () => end(false);

      cleanupRef.current = () => end(false);
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleCancel);
    };
  }

  return { draggedId, overId, registerRow, startDrag };
}

// Shared visual feedback — a ring (not a border/outline that would
// shift layout) around whichever row the pointer is currently over,
// plus dimming the row actually being dragged.
export function dragRowClass(id: string, draggedId: string | null, overId: string | null): string | undefined {
  const classes: string[] = [];
  if (draggedId === id) classes.push("opacity-40");
  if (overId === id && draggedId !== id) classes.push("rounded-md ring-2 ring-accent ring-inset");
  return classes.length ? classes.join(" ") : undefined;
}
