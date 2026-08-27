import { createHash } from "crypto";
import type { EditorialBlock } from "./editorial-blocks";

// Declares which leaf strings inside each block type's `content_config`
// are reader-facing prose worth machine-translating, versus structural/
// decorative fields (color, icon, width, layout, numeric values) that
// must never be sent to a translation API. Keyed by `EditorialBlock["type"]`
// so TypeScript makes adding a new block type without declaring its
// translation spec a compile error, not a silently-untranslated block
// type discovered by a reader in Brazil months later — this project has
// historically added a new block type roughly every 1-2 migrations.
export interface TranslatableFieldsSpec {
  // Each entry is a path into `content_config` — dot-separated for
  // object nesting, `[]` for "descend into this array." See walkPath()
  // below for the exact grammar (it's a handful of examples, not a
  // full JSONPath implementation — this project's block shapes don't
  // need more).
  fields: string[];
  // Present (and `fields` empty) when a block type has no translatable
  // text of its own — either because it only embeds a shared Knowledge
  // Graph object (the actual prose lives on that object's own row, and
  // gets its own `content_translation` entry keyed by that table, not
  // by this block), or because the content is bibliographic citation
  // data that must never be translated at all (translating a paper's
  // title/authors/journal misrepresents the source).
  reason?: string;
}

const EMBEDS_KNOWLEDGE_GRAPH_ROW =
  "embeds a shared Knowledge Graph row — its prose is translated via that table's own content_translation entry, not this block's content_config";

export const TRANSLATABLE_FIELDS: Record<EditorialBlock["type"], TranslatableFieldsSpec> = {
  section_heading: { fields: ["text"] },

  subsection_heading: { fields: ["text"] },

  paragraph: { fields: ["body", "learningObjective", "imageAlt", "badges[].text"] },

  self_check: { fields: ["question", "answer"] },

  key_point: { fields: ["text"] },

  // illustration.title/illustration.altText are a read-only mirror of
  // the shared medical_illustration row (never edited from this
  // block) — only the block-owned title/subtitle/caption/annotations
  // are this block's own content.
  medical_illustration: { fields: ["title", "subtitle", "caption", "annotations[].label"] },

  clinical_pearl: { fields: [], reason: EMBEDS_KNOWLEDGE_GRAPH_ROW },

  treatment_algorithm: { fields: [], reason: EMBEDS_KNOWLEDGE_GRAPH_ROW },

  rehabilitation_progression: { fields: [], reason: EMBEDS_KNOWLEDGE_GRAPH_ROW },

  examination_workflow: { fields: [], reason: EMBEDS_KNOWLEDGE_GRAPH_ROW },

  imaging_findings: { fields: [], reason: EMBEDS_KNOWLEDGE_GRAPH_ROW },

  reference_list: {
    fields: [],
    reason:
      "bibliographic citation data (authors/title/journal) — translating a citation misrepresents the actual paper, excluded entirely, not just deferred",
  },

  // `kicker` is the one piece of content this block owns itself (a
  // category label like "Landmark Study"); `reference.*` is the same
  // excluded bibliographic data as reference_list.
  citation_card: { fields: ["kicker"] },

  comparison_table: { fields: ["caption", "columns[]", "rows[][]"] },

  risk_factor: { fields: [], reason: EMBEDS_KNOWLEDGE_GRAPH_ROW },

  warning_pitfall: { fields: ["text"] },

  learning_objective: { fields: ["text"] },

  timeline: { fields: ["title", "subtitle", "steps[].label", "steps[].description"] },

  // tiles[].value is excluded — usually a bare number or short stat
  // string ("~10%"), not prose.
  infographic: { fields: ["tiles[].label"] },

  tabs: {
    fields: [
      "tabs[].label",
      "tabs[].sublabel",
      "tabs[].title",
      "tabs[].columns[].title",
      "tabs[].columns[].items[]",
    ],
  },

  media_tabs: { fields: ["tabs[].label", "tabs[].sublabel", "tabs[].body"] },

  // RichTableCellValue is a union (string | {icon,label}[] | {label,value}),
  // and a column's declared type governs every cell beneath it — rather
  // than branch on column type here, three paths are declared and each
  // is a no-op for cell shapes it doesn't apply to (walkPath silently
  // skips a non-string leaf and a `[]` step against a non-array), so
  // together they correctly cover all three column types without the
  // walker needing to know column typing at all:
  //   - "rows[].cells[]"        matches plain-string cells (text columns)
  //   - "rows[].cells[].label"  matches {label,value} cells (scale columns)
  //   - "rows[].cells[][].label" matches {icon,label}[] cells (icon_list columns)
  rich_table: {
    fields: [
      "title",
      "badgeColumnTitle",
      "columns[].title",
      "rows[].cells[]",
      "rows[].cells[].label",
      "rows[].cells[][].label",
    ],
  },

  // `level` is a fixed 3-value clinical taxonomy (strong/moderate/
  // limited), rendered via its own lookup elsewhere — not per-block text.
  evidence_summary: { fields: ["tiers[].description"] },

  // `value` is excluded — usually numeric/short ("85%"), not prose.
  stat_card: { fields: ["label", "subtext", "linkLabel"] },

  image_comparison: { fields: ["title", "left.label", "right.label"] },

  image_row: { fields: ["images[].label"] },

  callout_banner: { fields: ["text"] },

  badge_row: { fields: ["badges[].text"] },

  icon_list: { fields: ["title", "items[].text"] },

  // metrics[].value is excluded — freeform but usually a short stat
  // ("Sensitivity: 85%"), same reasoning as stat_card/infographic.
  photo_card_gallery: {
    fields: ["items[].title", "items[].description", "items[].metrics[].label"],
  },

  overview: { fields: ["paragraph", "keyTakeaway"] },

  simple_image: { fields: ["caption"] },

  // `color` is decorative, same exclusion reasoning as every other
  // cardStyle/color field in this file — only `label`/`text` are prose.
  highlight_card: { fields: ["label", "text"] },

  icon_text: { fields: ["title", "label", "description"] },
};

