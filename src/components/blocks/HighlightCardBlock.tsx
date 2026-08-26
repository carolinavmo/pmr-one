"use client";

import { useRef, useState } from "react";
import { Star, Palette, ImagePlus, X } from "lucide-react";
import type { HighlightCardBlock } from "@/lib/editorial-blocks";
import { EditableText } from "@/components/ui/EditableText";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { useEditMode } from "@/components/disease-page/EditMode";
import {
  updateBlockTextAction,
  updateBlockRichTextAction,
  setBlockCardColorAction,
  uploadHighlightCardImageAction,
  removeHighlightCardImageAction,
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
  const [imageUrl, setImageUrl] = useState(block.imageUrl);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const color = block.color ?? "accent";
  const textAlign = block.layout?.textAlign ?? "left";
  const textVerticalAlign = block.layout?.textVerticalAlign ?? "top";

  const handleImageFile = async (file: File) => {
    setUploadingImage(true);
    const formData = new FormData();
    formData.set("file", file);
    try {
      await uploadHighlightCardImageAction(block.id, formData);
      setImageUrl(URL.createObjectURL(file));
    } finally {
      setUploadingImage(false);
    }
  };

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
      {editing ? (
        <div>
          {imageUrl ? (
            <div className="relative overflow-hidden rounded-md">
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary asset URL, no fixed remote-pattern domain configured yet (same reasoning as KnowledgeObjectCard). */}
              <img src={imageUrl} alt="" className="w-full object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => {
                  setImageUrl(undefined);
                  removeHighlightCardImageAction(block.id);
                }}
                className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-surface-raised text-secondary shadow-sm hover:text-warning"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploadingImage}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 font-ui text-xs text-secondary hover:border-accent hover:text-accent disabled:opacity-50"
            >
              <ImagePlus className="size-3" aria-hidden="true" />
              {uploadingImage ? "Uploading…" : "Add image"}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        imageUrl && (
          <div className="overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary asset URL, no fixed remote-pattern domain configured yet (same reasoning as KnowledgeObjectCard). */}
            <img src={imageUrl} alt={block.imageAlt ?? ""} className="w-full object-cover" />
          </div>
        )
      )}
      <RichEditableText
        as="p"
        className={`font-reading text-base leading-5 text-primary ${TEXT_ALIGN_CLASS[textAlign]}`}
        value={block.text}
        onSave={(value) => updateBlockRichTextAction(block.id, "text", value)}
        placeholder="Highlight text…"
        block={block}
        diseaseSlug={diseaseSlug}
      />
    </div>
  );
}
