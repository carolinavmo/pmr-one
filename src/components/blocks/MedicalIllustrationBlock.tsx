"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Trash2, X, ChevronUp, ChevronDown, Maximize2 } from "lucide-react";
import type { MedicalIllustrationBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { IllustrationPicker } from "@/components/disease-page/IllustrationPicker";
import {
  updateIllustrationAnnotationsAction,
  updateBlockRichTextAction,
  replaceIllustrationBlockAction,
  uploadReplacementIllustrationAction,
  removeIllustrationImageAction,
  setIllustrationWidthAction,
} from "@/lib/actions/authoring";

type Annotation = { label: string; x: number; y: number };
type ImageWidth = NonNullable<MedicalIllustrationBlock["imageWidth"]>;

const WIDTH_OPTIONS: { value: ImageWidth; label: string }[] = [
  { value: "1/4", label: "25%" },
  { value: "1/3", label: "33%" },
  { value: "1/2", label: "50%" },
  { value: "2/3", label: "66%" },
  { value: "3/4", label: "75%" },
  { value: "full", label: "100%" },
];

// The image's own size within its column — independent of the row
// width the whole block might have (ResizableRow). "full" fills the
// column edge-to-edge (today's only behavior, before this control
// existed); anything smaller centers the image inside the same column.
const imageWidthClass: Record<ImageWidth, string> = {
  "1/4": "w-1/4 mx-auto",
  "1/3": "w-1/3 mx-auto",
  "1/2": "w-1/2 mx-auto",
  "2/3": "w-2/3 mx-auto",
  "3/4": "w-3/4 mx-auto",
  full: "w-full",
};

// Illustrations lead (philosophy doc) — embedded inline at full column
// width by default, not as a compact card. Annotations are numbered
// markers over the image with a matching legend, never a raw overlay
// of labels.
//
// Not editing: renders exactly as before this feature existed (same
// markup, same classes) — a reader or non-editor sees zero difference.
// Editing: markers become draggable, labels become editable, a
// title/subtitle become inline-editable, Replace/Delete/Width controls
// appear — but the annotation *data*, title, subtitle, and width all
// live on this block's own content_config, never on the shared
// medical_illustration row, so none of it can leak onto another
// disease's page that happens to reuse the same image.
export function MedicalIllustrationBlockView({
  block,
  diseaseId,
  diseaseSlug,
}: {
  block: MedicalIllustrationBlock;
  diseaseId: string;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const { illustration, caption } = block;
  const [annotations, setAnnotations] = useState<Annotation[]>(block.annotations ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [widthOpen, setWidthOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingIndex = useRef<number | null>(null);
  const imageWidth = block.imageWidth ?? "full";

  const heading = (block.title || block.subtitle) && (
    <div className="flex flex-col gap-0.5">
      {block.title && (
        <RichEditableText
          as="p"
          className="font-ui text-base font-semibold text-primary"
          value={block.title}
          onSave={async (html) => updateBlockRichTextAction(block.id, "title", html)}
          placeholder=""
          block={block}
          diseaseSlug={diseaseSlug}
        />
      )}
      {block.subtitle && (
        <RichEditableText
          as="p"
          className="font-ui text-sm text-secondary"
          value={block.subtitle}
          onSave={async (html) => updateBlockRichTextAction(block.id, "subtitle", html)}
          placeholder=""
          block={block}
          diseaseSlug={diseaseSlug}
        />
      )}
    </div>
  );

  if (!editing) {
    // A block an author emptied out (removed the image, hasn't picked
    // a new one yet) is a mid-edit state, not something a reader
    // should ever see — same "renders nothing" behavior an empty
    // paragraph doesn't have, but an illustration with no fallback
    // text content does need, since there's no placeholder image to
    // fall back to.
    if (!illustration) return null;
    return (
      <figure className="flex flex-col gap-2">
        <div className={`relative overflow-hidden rounded-lg ${imageWidthClass[imageWidth]}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- asset_url is an arbitrary external URL (schema-v1.0.sql); no fixed remote-pattern domain to configure yet. */}
          <img src={illustration.assetUrl} alt={illustration.altText} className="w-full object-cover" />
          {annotations.map((annotation, index) => (
            <span
              key={index}
              style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
              className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface-raised font-ui text-xs font-medium text-primary shadow"
              aria-hidden="true"
            >
              {index + 1}
            </span>
          ))}
        </div>
        {heading}
        {(caption || annotations.length > 0) && (
          <figcaption className="flex flex-col gap-1 font-ui text-xs text-secondary">
            {caption && <span>{caption}</span>}
            {annotations.map((annotation, index) => (
              <span key={index}>
                {index + 1}. {annotation.label}
              </span>
            ))}
          </figcaption>
        )}
      </figure>
    );
  }

  const commit = (next: Annotation[]) => {
    setAnnotations(next);
    updateIllustrationAnnotationsAction(block.id, next);
  };

  const percentFromEvent = (e: { clientX: number; clientY: number }) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const picker = (
    <div className="relative z-10">
      <div className="absolute top-0 left-0">
        <IllustrationPicker
          onBack={() => setPickerOpen(false)}
          searchPlaceholder={illustration ? "Search for a replacement…" : "Search for an image…"}
          onSelectExisting={async (illustrationId) => {
            setPickerOpen(false);
            await replaceIllustrationBlockAction(block.id, diseaseId, illustrationId);
          }}
          onUploadNew={async (formData) => {
            await uploadReplacementIllustrationAction(block.id, diseaseId, formData);
            setPickerOpen(false);
          }}
        />
      </div>
    </div>
  );

  if (!illustration) {
    return (
      <figure className="flex flex-col gap-2">
        <RichEditableText
          value={block.title ?? ""}
          onSave={async (html) => updateBlockRichTextAction(block.id, "title", html)}
          as="p"
          className="font-ui text-base font-semibold text-primary"
          placeholder="Click to add a title"
          block={block}
          diseaseSlug={diseaseSlug}
        />
        <RichEditableText
          value={block.subtitle ?? ""}
          onSave={async (html) => updateBlockRichTextAction(block.id, "subtitle", html)}
          as="p"
          className="font-ui text-sm text-secondary"
          placeholder="Click to add a subtitle"
          block={block}
          diseaseSlug={diseaseSlug}
        />
        {pickerOpen && picker}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-10 text-secondary hover:border-accent hover:text-accent"
        >
          <ImageIcon className="size-6" aria-hidden="true" />
          <span className="font-ui text-sm">Add an image</span>
        </button>
      </figure>
    );
  }

  return (
    <figure className="flex flex-col gap-2">
      <RichEditableText
        value={block.title ?? ""}
        onSave={async (html) => updateBlockRichTextAction(block.id, "title", html)}
        as="p"
        className="font-ui text-base font-semibold text-primary"
        placeholder="Click to add a title"
        block={block}
        diseaseSlug={diseaseSlug}
      />
      <RichEditableText
        value={block.subtitle ?? ""}
        onSave={async (html) => updateBlockRichTextAction(block.id, "subtitle", html)}
        as="p"
        className="font-ui text-sm text-secondary"
        placeholder="Click to add a subtitle"
        block={block}
        diseaseSlug={diseaseSlug}
      />

      <div className="flex items-center justify-between">
        <span className="font-ui text-xs font-medium text-secondary">
          Click the image to drop a new annotation marker.
        </span>
        <div className="relative flex items-center gap-1">
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
                      setIllustrationWidthAction(block.id, option.value);
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
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1 rounded px-2 py-1 font-ui text-xs text-secondary hover:bg-border/40 hover:text-primary"
          >
            <ImageIcon className="size-3.5" aria-hidden="true" />
            Replace
          </button>
          <button
            type="button"
            onClick={() => removeIllustrationImageAction(block.id)}
            aria-label="Delete image"
            title="Delete image (keeps this block)"
            className="flex items-center gap-1 rounded px-2 py-1 font-ui text-xs text-secondary hover:bg-warning/10 hover:text-warning"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {pickerOpen && picker}

      <div
        ref={containerRef}
        onClick={(e) => {
          if (draggingIndex.current !== null) return;
          const { x, y } = percentFromEvent(e);
          commit([...annotations, { label: "New label", x, y }]);
        }}
        className={`relative cursor-crosshair overflow-hidden rounded-lg ${imageWidthClass[imageWidth]}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- asset_url is an arbitrary external URL (schema-v1.0.sql); no fixed remote-pattern domain to configure yet. */}
        <img
          src={illustration.assetUrl}
          alt={illustration.altText}
          className="w-full object-cover"
          draggable={false}
        />
        {annotations.map((annotation, index) => (
          <span
            key={index}
            style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
            onPointerDown={(e) => {
              e.stopPropagation();
              draggingIndex.current = index;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (draggingIndex.current !== index) return;
              const { x, y } = percentFromEvent(e);
              setAnnotations((current) =>
                current.map((a, i) => (i === index ? { ...a, x, y } : a))
              );
            }}
            onPointerUp={(e) => {
              if (draggingIndex.current !== index) return;
              draggingIndex.current = null;
              e.currentTarget.releasePointerCapture(e.pointerId);
              commit(annotations);
            }}
            onClick={(e) => e.stopPropagation()}
            className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-accent font-ui text-xs font-medium text-white shadow active:cursor-grabbing"
          >
            {index + 1}
          </span>
        ))}
      </div>

      {annotations.length > 0 && (
        <ul className="flex flex-col gap-1">
          {annotations.map((annotation, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface text-xs text-secondary">
                {index + 1}
              </span>
              <input
                value={annotation.label}
                onChange={(e) =>
                  setAnnotations((current) =>
                    current.map((a, i) => (i === index ? { ...a, label: e.target.value } : a))
                  )
                }
                onBlur={() => commit(annotations)}
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-0.5 font-ui text-sm text-primary outline-none hover:border-border focus:border-accent"
              />
              <button
                type="button"
                aria-label="Move annotation up"
                disabled={index === 0}
                onClick={() => {
                  const next = [...annotations];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  commit(next);
                }}
                className="flex size-6 shrink-0 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
              >
                <ChevronUp className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Move annotation down"
                disabled={index === annotations.length - 1}
                onClick={() => {
                  const next = [...annotations];
                  [next[index], next[index + 1]] = [next[index + 1], next[index]];
                  commit(next);
                }}
                className="flex size-6 shrink-0 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
              >
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Delete annotation"
                onClick={() => commit(annotations.filter((_, i) => i !== index))}
                className="flex size-6 shrink-0 items-center justify-center rounded text-secondary hover:bg-warning/10 hover:text-warning"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
