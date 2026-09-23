"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { AtlasPage, AtlasSection, LinkedDiseaseSummary, AtlasBacklink } from "@/lib/atlas";
import { RichEditableText, type RichEditableTextHandle } from "@/components/ui/RichEditableText";
import { EditModeProvider, useEditMode } from "@/components/disease-page/EditMode";
import { AtlasToolbar } from "./AtlasToolbar";
import { AtlasPageHeader } from "./AtlasPageHeader";
import { AtlasContextRail } from "./AtlasContextRail";
import { AtlasInternalLinkPicker } from "./AtlasInternalLinkPicker";
import {
  savePageBodyAction,
  getLinkedDiseaseSummaryAction,
  getBacklinksForPageAction,
} from "@/lib/actions/atlas";

export type AtlasSaveState = "idle" | "saving" | "saved" | "offline";
const AUTOSAVE_DEBOUNCE_MS = 800;

// Regex strip rather than a DOM parser — this runs during render
// (for the word/character footer), including on the server, where
// `document` doesn't exist. Approximate is fine for a passive counter;
// exactness isn't the point the way it is for copyToClipboard's own
// DOM-based strip (an event-handler-only, client-side call).
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Syncs the shared EditModeProvider's editing flag to the header's
// Editing/Reading toggle — a real read-only mode now (the toggle's
// whole point), not the old always-on ForceEditingOn: switching to
// Reading renders through RichEditableText's own !editModeOn branch
// (plain sanitized HTML, no contentEditable, no toolbar).
function SyncEditingMode({ editing }: { editing: boolean }) {
  const { setEditing } = useEditMode();
  useEffect(() => {
    setEditing(editing);
  }, [editing, setEditing]);
  return null;
}

interface AtlasEditorProps {
  page: AtlasPage | null;
  sections: AtlasSection[];
  // Only used to resolve a template's own title for the context
  // rail's "This page uses X" box (page.templatePageId is just an id)
  // — not threaded any deeper than that.
  pages: AtlasPage[];
  onRenamePage: (pageId: string, title: string) => void;
  onMovePage: (pageId: string, sectionId: string) => void;
  onDeletePage: (pageId: string) => void;
  onBodySaved: (pageId: string, body: string) => void;
  onUpdateTags: (pageId: string, tags: string[]) => void;
  onSetLinkedDisease: (pageId: string, diseaseId: string | null) => void;
  onSavedAsTemplate: (page: AtlasPage) => void;
  onNavigateToPage: (pageId: string) => void;
}

export function AtlasEditor({
  page,
  sections,
  pages,
  onRenamePage,
  onMovePage,
  onDeletePage,
  onBodySaved,
  onUpdateTags,
  onSetLinkedDisease,
  onSavedAsTemplate,
  onNavigateToPage,
}: AtlasEditorProps) {
  const t = useTranslations("myAtlas");

  if (!page) {
    // Still renders the (empty) context rail slot as a sibling — the
    // 3-column layout's rightmost column exists regardless of whether
    // a page is open, matching Pass 1's "leave it in place" for the
    // no-selection state too.
    return (
      <>
        <div className="flex min-w-0 flex-1 items-center justify-center p-12 text-center lg:border-r lg:border-border">
          <p className="font-ui text-sm text-secondary">{t("noPageSelected")}</p>
        </div>
        <AtlasContextRail page={null} linkedDisease={null} backlinks={[]} />
      </>
    );
  }

  return (
    // Keying by page.id forces a fresh mount whenever the selected page
    // changes — resets every piece of local state below (mode, save
    // state, pull-from-library) that would otherwise leak from the
    // previously selected page. A Fragment, not a wrapping div: the
    // editor column and the context rail are true siblings in the
    // 3-column flex row AtlasWorkspace.tsx owns, not nested — the rail
    // needs its own fixed 250px width alongside the editor's capped
    // 680px column, not inside it.
    <AtlasEditorInner
      key={page.id}
      page={page}
      sections={sections}
      pages={pages}
      onRenamePage={onRenamePage}
      onMovePage={onMovePage}
      onDeletePage={onDeletePage}
      onBodySaved={onBodySaved}
      onUpdateTags={onUpdateTags}
      onSetLinkedDisease={onSetLinkedDisease}
      onSavedAsTemplate={onSavedAsTemplate}
      onNavigateToPage={onNavigateToPage}
    />
  );
}

