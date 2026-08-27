"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Trash2, Plus } from "lucide-react";
import type { ImageRowBlock, EditorialBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { ZoomableImage } from "@/components/ui/ZoomableImage";
import { RichEditableText } from "@/components/ui/RichEditableText";
import {
  addImageRowItemAction,
  removeImageRowItemAction,
  updateImageRowItemLabelAction,
  uploadImageRowItemImageAction,
  removeImageRowItemImageAction,
} from "@/lib/actions/authoring";

type RowItem = ImageRowBlock["images"][number];

const MIN_IMAGES = 2;
const MAX_IMAGES = 4;

// Mobile always shows 2 up (wrapping a 3rd/4th to their own row) —
// full N-up only once there's room, matching the responsive pattern
// ResizableRow/BlockSequence's own row grid already uses elsewhere.
const GRID_COLS_CLASS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

// The variable-count sibling of ImageComparisonBlock's fixed left/
// right pair — 2 to 4 images in one row, each with its own label.
// Every slot shares the same fixed aspect-square box (same convention
// as ImageComparisonBlock/PhotoCardGalleryBlock's own image boxes), so
// images and labels line up with each other regardless of each source
// photo's own proportions — that alignment is a property of the
// shared grid here, not something bolted on afterward the way it had
// to be for separate blocks sharing a BlockSequence row.
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

  const visibleImages = editing ? images : images.filter((item) => item.assetUrl);
  if (visibleImages.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className={`grid gap-3 ${GRID_COLS_CLASS[images.length] ?? GRID_COLS_CLASS[MAX_IMAGES]}`}>
        {visibleImages.map((item) => (
          <ImageRowItem
            key={item.id}
            item={item}
            editing={editing}
            block={block}
            diseaseSlug={diseaseSlug}
            isSignedIn={isSignedIn}
            canRemove={images.length > MIN_IMAGES}
            onLabelChange={(label) =>
              setImages((current) => current.map((it) => (it.id === item.id ? { ...it, label } : it)))
            }
            onImageChange={(assetUrl) =>
              setImages((current) => current.map((it) => (it.id === item.id ? { ...it, assetUrl } : it)))
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
          className="flex w-fit items-center gap-1.5 rounded px-2 py-1 font-ui text-xs text-accent hover:bg-accent/10"
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
  canRemove,
  onLabelChange,
  onImageChange,
  onRemove,
}: {
  item: RowItem;
  editing: boolean;
  block: EditorialBlock;
  diseaseSlug: string;
  isSignedIn: boolean;
  canRemove: boolean;
  onLabelChange: (label: string) => void;
  onImageChange: (assetUrl: string | undefined) => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-raised">
        {item.assetUrl ? (
          <>
            {editing ? (
              // eslint-disable-next-line @next/next/no-img-element -- edit-mode upload preview briefly uses a blob: URL, which next/image can't render.
              <img src={item.assetUrl} alt="" className="size-full object-cover" />
            ) : (
              <ZoomableImage src={item.assetUrl} alt={item.label} enabled={isSignedIn}>
                {/* eslint-disable-next-line @next/next/no-img-element -- block-owned upload, same reasoning as ImageComparisonBlock/PhotoCardGalleryBlock. */}
                <img src={item.assetUrl} alt={item.label} className="size-full object-cover" />
              </ZoomableImage>
            )}
            {editing && (
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
      <div className="flex items-center gap-1">
        <RichEditableText
          as="span"
          value={item.label}
          onSave={async (html) => {
            onLabelChange(html);
            updateImageRowItemLabelAction(block.id, item.id, html);
          }}
          placeholder={editing ? "Label" : ""}
          className="min-w-0 flex-1 text-center font-ui text-sm font-semibold text-primary"
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
