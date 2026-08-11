"use client";

import { useRef, useState, type DragEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { ChevronRight, GripVertical, Plus, FilePlus2, Trash2, Palette } from "lucide-react";
import type { TopicNode } from "@/lib/topics";
import { topicIcons } from "@/components/ui/topicIcons";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import {
  renameTopicAction,
  updateTopicIconAction,
  updateTopicColorAction,
  deleteTopicAction,
  createTopicAction,
} from "@/lib/actions/topics";
import { createDiseaseAction } from "@/lib/actions/diseases";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { IconSwatchPicker } from "@/components/ui/IconSwatchPicker";
import { useTopicDnd } from "./TopicManager";
import type { TopicDisease } from "@/lib/topics";

type DropZone = "before" | "after" | "into" | null;

interface TopicTreeEditorProps {
  node: TopicNode;
  depth: number;
  // This node's own parent id and its index among its rendered
  // siblings — not read from `node` itself (which doesn't carry
  // either), passed down by whichever list rendered this row, so a
  // sibling row that gets dropped "before"/"after" this one knows
  // exactly where to insert.
  parentId: string | null;
  index: number;
}

// One row per topic, recursive. Shows exactly what's stored (own icon
// or an empty placeholder dot) rather than the live sidebar's
// generic-book-icon fallback — an admin editing appearance needs to
// see the real saved state, not a rendering convenience.
export function TopicTreeEditor({ node, depth, parentId, index }: TopicTreeEditorProps) {
  const router = useRouter();
  const { draggingId, draggingKind, startDrag, endDrag, requestMove } = useTopicDnd();
  const [open, setOpen] = useState(depth === 0);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(node.name);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [childError, setChildError] = useState<string | null>(null);
  const [addingDisease, setAddingDisease] = useState(false);
  const [diseaseName, setDiseaseName] = useState("");
  const [diseaseError, setDiseaseError] = useState<string | null>(null);
  const [creatingDisease, setCreatingDisease] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<DropZone>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const hasContent = node.children.length > 0 || node.diseases.length > 0;
  const Icon = node.icon ? topicIcons[node.icon] : null;
  const isBeingDragged = draggingKind === "topic" && draggingId === node.id;
  const isSeparator = node.kind === "separator";
  const indent = 8 + depth * 16;

  async function handleRename() {
    const trimmed = name.trim();
    setRenaming(false);
    if (!trimmed || trimmed === node.name) {
      setName(node.name);
      return;
    }
    const result = await renameTopicAction(node.id, trimmed);
    if (!result.ok) {
      setRowError(result.error);
      setName(node.name);
    }
  }

  async function handleAddChild() {
    const trimmed = childName.trim();
    if (!trimmed) return;
    const result = await createTopicAction(trimmed, node.id);
    if (!result.ok) {
      setChildError(result.error);
      return;
    }
    setChildName("");
    setAddingChild(false);
    setChildError(null);
    setOpen(true);
  }

  async function handleDelete() {
    const result = await deleteTopicAction(node.id);
    if (!result.ok) setRowError(result.error);
  }

  // Creates the bare disease row, then routes straight into its new
  // (empty) page — Edit mode is already on for an admin there, so the
  // very next thing they see is the same BlockPicker "+" flow used to
  // author every other disease, not a second bespoke form.
  async function handleAddDisease() {
    const trimmed = diseaseName.trim();
    if (!trimmed) return;
    setCreatingDisease(true);
    const result = await createDiseaseAction(trimmed, node.id);
    setCreatingDisease(false);
    if (!result.ok) {
      setDiseaseError(result.error);
      return;
    }
    setDiseaseName("");
    setAddingDisease(false);
    setDiseaseError(null);
    router.push(`/conditions/${result.slug}`);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (!draggingId || draggingKind !== "topic" || draggingId === node.id) return;
    e.preventDefault();
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    // A separator never holds children — no "into" third, just a
    // straight before/after split across the whole row.
    if (isSeparator) {
      setDropZone(y < rect.height / 2 ? "before" : "after");
      return;
    }
    const third = rect.height / 3;
    setDropZone(y < third ? "before" : y > third * 2 ? "after" : "into");
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const zone = dropZone;
    setDropZone(null);
    if (!zone || !draggingId || draggingKind !== "topic" || draggingId === node.id) return;
    if (zone === "before") await requestMove(parentId, index);
    else if (zone === "after") await requestMove(parentId, index + 1);
    else await requestMove(node.id, node.children.length);
  }

  return (
    <div>
      <div
        ref={rowRef}
        onDragOver={handleDragOver}
        onDragLeave={() => setDropZone(null)}
        onDrop={handleDrop}
        className={`group flex items-center gap-1.5 rounded-md py-1.5 pr-2 border-t-2 border-b-2 transition-colors duration-base ${
          isBeingDragged ? "opacity-40" : ""
        } ${dropZone === "into" ? "bg-accent/10 ring-1 ring-inset ring-accent" : ""} ${
          dropZone === "before" ? "border-t-accent" : "border-t-transparent"
        } ${dropZone === "after" ? "border-b-accent" : "border-b-transparent"}`}
        style={{ paddingLeft: `${indent}px` }}
      >
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", node.id);
            startDrag(node.id, "topic");
          }}
          onDragEnd={endDrag}
          className="flex size-4 shrink-0 cursor-grab items-center justify-center text-secondary/50 active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" aria-hidden="true" />
        </span>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={!hasContent}
          aria-label={open ? "Collapse" : "Expand"}
          className="flex size-5 shrink-0 items-center justify-center text-secondary disabled:opacity-0"
        >
          <ChevronRight
            className={`size-3.5 transition-transform duration-base ${open ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
        </button>

        {/* Icon/color are meaningless for a plain label — a separator
            has nothing for either to decorate — so neither picker
            renders for one, rather than showing controls that would
            set fields IndexSidebar.tsx never reads for this kind. */}
        {!isSeparator && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIconPickerOpen((v) => !v)}
              title="Change icon"
              className={`flex size-6 items-center justify-center rounded ${
                node.color ? CARD_COLOR_CHIP[node.color] : "bg-border/40 text-secondary"
              }`}
            >
              {Icon ? (
                <Icon className="size-3.5" aria-hidden="true" />
              ) : (
                <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              )}
            </button>
            {iconPickerOpen && (
              <IconSwatchPicker
                onPick={async (icon) => {
                  setIconPickerOpen(false);
                  const result = await updateTopicIconAction(node.id, icon);
                  if (!result.ok) setRowError(result.error);
                }}
              />
            )}
          </div>
        )}

        {!isSeparator && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setColorPickerOpen((v) => !v)}
              title="Change color"
              className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
            >
              <Palette className="size-3.5" aria-hidden="true" />
            </button>
            {colorPickerOpen && (
              <ColorSwatchPicker
                onPick={async (color) => {
                  setColorPickerOpen(false);
                  const result = await updateTopicColorAction(node.id, color);
                  if (!result.ok) setRowError(result.error);
                }}
              />
            )}
          </div>
        )}

        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setName(node.name);
                setRenaming(false);
              }
            }}
            className="min-w-0 flex-1 rounded border border-accent bg-surface px-1.5 py-0.5 font-ui text-sm text-primary outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className={
              isSeparator
                ? "min-w-0 flex-1 truncate text-left font-ui text-xs font-semibold tracking-wide text-secondary uppercase hover:underline"
                : "min-w-0 flex-1 truncate text-left font-ui text-sm text-primary hover:underline"
            }
          >
            {node.name}
          </button>
        )}

        {node.diseases.length > 0 && (
          <span className="shrink-0 rounded-full bg-border/40 px-2 py-0.5 font-ui text-xs text-secondary">
            {node.diseases.length} condition{node.diseases.length === 1 ? "" : "s"}
          </span>
        )}

        {/* A separator never holds conditions or subtopics — see
            editorial-blocks.ts-style reasoning in topics.ts's TopicKind
            comment — so neither insert affordance applies to one. */}
        {!isSeparator && (
          <button
            type="button"
            onClick={() => setAddingDisease((v) => !v)}
            title="Add condition"
            className="flex size-6 shrink-0 items-center justify-center rounded text-secondary opacity-0 transition-opacity duration-base group-hover:opacity-100 hover:bg-border/40 hover:text-primary"
          >
            <FilePlus2 className="size-3.5" aria-hidden="true" />
          </button>
        )}

        {!isSeparator && (
          <button
            type="button"
            onClick={() => setAddingChild((v) => !v)}
            title="Add subtopic"
            className="flex size-6 shrink-0 items-center justify-center rounded text-secondary opacity-0 transition-opacity duration-base group-hover:opacity-100 hover:bg-border/40 hover:text-primary"
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={hasContent}
          title={hasContent ? "Move or remove its subtopics/conditions first" : "Remove topic"}
          className={`flex size-6 shrink-0 items-center justify-center rounded transition-opacity duration-base ${
            hasContent
              ? "cursor-not-allowed text-secondary/30"
              : "text-secondary opacity-0 group-hover:opacity-100 hover:bg-warning/10 hover:text-warning"
          }`}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {rowError && (
        <p className="font-ui text-xs text-warning" style={{ paddingLeft: `${indent + 30}px` }}>
          {rowError}
        </p>
      )}

      {addingDisease && (
        <div className="mt-1 mb-1 flex items-center gap-2" style={{ paddingLeft: `${indent + 16}px` }}>
          <input
            autoFocus
            value={diseaseName}
            onChange={(e) => setDiseaseName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddDisease()}
            placeholder="Condition name"
            disabled={creatingDisease}
            className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 font-ui text-xs text-primary outline-none focus:border-accent disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleAddDisease}
            disabled={creatingDisease}
            className="shrink-0 font-ui text-xs font-medium text-accent disabled:opacity-60"
          >
            {creatingDisease ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAddingDisease(false);
              setDiseaseName("");
              setDiseaseError(null);
            }}
            disabled={creatingDisease}
            className="shrink-0 font-ui text-xs text-secondary disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      )}
      {diseaseError && (
        <p className="font-ui text-xs text-warning" style={{ paddingLeft: `${indent + 16}px` }}>
          {diseaseError}
        </p>
      )}

      {addingChild && (
        <div className="mt-1 mb-1 flex items-center gap-2" style={{ paddingLeft: `${indent + 16}px` }}>
          <input
            autoFocus
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddChild()}
            placeholder="Subtopic name"
            className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 font-ui text-xs text-primary outline-none focus:border-accent"
          />
          <button type="button" onClick={handleAddChild} className="shrink-0 font-ui text-xs font-medium text-accent">
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setAddingChild(false);
              setChildName("");
              setChildError(null);
            }}
            className="shrink-0 font-ui text-xs text-secondary"
          >
            Cancel
          </button>
        </div>
      )}
      {childError && (
        <p className="font-ui text-xs text-warning" style={{ paddingLeft: `${indent + 16}px` }}>
          {childError}
        </p>
      )}

      {open && hasContent && (
        <div className="flex flex-col">
          {node.children.map((child, childIndex) => (
            <TopicTreeEditor key={child.id} node={child} depth={depth + 1} parentId={node.id} index={childIndex} />
          ))}
          {node.diseases.map((disease, diseaseIndex) => (
            <DiseaseRow
              key={disease.id}
              disease={disease}
              topicId={node.id}
              index={diseaseIndex}
              indent={indent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DiseaseRowProps {
  disease: TopicDisease;
  // This disease's own topic id and its index among its rendered
  // sibling diseases — mirrors TopicTreeEditorProps's parentId/index
  // pair — so a sibling dropped "before"/"after" this one knows
  // exactly where to insert within moveDiseaseAction's sibling list.
  topicId: string;
  index: number;
  indent: number;
}

// A leaf row for one condition under its topic — draggable like a
// TopicTreeEditor row, but simpler: no "into" zone (a condition never
// holds children), no re-parenting (see moveDiseaseAction's comment),
// just before/after reordering against its sibling conditions.
function DiseaseRow({ disease, topicId, index, indent }: DiseaseRowProps) {
  const { draggingId, draggingKind, startDrag, endDrag, requestDiseaseMove } = useTopicDnd();
  const [dropZone, setDropZone] = useState<"before" | "after" | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const isBeingDragged = draggingKind === "disease" && draggingId === disease.id;

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (!draggingId || draggingKind !== "disease" || draggingId === disease.id) return;
    e.preventDefault();
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    setDropZone(y < rect.height / 2 ? "before" : "after");
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const zone = dropZone;
    setDropZone(null);
    if (!zone || !draggingId || draggingKind !== "disease" || draggingId === disease.id) return;
    await requestDiseaseMove(topicId, zone === "before" ? index : index + 1);
  }

  return (
    <div
      ref={rowRef}
      onDragOver={handleDragOver}
      onDragLeave={() => setDropZone(null)}
      onDrop={handleDrop}
      className={`group flex items-center gap-1.5 border-t-2 border-b-2 py-1 transition-colors duration-base ${
        isBeingDragged ? "opacity-40" : ""
      } ${dropZone === "before" ? "border-t-accent" : "border-t-transparent"} ${
        dropZone === "after" ? "border-b-accent" : "border-b-transparent"
      }`}
      style={{ paddingLeft: `${indent + 22}px` }}
    >
      <span
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", disease.id);
          startDrag(disease.id, "disease");
        }}
        onDragEnd={endDrag}
        className="flex size-3.5 shrink-0 cursor-grab items-center justify-center text-secondary/40 opacity-0 transition-opacity duration-base group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="size-3" aria-hidden="true" />
      </span>
      <Link
        href={`/conditions/${disease.slug}`}
        className="flex min-w-0 flex-1 items-center gap-1.5 font-ui text-xs text-secondary hover:text-accent hover:underline"
      >
        <span className="size-1 shrink-0 rounded-full bg-current" aria-hidden="true" />
        <span className="truncate">{disease.canonicalName}</span>
      </Link>
    </div>
  );
}
