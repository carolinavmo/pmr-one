"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

// Wraps an existing image (passed as `children`, unchanged) with a
// click-to-zoom lightbox — a fixed, full-screen modal showing the
// same image at full size, same backdrop/close convention as
// ConfirmDialog.tsx (bg-black/40 there; darker here since a photo
// needs more contrast than a text dialog). `enabled` gates the
// interaction on/off without the call site needing to branch and
// duplicate its own <img> markup — signed-out visitors get `enabled=
// false` and the exact same image renders inert, just like before
// this component existed.
export function ZoomableImage({
  src,
  alt,
  enabled = true,
  children,
}: {
  src: string;
  alt: string;
  enabled?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!enabled) return <>{children}</>;

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="cursor-zoom-in"
        role="button"
        tabIndex={0}
        aria-label="View full-size image"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={alt || "Image"}
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary asset URL, same reasoning as every other block-owned image. */}
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full cursor-zoom-out rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