// Walks a single field path against `root`, calling `visit(get, set)`
// once per matched string leaf. Grammar: `.`-separated object keys,
// plus a literal `[]` token meaning "for each element of the array at
// this point, continue the remaining path against that element." A
// path that bottoms out on a non-string value (missing/optional field,
// or — deliberately, see rich_table above — a leaf of the wrong shape
// for this particular block instance) is silently skipped rather than
// throwing, since specs are declared per block *type*, not per
// instance, and not every optional field is present on every block.
function walk(
  parent: Record<string, unknown> | unknown[],
  key: string | number,
  tokens: string[],
  visit: (get: () => string, set: (value: string) => void) => void
): void {
  if (parent == null) return;
  const value = (parent as Record<string, unknown>)[key as never];

  if (tokens.length === 0) {
    if (typeof value !== "string") return;
    visit(
      () => (parent as Record<string, unknown>)[key as never] as string,
      (next) => {
        (parent as Record<string, unknown>)[key as never] = next as never;
      }
    );
    return;
  }

  const [head, ...rest] = tokens;
  if (head === "[]") {
    if (!Array.isArray(value)) return;
    value.forEach((_, index) => walk(value, index, rest, visit));
  } else {
    if (value == null || typeof value !== "object") return;
    walk(value as Record<string, unknown>, head, rest, visit);
  }
}

function walkPath(
  root: unknown,
  path: string,
  visit: (get: () => string, set: (value: string) => void) => void
): void {
  const tokens = path.match(/[A-Za-z0-9_]+|\[\]/g);
  if (!tokens || tokens.length === 0) return;
  const [head, ...rest] = tokens;
  walk({ root } as Record<string, unknown>, "root", [head, ...rest], visit);
}

// Collects every translatable leaf string from a block's content_config,
// in the same deterministic order `applyTranslatedStrings` below
// expects them back in — the shared traversal is what keeps collection
// (feeding the source hash and the DeepL batch) and reconstruction
// (rebuilding the translated blob) from ever disagreeing about field
// order, which would otherwise silently write one field's translation
// into a different field.
export function collectTranslatableStrings(
  type: EditorialBlock["type"],
  contentConfig: unknown
): string[] {
  const spec = TRANSLATABLE_FIELDS[type];
  const strings: string[] = [];
  for (const path of spec.fields) {
    walkPath(contentConfig, path, (get) => strings.push(get()));
  }
  return strings;
}

// Rebuilds a translated content_config blob from the source blob plus
// an ordered list of translated strings (same order collectTranslatableStrings
// produced for this exact block type + blob shape). Returns a deep
// clone — never mutates `contentConfig`.
export function applyTranslatedStrings(
  type: EditorialBlock["type"],
  contentConfig: unknown,
  translated: string[]
): unknown {
  const spec = TRANSLATABLE_FIELDS[type];
  const clone = structuredClone(contentConfig);
  let index = 0;
  for (const path of spec.fields) {
    walkPath(clone, path, (_get, set) => {
      set(translated[index]);
      index++;
    });
  }
  return clone;
}

// Hashes only the translatable projection of a block, not the raw
// content_config JSON — hashing the whole blob would mark translations
// stale on every cosmetic edit (cardStyle, icon, imageWidth, layout,
// position — all things the existing editor UI changes constantly),
// burning translation-API quota for zero linguistic change. A trivial
// join+sha256 is enough here: this hash only needs to detect "did the
// translatable text change," not resist adversarial collision.
export function hashTranslatableContent(type: EditorialBlock["type"], contentConfig: unknown): string {
  const strings = collectTranslatableStrings(type, contentConfig);
  return createHash("sha256").update(strings.join(" ")).digest("hex");
}
