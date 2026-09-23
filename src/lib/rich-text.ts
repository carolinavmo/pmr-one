import DOMPurify from "isomorphic-dompurify";
import type { CardColor } from "@/lib/editorial-blocks";
import { CARD_COLOR_ORDER, CARD_COLOR_LABEL, CARD_COLOR_SWATCH, CARD_COLOR_TINT, CARD_COLOR_TEXT } from "@/lib/card-colors";

// Inline text formatting for prose fields (paragraph body, key point,
// clinical pearl body, self-check question/answer) — a real per-
// selection rich text editor, not a whole-block style picker
// (ParagraphBlockView's cardStyle already covers that case). Stored as
// sanitized HTML directly in the same content_config string field
// (`body`/`text`/etc.) these fields already used for plain text — a
// field with no formatting is just HTML with no tags, so existing
// content needs no migration.
//
// Deliberately class-based, not inline `style` attributes: every
// formatting option maps to one fixed, pre-compiled Tailwind class
// (from the SAME token set card colors already use, so a passage
// colored "blue" here and a card colored "blue" there are the exact
// same hue, and both stay theme-aware in dark mode for free). A
// sanitizer allowlisting a *class name* from a small known set is far
// harder to get wrong than one trying to validate arbitrary CSS
// property/value pairs in a `style` string — no `url()`, no
// `expression()`, no way to smuggle a color value through even if
// something bypassed the allowlist.

export type FontSize = "sm" | "lg" | "2xl";

export const FONT_SIZE_ORDER: FontSize[] = ["sm", "lg", "2xl"];
export const FONT_SIZE_LABEL: Record<FontSize, string> = {
  sm: "Small",
  lg: "Large",
  "2xl": "X-Large",
};
export const FONT_SIZE_CLASS: Record<FontSize, string> = {
  sm: "text-sm",
  lg: "text-lg",
  "2xl": "text-2xl",
};

// Text color reuses the exact same 8-color decorative palette as
// cards/badges (card-colors.ts) — "neutral" here means "the reading
// column's own ink," not a fixed hex, so it still flips correctly in
// dark mode.
export const TEXT_COLOR_CLASS: Record<CardColor, string> = {
  neutral: "text-primary",
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
  navy: "text-card-navy",
  wine: "text-card-wine",
  umber: "text-card-umber",
  plum: "text-card-plum",
};

// Highlight/background — a visible tint (not the ~5% a card's own
// background uses) since this needs to read as "highlighted" against
// running text, not as a whole card's quiet backdrop.
export const TEXT_BG_CLASS: Record<CardColor, string> = {
  neutral: "bg-border",
  accent: "bg-accent/25",
  trust: "bg-trust/25",
  insight: "bg-insight/25",
  blue: "bg-card-blue/25",
  violet: "bg-card-violet/25",
  rose: "bg-card-rose/25",
  slate: "bg-card-slate/25",
  red: "bg-card-red/25",
  orange: "bg-card-orange/25",
  yellow: "bg-card-yellow/25",
  lime: "bg-card-lime/25",
  green: "bg-card-green/25",
  teal: "bg-card-teal/25",
  cyan: "bg-card-cyan/25",
  sky: "bg-card-sky/25",
  indigo: "bg-card-indigo/25",
  purple: "bg-card-purple/25",
  fuchsia: "bg-card-fuchsia/25",
  pink: "bg-card-pink/25",
  navy: "bg-card-navy/25",
  wine: "bg-card-wine/25",
  umber: "bg-card-umber/25",
  plum: "bg-card-plum/25",
};

export { CARD_COLOR_ORDER as TEXT_COLOR_ORDER, CARD_COLOR_LABEL as TEXT_COLOR_LABEL, CARD_COLOR_SWATCH as TEXT_COLOR_SWATCH };

export const BOLD_CLASS = "font-bold";
export const UNDERLINE_CLASS = "underline";
export const ITALIC_CLASS = "italic";
export const STRIKETHROUGH_CLASS = "line-through";

// Applied to every link this editor creates itself (LinkButton in
// RichEditableText) — a fixed look, same reasoning as every other
// class here: one known class beats trusting arbitrary author-supplied
// styling.
export const LINK_CLASS = "text-accent underline underline-offset-2";

