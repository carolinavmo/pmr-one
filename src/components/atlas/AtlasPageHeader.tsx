"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  Download,
  FileDown,
  FileText,
  BookOpen,
  Pencil,
  MoreHorizontal,
  Clipboard,
  Check,
  Trash2,
  BookmarkPlus,
  Link2,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import type { AtlasPage, AtlasSection, LinkedDiseaseSummary } from "@/lib/atlas";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { downloadMarkdown, downloadWord, printPageAsPdf } from "@/lib/atlas-export";
import { saveAsTemplateAction } from "@/lib/actions/atlas";
import { AtlasLibraryLinkPicker } from "./AtlasLibraryLinkPicker";
import type { AtlasSaveState } from "./AtlasEditor";

interface AtlasPageHeaderProps {
  page: AtlasPage;
  sections: AtlasSection[];
  mode: "editing" | "reading";
  onSetMode: (mode: "editing" | "reading") => void;
  saveState: AtlasSaveState;
  words: number;
  readingMinutes: number;
  linkedDisease: LinkedDiseaseSummary | null;
  onRenamePage: (pageId: string, title: string) => void;
  onMovePage: (pageId: string, sectionId: string) => void;
  onDeletePage: (pageId: string) => void;
  onUpdateTags: (tags: string[]) => void;
  onSetLinkedDisease: (diseaseId: string | null) => void;
  onSavedAsTemplate: (page: AtlasPage) => void;
}

