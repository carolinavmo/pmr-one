import { useId } from "react";
import type { CardColor } from "@/lib/editorial-blocks";

// The 4 "meaningful" CardColor roles live at --color-{name} (no "card-"
// prefix, e.g. --color-accent) — only the 16 decorative hues are under
// --color-card-{name} (see card-colors.ts). "neutral" has no color
// token of its own (its chip treatment is just border/secondary-text
// gray), so it borrows --color-secondary instead.
const UNPREFIXED_ROLES = new Set<CardColor>(["accent", "trust", "insight"]);

function cssVarFor(color: CardColor): string {
  if (color === "neutral") return "var(--color-secondary)";
  if (UNPREFIXED_ROLES.has(color)) return `var(--color-${color})`;
  return `var(--color-card-${color})`;
}

// A glossy, macOS-style folder glyph (rounded body + integrated tab,
// top-to-bottom gradient, a soft diagonal shine, a subtle bottom
// crease) — replaces a flat single-tone icon where a folder needs to
// read as a folder at a glance, not just a labeled colored chip. Reads
// the same color token CardColor already resolves to everywhere else,
// so it stays correct in dark mode without its own color table:
// `color-mix` derives the light/dark gradient stops and shine/crease
// shades directly from that one token at render time.
export function MacFolderIcon({ color, className }: { color: CardColor; className?: string }) {
  const gradientId = useId();
  const base = cssVarFor(color);

  return (
    <svg viewBox="0 0 24 20" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: `color-mix(in oklab, ${base} 82%, white)` }} />
          <stop offset="100%" style={{ stopColor: `color-mix(in oklab, ${base} 82%, black)` }} />
        </linearGradient>
        <clipPath id={`${gradientId}-clip`}>
          <path d="M4,2 L9,2 Q10,2 10.6,2.8 L12,4.6 Q12.6,5 13.4,5 L20,5 Q23,5 23,8 L23,16 Q23,19 20,19 L4,19 Q1,19 1,16 L1,5 Q1,2 4,2 Z" />
        </clipPath>
      </defs>
      <path
        d="M4,2 L9,2 Q10,2 10.6,2.8 L12,4.6 Q12.6,5 13.4,5 L20,5 Q23,5 23,8 L23,16 Q23,19 20,19 L4,19 Q1,19 1,16 L1,5 Q1,2 4,2 Z"
        style={{ fill: `url(#${gradientId})` }}
      />
      <g clipPath={`url(#${gradientId}-clip)`}>
        <path
          d="M-2,3 L11,-2 L16,1 L2,7 Z"
          fill="white"
          opacity="0.16"
        />
        <rect x="1" y="15" width="22" height="1" style={{ fill: `color-mix(in oklab, ${base} 60%, black)` }} opacity="0.35" />
      </g>
    </svg>
  );
}
