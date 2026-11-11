"use client";

import { useState } from "react";
import { Frame } from "lucide-react";
import type { CardColor } from "@/lib/editorial-blocks";
import { CARD_COLOR_ORDER, CARD_COLOR_LABEL, CARD_COLOR_SWATCH } from "@/lib/card-colors";

// Edit-mode toolbar button for the outline around an image block: opens a
// small popover with "No border" plus the shared card-colour swatches.
// `value` undefined = no border. The caller owns saving (it passes the new
// value, or undefined for none, to its own action) and the reader-view
// styling (CARD_COLOR_BORDER_STRONG on the image wrapper).
export function ImageBorderControl({
  value,
  onChange,
}: {
  value: CardColor | undefined;
  onChange: (next: CardColor | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Image border"
        aria-expanded={open}
        title="Image border"
        className={`flex items-center gap-1 rounded px-2 py-1 font-ui text-xs hover:bg-border/40 hover:text-primary ${
          value ? "text-accent" : "text-secondary"
        }`}
      >
        <Frame className="size-3.5" aria-hidden="true" />
        {value ? (
          <span className={`size-3 rounded-full ${CARD_COLOR_SWATCH[value]}`} aria-hidden="true" />
        ) : null}
      </button>
      {open && (
        <div className="absolute top-6 right-0 z-10 w-48 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onChange(undefined);
            }}
            aria-pressed={!value}
            className={`mb-2 w-full rounded border px-2 py-1 text-left font-ui text-xs ${
              !value
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-secondary hover:border-accent hover:text-accent"
            }`}
          >
            No border
          </button>
          <div className="grid grid-cols-5 gap-1.5">
            {CARD_COLOR_ORDER.map((color) => (
              <button
                key={color}
                type="button"
                title={CARD_COLOR_LABEL[color]}
                aria-label={CARD_COLOR_LABEL[color]}
                aria-pressed={value === color}
                onClick={() => {
                  setOpen(false);
                  onChange(color);
                }}
                className={`size-6 rounded-full ${CARD_COLOR_SWATCH[color]} transition-transform duration-base hover:scale-110 ${
                  value === color ? "ring-2 ring-accent ring-offset-1" : ""
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
