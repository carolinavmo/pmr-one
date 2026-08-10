"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
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
} from "lucide-react";
import { useEditMode } from "@/components/disease-page/EditMode";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
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
  block?: EditorialBlock;
  diseaseSlug?: string;
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
}: RichEditableTextProps) {
  const { editing: editModeOn } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [popover, setPopover] = useState<"size" | "color" | "bg" | "symbols" | null>(null);
  const [frozenHtml, setFrozenHtml] = useState(value);
  const editableRef = useRef<HTMLElement>(null);

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
    return clean ? (
      <Tag className={`${className} ${PROSE_CONTENT_CLASS}`} dangerouslySetInnerHTML={{ __html: clean }} />
    ) : (
      <Tag className={className}>{placeholder}</Tag>
    );
  }

  if (!isEditing) {
    const preview = sanitizeRichText(value);
    const commonProps = {
      className: `${className} ${PROSE_CONTENT_CLASS} cursor-text rounded outline-dashed outline-1 outline-border/60 transition-colors duration-base hover:bg-accent/5 ${
        !value ? "text-secondary italic" : ""
      }`,
      onClick: () => {
        setFrozenHtml(value);
        setIsEditing(true);
      },
    };
    return preview ? (
      <Tag {...commonProps} dangerouslySetInnerHTML={{ __html: preview }} />
    ) : (
      <Tag {...commonProps}>{placeholder}</Tag>
    );
  }

  const commit = async () => {
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
        while (node.firstChild) parent.insertBefore(node.firstChild, node);
        parent.removeChild(node);
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
  // decorative span — window.prompt() rather than a toolbar popover
  // input on purpose: a popover text field would need to receive
  // focus, and this toolbar's own mousedown guard (preventBlur, below)
  // exists specifically to stop focus from ever leaving the
  // contentEditable field when a toolbar control is clicked. Letting
  // an input steal that focus would fire the field's onBlur → commit()
  // and silently end the edit session the moment someone clicked into
  // the URL box. A native prompt() sidesteps that entirely — it's a
  // separate browser-level modal, not a DOM node inside this
  // component, so the page's own focus/selection state (and the
  // Range captured just before it opens) survives it intact.
  const applyLink = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!withinEditable(range.commonAncestorContainer)) return;
    const savedRange = range.cloneRange();
    const url = window.prompt("Link URL (https://…)");
    if (!url) return;
    if (!SAFE_URL_PATTERN.test(url)) {
      window.alert("Links must start with http:// or https://");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = LINK_CLASS;
    a.appendChild(savedRange.extractContents());
    savedRange.insertNode(a);
    const newRange = document.createRange();
    newRange.selectNodeContents(a);
    sel.removeAllRanges();
    sel.addRange(newRange);
  };

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
              className="absolute top-8 left-0 z-10 w-44"
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
              className="absolute top-8 left-0 z-10 w-44"
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
          aria-label="Link"
          onClick={applyLink}
          className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
        >
          <LinkIcon className="size-3.5" aria-hidden="true" />
        </button>
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
      <Tag
        ref={editableRef as never}
        contentEditable
        suppressContentEditableWarning
        onBlur={commit}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" && !isWithinList()) {
            e.preventDefault();
            document.execCommand("insertLineBreak");
          }
        }}
        dangerouslySetInnerHTML={{ __html: frozenHtml }}
        className={`${className} ${PROSE_CONTENT_CLASS} w-full rounded border border-accent bg-surface-raised px-2 py-1 outline-none`}
      />
    </div>
  );
}
