"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Maximize2 } from "lucide-react";
import type { SimpleImageBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { ZoomableImage } from "@/components/ui/ZoomableImage";
import { TEXT_ALIGN_CLASS } from "@/lib/block-alignment";
import {
  updateBlockRichTextAction,
  uploadSimpleImageAction,
  removeSimpleImageAction,
  setSimpleImageWidthAction,
} from "@/lib/actions/authoring";

type ImageWidth = NonNullable<SimpleImageBlock["imageWidth"]>;

// Same 6-value scale as MedicalIllustrationBlock/OverviewBlock's own
// image width control — one shared vocabulary across every block that
// offers this, not a fourth bespoke set of options.
const WIDTH_OPTIONS: { value: ImageWidth; label: string }[] = [
  { value: "1/4", label: "25%" },
  { value: "1/3", label: "33%" },
  { value: "1/2", label: "50%" },
  { value: "2/3", label: "66%" },
  { value: "3/4", label: "75%" },
  { value: "full", label: "100%" },
];

const imageWidthClass: Record<ImageWidth, string> = {
  "1/4": "w-1/4 mx-auto",
  "1/3": "w-1/3 mx-auto",
  "1/2": "w-1/2 mx-auto",
  "2/3": "w-2/3 mx-auto",
  "3/4": "w-3/4 mx-auto",
  full: "w-full",
};

// The lightest image block in the system (see editorial-blocks.ts's
// comment on the type) — just an image and a small caption line below
// it, styled the same `figure`/`figcaption`, `font-ui text-sm
// text-secondary` treatment MedicalIllustrationBlock's caption already
// established. Block position comes from the shared `layout` fields
// via AlignmentPicker (BlockControls.tsx's ALIGNABLE_TYPES); the
// image's own size within that column is `imageWidth`, the same
// picker MedicalIllustrationBlock/OverviewBlock already use.
export function SimpleImageBlockView({
  block,
  diseaseSlug,
  isSignedIn = false,
}: {
  block: SimpleImageBlock;
  diseaseSlug: string;
  isSignedIn?: boolean;
}) {
  const { editing } = useEditMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(block.imageUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState<ImageWidth>(block.imageWidth ?? "full");
  const [widthOpen, setWidthOpen] = useState(false);
  const caption = block.caption;
  const captionAlign = block.layout?.textAlign ?? "left";

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.set("file", file);
    try {
      await uploadSimpleImageAction(block.id, formData);
      setImageUrl(URL.createObjectURL(file));
    } catch {
      setUploadError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!editing) {
    // Same "an emptied-out block renders nothing" rule
    // MedicalIllustrationBlock's reader path already follows — an
    // author mid-editing (image removed, not yet replaced) is a
    // transient state, not something a reader should ever land on.
    if (!imageUrl) return null;
    return (
      <figure className="flex flex-col gap-2">
        <div className={`overflow-hidden rounded-lg ${imageWidthClass[imageWidth]}`}>
          <ZoomableImage src={imageUrl} alt={caption ?? ""} enabled={isSignedIn}>
            {/* eslint-disable-next-line @next/next/no-img-element -- block-owned upload (public/uploads/illustrations), same as OverviewBlock/ImageComparisonBlock; no fixed remote-pattern domain to configure. */}
            <img src={imageUrl} alt="" className="w-full object-cover" />
          </ZoomableImage>
        </div>
        {caption && (
          <RichEditableText
            as="figcaption"
            className={`font-ui text-sm text-secondary ${TEXT_ALIGN_CLASS[captionAlign]}`}
            value={caption}
            onSave={async (html) => updateBlockRichTextAction(block.id, "caption", html)}
            placeholder=""
            block={block}
            diseaseSlug={diseaseSlug}
          />
        )}
      </figure>
    );
  }

  return (
    <figure className="flex flex-col gap-2">
      {imageUrl && (
        <div className="flex justify-end">
          <div className="relative">
            <button
              type="button"
              onClick={() => setWidthOpen((open) => !open)}
              aria-label="Image width"
              className="flex items-center gap-1 rounded px-2 py-1 font-ui text-xs text-secondary hover:bg-border/40 hover:text-primary"
            >
              <Maximize2 className="size-3.5" aria-hidden="true" />
              {WIDTH_OPTIONS.find((o) => o.value === imageWidth)?.label}
            </button>
            {widthOpen && (
              <div className="absolute top-6 right-0 z-10 w-40 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
                <div className="flex flex-wrap gap-1">
                  {WIDTH_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setWidthOpen(false);
                        setImageWidth(option.value);
                        setSimpleImageWidthAction(block.id, option.value);
                      }}
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
              </div>
            )}
          </div>
        </div>
      )}
      <div className={`relative overflow-hidden rounded-lg bg-surface-raised ${imageWidthClass[imageWidth]}`}>
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- edit-mode upload preview briefly uses a blob: URL, which next/image can't render. */}
            <img src={imageUrl} alt="" className="w-full object-cover" />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => {
                setImageUrl(undefined);
                removeSimpleImageAction(block.id);
              }}
              className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-surface text-secondary shadow-sm hover:text-warning"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-1.5 py-10 text-secondary hover:text-accent disabled:opacity-50"
          >
            <ImagePlus className="size-6" aria-hidden="true" />
            <span className="font-ui text-sm">{uploading ? "Uploading…" : "Upload image"}</span>
            {uploadError && <span className="font-ui text-xs text-warning">{uploadError}</span>}
          </button>
        )}
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
      </div>
      <RichEditableText
        value={caption ?? ""}
        onSave={async (html) => updateBlockRichTextAction(block.id, "caption", html)}
        as="p"
        className={`font-ui text-sm text-secondary ${TEXT_ALIGN_CLASS[captionAlign]}`}
        placeholder="Click to add a caption"
        block={block}
        diseaseSlug={diseaseSlug}
      />
    </figure>
  );
}
