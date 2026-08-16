"use client";

import { useState } from "react";
import { Quote, Bookmark, Palette } from "lucide-react";
import type { ClinicalPearlBlock } from "@/lib/editorial-blocks";
import { toggleSavedPearlAction } from "@/lib/actions/workspace";
import { updatePearlBodyAction, setBlockCardColorAction } from "@/lib/actions/authoring";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { useEditMode } from "@/components/disease-page/EditMode";
import { CARD_COLOR_CARD } from "@/lib/card-colors";
import { TEXT_ALIGN_CLASS, COLUMN_JUSTIFY_CLASS } from "@/lib/block-alignment";

// Quote-card treatment: a large quote-mark icon top-left, the pearl
// itself set as italicized quoted text, attribution and the bookmark
// sharing a footer row (attribution left, bookmark right) rather than
// the icon/bookmark flanking the text in one row. Keeps the same
// insight-amber language used on the Pearl Card (Tier 2) — evidence
// level is deliberately lower tier than verified content, signaled by
// color, never hidden — just rearranged into this layout.
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
  const textAlign = block.layout?.textAlign ?? "left";
  const textVerticalAlign = block.layout?.textVerticalAlign ?? "top";
  // Insight-amber by default (the Pearl Card's own reused language),
  // author-overridable per #133 — a card with no explicit `color`
  // renders exactly as it always did.
  const cardClass = block.color ? CARD_COLOR_CARD[block.color] : "border-insight/30 bg-insight/5";

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

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-lg border p-4 ${cardClass} ${COLUMN_JUSTIFY_CLASS[textVerticalAlign]}`}
    >
      {editing && (
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
      )}
      {editing && block.pearl.attachmentCount > 1 && (
        <span className="font-ui text-xs font-medium text-warning">
          Used on {block.pearl.attachmentCount - 1} other{" "}
          {block.pearl.attachmentCount - 1 === 1 ? "page" : "pages"} — editing
          changes it everywhere.
        </span>
      )}
      <Quote className="size-6 shrink-0 text-insight/70" aria-hidden="true" />
      <RichEditableText
        as="p"
        className={`font-reading text-base leading-5 text-primary italic ${TEXT_ALIGN_CLASS[textAlign]}`}
        value={block.pearl.body}
        onSave={(value) => updatePearlBodyAction(block.pearl.id, value)}
        block={block}
        diseaseSlug={diseaseSlug}
      />
      {(block.pearl.attribution || bookmarkButton) && (
        <div className="flex items-center justify-between gap-2">
          <span className="font-ui text-sm text-secondary">{block.pearl.attribution}</span>
          {bookmarkButton}
        </div>
      )}
    </div>
  );
}
