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
// exports and dragging `pg` into the browser build. Deliberately left
// at the original 4 (not widened along with CARD_COLOR_ORDER below) —
// this is an auto-assignment cycle for topics with no explicit color
// yet, not a picker; a longer cycle just means two distant sibling
// topics take longer to visually repeat, which isn't a problem this
// needed solving.
export const DEFAULT_BRANCH_CYCLE: CardColor[] = ["blue", "violet", "rose", "slate"];

// 20 total: the 4 meaningful roles (neutral/accent/trust/insight) plus
// 16 purely decorative hues — widened from the original 4 decorative
// colors (blue/violet/rose/slate) to 16 (founder request: "around 20
// colors" for both the card-style and rich-text pickers, which both
// read this same list). The 12 additions are Tailwind's own 500-level
// hues, picked to sit clearly apart from the existing 4 rather than
// duplicate one (sky/cyan/indigo apart from blue, purple/fuchsia apart
// from violet, pink apart from rose).
export const CARD_COLOR_ORDER: CardColor[] = [
  "neutral",
  "accent",
  "trust",
  "insight",
  "blue",
  "violet",
  "rose",
  "slate",
  "red",
  "orange",
  "yellow",
  "lime",
  "green",
  "teal",
  "cyan",
  "sky",
  "indigo",
  "purple",
  "fuchsia",
  "pink",
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
  red: "Red",
  orange: "Orange",
  yellow: "Yellow",
  lime: "Lime",
  green: "Green",
  teal: "Teal",
  cyan: "Cyan",
  sky: "Sky",
  indigo: "Indigo",
  purple: "Purple",
  fuchsia: "Fuchsia",
  pink: "Pink",
};

// The picker's own swatch dot — a solid fill so the 20 options are
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
  red: "bg-card-red",
  orange: "bg-card-orange",
  yellow: "bg-card-yellow",
  lime: "bg-card-lime",
  green: "bg-card-green",
  teal: "bg-card-teal",
  cyan: "bg-card-cyan",
  sky: "bg-card-sky",
  indigo: "bg-card-indigo",
  purple: "bg-card-purple",
  fuchsia: "bg-card-fuchsia",
  pink: "bg-card-pink",
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
  red: "border-card-red/30 bg-card-red/5",
  orange: "border-card-orange/30 bg-card-orange/5",
  yellow: "border-card-yellow/30 bg-card-yellow/5",
  lime: "border-card-lime/30 bg-card-lime/5",
  green: "border-card-green/30 bg-card-green/5",
  teal: "border-card-teal/30 bg-card-teal/5",
  cyan: "border-card-cyan/30 bg-card-cyan/5",
  sky: "border-card-sky/30 bg-card-sky/5",
  indigo: "border-card-indigo/30 bg-card-indigo/5",
  purple: "border-card-purple/30 bg-card-purple/5",
  fuchsia: "border-card-fuchsia/30 bg-card-fuchsia/5",
  pink: "border-card-pink/30 bg-card-pink/5",
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
  red: "bg-badge-red text-white",
  orange: "bg-badge-orange text-white",
  yellow: "bg-badge-yellow text-white",
  lime: "bg-badge-lime text-white",
  green: "bg-badge-green text-white",
  teal: "bg-badge-teal text-white",
  cyan: "bg-badge-cyan text-white",
  sky: "bg-badge-sky text-white",
  indigo: "bg-badge-indigo text-white",
  purple: "bg-badge-purple text-white",
  fuchsia: "bg-badge-fuchsia text-white",
  pink: "bg-badge-pink text-white",
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
  red: "bg-card-red/15 text-card-red",
  orange: "bg-card-orange/15 text-card-orange",
  yellow: "bg-card-yellow/15 text-card-yellow",
  lime: "bg-card-lime/15 text-card-lime",
  green: "bg-card-green/15 text-card-green",
  teal: "bg-card-teal/15 text-card-teal",
  cyan: "bg-card-cyan/15 text-card-cyan",
  sky: "bg-card-sky/15 text-card-sky",
  indigo: "bg-card-indigo/15 text-card-indigo",
  purple: "bg-card-purple/15 text-card-purple",
  fuchsia: "bg-card-fuchsia/15 text-card-fuchsia",
  pink: "bg-card-pink/15 text-card-pink",
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
  red: "bg-card-red/10",
  orange: "bg-card-orange/10",
  yellow: "bg-card-yellow/10",
  lime: "bg-card-lime/10",
  green: "bg-card-green/10",
  teal: "bg-card-teal/10",
  cyan: "bg-card-cyan/10",
  sky: "bg-card-sky/10",
  indigo: "bg-card-indigo/10",
  purple: "bg-card-purple/10",
  fuchsia: "bg-card-fuchsia/10",
  pink: "bg-card-pink/10",
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
  red: "text-card-red",
  orange: "text-card-orange",
  yellow: "text-card-yellow",
  lime: "text-card-lime",
  green: "text-card-green",
  teal: "text-card-teal",
  cyan: "text-card-cyan",
  sky: "text-card-sky",
  indigo: "text-card-indigo",
  purple: "text-card-purple",
  fuchsia: "text-card-fuchsia",
  pink: "text-card-pink",
};
