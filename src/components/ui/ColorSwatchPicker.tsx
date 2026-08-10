import type { CardColor } from "@/lib/editorial-blocks";
import { CARD_COLOR_ORDER, CARD_COLOR_LABEL, CARD_COLOR_SWATCH } from "@/lib/card-colors";

// A single 8-swatch popover of the decorative CardColor palette —
// shared by every picker that offers those 8 colors as a choice
// (ParagraphBlockView's card-style and per-badge pickers,
// RichEditableText's text-color and background-color pickers). One
// popover, positioned by the caller (via a wrapping `relative`
// ancestor), not a component that owns its own trigger button — each
// consumer's trigger looks different enough (a palette icon, a small
// swatch dot, a toolbar button) that forcing one shared trigger would
// cost more than the popover body itself saves.
export function ColorSwatchPicker({
  onPick,
  className = "absolute top-6 right-0 z-10 w-44",
}: {
  onPick: (color: CardColor) => void;
  className?: string;
}) {
  return (
    <div className={`${className} rounded-lg border border-border bg-surface-raised p-2 shadow-md`}>
      <div className="grid grid-cols-4 gap-1.5">
        {CARD_COLOR_ORDER.map((color) => (
          <button
            key={color}
            type="button"
            title={CARD_COLOR_LABEL[color]}
            onClick={() => onPick(color)}
            className={`size-7 rounded-full ${CARD_COLOR_SWATCH[color]} transition-transform duration-base hover:scale-110`}
          />
        ))}
      </div>
    </div>
  );
}
