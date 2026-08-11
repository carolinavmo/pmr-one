import type { CardColor } from "@/lib/editorial-blocks";
import { CARD_COLOR_ORDER, CARD_COLOR_LABEL, CARD_COLOR_SWATCH } from "@/lib/card-colors";

// A single 20-swatch popover of the decorative CardColor palette —
// shared by every picker that offers those colors as a choice
// (ParagraphBlockView's card-style and per-badge pickers,
// RichEditableText's text-color and background-color pickers). One
// popover, positioned by the caller (via a wrapping `relative`
// ancestor), not a component that owns its own trigger button — each
// consumer's trigger looks different enough (a palette icon, a small
// swatch dot, a toolbar button) that forcing one shared trigger would
// cost more than the popover body itself saves. 5 columns (not the
// original 4) so the widened 20-color palette lands in 4 even rows
// instead of 5 — a slightly smaller swatch (size-6, was size-7) keeps
// the popover from getting noticeably wider.
export function ColorSwatchPicker({
  onPick,
  className = "absolute top-6 right-0 z-10 w-48",
}: {
  onPick: (color: CardColor) => void;
  className?: string;
}) {
  return (
    <div className={`${className} rounded-lg border border-border bg-surface-raised p-2 shadow-md`}>
      <div className="grid grid-cols-5 gap-1.5">
        {CARD_COLOR_ORDER.map((color) => (
          <button
            key={color}
            type="button"
            title={CARD_COLOR_LABEL[color]}
            onClick={() => onPick(color)}
            className={`size-6 rounded-full ${CARD_COLOR_SWATCH[color]} transition-transform duration-base hover:scale-110`}
          />
        ))}
      </div>
    </div>
  );
}
