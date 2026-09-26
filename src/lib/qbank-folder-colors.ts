// The Question Bank folder palette (QBANK-SPEC.md's "Pastel palette" —
// distinct from both the app-wide CardColor palette and Flashcards'
// own Candy topic-color palette). Deliberately just 8, all quiet
// pastels — "folders are quiet" is one of the redesign's own
// guardrails, so this palette has no loud/saturated option the way
// CardColor and Candy both do. Plain hex, not CSS custom properties —
// unlike Candy (which needs light/dark ring+bar theming wired through
// globals.css), a folder color here is only ever a light-mode card
// tint read directly off this table, so there's nothing a CSS
// indirection layer would buy yet. If a future pass needs dark-mode
// folder cards, wire these into globals.css the same way Candy is.
export type QbankFolderColor = "peach" | "rose" | "lilac" | "mint" | "sky" | "butter" | "sage" | "blush";

// Fixed creation order — also the order pickFreeQbankFolderColor()
// cycles through when assigning a new folder's color.
export const QBANK_FOLDER_COLOR_ORDER: QbankFolderColor[] = ["peach", "rose", "lilac", "mint", "sky", "butter", "sage", "blush"];

export const QBANK_FOLDER_COLOR_LABEL: Record<QbankFolderColor, string> = {
  peach: "Peach",
  rose: "Rose",
  lilac: "Lilac",
  mint: "Mint",
  sky: "Sky",
  butter: "Butter",
  sage: "Sage",
  blush: "Blush",
};

// tint — the card's own quiet background (QBANK-SPEC.md's `--cb`).
export const QBANK_FOLDER_COLOR_TINT: Record<QbankFolderColor, string> = {
  peach: "#FFF0E4",
  rose: "#FFEBF2",
  lilac: "#EFEBFC",
  mint: "#E3F6F0",
  sky: "#E7F2FB",
  butter: "#FFF6DF",
  sage: "#F0F7E4",
  blush: "#FFECEA",
};

// border — the accuracy pill's border (QBANK-SPEC.md's `--cd`).
export const QBANK_FOLDER_COLOR_BORDER: Record<QbankFolderColor, string> = {
  peach: "#F8D7BC",
  rose: "#F7CEDD",
  lilac: "#DBD3F5",
  mint: "#C3E9DF",
  sky: "#C7E1F4",
  butter: "#F2E3B8",
  sage: "#D7E9BD",
  blush: "#F8D2CF",
};

// accent — the pill text and "Open ›" link color (QBANK-SPEC.md's
// `--c`). Never the card name, which stays navy regardless of color —
// "text is always navy... contrast never depends on the hue."
export const QBANK_FOLDER_COLOR_ACCENT: Record<QbankFolderColor, string> = {
  peach: "#D9762F",
  rose: "#CE5C87",
  lilac: "#6F5FCB",
  mint: "#2E9B80",
  sky: "#4189C4",
  butter: "#B58A25",
  sage: "#6E9B39",
  blush: "#CE6660",
};

export function isQbankFolderColor(value: string | null | undefined): value is QbankFolderColor {
  return !!value && (QBANK_FOLDER_COLOR_ORDER as string[]).includes(value);
}

// "Assign a free one on creation" — same idiom as Flashcards'
// pickFreeTopicColor: the first color not already used by a sibling
// folder, wrapping around once all 8 are taken.
export function pickFreeQbankFolderColor(usedColors: (QbankFolderColor | null)[]): QbankFolderColor {
  const used = new Set(usedColors.filter(isQbankFolderColor));
  const free = QBANK_FOLDER_COLOR_ORDER.find((c) => !used.has(c));
  if (free) return free;
  return QBANK_FOLDER_COLOR_ORDER[usedColors.length % QBANK_FOLDER_COLOR_ORDER.length];
}
