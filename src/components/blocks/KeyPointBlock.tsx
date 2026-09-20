"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import type { KeyPointBlock } from "@/lib/editorial-blocks";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateBlockRichTextAction, setBlockCardColorAction } from "@/lib/actions/authoring";
import { CARD_COLOR_CARD, CARD_COLOR_TEXT } from "@/lib/card-colors";
import { TEXT_ALIGN_CLASS, ROW_ITEMS_CLASS } from "@/lib/block-alignment";
import { KeyNumbersCallout } from "@/components/ui/callouts";

// DESIGN-BRIEF.md's Key Numbers callout (solid navy, "▣ KEY NUMBERS")
// is now the default — #133's author-overridable color is still
// honored when a block has an explicit `color`, falling back to the
// existing CARD_COLOR_CARD/TEXT palette exactly as before, same escape
// hatch every other card-color block keeps.
export function KeyPointBlockView({
  block,
  diseaseSlug,
}: {
  block: KeyPointBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const textAlign = block.layout?.textAlign ?? "left";
  const textVerticalAlign = block.layout?.textVerticalAlign ?? "top";

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

  if (block.color) {
    const color = block.color;
    return (
      <div
        className={`relative flex gap-3 rounded-lg border-2 p-3 ${CARD_COLOR_CARD[color]} ${ROW_ITEMS_CLASS[textVerticalAlign]}`}
      >
        {colorButton}
        <div className="flex flex-col gap-1">
          <span className={`font-ui text-xs font-medium ${color === "neutral" ? "text-secondary" : CARD_COLOR_TEXT[color]}`}>
            Key point
          </span>
          <RichEditableText
            as="p"
            className={`font-reading text-base leading-5 text-primary ${TEXT_ALIGN_CLASS[textAlign]}`}
            value={block.text}
            onSave={(value) => updateBlockRichTextAction(block.id, "text", value)}
            block={block}
            diseaseSlug={diseaseSlug}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {colorButton}
      <KeyNumbersCallout>
        <RichEditableText
          as="p"
          className={`font-reading text-base leading-5 text-[#D6DEEA] [&_b]:text-white [&_strong]:text-white ${TEXT_ALIGN_CLASS[textAlign]}`}
          value={block.text}
          onSave={(value) => updateBlockRichTextAction(block.id, "text", value)}
          block={block}
          diseaseSlug={diseaseSlug}
        />
      </KeyNumbersCallout>
    </div>
  );
}
