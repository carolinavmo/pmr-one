"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { updateAvatarAction, removeAvatarAction } from "@/app/[locale]/account/actions";

// Same "upload on select, no separate submit" pattern as
// DashboardHero's background image control — one click picks the
// file and saves it, rather than a two-step select-then-confirm form.
export function AvatarUploader({
  initialImageUrl,
  initials,
  changeLabel,
  removeLabel,
}: {
  initialImageUrl: string | null;
  initials: string;
  changeLabel: string;
  removeLabel: string;
}) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const previewUrl = URL.createObjectURL(file);
    setImageUrl(previewUrl);
    const formData = new FormData();
    formData.set("file", file);
    await updateAvatarAction(formData);
    setUploading(false);
  }

  async function handleRemove() {
    setImageUrl(null);
    await removeAvatarAction();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="group relative">
        <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-ui text-xl font-semibold text-white ring-2 ring-surface">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-owned upload (public/uploads/avatars), same as SimpleImageBlock/OverviewBlock; no fixed remote-pattern domain to configure.
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label={changeLabel}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white disabled:cursor-wait"
        >
          <Camera className="size-5" aria-hidden="true" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="font-ui text-xs font-medium text-accent hover:underline disabled:opacity-50"
        >
          {uploading ? "…" : changeLabel}
        </button>
        {imageUrl && (
          <>
            <span className="text-border" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-0.5 font-ui text-xs text-secondary hover:text-warning"
            >
              <X className="size-3" aria-hidden="true" />
              {removeLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
