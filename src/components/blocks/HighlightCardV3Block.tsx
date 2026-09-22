"use client";

import type { HighlightCardV3Block } from "@/lib/editorial-blocks";
import { HighlightCardShell } from "./HighlightCardShell";

// "framed" chrome (design/CARDS-VARIANTS-SPEC.md, S8) — a tinted 5px
// frame around a white (surface-card) centre, like a mount around a
// picture; outer radius 18px, inner 14px. Same authoring as
// HighlightCardBlock, a distinct block_type so editors can insert
// either chrome freely and compare them on a real page.
export function HighlightCardV3BlockView({
  block,
  diseaseSlug,
  isSignedIn = false,
}: {
  block: HighlightCardV3Block;
  diseaseSlug: string;
  isSignedIn?: boolean;
}) {
  return (
    <HighlightCardShell block={block} diseaseSlug={diseaseSlug} isSignedIn={isSignedIn} chrome="framed" />
  );
}
