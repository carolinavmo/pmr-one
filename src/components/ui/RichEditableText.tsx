"use client";

import { createElement, useEffect, useRef, useState, type ElementType } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Type,
  Palette,
  Highlighter,
  Eraser,
  Link as LinkIcon,
  Unlink,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sigma,
  MoreHorizontal,
  Save,
} from "lucide-react";
import { useEditMode } from "@/components/disease-page/EditMode";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { AnnotatableProse } from "@/components/annotations/AnnotatableProse";
import type { EditorialBlock, HorizontalAlign } from "@/lib/editorial-blocks";
import { updateBlockAlignmentAction } from "@/lib/actions/authoring";
import {
  sanitizeRichText,
  FONT_SIZE_ORDER,
  FONT_SIZE_LABEL,
  FONT_SIZE_CLASS,
  TEXT_COLOR_CLASS,
  TEXT_BG_CLASS,
  BOLD_CLASS,
  UNDERLINE_CLASS,
  ITALIC_CLASS,
  STRIKETHROUGH_CLASS,
  LINK_CLASS,
} from "@/lib/rich-text";

interface RichEditableTextProps {
  value: string;
  onSave: (html: string) => Promise<void>;
  as?: ElementType;
  className?: string;
  placeholder?: string;
  // Optional — only present when a caller wants the text-align buttons
  // (see PROSE_CONTENT_CLASS/align section below). Every current
  // caller (Paragraph/KeyPoint/ClinicalPearl/SelfCheck) has both
  // readily available already; a future caller without a real block
  // (e.g. a static preview) just omits them and gets everything else.
  // `block` also gates member annotation support (see the !editModeOn
  // branch below) — a caller with no block simply isn't annotatable.
  block?: EditorialBlock;
  diseaseSlug?: string;
  // Disambiguates the handful of block types that render more than one
  // RichEditableText off the same block.id (self_check's question/
  // answer, overview's paragraph/keyTakeaway, icon_text's title/label/
  // description) — every other caller can omit it, defaulting to
  // "content". Only matters for annotation anchoring; unused otherwise.
  fieldKey?: string;
  // Opt-in, defaults to false/unchanged for every existing caller.
  // autoEdit starts the field already in its editing state (skipping
  // the click-to-start preview) — for a surface like My Handbook where
  // there's no separate view mode to begin with, requiring a click
  // before the toolbar even appears is pure friction. compact swaps
  // the always-visible toolbar for a shorter primary row (Bold/Italic/
  // Underline, lists, quote, link) with the rest of the exact same
  // controls tucked behind a "More" flyout, instead of one long row —
  // same capabilities, just less visually noisy for a plain notes
  // editor. Disease-page block editing omits both and keeps its
  // current full inline toolbar untouched.
  autoEdit?: boolean;
  compact?: boolean;
  // Label for the explicit Save control the compact toolbar shows (My
  // Handbook only — see the `compact` block below). Left as a plain
  // English default rather than a next-intl hook so this component
  // stays translation-agnostic like every other label here; a caller
  // that cares about locale (AtlasEditor) passes its own t() string.
  saveLabel?: string;
}

// Raw <ul>/<ol>/<blockquote> tags (inserted via execCommand, so they
// arrive with no class of their own) need explicit styling wherever
// this component renders content — Tailwind's preflight reset strips
// default list markers/indent and blockquote styling entirely.
// Applied in all three render branches below (view-only, hover
// preview, and the live editable field) so list/quote formatting
// looks the same whether or not edit mode is on.
const PROSE_CONTENT_CLASS =
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-secondary";

const SAFE_URL_PATTERN = /^https?:\/\//i;

// rich-text.ts's sanitizer deliberately allows ul/ol/li/blockquote —
// block-level content — inside these fields (its own comment calls
// this out as "the one genuine widening" beyond a pure inline-span
// vocabulary), and the toolbar's own list/quote buttons let an editor
// insert one directly. But every caller here defaults `as` to "p", and
// a <p> can never legally contain a block-level child — the browser
// silently closes it early when parsing the raw HTML string, which
// desyncs from what React's SSR literally wrote and throws a
// hydration mismatch (harmless in effect, since React just
// regenerates the subtree, but a real console error on every affected
// page). Rather than banning list/quote formatting or rewriting every
// call site's `as` prop, fall back to a <div> — a legal container for
// both inline and block content — only when the content actually has
// something a <p> can't hold; the common no-list case keeps its <p>
// unchanged.
const BLOCK_LEVEL_CONTENT_PATTERN = /<(ul|ol|blockquote)[\s>]/i;
function resolveTag(tag: ElementType, html: string): ElementType {
  return tag === "p" && BLOCK_LEVEL_CONTENT_PATTERN.test(html) ? "div" : tag;
}

