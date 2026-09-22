// A page's type (anatomy/biomechanics/examination/condition/
// rehabilitation/procedure) — design/LIBRARY-HOME-MIX-SPEC.md's
// Browse-by-area type tag and Hero "Browse:" chips. Nullable on the
// `disease` row (migration 0056): unset until an editor sets it by
// hand (/admin/page-types or the page's own header) — never inferred
// from the title.
export type DiseasePageType =
  | "anatomy"
  | "biomechanics"
  | "examination"
  | "condition"
  | "rehabilitation"
  | "procedure";

export const DISEASE_PAGE_TYPE_ORDER: DiseasePageType[] = [
  "anatomy",
  "biomechanics",
  "examination",
  "condition",
  "rehabilitation",
  "procedure",
];

export const DISEASE_PAGE_TYPE_LABEL: Record<DiseasePageType, string> = {
  anatomy: "Anatomy",
  biomechanics: "Biomechanics",
  examination: "Examination",
  condition: "Condition",
  rehabilitation: "Rehabilitation",
  procedure: "Procedure",
};

export function isDiseasePageType(value: unknown): value is DiseasePageType {
  return typeof value === "string" && (DISEASE_PAGE_TYPE_ORDER as string[]).includes(value);
}

// Deliberately neutral, never coloured (design/LIBRARY-HOME-MIX-SPEC.md
// — "colour already means area; coloured type tags would compete with
// it") — shared by the disease header's own tag and the library
// home's Browse-by-area rows, so the two never drift apart.
export const PAGE_TYPE_TAG_CLASS =
  "inline-flex items-center rounded-[6px] border border-border px-[7px] py-[3px] font-ui text-[10px] font-black tracking-[1px] text-secondary uppercase";
