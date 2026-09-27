"use client";

import { useRef, useState } from "react";

// Pointer-events drag, same proven approach as useReorderDrag.ts
// (native HTML5 drag-and-drop is unreliable, trackpads in particular
// often never fire dragstart) — but hit-testing a 2D rect instead of
// a single row's vertical band, since the drop target here is "which
// day cell" in a month/week grid, not "before which row in a list".
// Kept separate from useReorderDrag rather than generalized: that
// hook's reorderIds "insert before this row" semantics don't apply to
// "move this task to that date".
export function useCalendarDrag(onDrop: (taskId: string, dateIso: string) => void) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [overDate, setOverDate] = useState<string | null>(null);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());
  const cleanupRef = useRef<(() => void) | null>(null);

  function registerCell(date: string) {
    return (el: HTMLElement | null) => {
      if (el) cellRefs.current.set(date, el);
      else cellRefs.current.delete(date);
    };
  }

  function startDrag(taskId: string) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggedTaskId(taskId);
      let currentOverDate: string | null = null;
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";

      const handleMove = (ev: PointerEvent) => {
        let found: string | null = null;
        for (const [date, el] of cellRefs.current) {
          const rect = el.getBoundingClientRect();
          if (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
            found = date;
            break;
          }
        }
        currentOverDate = found;
        setOverDate(found);
      };

      const end = (commit: boolean) => {
        cleanupRef.current = null;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleCancel);
        document.body.style.removeProperty("cursor");
        document.body.style.removeProperty("user-select");
        if (commit && currentOverDate) onDrop(taskId, currentOverDate);
        setDraggedTaskId(null);
        setOverDate(null);
      };
      const handleUp = () => end(true);
      const handleCancel = () => end(false);

      cleanupRef.current = () => end(false);
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleCancel);
    };
  }

  return { draggedTaskId, overDate, registerCell, startDrag };
}
