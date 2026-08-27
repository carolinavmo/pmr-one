"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Trash2, Plus, Crop, Shrink, Crosshair, MoveVertical } from "lucide-react";
import type { ImageRowBlock, EditorialBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { ZoomableImage } from "@/components/ui/ZoomableImage";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { FOCAL_POINT_OPTIONS, FOCAL_POINT_CLASS, type ImageFocalPoint } from "@/lib/image-focal-point";
import {
  addImageRowItemAction,
  removeImageRowItemAction,
  updateImageRowItemLabelAction,
  uploadImageRowItemImageAction,
  removeImageRowItemImageAction,
  setImageRowItemFitAction,
  setImageRowItemFocalPointAction,
  setImageRowHeightAction,
} from "@/lib/actions/authoring";

type RowItem = ImageRowBlock["images"][number];
type ImageFit = NonNullable<RowItem["imageFit"]>;
type RowHeight = NonNullable<ImageRowBlock["rowHeight"]>;

const MIN_IMAGES = 2;
const MAX_IMAGES = 4;

const FIT_OPTIONS: { value: ImageFit; label: string; icon: typeof Crop }[] = [
  { value: "cover", label: "Crop to square", icon: Crop },
  { value: "contain", label: "Keep full image, no crop", icon: Shrink },
];

const HEIGHT_OPTIONS: { value: RowHeight; label: string }[] = [
  { value: "sm", label: "S" },
  { value: "md", label: "M" },
  { value: "lg", label: "L" },
  { value: "xl", label: "XL" },
];

const HEIGHT_CLASS: Record<RowHeight, string> = {
  sm: "h-32",
  md: "h-48",
  lg: "h-64",
  xl: "h-96",
};

// The variable-count sibling of ImageComparisonBlock's fixed left/
// right pair — 2 to 4 images in one row, each with its own label.
// Every image scales to the block's own `rowHeight` (adjustable, see
// the toolbar below), not a forced-equal-width grid column — a
// "contain" image keeps its own aspect ratio at that height instead of
// being stretched or cropped into a box shaped by how many siblings it
// has. The row itself centers the resulting group (`justify-center`),
// so a short row of 2 images doesn't stretch edge-to-edge the way a
// CSS-grid row would.
export function ImageRowBlockView({
  block,
  diseaseSlug,
  isSignedIn = false,
}: {
  block: ImageRowBlock;
  diseaseSlug: string;
  isSignedIn?: boolean;
}) {
  const { editing } = useEditMode();
  const [images, setImages] = useState(block.images);
  const [rowHeight, setRowHeight] = useState<RowHeight>(block.rowHeight ?? "md");

  const visibleImages = editing ? images : images.filter((item) => item.assetUrl);
  if (visibleImages.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {editing && (
        <div className="flex items-center justify-end gap-1">
          <MoveVertical className="size-3.5 text-secondary" aria-hidden="true" />
          <div className="flex items-center gap-0.5 rounded border border-border p-0.5">
            {HEIGHT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-label={`Row height ${option.label}`}
                aria-pressed={rowHeight === option.value}
                onClick={() => {
                  setRowHeight(option.value);
                  setImageRowHeightAction(block.id, option.value);
                }}
                className={`flex h-6 min-w-6 items-center justify-center rounded px-1 font-ui text-xs transition-colors duration-base ${
                  rowHeight === option.value
                    ? "bg-accent/10 text-accent"
                    : "text-secondary hover:bg-border/40 hover:text-primary"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {visibleImages.map((item) => (
          <ImageRowItem
            key={item.id}
            item={item}
            editing={editing}
            block={block}
            diseaseSlug={diseaseSlug}
            isSignedIn={isSignedIn}
            rowHeight={rowHeight}
            canRemove={images.length > MIN_IMAGES}
            onLabelChange={(label) =>
              setImages((current) => current.map((it) => (it.id === item.id ? { ...it, label } : it)))
            }
            onImageChange={(assetUrl) =>
              setImages((current) => current.map((it) => (it.id === item.id ? { ...it, assetUrl } : it)))
            }
            onFitChange={(imageFit) =>
              setImages((current) => current.map((it) => (it.id === item.id ? { ...it, imageFit } : it)))
            }
            onFocalPointChange={(imageFocalPoint) =>
              setImages((current) =>
                current.map((it) => (it.id === item.id ? { ...it, imageFocalPoint } : it))
              )
            }
            onRemove={() => {
              setImages((current) => current.filter((it) => it.id !== item.id));
              removeImageRowItemAction(block.id, item.id);
            }}
          />
        ))}
      </div>
      {editing && images.length < MAX_IMAGES && (
        <button
          type="button"
          onClick={async () => {
            const newItem = await addImageRowItemAction(block.id);
            setImages((current) => [...current, newItem]);
          }}
          className="flex w-fit items-center gap-1.5 self-center rounded px-2 py-1 font-ui text-xs text-accent hover:bg-accent/10"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Image ({images.length}/{MAX_IMAGES})
        </button>
      )}
    </div>
  );
}

function ImageRowItem({
  item,
  editing,
  block,
  diseaseSlug,
  isSignedIn,
  rowHeight,
  canRemove,
  onLabelChange,
  onImageChange,
  onFitChange,
  onFocalPointChange,
  onRemove,
}: {
  item: RowItem;
  editing: boolean;
  block: EditorialBlock;
  diseaseSlug: string;
  isSignedIn: boolean;
  rowHeight: RowHeight;
  canRemove: boolean;
  onLabelChange: (label: string) => void;
  onImageChange: (assetUrl: string | undefined) => void;
  onFitChange: (fit: ImageFit) => void;
  onFocalPointChange: (focalPoint: ImageFocalPoint) => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [focalPointOpen, setFocalPointOpen] = useState(false);
  const fit = item.imageFit ?? "cover";
  const isCover = fit === "cover";
  const focalPoint = item.imageFocalPoint ?? "center";

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.set("file", file);
    try {
      await uploadImageRowItemImageAction(block.id, item.id, formData);
      onImageChange(URL.createObjectURL(file));
    } catch {
      setUploadError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  // "cover" gets a square box at the row's height (a defined box is
  // what a crop needs to fill); "contain" fixes only the height and
  // lets width follow the image's own aspect ratio, so the rendered
  // image is never distorted or letterboxed — just scaled.
  const boxClass = isCover ? `${HEIGHT_CLASS[rowHeight]} aspect-square` : HEIGHT_CLASS[rowHeight];
  const imgClass = isCover
    ? `size-full object-cover ${FOCAL_POINT_CLASS[focalPoint]}`
    : "h-full w-auto";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative overflow-hidden rounded-lg bg-surface-raised">
        <div className={boxClass}>
          {item.assetUrl ? (
            <>
              {editing ? (
                // eslint-disable-next-line @next/next/no-img-element -- edit-mode upload preview briefly uses a blob: URL, which next/image can't render.
                <img src={item.assetUrl} alt="" className={imgClass} />
              ) : (
                <ZoomableImage src={item.assetUrl} alt={item.label} enabled={isSignedIn}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- block-owned upload, same reasoning as ImageComparisonBlock/PhotoCardGalleryBlock. */}
                  <img src={item.assetUrl} alt={item.label} className={imgClass} />
                </ZoomableImage>
              )}
            </>
          ) : editing ? (
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
          ) : null}
        </div>
        {editing && item.assetUrl && (
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => {
              onImageChange(undefined);
              removeImageRowItemImageAction(block.id, item.id);
            }}
            className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-surface-raised text-secondary shadow-sm hover:text-warning"
          >
            <X className="size-3.5" aria-hidden="true" />
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
      </div>
      {editing && item.assetUrl && (
        <div className="flex items-center gap-0.5">
          {FIT_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={fit === value}
              onClick={() => {
                onFitChange(value);
                setImageRowItemFitAction(block.id, item.id, value);
              }}
              className={`flex size-6 items-center justify-center rounded transition-colors duration-base ${
                fit === value
                  ? "bg-accent/10 text-accent"
                  : "text-secondary hover:bg-border/40 hover:text-primary"
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </button>
          ))}
          {isCover && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setFocalPointOpen((open) => !open)}
                aria-label="Image focal point"
                className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
              >
                <Crosshair className="size-3.5" aria-hidden="true" />
              </button>
              {focalPointOpen && (
                <div className="absolute top-7 left-1/2 z-10 w-36 -translate-x-1/2 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
                  <div className="grid grid-cols-3 gap-1">
                    {FOCAL_POINT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        title={option.label}
                        aria-label={option.label}
                        onClick={() => {
                          setFocalPointOpen(false);
                          onFocalPointChange(option.value);
                          setImageRowItemFocalPointAction(block.id, item.id, option.value);
                        }}
                        className={`flex size-8 items-center justify-center rounded border ${
                          focalPoint === option.value
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            focalPoint === option.value ? "bg-accent" : "bg-secondary/50"
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
      <div className="flex items-center gap-1">
        <RichEditableText
          as="span"
          value={item.label}
          onSave={async (html) => {
            onLabelChange(html);
            updateImageRowItemLabelAction(block.id, item.id, html);
          }}
          placeholder={editing ? "Label" : ""}
          className="min-w-0 flex-1 text-center font-ui text-sm text-secondary"
          block={block}
          diseaseSlug={diseaseSlug}
        />
        {editing && canRemove && (
          <button
            type="button"
            aria-label="Remove image slot"
            onClick={onRemove}
            className="shrink-0 text-secondary hover:text-warning"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
