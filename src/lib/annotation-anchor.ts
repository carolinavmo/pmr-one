// Anchors a private annotation to a phrase of text, not a position —
// so it survives edits made anywhere else in the same block. Same
// model as the W3C Web Annotation "TextQuoteSelector" (and what
// hypothes.is/Medium's own highlighting use): store the selected text
// itself plus a little surrounding context, then re-locate that exact
// phrase in the block's *current* rendered text at read time. This is
// deliberately NOT raw character offsets (any edit before the phrase
// would shift them) and NOT a DOM node path (any markup change, e.g.
// wrapping a word in <strong> later, would break it) — a text-quote
// search is the one anchor shape that degrades gracefully instead of
// silently pointing at the wrong text.
//
// Pure functions only — no React, no server-only imports — so the
// tricky part (findQuoteOffsets, a plain string search) is trivially
// unit-testable without a DOM, and the DOM-touching parts
// (captureQuote/relocateQuote) are still framework-agnostic enough to
// call from any client component.

export interface QuoteAnchor {
  prefix: string;
  exact: string;
  suffix: string;
}

// Chars of surrounding context stored alongside the exact phrase —
// enough to disambiguate a short, repeated phrase ("10%", "the
// fascia") without ballooning storage for every highlight.
const CONTEXT_CHARS = 35;

// Plain-text character offset of a Range boundary point, relative to
// `container`'s own textContent. Uses the standard "pre-range" trick
// (construct a Range from the start of the container to the boundary
// point and measure its stringified length) rather than manually
// walking text nodes — this handles a boundary point sitting inside
// either a text node or an element node (e.g. right between two
// inline <span>s) correctly for free, which a hand-rolled TreeWalker
// offset calculation would need extra cases for.
function pointOffset(container: Node, node: Node, offset: number): number {
  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(node, offset);
  return preRange.toString().length;
}

function rangeToOffsets(
  container: HTMLElement,
  range: Range,
): { start: number; end: number } | null {
  if (!container.contains(range.commonAncestorContainer)) return null;
  const start = pointOffset(container, range.startContainer, range.startOffset);
  const end = pointOffset(container, range.endContainer, range.endOffset);
  return { start, end };
}

// (a) Capture — a live Selection Range the member just made, inside a
// specific block's rendered container, into a storable anchor.
// Returns null for a collapsed/whitespace-only "selection" (nothing
// worth annotating) or a Range outside `container` entirely.
export function captureQuote(container: HTMLElement, range: Range): QuoteAnchor | null {
  const offsets = rangeToOffsets(container, range);
  if (!offsets) return null;
  const { start, end } = offsets;
  if (end <= start) return null;

  const text = container.textContent ?? "";
  const exact = text.slice(start, end);
  if (!exact.trim()) return null;

  return {
    prefix: text.slice(Math.max(0, start - CONTEXT_CHARS), start),
    exact,
    suffix: text.slice(end, end + CONTEXT_CHARS),
  };
}

// (b) Search — locate a stored anchor within a block's *current*
// plain text. Tries the full prefix+exact+suffix first (resilient to
// the same short phrase appearing elsewhere in the block); falls back
// to the exact phrase alone (first occurrence) if nearby text has
// since changed; returns null if the phrase itself is gone — the
// caller treats that as "orphaned" for this render, not an error.
export function findQuoteOffsets(
  text: string,
  anchor: QuoteAnchor,
): { start: number; end: number } | null {
  if (!anchor.exact) return null;

  const withContext = anchor.prefix + anchor.exact + anchor.suffix;
  const contextIndex = text.indexOf(withContext);
  if (contextIndex !== -1) {
    const start = contextIndex + anchor.prefix.length;
    return { start, end: start + anchor.exact.length };
  }

  const exactIndex = text.indexOf(anchor.exact);
  if (exactIndex !== -1) {
    return { start: exactIndex, end: exactIndex + anchor.exact.length };
  }

  return null;
}

// (c) Relocate — the inverse of pointOffset: given plain-text offsets,
// walk the container's text nodes to find the real DOM positions and
// build a Range spanning them, so the match can be visually wrapped.
// Returns null if the container's text is shorter than the target
// offsets (a stale annotation on since-edited/shortened text) — same
// "orphaned" signal as findQuoteOffsets returning null.
function offsetsToRange(container: HTMLElement, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let total = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const length = node.textContent?.length ?? 0;
    const nextTotal = total + length;
    if (startNode === null && start <= nextTotal) {
      startNode = node as Text;
      startOffset = start - total;
    }
    if (endNode === null && end <= nextTotal) {
      endNode = node as Text;
      endOffset = end - total;
      break;
    }
    total = nextTotal;
  }

  if (!startNode || !endNode) return null;

  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}

// The composed convenience function every render-time caller actually
// uses: given a block's container and a stored anchor, either a live
// Range to wrap, or null (the caller renders no inline marker and
// reports this annotation as not-located).
export function relocateQuote(container: HTMLElement, anchor: QuoteAnchor): Range | null {
  const text = container.textContent ?? "";
  const offsets = findQuoteOffsets(text, anchor);
  if (!offsets) return null;
  return offsetsToRange(container, offsets.start, offsets.end);
}
