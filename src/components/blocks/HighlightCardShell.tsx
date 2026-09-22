"use client";

import { useRef, useState } from "react";
import {
  Star,
  Palette,
  ImagePlus,
  X,
  PanelTop,
  PanelLeft,
  PanelRight,
  Maximize2,
  Crosshair,
  Crop,
  Shrink,
  Expand,
} from "lucide-react";
import type { HighlightCardBlock, HighlightCardV2Block, HighlightCardV3Block } from "@/lib/editorial-blocks";
import { EditableText } from "@/components/ui/EditableText";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { ZoomableImage } from "@/components/ui/ZoomableImage";
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
  setHighlightCardImageFocalPointAction,
  setHighlightCardImageFitAction,
} from "@/lib/actions/authoring";
import { CARD_COLOR_TINT, CARD_COLOR_MID, CARD_COLOR_CHIP, CARD_COLOR_TEXT } from "@/lib/card-colors";
import { TEXT_ALIGN_CLASS, ROW_ITEMS_CLASS } from "@/lib/block-alignment";
import { FOCAL_POINT_OPTIONS, FOCAL_POINT_CLASS, type ImageFocalPoint } from "@/lib/image-focal-point";

// The three chrome variants (design/CARDS-VARIANTS-SPEC.md): "tint" is
// today's Highlight Card (solid pastel fill, no border, label inline
// above the body) — kept exactly as-is. "header" (S7) moves the label
// into a full-width, slightly-deeper-tinted strip across the top.
// "framed" (S8) wraps a white (surface-card) centre in a tinted 5px
// mount, outer radius 18px / inner 14px.
export type HighlightCardChrome = "tint" | "header" | "framed";

// Every field the three sibling block types (HighlightCardBlock/V2/V3)
// share — same authoring, same blockId-keyed actions, only the CSS
// shell each renders through differs. Structural typing, not an
// explicit union, so any of the three satisfies this without a cast.
type AnyHighlightCard = HighlightCardBlock | HighlightCardV2Block | HighlightCardV3Block;

type ImagePosition = NonNullable<AnyHighlightCard["imagePosition"]>;
type ImageWidth = NonNullable<AnyHighlightCard["imageWidth"]>;
type ImageFit = NonNullable<AnyHighlightCard["imageFit"]>;

