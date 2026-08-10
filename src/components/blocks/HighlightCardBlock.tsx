"use client";

import { useState } from "react";
import { Star, Palette } from "lucide-react";
import type { HighlightCardBlock } from "@/lib/editorial-blocks";
import { EditableText } from "@/components/ui/EditableText";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { useEditMode } from "@/components/disease-page/EditMode";
import {
  updateBlockTextAction,
  updateBlockRichTextAction,
  setBlockCardColorAction,
} from "@/lib/actions/authoring";
import { CARD_COLOR_CARD, CARD_COLOR_CHIP, CARD_COLOR_TEXT } from "@/lib/card-colors";
import { TEXT_ALIGN_CLASS, ROW_ITEMS_CLASS } from "@/lib/block-alignment";

// The founder's own "Key Takeaway" reference (#133) generalized into a
// standalone, insertable block — icon chip + editable eyebrow label +
// bold body text in a colorable card, same visual language as
// OverviewBlock's fixed takeaway sub-card, but usable anywhere and not
// locked to one color. Icon is fixed to Star (matches the reference
// exactly); a picker can be added later if that's ever asked for.
export function HighlightCardBlockView({
  block,
  diseaseSlug,
}: {
  block: HighlightCardBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const color = block.color ?? "accent";
  const textAlign = block.layout?.textAlign ?? "left";
  const textVerticalAlign = block.layout?.textVerticalAlign ?? "top";

  return (
    <div
      className={`relative flex flex-col gap-1.5 rounded-lg border p-3 ${CARD_COLOR_CARD[color]} ${ROW_ITEMS_CLASS[textVerticalAlign]}`}
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
      <div className="flex items-center gap-2">
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[color]}`}
        >
          <Star className="size-3.5" aria-hidden="true" />
        </span>
        <EditableText
          as="span"
          multiline={false}
          className={`font-ui text-xs font-semibold ${CARD_COLOR_TEXT[color]}`}
          value={block.label}
          onSave={(value) => updateBlockTextAction(block.id, "label", value)}
        />
      </div>
      <RichEditableText
        as="p"
        className={`font-reading text-sm leading-5 font-medium text-primary ${TEXT_ALIGN_CLASS[textAlign]}`}
        value={block.text}
        onSave={(value) => updateBlockRichTextAction(block.id, "text", value)}
        placeholder="Highlight text…"
        block={block}
        diseaseSlug={diseaseSlug}
      />
    </div>
  );
}
