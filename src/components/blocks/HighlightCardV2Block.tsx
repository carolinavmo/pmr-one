"use client";

import type { HighlightCardV2Block } from "@/lib/editorial-blocks";
import { HighlightCardShell } from "./HighlightCardShell";

// "header" chrome (design/CARDS-VARIANTS-SPEC.md, S7) — the label
// moves into a full-width, slightly-deeper-tinted strip across the
// top of the card; the body sits below it. Same authoring as
// HighlightCardBlock, a distinct block_type so editors can insert
// either chrome freely and compare them on a real page.
export function HighlightCardV2BlockView({
  block,
  diseaseSlug,
  isSignedIn = false,
}: {
  block: HighlightCardV2Block;
  diseaseSlug: string;
  isSignedIn?: boolean;
}) {
  return (
    <HighlightCardShell block={block} diseaseSlug={diseaseSlug} isSignedIn={isSignedIn} chrome="header" />
  );
}
