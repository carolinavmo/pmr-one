import type { ManeuverRelationship } from "./editorial-blocks";

// Reader-facing translation of the same enum editorial-blocks.ts's
// own `maneuverRelationshipLabel` already labels for the (English-
// only, deliberately untranslated per the i18n plan's "editor-only
// surface" carve-out) BlockPicker authoring UI. Kept as a separate
// lookup rather than reusing that one, since this one's values are
// `terms` message keys, not display strings themselves — the actual
// translated text always comes from the caller's `t`.
const MANEUVER_RELATIONSHIP_TERM_KEY: Record<ManeuverRelationship, string> = {
  confirms: "confirmsDiagnosis",
  assesses_contributing_factor: "contributingFactor",
  rules_out: "rulesOut",
};

export function maneuverRelationshipTerm(
  relationship: ManeuverRelationship,
  t: (key: string) => string
): string {
  return t(MANEUVER_RELATIONSHIP_TERM_KEY[relationship]);
}

// Small, fixed reader-facing labels inside ExaminationWorkflowBlockView
// that live in the `terms` namespace alongside the relationship labels
// above, rather than `blocks` — these describe fixed exam-maneuver
// metrics/fields, not chrome around a block type.
export const EXAM_METRIC_TERM_KEYS = {
  sensitivity: "sensitivity",
  specificity: "specificity",
  technique: "technique",
  positiveFinding: "positiveFinding",
} as const;
