"use client";

import type { HighlightCardBlock } from "@/lib/editorial-blocks";
import { HighlightCardShell } from "./HighlightCardShell";

// "tint" chrome — solid pastel fill, no border, label inline above
// the body. See HighlightCardShell.tsx for the shared implementation
// (authoring, image upload, color picker) all three Highlight Card
// variants read from; only the chrome differs between them.
export function HighlightCardBlockView({
  block,
  diseaseSlug,
  isSignedIn = false,
}: {
  block: HighlightCardBlock;
  diseaseSlug: string;
  isSignedIn?: boolean;
}) {
  return (
    <HighlightCardShell block={block} diseaseSlug={diseaseSlug} isSignedIn={isSignedIn} chrome="tint" />
  );
}
