"use client";

import { useState } from "react";
import { Bookmark, Palette } from "lucide-react";
import type { ClinicalPearlBlock } from "@/lib/editorial-blocks";
import { toggleSavedPearlAction } from "@/lib/actions/workspace";
import { updatePearlBodyAction, setBlockCardColorAction } from "@/lib/actions/authoring";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { useEditMode } from "@/components/disease-page/EditMode";
import { CARD_COLOR_TINT, CARD_COLOR_TEXT } from "@/lib/card-colors";
import { TEXT_ALIGN_CLASS, COLUMN_JUSTIFY_CLASS } from "@/lib/block-alignment";

// A solid pastel fill with no border, bold uppercase tracked label —
// same unified card look HighlightCardBlock and Paragraph's own
// callout style share, all reading the same CARD_COLOR_TINT/TEXT
// pair. Defaults to "insight" (amber) unset, matching the pearl's
// established identity (REDESIGN-NOTES.md: "Amber = pearl across the
// whole system"), but is a normal author-editable color like every
// other card from the start — no separate fixed-until-overridden
// state to fall back to.
//
// `workspaceContext` is only present when a session exists (threaded
// from the page through BlockSequence/BlockRenderer) — signed-out
// readers see the pearl exactly as before, no save control at all.
export function ClinicalPearlBlockView({
  block,
  workspaceContext,
  diseaseSlug,
}: {
  block: ClinicalPearlBlock;
  workspaceContext?: { diseaseSlug: string; savedPearlIds: Set<string> };
  diseaseSlug: string;
}) {
  const isSaved = workspaceContext?.savedPearlIds.has(block.pearl.id) ?? false;
  const { editing } = useEditMode();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const color = block.color ?? "insight";
  const textAlign = block.layout?.textAlign ?? "left";
  const textVerticalAlign = block.layout?.textVerticalAlign ?? "top";

  const bookmarkButton = workspaceContext && (
    <form action={toggleSavedPearlAction}>
      <input type="hidden" name="pearlId" value={block.pearl.id} />
      <input type="hidden" name="diseaseSlug" value={workspaceContext.diseaseSlug} />
      <button
        type="submit"
        aria-pressed={isSaved}
        aria-label={isSaved ? "Remove from Saved Pearls" : "Save to Workspace"}
        className="shrink-0 text-secondary transition-colors duration-base hover:text-accent"
      >
        <Bookmark
          className={`size-5 ${isSaved ? "fill-accent text-accent" : ""}`}
          aria-hidden="true"
        />
      </button>
    </form>
  );

  const colorButton = editing && (
    <div className="absolute top-2 right-2">
      <button
        type="button"
        aria-label="Card color"
        onClick={() => setColorPickerOpen((open) => !open)}
        className="flex size-7 items-center justify-center rounded-full bg-surface-raised text-secondary shadow-sm hover:text-primary"
      >
        <Palette className="size-3.5" aria-hidden="true" />
      </button>
      {colorPickerOpen && (
        <ColorSwatchPicker
          onPick={(next) => {
            setColorPickerOpen(false);
            setBlockCardColorAction(block.id, next);
          }}
        />
      )}
    </div>
  );

  const usageNotice = editing && block.pearl.attachmentCount > 1 && (
    <span className="font-ui text-xs font-medium text-warning">
      Used on {block.pearl.attachmentCount - 1} other{" "}
      {block.pearl.attachmentCount - 1 === 1 ? "page" : "pages"} — editing
      changes it everywhere.
    </span>
  );

  const body = (
    <RichEditableText
      as="p"
      className={`font-reading text-base text-primary italic ${TEXT_ALIGN_CLASS[textAlign]}`}
      value={block.pearl.body}
      onSave={(value) => updatePearlBodyAction(block.pearl.id, value)}
      block={block}
      diseaseSlug={diseaseSlug}
    />
  );

  const footer = (block.pearl.attribution || bookmarkButton) && (
    <div className="flex items-center justify-between gap-2">
      <span className="font-ui text-sm text-secondary">{block.pearl.attribution}</span>
      {bookmarkButton}
    </div>
  );

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-[13px] p-4 ${CARD_COLOR_TINT[color]} ${COLUMN_JUSTIFY_CLASS[textVerticalAlign]}`}
    >
      {colorButton}
      {usageNotice}
      <span className={`font-ui text-[11px] font-black tracking-[1.6px] uppercase ${CARD_COLOR_TEXT[color]}`}>
        Clinical Pearl
      </span>
      {body}
      {footer}
    </div>
  );
}
