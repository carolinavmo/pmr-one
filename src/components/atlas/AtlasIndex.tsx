"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Plus, Pencil, Trash2, FileText, Folder, GripVertical, ChevronDown, ChevronRight, Check } from "lucide-react";
import type { AtlasSection, AtlasPage } from "@/lib/atlas";
import type { CardColor } from "@/lib/editorial-blocks";
import { CARD_COLOR_TINT, CARD_COLOR_TEXT } from "@/lib/card-colors";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Drop-on-a-row reordering: dropping the dragged id onto a target row
// inserts it immediately before that row. Simpler than tracking a
// precise before/after boundary per row (BlockControls.tsx's approach,
// needed there for its row/stack-into-columns drop zones) — a flat
// list reorder doesn't need that precision.
function reorderIds(ids: string[], draggedId: string, dropTargetId: string): string[] {
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
// problem (same primitive ResizableRow.tsx already uses for its
// column-resize handle): a plain pointerdown/pointermove/pointerup
// sequence tracked on `window`, with manual rect hit-testing against
// each row's own ref to figure out which row the pointer is currently
// over. `ids`/`onReorder` are read fresh on every pointerdown via the
// arguments closed over by `startDrag`, so a stale prop from an
// earlier render is never in play.
function useReorderDrag(ids: string[], onReorder: (orderedIds: string[]) => void) {
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
      // outside React's own state (same reasoning as ResizableRow's
      // `snapped` local).
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

// Shared by both drag scopes below — a ring (not a border/outline that
// would shift layout) around whichever row the pointer is currently
// over, plus dimming the row actually being dragged.
function dragRowClass(id: string, draggedId: string | null, overId: string | null): string | undefined {
  const classes: string[] = [];
  if (draggedId === id) classes.push("opacity-40");
  if (overId === id && draggedId !== id) classes.push("rounded-md ring-2 ring-accent ring-inset");
  return classes.length ? classes.join(" ") : undefined;
}

interface AtlasIndexProps {
  sections: AtlasSection[];
  pages: AtlasPage[];
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  onCreateSection: (name: string) => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onUpdateSectionColor: (sectionId: string, color: CardColor) => void;
  onDeleteSection: (sectionId: string) => void;
  onReorderSections: (orderedIds: string[]) => void;
  onCreatePage: (sectionId: string) => void;
  onReorderPages: (sectionId: string, orderedIds: string[]) => void;
}

export function AtlasIndex({
  sections,
  pages,
  selectedPageId,
  onSelectPage,
  onCreateSection,
  onRenameSection,
  onUpdateSectionColor,
  onDeleteSection,
  onReorderSections,
  onCreatePage,
  onReorderPages,
}: AtlasIndexProps) {
  const t = useTranslations("myAtlas");
  const [query, setQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const sectionDrag = useReorderDrag(
    sections.map((s) => s.id),
    onReorderSections
  );

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => (p.title || t("untitledPage")).toLowerCase().includes(q));
  }, [pages, query, t]);

  return (
    <aside className="flex w-full flex-col gap-2 bg-surface-sunken p-3 lg:w-80 lg:shrink-0">
      <p className="px-1 font-ui text-[11px] font-semibold tracking-wide text-secondary uppercase">
        {t("indexLabel")}
      </p>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-full border border-border bg-surface py-1.5 pr-3 pl-9 font-ui text-xs text-primary outline-none focus:border-accent"
          />
        </div>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          aria-label={editMode ? t("doneEditingIndex") : t("editIndex")}
          title={editMode ? t("doneEditingIndex") : t("editIndex")}
          className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors duration-base ${
            editMode ? "bg-accent text-white" : "text-secondary hover:bg-border/40 hover:text-primary"
          }`}
        >
          {editMode ? <Check className="size-4" aria-hidden="true" /> : <Pencil className="size-4" aria-hidden="true" />}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {sections.map((section) => (
          <div
            key={section.id}
            ref={sectionDrag.registerRow(section.id)}
            className={dragRowClass(section.id, sectionDrag.draggedId, sectionDrag.overId)}
          >
            <AtlasSectionGroup
              section={section}
              pages={filteredPages.filter((p) => p.sectionId === section.id)}
              selectedPageId={selectedPageId}
              editMode={editMode}
              onSelectPage={onSelectPage}
              onRenameSection={onRenameSection}
              onUpdateSectionColor={onUpdateSectionColor}
              onDeleteSection={onDeleteSection}
              onCreatePage={onCreatePage}
              onReorderPages={onReorderPages}
              onDragHandleStart={sectionDrag.startDrag(section.id)}
            />
          </div>
        ))}
      </div>

      {editMode && <NewSectionButton onCreateSection={onCreateSection} />}
    </aside>
  );
}

function AtlasSectionGroup({
  section,
  pages,
  selectedPageId,
  editMode,
  onSelectPage,
  onRenameSection,
  onUpdateSectionColor,
  onDeleteSection,
  onCreatePage,
  onReorderPages,
  onDragHandleStart,
}: {
  section: AtlasSection;
  pages: AtlasPage[];
  selectedPageId: string | null;
  editMode: boolean;
  onSelectPage: (pageId: string) => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onUpdateSectionColor: (sectionId: string, color: CardColor) => void;
  onDeleteSection: (sectionId: string) => void;
  onCreatePage: (sectionId: string) => void;
  onReorderPages: (sectionId: string, orderedIds: string[]) => void;
  onDragHandleStart: (e: React.PointerEvent) => void;
}) {
  const t = useTranslations("myAtlas");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(section.name);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const pageDrag = useReorderDrag(
    pages.map((p) => p.id),
    (orderedIds) => onReorderPages(section.id, orderedIds)
  );

  function commitRename() {
    setRenaming(false);
    if (name.trim() && name.trim() !== section.name) {
      onRenameSection(section.id, name.trim());
    } else {
      setName(section.name);
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="group flex items-center gap-1.5 px-1">
        {editMode && (
          <button
            type="button"
            aria-label={t("dragToReorder")}
            onPointerDown={onDragHandleStart}
            className="flex size-6 shrink-0 touch-none cursor-grab items-center justify-center text-secondary hover:bg-border/40 active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" aria-hidden="true" />
          </button>
        )}
        {editMode ? (
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label={t("sectionColor")}
              title={t("sectionColor")}
              onClick={() => setColorPickerOpen((open) => !open)}
              className={`flex items-center justify-center ${CARD_COLOR_TEXT[section.color]}`}
            >
              <Folder className="size-4 fill-current" aria-hidden="true" />
            </button>
            {colorPickerOpen && (
              <ColorSwatchPicker
                className="absolute top-6 left-0 z-10 w-44"
                onPick={(color) => {
                  onUpdateSectionColor(section.id, color);
                  setColorPickerOpen(false);
                }}
              />
            )}
          </div>
        ) : (
          <span className={`flex shrink-0 items-center justify-center ${CARD_COLOR_TEXT[section.color]}`}>
            <Folder className="size-4 fill-current" aria-hidden="true" />
          </span>
        )}
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
            }}
            className="min-w-0 flex-1 rounded border border-accent bg-surface px-1.5 py-0.5 font-ui text-xs font-semibold text-primary outline-none"
          />
        ) : (
          <span
            onClick={() => setCollapsed((c) => !c)}
            className="min-w-0 flex-1 cursor-pointer truncate font-ui text-[11px] font-semibold tracking-wide text-secondary uppercase"
          >
            {section.name}
          </span>
        )}
        {editMode && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => setRenaming(true)}
              aria-label={t("renameSection")}
              title={t("renameSection")}
              className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label={t("deleteSection")}
              title={t("deleteSection")}
              className="flex size-6 items-center justify-center rounded text-secondary hover:bg-warning/10 hover:text-warning"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => onCreatePage(section.id)}
          aria-label={t("newPage")}
          title={t("newPage")}
          className="flex size-6 shrink-0 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-accent"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={collapsed ? t("expandSection") : t("collapseSection")}
          title={collapsed ? t("expandSection") : t("collapseSection")}
          onClick={() => setCollapsed((c) => !c)}
          className="flex size-4 shrink-0 items-center justify-center text-secondary hover:text-primary"
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {collapsed ? null : pages.length === 0 ? (
        <p className="px-2 py-0.5 pl-8 font-ui text-xs text-secondary italic">{t("emptySectionPrompt")}</p>
      ) : (
        <ul className="flex flex-col pl-8">
          {pages.map((page) => (
            <li
              key={page.id}
              ref={pageDrag.registerRow(page.id)}
              className={dragRowClass(page.id, pageDrag.draggedId, pageDrag.overId)}
            >
              <div
                className={`group/page flex w-full items-center gap-1 rounded-md px-1.5 py-1 transition-colors duration-base ${
                  selectedPageId === page.id
                    ? `${CARD_COLOR_TINT[section.color]} ${CARD_COLOR_TEXT[section.color]}`
                    : "text-secondary hover:bg-border/40 hover:text-primary"
                }`}
              >
                {editMode && (
                  <button
                    type="button"
                    aria-label={t("dragToReorder")}
                    onPointerDown={pageDrag.startDrag(page.id)}
                    className="flex size-6 shrink-0 touch-none cursor-grab items-center justify-center hover:bg-border/40 active:cursor-grabbing"
                  >
                    <GripVertical className="size-3.5" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectPage(page.id)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate font-ui text-xs">{page.title || t("untitledPage")}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title={t("confirmDeleteSection")}
          confirmLabel={t("deleteSection")}
          cancelLabel={t("cancel")}
          onConfirm={() => {
            setConfirmingDelete(false);
            onDeleteSection(section.id);
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

function NewSectionButton({ onCreateSection }: { onCreateSection: (name: string) => void }) {
  const t = useTranslations("myAtlas");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2 font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover"
      >
        <Plus className="size-4" aria-hidden="true" />
        {t("newSection")}
      </button>
    );
  }

  function commit() {
    if (name.trim()) onCreateSection(name.trim());
    setName("");
    setAdding(false);
  }

  return (
    <input
      autoFocus
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setName("");
          setAdding(false);
        }
      }}
      placeholder={t("newSection")}
      className="w-full rounded-xl border border-accent bg-surface px-3 py-2 font-ui text-sm text-primary outline-none"
    />
  );
}
