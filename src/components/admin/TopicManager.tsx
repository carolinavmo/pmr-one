"use client";

import { createContext, useContext, useState } from "react";
import { Plus, Minus } from "lucide-react";
import type { TopicNode } from "@/lib/topics";
import { createTopicAction, createSeparatorAction, moveTopicAction } from "@/lib/actions/topics";
import { moveDiseaseAction } from "@/lib/actions/diseases";
import { TopicTreeEditor } from "./TopicTreeEditor";
import { Button } from "@/components/ui/Button";

// A drag can carry either a topic (folder) or a disease (condition)
// — "kind" is threaded alongside the id everywhere so a drop target
// can tell the two apart and route to the right Server Action. A
// disease drag is scoped to reordering within its own topic (see
// moveDiseaseAction's own comment) — it's never a valid "into" target
// for a topic row's re-parent drop zone.
type DragKind = "topic" | "disease";

interface TopicDndValue {
  draggingId: string | null;
  draggingKind: DragKind | null;
  startDrag: (id: string, kind: DragKind) => void;
  endDrag: () => void;
  requestMove: (newParentId: string | null, newIndex: number) => Promise<void>;
  requestDiseaseMove: (topicId: string, newIndex: number) => Promise<void>;
}

const TopicDndContext = createContext<TopicDndValue | null>(null);

// Every row needs to know "what's currently being dragged" to render
// its own drop-zone highlight and to reject dropping a node onto
// itself — lifted here (one Context, not threaded through every
// recursive prop list) since `dataTransfer.getData()` is unreadable
// during `dragover` in some browsers, only at `drop`, so live drag
// state has to come from React state instead.
export function useTopicDnd(): TopicDndValue {
  const ctx = useContext(TopicDndContext);
  if (!ctx) throw new Error("useTopicDnd must be used inside TopicManager");
  return ctx;
}

interface TopicManagerProps {
  tree: TopicNode[];
}

// Top-level admin editor for the Explore tree — owns only transient,
// page-local UI state (which node is mid-drag, the "add root topic"
// form, the last drop's error). The tree itself is never copied into
// local state: every mutation is a Server Action that calls
// `revalidatePath`, and Next re-renders this page's server-fetched
// `tree` prop automatically afterward (same pattern BlockControls.tsx
// already relies on for its own move/delete buttons).
export function TopicManager({ tree }: TopicManagerProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingKind, setDraggingKind] = useState<DragKind | null>(null);
  const [addingRoot, setAddingRoot] = useState(false);
  const [rootName, setRootName] = useState("");
  const [rootError, setRootError] = useState<string | null>(null);
  const [addingSeparator, setAddingSeparator] = useState(false);
  const [separatorName, setSeparatorName] = useState("");
  const [separatorError, setSeparatorError] = useState<string | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);
  const [rootDropActive, setRootDropActive] = useState(false);

  const dnd: TopicDndValue = {
    draggingId,
    draggingKind,
    startDrag: (id, kind) => {
      setDraggingId(id);
      setDraggingKind(kind);
    },
    endDrag: () => {
      setDraggingId(null);
      setDraggingKind(null);
    },
    requestMove: async (newParentId, newIndex) => {
      const id = draggingKind === "topic" ? draggingId : null;
      setDraggingId(null);
      setDraggingKind(null);
      if (!id) return;
      const result = await moveTopicAction(id, newParentId, newIndex);
      setDropError(result.ok ? null : result.error);
    },
    requestDiseaseMove: async (topicId, newIndex) => {
      const id = draggingKind === "disease" ? draggingId : null;
      setDraggingId(null);
      setDraggingKind(null);
      if (!id) return;
      const result = await moveDiseaseAction(id, topicId, newIndex);
      setDropError(result.ok ? null : result.error);
    },
  };

  async function handleAddRoot() {
    const name = rootName.trim();
    if (!name) return;
    const result = await createTopicAction(name, null);
    if (!result.ok) {
      setRootError(result.error);
      return;
    }
    setRootName("");
    setAddingRoot(false);
    setRootError(null);
  }

  async function handleAddSeparator() {
    const name = separatorName.trim();
    if (!name) return;
    const result = await createSeparatorAction(name);
    if (!result.ok) {
      setSeparatorError(result.error);
      return;
    }
    setSeparatorName("");
    setAddingSeparator(false);
    setSeparatorError(null);
  }

  return (
    <TopicDndContext.Provider value={dnd}>
      <div className="flex flex-col gap-4">
        {dropError && (
          <p className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 font-ui text-sm text-warning">
            {dropError}
          </p>
        )}

        <div className="flex flex-col gap-0.5 rounded-lg border border-border p-2">
          {tree.length === 0 ? (
            <p className="px-2 py-4 text-center font-ui text-sm text-secondary">
              No topics yet — add the first one below.
            </p>
          ) : (
            tree.map((node, index) => (
              <TopicTreeEditor key={node.id} node={node} depth={0} parentId={null} index={index} />
            ))
          )}

          <div
            onDragOver={(e) => {
              if (!draggingId || draggingKind !== "topic") return;
              e.preventDefault();
              setRootDropActive(true);
            }}
            onDragLeave={() => setRootDropActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setRootDropActive(false);
              if (draggingKind !== "topic") return;
              void dnd.requestMove(null, tree.length);
            }}
            className={`mt-1 rounded-md border border-dashed py-2 text-center font-ui text-xs transition-colors duration-base ${
              rootDropActive ? "border-accent bg-accent/5 text-accent" : "border-border text-secondary"
            }`}
          >
            {draggingKind === "topic" ? "Drop here to make a root topic" : " "}
          </div>
        </div>

        {addingRoot && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <input
              autoFocus
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRoot()}
              placeholder="Topic name"
              className="rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            />
            {rootError && <p className="font-ui text-xs text-warning">{rootError}</p>}
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleAddRoot}>
                Add
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setAddingRoot(false);
                  setRootName("");
                  setRootError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Plain section-break label between root topics (e.g. "MSK"
            above the extremity topics) — root-level only, deliberately
            not a grouping node a reader could expand/collapse; see
            TopicKind's comment in topics.ts. */}
        {addingSeparator && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <input
              autoFocus
              value={separatorName}
              onChange={(e) => setSeparatorName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSeparator()}
              placeholder="Separator label (e.g. MSK)"
              className="rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            />
            {separatorError && <p className="font-ui text-xs text-warning">{separatorError}</p>}
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleAddSeparator}>
                Add
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setAddingSeparator(false);
                  setSeparatorName("");
                  setSeparatorError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!addingRoot && !addingSeparator && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setAddingRoot(true)} className="inline-flex w-fit items-center gap-1.5">
              <Plus className="size-4" aria-hidden="true" />
              Add root topic
            </Button>
            <Button
              variant="secondary"
              onClick={() => setAddingSeparator(true)}
              className="inline-flex w-fit items-center gap-1.5"
            >
              <Minus className="size-4" aria-hidden="true" />
              Add separator
            </Button>
          </div>
        )}
      </div>
    </TopicDndContext.Provider>
  );
}
