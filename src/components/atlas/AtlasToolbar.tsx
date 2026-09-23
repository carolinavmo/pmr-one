"use client";

import { useRef, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { Heading1, Heading2, Heading3, ListChecks, Table, ImagePlus, Sparkles, Library, Loader2, FileSymlink } from "lucide-react";
import type { RichEditableTextHandle } from "@/components/ui/RichEditableText";
import {
  ATLAS_CARD_PRESET_ORDER,
  ATLAS_CARD_PRESETS,
  ATLAS_CARD_WRAPPER_CLASS,
  ATLAS_CARD_LABEL_CLASS,
  type AtlasCardPreset,
} from "@/lib/rich-text";
import { CARD_COLOR_TINT, CARD_COLOR_TEXT } from "@/lib/card-colors";
import { uploadPageImageAction } from "@/lib/actions/atlas";

// HANDBOOK-SPEC.md Pass 3's toolbar — headings, tasks, a table, an
// image, and the two platform actions (Insert card / Pull from
// library). Deliberately a SEPARATE row above RichEditableText's own
// (compact) toolbar rather than 6 more buttons crammed into that
// component's three already-parallel toolbar JSX blocks — see
// RichEditableText.tsx's own comment on `insertNode`. Every insertion
// here goes through `editorRef.current.insertNode(node)` except
// headings, which use `document.execCommand("formatBlock", ...)`
// directly (a format command, not a node insert — same mechanism
// RichEditableText's own Quote button already uses internally).
// `onMouseDown` + preventDefault on every button is load-bearing: it's
// what stops the contentEditable from blurring (and RichEditableText's
// onBlur-commit from firing) before the click handler ever runs —
// without it, the field would exit edit mode and lose its selection
// the instant a toolbar button is pressed.
export function AtlasToolbar({
  editorRef,
  onOpenPullFromLibrary,
  onOpenInternalLinkPicker,
  onInserted,
}: {
  editorRef: RefObject<RichEditableTextHandle | null>;
  onOpenPullFromLibrary: () => void;
  onOpenInternalLinkPicker: () => void;
  // insertNode mutates the live contentEditable DOM directly, bypassing
  // React — it never fires the native `input` event RichEditableText's
  // onChange listens on, so the autosave pipeline never learns about a
  // toolbar-inserted task/table/image/card unless something calls this
  // afterward (same nudge insertPulledQuote's own caller already needs).
  onInserted: () => void;
}) {
  const t = useTranslations("myAtlas");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cardPickerOpen, setCardPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const guard = (e: React.MouseEvent) => e.preventDefault();
  const btnClass =
    "flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-40";

  function heading(level: 1 | 2 | 3) {
    document.execCommand("formatBlock", false, `h${level}`);
  }

  function insertTask() {
    const div = document.createElement("div");
    div.setAttribute("data-checked", "false");
    div.textContent = t("newTaskPlaceholder");
    editorRef.current?.insertNode(div);
    onInserted();
  }

  function insertTable() {
    const table = document.createElement("table");
    const body = document.createElement("tbody");
    for (let r = 0; r < 3; r++) {
      const row = document.createElement("tr");
      for (let c = 0; c < 2; c++) {
        const cell = document.createElement(r === 0 ? "th" : "td");
        if (r === 0) cell.textContent = t("tableHeaderPlaceholder", { n: c + 1 });
        row.appendChild(cell);
      }
      body.appendChild(row);
    }
    table.appendChild(body);
    editorRef.current?.insertNode(table);
    onInserted();
  }

  function insertCard(preset: AtlasCardPreset) {
    const { label, color } = ATLAS_CARD_PRESETS[preset];
    const wrapper = document.createElement("div");
    wrapper.className = `${ATLAS_CARD_WRAPPER_CLASS} ${CARD_COLOR_TINT[color]}`;
    wrapper.setAttribute("data-card-preset", preset);
    const labelEl = document.createElement("span");
    labelEl.className = `${ATLAS_CARD_LABEL_CLASS} ${CARD_COLOR_TEXT[color]}`;
    labelEl.textContent = label;
    const body = document.createElement("p");
    body.textContent = t("cardBodyPlaceholder");
    wrapper.appendChild(labelEl);
    wrapper.appendChild(body);
    editorRef.current?.insertNode(wrapper);
    onInserted();
    setCardPickerOpen(false);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const url = await uploadPageImageAction(formData);
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      editorRef.current?.insertNode(img);
      onInserted();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t("imageUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 border-b border-border bg-surface-sunken px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" onMouseDown={guard} onClick={() => heading(1)} aria-label={t("heading1")} title={t("heading1")} className={btnClass}>
          <Heading1 className="size-4" aria-hidden="true" />
        </button>
        <button type="button" onMouseDown={guard} onClick={() => heading(2)} aria-label={t("heading2")} title={t("heading2")} className={btnClass}>
          <Heading2 className="size-4" aria-hidden="true" />
        </button>
        <button type="button" onMouseDown={guard} onClick={() => heading(3)} aria-label={t("heading3")} title={t("heading3")} className={btnClass}>
          <Heading3 className="size-4" aria-hidden="true" />
        </button>

        <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

        <button type="button" onMouseDown={guard} onClick={insertTask} aria-label={t("insertTask")} title={t("insertTask")} className={btnClass}>
          <ListChecks className="size-4" aria-hidden="true" />
        </button>
        <button type="button" onMouseDown={guard} onClick={insertTable} aria-label={t("insertTable")} title={t("insertTable")} className={btnClass}>
          <Table className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={guard}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label={t("insertImage")}
          title={t("insertImage")}
          className={btnClass}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <div className="relative">
            <button
              type="button"
              onMouseDown={guard}
              onClick={() => setCardPickerOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-insight/30 bg-insight-bg px-2.5 py-1.5 font-ui text-xs font-black text-insight"
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              {t("insertCard")}
            </button>
            {cardPickerOpen && (
              <div className="absolute top-full right-0 z-20 mt-1 flex w-52 flex-col gap-0.5 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
                {ATLAS_CARD_PRESET_ORDER.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onMouseDown={guard}
                    onClick={() => insertCard(preset)}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-ui text-xs font-bold hover:bg-border/30 ${CARD_COLOR_TEXT[ATLAS_CARD_PRESETS[preset].color]}`}
                  >
                    <span className={`size-2.5 shrink-0 rounded-full ${CARD_COLOR_TINT[ATLAS_CARD_PRESETS[preset].color]}`} aria-hidden="true" />
                    {ATLAS_CARD_PRESETS[preset].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onMouseDown={guard}
            onClick={onOpenInternalLinkPicker}
            aria-label={t("linkToPage")}
            title={t("linkToPage")}
            className={btnClass}
          >
            <FileSymlink className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onMouseDown={guard}
            onClick={onOpenPullFromLibrary}
            className="flex items-center gap-1.5 rounded-lg border border-acc-bd bg-acc-bg px-2.5 py-1.5 font-ui text-xs font-black text-acc-ink"
          >
            <Library className="size-3.5" aria-hidden="true" />
            {t("pullFromLibrary")}
          </button>
        </div>
      </div>
      {uploadError && <p className="font-ui text-xs text-warning">{uploadError}</p>}
    </div>
  );
}
