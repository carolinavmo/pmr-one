// Resolved, presentation-ready shapes for the block types Plantar
// Fasciopathy's page actually needs (IMPLEMENTATION_PLAN.md Sprint 2).
// Deliberately NOT the raw editorial_block DB row: components here stay
// pure/presentational, and translating a DB row's
// referenced_object_type/referenced_object_id (or, for blocks that
// embed several objects, an id list in content_config) into one of
// these shapes is a data-loading concern that arrives with real seed
// content in Sprint 3 — same split already used for Tier 2 cards.

// Presentation-only grouping hint (spec §15A: display_config is
// "purely visual/presentation"). Consecutive blocks sharing the same
// `row` render together in a horizontal grid instead of full-width,
// one after another. Purely additive — a block with no `layout`
// renders exactly as it always has.
export type HorizontalAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "middle" | "bottom";

export interface BlockLayout {
  // `row` is now optional — a block can carry `layout` purely for its
  // own alignment/width (below) without ever having been combined into
  // a row with a sibling.
  row?: string;
  // Groups this block with other `row`-mates that share the same `col`
  // value into one vertically-stacked cell within the row, instead of
  // each being its own side-by-side cell — e.g. a paragraph stacked
  // above a Key Point, both still beside a taller image in the same
  // row. A row member with no `col` is simply its own single-block
  // cell (the pre-existing, pre-stacking behavior) — `col` is additive,
  // never required. Meaningless without `row` set. A row whose members
  // reduce to exactly one *cell* (regardless of how many blocks are
  // stacked inside it) renders as plain sequential blocks, no grid —
  // stacking only has a visible effect once a sibling cell exists.
  col?: string;
  // Width when inside a `row` (existing meaning) OR, with no `row` set,
  // this block's own standalone width within the reading column —
  // same field, same "how wide is this block" meaning either way, just
  // a different rendering context (BlockSequence branches on whether
  // `row` is set to decide which).
  width?: "1/4" | "1/2" | "1/3" | "2/3" | "3/4" | "full";
  // Horizontal position on the page when this block is standalone
  // (no `row`) and `width` is less than "full" — where the narrower
  // block sits in the reading column. Meaningless (ignored) once `row`
  // is set, since a row's own flex/grid placement already positions it.
  align?: HorizontalAlign;
  // This block's own vertical alignment within a shared row — only
  // meaningful when `row` is set and a sibling in that row is taller.
  // Unset means the pre-existing behavior (stretch to match the row).
  rowAlign?: VerticalAlign;
  // Text alignment inside the block's own content — independent of
  // width/row/position above.
  textAlign?: HorizontalAlign;
  // Vertical alignment of the block's content within its own card —
  // only has a visible effect where the block ends up taller than its
  // content (e.g. `rowAlign` left at the stretch default next to a
  // taller row sibling). Not every block type has a container this can
  // apply to (see ALIGNABLE_BLOCK_CAPABILITIES in AlignmentPicker.tsx).
  textVerticalAlign?: VerticalAlign;
}

interface BlockBase {
  layout?: BlockLayout;
  // editorial_block.position — needed by BlockControls (Author v1
  // Pass 1) to insert/move blocks relative to a known position without
  // a second round-trip. Purely additive, ignored by every existing
  // reader-facing consumer.
  position?: number;
}

export interface SectionHeadingBlock extends BlockBase {
  type: "section_heading";
  id: string;
  text: string;
}

// A lighter-weight heading for dividing content *within* a section
// without starting a new SectionCard — deliberately not indexed
// (OnThisPage, the sidebar's per-page index, and BlockSequence's own
// splitIntoSections all key strictly on "section_heading", so this
// type is invisible to all three automatically).
export interface SubsectionHeadingBlock extends BlockBase {
  type: "subsection_heading";
  id: string;
  text: string;
}

// Decorative-only palette for card backgrounds and badges — deliberately
// separate from the four *meaningful* colors (accent/trust/insight/
// warning, DESIGN_SYSTEM.md's Color System). "neutral" plus those four
// existing tokens are offered too, but as author choices, not because
// this type carries their reserved meaning — an author picking "trust"
// for a card is choosing the color, not asserting the card is
// editorially reviewed.
export type CardColor =
  | "neutral"
  | "accent"
  | "trust"
  | "insight"
  | "blue"
  | "violet"
  | "rose"
  | "slate"
  | "red"
  | "orange"
  | "yellow"
  | "lime"
  | "green"
  | "teal"
  | "cyan"
  | "sky"
  | "indigo"
  | "purple"
  | "fuchsia"
  | "pink";

