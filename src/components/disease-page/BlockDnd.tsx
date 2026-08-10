"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { reorderBlockAction, stackBlockAction } from "@/lib/actions/authoring";
import { notifySectionIndexChanged } from "@/lib/section-events";

export type DropZone = "before" | "stack-above" | "stack-below" | "after";

interface BlockDndValue {
  draggingId: string | null;
  startDrag: (id: string) => void;
  endDrag: () => void;
  requestDrop: (targetId: string, zone: DropZone) => void;
}

const BlockDndContext = createContext<BlockDndValue | null>(null);

export function useBlockDnd(): BlockDndValue | null {
  return useContext(BlockDndContext);
}

// Lifted the same way TopicManager.tsx lifts its own drag state: one
// Context above the whole block sequence rather than threading a prop
// through every nesting level (standalone blocks, 2-cell ResizableRows,
// 3/4-cell grid rows) — `dataTransfer.getData()` is unreadable during
// `dragover` in some browsers, only at `drop`, so "what's currently
// being dragged" has to come from React state, not the drag event
// itself. Always mounted (BlockSequence wraps its own output
// unconditionally); BlockControls only ever reads it once `editing` is
// already true, so it's a no-op the rest of the time.
//
// Four drop zones, not two — `before`/`after` are plain page-position
// reorders (reorderBlockAction); `stack-above`/`stack-below` join the
// target's column, stacking vertically inside the same row cell
// (stackBlockAction, #132). BlockControls computes which zone a given
// pointer position means; this Provider just routes the result to the
// matching action.
export function BlockDndProvider({
  diseaseId,
  children,
}: {
  diseaseId: string;
  children: ReactNode;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const value: BlockDndValue = {
    draggingId,
    startDrag: setDraggingId,
    endDrag: () => setDraggingId(null),
    requestDrop: (targetId, zone) => {
      const id = draggingId;
      setDraggingId(null);
      if (!id || id === targetId) return;
      // Doesn't know whether the dragged or target block is a
      // `section_heading` at this point (BlockDnd only ever sees ids),
      // so this notifies unconditionally rather than threading block
      // type through the drag payload just to gate it precisely —
      // edit-mode-only and cheap (see section-events.ts).
      if (zone === "stack-above" || zone === "stack-below") {
        void stackBlockAction(diseaseId, id, targetId, zone === "stack-above" ? "above" : "below").then(
          notifySectionIndexChanged
        );
      } else {
        void reorderBlockAction(diseaseId, id, targetId, zone).then(notifySectionIndexChanged);
      }
    },
  };

  return <BlockDndContext.Provider value={value}>{children}</BlockDndContext.Provider>;
}
