"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FileText,
  GripVertical,
  Check,
  Star,
} from "lucide-react";
import type { AtlasSection, AtlasPage } from "@/lib/atlas";
import type { CardColor } from "@/lib/editorial-blocks";
import { CARD_COLOR_TINT, CARD_COLOR_BORDER, CARD_COLOR_SWATCH } from "@/lib/card-colors";
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

// HANDBOOK-SPEC.md's rail rows: "a star when pinned, otherwise a
// relative time" — a compact abbreviation ("2 d", "1 w", "3 w", "1 mo"),
// distinct from AtlasEditor's own full-phrase "Edited 3 days ago" (the
// 268px rail has no room for that). Not next-intl's relativeTime(),
// which returns full phrases in every locale it supports — this is a
// deliberately terse, locale-agnostic abbreviation for a narrow column.
function compactRelativeTime(iso: string, now: Date): string {
  const ms = now.getTime() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks} w`;
  const months = Math.floor(days / 30);
  if (days < 365) return `${months} mo`;
  return `${Math.floor(days / 365)} y`;
}

type FilterKey = "all" | "pinned" | "recent";
// "Recent" — no exact threshold in the spec; 14 days is this
// implementation's own reasonable default for "still fresh in mind",
// not a value the design doc states.
const RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

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
  onCreatePage: (sectionId: string, templatePageId?: string) => void;
  onReorderPages: (sectionId: string, orderedIds: string[]) => void;
  onTogglePinned: (pageId: string) => void;
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
  onTogglePinned,
}: AtlasIndexProps) {
  const t = useTranslations("myAtlas");
  const format = useFormatter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [editMode, setEditMode] = useState(false);
  const sectionDrag = useReorderDrag(
    sections.map((s) => s.id),
    onReorderSections
  );

  // Hydration-safe "now" (same reasoning as AtlasEditor.tsx's own —
  // computing it inline would give SSR and the client's first paint two
  // different instants, throwing a hydration mismatch on every relative
  // time and the footer's "last sync").
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate hydration-safe pattern, see AtlasEditor.tsx
    setNow(new Date());
  }, []);

  const visiblePages = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = pages;
    if (q) list = list.filter((p) => (p.title || t("untitledPage")).toLowerCase().includes(q));
    if (filter === "pinned") list = list.filter((p) => p.isPinned);
    if (filter === "recent" && now) {
      list = list.filter((p) => now.getTime() - new Date(p.updatedAt).getTime() < RECENT_WINDOW_MS);
    }
    return list;
  }, [pages, query, filter, now, t]);

  const isFiltered = query.trim().length > 0 || filter !== "all";
  const totalPages = pages.length;
  // "Start from a template" (Pass 4) — the soft convention every
  // default-seeded workspace already uses: pages currently sitting in
  // whichever section is named exactly like the seeded Templates
  // folder. A member who renames that folder just loses the popover
  // (falls back to a plain blank page) rather than anything breaking —
  // matches duplicatePageAsTemplate's own same-name-match-or-fallback
  // shape in atlas.ts.
  const templatesSection = sections.find((s) => s.name === t("defaultSectionTemplates"));
  const templatePages = templatesSection ? pages.filter((p) => p.sectionId === templatesSection.id) : [];
  const [newPagePickerOpen, setNewPagePickerOpen] = useState(false);
  const lastSyncAt = useMemo(
    () => pages.reduce<Date | null>((latest, p) => {
      const d = new Date(p.updatedAt);
      return !latest || d > latest ? d : latest;
    }, null),
    [pages]
  );

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 border-border bg-surface-sunken p-3 lg:w-[268px] lg:border-r">
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (templatePages.length > 0) setNewPagePickerOpen((v) => !v);
            else onCreatePage(sections[0]?.id);
          }}
          disabled={!sections[0]}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-navy px-3 py-2.5 font-ui text-[13.5px] font-extrabold text-white transition-colors duration-base hover:bg-navy/90 disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("newPage")}
        </button>
        {newPagePickerOpen && (
          <div className="absolute top-full left-0 z-20 mt-1 flex w-full flex-col gap-0.5 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
            <p className="px-2 pt-1 pb-1.5 font-ui text-[10px] font-black tracking-wide text-secondary uppercase">
              {t("startFromTemplate")}
            </p>
            <button
              type="button"
              onClick={() => {
                onCreatePage(sections[0]?.id);
                setNewPagePickerOpen(false);
              }}
              className="rounded-lg px-2.5 py-1.5 text-left font-ui text-xs font-bold text-primary hover:bg-border/30"
            >
              {t("blankPage")}
            </button>
            {templatePages.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  onCreatePage(sections[0]?.id, tpl.id);
                  setNewPagePickerOpen(false);
                }}
                className="truncate rounded-lg px-2.5 py-1.5 text-left font-ui text-xs font-bold text-primary hover:bg-border/30"
              >
                {tpl.title || t("untitledPage")}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-secondary"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-[9px] border border-border bg-surface py-1.5 pr-3 pl-8 font-ui text-xs text-primary outline-none focus:border-accent"
          />
        </div>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          aria-label={editMode ? t("doneEditingIndex") : t("editIndex")}
          title={editMode ? t("doneEditingIndex") : t("editIndex")}
          className={`flex size-8 shrink-0 items-center justify-center rounded-[9px] transition-colors duration-base ${
            editMode ? "bg-accent text-white" : "text-secondary hover:bg-border/40 hover:text-primary"
          }`}
        >
          {editMode ? <Check className="size-4" aria-hidden="true" /> : <Pencil className="size-4" aria-hidden="true" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip label={t("filterAll")} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterChip
          label={`★ ${t("filterPinned")}`}
          active={filter === "pinned"}
          onClick={() => setFilter("pinned")}
        />
        <FilterChip label={t("filterRecent")} active={filter === "recent"} onClick={() => setFilter("recent")} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {sections.map((section) => {
          const sectionPages = visiblePages.filter((p) => p.sectionId === section.id);
          if (isFiltered && sectionPages.length === 0) return null;
          return (
            <div
              key={section.id}
              ref={sectionDrag.registerRow(section.id)}
              className={dragRowClass(section.id, sectionDrag.draggedId, sectionDrag.overId)}
            >
              <AtlasSectionGroup
                section={section}
                pages={sectionPages}
                totalCount={pages.filter((p) => p.sectionId === section.id).length}
                selectedPageId={selectedPageId}
                editMode={editMode}
                now={now}
                onSelectPage={onSelectPage}
                onRenameSection={onRenameSection}
                onUpdateSectionColor={onUpdateSectionColor}
                onDeleteSection={onDeleteSection}
                onCreatePage={onCreatePage}
                onReorderPages={onReorderPages}
                onTogglePinned={onTogglePinned}
                onDragHandleStart={sectionDrag.startDrag(section.id)}
              />
            </div>
          );
        })}
        {editMode && <NewSectionButton onCreateSection={onCreateSection} />}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-border pt-2.5 font-ui text-[11.5px] font-semibold text-secondary">
        <span>{t("totalPages", { count: totalPages })}</span>
        <span aria-hidden="true">·</span>
        <span>{lastSyncAt && now ? t("lastSync", { time: format.relativeTime(lastSyncAt, now) }) : ""}</span>
      </div>
    </aside>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 font-ui text-[11px] font-extrabold transition-colors duration-base ${
        active ? "border-acc-bd bg-acc-bg text-acc-ink" : "border-border bg-surface text-secondary hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function AtlasSectionGroup({
  section,
  pages,
  totalCount,
  selectedPageId,
  editMode,
  now,
  onSelectPage,
  onRenameSection,
  onUpdateSectionColor,
  onDeleteSection,
  onCreatePage,
  onReorderPages,
  onTogglePinned,
  onDragHandleStart,
}: {
  section: AtlasSection;
  pages: AtlasPage[];
  totalCount: number;
  selectedPageId: string | null;
  editMode: boolean;
  now: Date | null;
  onSelectPage: (pageId: string) => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onUpdateSectionColor: (sectionId: string, color: CardColor) => void;
  onDeleteSection: (sectionId: string) => void;
  onCreatePage: (sectionId: string) => void;
  onReorderPages: (sectionId: string, orderedIds: string[]) => void;
  onTogglePinned: (pageId: string) => void;
  onDragHandleStart: (e: React.PointerEvent) => void;
}) {
  const t = useTranslations("myAtlas");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(section.name);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  // No chevron in the default (non-edit) look, matching the spec's
  // mockup exactly — collapsing still works, just triggered by
  // clicking the folder name itself rather than a dedicated icon, so
  // the capability isn't lost, just not visually called out.
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
      <div className="group flex items-center gap-2 px-1.5 py-1">
        {editMode && (
          <button
            type="button"
            aria-label={t("dragToReorder")}
            onPointerDown={onDragHandleStart}
            className="flex size-5 shrink-0 touch-none cursor-grab items-center justify-center text-secondary hover:bg-border/40 active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" aria-hidden="true" />
          </button>
        )}
        {/* The spec's "coloured tile" — a small solid-tinted square per
            folder (pages teal, protocols purple, templates amber by
            default), not the generic Folder icon the old rail used.
            Doubles as the recolor trigger in edit mode, same as before. */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => editMode && setColorPickerOpen((open) => !open)}
            aria-label={t("sectionColor")}
            title={editMode ? t("sectionColor") : undefined}
            className={`size-3.5 rounded-[4px] border ${CARD_COLOR_TINT[section.color]} ${CARD_COLOR_BORDER[section.color]}`}
          />
          {editMode && colorPickerOpen && (
            <ColorSwatchPicker
              className="absolute top-6 left-0 z-10 w-44"
              onPick={(color) => {
                onUpdateSectionColor(section.id, color);
                setColorPickerOpen(false);
              }}
            />
          )}
        </div>
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
            }}
            className="min-w-0 flex-1 rounded border border-accent bg-surface px-1.5 py-0.5 font-ui text-[10.5px] font-black tracking-wide text-primary outline-none"
          />
        ) : (
          <span
            onClick={() => setCollapsed((c) => !c)}
            className="min-w-0 flex-1 cursor-pointer truncate font-ui text-[10.5px] font-black tracking-[1.1px] text-secondary uppercase"
          >
            {section.name}
          </span>
        )}
        <span className="shrink-0 font-ui text-[10.5px] font-extrabold text-[#B4BDC8]">{totalCount}</span>
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
      </div>

      {collapsed ? null : pages.length === 0 ? (
        <p className="px-2 py-0.5 pl-8 font-ui text-xs text-secondary italic">{t("emptySectionPrompt")}</p>
      ) : (
        <ul className="flex flex-col pl-6">
          {pages.map((page) => (
            <li
              key={page.id}
              ref={pageDrag.registerRow(page.id)}
              className={dragRowClass(page.id, pageDrag.draggedId, pageDrag.overId)}
            >
              <div
                className={`group/page flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 font-ui text-[12.5px] font-semibold transition-colors duration-base ${
                  selectedPageId === page.id
                    ? "bg-surface text-navy shadow-[0_1px_3px_rgba(20,40,74,0.09)]"
                    : "text-primary hover:bg-border/40"
                }`}
              >
                {editMode && (
                  <button
                    type="button"
                    aria-label={t("dragToReorder")}
                    onPointerDown={pageDrag.startDrag(page.id)}
                    className="flex size-5 shrink-0 touch-none cursor-grab items-center justify-center text-secondary hover:bg-border/40 active:cursor-grabbing"
                  >
                    <GripVertical className="size-3.5" aria-hidden="true" />
                  </button>
                )}
                <span
                  className={`size-1.5 shrink-0 rounded-[2px] ${
                    selectedPageId === page.id ? CARD_COLOR_SWATCH[section.color] : "bg-[#C6CED8]"
                  }`}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => onSelectPage(page.id)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  <FileText className="size-3.5 shrink-0 text-secondary" aria-hidden="true" />
                  <span className="truncate">{page.title || t("untitledPage")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePinned(page.id)}
                  aria-label={page.isPinned ? t("unpinPage") : t("pinPage")}
                  title={page.isPinned ? t("unpinPage") : t("pinPage")}
                  className={`flex size-5 shrink-0 items-center justify-center ${
                    page.isPinned ? "text-insight opacity-100" : "text-[#C6CED8] opacity-0 group-hover/page:opacity-100 hover:text-insight"
                  }`}
                >
                  <Star className="size-3" fill={page.isPinned ? "currentColor" : "none"} aria-hidden="true" />
                </button>
                {!page.isPinned && now && (
                  <span className="shrink-0 font-ui text-[10px] font-bold text-[#B4BDC8] group-hover/page:hidden">
                    {compactRelativeTime(page.updatedAt, now)}
                  </span>
                )}
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
