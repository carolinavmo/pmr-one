"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Trash2, Plus } from "lucide-react";
import type { PhotoCardGalleryBlock, EditorialBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import {
  addPhotoCardGalleryItemAction,
  updatePhotoCardGalleryItemAction,
  updatePhotoCardGalleryMetricsAction,
  uploadPhotoCardGalleryIllustrationAction,
  removePhotoCardGalleryIllustrationAction,
  removePhotoCardGalleryItemAction,
} from "@/lib/actions/authoring";
import { RichEditableText } from "@/components/ui/RichEditableText";

type GalleryItem = PhotoCardGalleryBlock["items"][number];

// A small gallery of illustrated, numbered cards — freeform title,
// description, an optional block-owned photo, and optional freeform
// label/value stats (not fixed to "diagnostic value" — an author can
// use this for a Sensitivity/Specificity pair, a dosing range, or
// nothing at all). Fully owns-content, no Knowledge Graph object
// behind it, so it's insertable in any section, not just Exam — the
// generalized version of what shipped first as `exam_maneuver_gallery`
// (migration 0018 renamed the enum value once the maneuver-specific
// coupling turned out to block exactly that use).
export function PhotoCardGalleryBlockView({
  block,
  diseaseSlug,
}: {
  block: PhotoCardGalleryBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [items, setItems] = useState(block.items);

  if (items.length === 0 && !editing) return null;

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <PhotoCard
          key={item.id}
          item={item}
          index={index}
          editing={editing}
          blockId={block.id}
          block={block}
          diseaseSlug={diseaseSlug}
          onItemChange={(next) =>
            setItems((current) => current.map((it) => (it.id === item.id ? next : it)))
          }
          onRemove={() => {
            setItems((current) => current.filter((it) => it.id !== item.id));
            removePhotoCardGalleryItemAction(block.id, item.id);
          }}
        />
      ))}
      {editing && (
        <button
          type="button"
          onClick={async () => {
            const newItem = await addPhotoCardGalleryItemAction(block.id);
            setItems((current) => [...current, newItem]);
          }}
          className="flex w-fit items-center gap-1.5 rounded px-2 py-1 font-ui text-xs text-accent hover:bg-accent/10"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Card
        </button>
      )}
    </div>
  );
}

function PhotoCard({
  item,
  index,
  editing,
  blockId,
  block,
  diseaseSlug,
  onItemChange,
  onRemove,
}: {
  item: GalleryItem;
  index: number;
  editing: boolean;
  blockId: string;
  block: EditorialBlock;
  diseaseSlug: string;
  onItemChange: (next: GalleryItem) => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [metrics, setMetrics] = useState(item.metrics);

  const commitText = (nextTitle: string, nextDescription: string) => {
    onItemChange({ ...item, title: nextTitle, description: nextDescription });
    updatePhotoCardGalleryItemAction(blockId, item.id, nextTitle, nextDescription);
  };

  // Metrics are staged locally like title/description and only written
  // to the server on blur (typing a label/value shouldn't fire a
  // network request per keystroke) — but add/remove-stat are discrete
  // one-shot actions, so those commit immediately, matching how "add
  // card"/"remove card" don't wait for a blur either.
  const commitMetrics = (nextMetrics: { label: string; value: string }[]) => {
    setMetrics(nextMetrics);
    onItemChange({ ...item, metrics: nextMetrics });
    updatePhotoCardGalleryMetricsAction(blockId, item.id, nextMetrics);
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    await uploadPhotoCardGalleryIllustrationAction(blockId, item.id, formData);
    onItemChange({ ...item, illustrationUrl: URL.createObjectURL(file) });
    setUploading(false);
  };

  if (!editing && !item.title && !item.description) return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/60 sm:flex-row">
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-surface-raised sm:aspect-square sm:w-48">
        {item.illustrationUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- edit-mode upload preview briefly uses a blob: URL, which next/image can't render. */}
            <img src={item.illustrationUrl} alt="" className="size-full object-cover" />
            {editing && (
              <button
                type="button"
                aria-label="Remove illustration"
                onClick={() => {
                  onItemChange({ ...item, illustrationUrl: undefined });
                  removePhotoCardGalleryIllustrationAction(blockId, item.id);
                }}
                className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-surface text-secondary shadow-sm hover:text-warning"
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
          </button>
        ) : (
          <div className="flex size-full items-center justify-center font-ui text-xs text-secondary">
            Illustration pending
          </div>
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

      <div className="flex flex-1 flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-reading text-base font-semibold text-primary">
              {index + 1}.
            </span>
            <RichEditableText
              as="span"
              value={title}
              onSave={async (html) => {
                setTitle(html);
                commitText(html, description);
              }}
              placeholder="Card title"
              className="min-w-0 flex-1 font-reading text-base font-semibold text-primary"
              block={block}
              diseaseSlug={diseaseSlug}
            />
            {editing && (
              <button
                type="button"
                aria-label="Remove card"
                onClick={onRemove}
                className="shrink-0 text-secondary hover:text-warning"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <RichEditableText
            as="p"
            value={description}
            onSave={async (html) => {
              setDescription(html);
              commitText(title, html);
            }}
            placeholder="Description"
            className="font-ui text-sm text-secondary"
            block={block}
            diseaseSlug={diseaseSlug}
          />
          {editing && (
            <MetricsEditor metrics={metrics} onStage={setMetrics} onCommit={commitMetrics} />
          )}
        </div>
        {!editing && item.metrics.length > 0 && (
          <div className="flex w-full flex-col gap-1 rounded-lg bg-accent/5 p-3 sm:w-40 sm:shrink-0">
            {item.metrics.map((metric, i) => (
              <span key={i} className="font-ui text-xs text-secondary">
                {metric.label}: <span className="font-medium text-primary">{metric.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricsEditor({
  metrics,
  onStage,
  onCommit,
}: {
  metrics: { label: string; value: string }[];
  onStage: (metrics: { label: string; value: string }[]) => void;
  onCommit: (metrics: { label: string; value: string }[]) => void;
}) {
  return (
    <div className="mt-1 flex flex-col gap-1">
      {metrics.map((metric, index) => (
        <div key={index} className="flex items-center gap-1">
          <input
            value={metric.label}
            placeholder="Label (e.g. Sensitivity)"
            onChange={(e) => {
              const next = metrics.map((m, i) => (i === index ? { ...m, label: e.target.value } : m));
              onStage(next);
            }}
            onBlur={() => onCommit(metrics)}
            className="w-32 rounded border border-border bg-surface px-1.5 py-0.5 font-ui text-xs text-primary outline-none focus:border-accent"
          />
          <input
            value={metric.value}
            placeholder="Value (e.g. 85%)"
            onChange={(e) => {
              const next = metrics.map((m, i) => (i === index ? { ...m, value: e.target.value } : m));
              onStage(next);
            }}
            onBlur={() => onCommit(metrics)}
            className="w-20 rounded border border-border bg-surface px-1.5 py-0.5 font-ui text-xs text-primary outline-none focus:border-accent"
          />
          <button
            type="button"
            aria-label="Remove stat"
            onClick={() => onCommit(metrics.filter((_, i) => i !== index))}
            className="text-secondary hover:text-warning"
          >
            <X className="size-3 shrink-0" aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onCommit([...metrics, { label: "", value: "" }])}
        className="flex w-fit items-center gap-1 font-ui text-xs text-accent hover:underline"
      >
        <Plus className="size-3" aria-hidden="true" />
        Stat
      </button>
    </div>
  );
}