export interface ParagraphBlock extends BlockBase {
  type: "paragraph";
  id: string;
  body: string;
  callout?: boolean;
  learningObjective?: string;
  expandable?: boolean;
  // Leading visual, callout cards only (rendering ignores these when
  // callout is false — plain running text doesn't get a leading icon).
  // `icon` is a curated Lucide set (CardIconName); `imageUrl` is an
  // escape hatch for when real illustration assets exist. imageUrl
  // wins if both are set.
  icon?: string;
  imageUrl?: string;
  imageAlt?: string;
  // Callout cards only, same as the leading visual above.
  cardStyle?: CardColor;
  badges?: { text: string; color: CardColor }[];
}

// Ungraded, untracked retrieval-practice prompt — reuses EvidenceBadge's
// click-to-reveal interaction. Deliberately NOT Quiz: no scoring, no
// spaced repetition, no dedicated Quiz Question object. See migration
// 0005 and LESSONS_LEARNED.md.
export interface SelfCheckBlock extends BlockBase {
  type: "self_check";
  id: string;
  question: string;
  answer: string;
}

export interface KeyPointBlock extends BlockBase {
  type: "key_point";
  id: string;
  text: string;
  // Decorative card color (#133 — "on all cards, option to change
  // colors"). Undefined renders the pre-existing plain neutral border,
  // so every Key Point authored before this field existed is unaffected.
  color?: CardColor;
}

export interface MedicalIllustrationBlock extends BlockBase {
  type: "medical_illustration";
  id: string;
  // Optional, not always-present — an author can remove the image
  // (referenced_object_id set back to NULL) without deleting the block
  // itself, so the block can sit empty, ready for a new image, the
  // same way any owns-content block can sit empty before its first
  // edit. `illustration.title` is the shared medical_illustration
  // row's own title (read-only here, never edited from this block —
  // editing it would rename the image on every other disease page
  // that reuses it, the same shared-object hazard Clinical Pearl
  // already established); `title`/`subtitle` below are this block's
  // own, never shared.
  illustration?: {
    title: string;
    assetUrl: string;
    altText: string;
  };
  title?: string;
  subtitle?: string;
  caption?: string;
  imageWidth?: "1/4" | "1/3" | "1/2" | "2/3" | "3/4" | "full";
  annotations?: { label: string; x: number; y: number }[];
  // Where the annotation legend (caption + numbered label list) sits
  // relative to the image. "bottom" (the default, matches
  // pre-existing behavior) stacks it full-width below the image;
  // "left"/"right" put it in a narrow column beside the image instead.
  legendPosition?: "bottom" | "left" | "right";
}

export interface ClinicalPearlBlock extends BlockBase {
  type: "clinical_pearl";
  id: string;
  pearl: {
    id: string;
    body: string;
    // How many places (pearl_attachment rows) reference this exact
    // pearl — Author v1 Pass 1's one real "editing a shared object"
    // moment. 1 means "just here," never shown to readers, only
    // surfaced to editors in edit mode.
    attachmentCount: number;
    attribution?: string;
  };
  // Block-owned, not on the shared pearl object — color is a per-
  // placement presentation choice, not part of the pearl's own reused
  // content (#133).
  color?: CardColor;
}

// A step is a decision node when it has at least one branch target set
// (nextStepIfTrue/nextStepIfFalse) — the read view walks the ordered
// step list until it hits one, renders everything before it as a
// linear chain of connected boxes, the decision step itself as a
// diamond (its `instruction` is the yes/no question), and each branch
// target as the start of its own short outcome chain, stacked into one
// card (matching "Adjuncts" + "Surgery" both appearing under one "No"
// outcome in the founder's reference image, rather than as further
// separate connected boxes). Deliberately single-decision: a step list
// with two decision nodes isn't specially handled, since every real
// algorithm authored so far only needs one branch point — the ordered-
// list-plus-branch-pointers shape doesn't prevent adding a second
// decision later if that changes, it just isn't rendered specially yet.
export interface TreatmentAlgorithmBlock extends BlockBase {
  type: "treatment_algorithm";
  id: string;
  algorithm: {
    id: string;
    name: string;
    lineOfTherapy?: string;
    steps: {
      id: string;
      order: number;
      instruction: string;
      branchCondition?: string;
      icon?: string;
      nextStepIfTrue?: string;
      nextStepIfFalse?: string;
    }[];
  };
}

