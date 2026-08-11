"use client";

import { useRef, useState } from "react";
import { Plus, X, ChevronLeft, ChevronRight, ImagePlus, Settings2 } from "lucide-react";
import type { MediaTabsBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { sanitizeRichText } from "@/lib/rich-text";
import {
  updateMediaTabsAction,
  uploadMediaTabsImageAction,
  removeMediaTabsImageAction,
  setMediaTabsImageWidthAction,
} from "@/lib/actions/authoring";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";

type Tab = MediaTabsBlock["tabs"][number];
type ImageWidth = NonNullable<Tab["imageWidth"]>;

function isCardIconName(value: string): value is CardIconName {
  return value in cardIcons;
}

const DEFAULT_ICON: CardIconName = "activity";

const emptyTab = (n: number): Tab => ({ label: `Tab ${n}`, body: "" });

// Same fixed fraction set + grid-template mapping as OverviewBlock's
// own image width control — only used when a tab has both an image
// and body text to divide space between; see MediaTabsBlock's own
// imageWidth comment in editorial-blocks.ts.
const WIDTH_OPTIONS: { value: ImageWidth; label: string }[] = [
  { value: "1/4", label: "25%" },
  { value: "1/3", label: "33%" },
  { value: "1/2", label: "50%" },
  { value: "2/3", label: "66%" },
  { value: "3/4", label: "75%" },
];

const GRID_COLS_CLASS: Record<ImageWidth, string> = {
  "1/4": "sm:grid-cols-[1fr_3fr]",
  "1/3": "sm:grid-cols-[1fr_2fr]",
  "1/2": "sm:grid-cols-[1fr_1fr]",
  "2/3": "sm:grid-cols-[2fr_1fr]",
  "3/4": "sm:grid-cols-[3fr_1fr]",
};

// The generic counterpart to TabsBlockView (see editorial-blocks.ts's
// comment on MediaTabsBlock) — same tab-switcher chrome (icon/label/
// sublabel, add/remove/reorder), but each tab's content is one
// optional image plus a RichEditableText body instead of structured
// checklist columns. Content area follows OverviewBlockView's own
// "image column + prose column" shape, just inline per active tab
// rather than a fixed two-column block.
export function MediaTabsBlockView({
  block,
  diseaseSlug,
}: {
  block: MediaTabsBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [tabs, setTabs] = useState<Tab[]>(block.tabs);
  const [activeIndex, setActiveIndex] = useState(0);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // Set the instant a real drag (past the pixel threshold below) is
  // detected, read by the tab button's own onClick right after
  // mouseup. Browsers fire a click after any mouseup regardless of how
  // far the mouse moved in between, and that click would otherwise
  // call setActiveIndex with this handler's *original* index — stale
  // the moment reorderTabs has already moved that tab elsewhere. A
  // ref, not state: it needs to be readable synchronously inside the
  // native mouseup listener and the very next click, well before a
  // state update would have re-rendered.
  const justDraggedRef = useRef(false);

  const commit = (next: Tab[]) => {
    setTabs(next);
    return updateMediaTabsAction(block.id, next);
  };

  // Reorders by moving the dragged tab to sit right before `to`'s
  // current position — a plain splice-out/splice-in, not a swap, so
  // dragging tab 1 onto tab 4 shifts 2 and 3 left by one rather than
  // just trading places with 4 (matches how browser tab reordering
  // itself behaves, which is the interaction this is modeled on).
  const reorderTabs = (from: number, to: number) => {
    if (from === to) return;
    const next = [...tabs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
    setActiveIndex(to);
  };

  // Plain mouse-driven drag, not native HTML5 draggable/dragstart —
  // native drag-and-drop needs the browser to recognize a real OS-level
  // drag gesture (a deliberate mousedown-then-hold-then-move), which is
  // finicky in practice: an ordinary quick drag can register as a text
  // selection instead, there's no touch support at all, and Chromium
  // won't even fire dragstart for events dispatched by test/automation
  // tooling. A window-level mousemove/mouseup pair sidesteps all of
  // that — same interaction model this app already uses for whole-
  // block reordering being the one exception (BlockDnd.tsx), except
  // that one still leans on native DnD since it has to interoperate
  // with drop zones spanning many separate block components; a single
  // block's own tab strip has no such cross-component requirement, so
  // there's nothing native DnD buys here that a plain mouse listener
  // doesn't already cover more reliably.
  const startTabDrag = (index: number) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let overIndex: number | null = null;

    const onMove = (moveEvent: MouseEvent) => {
      if (!dragging) {
        if (Math.abs(moveEvent.clientX - startX) < 5 && Math.abs(moveEvent.clientY - startY) < 5) {
          return;
        }
        dragging = true;
        justDraggedRef.current = true;
        setDraggingIndex(index);
      }
      const el = document
        .elementFromPoint(moveEvent.clientX, moveEvent.clientY)
        ?.closest<HTMLElement>("[data-tab-index]");
      overIndex = el ? Number(el.dataset.tabIndex) : null;
      setDragOverIndex(overIndex);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (dragging && overIndex !== null) reorderTabs(index, overIndex);
      setDraggingIndex(null);
      setDragOverIndex(null);
      if (dragging) {
        // The browser fires a click right after this mouseup, in the
        // same tick — the tab button's onClick reads justDraggedRef
        // synchronously there to swallow that one spurious click. But
        // a click isn't guaranteed to follow every mouseup (browser
        // quirks, or the pointer ending up over a different element
        // after reorderTabs's re-render), so queue a reset one tick
        // out as a backstop — it always runs after that click would
        // have, and stops the flag from lingering into some unrelated
        // later click if no click ever came.
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 0);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const clampedIndex = Math.min(activeIndex, Math.max(tabs.length - 1, 0));
  const active = tabs[clampedIndex];
  const hasImage = !!active?.imageUrl;
  const hasBody = !!sanitizeRichText(active?.body ?? "");
  const imageWidth = active?.imageWidth ?? "1/3";

  const setImageWidth = (width: ImageWidth) => {
    const next = tabs.map((t, i) => (i === clampedIndex ? { ...t, imageWidth: width } : t));
    setTabs(next);
    setMediaTabsImageWidthAction(block.id, clampedIndex, width);
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const assetUrl = await uploadMediaTabsImageAction(block.id, clampedIndex, formData);
      // The real server-saved URL, not a client-only blob: preview —
      // this state feeds every other whole-array commit on this block
      // (see uploadMediaTabsImageAction's own comment), so it must
      // never hold a URL that stops resolving the moment this tab
      // closes.
      const next = tabs.map((t, i) => (i === clampedIndex ? { ...t, imageUrl: assetUrl } : t));
      setTabs(next);
    } catch {
      setUploadError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!editing) {
    if (tabs.length === 0) return null;
    return (
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex flex-wrap border-b border-border">
          {tabs.map((tab, index) => {
            const Icon = tab.icon && isCardIconName(tab.icon) ? cardIcons[tab.icon] : cardIcons[DEFAULT_ICON];
            const isActive = index === clampedIndex;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-left transition-colors duration-base ${
                  isActive ? "border-accent bg-accent/5" : "border-transparent hover:bg-border/20"
                }`}
              >
                <Icon
                  className={`size-5 shrink-0 ${isActive ? "text-accent" : "text-secondary"}`}
                  aria-hidden="true"
                />
                <span className="flex flex-col">
                  <span
                    className={`font-ui text-sm font-medium ${isActive ? "text-primary" : "text-secondary"}`}
                  >
                    {tab.label}
                  </span>
                  {tab.sublabel && (
                    <span className="font-ui text-xs text-secondary">{tab.sublabel}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        {active && (hasImage || hasBody) && (
          <div
            className={`grid grid-cols-1 gap-4 p-4 ${hasImage && hasBody ? GRID_COLS_CLASS[imageWidth] : ""}`}
          >
            {hasImage && (
              <div className="overflow-hidden rounded-lg border border-border bg-surface-raised">
                {/* eslint-disable-next-line @next/next/no-img-element -- block-owned upload (public/uploads/illustrations), same as OverviewBlock/SimpleImageBlock; no fixed remote-pattern domain to configure. */}
                <img src={active.imageUrl} alt="" className="w-full object-cover" />
              </div>
            )}
            {hasBody && (
              <RichEditableText
                as="div"
                className="font-reading text-base leading-6 text-primary"
                value={active.body}
                onSave={(html) => commit(tabs.map((t, i) => (i === clampedIndex ? { ...t, body: html } : t)))}
                placeholder=""
                block={block}
                diseaseSlug={diseaseSlug}
                fieldKey={`body-${clampedIndex}`}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-dashed border-border">
      <div className="flex flex-wrap items-center border-b border-border">
        {tabs.map((tab, index) => {
          const Icon = tab.icon && isCardIconName(tab.icon) ? cardIcons[tab.icon] : cardIcons[DEFAULT_ICON];
          const isActive = index === clampedIndex;
          return (
            <button
              key={index}
              type="button"
              data-tab-index={index}
              onMouseDown={startTabDrag(index)}
              onClick={() => {
                if (justDraggedRef.current) {
                  justDraggedRef.current = false;
                  return;
                }
                setActiveIndex(index);
              }}
              className={`group/tab relative flex cursor-grab items-center gap-2 border-b-2 px-4 py-3 text-left transition-colors duration-base select-none active:cursor-grabbing ${
                isActive ? "border-accent bg-accent/5" : "border-transparent hover:bg-border/20"
              } ${draggingIndex === index ? "opacity-40" : ""} ${
                dragOverIndex === index ? "bg-accent/10 shadow-[inset_2px_0_0_0_var(--color-accent)]" : ""
              }`}
            >
              <Icon
                className={`size-5 shrink-0 ${isActive ? "text-accent" : "text-secondary"}`}
                aria-hidden="true"
              />
              <span className="flex flex-col">
                <span
                  className={`font-ui text-sm font-medium ${isActive ? "text-primary" : "text-secondary"}`}
                >
                  {tab.label || "Untitled tab"}
                </span>
                {tab.sublabel && (
                  <span className="font-ui text-xs text-secondary">{tab.sublabel}</span>
                )}
              </span>
              {tabs.length > 1 && (
                <span
                  role="button"
                  aria-label="Delete tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = tabs.filter((_, i) => i !== index);
                    commit(next);
                    setActiveIndex((current) => Math.min(current, next.length - 1));
                  }}
                  className="ml-1 hidden shrink-0 rounded p-0.5 text-secondary opacity-0 hover:bg-warning/10 hover:text-warning group-hover/tab:opacity-100 sm:block"
                >
                  <X className="size-3" aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            const next = [...tabs, emptyTab(tabs.length + 1)];
            commit(next);
            setActiveIndex(next.length - 1);
          }}
          className="flex items-center gap-1 self-stretch px-3 font-ui text-xs text-secondary hover:bg-border/20 hover:text-accent"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Tab
        </button>
      </div>

      {active && (
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIconPickerOpen((open) => !open)}
                aria-label="Tab icon"
                className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised text-secondary hover:text-primary"
              >
                {(() => {
                  const Icon =
                    active.icon && isCardIconName(active.icon) ? cardIcons[active.icon] : cardIcons[DEFAULT_ICON];
                  return <Icon className="size-4" aria-hidden="true" />;
                })()}
              </button>
              {iconPickerOpen && (
                <div className="absolute top-10 left-0 z-10 grid w-48 grid-cols-6 gap-1 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
                  {(Object.keys(cardIcons) as CardIconName[]).map((name) => {
                    const Icon = cardIcons[name];
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        onClick={() => {
                          setIconPickerOpen(false);
                          commit(tabs.map((t, i) => (i === clampedIndex ? { ...t, icon: name } : t)));
                        }}
                        className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-accent"
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <input
              value={active.label}
              placeholder="Tab label"
              onChange={(e) =>
                setTabs((current) =>
                  current.map((t, i) => (i === clampedIndex ? { ...t, label: e.target.value } : t))
                )
              }
              onBlur={() => commit(tabs)}
              className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 font-ui text-sm font-medium text-primary outline-none hover:border-border focus:border-accent"
            />
            <input
              value={active.sublabel ?? ""}
              placeholder="Sublabel (optional)"
              onChange={(e) =>
                setTabs((current) =>
                  current.map((t, i) => (i === clampedIndex ? { ...t, sublabel: e.target.value } : t))
                )
              }
              onBlur={() => commit(tabs)}
              className="w-36 min-w-0 rounded border border-transparent bg-transparent px-1.5 py-1 font-ui text-sm text-secondary outline-none hover:border-border focus:border-accent"
            />
            {tabs.length > 1 && (
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  aria-label="Move tab left"
                  disabled={clampedIndex === 0}
                  onClick={() => {
                    const next = [...tabs];
                    [next[clampedIndex - 1], next[clampedIndex]] = [next[clampedIndex], next[clampedIndex - 1]];
                    commit(next);
                    setActiveIndex(clampedIndex - 1);
                  }}
                  className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
                >
                  <ChevronLeft className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Move tab right"
                  disabled={clampedIndex === tabs.length - 1}
                  onClick={() => {
                    const next = [...tabs];
                    [next[clampedIndex], next[clampedIndex + 1]] = [next[clampedIndex + 1], next[clampedIndex]];
                    commit(next);
                    setActiveIndex(clampedIndex + 1);
                  }}
                  className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
                >
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          <div className={`grid grid-cols-1 gap-4 ${GRID_COLS_CLASS[imageWidth]}`}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-raised sm:aspect-auto">
              {active.imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- edit-mode upload preview briefly uses a blob: URL, which next/image can't render. */}
                  <img src={active.imageUrl} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => {
                      const next = tabs.map((t, i) => (i === clampedIndex ? { ...t, imageUrl: undefined } : t));
                      setTabs(next);
                      removeMediaTabsImageAction(block.id, clampedIndex);
                    }}
                    className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-surface text-secondary shadow-sm hover:text-warning"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                  <div className="absolute top-2 left-2">
                    <button
                      type="button"
                      onClick={() => setSettingsOpen((v) => !v)}
                      aria-label="Image width"
                      className="flex items-center gap-1 rounded-full bg-surface px-2 py-1 font-ui text-xs text-secondary shadow-sm hover:text-accent"
                    >
                      <Settings2 className="size-3.5" aria-hidden="true" />
                    </button>
                    {settingsOpen && (
                      <div className="absolute top-7 left-0 z-10 w-40 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
                        <p className="px-0.5 pb-1 font-ui text-[10px] font-medium tracking-wide text-secondary uppercase">
                          Width
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {WIDTH_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setImageWidth(option.value);
                                setSettingsOpen(false);
                              }}
                              className={`rounded border px-2 py-1 font-ui text-xs ${
                                imageWidth === option.value
                                  ? "border-accent bg-accent/10 text-accent"
                                  : "border-border text-secondary hover:border-accent hover:text-accent"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex size-full flex-col items-center justify-center gap-1.5 text-secondary hover:text-accent disabled:opacity-50"
                >
                  <ImagePlus className="size-6" aria-hidden="true" />
                  <span className="font-ui text-xs">{uploading ? "Uploading…" : "Upload image"}</span>
                  {uploadError && <span className="font-ui text-xs text-warning">{uploadError}</span>}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              {hasBody && (
                <button
                  type="button"
                  onClick={() => commit(tabs.map((t, i) => (i === clampedIndex ? { ...t, body: "" } : t)))}
                  className="inline-flex w-fit items-center gap-1 self-end rounded px-1.5 py-0.5 font-ui text-xs text-secondary hover:text-warning"
                >
                  <X className="size-3" aria-hidden="true" />
                  Remove text
                </button>
              )}
              <RichEditableText
                as="div"
                className="font-reading text-base leading-6 text-primary"
                value={active.body}
                onSave={(html) => commit(tabs.map((t, i) => (i === clampedIndex ? { ...t, body: html } : t)))}
                placeholder="Tab content…"
                block={block}
                diseaseSlug={diseaseSlug}
                fieldKey={`body-${clampedIndex}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
