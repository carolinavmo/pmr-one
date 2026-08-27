"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

// Matches --duration-base (globals.css) — the close timer has to know
// the transition's real length so it can wait for the fade/scale-out
// to finish before unmounting.
const TRANSITION_MS = 200;

// Wraps an existing image (passed as `children`, unchanged) with a
// click-to-zoom lightbox — a fixed, full-screen modal showing the
// same image at full size, same backdrop/close convention as
// ConfirmDialog.tsx (bg-black/40 there; darker here since a photo
// needs more contrast than a text dialog). `enabled` gates the
// interaction on/off without the call site needing to branch and
// duplicate its own <img> markup — signed-out visitors get `enabled=
// false` and the exact same image renders inert, just like before
// this component existed.
//
// `open` controls mounting, `visible` drives the transition classes —
// split the same way ScrollReveal splits "in the DOM" from "revealed"
// so the modal can animate BOTH in (mount at opacity-0/scale-95, flip
// to visible next frame) and out (flip back to hidden, then unmount
// once the transition has actually finished).
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
  const [visible, setVisible] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = () => {
    setVisible(false);
    closeTimeout.current = setTimeout(() => setOpen(false), TRANSITION_MS);
  };

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
    };
  }, []);

  if (!enabled) return <>{children}</>;

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        // size-full: a block div's height never auto-stretches to fill
        // a definite-height parent the way its width does — without
        // this, any caller sizing its image via a percentage height
        // (h-full/size-full on an aspect-ratio or fixed-height box)
        // silently collapses back to the image's own intrinsic size
        // the moment it's wrapped here, since the percentage height
        // has no definite box to resolve against.
        className="size-full cursor-zoom-in"
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
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 transition-opacity duration-base ease-standard motion-reduce:transition-none sm:p-10 md:p-16 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={alt || "Image"}
          onClick={close}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary asset URL, same reasoning as every other block-owned image. */}
          <img
            src={src}
            alt={alt}
            className={`max-h-full max-w-full cursor-zoom-out rounded-lg object-contain shadow-2xl transition-[opacity,transform] duration-base ease-standard motion-reduce:scale-100 motion-reduce:transition-none ${
              visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