export interface RehabilitationProgressionBlock extends BlockBase {
  type: "rehabilitation_progression";
  id: string;
  protocol: {
    id: string;
    name: string;
    exercises: {
      id: string;
      order: number;
      name: string;
      instructions?: string;
    }[];
  };
}

export type ManeuverRelationship =
  | "confirms"
  | "assesses_contributing_factor"
  | "rules_out";

export interface ExaminationWorkflowBlock extends BlockBase {
  type: "examination_workflow";
  id: string;
  maneuvers: {
    id: string;
    name: string;
    technique: string;
    positiveFinding: string;
    relationship: ManeuverRelationship;
    sensitivity?: number;
    specificity?: number;
  }[];
}

export interface ImagingFindingsBlock extends BlockBase {
  type: "imaging_findings";
  id: string;
  findings: {
    id: string;
    name: string;
    modality: string;
    description?: string;
    typicalUse?: string;
  }[];
}

export interface ReferenceListBlock extends BlockBase {
  type: "reference_list";
  id: string;
  references: {
    id: string;
    authors?: string;
    title: string;
    journal?: string;
    year?: number;
    url?: string;
  }[];
}

// A single prominent citation — singular embed like Risk Factor/
// Clinical Pearl, reusing the same shared `reference` table Reference
// List already draws from (reuse-first search, not owned text), but
// rendered as one highlighted card rather than joined into a shared
// list block. `kicker` (e.g. "Landmark Study", "Recent RCT") is the
// one piece of content this block owns itself — a category label the
// author chooses per placement, not part of the reference's own data.
export interface CitationCardBlock extends BlockBase {
  type: "citation_card";
  id: string;
  kicker: string;
  reference: {
    id: string;
    authors?: string;
    title: string;
    journal?: string;
    year?: number;
    url?: string;
  };
  color?: CardColor;
}

export interface WarningPitfallBlock extends BlockBase {
  type: "warning_pitfall";
  id: string;
  text: string;
  color?: CardColor;
}

export interface LearningObjectiveBlock extends BlockBase {
  type: "learning_objective";
  id: string;
  text: string;
  color?: CardColor;
}

// Ordered, owns-content — no underlying Knowledge Object, just a
// labeled sequence (e.g. a symptom or recovery timeline). Same step
// shape as Treatment Algorithm/Rehabilitation Progression's steps
// (label + optional description), but those two reference a real,
// reusable object; a Timeline doesn't need one.
// `title`/`subtitle` and each step's `icon` are all optional — a
// Timeline inserted fresh still renders as the original plain
// numbered list (icon falls back to the step's 1-based position, same
// fallback Tabs/Rich Table's row badges already use) until an author
// actually sets them, so existing timelines on the page needed no
// migration to keep rendering exactly as before.
// `orientation` (added later, still optional/defaulting to
// "horizontal" for the same zero-migration reason) swaps the
// icon-above-label-above-description row of connected nodes for a
// stacked list of icon-left/text-right rows joined by a vertical
// line — same steps data, a different read for a step sequence with
// longer descriptions that reads better top-to-bottom than
// left-to-right.
export interface TimelineBlock extends BlockBase {
  type: "timeline";
  id: string;
  title?: string;
  subtitle?: string;
  orientation?: "horizontal" | "vertical";
  steps: { label: string; description?: string; icon?: string }[];
}

// A small set of stat/fact tiles — the same shape the homepage's
// stats row already established (a number/short value + a label),
// just editable and embeddable inline in a disease page. Owns-content,
// no Knowledge Object, deliberately not a chart-building tool.
export interface InfographicBlock extends BlockBase {
  type: "infographic";
  id: string;
  tiles: { value: string; label: string }[];
}

// First Knowledge Object block type wired through the "+" picker's
// reuse-first insert path (AUTHORING_EXPERIENCE.md) — a short phrase
// pointing at a shared risk_factor row, not owned text.
export interface RiskFactorBlock extends BlockBase {
  type: "risk_factor";
  id: string;
  riskFactor: {
    id: string;
    name: string;
    diseaseCount: number;
  };
}

export interface ComparisonTableBlock extends BlockBase {
  type: "comparison_table";
  id: string;
  caption?: string;
  columns: string[];
  rows: string[][];
}

