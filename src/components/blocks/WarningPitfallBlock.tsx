"use client";

import { useState } from "react";
import { AlertTriangle, Palette } from "lucide-react";
import type { WarningPitfallBlock } from "@/lib/editorial-blocks";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateBlockRichTextAction, setBlockCardColorAction } from "@/lib/actions/authoring";
import { CARD_COLOR_CARD, CARD_COLOR_TEXT } from "@/lib/card-colors";
import { TEXT_ALIGN_CLASS, ROW_ITEMS_CLASS } from "@/lib/block-alignment";

// Uses the warning color by default — VISUAL_IDENTITY.md's tokens
// reserve it for genuinely red-flag content, and a clinical pitfall
// ("this common mistake causes real harm") is exactly that, unlike
// the softer amber used for a contributing-factor glyph or a pearl.
// #133 made this an author-overridable default, not a removal of the
// warning-first framing — a block with no explicit `color` still opens
// warning-red exactly as before.
export function WarningPitfallBlockView({
  block,
  diseaseSlug,
}: {
  block: WarningPitfallBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const hasCustomColor = Boolean(block.color);
  const color = block.color ?? "neutral";
  const cardClass = hasCustomColor ? CARD_COLOR_CARD[color] : "border-warning/40 bg-warning/5";
  const textClass = hasCustomColor ? CARD_COLOR_TEXT[color] : "text-warning";
  const textAlign = block.layout?.textAlign ?? "left";
  const textVerticalAlign = block.layout?.textVerticalAlign ?? "top";

  return (
    <div className={`relative flex gap-3 rounded-lg border p-3 ${cardClass} ${ROW_ITEMS_CLASS[textVerticalAlign]}`}>
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
      <AlertTriangle className={`size-5 shrink-0 ${textClass}`} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`font-ui text-xs font-medium ${textClass}`}>Pitfall</span>
        <RichEditableText
          as="p"
          className={`font-reading text-base leading-6 text-primary ${TEXT_ALIGN_CLASS[textAlign]}`}
          value={block.text}
          onSave={async (html) => updateBlockRichTextAction(block.id, "text", html)}
          block={block}
          diseaseSlug={diseaseSlug}
        />
      </div>
    </div>
  );
}