const ALIGN_OPTIONS: { value: HorizontalAlign; Icon: typeof AlignLeft }[] = [
  { value: "left", Icon: AlignLeft },
  { value: "center", Icon: AlignCenter },
  { value: "right", Icon: AlignRight },
];

// A curated set, not a full Unicode picker — same "known fixed list,
// not an open-ended browser" philosophy as HEADING_ICONS/cardIcons.
// Picked for what actually comes up authoring an MSK/PM&R reference:
// degree/measurement symbols, comparison operators, direction arrows
// (describing force/motion), the handful of Greek letters that show
// up in clinical shorthand (α angle, Δ change, μ micro), and a few
// general prose marks. Inserted as plain characters, not spans — a
// symbol is content, not formatting, so it needs nothing added to
// rich-text.ts's class/tag allowlist.
const SYMBOLS = [
  "°", "±", "×", "÷", "≠", "≤", "≥", "≈", "∞",
  "→", "←", "↑", "↓",
  "α", "β", "γ", "Δ", "μ",
  "½", "¼", "¾", "²", "³",
  "′", "″", "§", "†", "•", "—", "®", "™",
];

// The rich-text sibling of EditableText — same "renders exactly as
// before when not editing" contract, but the editing surface is a
// real per-selection formatting editor (Bold/Italic/Underline/
// Strikethrough/size/color/highlight/link/lists/quote/clear) instead
// of a plain textarea. Value is sanitized HTML (rich-text.ts); a field
// with no formatting is just plain text, which is valid HTML with
// zero tags, so this is a drop-in replacement wherever EditableText
// held prose content — no migration for existing plain-text values.
//
// contentEditable is only ever given its starting HTML once per edit
// session (`frozenHtml` state, captured the moment editing starts and
// never updated again while `isEditing` stays true) — the browser then
// owns the live DOM entirely; nothing in this component re-renders
// with a *different* __html value while editing, which is what keeps
// React from stomping the user's cursor/selection mid-edit (the
// standard hazard of mixing contentEditable with a virtual DOM).
export function RichEditableText({
  value,
  onSave,
  as: Tag = "p",
  className = "",
  placeholder = "Click to add text",
  block,
  diseaseSlug,
  fieldKey,
  autoEdit = false,
  compact = false,
  saveLabel = "Save",
}: RichEditableTextProps) {
  const { editing: editModeOn } = useEditMode();
  const [isEditing, setIsEditing] = useState(autoEdit);
  const [popover, setPopover] = useState<"size" | "color" | "bg" | "symbols" | "link" | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [frozenHtml, setFrozenHtml] = useState(value);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const editableRef = useRef<HTMLElement>(null);
  // The Range captured the moment "Link" is clicked — the URL input
  // lives in its own popover, and giving it real keyboard focus (it
  // has to, to be typeable) inevitably steals focus away from the
  // contentEditable field, which would otherwise collapse
  // window.getSelection() before Apply ever runs. Stashing the Range
  // here instead of re-reading the selection at Apply time survives
  // that focus hop.
  const pendingLinkRangeRef = useRef<Range | null>(null);
  // onBlur normally means "the member clicked away — commit and end
  // the edit session" (see commit(), below). Focusing the link
  // popover's input is a blur for the same reason, but isn't that —
  // it's a sub-step of the same edit. This flag tells onBlur to
  // stand down for that one, expected blur.
  const suppressBlurRef = useRef(false);

  // React's `autoFocus` prop doesn't reliably focus a contentEditable
  // element (unlike a plain `<input>`/`<textarea>`, which is why
  // EditableText never needed this) — call it explicitly once the
  // node mounts.
  useEffect(() => {
    if (isEditing) {
      editableRef.current?.focus();
    }
  }, [isEditing]);

  if (!editModeOn) {
    const clean = sanitizeRichText(value);
    // createElement, not JSX, for the dynamically-resolved tag — a
    // capitalized JSX identifier bound to a runtime value trips
    // react-hooks/static-components ("component created during
    // render"), even though this only ever picks between two plain
    // element-name strings, never a real component.
    if (!clean) {
      return createElement(resolveTag(Tag, clean), { className }, placeholder);
    }
    // A member's private highlights/notes render through
    // AnnotatableProse, which itself renders the exact same plain
    // output below when no AnnotationProvider is mounted (a visitor,
    // or no session) — so this only changes anything for a signed-in
    // member. `block` gates it: the one documented caller without a
    // block (a static preview) falls through unchanged.
    if (block) {
      return (
        <AnnotatableProse
          tag={resolveTag(Tag, clean)}
          html={clean}
          className={`${className} ${PROSE_CONTENT_CLASS}`}
          block={block}
          fieldKey={fieldKey ?? "content"}
        />
      );
    }
    return createElement(resolveTag(Tag, clean), {
      className: `${className} ${PROSE_CONTENT_CLASS}`,
      dangerouslySetInnerHTML: { __html: clean },
    });
  }

  if (!isEditing) {
    const preview = sanitizeRichText(value);
    // compact (My Handbook) skips the dashed "click to edit" outline —
    // a plain-notes page reads better as unadorned text at rest, with
    // just the hover wash as the discoverability cue. Every other
    // caller (disease-page block editing) keeps the outline, since
    // there it's the only signal a given field is editable at all.
    const idleBorderClass = compact ? "" : "outline-dashed outline-1 outline-border/60";
    // compact's empty state matches the live-editing placeholder's look
    // (font-reading, larger, secondary/60) rather than the small italic
    // default — this is now the *first* thing a member sees on a blank
    // My Handbook page (isEditing starts false), not a transient state
    // between keystrokes, so it earns the same care.
    const emptyClass = !value ? (compact ? "font-reading text-lg text-secondary/60" : "text-secondary italic") : "";
    const commonProps = {
      className: `${className} ${PROSE_CONTENT_CLASS} cursor-text rounded ${idleBorderClass} transition-colors duration-base hover:bg-accent/5 ${emptyClass}`,
      onClick: () => {
        setFrozenHtml(value);
        setIsEditing(true);
      },
    };
    return preview
      ? createElement(resolveTag(Tag, preview), {
          ...commonProps,
          dangerouslySetInnerHTML: { __html: preview },
        })
      : createElement(resolveTag(Tag, preview), commonProps, placeholder);
  }

  // Shared by onBlur and the explicit "Save" button (compact toolbar
  // only) — both end the edit session and drop back to the preview
  // render, saving only if the content actually changed. Skipped
  // entirely while suppressBlurRef is set — see its declaration above.
  const commit = async () => {
    if (suppressBlurRef.current) return;
    const html = editableRef.current?.innerHTML ?? "";
    setIsEditing(false);
    setPopover(null);
    if (html !== frozenHtml) {
      await onSave(html);
    }
  };

  const withinEditable = (node: Node | null) =>
    !!node && !!editableRef.current && editableRef.current.contains(node);

  // Wraps the current selection in a fresh <span class="...">. Nesting
  // (bold inside a colored span, or the reverse) is allowed rather
  // than merged — simpler and safe. toggleFormat (below) is what
  // handles turning a single attribute back off; this stays the "just
  // apply it" primitive both toggleFormat and the size/color/highlight
  // pickers build on.
  const wrapSelection = (className: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!withinEditable(range.commonAncestorContainer)) return;
    const span = document.createElement("span");
    span.className = className;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
  };

  // Walks up from the selection to the nearest ancestor (within the
  // editable field) matching `predicate` and unwraps it — removes that
  // one element but keeps its children in place. Shared by removeLink
  // and toggleFormat below; both are "undo one specific wrapper"
  // actions, just matching a different kind of wrapper (a tag vs. a
  // class).
  const unwrapAncestor = (predicate: (el: HTMLElement) => boolean) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
    if (!withinEditable(node)) return false;
    while (node && node !== editableRef.current) {
      if (node instanceof HTMLElement && predicate(node)) {
        const parent = node.parentNode;
        if (!parent) return false;
        // Removing the node the current Selection anchors into (an <a>
        // for removeLink, most notably) can make some browsers drop
        // focus to <body> as a side effect of invalidating that
        // selection — independent of, and not caught by, the toolbar's
        // own mousedown-based blur guard (preventBlur only stops a
        // *click* from moving focus, not this). Suppress across the
        // mutation, refocus immediately (before the browser's own
        // fallback-to-body has a chance to land), and hold the
        // suppression for a couple more frames — that native blur can
        // arrive *after* this synchronous handler returns, and a single
        // requestAnimationFrame reset raced it in testing (reset landed
        // first, so the delayed blur still ended the edit session).
        suppressBlurRef.current = true;
        while (node.firstChild) parent.insertBefore(node.firstChild, node);
        parent.removeChild(node);
        editableRef.current?.focus();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            suppressBlurRef.current = false;
          });
        });
        return true;
      }
      node = node.parentNode;
    }
    return false;
  };

  // Bold/Italic/Underline/Strikethrough, and picking a text/highlight
  // color that's already applied, are all real on/off toggles —
  // clicking the same one again should turn it back off, matching
  // every other rich text editor (this is what "already bold" meant
  // in practice when the founder reported it, and the exact same gap
  // existed for re-picking the same highlight color). "Already active"
  // here means the selection sits entirely inside a `className` span
  // (checked via the selection's own common ancestor, so a selection
  // straddling both formatted and unformatted text correctly falls
  // through to "apply," not "remove," same as elsewhere). Font size
  // stays a plain `wrapSelection` call, not routed through this — Small
  // /Large/X-Large are three different classes, not one repeatable
  // choice, so "click the same size again to remove sizing entirely"
  // isn't an expectation the size popover sets up the way a color
  // swatch or a Bold button does.
  const isFormatActive = (className: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
    let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
    if (!withinEditable(node)) return false;
    while (node && node !== editableRef.current) {
      if (node instanceof HTMLElement && node.classList.contains(className)) return true;
      node = node.parentNode;
    }
    return false;
  };

  const toggleFormat = (className: string) => {
    if (isFormatActive(className)) {
      unwrapAncestor((el) => el.classList.contains(className));
    } else {
      wrapSelection(className);
    }
  };

  // Same idea as wrapSelection, but for a real <a href> instead of a
  // decorative span. Opens the toolbar's own URL popover rather than
  // window.prompt() — prompt()/alert() are unreliable across browsers
  // (some block them outright, throwing "prompt() is not supported"
  // instead of showing anything, which silently broke this control
  // entirely) and don't match the rest of this toolbar's UI anyway.
  // The popover's input necessarily steals DOM focus from the
  // contentEditable to be typeable, which would otherwise collapse
  // window.getSelection() and fire onBlur → commit() the instant it's
  // clicked — so the Range is captured into a ref *before* that
  // happens, and suppressBlurRef tells onBlur to stand down for that
  // one expected blur (see both declarations above).
  const applyLink = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!withinEditable(range.commonAncestorContainer)) return;
    pendingLinkRangeRef.current = range.cloneRange();
    suppressBlurRef.current = true;
    setLinkUrl("");
    setLinkError(null);
    setPopover("link");
  };

  const focusEditable = () => {
    // Re-run after the popover unmounts (its input currently holds
    // focus) rather than in the same tick, so there's a real focusable
    // node to land on.
    requestAnimationFrame(() => editableRef.current?.focus());
  };

  const cancelLink = () => {
    pendingLinkRangeRef.current = null;
    suppressBlurRef.current = false;
    setPopover(null);
    focusEditable();
  };

  const confirmLink = () => {
    const range = pendingLinkRangeRef.current;
    const url = linkUrl.trim();
    if (!range) {
      cancelLink();
      return;
    }
    if (!url) {
      cancelLink();
      return;
    }
    if (!SAFE_URL_PATTERN.test(url)) {
      setLinkError("Links must start with http:// or https://");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = LINK_CLASS;
    a.appendChild(range.extractContents());
    range.insertNode(a);
    const sel = window.getSelection();
    if (sel) {
      const newRange = document.createRange();
      newRange.selectNodeContents(a);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
    pendingLinkRangeRef.current = null;
    suppressBlurRef.current = false;
    setPopover(null);
    focusEditable();
  };

  // Shared by every toolbar's Link popover — a small URL input +
  // Apply/Cancel, positioned under the Link button that opened it.
  // stopPropagation (not preventDefault) on mousedown: the toolbar
  // row's own preventBlur handler is what stops a *button* click from
  // stealing focus, but this popover's input is supposed to be
  // focusable — letting that mousedown bubble up would block it from
  // ever receiving focus at all.
  const renderLinkPopover = () =>
    popover === "link" && (
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute top-8 left-0 z-20 w-64 rounded-lg border border-border bg-surface-raised p-2 shadow-md"
      >
        <input
          type="text"
          autoFocus
          value={linkUrl}
          onChange={(e) => {
            setLinkUrl(e.target.value);
            if (linkError) setLinkError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirmLink();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelLink();
            }
          }}
          placeholder="https://…"
          className="w-full rounded border border-border bg-surface px-2 py-1 font-ui text-xs text-primary outline-none focus:border-accent"
        />
        {linkError && <p className="mt-1 font-ui text-xs text-warning">{linkError}</p>}
        <div className="mt-1.5 flex justify-end gap-1">
          <button
            type="button"
            onClick={cancelLink}
            className="rounded px-2 py-1 font-ui text-xs text-secondary hover:bg-border/40 hover:text-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmLink}
            className="rounded bg-accent px-2 py-1 font-ui text-xs font-medium text-white hover:bg-accent/90"
          >
            Apply
          </button>
        </div>
      </div>
    );

  // The inverse of applyLink — unwraps the nearest ancestor <a>, same
  // unwrapAncestor primitive toggleFormat uses above, just matching a
  // tag instead of a class.
  const removeLink = () => {
    unwrapAncestor((el) => el instanceof HTMLAnchorElement);
  };

  // Inserts one character at the cursor (or in place of a selection) —
  // unlike wrapSelection, a collapsed cursor with nothing selected is
  // the normal case here (you don't select a position, just place your
  // cursor and pick a symbol), so this doesn't bail out on
  // `sel.isCollapsed` the way the formatting actions above do.
  // execCommand("insertText") over manual Range surgery here since a
  // plain character (no wrapping element) is exactly what it's for,
  // and it already correctly replaces a non-collapsed selection too.
  const insertSymbol = (symbol: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    if (!withinEditable(sel.getRangeAt(0).commonAncestorContainer)) return;
    document.execCommand("insertText", false, symbol);
  };

  // Enter normally inserts a manual <br> (below) rather than a real
  // paragraph break — this field is a single running line of prose,
  // not a multi-paragraph document. Inside a list, though, that would
  // break the browser's own native "Enter = next item, Enter on an
  // empty item = exit the list" behavior, so list context is the one
  // case that's left to fall through to the browser's default action.
  const isWithinList = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
    if (!withinEditable(node)) return false;
    while (node && node !== editableRef.current) {
      if (node instanceof HTMLElement && node.tagName === "LI") return true;
      node = node.parentNode;
    }
    return false;
  };

  // Strips all markup from the selection down to plain text — the one
  // "undo my styling" action, rather than trying to intelligently
  // toggle each individual attribute back off.
  const clearFormatting = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!withinEditable(range.commonAncestorContainer)) return;
    const text = range.toString();
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    const newRange = document.createRange();
    newRange.selectNode(textNode);
    sel.removeAllRanges();
    sel.addRange(newRange);
  };

  // Every toolbar control needs this — without it, the mousedown that
  // precedes a button's click already moved focus (and blurred the
  // contentEditable), clearing window.getSelection() before the click
  // handler ever runs. Attached once, on the toolbar's outer wrapper;
  // mousedown bubbles, so every descendant button is covered.
  const preventBlur = (e: React.MouseEvent) => e.preventDefault();

  const currentTextAlign: HorizontalAlign = block?.layout?.textAlign ?? "left";

  return (
    <div className="relative">
      {compact && (
        <div
          onMouseDown={preventBlur}
          // lg+ has room for every control inline (the sibling block
          // right below renders that version) — this collapsed-with-
          // "More" row is only needed below that width, where the full
          // set doesn't fit on one line.
          className="mb-1 flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-surface-raised p-1 shadow-sm lg:hidden"
        >
          <button
            type="button"
            aria-label="Bold"
            onClick={() => toggleFormat(BOLD_CLASS)}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Bold className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Italic"
            onClick={() => toggleFormat(ITALIC_CLASS)}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Italic className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Underline"
            onClick={() => toggleFormat(UNDERLINE_CLASS)}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <UnderlineIcon className="size-3.5" aria-hidden="true" />
          </button>

          <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

          <button
            type="button"
            aria-label="Bulleted list"
            onClick={() => document.execCommand("insertUnorderedList")}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <List className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Numbered list"
            onClick={() => document.execCommand("insertOrderedList")}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <ListOrdered className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Quote"
            onClick={() => document.execCommand("formatBlock", false, "blockquote")}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Quote className="size-3.5" aria-hidden="true" />
          </button>

          <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

          <div className="relative">
            <button
              type="button"
              aria-label="Link"
              onClick={applyLink}
              className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
            >
              <LinkIcon className="size-3.5" aria-hidden="true" />
            </button>
            {renderLinkPopover()}
          </div>

          <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

          <div className="relative">
            <button
              type="button"
              aria-label="More formatting"
              onClick={() => setMoreOpen((o) => !o)}
              className={`flex size-7 items-center justify-center rounded ${
                moreOpen ? "bg-accent/10 text-accent" : "text-secondary hover:bg-border/40 hover:text-primary"
              }`}
            >
              <MoreHorizontal className="size-3.5" aria-hidden="true" />
            </button>
            {moreOpen && (
              <div
                onMouseDown={preventBlur}
                className="absolute top-8 right-0 z-10 flex w-max flex-wrap items-center gap-0.5 rounded-lg border border-border bg-surface-raised p-1 shadow-md"
              >
                <button
                  type="button"
                  aria-label="Strikethrough"
                  onClick={() => toggleFormat(STRIKETHROUGH_CLASS)}
                  className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
                >
                  <Strikethrough className="size-3.5" aria-hidden="true" />
                </button>

                <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

                <div className="relative">
                  <button
                    type="button"
                    aria-label="Font size"
                    onClick={() => setPopover((p) => (p === "size" ? null : "size"))}
                    className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
                  >
                    <Type className="size-3.5" aria-hidden="true" />
                  </button>
                  {popover === "size" && (
                    <div className="absolute top-8 left-0 z-20 flex gap-1 rounded-lg border border-border bg-surface-raised p-1.5 shadow-md">
                      {FONT_SIZE_ORDER.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            wrapSelection(FONT_SIZE_CLASS[size]);
                            setPopover(null);
                          }}
                          className="rounded px-2 py-1 font-ui text-xs text-secondary hover:bg-border/40 hover:text-primary"
                        >
                          {FONT_SIZE_LABEL[size]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    aria-label="Text color"
                    onClick={() => setPopover((p) => (p === "color" ? null : "color"))}
                    className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
                  >
                    <Palette className="size-3.5" aria-hidden="true" />
                  </button>
                  {popover === "color" && (
                    <ColorSwatchPicker
                      className="absolute top-8 left-0 z-20 w-48"
                      onPick={(color) => {
                        toggleFormat(TEXT_COLOR_CLASS[color]);
                        setPopover(null);
                      }}
                    />
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    aria-label="Highlight color"
                    onClick={() => setPopover((p) => (p === "bg" ? null : "bg"))}
                    className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
                  >
                    <Highlighter className="size-3.5" aria-hidden="true" />
                  </button>
                  {popover === "bg" && (
                    <ColorSwatchPicker
                      className="absolute top-8 left-0 z-20 w-48"
                      onPick={(color) => {
                        toggleFormat(TEXT_BG_CLASS[color]);
                        setPopover(null);
                      }}
                    />
                  )}
                </div>

                <button
                  type="button"
                  aria-label="Clear formatting"
                  onClick={clearFormatting}
                  className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-warning"
                >
                  <Eraser className="size-3.5" aria-hidden="true" />
                </button>

                <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

                <button
                  type="button"
                  aria-label="Remove link"
                  onClick={removeLink}
                  className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
                >
                  <Unlink className="size-3.5" aria-hidden="true" />
                </button>

                <div className="relative">
                  <button
                    type="button"
                    aria-label="Insert symbol"
                    onClick={() => setPopover((p) => (p === "symbols" ? null : "symbols"))}
                    className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
                  >
                    <Sigma className="size-3.5" aria-hidden="true" />
                  </button>
                  {popover === "symbols" && (
                    <div className="absolute top-8 right-0 z-20 grid w-56 grid-cols-8 gap-0.5 rounded-lg border border-border bg-surface-raised p-1.5 shadow-md">
                      {SYMBOLS.map((symbol) => (
                        <button
                          key={symbol}
                          type="button"
                          onClick={() => {
                            insertSymbol(symbol);
                            setPopover(null);
                          }}
                          className="flex size-6 items-center justify-center rounded font-reading text-sm text-primary hover:bg-border/40"
                        >
                          {symbol}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

          <button
            type="button"
            onClick={commit}
            className="ml-auto flex h-7 items-center gap-1 rounded bg-accent px-2 font-ui text-xs font-medium text-white transition-colors duration-base hover:bg-accent/90"
          >
            <Save className="size-3.5" aria-hidden="true" />
            {saveLabel}
          </button>
        </div>
      )}
      {compact && (
        // lg+ variant of the same toolbar — every control the "More"
        // flyout hides above gets its own button in one row instead,
        // since a wide viewport has the room and a click-through
        // dropdown is pure friction once space isn't the constraint.
        <div
          onMouseDown={preventBlur}
          className="mb-1 hidden flex-wrap items-center gap-0.5 rounded-lg border border-border bg-surface-raised p-1 shadow-sm lg:flex"
        >
          <button
            type="button"
            aria-label="Bold"
            onClick={() => toggleFormat(BOLD_CLASS)}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Bold className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Italic"
            onClick={() => toggleFormat(ITALIC_CLASS)}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Italic className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Underline"
            onClick={() => toggleFormat(UNDERLINE_CLASS)}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <UnderlineIcon className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Strikethrough"
            onClick={() => toggleFormat(STRIKETHROUGH_CLASS)}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Strikethrough className="size-3.5" aria-hidden="true" />
          </button>

          <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

          <div className="relative">
            <button
              type="button"
              aria-label="Font size"
              onClick={() => setPopover((p) => (p === "size" ? null : "size"))}
              className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
            >
              <Type className="size-3.5" aria-hidden="true" />
            </button>
            {popover === "size" && (
              <div className="absolute top-8 left-0 z-10 flex gap-1 rounded-lg border border-border bg-surface-raised p-1.5 shadow-md">
                {FONT_SIZE_ORDER.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      wrapSelection(FONT_SIZE_CLASS[size]);
                      setPopover(null);
                    }}
                    className="rounded px-2 py-1 font-ui text-xs text-secondary hover:bg-border/40 hover:text-primary"
                  >
                    {FONT_SIZE_LABEL[size]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label="Text color"
              onClick={() => setPopover((p) => (p === "color" ? null : "color"))}
              className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
            >
              <Palette className="size-3.5" aria-hidden="true" />
            </button>
            {popover === "color" && (
              <ColorSwatchPicker
                className="absolute top-8 left-0 z-10 w-48"
                onPick={(color) => {
                  toggleFormat(TEXT_COLOR_CLASS[color]);
                  setPopover(null);
                }}
              />
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label="Highlight color"
              onClick={() => setPopover((p) => (p === "bg" ? null : "bg"))}
              className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
            >
              <Highlighter className="size-3.5" aria-hidden="true" />
            </button>
            {popover === "bg" && (
              <ColorSwatchPicker
                className="absolute top-8 left-0 z-10 w-48"
                onPick={(color) => {
                  toggleFormat(TEXT_BG_CLASS[color]);
                  setPopover(null);
                }}
              />
            )}
          </div>

          <button
            type="button"
            aria-label="Clear formatting"
            onClick={clearFormatting}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-warning"
          >
            <Eraser className="size-3.5" aria-hidden="true" />
          </button>

          <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

          <button
            type="button"
            aria-label="Bulleted list"
            onClick={() => document.execCommand("insertUnorderedList")}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <List className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Numbered list"
            onClick={() => document.execCommand("insertOrderedList")}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <ListOrdered className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Quote"
            onClick={() => document.execCommand("formatBlock", false, "blockquote")}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Quote className="size-3.5" aria-hidden="true" />
          </button>

          <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

          <div className="relative">
            <button
              type="button"
              aria-label="Link"
              onClick={applyLink}
              className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
            >
              <LinkIcon className="size-3.5" aria-hidden="true" />
            </button>
            {renderLinkPopover()}
          </div>
          <button
            type="button"
            aria-label="Remove link"
            onClick={removeLink}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Unlink className="size-3.5" aria-hidden="true" />
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label="Insert symbol"
              onClick={() => setPopover((p) => (p === "symbols" ? null : "symbols"))}
              className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
            >
              <Sigma className="size-3.5" aria-hidden="true" />
            </button>
            {popover === "symbols" && (
              <div className="absolute top-8 left-0 z-10 grid w-56 grid-cols-8 gap-0.5 rounded-lg border border-border bg-surface-raised p-1.5 shadow-md">
                {SYMBOLS.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => {
                      insertSymbol(symbol);
                      setPopover(null);
                    }}
                    className="flex size-6 items-center justify-center rounded font-reading text-sm text-primary hover:bg-border/40"
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

          <button
            type="button"
            onClick={commit}
            className="ml-auto flex h-7 items-center gap-1 rounded bg-accent px-2 font-ui text-xs font-medium text-white transition-colors duration-base hover:bg-accent/90"
          >
            <Save className="size-3.5" aria-hidden="true" />
            {saveLabel}
          </button>
        </div>
      )}
      {!compact && (
      <div
        onMouseDown={preventBlur}
        className="mb-1 flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-surface-raised p-1 shadow-sm"
      >
        <button
          type="button"
          aria-label="Bold"
          onClick={() => toggleFormat(BOLD_CLASS)}
          className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
        >
          <Bold className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Italic"
          onClick={() => toggleFormat(ITALIC_CLASS)}
          className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
        >
          <Italic className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Underline"
          onClick={() => toggleFormat(UNDERLINE_CLASS)}
          className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
        >
          <UnderlineIcon className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Strikethrough"
          onClick={() => toggleFormat(STRIKETHROUGH_CLASS)}
          className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
        >
          <Strikethrough className="size-3.5" aria-hidden="true" />
        </button>

        <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

        <div className="relative">
          <button
            type="button"
            aria-label="Font size"
            onClick={() => setPopover((p) => (p === "size" ? null : "size"))}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Type className="size-3.5" aria-hidden="true" />
          </button>
          {popover === "size" && (
            <div className="absolute top-8 left-0 z-10 flex gap-1 rounded-lg border border-border bg-surface-raised p-1.5 shadow-md">
              {FONT_SIZE_ORDER.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    wrapSelection(FONT_SIZE_CLASS[size]);
                    setPopover(null);
                  }}
                  className="rounded px-2 py-1 font-ui text-xs text-secondary hover:bg-border/40 hover:text-primary"
                >
                  {FONT_SIZE_LABEL[size]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Text color"
            onClick={() => setPopover((p) => (p === "color" ? null : "color"))}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Palette className="size-3.5" aria-hidden="true" />
          </button>
          {popover === "color" && (
            <ColorSwatchPicker
              className="absolute top-8 left-0 z-10 w-48"
              onPick={(color) => {
                toggleFormat(TEXT_COLOR_CLASS[color]);
                setPopover(null);
              }}
            />
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Highlight color"
            onClick={() => setPopover((p) => (p === "bg" ? null : "bg"))}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Highlighter className="size-3.5" aria-hidden="true" />
          </button>
          {popover === "bg" && (
            <ColorSwatchPicker
              className="absolute top-8 left-0 z-10 w-48"
              onPick={(color) => {
                toggleFormat(TEXT_BG_CLASS[color]);
                setPopover(null);
              }}
            />
          )}
        </div>

        <button
          type="button"
          aria-label="Clear formatting"
          onClick={clearFormatting}
          className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-warning"
        >
          <Eraser className="size-3.5" aria-hidden="true" />
        </button>

        <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

        <div className="relative">
          <button
            type="button"
            aria-label="Link"
            onClick={applyLink}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <LinkIcon className="size-3.5" aria-hidden="true" />
          </button>
          {renderLinkPopover()}
        </div>
        <button
          type="button"
          aria-label="Remove link"
          onClick={removeLink}
          className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
        >
          <Unlink className="size-3.5" aria-hidden="true" />
        </button>

        <div className="relative">
          <button
            type="button"
            aria-label="Insert symbol"
            onClick={() => setPopover((p) => (p === "symbols" ? null : "symbols"))}
            className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Sigma className="size-3.5" aria-hidden="true" />
          </button>
          {popover === "symbols" && (
            <div className="absolute top-8 left-0 z-10 grid w-56 grid-cols-8 gap-0.5 rounded-lg border border-border bg-surface-raised p-1.5 shadow-md">
              {SYMBOLS.map((symbol) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => {
                    insertSymbol(symbol);
                    setPopover(null);
                  }}
                  className="flex size-6 items-center justify-center rounded font-reading text-sm text-primary hover:bg-border/40"
                >
                  {symbol}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

        <button
          type="button"
          aria-label="Bulleted list"
          onClick={() => document.execCommand("insertUnorderedList")}
          className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
        >
          <List className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Numbered list"
          onClick={() => document.execCommand("insertOrderedList")}
          className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
        >
          <ListOrdered className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Quote"
          onClick={() => document.execCommand("formatBlock", false, "blockquote")}
          className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
        >
          <Quote className="size-3.5" aria-hidden="true" />
        </button>

        {block && diseaseSlug && (
          <>
            <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />
            {ALIGN_OPTIONS.map(({ value, Icon }) => (
              <button
                key={value}
                type="button"
                aria-label={`Align text ${value}`}
                aria-pressed={currentTextAlign === value}
                onClick={() => updateBlockAlignmentAction(block.id, { textAlign: value })}
                className={`flex size-7 items-center justify-center rounded ${
                  currentTextAlign === value
                    ? "bg-accent/10 text-accent"
                    : "text-secondary hover:bg-border/40 hover:text-primary"
                }`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </button>
            ))}
          </>
        )}
      </div>
      )}
      {createElement(resolveTag(Tag, frozenHtml), {
        ref: editableRef,
        contentEditable: true,
        suppressContentEditableWarning: true,
        onBlur: commit,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" && !isWithinList()) {
            e.preventDefault();
            document.execCommand("insertLineBreak");
          }
        },
        dangerouslySetInnerHTML: { __html: frozenHtml },
        // Once isEditing is true, the field is uncontrolled (see the
        // frozenHtml comment up top) — a truly empty starting value
        // just renders an empty node, with nothing built in to show
        // `placeholder` the way an <input> would. `:empty:before`
        // fills that gap without any React state: the browser applies
        // it only while the element has zero child nodes and drops it
        // the instant a keystroke lands, no re-render (and no risk to
        // the live cursor/selection) required.
        "data-placeholder": placeholder,
        className: `${className} ${PROSE_CONTENT_CLASS} empty:before:content-[attr(data-placeholder)] empty:before:font-reading empty:before:text-lg empty:before:text-secondary/60 empty:before:pointer-events-none w-full rounded border border-accent bg-surface-raised px-2 py-1 outline-none`,
      })}
    </div>
  );
}
