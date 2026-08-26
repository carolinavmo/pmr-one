"use client";

import { useRef, useState } from "react";
import { Star, Palette, ImagePlus, X, PanelTop, PanelLeft, PanelRight, Maximize2 } from "lucide-react";
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
  setHighlightCardImagePositionAction,
  setHighlightCardImageWidthAction,
} from "@/lib/actions/authoring";
import { CARD_COLOR_CARD, CARD_COLOR_CHIP, CARD_COLOR_TEXT } from "@/lib/card-colors";
import { TEXT_ALIGN_CLASS, ROW_ITEMS_CLASS } from "@/lib/block-alignment";

type ImagePosition = NonNullable<HighlightCardBlock["imagePosition"]>;
type ImageWidth = NonNullable<HighlightCardBlock["imageWidth"]>;

const POSITION_OPTIONS: { value: ImagePosition; label: string; icon: typeof PanelTop }[] = [
  { value: "top", label: "Image above text", icon: PanelTop },
  { value: "left", label: "Image left of text", icon: PanelLeft },
  { value: "right", label: "Image right of text", icon: PanelRight },
];

// Same 6-value scale as MedicalIllustrationBlock/OverviewBlock/
// SimpleImageBlock's own width control — one shared vocabulary.
const WIDTH_OPTIONS: { value: ImageWidth; label: string }[] = [
  { value: "1/4", label: "25%" },
  { value: "1/3", label: "33%" },
  { value: "1/2", label: "50%" },
  { value: "2/3", label: "66%" },
  { value: "3/4", label: "75%" },
  { value: "full", label: "100%" },
];

const imageWidthClass: Record<ImageWidth, string> = {
  "1/4": "w-1/4",
  "1/3": "w-1/3",
  "1/2": "w-1/2",
  "2/3": "w-2/3",
  "3/4": "w-3/4",
  full: "w-full",
};

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
  const [imagePosition, setImagePosition] = useState<ImagePosition>(block.imagePosition ?? "top");
  const [imageWidth, setImageWidth] = useState<ImageWidth | undefined>(block.imageWidth);
  const [widthOpen, setWidthOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const color = block.color ?? "accent";
  const textAlign = block.layout?.textAlign ?? "left";
  const textVerticalAlign = block.layout?.textVerticalAlign ?? "top";
  const isSideBySide = imagePosition !== "top";
  // No stored width yet → a position-appropriate default (full for a
  // banner-style top image, a quarter for a side-by-side thumbnail) so
  // switching position alone still looks right before an author ever
  // opens the width picker.
  const effectiveWidth: ImageWidth = imageWidth ?? (isSideBySide ? "1/4" : "full");

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

  const labelRow = (
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
  );

  const bodyText = (
    <RichEditableText
      as="p"
      className={`font-reading text-base leading-5 text-primary ${TEXT_ALIGN_CLASS[textAlign]}`}
      value={block.text}
      onSave={(value) => updateBlockRichTextAction(block.id, "text", value)}
      placeholder="Highlight text…"
      block={block}
      diseaseSlug={diseaseSlug}
    />
  );

  // Positioning/sizing only matter once an image exists — no point
  // offering either on an empty upload prompt.
  const imageControls = editing && imageUrl && (
    <div className="flex items-center gap-1">
      {POSITION_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={imagePosition === value}
          onClick={() => {
            setImagePosition(value);
            setHighlightCardImagePositionAction(block.id, value);
          }}
          className={`flex size-6 items-center justify-center rounded transition-colors duration-base ${
            imagePosition === value
              ? "bg-surface-raised text-primary"
              : "text-secondary hover:bg-surface-raised hover:text-primary"
          }`}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setWidthOpen((open) => !open)}
          aria-label="Image width"
          className="flex items-center gap-0.5 rounded px-1 py-0.5 font-ui text-xs text-secondary hover:bg-surface-raised hover:text-primary"
        >
          <Maximize2 className="size-3" aria-hidden="true" />
          {WIDTH_OPTIONS.find((o) => o.value === effectiveWidth)?.label}
        </button>
        {widthOpen && (
          <div className="absolute top-6 left-0 z-10 w-36 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
            <div className="flex flex-wrap gap-1">
              {WIDTH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setWidthOpen(false);
                    setImageWidth(option.value);
                    setHighlightCardImageWidthAction(block.id, option.value);
                  }}
                  className={`rounded border px-1.5 py-1 font-ui text-xs ${
                    effectiveWidth === option.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-secondary hover:border-accent hover:text-accent"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const imageSizeClass = `${imageWidthClass[effectiveWidth]} ${
    isSideBySide ? "shrink-0" : effectiveWidth !== "full" ? "mx-auto" : ""
  }`;

  const imageBlock = editing ? (
    <div className={`flex flex-col gap-1.5 ${isSideBySide ? "shrink-0" : ""}`}>
      {imageUrl ? (
        <div className={`relative overflow-hidden rounded-md ${imageSizeClass}`}>
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
          className="inline-flex w-fit items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 font-ui text-xs text-secondary hover:border-accent hover:text-accent disabled:opacity-50"
        >
          <ImagePlus className="size-3" aria-hidden="true" />
          {uploadingImage ? "Uploading…" : "Add image"}
        </button>
      )}
      {imageControls}
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
      <div className={`overflow-hidden rounded-md ${imageSizeClass}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary asset URL, no fixed remote-pattern domain configured yet (same reasoning as KnowledgeObjectCard). */}
        <img src={imageUrl} alt={block.imageAlt ?? ""} className="w-full object-cover" />
      </div>
    )
  );

  const textColumn = (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {labelRow}
      {!isSideBySide && imageBlock}
      {bodyText}
    </div>
  );

  return (
    <div
      className={`relative flex rounded-lg border p-3 ${
        isSideBySide ? "flex-row items-start gap-3" : "flex-col gap-1.5"
      } ${CARD_COLOR_CARD[color]} ${ROW_ITEMS_CLASS[textVerticalAlign]}`}
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
      {isSideBySide && imagePosition === "left" && imageBlock}
      {isSideBySide ? textColumn : (
        <>
          {labelRow}
          {imageBlock}
          {bodyText}
        </>
      )}
      {isSideBySide && imagePosition === "right" && imageBlock}
    </div>
  );
}