// HANDBOOK-SPEC.md's "＋ Insert card" — five fixed presets (not a full
// 24-color picker like the disease-page highlight_card block gets;
// this is a plain-HTML-string editor, not the JSON block system, so
// there's no `color` field to store separately — the preset's class
// set is baked directly into the saved HTML, keyed back to a preset
// via `data-card-preset` purely so the toolbar can re-derive which
// icon/label a card was inserted as if it ever needs to, e.g. for
// export). `warning` isn't a real CardColor (card-colors.ts's own
// comment: deliberately excluded, staying rare) — "Red Flag" uses the
// decorative `red` hue instead, same swap "Definition" makes with
// `purple`.
export const ATLAS_CARD_PRESETS = {
  pearl: { label: "My Pearl", color: "insight" as CardColor },
  redFlag: { label: "Red Flag", color: "red" as CardColor },
  examTip: { label: "Exam Tip", color: "accent" as CardColor },
  inTheClinic: { label: "In the Clinic", color: "trust" as CardColor },
  definition: { label: "Definition", color: "purple" as CardColor },
} as const;
export type AtlasCardPreset = keyof typeof ATLAS_CARD_PRESETS;
export const ATLAS_CARD_PRESET_ORDER: AtlasCardPreset[] = [
  "pearl",
  "redFlag",
  "examTip",
  "inTheClinic",
  "definition",
];

// The card's own chrome classes — same CARD_COLOR_TINT/CARD_COLOR_TEXT
// tokens the real highlight_card block uses (HighlightCardShell.tsx),
// baked as static classes onto the saved <div> instead of a React
// prop, since this editor's whole content is a plain HTML string.
export const ATLAS_CARD_WRAPPER_CLASS = "rounded-[13px] p-4 flex flex-col gap-1.5";
export const ATLAS_CARD_LABEL_CLASS = "font-ui text-[11px] font-black tracking-[1.6px] uppercase";

// The class-filter hook (below) checks each space-split token
// individually, so a multi-class string like ATLAS_CARD_WRAPPER_CLASS
// has to be exploded into its individual tokens here — adding the
// whole string as one Set entry would never match anything real.
function classTokens(...classStrings: string[]): string[] {
  return classStrings.flatMap((s) => s.split(/\s+/).filter(Boolean));
}

const ALLOWED_CLASSES = new Set<string>([
  BOLD_CLASS,
  UNDERLINE_CLASS,
  ITALIC_CLASS,
  STRIKETHROUGH_CLASS,
  LINK_CLASS,
  ...classTokens(ATLAS_CARD_WRAPPER_CLASS, ATLAS_CARD_LABEL_CLASS),
  ...FONT_SIZE_ORDER.map((s) => FONT_SIZE_CLASS[s]),
  ...CARD_COLOR_ORDER.map((c) => TEXT_COLOR_CLASS[c]),
  ...CARD_COLOR_ORDER.map((c) => TEXT_BG_CLASS[c]),
  ...ATLAS_CARD_PRESET_ORDER.map((p) => CARD_COLOR_TINT[ATLAS_CARD_PRESETS[p].color]),
  ...ATLAS_CARD_PRESET_ORDER.map((p) => CARD_COLOR_TEXT[ATLAS_CARD_PRESETS[p].color]),
]);

// span/br/b/strong/u/i/em/s were already-safe additions for pasted
// content (a browser's own paste handling can produce these before
// sanitize() ever runs); ul/ol/li/blockquote/a are the one genuine
// widening here — block-level list/quote markup and a real hyperlink,
// both requested features that don't fit the pure inline-span model
// the rest of this vocabulary uses.
//
// h1/h2/h3/p/div/table.../img/hr — HANDBOOK-SPEC.md Pass 3's toolbar
// (AtlasToolbar.tsx): headings, a card node (a styled div), a task
// item (a div with data-checked — no <input>, see the sanitizer notes
// below), a table, and an uploaded image. This is the vocabulary's
// second genuine widening, same reasoning as the first: real block
// structure a plain inline-span model can't express.
const ALLOWED_TAGS = [
  "span",
  "br",
  "b",
  "strong",
  "u",
  "i",
  "em",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "h1",
  "h2",
  "h3",
  "p",
  "div",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "hr",
];

