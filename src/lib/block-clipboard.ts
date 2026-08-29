import type { BlockLayout } from "@/lib/editorial-blocks";

// A block's clipboard entry — everything pasteBlockAction needs to
// recreate it elsewhere, deliberately NOT the resolved EditorialBlock
// shape (which varies per type and, for references-object blocks like
// Clinical Pearl, embeds the shared object's own data inline rather
// than its id). Read straight off the raw editorial_block row instead
// (getBlockForClipboardAction), so copy/paste round-trips exactly what
// the row actually stores regardless of block type.
export interface BlockClipboardEntry {
  blockType: string;
  referencedObjectType: string | null;
  referencedObjectId: string | null;
  contentConfig: unknown;
  // display_config.layout with `row`/`col` stripped — those group this
  // block with specific sibling ids at the copy site, which means
  // nothing (and shouldn't silently apply) anywhere else. Width/align/
  // textAlign etc. carry over since they're the block's own property,
  // not a relationship to other blocks.
  layout: Omit<BlockLayout, "row" | "col"> | null;
  label: string;
  copiedAt: number;
}

const KEY = "pmr-atlas:block-clipboard";

// localStorage (not sessionStorage/React state) is the point — it's
// what makes "paste on a different page" work at all, since a fresh
// page load has no memory of anything held in this tab's JS state.
// Wrapped in try/catch: private browsing / quota-exceeded throws on
// write, and a previous entry can be malformed JSON after a schema
// change — either way, copy/paste should silently no-op, never crash
// the page.
export function readBlockClipboard(): BlockClipboardEntry | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BlockClipboardEntry;
  } catch {
    return null;
  }
}

export function writeBlockClipboard(entry: Omit<BlockClipboardEntry, "copiedAt">) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...entry, copiedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}
