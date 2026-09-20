import type { ReactNode } from "react";

// DESIGN-BRIEF.md's Figure card: 1px border, small-caps label above,
// plain-language caption below (Rule 3: "Figures are labelled" —
// label above, caption below, always). `media` is the diagram itself —
// inline SVG per the brief ("never raster"), though this component
// doesn't enforce that since it just renders whatever node it's given.
// `source` is optional and muted, for Rule 4 ("Sources always show")
// when a figure draws on a specific reference worth naming separately
// from the caption's own sentence.
//
// Width is deliberately not this component's concern — the brief uses
// this same card at several fixed widths depending on what it sits
// beside (a text column, a table), so sizing is left to the caller via
// `className`; the component only owns the card's own chrome.
export function Figure({
  label,
  media,
  caption,
  source,
  className = "",
}: {
  label: string;
  media: ReactNode;
  caption: string;
  source?: string;
  className?: string;
}) {
  return (
    <figure className={`rounded-[14px] border border-border px-[15px] pt-[13px] pb-2 ${className}`}>
      <div className="mb-[5px] font-ui text-[10.5px] font-black tracking-[1.5px] text-navy uppercase">
        {label}
      </div>
      {media}
      <figcaption className="mt-[7px] pb-1 font-ui text-[13px] leading-[1.4] text-secondary">
        {caption}
        {source && <span className="mt-0.5 block text-[11px] text-[#9AA5B4]">{source}</span>}
      </figcaption>
    </figure>
  );
}