// Owns-content, no Knowledge Object — a phase/stage/option switcher
// (e.g. a rehab program's Phase 1-4, or treatment options by
// severity), each tab holding a small set of labeled checklists
// (`columns`). Deliberately not a generic "tab holds arbitrary
// sub-blocks" container — that's a much bigger, different feature
// (nested block composition); this is closer to Comparison Table's
// shape (structured, author-typed lists) than to BlockSequence's.
export interface TabsBlock extends BlockBase {
  type: "tabs";
  id: string;
  tabs: {
    icon?: string;
    label: string;
    sublabel?: string;
    // Optional longer description shown in the content header (e.g.
    // "Phase 1: Pain Management & Load Reduction") — the tab button
    // itself only ever shows the compact label/sublabel pair.
    title?: string;
    columns: { title: string; items: string[] }[];
  }[];
}

// The generic tabs case TabsBlock deliberately isn't — each tab is one
// optional image plus a free rich text body, the same "image column +
// prose column" shape OverviewBlock already uses, just repeated per
// tab instead of fixed to a single one. Same tab-switcher chrome
// (icon/label/sublabel, add/remove/reorder tabs) as TabsBlock, but the
// content underneath is prose+media, not structured checklists — for
// when an author wants to write real paragraphs and drop in pictures
// per tab (a rehab phase's own explanation, a differential's own
// writeup), not a phase-by-phase checklist comparison.
export interface MediaTabsBlock extends BlockBase {
  type: "media_tabs";
  id: string;
  tabs: {
    icon?: string;
    label: string;
    sublabel?: string;
    imageUrl?: string;
    // Same fixed fraction set OverviewBlock's own imageWidth uses —
    // the image column's share of the grid vs. the text column's.
    // Only meaningful while both imageUrl and body are present; either
    // one being absent already collapses this tab to a single column
    // (see MediaTabsBlockView), so a stale width from a since-removed
    // image/body is simply inert until the other one comes back.
    imageWidth?: "1/4" | "1/3" | "1/2" | "2/3" | "3/4";
    body: string;
  }[];
}

// A column's declared cell type governs every cell beneath it — the
// same "typed by position" idea Comparison Table's string[][] already
// uses, just with three shapes instead of one. Cell values are stored
// untagged (no per-cell "type" field duplicating the column's own)
// since the column is always known at render/edit time; a column-type
// change resets that column's cells to a fresh empty value rather than
// attempting a lossy text<->list<->scale conversion.
export type RichTableColumnType = "text" | "icon_list" | "scale";

export interface RichTableColumn {
  title: string;
  type: RichTableColumnType;
}

export type RichTableCellValue =
  | string
  | { icon?: string; label: string }[]
  | { label: string; value: number };

export interface RichTableRow {
  // Optional icon override for the row's leading badge; falls back to
  // the row's 1-based position when unset (e.g. Phase 1, 2, 3…, with a
  // later row overriding to a flag icon for "Return to sport").
  badgeIcon?: string;
  // Index-aligned with the block's `columns`.
  cells: RichTableCellValue[];
}

// Owns-content, no Knowledge Object — a generic table for structured
// overviews (e.g. a rehab phase progression, a workup comparison)
// that need more than Comparison Table's plain text grid: a leading
// numbered/icon badge per row, and per-column cell types (plain text,
// an icon+label list, or a labeled dot-scale). Deliberately reusable
// across any section, not modeled around rehab specifically — the
// founder asked for "this style" to be available elsewhere too.
export interface RichTableBlock extends BlockBase {
  type: "rich_table";
  id: string;
  title?: string;
  // Header label for the leading badge column (e.g. "Phase") — plain
  // text like every other column title, just stored separately since
  // that column's cells aren't author-typed the way the rest are.
  badgeColumnTitle?: string;
  columns: RichTableColumn[];
  rows: RichTableRow[];
}

// Fixed 3-tier evidence-grading widget — Strong/Moderate/Limited is a
// standard clinical evidence taxonomy, not an arbitrary author-typed
// list, so (unlike every other multi-item block in this system) tiers
// can't be added, removed, or reordered — only each tier's description
// is author-editable. Level implies its own icon/color/fill amount at
// render time, so nothing about the tier's identity needs storing
// beyond which of the three it is.
export type EvidenceLevel = "strong" | "moderate" | "limited";

