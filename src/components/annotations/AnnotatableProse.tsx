"use client";

import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
} from "react";
import { useTranslations } from "next-intl";
import {
  MessageSquarePlus,
  MessageSquareText,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type { EditorialBlock, CardColor } from "@/lib/editorial-blocks";
import {
  CARD_COLOR_ORDER,
  CARD_COLOR_SWATCH,
  CARD_COLOR_LABEL,
} from "@/lib/card-colors";
import { TEXT_BG_CLASS } from "@/lib/rich-text";
import { useAnnotations } from "@/components/annotations/AnnotationProvider";
import {
  captureQuote,
  relocateQuote,
  type QuoteAnchor,
} from "@/lib/annotation-anchor";
import {
  createAnnotationAction,
  updateAnnotationAction,
  updateAnnotationColorAction,
  deleteAnnotationAction,
} from "@/lib/actions/annotations";
import type { Annotation } from "@/lib/annotations";

const DEFAULT_COLOR: CardColor = "accent";

// A small inline row of the same 8 CardColor swatches ColorSwatchPicker
// renders in its own bordered popover — not reused directly here since
// both call sites below are already inside a popover of their own
// (nesting popover-in-popover borders/shadows reads as a mistake, not
// a picker). Same underlying palette data (card-colors.ts) either way.
function ColorSwatchRow({
  value,
  onPick,
}: {
  value: CardColor;
  onPick: (color: CardColor) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {CARD_COLOR_ORDER.map((color) => (
        <button
          key={color}
          type="button"
          title={CARD_COLOR_LABEL[color]}
          onClick={() => onPick(color)}
          className={`size-4 shrink-0 rounded-full ${CARD_COLOR_SWATCH[color]} transition-transform duration-base hover:scale-110 ${
            value === color
              ? "ring-2 ring-accent ring-offset-1 ring-offset-surface-raised"
              : ""
          }`}
        />
      ))}
    </div>
  );
}

interface Position {
  top: number;
  left: number;
}

interface AnnotatableProseProps {
  tag: ElementType;
  html: string;
  className: string;
  block: EditorialBlock;
  fieldKey: string;
}

// The choke point RichEditableText.tsx renders into whenever it has
// real sanitized content AND a `block` prop — i.e. every prose field a
// signed-in member could annotate. Split into an outer/inner pair
// (rather than one component with an early return) because the inner
// half needs hooks (useState/useEffect/refs) that can't be called
// conditionally — see EditMode.tsx's own EditModeProvider/body split
// for the same pattern already established in this codebase.
export function AnnotatableProse({
  tag,
  html,
  className,
  block,
  fieldKey,
}: AnnotatableProseProps) {
  const { enabled } = useAnnotations();

  // No AnnotationProvider mounted (a visitor, or no session) — render
  // exactly what RichEditableText used to render inline before this
  // feature existed. Zero extra DOM, byte-identical to before.
  if (!enabled) {
    return createElement(tag, {
      className,
      dangerouslySetInnerHTML: { __html: html },
    });
  }

  return (
    <AnnotatableProseActive
      tag={tag}
      html={html}
      className={className}
      block={block}
      fieldKey={fieldKey}
    />
  );
}

function measurePositions(
  container: HTMLElement,
  ids: string[],
): Record<string, Position> {
  const containerRect = container.getBoundingClientRect();
  const positions: Record<string, Position> = {};
  for (const id of ids) {
    const marks = container.querySelectorAll<HTMLElement>(
      `mark[data-annotation-id="${CSS.escape(id)}"]`,
    );
    const lastMark = marks[marks.length - 1];
    if (!lastMark) continue;
    const rect = lastMark.getBoundingClientRect();
    positions[id] = {
      top: rect.top - containerRect.top,
      left: rect.right - containerRect.left,
    };
  }
  return positions;
}

// Wraps a Range spanning one-or-more text nodes in one <mark> per
// underlying text node (not one <mark> around the whole range) — a
// single wrapper would need Range.surroundContents(), which throws
// whenever the range partially contains an inline element (e.g. the
// highlight starts before a <strong> and ends inside it, common in
// real prose with bold/colored spans). Several adjacent <mark>s with
// identical styling read as one continuous highlight visually, same
// technique real-world text-highlighting implementations use for
// exactly this reason.
function wrapQuoteRange(
  container: HTMLElement,
  range: Range,
  annotationId: string,
  bgClass: string,
): HTMLElement[] {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    if (range.intersectsNode(current)) nodes.push(current as Text);
  }
  if (nodes.length === 0) return [];

  // Trim the last node's tail (content after the range) off first —
  // splitText returns the new *tail* node, which we don't want, so its
  // return value is deliberately unused; the original (now-shortened)
  // node stays in `nodes` as the piece to wrap.
  const last = nodes[nodes.length - 1];
  if (range.endContainer === last && range.endOffset < last.length) {
    last.splitText(range.endOffset);
  }
  // Trim the first node's head (content before the range) off second —
  // splitText's *returned* node is the piece we want this time (from
  // the split point onward), replacing the original head-only piece.
  const first = nodes[0];
  if (range.startContainer === first && range.startOffset > 0) {
    nodes[0] = first.splitText(range.startOffset);
  }

  const marks: HTMLElement[] = [];
  for (const piece of nodes) {
    if (!piece.parentNode) continue;
    const mark = document.createElement("mark");
    mark.className = `${bgClass} rounded-sm`;
    mark.dataset.annotationId = annotationId;
    piece.parentNode.insertBefore(mark, piece);
    mark.appendChild(piece);
    marks.push(mark);
  }
  return marks;
}