// `href`/`src` are the two attributes here whose values aren't fixed
// class tokens — `href` restricted to http(s) (ALLOWED_URI_REGEXP,
// below), `src` restricted *further*, to this app's own upload path
// only (see the hook below — DOMPurify's ALLOWED_URI_REGEXP applies to
// both attributes identically, so allowing arbitrary https images via
// that alone would also open `href` to nothing new, but would let a
// pasted `<img src="https://evil.example/...">` track a reader's IP
// merely by opening the note — same reasoning the existing `target`/
// `rel` force-set already applies to link attributes: this editor's
// own tools are the only thing allowed to produce these values).
// `alt` is free text (inert — never used as a URL or interpreted as
// CSS), same as the data-* attributes below.
// data-checked: task item state ("true"/"false" only, hook-enforced).
// data-card-preset: which of ATLAS_CARD_PRESET_ORDER a card is (purely
// informational — the card's actual look already lives in its class
// list; this just lets the toolbar re-identify a card's own preset for
// e.g. an edit affordance later).
// data-atlas-link-id: an internal link to another Handbook page (Pass
// 4's backlinks — a UUID, hook-enforced) — kept distinct from a plain
// `href` so "linked from" can find these by attribute without
// confusing them with an ordinary external link.
// data-disease-id/data-disease-slug/data-section-title: attribution on
// a "Pull from library" quote block (Pass 5) — plain inert text/ids,
// never a URL and never used to build one, so no value restriction
// beyond DOMPurify's own default attribute-value escaping.
const ALLOWED_ATTR = [
  "class",
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "data-checked",
  "data-card-preset",
  "data-atlas-link-id",
  "data-disease-id",
  "data-disease-slug",
  "data-section-title",
];

// DOMPurify already blocks javascript:/data: URIs by default, but
// pinning this explicitly to http(s) is one line and removes any
// dependence on that default not changing under us.
const SAFE_URI_REGEXP = /^https?:\/\//i;

// Same-origin only — this app's own /api/uploads/atlas/ route
// (uploadPageImageAction), never an arbitrary external image URL. See
// the ALLOWED_ATTR comment above for why this can't just reuse the
// href regex.
const SAFE_IMAGE_SRC_PATTERN = /^\/api\/uploads\/atlas\//;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let hookInstalled = false;
function installClassFilterHook() {
  if (hookInstalled) return;
  hookInstalled = true;
  // Runs on every attribute DOMPurify considers keeping — for `class`,
  // narrow it down to only the tokens this editor could have produced
  // itself, dropping anything else silently (not just tags/scripts:
  // an arbitrary class like `fixed inset-0 z-50` couldn't run code,
  // but could still be used to visually spoof the page, so it's
  // filtered here too, not just XSS-relevant attributes).
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName === "class") {
      data.attrValue = data.attrValue
        .split(/\s+/)
        .filter((cls) => ALLOWED_CLASSES.has(cls))
        .join(" ");
    } else if (data.attrName === "target") {
      data.attrValue = "_blank";
    } else if (data.attrName === "rel") {
      data.attrValue = "noopener noreferrer";
    } else if (data.attrName === "src") {
      // Doesn't fully remove the attribute (DOMPurify's hook API has
      // no "drop this attribute" signal short of `data.keepAttr =
      // false`, which removes it outright — used here since a stray
      // empty src="" would otherwise render as a broken-image icon for
      // no reason) for anything outside this app's own upload path.
      if (!SAFE_IMAGE_SRC_PATTERN.test(data.attrValue)) {
        data.keepAttr = false;
      }
    } else if (data.attrName === "data-checked") {
      data.attrValue = data.attrValue === "true" ? "true" : "false";
    } else if (data.attrName === "data-card-preset") {
      if (!(data.attrValue in ATLAS_CARD_PRESETS)) data.keepAttr = false;
    } else if (data.attrName === "data-atlas-link-id" || data.attrName === "data-disease-id") {
      if (!UUID_PATTERN.test(data.attrValue)) data.keepAttr = false;
    }
  });
}

// The one function every rich-text write and every rich-text render
// must pass through — called server-side before a save (the real
// enforcement point: this HTML is served to every reader of a
// published page, not just the editor who wrote it) and again
// client-side right before render (defense in depth, cheap given the
// tiny allowed vocabulary).
export function sanitizeRichText(html: string): string {
  installClassFilterHook();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: SAFE_URI_REGEXP,
  });
}
