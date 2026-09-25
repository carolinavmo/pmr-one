// The Browse-the-library subject grouping (FLASHCARDS-SPEC.md "The
// dashboard — final order" § Browse the library) — a coarser, fixed
// 4-way grouping of system topics, deliberately separate from the
// 8-color Candy `topicColor` palette (flashcard-topic-colors.ts) that
// topics themselves are colored with. Every flashcard_category row
// defaults to 'other' (migration 0066) so the browse grid always has a
// group to put a topic in.
export type FlashcardSubject = "msk" | "neuro" | "basic" | "other";

export const SUBJECT_ORDER: FlashcardSubject[] = ["msk", "neuro", "basic", "other"];

export const SUBJECT_LABEL: Record<FlashcardSubject, string> = {
  msk: "Musculoskeletal",
  neuro: "Neurology",
  basic: "Basic sciences",
  other: "Other",
};

export const SUBJECT_COLOR: Record<FlashcardSubject, string> = {
  msk: "#A8760F",
  neuro: "#5A479C",
  basic: "#0F8A6E",
  other: "#1F7A4D",
};

export function isFlashcardSubject(value: string | null | undefined): value is FlashcardSubject {
  return !!value && (SUBJECT_ORDER as string[]).includes(value);
}

// The messages.flashcards key holding each subject's translated,
// user-facing label — used everywhere a subject renders as text
// (the browse-section separators, the topic page's "from MSK in the
// library" subtitle). Distinct from SUBJECT_LABEL above, which is
// English-only and reserved for the editor's own Settings-tab picker.
export const SUBJECT_LABEL_KEY: Record<FlashcardSubject, string> = {
  msk: "subjectMsk",
  neuro: "subjectNeuro",
  basic: "subjectBasic",
  other: "subjectOther",
};