function AnnotatableProseActive({
  tag: Tag,
  html,
  className,
  block,
  fieldKey,
}: AnnotatableProseProps) {
  const t = useTranslations("annotations");
  const {
    diseaseId,
    annotationsFor,
    reportLocated,
    addAnnotation,
    updateAnnotationLocal,
    removeAnnotation,
  } = useAnnotations();
  // Memoized on `annotationsFor` itself (context-stable — it's a
  // useCallback keyed only on the Provider's own `annotations` state,
  // per AnnotationProvider.tsx), not recomputed as a fresh array on
  // every render. `annotationsFor(...)` always returns a brand-new
  // array reference (Array.filter), so calling it directly here would
  // make this component's own dependency array below "change" on
  // every render — including ones this component's own effect just
  // caused — an infinite render loop, not just wasted work.
  const annotations = useMemo(
    () => annotationsFor(block.id, fieldKey),
    [annotationsFor, block.id, fieldKey],
  );

  const containerRef = useRef<HTMLElement>(null);
  const [markerPositions, setMarkerPositions] = useState<
    Record<string, Position>
  >({});
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const [selectionAnchor, setSelectionAnchor] = useState<QuoteAnchor | null>(
    null,
  );
  const [selectionPos, setSelectionPos] = useState<Position | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteColor, setNoteColor] = useState<CardColor>(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);

  // Re-injects every annotation's highlight into the pristine sanitized
  // HTML whenever the html itself or this field's annotation list
  // changes. Idempotent: always resets to `html` first, so a previous
  // pass's <mark>s never accumulate or go stale.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = html;

    const locatedIds: string[] = [];
    for (const annotation of annotations) {
      const range = relocateQuote(container, {
        prefix: annotation.quotePrefix,
        exact: annotation.quoteExact,
        suffix: annotation.quoteSuffix,
      });
      if (!range) {
        reportLocated(annotation.id, false);
        continue;
      }
      const marks = wrapQuoteRange(
        container,
        range,
        annotation.id,
        TEXT_BG_CLASS[annotation.color],
      );
      if (marks.length === 0) {
        reportLocated(annotation.id, false);
        continue;
      }
      reportLocated(annotation.id, true);
      locatedIds.push(annotation.id);
    }
    setMarkerPositions(measurePositions(container, locatedIds));
    // annotations is a freshly-filtered array every render (from
    // context), not memoized per block/field — comparing by value here
    // isn't necessary since re-running this effect on an unrelated
    // provider update just re-does an idempotent relocate/rewrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, annotations]);

  // Re-measure (not re-relocate) marker positions when this block's
  // own layout changes width — e.g. the Workspace drawer opening
  // narrows the reading column and reflows the highlighted phrase to a
  // different line. The underlying text hasn't changed, so relocating
  // again would be redundant work; only the <mark>s' screen positions
  // need updating.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      setMarkerPositions((current) =>
        measurePositions(container, Object.keys(current)),
      );
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  function handleMouseUp(e: React.MouseEvent) {
    // Ignore mouseup events bubbling up from our own injected UI (the
    // marker button, the add-note button, either popover) — otherwise
    // clicking them would immediately clear selectionAnchor before its
    // own onClick handler runs.
    if ((e.target as HTMLElement).closest("[data-annotation-ui]")) return;

    const container = containerRef.current;
    const sel = window.getSelection();
    if (!container || !sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelectionAnchor(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      setSelectionAnchor(null);
      return;
    }
    const anchor = captureQuote(container, range);
    if (!anchor) {
      setSelectionAnchor(null);
      return;
    }
    const rangeRect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setSelectionPos({
      top: rangeRect.top - containerRect.top,
      left: rangeRect.left - containerRect.left,
    });
    setSelectionAnchor(anchor);
    setAddingNote(false);
  }

  async function handleSaveNote() {
    if (!selectionAnchor || !noteDraft.trim()) return;
    setSaving(true);
    const result = await createAnnotationAction(diseaseId, {
      blockId: block.id,
      blockField: fieldKey,
      quotePrefix: selectionAnchor.prefix,
      quoteExact: selectionAnchor.exact,
      quoteSuffix: selectionAnchor.suffix,
      body: noteDraft.trim(),
      color: noteColor,
    });
    setSaving(false);
    if (result.ok && result.annotation) {
      addAnnotation(result.annotation);
      window.getSelection()?.removeAllRanges();
      setSelectionAnchor(null);
      setAddingNote(false);
      setNoteDraft("");
      setNoteColor(DEFAULT_COLOR);
    }
  }

  async function handleSaveEdit(annotationId: string) {
    if (!editDraft.trim()) return;
    const result = await updateAnnotationAction(annotationId, editDraft.trim());
    if (result.ok) {
      updateAnnotationLocal(annotationId, { body: editDraft.trim() });
      setEditingId(null);
    }
  }

  async function handleChangeColor(annotationId: string, color: CardColor) {
    const result = await updateAnnotationColorAction(annotationId, color);
    if (result.ok) {
      updateAnnotationLocal(annotationId, { color });
    }
  }

  async function handleDelete(annotationId: string) {
    const result = await deleteAnnotationAction(annotationId);
    if (result.ok) {
      removeAnnotation(annotationId);
      setPinnedId(null);
      setHoverId(null);
    }
  }

  const activeId = pinnedId ?? hoverId;
  const activeAnnotation: Annotation | undefined = activeId
    ? annotations.find((a) => a.id === activeId)
    : undefined;
  const activePos = activeId ? markerPositions[activeId] : undefined;

  return (
    <div className="relative" onMouseUp={handleMouseUp}>
      {createElement(Tag, {
        // Same `as never` cast RichEditableText.tsx's own live-editing
        // branch uses for its ref on a dynamically-resolved ElementType
        // — Tag is always actually "p" or "div" at runtime, but
        // TypeScript can't narrow a generic ElementType that far.
        ref: containerRef as never,
        className,
        dangerouslySetInnerHTML: { __html: html },
      })}

      {annotations.map((annotation) => {
        const pos = markerPositions[annotation.id];
        if (!pos) return null;
        return (
          <button
            key={annotation.id}
            type="button"
            data-annotation-ui
            aria-label={t("addNote")}
            onMouseEnter={() => setHoverId(annotation.id)}
            onMouseLeave={() =>
              setHoverId((current) =>
                current === annotation.id ? null : current,
              )
            }
            onClick={() =>
              setPinnedId((current) =>
                current === annotation.id ? null : annotation.id,
              )
            }
            className="absolute z-10 flex size-4 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white shadow-sm"
            style={{ top: pos.top, left: pos.left + 2 }}
          >
            <MessageSquareText className="size-2.5" aria-hidden="true" />
          </button>
        );
      })}

      {activeAnnotation && activePos && (
        <div
          data-annotation-ui
          className="absolute top-6 left-0 z-20 w-64 rounded-lg border border-border bg-surface-raised p-3 shadow-md"
          style={{
            top: activePos.top + 16,
            left: Math.max(0, activePos.left - 200),
          }}
        >
          {editingId === activeAnnotation.id ? (
            <div className="flex flex-col gap-2">
              <textarea
                autoFocus
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={3}
                className="rounded-md border border-border bg-surface px-2 py-1.5 font-ui text-sm text-primary outline-none focus:border-accent"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="font-ui text-xs text-secondary hover:text-primary"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(activeAnnotation.id)}
                  className="font-ui text-xs font-medium text-accent"
                >
                  {t("save")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="font-ui text-sm whitespace-pre-wrap text-primary">
                {activeAnnotation.body}
              </p>
              <div className="flex items-start justify-between gap-2">
                <ColorSwatchRow
                  value={activeAnnotation.color}
                  onPick={(color) =>
                    handleChangeColor(activeAnnotation.id, color)
                  }
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={t("edit")}
                    onClick={() => {
                      setEditDraft(activeAnnotation.body);
                      setEditingId(activeAnnotation.id);
                    }}
                    className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("delete")}
                    onClick={() => handleDelete(activeAnnotation.id)}
                    className="flex size-6 items-center justify-center rounded text-secondary hover:bg-warning/10 hover:text-warning"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectionAnchor && !addingNote && (
        <button
          type="button"
          data-annotation-ui
          onClick={() => setAddingNote(true)}
          className="absolute z-20 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 font-ui text-xs font-medium text-white shadow-md"
          style={{
            top: Math.max(0, selectionPos!.top - 32),
            left: selectionPos!.left,
          }}
        >
          <MessageSquarePlus className="size-3" aria-hidden="true" />
          {t("addNote")}
        </button>
      )}

      {selectionAnchor && addingNote && (
        <div
          data-annotation-ui
          className="absolute z-20 w-64 rounded-lg border border-border bg-surface-raised p-3 shadow-md"
          style={{
            top: Math.max(0, selectionPos!.top - 8),
            left: selectionPos!.left,
          }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 flex-1 truncate font-ui text-xs text-secondary italic">
                &ldquo;{selectionAnchor.exact}&rdquo;
              </span>
              <button
                type="button"
                aria-label={t("cancel")}
                onClick={() => {
                  setAddingNote(false);
                  setSelectionAnchor(null);
                  setNoteDraft("");
                  setNoteColor(DEFAULT_COLOR);
                }}
                className="shrink-0 text-secondary hover:text-primary"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            <textarea
              autoFocus
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder={t("notePlaceholder")}
              rows={3}
              className="rounded-md border border-border bg-surface px-2 py-1.5 font-ui text-sm text-primary outline-none focus:border-accent"
            />
            <div className="flex items-center justify-between gap-2">
              <ColorSwatchRow value={noteColor} onPick={setNoteColor} />
              <button
                type="button"
                disabled={saving || !noteDraft.trim()}
                onClick={handleSaveNote}
                className="rounded-full bg-accent px-3 py-1 font-ui text-xs font-medium text-white disabled:opacity-50"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
