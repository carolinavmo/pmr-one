"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import type { ImageComparisonBlock, EditorialBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import {
  updateImageComparisonLabelsAction,
  uploadImageComparisonSideAction,
  removeImageComparisonSideAction,
} from "@/lib/actions/authoring";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { TEXT_ALIGN_CLASS } from "@/lib/block-alignment";

type Side = "left" | "right";

// Two images side by side with a label under each (e.g. Normal vs
// Pathological) — owns-content, each side holding its own uploaded
// asset rather than referencing a shared Medical Illustration object,
// since a comparison pair is specific to this one placement. Reuses
// the same local-disk upload path illustrations already established
// (uploadImageComparisonSideAction), just without the full search-or-
// reuse Knowledge Object machinery that doesn't apply here.
export function ImageComparisonBlockView({
  block,
  diseaseSlug,
}: {
  block: ImageComparisonBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [title, setTitle] = useState(block.title ?? "");
  const [left, setLeft] = useState(block.left);
  const [right, setRight] = useState(block.right);
  const titleAlign = block.layout?.textAlign ?? "left";

  const commitLabels = (nextTitle: string, nextLeft: typeof left, nextRight: typeof right) => {
    setTitle(nextTitle);
    setLeft(nextLeft);
    setRight(nextRight);
    updateImageComparisonLabelsAction(block.id, nextTitle, nextLeft.label, nextRight.label);
  };

  if (!editing) {
    return (
      <figure className="flex flex-col gap-3">
        {title && (
          <RichEditableText
            as="figcaption"
            value={title}
            onSave={async (html) => commitLabels(html, left, right)}
            placeholder=""
            className={`font-reading text-lg text-primary ${TEXT_ALIGN_CLASS[titleAlign]}`}
            block={block}
            diseaseSlug={diseaseSlug}
          />
        )}
        <div className="grid grid-cols-2 gap-4">
          <ImageSideView side={left} block={block} diseaseSlug={diseaseSlug} />
          <ImageSideView side={right} block={block} diseaseSlug={diseaseSlug} />
        </div>
      </figure>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
      <RichEditableText
        value={title}
        onSave={async (html) => commitLabels(html, left, right)}
        placeholder="Title (optional)"
        className={`w-full font-reading text-lg text-primary ${TEXT_ALIGN_CLASS[titleAlign]}`}
        block={block}
        diseaseSlug={diseaseSlug}
      />
      <div className="grid grid-cols-2 gap-4">
        <ImageSideEdit
          side="left"
          value={left}
          onLabelSave={(label) => commitLabels(title, { ...left, label }, right)}
          onUploaded={(assetUrl) => setLeft((s) => ({ ...s, assetUrl }))}
          onRemoved={() => setLeft((s) => ({ ...s, assetUrl: undefined }))}
          blockId={block.id}
          block={block}
          diseaseSlug={diseaseSlug}
        />
        <ImageSideEdit
          side="right"
          value={right}
          onLabelSave={(label) => commitLabels(title, left, { ...right, label })}
          onUploaded={(assetUrl) => setRight((s) => ({ ...s, assetUrl }))}
          onRemoved={() => setRight((s) => ({ ...s, assetUrl: undefined }))}
          blockId={block.id}
          block={block}
          diseaseSlug={diseaseSlug}
        />
      </div>
    </div>
  );
}

function ImageSideView({
  side,
  block,
  diseaseSlug,
}: {
  side: { assetUrl?: string; label: string };
  block: EditorialBlock;
  diseaseSlug: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface-raised">
        {side.assetUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- edit-mode upload preview briefly uses a blob: URL, which next/image can't render.
          <img src={side.assetUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center font-ui text-sm text-secondary">
            No image
          </div>
        )}
      </div>
      {side.label && (
        <RichEditableText
          as="span"
          value={side.label}
          onSave={async () => {}}
          placeholder=""
          className="font-ui text-sm font-semibold text-primary"
          block={block}
          diseaseSlug={diseaseSlug}
        />
      )}
    </div>
  );
}

function ImageSideEdit({
  side,
  value,
  onLabelSave,
  onUploaded,
  onRemoved,
  blockId,
  block,
  diseaseSlug,
}: {
  side: Side;
  value: { assetUrl?: string; label: string };
  onLabelSave: (label: string) => void;
  onUploaded: (assetUrl: string) => void;
  onRemoved: () => void;
  blockId: string;
  block: EditorialBlock;
  diseaseSlug: string;
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
      await uploadImageComparisonSideAction(blockId, side, formData);
      onUploaded(URL.createObjectURL(file));
    } catch {
      setUploadError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface-raised">
        {value.assetUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- upload preview briefly uses a blob: URL, which next/image can't render. */}
            <img src={value.assetUrl} alt="" className="size-full object-cover" />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => {
                onRemoved();
                removeImageComparisonSideAction(blockId, side);
              }}
              className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-surface text-secondary shadow-sm hover:text-warning"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
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
        value={value.label}
        onSave={async (html) => onLabelSave(html)}
        placeholder={side === "left" ? "Label (e.g. Normal)" : "Label (e.g. Pathological)"}
        className="w-full text-center font-ui text-sm font-semibold text-primary"
        block={block}
        diseaseSlug={diseaseSlug}
      />
    </div>
  );
}
