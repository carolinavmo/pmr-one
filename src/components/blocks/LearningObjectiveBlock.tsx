"use client";

import { useState } from "react";
import { Target, Palette } from "lucide-react";
import type { LearningObjectiveBlock } from "@/lib/editorial-blocks";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateBlockRichTextAction, setBlockCardColorAction } from "@/lib/actions/authoring";
import { CARD_COLOR_CARD, CARD_COLOR_TEXT } from "@/lib/card-colors";
import { TEXT_ALIGN_CLASS, ROW_ITEMS_CLASS } from "@/lib/block-alignment";

// A standalone version of the same "Learning objective:" treatment a
// paragraph callout already carries inline (ParagraphBlock.learningObjective)
// — for when the objective deserves its own line rather than riding
// along a paragraph. Neutral by default; colorable per #133.
export function LearningObjectiveBlockView({
  block,
  diseaseSlug,
}: {
  block: LearningObjectiveBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const color = block.color ?? "neutral";
  const textAlign = block.layout?.textAlign ?? "left";
  const textVerticalAlign = block.layout?.textVerticalAlign ?? "top";

  return (
    <div className={`relative flex gap-3 rounded-lg border p-3 ${CARD_COLOR_CARD[color]} ${ROW_ITEMS_CLASS[textVerticalAlign]}`}>
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
      <Target className={`size-5 shrink-0 ${color === "neutral" ? "text-secondary" : CARD_COLOR_TEXT[color]}`} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`font-ui text-xs font-medium ${color === "neutral" ? "text-secondary" : CARD_COLOR_TEXT[color]}`}>
          Learning objective
        </span>
        <RichEditableText
          as="p"
          className={`font-reading text-base text-primary ${TEXT_ALIGN_CLASS[textAlign]}`}
          value={block.text}
          onSave={async (html) => updateBlockRichTextAction(block.id, "text", html)}
          block={block}
          diseaseSlug={diseaseSlug}
        />
      </div>
    </div>
  );
}
