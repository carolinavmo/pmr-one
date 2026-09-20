import type { ReactNode } from "react";

// DESIGN-BRIEF.md "Callouts" — named by what they do, coloured by
// type: title in small caps with a glyph, body below. Do not invent a
// fifth callout colour — anything that doesn't fit one of these four
// is body text (Heading hierarchy → Callouts rule).
const BASE_CLASS = "rounded-[13px] px-5 py-[17px]";
const LABEL_CLASS = "mb-1.5 flex items-center gap-2 text-[11px] font-black tracking-[1.6px]";

// Concept — purple, 5px left rule. The mental model / mechanism.
export function ConceptCallout({ children }: { children: ReactNode }) {
  return (
    <div className={`${BASE_CLASS} border-l-[5px] border-concept bg-concept-bg`}>
      <div className={`${LABEL_CLASS} text-concept`}>◆ CONCEPT</div>
      {children}
    </div>
  );
}

// Clinical pearl — amber, 2px border. The line worth remembering in
// clinic.
export function PearlCallout({ children }: { children: ReactNode }) {
  return (
    <div className={`${BASE_CLASS} border-2 border-insight bg-insight-bg`}>
      <div className={`${LABEL_CLASS} text-insight`}>★ CLINICAL PEARL</div>
      {children}
    </div>
  );
}

// Pitfall — red, 2px border. The mistake to avoid.
export function PitfallCallout({ children }: { children: ReactNode }) {
  return (
    <div className={`${BASE_CLASS} border-2 border-warning bg-warning-bg`}>
      <div className={`${LABEL_CLASS} text-warning`}>⚠ PITFALL</div>
      {children}
    </div>
  );
}

// Key numbers — solid navy. Figures worth memorising.
export function KeyNumbersCallout({ children }: { children: ReactNode }) {
  return (
    <div className={`${BASE_CLASS} bg-navy-fill`}>
      <div className={`${LABEL_CLASS} text-[#7FCBD1]`}>▣ KEY NUMBERS</div>
      {children}
    </div>
  );
}