export function AtlasPageHeader({
  page,
  sections,
  mode,
  onSetMode,
  saveState,
  words,
  readingMinutes,
  linkedDisease,
  onRenamePage,
  onMovePage,
  onDeletePage,
  onUpdateTags,
  onSetLinkedDisease,
  onSavedAsTemplate,
}: AtlasPageHeaderProps) {
  const t = useTranslations("myAtlas");
  const format = useFormatter();
  const [title, setTitle] = useState(page.title);
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // "now" must come from an effect, not render — see AtlasEditor.tsx's
  // own identical comment (SSR/hydration mismatch otherwise).
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate hydration-safe pattern, see AtlasIndex.tsx
    setNow(new Date());
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    };
  }, []);

  function commitTitle() {
    if (title !== page.title) onRenamePage(page.id, title);
  }

  async function copyToClipboard() {
    const el = document.createElement("div");
    el.innerHTML = page.body;
    try {
      await navigator.clipboard.writeText(el.textContent ?? "");
    } catch {
      return;
    }
    setCopied(true);
    setMoreMenuOpen(false);
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1500);
  }

  function commitAddTag() {
    const tag = tagDraft.trim();
    setAddingTag(false);
    setTagDraft("");
    if (tag && !page.tags.includes(tag)) onUpdateTags([...page.tags, tag]);
  }

  function removeTag(tag: string) {
    onUpdateTags(page.tags.filter((t2) => t2 !== tag));
  }

  async function handleExportWord() {
    setExportMenuOpen(false);
    setExportingWord(true);
    try {
      await downloadWord(title || t("untitledPage"), page.body);
    } finally {
      setExportingWord(false);
    }
  }

  async function handleSaveAsTemplate() {
    setMoreMenuOpen(false);
    const templatesSectionName = t("defaultSectionTemplates");
    const newPage = await saveAsTemplateAction(page.id, templatesSectionName, `${page.title || t("untitledPage")} (${t("templateLabel")})`);
    onSavedAsTemplate(newPage);
  }

  const section = sections.find((s) => s.id === page.sectionId);
  const saveStateLabel =
    saveState === "saving" ? t("savingState") : saveState === "offline" ? t("offlineState") : t("savedState");
  const saveStateClass = saveState === "offline" ? "text-warning" : saveState === "saving" ? "text-secondary" : "text-trust";

  return (
    <div className="flex flex-col gap-1.5 border-b border-border pb-4">
      <div className="flex items-center gap-1.5 font-ui text-xs font-semibold text-secondary">
        <span>{t("breadcrumbRoot")}</span>
        <span aria-hidden="true">›</span>
        <span>{section?.name}</span>
        <span aria-hidden="true">›</span>
        <span className="truncate text-primary">{title || t("untitledPage")}</span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          placeholder={t("untitledPage")}
          className="w-full min-w-0 bg-transparent font-heading text-2xl font-bold text-navy outline-none placeholder:font-normal placeholder:text-secondary"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((v) => !v)}
              aria-label={t("exportPage")}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 font-ui text-xs font-bold text-secondary hover:bg-border/30 hover:text-primary"
            >
              <Download className="size-3.5" aria-hidden="true" />
              {t("exportPage")}
            </button>
            {exportMenuOpen && (
              <div className="absolute top-full right-0 z-20 mt-1 flex w-48 flex-col gap-0.5 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    printPageAsPdf(title || t("untitledPage"), page.body);
                    setExportMenuOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-ui text-xs font-bold text-primary hover:bg-border/30"
                >
                  <FileDown className="size-3.5" aria-hidden="true" />
                  {t("exportAsPdf")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadMarkdown(title || t("untitledPage"), page.body);
                    setExportMenuOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-ui text-xs font-bold text-primary hover:bg-border/30"
                >
                  <FileText className="size-3.5" aria-hidden="true" />
                  {t("exportAsMarkdown")}
                </button>
                <button
                  type="button"
                  onClick={handleExportWord}
                  disabled={exportingWord}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-ui text-xs font-bold text-primary hover:bg-border/30 disabled:opacity-50"
                >
                  {exportingWord ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <FileDown className="size-3.5" aria-hidden="true" />
                  )}
                  {t("exportAsWord")}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSetMode(mode === "editing" ? "reading" : "editing")}
            aria-label={mode === "editing" ? t("switchToReading") : t("switchToEditing")}
            title={mode === "editing" ? t("switchToReading") : t("switchToEditing")}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-ui text-xs font-bold ${
              mode === "editing" ? "border-accent bg-accent text-white" : "border-border text-secondary hover:bg-border/30 hover:text-primary"
            }`}
          >
            {mode === "editing" ? <Pencil className="size-3.5" aria-hidden="true" /> : <BookOpen className="size-3.5" aria-hidden="true" />}
            {mode === "editing" ? t("editingMode") : t("readingMode")}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreMenuOpen((v) => !v)}
              aria-label={t("moreActions")}
              className="flex size-8 items-center justify-center rounded-lg text-secondary hover:bg-border/40 hover:text-primary"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
            {moreMenuOpen && (
              <div className="absolute top-full right-0 z-20 mt-1 flex w-52 flex-col gap-0.5 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
                <button type="button" onClick={copyToClipboard} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-ui text-xs font-bold text-primary hover:bg-border/30">
                  {copied ? <Check className="size-3.5 text-trust" aria-hidden="true" /> : <Clipboard className="size-3.5" aria-hidden="true" />}
                  {copied ? t("copiedToClipboard") : t("copyNote")}
                </button>
                <button type="button" onClick={handleSaveAsTemplate} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-ui text-xs font-bold text-primary hover:bg-border/30">
                  <BookmarkPlus className="size-3.5" aria-hidden="true" />
                  {t("saveAsTemplate").replace(" ›", "")}
                </button>
                <select
                  value={page.sectionId}
                  onChange={(e) => onMovePage(page.id, e.target.value)}
                  aria-label={t("moveToSection")}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 font-ui text-xs font-bold text-primary outline-none"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <div className="my-0.5 h-px bg-border" />
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setConfirmingDelete(true);
                  }}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-ui text-xs font-bold text-warning hover:bg-warning/10"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  {t("deletePage")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title={t("confirmDeletePage")}
          confirmLabel={t("deletePage")}
          cancelLabel={t("cancel")}
          onConfirm={() => {
            setConfirmingDelete(false);
            onDeletePage(page.id);
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 font-ui text-xs text-secondary">
        {linkedDisease ? (
          <button
            type="button"
            onClick={() => setLibraryPickerOpen(true)}
            className="rounded-full border border-acc-bd bg-acc-bg px-2.5 py-1 font-ui text-[11.5px] font-bold text-acc-ink"
          >
            {t("linkedLabel", { path: `${linkedDisease.breadcrumb ? `${linkedDisease.breadcrumb} › ` : ""}${linkedDisease.canonicalName}` })}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setLibraryPickerOpen(true)}
            className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-ui text-[11.5px] font-bold text-secondary hover:text-primary"
          >
            <Link2 className="size-3" aria-hidden="true" />
            {t("linkToLibrary")}
          </button>
        )}

        {page.tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-border/40 px-2.5 py-1 font-ui text-[11.5px] font-semibold text-secondary">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} aria-label={t("removeTag", { tag })} className="text-secondary/70 hover:text-primary">
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        {addingTag ? (
          <input
            autoFocus
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onBlur={commitAddTag}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitAddTag();
              if (e.key === "Escape") {
                setTagDraft("");
                setAddingTag(false);
              }
            }}
            placeholder={t("addTagPlaceholder")}
            className="w-28 rounded-full border border-accent bg-surface px-2.5 py-1 font-ui text-[11.5px] text-primary outline-none"
          />
        ) : (
          <button type="button" onClick={() => setAddingTag(true)} className="flex items-center gap-0.5 rounded-full px-2 py-1 font-ui text-[11.5px] font-bold text-secondary hover:text-primary">
            <Plus className="size-3" aria-hidden="true" />
            {t("addTag")}
          </button>
        )}

        <span aria-hidden="true">·</span>
        {now && <span>{t("editedRelative", { time: format.relativeTime(new Date(page.updatedAt), now) })}</span>}
        <span aria-hidden="true">·</span>
        <span className={saveStateClass}>{saveStateLabel}</span>
        <span aria-hidden="true">·</span>
        <span>{t("wordCount", { count: words })}</span>
        <span aria-hidden="true">·</span>
        <span>{t("readingTime", { minutes: readingMinutes })}</span>
      </div>

      {libraryPickerOpen && (
        <AtlasLibraryLinkPicker
          linkedDisease={linkedDisease}
          onClose={() => setLibraryPickerOpen(false)}
          onPick={(diseaseId) => {
            onSetLinkedDisease(diseaseId);
            setLibraryPickerOpen(false);
          }}
          onRemove={() => {
            onSetLinkedDisease(null);
            setLibraryPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
