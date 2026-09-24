// The Candy palette (FLASHCARDS-SPEC.md) — reserved for flashcard
// topics (flashcard_category rows) only, deliberately separate from
// the app-wide 20-color CardColor palette (card-colors.ts) used
// everywhere else. "Where the bright palette does not go: the
// navigation stays navy... these eight are for topics only."
export type TopicColor = "orange" | "pink" | "violet" | "mint" | "sky" | "sunny" | "coral" | "lime";

// Fixed creation order — also the order pickFreeTopicColor() cycles
// through when assigning a new topic's color.
export const TOPIC_COLOR_ORDER: TopicColor[] = ["orange", "pink", "violet", "mint", "sky", "sunny", "coral", "lime"];

export const TOPIC_COLOR_LABEL: Record<TopicColor, string> = {
  orange: "Orange",
  pink: "Pink",
  violet: "Violet",
  mint: "Mint",
  sky: "Sky",
  sunny: "Sunny",
  coral: "Coral",
  lime: "Lime",
};

// The swatch dot a picker shows — the full-strength ring/badge hex,
// same value `--topic` resolves to once applied via data-topic-color.
export const TOPIC_COLOR_HEX: Record<TopicColor, string> = {
  orange: "#FF8A3D",
  pink: "#F0569A",
  violet: "#7B61FF",
  mint: "#17BF9A",
  sky: "#2EA8FF",
  sunny: "#FFC53D",
  coral: "#FF6B6B",
  lime: "#9BD24A",
};

export function isTopicColor(value: string | null | undefined): value is TopicColor {
  return !!value && (TOPIC_COLOR_ORDER as string[]).includes(value);
}

// "Assign a free one on creation" — the first color in TOPIC_COLOR_ORDER
// not already used by a sibling topic in the same scope (the caller
// passes every topic_color already in use for this owner_type/user_id
// pair). Once all 8 are taken, wraps around to the least-recently-
// reused one instead of refusing — a color repeating on an 9th+ topic
// is a reasonable trade-off, not an error.
export function pickFreeTopicColor(usedColors: (TopicColor | null)[]): TopicColor {
  const used = new Set(usedColors.filter(isTopicColor));
  const free = TOPIC_COLOR_ORDER.find((c) => !used.has(c));
  if (free) return free;
  // All 8 taken — cycle by count so repeats spread out rather than
  // everyone past #8 landing on the same color.
  return TOPIC_COLOR_ORDER[usedColors.length % TOPIC_COLOR_ORDER.length];
}