export interface EvidenceSummaryBlock extends BlockBase {
  type: "evidence_summary";
  id: string;
  tiers: {
    level: EvidenceLevel;
    description: string;
  }[];
}

// A single number-forward card in five presentations sharing one
// value+label shape: `stat` (icon above value+label, optional link),
// `stat_horizontal` (icon beside a colored eyebrow label, big value,
// and a description line — founder reference: a "Prevalence ~10% of
// the general population" card, icon+text side by side rather than
// stacked), `metric` (big value, label, small subtext — no icon), and
// two progress read-outs of the same 0-100 `progress` field (`linear`,
// a bar; `circular`, a ring) sharing one label+subtext. Owns-content,
// no Knowledge Object — this is decorative emphasis for a number an
// author already knows (a stat from a paper, a rehab-progress metric
// the author already tracks in a Progress Card elsewhere in this
// system, restated here as a quick visual), not a live-computed KPI.
export type StatCardVariant =
  | "stat"
  | "stat_horizontal"
  | "metric"
  | "progress_linear"
  | "progress_circular";

export interface StatCardBlock extends BlockBase {
  type: "stat_card";
  id: string;
  variant: StatCardVariant;
  icon?: string;
  value: string;
  label: string;
  subtext?: string;
  progress?: number;
  linkUrl?: string;
  linkLabel?: string;
  color?: CardColor;
}

// Two images side by side with a label under each (e.g. Normal vs
// Pathological, Before vs After) — owns-content, storing its own
// pair of uploaded assets rather than referencing shared Medical
// Illustration objects, since a comparison pair is specific to this
// one placement, not something another disease page would reuse.
// Reuses the same local-disk upload mechanism illustrations already
// established (`saveUploadedIllustration`) rather than inventing a
// second asset-storage path.
export interface ImageComparisonBlock extends BlockBase {
  type: "image_comparison";
  id: string;
  title?: string;
  left: { assetUrl?: string; label: string };
  right: { assetUrl?: string; label: string };
}

// A composite summary card for a disease's Overview section — a
// block-owned image on the left, a prose paragraph top-right, and a
// fixed "Key Takeaway" callout bottom-right. Owns-content image (same
// local-disk upload path ImageComparisonBlock already established)
// rather than a shared Medical Illustration reference — this image is
// specific to one disease's overview card, not something another page
// would search-and-reuse, same reasoning entry #57 (LESSONS_LEARNED)
// used for Image Comparison. `keyTakeaway`'s label ("Key Takeaway")
// is fixed chrome, not authored text — only its body is editable,
// same as KeyPointBlock hardcodes its own "Key point" eyebrow.
export interface OverviewBlock extends BlockBase {
  type: "overview";
  id: string;
  imageUrl?: string;
  // The image column's own width within the block's two-column grid —
  // independent of `layout.width` (the whole block's width in the
  // reading column/row), same "own size vs. container size" split
  // MedicalIllustrationBlock's `imageWidth` already established. No
  // "full" option here (unlike that one) — a full-width image would
  // leave no room for the text column this block always has.
  imageWidth?: "1/4" | "1/3" | "1/2" | "2/3" | "3/4";
  // Which part of the image stays visible once `object-cover` fits it
  // into the (often differently-proportioned) box — a focal point, not
  // a true freeform crop; picked over a real crop tool as the lighter
  // control that covers the common case (the subject sits off-center
  // and gets clipped) without needing a drag-to-select UI.
  imagePosition?:
    | "top-left"
    | "top"
    | "top-right"
    | "left"
    | "center"
    | "right"
    | "bottom-left"
    | "bottom"
    | "bottom-right";
  paragraph: string;
  keyTakeaway: string;
}

// A generic editorial note in four tones. "Warning" and "Error" don't
// get their own dedicated color tokens — they reuse two existing
// tokens whose actual hues already match the reference design better
// than their own names suggest: `insight` (warm amber/gold, "clinical
// pearl only" per its own comment, but already reused decoratively
// elsewhere in this system) reads as the amber "caution" tone, and
// `warning` (a muted red, "held in reserve — red-flag differentials
// only") reads as the red "error/critical" tone — so no new tokens
// were needed once the mapping matched hue to meaning instead of
// matching token name to tone name. Distinct from Warning/Pitfall (a
// narrower, single-purpose block already threaded through the app) —
// this one is the general switchable-tone note, not fixed at insert
// time.
export type CalloutTone = "info" | "success" | "warning" | "error";

