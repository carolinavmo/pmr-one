"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Clipboard, Check, CopyPlus, Trash2 } from "lucide-react";
import type { AtlasPage, AtlasSection } from "@/lib/atlas";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { EditModeProvider, useEditMode } from "@/components/disease-page/EditMode";
import { savePageBodyAction } from "@/lib/actions/atlas";

// RichEditableText only becomes editable when useEditMode() reports
// editing:true — normally toggled by an admin's "Edit page" button
// (see EditMode.tsx). A member's own notes have no separate view/edit
// mode — they're always editable — so this forces it on once, locally,
// without ever showing a toggle button.
function ForceEditingOn({ children }: { children: ReactNode }) {
  const { setEditing } = useEditMode();
  useEffect(() => {
    setEditing(true);
  }, [setEditing]);
  return <>{children}</>;
}

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

interface AtlasEditorProps {
  page: AtlasPage | null;
  sections: AtlasSection[];
  onRenamePage: (pageId: string, title: string) => void;
  onMovePage: (pageId: string, sectionId: string) => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onBodySaved: (pageId: string, body: string) => void;
}

export function AtlasEditor({
  page,
  sections,
  onRenamePage,
  onMovePage,
  onDuplicatePage,
  onDeletePage,
  onBodySaved,
}: AtlasEditorProps) {
  const t = useTranslations("myAtlas");

  if (!page) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-center">
        <p className="font-ui text-sm text-secondary">{t("noPageSelected")}</p>
      </div>
    );
  }

  const { words, characters } = (() => {
    const text = stripHtml(page.body);
    return { words: text ? text.split(" ").length : 0, characters: text.length };
  })();

  return (
    // Keying the whole editor by page.id forces a fresh mount whenever
    // the selected page changes — resets the title input's local state
    // and RichEditableText's internal isEditing/frozenHtml state, which
    // would otherwise leak from the previously selected page.
    <div key={page.id} className="flex min-w-0 flex-1 flex-col gap-4 p-6">
      <PageEditorHeader
        page={page}
        sections={sections}
        onRenamePage={onRenamePage}
        onMovePage={onMovePage}
        onDuplicatePage={onDuplicatePage}
        onDeletePage={onDeletePage}
      />
      <EditModeProvider>
        <ForceEditingOn>
          <RichEditableText
            as="div"
            value={page.body}
            onSave={async (html) => {
              await savePageBodyAction(page.id, html);
              onBodySaved(page.id, html);
            }}
            placeholder={t("emptyPagePlaceholder")}
            className="min-h-[50vh] font-reading text-base leading-relaxed text-primary"
          />
        </ForceEditingOn>
      </EditModeProvider>
      <div className="flex items-center justify-between border-t border-border pt-3 font-ui text-xs text-secondary">
        <span>{t("wordCount", { count: words })}</span>
        <span>{t("characterCount", { count: characters })}</span>
      </div>
    </div>
  );
}

function PageEditorHeader({
  page,
  sections,
  onRenamePage,
  onMovePage,
  onDuplicatePage,
  onDeletePage,
}: {
  page: AtlasPage;
  sections: AtlasSection[];
  onRenamePage: (pageId: string, title: string) => void;
  onMovePage: (pageId: string, sectionId: string) => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
}) {
  const t = useTranslations("myAtlas");
  const format = useFormatter();
  const [title, setTitle] = useState(page.title);
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // "now" must come from an effect, not render: computing it inline would
  // give the SSR pass and the client's hydration pass two different
  // instants, so relativeTime() renders different text ("27 seconds ago"
  // vs "28 seconds ago") and React throws a hydration mismatch.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate hydration-safe pattern: state starts null on both server and client's first render, then updates post-mount so the client-only value never has to match SSR output.
    setNow(new Date());
  }, []);

  function commitTitle() {
    if (title !== page.title) onRenamePage(page.id, title);
  }

  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    };
  }, []);

  // Plain text only — a member pasting a note into another app (an
  // EHR, a chart, an email) almost always wants the words, not this
  // editor's own markup. A detached element's textContent is the
  // simplest correct HTML-to-plain-text conversion available client-side.
  async function copyToClipboard() {
    const el = document.createElement("div");
    el.innerHTML = page.body;
    try {
      await navigator.clipboard.writeText(el.textContent ?? "");
    } catch {
      return;
    }
    setCopied(true);
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-1.5 border-b border-border pb-4">
      <div className="flex items-start justify-between gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          placeholder={t("untitledPage")}
          className="w-full bg-transparent font-heading text-2xl font-bold text-primary outline-none placeholder:font-normal placeholder:text-secondary"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={copyToClipboard}
            aria-label={copied ? t("copiedToClipboard") : t("copyNote")}
            title={copied ? t("copiedToClipboard") : t("copyNote")}
            className={`flex size-8 items-center justify-center rounded-lg hover:bg-border/40 ${
              copied ? "text-trust" : "text-secondary hover:text-primary"
            }`}
          >
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Clipboard className="size-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => onDuplicatePage(page.id)}
            aria-label={t("duplicatePage")}
            title={t("duplicatePage")}
            className="flex size-8 items-center justify-center rounded-lg text-secondary hover:bg-border/40 hover:text-primary"
          >
            <CopyPlus className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t("confirmDeletePage"))) onDeletePage(page.id);
            }}
            aria-label={t("deletePage")}
            title={t("deletePage")}
            className="flex size-8 items-center justify-center rounded-lg text-secondary hover:bg-warning/10 hover:text-warning"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-xs text-secondary">
        {/* A native <select> styled to read as plain breadcrumb text
            (no border/background) rather than a boxed control — same
            "move to another section" action as before, framed to match
            the mockup's "My Pages / Shoulder" breadcrumb line instead
            of sitting in its own separate row. */}
        <select
          value={page.sectionId}
          onChange={(e) => onMovePage(page.id, e.target.value)}
          aria-label={t("moveToSection")}
          className="rounded bg-transparent font-medium text-secondary outline-none hover:text-primary focus:text-primary"
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
        {now && (
          <>
            <span aria-hidden="true">·</span>
            <span>{t("editedRelative", { time: format.relativeTime(new Date(page.updatedAt), now) })}</span>
          </>
        )}
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1 text-trust">
          <Check className="size-3" aria-hidden="true" />
          {t("saved")}
        </span>
      </div>
    </div>
  );
}