function AtlasEditorInner({
  page,
  sections,
  pages,
  onRenamePage,
  onMovePage,
  onDeletePage,
  onBodySaved,
  onUpdateTags,
  onSetLinkedDisease,
  onSavedAsTemplate,
  onNavigateToPage,
}: AtlasEditorProps & { page: AtlasPage }) {
  const t = useTranslations("myAtlas");
  const editorRef = useRef<RichEditableTextHandle>(null);
  const [mode, setMode] = useState<"editing" | "reading">("editing");
  const [saveState, setSaveState] = useState<AtlasSaveState>("idle");
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkedDisease, setLinkedDisease] = useState<LinkedDiseaseSummary | null>(null);
  const [backlinks, setBacklinks] = useState<AtlasBacklink[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHtmlRef = useRef(page.body);
  const isOnlineRef = useRef(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // "Offline — changes kept locally": don't attempt the network call
  // at all while offline (it would just hang/fail), and retry the
  // latest pending content once the browser reports it's back.
  useEffect(() => {
    function handleOnline() {
      isOnlineRef.current = true;
      if (saveState === "offline") void doSave(latestHtmlRef.current);
    }
    function handleOffline() {
      isOnlineRef.current = false;
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState]);

  async function doSave(html: string) {
    if (!isOnlineRef.current) {
      setSaveState("offline");
      return;
    }
    setSaveState("saving");
    try {
      await savePageBodyAction(page.id, html);
      onBodySaved(page.id, html);
      setSaveState("saved");
    } catch {
      setSaveState("offline");
    }
  }

  // RichEditableText's onChange (raw, every keystroke) — debounced
  // here rather than inside that component, since the visible
  // Saving…/Saved/Offline state is this Handbook-specific policy, not
  // something every other RichEditableText caller needs.
  function handleChange(html: string) {
    latestHtmlRef.current = html;
    setSaveState("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void doSave(html), AUTOSAVE_DEBOUNCE_MS);
  }

  useEffect(() => {
    if (!page.linkedDiseaseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: clearing local state for a page with no library link, not derived from a value React already owns
      setLinkedDisease(null);
      return;
    }
    let cancelled = false;
    getLinkedDiseaseSummaryAction(page.linkedDiseaseId).then((summary) => {
      if (!cancelled) setLinkedDisease(summary);
    });
    return () => {
      cancelled = true;
    };
  }, [page.linkedDiseaseId]);

  useEffect(() => {
    let cancelled = false;
    getBacklinksForPageAction(page.id).then((links) => {
      if (!cancelled) setBacklinks(links);
    });
    return () => {
      cancelled = true;
    };
  }, [page.id]);

  const { words, characters } = useMemo(() => {
    const text = stripHtml(page.body);
    return { words: text ? text.split(" ").length : 0, characters: text.length };
  }, [page.body]);
  const readingMinutes = Math.max(1, Math.ceil(words / 200));

  // Shared by every toolbar action that inserts a node directly into the
  // live contentEditable DOM (bypassing React) — insertNode's own
  // implementation calls el.focus() first, so document.activeElement is
  // reliably that same contentEditable right after any such call.
  function notifyContentInserted() {
    if (document.activeElement instanceof HTMLElement) {
      handleChange(document.activeElement.innerHTML);
    }
  }

  function insertInternalLink(pageId: string, title: string) {
    const a = document.createElement("a");
    a.href = "#";
    a.setAttribute("data-atlas-link-id", pageId);
    a.textContent = title || t("untitledPage");
    editorRef.current?.insertNode(a);
    notifyContentInserted();
    setLinkPickerOpen(false);
  }

  // Delegated rather than per-link — a data-atlas-link-id anchor's
  // href is always "#" (there's no deep-linkable per-page URL in this
  // workspace yet), so navigation goes through the already-loaded
  // `pages` state instead. Only wired in reading mode: while editing,
  // a click on link text needs to place the cursor there like any
  // other text, not jump away.
  function handlePageBodyClick(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "reading") return;
    const link = (e.target as HTMLElement).closest("[data-atlas-link-id]");
    if (!link) return;
    e.preventDefault();
    const targetId = link.getAttribute("data-atlas-link-id");
    if (targetId && pages.some((p) => p.id === targetId)) {
      onNavigateToPage(targetId);
    }
  }

  return (
    <EditModeProvider>
      <SyncEditingMode editing={mode === "editing"} />
      <div className="flex min-w-0 flex-1 justify-center overflow-y-auto lg:border-r lg:border-border">
        <div className="flex w-full max-w-[680px] flex-col gap-3 p-6 xl:max-w-[880px] 2xl:max-w-[1040px]">
          <AtlasPageHeader
            page={page}
            sections={sections}
            mode={mode}
            onSetMode={setMode}
            saveState={saveState}
            words={words}
            readingMinutes={readingMinutes}
            linkedDisease={linkedDisease}
            onRenamePage={onRenamePage}
            onMovePage={onMovePage}
            onDeletePage={onDeletePage}
            onUpdateTags={(tags) => onUpdateTags(page.id, tags)}
            onSetLinkedDisease={(diseaseId) => onSetLinkedDisease(page.id, diseaseId)}
            onSavedAsTemplate={onSavedAsTemplate}
          />

          {mode === "editing" && (
            <AtlasToolbar
              editorRef={editorRef}
              onOpenInternalLinkPicker={() => setLinkPickerOpen(true)}
              onInserted={notifyContentInserted}
            />
          )}

          {/* id is AtlasContextRail's own query root for the "On this
              page" outline — stable across editing/reading (both
              RichEditableText render branches land inside it), so the
              outline works whichever mode is active. onClick here
              catches data-atlas-link-id anchors in both branches too. */}
          <div id={`atlas-page-body-${page.id}`} onClick={handlePageBodyClick}>
            <RichEditableText
              ref={editorRef}
              as="div"
              value={page.body}
              onSave={async (html) => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                await doSave(html);
              }}
              onChange={handleChange}
              placeholder={t("emptyPagePlaceholder")}
              className="min-h-[50vh] font-reading text-base leading-relaxed text-primary"
              compact
              autoEdit
              saveLabel={t("save")}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 font-ui text-xs text-secondary">
            <span>{t("wordCount", { count: words })}</span>
            <span>{t("characterCount", { count: characters })}</span>
          </div>
        </div>
      </div>

      <AtlasContextRail
        page={page}
        linkedDisease={linkedDisease}
        backlinks={backlinks}
        templateTitle={page.templatePageId ? pages.find((p) => p.id === page.templatePageId)?.title ?? null : null}
      />

      {linkPickerOpen && (
        <AtlasInternalLinkPicker
          pages={pages}
          excludePageId={page.id}
          onClose={() => setLinkPickerOpen(false)}
          onPick={insertInternalLink}
        />
      )}
    </EditModeProvider>
  );
}
