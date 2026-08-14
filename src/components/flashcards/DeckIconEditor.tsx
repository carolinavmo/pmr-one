"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Layers, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";
import type { CardColor } from "@/lib/editorial-blocks";
import { uploadDeckIconAction, removeDeckIconAction } from "@/lib/actions/flashcards";

// Shared between the dashboard grid card and the deck detail page
// header — both need "upload a custom image" + "remove it, revert to
// the region-derived icon" for anyone with edit rights (member on
// their own deck, editor/admin on a preset one). The avatar itself is
// the click target when canEdit (not just the small camera badge, which
// is otherwise easy to miss) — clicking it always re-opens the file
// picker, so uploading again is how you replace an existing image.
export function DeckIconEditor({
  deckId,
  icon,
  iconUrl: initialIconUrl,
  color,
  canEdit,
  sizeClass = "size-16",
  iconSizeClass = "size-7",
}: {
  deckId: string;
  icon: CardIconName | undefined;
  iconUrl: string | null;
  color: CardColor;
  canEdit: boolean;
  sizeClass?: string;
  iconSizeClass?: string;
}) {
  const t = useTranslations("flashcards");
  const [iconUrl, setIconUrl] = useState(initialIconUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Icon = icon ? cardIcons[icon] : Layers;

  async function handleIconFile(file: File) {
    setUploading(true);
    setUploadError(false);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const assetUrl = await uploadDeckIconAction(deckId, formData);
      setIconUrl(assetUrl);
    } catch {
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveIcon() {
    setIconUrl(null);
    startTransition(() => {
      removeDeckIconAction(deckId);
    });
  }

  const avatar = iconUrl ? (
    <img src={iconUrl} alt="" className={`${sizeClass} rounded-full object-cover`} />
  ) : (
    <span className={`flex ${sizeClass} items-center justify-center rounded-full ${CARD_COLOR_CHIP[color]}`}>
      <Icon className={iconSizeClass} aria-hidden="true" />
    </span>
  );

  return (
    <div className="relative shrink-0">
      {canEdit ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label={t("changeDeckIcon")}
          disabled={uploading}
          className="rounded-full"
        >
          {avatar}
        </button>
      ) : (
        avatar
      )}

      {canEdit && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handleIconFile(file);
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-surface-raised bg-accent text-white"
          >
            {uploading ? (
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="size-3" aria-hidden="true" />
            )}
          </span>
          {iconUrl && (
            <button
              type="button"
              onClick={handleRemoveIcon}
              aria-label={t("removeDeckIcon")}
              className="absolute -top-1 -left-1 flex size-5 items-center justify-center rounded-full border-2 border-surface-raised bg-card-red text-white hover:bg-card-red/80"
            >
              <X className="size-2.5" aria-hidden="true" />
            </button>
          )}
        </>
      )}
      {uploadError && (
        <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 font-ui text-xs text-card-red">
          {t("iconUploadFailed")}
        </span>
      )}
    </div>
  );
}