export interface CalloutBannerBlock extends BlockBase {
  type: "callout_banner";
  id: string;
  tone: CalloutTone;
  text: string;
}

// A standalone row of light/outline pill badges — icon, editable
// text, and a CardColor each — distinct from ParagraphBlock's own
// `badges` field (a solid dark-fill pill attached to that block's
// callout card specifically). This one is a block in its own right,
// insertable anywhere, for tagging a section with "High Yield",
// "Guideline", "Updated", etc. without needing a paragraph underneath
// it.
export interface BadgeRowBlock extends BlockBase {
  type: "badge_row";
  id: string;
  badges: { text: string; color: CardColor; icon?: string }[];
}

// A titled, color-coded vertical list — each item shows either a
// small icon badge or, when no icon is set, a plain bullet point
// (an author choice per item, not a whole-list toggle: some facts
// warrant an icon, others are fine as a bare bullet). One color per
// list, not per item — this reads as one coherent group (e.g. every
// "Aggravating Factor" is the same rose tone), unlike Badge Row where
// each pill is independently colored. Two of these placed in the same
// `display_config.layout` row (the existing Card Grid mechanism)
// reproduce a side-by-side comparison — e.g. Aggravating Factors
// (rose) next to Relieving Factors (trust) — without a dedicated
// two-column block type.
export interface IconListBlock extends BlockBase {
  type: "icon_list";
  id: string;
  title?: string;
  color: CardColor;
  // When set, each item's icon badge drops its tinted circle background
  // (ICON_BG_CLASS) and shows just the icon/bullet in the list's color —
  // an orthogonal display toggle, not a 9th CardColor value, since every
  // other block already treats CardColor as a fixed 8-value palette.
  transparentIcons?: boolean;
  items: { icon?: string; text: string }[];
}

// A small gallery of illustrated, numbered cards — freeform title,
// description, an optional block-owned photo/illustration, and
// optional freeform label/value stats (e.g. "Sensitivity: 85%", or
// anything else an author wants — not fixed to diagnostic metrics).
// Fully owns-content: no Knowledge Graph object behind it, so it's
// usable in any section (Exam, Treatment, Anatomy, Rehab...), not
// gated behind a specific object type's reuse-search flow. Was
// originally built maneuver-specific (`exam_maneuver_gallery`,
// referencing examination_maneuver) — generalized after that coupling
// blocked using it outside Exam sections; migration 0018 renamed the
// enum value, no new one was added.
export interface PhotoCardGalleryBlock extends BlockBase {
  type: "photo_card_gallery";
  id: string;
  items: {
    id: string;
    title: string;
    description: string;
    illustrationUrl?: string;
    metrics: { label: string; value: string }[];
  }[];
}

// A plain, block-owned image with one small caption line rendered
// below it — deliberately the lightest image block in the system.
// Distinct from MedicalIllustrationBlock (title/subtitle/annotations,
// numbered markers, sits on a shared reusable illustration row) and
// OverviewBlock (paired with a fixed paragraph+takeaway layout): this
// one is "drop an image into the flow, caption it, done," for the
// common case that doesn't need either of those. Block position comes
// from the standalone `layout.width`/`layout.align` every other
// alignable block already has via AlignmentPicker; `imageWidth` is the
// image's own size within that column — same field name, same 6-value
// scale, and the same picker UI as MedicalIllustrationBlock/
// OverviewBlock, reused rather than reinvented once the founder asked
// for it here too.
export interface SimpleImageBlock extends BlockBase {
  type: "simple_image";
  id: string;
  imageUrl?: string;
  caption?: string;
  imageWidth?: "1/4" | "1/3" | "1/2" | "2/3" | "3/4" | "full";
  // Crops the image to a fixed 4:3 box (object-cover) instead of
  // rendering it at its own natural aspect ratio — otherwise two
  // images with different source proportions at the same imageWidth
  // still read as different sizes, since only the width was ever
  // actually equalized. Same focal-point vocabulary as OverviewBlock's
  // imagePosition, for picking which part survives the crop.
  imageFocalPoint?:
    | "top-left"
    | "top"
    | "top-right"
    | "left"
    | "center"
    | "right"
    | "bottom-left"
    | "bottom"
    | "bottom-right";
}

