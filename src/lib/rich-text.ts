import DOMPurify from "isomorphic-dompurify";
import type { CardColor } from "@/lib/editorial-blocks";
import { CARD_COLOR_ORDER, CARD_COLOR_LABEL, CARD_COLOR_SWATCH } from "@/lib/card-colors";

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

const ALLOWED_CLASSES = new Set<string>([
  BOLD_CLASS,
  UNDERLINE_CLASS,
  ITALIC_CLASS,
  STRIKETHROUGH_CLASS,
  LINK_CLASS,
  ...FONT_SIZE_ORDER.map((s) => FONT_SIZE_CLASS[s]),
  ...CARD_COLOR_ORDER.map((c) => TEXT_COLOR_CLASS[c]),
  ...CARD_COLOR_ORDER.map((c) => TEXT_BG_CLASS[c]),
]);

// span/br/b/strong/u/i/em/s were already-safe additions for pasted
// content (a browser's own paste handling can produce these before
// sanitize() ever runs); ul/ol/li/blockquote/a are the one genuine
// widening here — block-level list/quote markup and a real hyperlink,
// both requested features that don't fit the pure inline-span model
// the rest of this vocabulary uses.
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
];

// `href` is the one attribute here whose value isn't a fixed class
// token — restricted below to http(s) only (ALLOWED_URI_REGEXP), and
// `target`/`rel` are only ever the fixed pair this editor's own
// LinkButton sets ("_blank" / "noopener noreferrer"), not
// author-controlled values.
const ALLOWED_ATTR = ["class", "href", "target", "rel"];

// DOMPurify already blocks javascript:/data: URIs by default, but
// pinning this explicitly to http(s) is one line and removes any
// dependence on that default not changing under us.
const SAFE_URI_REGEXP = /^https?:\/\//i;

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
