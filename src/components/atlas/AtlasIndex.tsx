"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Plus, Pencil, Trash2, FileText, Folder, GripVertical, ChevronDown, ChevronRight, Check } from "lucide-react";
import type { AtlasSection, AtlasPage } from "@/lib/atlas";
import type { CardColor } from "@/lib/editorial-blocks";
import { CARD_COLOR_TINT, CARD_COLOR_TEXT } from "@/lib/card-colors";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";

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
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => (p.title || t("untitledPage")).toLowerCase().includes(q));
  }, [pages, query, t]);

  return (
    <aside className="flex w-full flex-col gap-2 border-b border-border bg-surface-sunken p-3 lg:w-80 lg:shrink-0 lg:border-r lg:border-b-0">
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
            draggable={false}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedSectionId) {
                onReorderSections(reorderIds(sections.map((s) => s.id), draggedSectionId, section.id));
              }
              setDraggedSectionId(null);
            }}
            className={draggedSectionId && draggedSectionId !== section.id ? "opacity-60" : undefined}
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
              onDragHandleStart={() => setDraggedSectionId(section.id)}
              onDragHandleEnd={() => setDraggedSectionId(null)}
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
  onDragHandleEnd,
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
  onDragHandleStart: () => void;
  onDragHandleEnd: () => void;
}) {
  const t = useTranslations("myAtlas");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(section.name);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

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
            draggable
            onDragStart={onDragHandleStart}
            onDragEnd={onDragHandleEnd}
            className="flex size-4 shrink-0 cursor-grab items-center justify-center text-secondary active:cursor-grabbing"
          >
            <GripVertical className="size-3" aria-hidden="true" />
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
              onClick={() => {
                if (window.confirm(t("confirmDeleteSection"))) onDeleteSection(section.id);
              }}
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
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedPageId) {
                  onReorderPages(
                    section.id,
                    reorderIds(pages.map((p) => p.id), draggedPageId, page.id)
                  );
                }
                setDraggedPageId(null);
              }}
              className={draggedPageId && draggedPageId !== page.id ? "opacity-60" : undefined}
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
                    draggable
                    onDragStart={() => setDraggedPageId(page.id)}
                    onDragEnd={() => setDraggedPageId(null)}
                    className="flex size-4 shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"
                  >
                    <GripVertical className="size-3" aria-hidden="true" />
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