// A small icon + label + bold text card — the founder's own "Key
// Takeaway" reference (OverviewBlock's fixed sub-card, itself hardcoded
// to one color and locked inside Overview) generalized into its own
// insertable block (#133): same visual language (icon chip, eyebrow
// label, emphasized text in a tinted/bordered card), but `label` is
// author-editable (not fixed chrome — "Key Takeaway" is just the
// default) and the whole card is colorable via the same CardColor
// system every other card in this pass got. Icon is fixed to a single
// glyph (Star) rather than a picker — matches the reference image
// exactly and keeps this block's own scope tight; swap for an icon
// picker later if that's ever asked for.
export interface HighlightCardBlock extends BlockBase {
  type: "highlight_card";
  id: string;
  label: string;
  text: string;
  color?: CardColor;
  imageUrl?: string;
  imageAlt?: string;
  // Where the image sits relative to the label+text column. "top"
  // (the default, matches pre-existing behavior) stacks it full-width
  // above the text; "left"/"right" put it in a fixed-width column
  // beside the text instead.
  imagePosition?: "top" | "left" | "right";
  // Same 6-value scale as MedicalIllustrationBlock/OverviewBlock/
  // SimpleImageBlock's own image width control. Unset falls back to a
  // position-appropriate default at render time (full for "top", a
  // quarter for "left"/"right") rather than a single stored default,
  // so switching position alone still looks reasonable before an
  // author ever touches this.
  imageWidth?: "1/4" | "1/3" | "1/2" | "2/3" | "3/4" | "full";
  // Same fixed-aspect-ratio crop as SimpleImageBlock's imageFocalPoint
  // — keeps a card's image the same shape regardless of what the
  // source photo's own proportions happen to be.
  imageFocalPoint?:
    | "top-left"
    | "top"
    | "top-right"
    | "left"
    | "center"
    | "right"
    | "bottom-left"
    | "bottom"
    | "bottom-right";
}

// A single icon + label + description row — one item's worth of
// Timeline's own step shape (#141), extracted as its own standalone,
// insertable block for a single fact that deserves an icon without a
// surrounding sequence (Timeline), a multi-item list (Icon List), or
// a colored/bordered card (Highlight Card). Icon sits in the same
// neutral bordered circle Timeline's steps use by default (border,
// surface-raised background, accent icon) rather than a colored chip
// — `color`, when an author sets one, swaps in the same
// CARD_COLOR_CHIP tint every other icon-bearing block already offers,
// but staying uncolored is the natural default for a single inline
// fact, not an oversight.
//
// `titleLayout` (added later, optional/defaulting to "above" for
// zero-migration reasons — same pattern as Timeline's own
// `orientation`, #141) swaps the default "title spans full width
// above the icon+label+description row" for "icon left, title/label/
// description all stacked to its right" — a "version 2" reading
// requested directly (icon on the left, three lines of text on the
// right, title topmost among them) rather than title reading as a
// section header over the whole block.
export interface IconTextBlock extends BlockBase {
  type: "icon_text";
  id: string;
  title?: string;
  icon?: string;
  label: string;
  description?: string;
  color?: CardColor;
  titleLayout?: "above" | "beside";
}

export type EditorialBlock =
  | SectionHeadingBlock
  | SubsectionHeadingBlock
  | ParagraphBlock
  | KeyPointBlock
  | MedicalIllustrationBlock
  | ClinicalPearlBlock
  | TreatmentAlgorithmBlock
  | RehabilitationProgressionBlock
  | ExaminationWorkflowBlock
  | ImagingFindingsBlock
  | ReferenceListBlock
  | CitationCardBlock
  | ComparisonTableBlock
  | SelfCheckBlock
  | RiskFactorBlock
  | WarningPitfallBlock
  | LearningObjectiveBlock
  | TimelineBlock
  | InfographicBlock
  | TabsBlock
  | MediaTabsBlock
  | RichTableBlock
  | EvidenceSummaryBlock
  | StatCardBlock
  | ImageComparisonBlock
  | CalloutBannerBlock
  | BadgeRowBlock
  | IconListBlock
  | PhotoCardGalleryBlock
  | OverviewBlock
  | SimpleImageBlock
  | HighlightCardBlock
  | IconTextBlock;

// No graph leakage (Tier 1, principle #6) — the raw relationship_type
// enum value must never reach the screen.
export const maneuverRelationshipLabel: Record<ManeuverRelationship, string> = {
  confirms: "Confirms diagnosis",
  assesses_contributing_factor: "Contributing factor",
  rules_out: "Rules out",
};
