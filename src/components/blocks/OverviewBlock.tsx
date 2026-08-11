"use client";

import { useRef, useState } from "react";
import { ImagePlus, Settings2, Star, X } from "lucide-react";
import type { OverviewBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { TEXT_ALIGN_CLASS, COLUMN_JUSTIFY_CLASS } from "@/lib/block-alignment";
import {
  updateBlockRichTextAction,
  uploadOverviewImageAction,
  removeOverviewImageAction,
  setOverviewImageWidthAction,
  setOverviewImagePositionAction,
} from "@/lib/actions/authoring";

type ImageWidth = NonNullable<OverviewBlock["imageWidth"]>;
type ImagePosition = NonNullable<OverviewBlock["imagePosition"]>;

const WIDTH_OPTIONS: { value: ImageWidth; label: string }[] = [
  { value: "1/4", label: "25%" },
  { value: "1/3", label: "33%" },
  { value: "1/2", label: "50%" },
  { value: "2/3", label: "66%" },
  { value: "3/4", label: "75%" },
];

// The image column's share of the grid vs. the text column's — text
// always takes the remainder, since (unlike MedicalIllustrationBlock)
// there's no "full" option here; a full-width image would leave
// nowhere for the paragraph/takeaway column to go.
const GRID_COLS_CLASS: Record<ImageWidth, string> = {
  "1/4": "sm:grid-cols-[1fr_3fr]",
  "1/3": "sm:grid-cols-[1fr_2fr]",
  "1/2": "sm:grid-cols-[1fr_1fr]",
  "2/3": "sm:grid-cols-[2fr_1fr]",
  "3/4": "sm:grid-cols-[3fr_1fr]",
};

// 3x3 grid, top-left to bottom-right — a focal point, not a true
// freeform crop: which part of the image stays visible once
// `object-cover` fits it into the box. Literal Tailwind classes (the
// four corners need bracket-value arbitrary properties since
// `object-position`'s compound corner keywords aren't core utilities).
const POSITION_OPTIONS: { value: ImagePosition; label: string }[] = [
  { value: "top-left", label: "Top left" },
  { value: "top", label: "Top" },
  { value: "top-right", label: "Top right" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom", label: "Bottom" },
  { value: "bottom-right", label: "Bottom right" },
];

const OBJECT_POSITION_CLASS: Record<ImagePosition, string> = {
  "top-left": "object-[left_top]",
  top: "object-top",
  "top-right": "object-[right_top]",
  left: "object-left",
  center: "object-center",
  right: "object-right",
  "bottom-left": "object-[left_bottom]",
  bottom: "object-bottom",
  "bottom-right": "object-[right_bottom]",
};

// A disease's Overview-section summary card — a block-owned image on
// the left, a prose paragraph top-right, and a fixed "Key Takeaway"
// callout bottom-right (founder reference: a foot-anatomy
// illustration next to a Plantar Fasciopathy summary + takeaway).
// Image is owns-content (ImageComparisonBlock's local-disk upload
// path), not a shared Medical Illustration reference — specific to
// this one card, same reasoning as Image Comparison. The "Key
// Takeaway" label is fixed chrome, not authored text, same as
// KeyPointBlock hardcodes "Key point" — only the takeaway's body is
// editable. Text align (horizontal) and text vertical align both come
// from the same block-level `layout` fields/AlignmentPicker every
// other alignable prose block already uses — vertical align moves the
// paragraph+takeaway group together within the right column (relevant
// once the image is taller than the text), horizontal align applies
// to the prose text itself, not the fixed icon/label row above the
// takeaway.
export function OverviewBlockView({
  block,
  diseaseSlug,
}: {
  block: OverviewBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(block.imageUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const imageWidth = block.imageWidth ?? "1/3";
  const imagePosition = block.imagePosition ?? "center";
  const textAlign = block.layout?.textAlign ?? "left";
  const textVerticalAlign = block.layout?.textVerticalAlign ?? "top";

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.set("file", file);
    try {
      await uploadOverviewImageAction(block.id, formData);
      setImageUrl(URL.createObjectURL(file));
    } catch {
      setUploadError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  // A reader with no image gets a clean single-column card (no "No
  // image" placeholder shown) — an author mid-editing always sees the
  // upload slot so there's somewhere to click.
  const showImageColumn = editing || !!imageUrl;

  return (
    <div
      className={`grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface-card p-4 ${
        showImageColumn ? GRID_COLS_CLASS[imageWidth] : ""
      }`}
    >
      {showImageColumn && (
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-raised sm:aspect-auto">
          {imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- edit-mode upload preview briefly uses a blob: URL, which next/image can't render; decorative image, paragraph beside it already conveys the same information, so alt is intentionally empty rather than a made-up description. */}
              <img
                src={imageUrl}
                alt=""
                className={`size-full object-cover ${OBJECT_POSITION_CLASS[imagePosition]}`}
              />
              {editing && (
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => {
                    setImageUrl(undefined);
                    removeOverviewImageAction(block.id);
                  }}
                  className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-surface text-secondary shadow-sm hover:text-warning"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex size-full flex-col items-center justify-center gap-1.5 text-secondary hover:text-accent disabled:opacity-50"
            >
              <ImagePlus className="size-6" aria-hidden="true" />
              <span className="font-ui text-xs">{uploading ? "Uploading…" : "Upload image"}</span>
              {uploadError && <span className="font-ui text-xs text-warning">{uploadError}</span>}
            </button>
          )}
          {editing && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          )}
          {editing && imageUrl && (
            <div className="absolute top-2 left-2">
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                aria-label="Image settings"
                className="flex items-center gap-1 rounded-full bg-surface px-2 py-1 font-ui text-xs text-secondary shadow-sm hover:text-accent"
              >
                <Settings2 className="size-3.5" aria-hidden="true" />
              </button>
              {settingsOpen && (
                <div className="absolute top-7 left-0 z-10 w-44 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
                  <p className="px-0.5 pb-1 font-ui text-[10px] font-medium tracking-wide text-secondary uppercase">
                    Width
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {WIDTH_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setOverviewImageWidthAction(block.id, option.value)}
                        className={`rounded border px-2 py-1 font-ui text-xs ${
                          imageWidth === option.value
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-secondary hover:border-accent hover:text-accent"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <p className="px-0.5 pt-2 pb-1 font-ui text-[10px] font-medium tracking-wide text-secondary uppercase">
                    Focal point
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {POSITION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        title={option.label}
                        aria-label={option.label}
                        onClick={() => setOverviewImagePositionAction(block.id, option.value)}
                        className={`flex size-8 items-center justify-center rounded border ${
                          imagePosition === option.value
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            imagePosition === option.value ? "bg-accent" : "bg-secondary/50"
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
        </div>
      )}

      <div className={`flex min-w-0 flex-col gap-4 ${COLUMN_JUSTIFY_CLASS[textVerticalAlign]}`}>
        <RichEditableText
          as="p"
          className={`font-reading text-base leading-6 text-primary ${TEXT_ALIGN_CLASS[textAlign]}`}
          value={block.paragraph}
          onSave={(value) => updateBlockRichTextAction(block.id, "paragraph", value)}
          placeholder="Overview paragraph…"
          block={block}
          diseaseSlug={diseaseSlug}
          fieldKey="paragraph"
        />

        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Star className="size-3.5" aria-hidden="true" />
            </span>
            <span className="font-ui text-xs font-semibold text-accent">Key Takeaway</span>
          </div>
          <RichEditableText
            as="p"
            className={`mt-1.5 font-reading text-sm leading-5 text-secondary ${TEXT_ALIGN_CLASS[textAlign]}`}
            value={block.keyTakeaway}
            onSave={(value) => updateBlockRichTextAction(block.id, "keyTakeaway", value)}
            placeholder="Key takeaway…"
            block={block}
            diseaseSlug={diseaseSlug}
            fieldKey="keyTakeaway"
          />
        </div>
      </div>
    </div>
  );
}
