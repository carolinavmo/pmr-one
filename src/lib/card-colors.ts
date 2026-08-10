import type { CardColor } from "@/lib/editorial-blocks";

// A single source of truth for the decorative card-color palette —
// the picker (used for both card backgrounds and badges), the card's
// own background treatment, and a badge's pill treatment all read
// this instead of each hand-rolling their own Tailwind class strings
// per color. "neutral" plus the four *meaningful* tokens (accent/
// trust/insight) are included as author-choosable options here, but
// this file (and CardColor's own comment in editorial-blocks.ts) is
// where that "these are decorative here, not a reused meaning" framing
// lives — warning is deliberately excluded, its whole value is staying
// rare (DESIGN_SYSTEM.md).
// The fallback cycle for a top-level topic nobody has explicitly
// colored yet — single source of truth for IndexSidebar.tsx (a Client
// Component) and topics.ts's getDiseaseBranchColor (server-only, pulls
// in the `pg` pool) so the two can share this constant without
// IndexSidebar's client bundle ever importing topics.ts's own runtime
// exports and dragging `pg` into the browser build.
export const DEFAULT_BRANCH_CYCLE: CardColor[] = ["blue", "violet", "rose", "slate"];

export const CARD_COLOR_ORDER: CardColor[] = [
  "neutral",
  "accent",
  "trust",
  "insight",
  "blue",
  "violet",
  "rose",
  "slate",
];

export const CARD_COLOR_LABEL: Record<CardColor, string> = {
  neutral: "Neutral",
  accent: "Accent",
  trust: "Trust",
  insight: "Insight",
  blue: "Blue",
  violet: "Violet",
  rose: "Rose",
  slate: "Slate",
};

// The picker's own swatch dot — a solid fill so the 8 options are
// distinguishable from each other at a glance.
export const CARD_COLOR_SWATCH: Record<CardColor, string> = {
  neutral: "bg-surface-raised border border-border",
  accent: "bg-accent",
  trust: "bg-trust",
  insight: "bg-insight",
  blue: "bg-card-blue",
  violet: "bg-card-violet",
  rose: "bg-card-rose",
  slate: "bg-card-slate",
};

// A card's own background — a quiet tint plus a matching border, not
// a loud fill (VISUAL_IDENTITY.md's "trust-not-hype" tone applies to
// decorative color too, not just the meaningful roles).
export const CARD_COLOR_CARD: Record<CardColor, string> = {
  neutral: "border-border bg-surface-raised",
  accent: "border-accent/30 bg-accent/5",
  trust: "border-trust/30 bg-trust/5",
  insight: "border-insight/30 bg-insight/5",
  blue: "border-card-blue/30 bg-card-blue/5",
  violet: "border-card-violet/30 bg-card-violet/5",
  rose: "border-card-rose/30 bg-card-rose/5",
  slate: "border-card-slate/30 bg-card-slate/5",
};

// A badge's pill treatment — a solid, fixed-dark fill with light text
// (founder request), not the light tint+border a card's own background
// uses. Reads the `--color-badge-*` tokens (globals.css), which are
// deliberately declared once and never swapped for dark mode — the
// badge is its own small dark chip regardless of the page around it.
export const CARD_COLOR_BADGE: Record<CardColor, string> = {
  neutral: "bg-badge-neutral text-white",
  accent: "bg-badge-accent text-white",
  trust: "bg-badge-trust text-white",
  insight: "bg-badge-insight text-white",
  blue: "bg-badge-blue text-white",
  violet: "bg-badge-violet text-white",
  rose: "bg-badge-rose text-white",
  slate: "bg-badge-slate text-white",
};

// A small colored icon-chip treatment (Explore sidebar topic icons,
// the admin topic editor) — a light tint background with matching
// icon/text color, distinct from both the card background (a border
// too, meant for a whole card) and the badge (a solid dark fill). Kept
// as its own lookup rather than reusing `CARD_COLOR_CARD` because a
// 24px icon chip and a full card need different opacity weights to
// both read correctly.
export const CARD_COLOR_CHIP: Record<CardColor, string> = {
  neutral: "bg-border/40 text-secondary",
  accent: "bg-accent/15 text-accent",
  trust: "bg-trust/15 text-trust",
  insight: "bg-insight/15 text-insight",
  blue: "bg-card-blue/15 text-card-blue",
  violet: "bg-card-violet/15 text-card-violet",
  rose: "bg-card-rose/15 text-card-rose",
  slate: "bg-card-slate/15 text-card-slate",
};

// A low-opacity full-row background wash (the Explore sidebar's
// "current section" highlight) — lighter than the chip above since it
// covers a whole row, not a small 24px square.
export const CARD_COLOR_TINT: Record<CardColor, string> = {
  neutral: "bg-border/20",
  accent: "bg-accent/10",
  trust: "bg-trust/10",
  insight: "bg-insight/10",
  blue: "bg-card-blue/10",
  violet: "bg-card-violet/10",
  rose: "bg-card-rose/10",
  slate: "bg-card-slate/10",
};

// Text color only, no background — the Explore sidebar's active-
// disease-link indicator (founder request: text color only, no
// highlighted background — that treatment stays reserved for the
// parent topic row's own "current section" wash, `CARD_COLOR_TINT`
// above).
export const CARD_COLOR_TEXT: Record<CardColor, string> = {
  neutral: "text-secondary",
  accent: "text-accent",
  trust: "text-trust",
  insight: "text-insight",
  blue: "text-card-blue",
  violet: "text-card-violet",
  rose: "text-card-rose",
  slate: "text-card-slate",
};
