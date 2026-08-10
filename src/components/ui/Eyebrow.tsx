import type { ReactNode } from "react";

// VISUAL_IDENTITY.md §2 — the small, uppercase, wide-tracked, accent-
// colored label placed before a named grouping at an arrival moment
// (a homepage module, a Disease Page hero) — never before in-flow
// section headings, which stay "flow," not "arrival."
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-ui text-xs font-medium tracking-wide text-accent uppercase">
      {children}
    </span>
  );
}