// Same three-way cover/contain/original vocabulary as
// SimpleImageBlock's own FIT_OPTIONS — "cover"/"contain" both keep the
// fixed 4:3 box (so the card's image still reads as the same size as
// every other one), just cropped vs. letterboxed; "original" gives up
// that consistency for the image's own natural aspect ratio.
const FIT_OPTIONS: { value: ImageFit; label: string; icon: typeof Crop }[] = [
  { value: "cover", label: "Crop to fill", icon: Crop },
  { value: "contain", label: "Fit inside, no crop (letterboxed)", icon: Shrink },
  { value: "original", label: "Natural size, no fixed box", icon: Expand },
];

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
// locked to one color or chrome. Icon is fixed to Star (matches the
// reference exactly); a picker can be added later if that's ever
// asked for. Shared by HighlightCardBlock/V2/V3 — only `chrome` (and
// the wrapper JSX at the bottom) differs between them.
export function HighlightCardShell({
  block,
  diseaseSlug,
  isSignedIn = false,
  chrome,
}: {
  block: AnyHighlightCard;
  diseaseSlug: string;
  isSignedIn?: boolean;
  chrome: HighlightCardChrome;
}) {
  const { editing } = useEditMode();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState(block.imageUrl);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePosition, setImagePosition] = useState<ImagePosition>(block.imagePosition ?? "top");
  const [imageWidth, setImageWidth] = useState<ImageWidth | undefined>(block.imageWidth);
  const [widthOpen, setWidthOpen] = useState(false);
  const [imageFocalPoint, setImageFocalPoint] = useState<ImageFocalPoint>(block.imageFocalPoint ?? "center");
  const [focalPointOpen, setFocalPointOpen] = useState(false);
  const [imageFit, setImageFit] = useState<ImageFit>(block.imageFit ?? "cover");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const color = block.color ?? "accent";
  const textAlign = block.layout?.textAlign ?? "left";
  const textVerticalAlign = block.layout?.textVerticalAlign ?? "top";
  const isSideBySide = imagePosition !== "top";
  const isCover = imageFit === "cover";
  // "cover"/"contain" both keep the fixed 4:3 box; "original" drops it
  // for the image's own natural height.
  const boxAspectClass = imageFit !== "original" ? "aspect-[4/3]" : "";
  const imgFitClass = isCover
    ? `size-full object-cover ${FOCAL_POINT_CLASS[imageFocalPoint]}`
    : imageFit === "contain"
      ? "size-full object-contain"
      : "w-full";
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

  const labelText = (
    <EditableText
      as="span"
      multiline={false}
      className={`font-ui text-[11px] font-black tracking-[1.6px] uppercase ${CARD_COLOR_TEXT[color]}`}
      value={block.label}
      onSave={(value) => updateBlockTextAction(block.id, "label", value)}
    />
  );

  // "header" chrome puts the label in its own full-width strip
  // (assembled directly in the wrapper below), so this row is only
  // used by "tint"/"framed", both of which show the icon chip inline
  // beside the label.
  const labelRow = (
    <div className="flex items-center gap-2">
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[color]}`}
      >
        <Star className="size-3.5" aria-hidden="true" />
      </span>
      {labelText}
    </div>
  );

  const bodyText = (
    <RichEditableText
      as="p"
      className={`font-reading text-base text-primary ${TEXT_ALIGN_CLASS[textAlign]}`}
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
    <div className="flex flex-wrap items-center gap-1">
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
      {isCover && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setFocalPointOpen((open) => !open)}
            aria-label="Image focal point"
            className="flex items-center gap-0.5 rounded px-1 py-0.5 font-ui text-xs text-secondary hover:bg-surface-raised hover:text-primary"
          >
            <Crosshair className="size-3" aria-hidden="true" />
          </button>
          {focalPointOpen && (
            <div className="absolute top-6 left-0 z-10 w-36 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
              <div className="grid grid-cols-3 gap-1">
                {FOCAL_POINT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    aria-label={option.label}
                    onClick={() => {
                      setFocalPointOpen(false);
                      setImageFocalPoint(option.value);
                      setHighlightCardImageFocalPointAction(block.id, option.value);
                    }}
                    className={`flex size-8 items-center justify-center rounded border ${
                      imageFocalPoint === option.value
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        imageFocalPoint === option.value ? "bg-accent" : "bg-secondary/50"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-0.5 rounded border border-border p-0.5">
        {FIT_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={imageFit === value}
            onClick={() => {
              setImageFit(value);
              setHighlightCardImageFitAction(block.id, value);
            }}
            className={`flex size-6 items-center justify-center rounded transition-colors duration-base ${
              imageFit === value
                ? "bg-accent/10 text-accent"
                : "text-secondary hover:bg-border/40 hover:text-primary"
            }`}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );

  const imageSizeClass = `${imageWidthClass[effectiveWidth]} ${
    isSideBySide ? "shrink-0" : effectiveWidth !== "full" ? "mx-auto" : ""
  }`;

  const imageBlock = editing ? (
    <div className={`flex flex-col gap-1.5 ${imageSizeClass}`}>
      {imageUrl ? (
        <div className={`relative ${boxAspectClass} overflow-hidden rounded-md w-full`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary asset URL, no fixed remote-pattern domain configured yet (same reasoning as KnowledgeObjectCard). */}
          <img src={imageUrl} alt="" className={imgFitClass} />
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
      <div className={`${boxAspectClass} overflow-hidden rounded-md ${imageSizeClass}`}>
        <ZoomableImage src={imageUrl} alt={block.imageAlt ?? ""} enabled={isSignedIn}>
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary asset URL, no fixed remote-pattern domain configured yet (same reasoning as KnowledgeObjectCard). */}
          <img src={imageUrl} alt={block.imageAlt ?? ""} className={imgFitClass} />
        </ZoomableImage>
      </div>
    )
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

  // The image+text layout, side-by-side aware — identical across all
  // three chrome variants; only where the label sits (inline above
  // this, in "tint"/"framed", vs. in its own strip above this whole
  // block, in "header") and the outer wrapper differ.
  const content = isSideBySide ? (
    <>
      {imagePosition === "left" && imageBlock}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">{bodyText}</div>
      {imagePosition === "right" && imageBlock}
    </>
  ) : (
    <>
      {imageBlock}
      {bodyText}
    </>
  );

  const rowClass = isSideBySide
    ? "flex-row items-center gap-3"
    : `flex-col gap-1.5 ${ROW_ITEMS_CLASS[textVerticalAlign]}`;

  if (chrome === "header") {
    return (
      <div className={`relative overflow-hidden rounded-[13px] ${CARD_COLOR_TINT[color]}`}>
        {colorButton}
        <div className={`flex items-center gap-2 px-4 py-2.5 ${CARD_COLOR_MID[color]}`}>
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[color]}`}
          >
            <Star className="size-3.5" aria-hidden="true" />
          </span>
          {labelText}
        </div>
        <div className={`flex p-4 ${rowClass}`}>{content}</div>
      </div>
    );
  }

  if (chrome === "framed") {
    return (
      <div className={`rounded-[18px] p-[5px] ${CARD_COLOR_MID[color]}`}>
        <div className={`relative flex rounded-[14px] bg-surface-card p-4 ${rowClass}`}>
          {colorButton}
          {isSideBySide ? (
            <>
              {imagePosition === "left" && imageBlock}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {labelRow}
                {bodyText}
              </div>
              {imagePosition === "right" && imageBlock}
            </>
          ) : (
            <>
              {labelRow}
              {imageBlock}
              {bodyText}
            </>
          )}
        </div>
      </div>
    );
  }

  // "tint" — today's Highlight Card, unchanged.
  return (
    <div className={`relative flex rounded-[13px] p-4 ${rowClass} ${CARD_COLOR_TINT[color]}`}>
      {colorButton}
      {isSideBySide ? (
        <>
          {imagePosition === "left" && imageBlock}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {labelRow}
            {bodyText}
          </div>
          {imagePosition === "right" && imageBlock}
        </>
      ) : (
        <>
          {labelRow}
          {imageBlock}
          {bodyText}
        </>
      )}
    </div>
  );
}
