"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { sanitizeRichText } from "@/lib/rich-text";
import { revalidateDiseaseSurfaces } from "@/lib/revalidation";
import type { BlockLayout, ImageRowBlock } from "@/lib/editorial-blocks";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Resolves the "asset storage" question AUTHORING_EXPERIENCE.md
// deliberately left open — local disk under public/, not cloud
// object storage. No new dependency, no credentials to configure,
// works today. Swapping to real object storage later only touches
// this one function's internals (write bytes, return a URL) — nothing
// about the schema, the block type, or the picker changes.
async function saveUploadedIllustration(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image is too large (8MB max).");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".png";
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "illustrations");
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), bytes);
  } catch (err) {
    // Surfaced to `railway logs` — the client only ever sees a generic
    // "Upload failed," so this is the one place the real OS error
    // (permissions, missing volume mount, disk full) is visible at all.
    console.error(`saveUploadedIllustration: failed writing to ${dir}`, err);
    throw new Error("Could not save the uploaded image.");
  }
  // Served via the dynamic route (route.ts's own comment explains
  // why a plain /uploads/... static path doesn't reliably work for a
  // file written after the server started).
  return `/api/uploads/illustrations/${filename}`;
}

export async function requireEditor() {
  const session = await auth();
  if (session?.user.role !== "editor" && session?.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

// Covers every owns-content prose type — paragraph (field "body");
// section_heading, key_point, warning_pitfall, learning_objective
// (field "text"); self_check ("question"/"answer"); a medical
// illustration block's own block-owned caption text ("title"/
// "subtitle" — distinct from the shared medical_illustration row's
// title, never mutated here); a simple_image block's own caption
// ("caption") — one action, several callers, matching how resolveBlock
// (disease-loader.ts) already treats these as plain content_config
// string fields regardless of block type.
export async function updateBlockTextAction(
  blockId: string,
  field: "body" | "text" | "question" | "answer" | "title" | "subtitle" | "caption" | "label",
  value: string
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block
     SET content_config = jsonb_set(content_config, ARRAY[$2::text], to_jsonb($3::text))
     WHERE id = $1`,
    [blockId, field, value]
  );
  revalidateDiseaseSurfaces();
}

// Card style is purely decorative (editorial-blocks.ts's CardColor
// comment) — a jsonb_set, same shape as every other single-field
// content_config write, not a new pattern.
export async function setCardStyleAction(
  blockId: string,
  color: string
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['cardStyle'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, color]
  );
  revalidateDiseaseSurfaces();
}

// One action for every card-style block that just needs a `color`
// field written (#133 — "on all cards, option to change colors"):
// Key Point, Clinical Pearl, Warning/Pitfall, Learning Objective,
// Citation Card, Highlight Card. Deliberately NOT used by Stat Card —
// updateStatCardAction replaces the *whole* content_config wholesale
// on every field edit, so a color written here via jsonb_set would be
// silently wiped by the next unrelated field save; Stat Card's own
// color picker folds `color` into that action's existing fields object
// instead (see StatCardBlockView).
export async function setBlockCardColorAction(blockId: string, color: string) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['color'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, color]
  );
  revalidateDiseaseSurfaces();
}

// Badges are freeform — an author's own text plus a color from the
// same decorative CardColor palette cards use, not a fixed, curated
// set like ClinicalBadge/EvidenceBadge/TrustIndicator (Tier 2). The
// whole array is replaced on every save, same as annotations
// (updateIllustrationAnnotationsAction) and timeline steps — small
// arrays, no per-item id worth managing server-side.
export async function updateParagraphBadgesAction(
  blockId: string,
  badges: { text: string; color: string }[]
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['badges'], $2::jsonb) WHERE id = $1`,
    [blockId, JSON.stringify(badges)]
  );
  revalidateDiseaseSurfaces();
}

// Separate from updateBlockTextAction on purpose — this is the one
// write path that runs untrusted HTML through the sanitizer
// (rich-text.ts) before it ever reaches the database. Every other
// text field (title, subtitle, headings, badges) stays plain text
// through the existing action; running plain text through an HTML
// sanitizer would just mangle any literal angle brackets an author
// typed on purpose.
export async function updateBlockRichTextAction(
  blockId: string,
  field: "body" | "text" | "question" | "answer" | "paragraph" | "keyTakeaway" | "title" | "subtitle" | "caption",
  html: string
) {
  await requireEditor();
  const clean = sanitizeRichText(html);
  await pool.query(
    `UPDATE editorial_block
     SET content_config = jsonb_set(content_config, ARRAY[$2::text], to_jsonb($3::text))
     WHERE id = $1`,
    [blockId, field, clean]
  );
  revalidateDiseaseSurfaces();
}

// A clinical pearl's body lives on clinical_pearl_editorial, not the
// block's own content_config — the block only holds a reference. This
// is Pass 1's one real Knowledge Object edit, not a block edit. Runs
// through the same rich-text sanitizer as updateBlockRichTextAction —
// a pearl's body is a RichEditableText field too, and since a pearl
// can be shared across diseases, unsanitized markup here would be
// exactly as dangerous on every other page that reuses it.
export async function updatePearlBodyAction(
  pearlId: string,
  body: string
) {
  await requireEditor();
  await pool.query(`UPDATE clinical_pearl_editorial SET body = $1 WHERE id = $2`, [
    sanitizeRichText(body),
    pearlId,
  ]);
  revalidateDiseaseSurfaces();
}

// (disease_id, position) is uniquely constrained, so a plain "+1"
// shift can collide mid-statement — Postgres doesn't guarantee row
// processing order, and a row landing on a not-yet-moved neighbor's
// position trips the constraint before the statement finishes. Two
// passes through negative territory sidesteps that: no shifted row's
// temporary (negative) value can ever equal another row's current
// (non-negative) value, in either pass, regardless of order. Shared by
// every insert path (prose blocks, and now Knowledge Object blocks
// like Risk Factors) so the fix lives in one place, not one per caller.
async function makeRoomAfter(diseaseId: string, afterPosition: number, count = 1) {
  await pool.query(
    `UPDATE editorial_block SET position = -(position + $3)
     WHERE disease_id = $1 AND position > $2`,
    [diseaseId, afterPosition, count]
  );
  await pool.query(
    `UPDATE editorial_block SET position = -position
     WHERE disease_id = $1 AND position < 0`,
    [diseaseId]
  );
}

// A "row" only means something as 2+ *cells* — a cell is one block, or
// several sharing `layout.col` stacked together (#132). If removing or
// moving a block leaves exactly one cell behind (regardless of how
// many blocks are stacked inside it), that cell isn't beside anything
// anymore, so every remaining member's whole layout clears — a lone
// cell has nothing left to be positioned/sized relative to, and a
// stack with no sibling cell is visually identical to plain sequential
// blocks anyway (BlockSequence's own row-vs-plain dispatch already
// treats a 1-cell group that way).
async function cleanupOrphanedRow(diseaseId: string, row: string) {
  const { rows } = await pool.query(
    `SELECT id, display_config->'layout'->>'col' AS col FROM editorial_block
     WHERE disease_id = $1 AND display_config->'layout'->>'row' = $2`,
    [diseaseId, row]
  );
  const cellKeys = new Set(rows.map((r) => r.col ?? r.id));
  if (cellKeys.size === 1) {
    for (const r of rows) {
      await pool.query(`UPDATE editorial_block SET display_config = display_config - 'layout' WHERE id = $1`, [
        r.id,
      ]);
    }
  }
}

type OwnsContentBlockType =
  | "paragraph"
  | "section_heading"
  | "subsection_heading"
  | "key_point"
  | "warning_pitfall"
  | "learning_objective"
  | "timeline"
  | "infographic"
  | "comparison_table"
  | "self_check"
  | "tabs"
  | "media_tabs"
  | "rich_table"
  | "evidence_summary"
  | "stat_card"
  | "image_comparison"
  | "image_row"
  | "callout_banner"
  | "badge_row"
  | "icon_list"
  | "photo_card_gallery"
  | "overview"
  | "simple_image"
  | "highlight_card"
  | "icon_text";

// Each owns-content type's starting shape — enough to have something
// on the page to click into and edit immediately, matching how
// Paragraph/Key Point already insert as an empty-but-editable block
// rather than nothing at all.
function emptyContentFor(blockType: OwnsContentBlockType) {
  switch (blockType) {
    case "paragraph":
      return { body: "" };
    case "timeline":
      return { steps: [{ label: "", description: "" }] };
    case "infographic":
      return { tiles: [{ value: "", label: "" }] };
    case "comparison_table":
      return { columns: ["", ""], rows: [["", ""]] };
    case "self_check":
      return { question: "", answer: "" };
    case "tabs":
      return { tabs: [{ label: "Phase 1", columns: [{ title: "Goals", items: [""] }] }] };
    case "media_tabs":
      return { tabs: [{ label: "Tab 1", body: "" }] };
    case "rich_table":
      return {
        title: "",
        badgeColumnTitle: "",
        columns: [{ title: "", type: "text" }],
        rows: [{ cells: [""] }],
      };
    case "evidence_summary":
      return {
        tiers: [
          { level: "strong", description: "Based on high-quality RCTs and systematic reviews." },
          { level: "moderate", description: "Based on moderate-quality studies." },
          { level: "limited", description: "Based on low-quality studies or expert opinion." },
        ],
      };
    case "stat_card":
      return { variant: "stat", value: "", label: "" };
    case "image_comparison":
      return { title: "", left: { label: "" }, right: { label: "" } };
    case "image_row":
      // Starts at the minimum (2) — ImageRowBlockView's own "Add
      // image" button grows it from there, capped at 4.
      return { images: [{ id: randomUUID(), label: "" }, { id: randomUUID(), label: "" }] };
    case "callout_banner":
      return { tone: "info", text: "" };
    case "badge_row":
      return { badges: [{ text: "New badge", color: "neutral" }] };
    case "icon_list":
      return { title: "", color: "neutral", items: [{ text: "" }] };
    case "photo_card_gallery":
      return { items: [{ id: randomUUID(), title: "", description: "", metrics: [] }] };
    case "overview":
      return { paragraph: "", keyTakeaway: "" };
    case "simple_image":
      return {};
    case "highlight_card":
      return { label: "Key Takeaway", text: "" };
    case "icon_text":
      return { label: "" };
    default:
      return { text: "" };
  }
}

export async function insertBlockAction(
  diseaseId: string,
  afterPosition: number,
  blockType: OwnsContentBlockType
) {
  await requireEditor();
  const contentConfig = emptyContentFor(blockType);

  await makeRoomAfter(diseaseId, afterPosition);
  await pool.query(
    `INSERT INTO editorial_block (disease_id, position, block_type, content_config)
     VALUES ($1, $2, $3, $4)`,
    [diseaseId, afterPosition + 1, blockType, contentConfig]
  );
  revalidateDiseaseSurfaces();
}

// Card Grid/Large Cards/Small Cards are the one picker entry that
// doesn't create a single new block — it inserts several at once,
// pre-grouped into a horizontal row via the same display_config.layout
// mechanism built for lesson #52-54, each an ordinary empty callout
// paragraph. Deliberately not a "select existing blocks to group"
// interaction (the harder, multi-select version of this feature named
// in AUTHORING_EXPERIENCE.md) — every other insert in this system
// creates something immediately editable rather than asking the author
// to first choose what to combine, and this keeps that same rhythm:
// a fresh, empty row appears, already grid-shaped, ready to type into
// with the exact same EditableText mechanism every paragraph already
// uses. Individual cards are managed exactly like any other block
// (BlockSequence now wraps grouped blocks in BlockControls too) — no
// separate "manage this card" mechanism was needed.
export async function insertCardGridBlockAction(
  diseaseId: string,
  afterPosition: number,
  cardCount: number,
  width: "1/4" | "1/3" | "1/2"
) {
  await requireEditor();
  const row = randomUUID();

  await makeRoomAfter(diseaseId, afterPosition, cardCount);
  for (let i = 0; i < cardCount; i++) {
    await pool.query(
      `INSERT INTO editorial_block (disease_id, position, block_type, content_config, display_config)
       VALUES ($1, $2, 'paragraph', $3, $4)`,
      [
        diseaseId,
        afterPosition + 1 + i,
        { body: "", callout: true },
        { layout: { row, width } },
      ]
    );
  }
  revalidateDiseaseSurfaces();
}

// `label`/`description` are both RichEditableText fields — each
// sanitized server-side before storage, same as every other
// rich-text-writing action here.
export async function updateTimelineStepsAction(
  blockId: string,
  steps: { label: string; description?: string; icon?: string }[]
) {
  await requireEditor();
  const clean = steps.map((s) => ({
    ...s,
    label: sanitizeRichText(s.label),
    description: s.description ? sanitizeRichText(s.description) : s.description,
  }));
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['steps'], $2::jsonb) WHERE id = $1`,
    [blockId, JSON.stringify(clean)]
  );
  revalidateDiseaseSurfaces();
}

// `title`/`subtitle` are both RichEditableText fields — sanitized
// server-side before storage, same as every other rich-text-writing
// action here.
export async function updateTimelineTitleAction(
  blockId: string,
  title: string,
  subtitle: string
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block
     SET content_config = jsonb_set(
       jsonb_set(content_config, ARRAY['title'], to_jsonb($2::text)),
       ARRAY['subtitle'], to_jsonb($3::text)
     )
     WHERE id = $1`,
    [blockId, title, subtitle]
  );
  revalidateDiseaseSurfaces();
}

export async function updateTimelineOrientationAction(
  blockId: string,
  orientation: "horizontal" | "vertical"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['orientation'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, orientation]
  );
  revalidateDiseaseSurfaces();
}

// `value`/`label` are both RichEditableText fields — sanitized
// server-side before storage, same as every other rich-text-writing
// action in this file.
export async function updateInfographicTilesAction(
  blockId: string,
  tiles: { value: string; label: string }[]
) {
  await requireEditor();
  const clean = tiles.map((t) => ({ value: sanitizeRichText(t.value), label: sanitizeRichText(t.label) }));
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['tiles'], $2::jsonb) WHERE id = $1`,
    [blockId, JSON.stringify(clean)]
  );
  revalidateDiseaseSurfaces();
}

// Same "whole array replace on any change" shape as
// updateTimelineStepsAction/updateInfographicTilesAction — tabs is a
// small, nested structure (tabs → columns → items) but no single
// piece of it is ever edited by more than one author at once, so
// there's nothing a finer-grained per-item action would buy here.
export async function updateTabsAction(
  blockId: string,
  tabs: {
    icon?: string;
    label: string;
    sublabel?: string;
    title?: string;
    columns: { title: string; items: string[] }[];
  }[]
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['tabs'], $2::jsonb) WHERE id = $1`,
    [blockId, JSON.stringify(tabs)]
  );
  revalidateDiseaseSurfaces();
}

// Same "sanitize the rich fields, commit the whole array" shape as
// updateTimelineStepsAction — each tab's `body` is a RichEditableText
// field (the others, icon/label/sublabel, are plain strings), so it
// goes through the same server-side sanitizer as every other
// RichEditableText-backed field before storage.
export async function updateMediaTabsAction(
  blockId: string,
  tabs: {
    icon?: string;
    label: string;
    sublabel?: string;
    imageUrl?: string;
    imageWidth?: "1/4" | "1/3" | "1/2" | "2/3" | "3/4";
    body: string;
  }[]
) {
  await requireEditor();
  const clean = tabs.map((t) => ({ ...t, body: sanitizeRichText(t.body) }));
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['tabs'], $2::jsonb) WHERE id = $1`,
    [blockId, JSON.stringify(clean)]
  );
  revalidateDiseaseSurfaces();
}

// Writes into tabs[tabIndex].imageUrl specifically — jsonb_set accepts
// a numeric-string path segment to address an array element, same as
// every other per-index jsonb write in this file. Returns the real
// assetUrl (not left for the caller to fabricate) — every other
// mutation on this block type commits the *whole* tabs array
// (updateMediaTabsAction), so the caller's local state must hold the
// real URL, never a client-only blob: preview, or the next unrelated
// whole-array commit (a label edit, a reorder) would persist that
// blob: URL — valid only in this one tab, for this one session — as
// if it were the saved image.
export async function uploadMediaTabsImageAction(
  blockId: string,
  tabIndex: number,
  formData: FormData
): Promise<string> {
  await requireEditor();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");
  const assetUrl = await saveUploadedIllustration(file);
  await pool.query(
    `UPDATE editorial_block
     SET content_config = jsonb_set(content_config, ARRAY['tabs', $2::text, 'imageUrl'], to_jsonb($3::text))
     WHERE id = $1`,
    [blockId, String(tabIndex), assetUrl]
  );
  revalidateDiseaseSurfaces();
  return assetUrl;
}

export async function removeMediaTabsImageAction(blockId: string, tabIndex: number) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block
     SET content_config = content_config #- ARRAY['tabs', $2::text, 'imageUrl']
     WHERE id = $1`,
    [blockId, String(tabIndex)]
  );
  revalidateDiseaseSurfaces();
}

export async function setMediaTabsImageWidthAction(
  blockId: string,
  tabIndex: number,
  width: "1/4" | "1/3" | "1/2" | "2/3" | "3/4"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block
     SET content_config = jsonb_set(content_config, ARRAY['tabs', $2::text, 'imageWidth'], to_jsonb($3::text))
     WHERE id = $1`,
    [blockId, String(tabIndex), width]
  );
  revalidateDiseaseSurfaces();
}

export async function updateComparisonTableAction(
  blockId: string,
  columns: string[],
  rows: string[][]
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block
     SET content_config = content_config || jsonb_build_object('columns', $2::jsonb, 'rows', $3::jsonb)
     WHERE id = $1`,
    [blockId, JSON.stringify(columns), JSON.stringify(rows)]
  );
  revalidateDiseaseSurfaces();
}

// Same whole-object-replace shape as updateComparisonTableAction —
// title/columns/rows always change together from this block's own
// local state, so there's no case where a finer-grained per-cell
// action would save a round-trip a full commit doesn't already cover.
// `title` is a RichEditableText field — sanitized server-side before
// storage, same as every other rich-text-writing action here. Every
// other field (column headers, cell values) stays plain text — see
// RichTableBlockView's own comment on why the table grid itself is
// excluded from this pass.
export async function updateRichTableAction(
  blockId: string,
  title: string,
  badgeColumnTitle: string,
  columns: { title: string; type: "text" | "icon_list" | "scale" }[],
  rows: {
    badgeIcon?: string;
    cells: (string | { icon?: string; label: string }[] | { label: string; value: number })[];
  }[]
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block
     SET content_config = content_config || jsonb_build_object(
       'title', $2::text,
       'badgeColumnTitle', $3::text,
       'columns', $4::jsonb,
       'rows', $5::jsonb
     )
     WHERE id = $1`,
    [blockId, sanitizeRichText(title), badgeColumnTitle, JSON.stringify(columns), JSON.stringify(rows)]
  );
  revalidateDiseaseSurfaces();
}

// Only each tier's description is ever sent — level/order are fixed
// (see EvidenceSummaryBlock's own comment), so there's nothing else
// for this action to accept.
// `description` is a RichEditableText field — sanitized server-side
// before storage, same as every other rich-text-writing action here.
export async function updateEvidenceSummaryAction(
  blockId: string,
  tiers: { level: "strong" | "moderate" | "limited"; description: string }[]
) {
  await requireEditor();
  const clean = tiers.map((t) => ({ ...t, description: sanitizeRichText(t.description) }));
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['tiers'], $2::jsonb) WHERE id = $1`,
    [blockId, JSON.stringify(clean)]
  );
  revalidateDiseaseSurfaces();
}

// `value`/`label`/`subtext`/`linkLabel` are all RichEditableText
// fields — each sanitized server-side before storage, same as every
// other rich-text-writing action here.
export async function updateStatCardAction(
  blockId: string,
  fields: {
    variant: "stat" | "stat_horizontal" | "metric" | "progress_linear" | "progress_circular";
    icon?: string;
    value: string;
    label: string;
    subtext?: string;
    progress?: number;
    linkUrl?: string;
    linkLabel?: string;
    color?: string;
  }
) {
  await requireEditor();
  const clean = {
    ...fields,
    value: sanitizeRichText(fields.value),
    label: sanitizeRichText(fields.label),
    subtext: fields.subtext ? sanitizeRichText(fields.subtext) : fields.subtext,
    linkLabel: fields.linkLabel ? sanitizeRichText(fields.linkLabel) : fields.linkLabel,
  };
  await pool.query(
    `UPDATE editorial_block SET content_config = $2::jsonb WHERE id = $1`,
    [blockId, JSON.stringify(clean)]
  );
  revalidateDiseaseSurfaces();
}

// Same "whole content_config replace" shape as updateStatCardAction —
// icon/label/description/color all commit together per interaction
// (icon pick, label blur, description blur, color pick), so there's
// no benefit to a finer-grained per-field jsonb_set here either.
// `title`/`label`/`description` are all RichEditableText fields — each
// incoming value is raw contentEditable innerHTML from the client, so
// each is re-sanitized server-side before storage, same as every
// other rich-text-writing action in this file (never trust the
// client's own sanitize call as the real enforcement point).
export async function updateIconTextAction(
  blockId: string,
  fields: {
    title?: string;
    icon?: string;
    label: string;
    description?: string;
    color?: string;
    titleLayout?: "above" | "beside";
  }
) {
  await requireEditor();
  const clean = {
    ...fields,
    title: fields.title ? sanitizeRichText(fields.title) : fields.title,
    label: sanitizeRichText(fields.label),
    description: fields.description ? sanitizeRichText(fields.description) : fields.description,
  };
  await pool.query(
    `UPDATE editorial_block SET content_config = $2::jsonb WHERE id = $1`,
    [blockId, JSON.stringify(clean)]
  );
  revalidateDiseaseSurfaces();
}

// `title`/`leftLabel`/`rightLabel` are all RichEditableText fields —
// each sanitized server-side before storage, same as every other
// rich-text-writing action here.
export async function updateImageComparisonLabelsAction(
  blockId: string,
  title: string,
  leftLabel: string,
  rightLabel: string
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block
     SET content_config = jsonb_set(
       jsonb_set(
         jsonb_set(content_config, ARRAY['title'], to_jsonb($2::text)),
         ARRAY['left', 'label'], to_jsonb($3::text)
       ),
       ARRAY['right', 'label'], to_jsonb($4::text)
     )
     WHERE id = $1`,
    [blockId, sanitizeRichText(title), sanitizeRichText(leftLabel), sanitizeRichText(rightLabel)]
  );
  revalidateDiseaseSurfaces();
}

// Reuses the same local-disk upload path illustrations already
// established — a comparison side is just an uploaded image plus the
// label already stored via updateImageComparisonLabelsAction, so only
// the `assetUrl` half of that side's object needs writing here.
export async function uploadImageComparisonSideAction(
  blockId: string,
  side: "left" | "right",
  formData: FormData
) {
  await requireEditor();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");
  const assetUrl = await saveUploadedIllustration(file);
  await pool.query(
    `UPDATE editorial_block
     SET content_config = jsonb_set(content_config, ARRAY[$2::text, 'assetUrl'], to_jsonb($3::text))
     WHERE id = $1`,
    [blockId, side, assetUrl]
  );
  revalidateDiseaseSurfaces();
}

export async function removeImageComparisonSideAction(
  blockId: string,
  side: "left" | "right"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block
     SET content_config = jsonb_set(content_config, ARRAY[$2::text], (content_config->$2::text) - 'assetUrl')
     WHERE id = $1`,
    [blockId, side]
  );
  revalidateDiseaseSurfaces();
}

// Image Row — the variable-count (2-4) sibling of Image Comparison's
// fixed left/right pair. Same "commit the whole array, looked up by
// generated id" pattern as Photo Card Gallery's items, rather than
// per-field jsonb paths, since slots are addressed by id, not index.
const IMAGE_ROW_MIN = 2;
const IMAGE_ROW_MAX = 4;

async function getImageRowItems(blockId: string): Promise<ImageRowBlock["images"]> {
  const { rows } = await pool.query(
    `SELECT content_config->'images' AS images FROM editorial_block WHERE id = $1`,
    [blockId]
  );
  return rows[0]?.images ?? [];
}

async function writeImageRowItems(blockId: string, images: unknown[]) {
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['images'], $2::jsonb) WHERE id = $1`,
    [blockId, JSON.stringify(images)]
  );
  revalidateDiseaseSurfaces();
}

// Returns the new item (specifically its server-generated `id`) so the
// client can add it to local state directly — same reasoning as
// addPhotoCardGalleryItemAction. No-ops past IMAGE_ROW_MAX rather than
// throwing — the button that calls this is already hidden at the cap,
// so reaching here past it would only happen from a stale client.
export async function addImageRowItemAction(blockId: string) {
  await requireEditor();
  const items = await getImageRowItems(blockId);
  if (items.length >= IMAGE_ROW_MAX) return items[items.length - 1];
  const newItem = { id: randomUUID(), label: "" };
  await writeImageRowItems(blockId, [...items, newItem]);
  return newItem;
}

export async function updateImageRowItemLabelAction(
  blockId: string,
  itemId: string,
  label: string
) {
  await requireEditor();
  const cleanLabel = sanitizeRichText(label);
  const items = await getImageRowItems(blockId);
  const updated = items.map((item) => (item.id === itemId ? { ...item, label: cleanLabel } : item));
  await writeImageRowItems(blockId, updated);
}

export async function uploadImageRowItemImageAction(
  blockId: string,
  itemId: string,
  formData: FormData
) {
  await requireEditor();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");
  const assetUrl = await saveUploadedIllustration(file);

  const items = await getImageRowItems(blockId);
  const updated = items.map((item) => (item.id === itemId ? { ...item, assetUrl } : item));
  await writeImageRowItems(blockId, updated);
}

export async function removeImageRowItemImageAction(blockId: string, itemId: string) {
  await requireEditor();
  const items = await getImageRowItems(blockId);
  const updated = items.map((item) => {
    if (item.id !== itemId) return item;
    const copy: Partial<typeof item> = { ...item };
    delete copy.assetUrl;
    return copy;
  });
  await writeImageRowItems(blockId, updated);
}

// Never drops below IMAGE_ROW_MIN — same reasoning as addImageRowItemAction's
// cap: the remove button is already hidden at the floor, so a request
// that would cross it only happens from a stale client, and silently
// no-op'ing is safer than leaving the row at 1 or 0 images.
export async function removeImageRowItemAction(blockId: string, itemId: string) {
  await requireEditor();
  const items = await getImageRowItems(blockId);
  if (items.length <= IMAGE_ROW_MIN) return;
  await writeImageRowItems(
    blockId,
    items.filter((item) => item.id !== itemId)
  );
}

// "cover" (default) crops into a square box at the row's shared
// height; "contain" keeps the image's own aspect ratio, no crop.
export async function setImageRowItemFitAction(
  blockId: string,
  itemId: string,
  fit: "cover" | "contain"
) {
  await requireEditor();
  const items = await getImageRowItems(blockId);
  const updated = items.map((item) => (item.id === itemId ? { ...item, imageFit: fit } : item));
  await writeImageRowItems(blockId, updated);
}

// Only meaningful in "cover" mode — same focal-point vocabulary as
// setOverviewImagePositionAction.
export async function setImageRowItemFocalPointAction(
  blockId: string,
  itemId: string,
  focalPoint:
    | "top-left"
    | "top"
    | "top-right"
    | "left"
    | "center"
    | "right"
    | "bottom-left"
    | "bottom"
    | "bottom-right"
) {
  await requireEditor();
  const items = await getImageRowItems(blockId);
  const updated = items.map((item) =>
    item.id === itemId ? { ...item, imageFocalPoint: focalPoint } : item
  );
  await writeImageRowItems(blockId, updated);
}

// Block-level, not per-item — the one shared height every image in
// the row scales to.
export async function setImageRowHeightAction(
  blockId: string,
  rowHeight: "sm" | "md" | "lg" | "xl"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['rowHeight'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, rowHeight]
  );
  revalidateDiseaseSurfaces();
}

// Same local-disk upload path as Image Comparison — an Overview
// block's image is a single owns-content asset, not a shared Medical
// Illustration reference.
export async function uploadOverviewImageAction(blockId: string, formData: FormData) {
  await requireEditor();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");
  const assetUrl = await saveUploadedIllustration(file);
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imageUrl'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, assetUrl]
  );
  revalidateDiseaseSurfaces();
}

export async function removeOverviewImageAction(blockId: string) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = content_config - 'imageUrl' WHERE id = $1`,
    [blockId]
  );
  revalidateDiseaseSurfaces();
}

// Same shape as setIllustrationWidthAction, minus "full" — an
// Overview block's image column always shares the row with a text
// column, so it can never take the whole width.
export async function setOverviewImageWidthAction(
  blockId: string,
  width: "1/4" | "1/3" | "1/2" | "2/3" | "3/4"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imageWidth'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, width]
  );
  revalidateDiseaseSurfaces();
}

export async function setOverviewImagePositionAction(
  blockId: string,
  position:
    | "top-left"
    | "top"
    | "top-right"
    | "left"
    | "center"
    | "right"
    | "bottom-left"
    | "bottom"
    | "bottom-right"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imagePosition'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, position]
  );
  revalidateDiseaseSurfaces();
}

// Same local-disk upload path as Overview/Image Comparison — a Simple
// Image block's image is a single owns-content asset. Deliberately no
// width/position sibling actions (unlike Overview/MedicalIllustration):
// this block's position on the page is the standalone
// layout.width/layout.align every AlignmentPicker-enabled block
// already has (updateBlockAlignmentAction), not a bespoke control.
export async function uploadSimpleImageAction(blockId: string, formData: FormData) {
  await requireEditor();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");
  const assetUrl = await saveUploadedIllustration(file);
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imageUrl'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, assetUrl]
  );
  revalidateDiseaseSurfaces();
}

export async function removeSimpleImageAction(blockId: string) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = content_config - 'imageUrl' WHERE id = $1`,
    [blockId]
  );
  revalidateDiseaseSurfaces();
}

// Same local-disk upload path as Simple Image, applied to a callout
// Paragraph's small leading-visual slot instead of a full-width figure
// — the field (`imageUrl`) already existed on the type and rendered
// correctly (ParagraphBlockView's `leadingVisual`); only the editor
// control to set it was missing.
export async function uploadParagraphImageAction(blockId: string, formData: FormData) {
  await requireEditor();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");
  const assetUrl = await saveUploadedIllustration(file);
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imageUrl'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, assetUrl]
  );
  revalidateDiseaseSurfaces();
}

export async function removeParagraphImageAction(blockId: string) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = content_config - 'imageUrl' WHERE id = $1`,
    [blockId]
  );
  revalidateDiseaseSurfaces();
}

// Same upload path again, for Highlight Card — the block editors
// actually reach for via the "+" picker (Teaching Point / Clinical Box
// cards), unlike the callout-Paragraph mode above which has no picker
// entry of its own.
export async function uploadHighlightCardImageAction(blockId: string, formData: FormData) {
  await requireEditor();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");
  const assetUrl = await saveUploadedIllustration(file);
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imageUrl'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, assetUrl]
  );
  revalidateDiseaseSurfaces();
}

export async function removeHighlightCardImageAction(blockId: string) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = content_config - 'imageUrl' WHERE id = $1`,
    [blockId]
  );
  revalidateDiseaseSurfaces();
}

export async function setHighlightCardImagePositionAction(
  blockId: string,
  position: "top" | "left" | "right"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imagePosition'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, position]
  );
  revalidateDiseaseSurfaces();
}

export async function setHighlightCardImageWidthAction(
  blockId: string,
  width: "1/4" | "1/3" | "1/2" | "2/3" | "3/4" | "full"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imageWidth'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, width]
  );
  revalidateDiseaseSurfaces();
}

// Same focal-point vocabulary as setOverviewImagePositionAction —
// which part of the image survives the fixed-aspect-ratio crop.
export async function setHighlightCardImageFocalPointAction(
  blockId: string,
  focalPoint:
    | "top-left"
    | "top"
    | "top-right"
    | "left"
    | "center"
    | "right"
    | "bottom-left"
    | "bottom"
    | "bottom-right"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imageFocalPoint'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, focalPoint]
  );
  revalidateDiseaseSurfaces();
}

// "crop" (default) fits the fixed-aspect-ratio box; "original" opts
// this one image back out to its own natural aspect ratio, no
// cropping at all.
export async function setHighlightCardImageFitAction(blockId: string, fit: "cover" | "contain" | "original") {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imageFit'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, fit]
  );
  revalidateDiseaseSurfaces();
}

// Same field name and 6-value scale as setIllustrationWidthAction —
// the image's own size within its column, independent of the block's
// row width (ResizableRow).
export async function setSimpleImageWidthAction(
  blockId: string,
  width: "1/4" | "1/3" | "1/2" | "2/3" | "3/4" | "full"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imageWidth'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, width]
  );
  revalidateDiseaseSurfaces();
}

// Same focal-point vocabulary as setOverviewImagePositionAction —
// which part of the image survives the fixed-aspect-ratio crop.
export async function setSimpleImageFocalPointAction(
  blockId: string,
  focalPoint:
    | "top-left"
    | "top"
    | "top-right"
    | "left"
    | "center"
    | "right"
    | "bottom-left"
    | "bottom"
    | "bottom-right"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imageFocalPoint'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, focalPoint]
  );
  revalidateDiseaseSurfaces();
}

// Same crop opt-out as setHighlightCardImageFitAction.
export async function setSimpleImageFitAction(blockId: string, fit: "cover" | "contain" | "original") {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imageFit'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, fit]
  );
  revalidateDiseaseSurfaces();
}

// `text` is a RichEditableText field — sanitized server-side before
// storage, same as every other rich-text-writing action here.
export async function updateCalloutBannerAction(
  blockId: string,
  tone: "info" | "success" | "warning" | "error",
  text: string
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_build_object('tone', $2::text, 'text', $3::text) WHERE id = $1`,
    [blockId, tone, sanitizeRichText(text)]
  );
  revalidateDiseaseSurfaces();
}

export async function updateBadgeRowAction(
  blockId: string,
  badges: { text: string; color: string; icon?: string }[]
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['badges'], $2::jsonb) WHERE id = $1`,
    [blockId, JSON.stringify(badges)]
  );
  revalidateDiseaseSurfaces();
}

// `items[].text` is a RichEditableText field — each incoming value is
// raw contentEditable innerHTML from the client, so each is
// re-sanitized server-side before storage, same as every other
// rich-text-writing action in this file (never trust the client's own
// sanitize call as the real enforcement point).
export async function updateIconListAction(
  blockId: string,
  title: string,
  color: string,
  items: { icon?: string; text: string }[],
  transparentIcons?: boolean
) {
  await requireEditor();
  const cleanItems = items.map((item) => ({ ...item, text: sanitizeRichText(item.text) }));
  await pool.query(
    `UPDATE editorial_block
     SET content_config = jsonb_build_object('title', $2::text, 'color', $3::text, 'items', $4::jsonb, 'transparentIcons', $5::boolean)
     WHERE id = $1`,
    [blockId, title, color, JSON.stringify(cleanItems), transparentIcons ?? false]
  );
  revalidateDiseaseSurfaces();
}

// Citation Card is a singular embed like Risk Factor/Clinical Pearl —
// search-or-create the shared reference here (searchReferencesAction,
// same table Reference List already draws from), then this block
// holds its own `kicker` alongside the reference id, same as how
// line_of_therapy is captured per-relationship for Treatment
// Algorithm rather than on the shared object.
export async function insertCitationCardAction(
  diseaseId: string,
  afterPosition: number,
  target:
    | { referenceId: string }
    | { title: string; authors: string; journal: string; year: string },
  kicker: string
) {
  await requireEditor();

  let referenceId: string;
  if ("referenceId" in target) {
    referenceId = target.referenceId;
  } else {
    const { rows } = await pool.query(
      `INSERT INTO reference (title, authors, journal, publication_year)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        target.title,
        target.authors || null,
        target.journal || null,
        target.year ? Number(target.year) : null,
      ]
    );
    referenceId = rows[0].id;
  }

  await makeRoomAfter(diseaseId, afterPosition);
  await pool.query(
    `INSERT INTO editorial_block (disease_id, position, block_type, referenced_object_id, content_config)
     VALUES ($1, $2, 'citation_card', $3, $4::jsonb)`,
    [diseaseId, afterPosition + 1, referenceId, JSON.stringify({ kicker: kicker || "Reference" })]
  );
  revalidateDiseaseSurfaces();
}

// `kicker` is a RichEditableText field — sanitized server-side before
// storage, same as every other rich-text-writing action here.
export async function updateCitationCardKickerAction(
  blockId: string,
  kicker: string
) {
  await requireEditor();
  const clean = sanitizeRichText(kicker);
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['kicker'], $2::jsonb) WHERE id = $1`,
    [blockId, JSON.stringify(clean)]
  );
  revalidateDiseaseSurfaces();
}

// Risk Factors are the first Knowledge Object type proving the
// reuse-first insert workflow (AUTHORING_EXPERIENCE.md, "Adding a
// block"): search existing risk factors before creating a new one, so
// authoring never quietly duplicates an object that already exists.
export async function searchRiskFactorsAction(query: string) {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT rf.id, rf.canonical_name,
       (SELECT count(*) FROM risk_factor_disease_relationship WHERE risk_factor_id = rf.id) AS disease_count
     FROM risk_factor rf
     WHERE rf.canonical_name ILIKE $1
     ORDER BY rf.canonical_name
     LIMIT 8`,
    [`%${query}%`]
  );
  return rows.map((row) => ({
    id: row.id as string,
    name: row.canonical_name as string,
    diseaseCount: Number(row.disease_count),
  }));
}

// riskFactorId reuses an existing object; riskFactorName (id omitted)
// creates a new one — the same findOrCreate split every seed script
// has followed since Sprint 3, now enforced by the UI itself: the
// picker only offers "Create new" once a search comes up empty.
export async function insertRiskFactorBlockAction(
  diseaseId: string,
  afterPosition: number,
  target: { riskFactorId: string } | { riskFactorName: string }
) {
  await requireEditor();

  let riskFactorId: string;
  if ("riskFactorId" in target) {
    riskFactorId = target.riskFactorId;
  } else {
    const { rows } = await pool.query(
      `INSERT INTO risk_factor (canonical_name, status) VALUES ($1, 'draft') RETURNING id`,
      [target.riskFactorName]
    );
    riskFactorId = rows[0].id;
  }

  await pool.query(
    `INSERT INTO risk_factor_disease_relationship (risk_factor_id, disease_id, relationship_type)
     VALUES ($1, $2, 'increases_risk_of')
     ON CONFLICT (risk_factor_id, disease_id) DO NOTHING`,
    [riskFactorId, diseaseId]
  );

  await makeRoomAfter(diseaseId, afterPosition);
  await pool.query(
    `INSERT INTO editorial_block (disease_id, position, block_type, referenced_object_id, content_config)
     VALUES ($1, $2, 'risk_factor', $3, '{}'::jsonb)`,
    [diseaseId, afterPosition + 1, riskFactorId]
  );
  revalidateDiseaseSurfaces();
}

// Clinical Pearl is the second Knowledge Object type wired through the
// reuse-first insert workflow — unlike Risk Factors, an existing pearl
// is matched by searching its body text (pearls don't have a separate
// canonical_name), and "used elsewhere" is counted via pearl_attachment
// rather than a per-disease relationship table.
export async function searchClinicalPearlsAction(query: string) {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT cpe.id, cpe.body,
       (SELECT count(*) FROM pearl_attachment WHERE clinical_pearl_id = cpe.id) AS attachment_count
     FROM clinical_pearl_editorial cpe
     WHERE cpe.body ILIKE $1
     ORDER BY cpe.created_at DESC
     LIMIT 8`,
    [`%${query}%`]
  );
  return rows.map((row) => ({
    id: row.id as string,
    body: row.body as string,
    attachmentCount: Number(row.attachment_count),
  }));
}

// pearlId reuses an existing pearl (attaching it to this disease via
// pearl_attachment, same table Pass 1's usage-count warning already
// reads); pearlBody (id omitted) creates a new one.
export async function insertClinicalPearlBlockAction(
  diseaseId: string,
  afterPosition: number,
  target: { pearlId: string } | { pearlBody: string }
) {
  await requireEditor();

  let pearlId: string;
  if ("pearlId" in target) {
    pearlId = target.pearlId;
  } else {
    const { rows } = await pool.query(
      `INSERT INTO clinical_pearl_editorial (body, status) VALUES ($1, 'draft') RETURNING id`,
      [target.pearlBody]
    );
    pearlId = rows[0].id;
  }

  await pool.query(
    `INSERT INTO pearl_attachment (clinical_pearl_id, target_type, target_id)
     SELECT $1, 'disease', $2
     WHERE NOT EXISTS (
       SELECT 1 FROM pearl_attachment WHERE clinical_pearl_id = $1 AND target_type = 'disease' AND target_id = $2
     )`,
    [pearlId, diseaseId]
  );

  await makeRoomAfter(diseaseId, afterPosition);
  await pool.query(
    `INSERT INTO editorial_block (disease_id, position, block_type, referenced_object_id, content_config)
     VALUES ($1, $2, 'clinical_pearl', $3, '{}'::jsonb)`,
    [diseaseId, afterPosition + 1, pearlId]
  );
  revalidateDiseaseSurfaces();
}

// Examination Workflow is the first "aggregator" block type wired
// through the picker — unlike Risk Factor/Clinical Pearl (one block
// per object), a disease has at most one examination_workflow block
// holding several maneuvers as an id array in content_config, matching
// how it's already rendered (founder decision: join the existing
// aggregator rather than fragment into a second, competing block).
export async function searchExaminationManeuversAction(query: string) {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT em.id, em.canonical_name,
       (SELECT count(*) FROM maneuver_disease_relationship WHERE examination_maneuver_id = em.id) AS disease_count
     FROM examination_maneuver em
     WHERE em.canonical_name ILIKE $1
     ORDER BY em.canonical_name
     LIMIT 8`,
    [`%${query}%`]
  );
  return rows.map((row) => ({
    id: row.id as string,
    name: row.canonical_name as string,
    diseaseCount: Number(row.disease_count),
  }));
}

// Shared by every "aggregator" block type (a disease has at most one
// block of that type, holding several object ids in content_config —
// examination_workflow, imaging_findings, reference_list all work this
// way). Joins the disease's existing block if one exists (deduped —
// re-adding an already-present id is a no-op), otherwise creates one.
// Extracted after Examination Workflow proved the mechanic, so the
// next aggregator type doesn't re-derive it from scratch.
async function joinOrCreateAggregatorBlock(
  diseaseId: string,
  afterPosition: number,
  blockType: string,
  idsField: string,
  objectId: string
) {
  const { rows: existingBlockRows } = await pool.query(
    `SELECT id, content_config FROM editorial_block
     WHERE disease_id = $1 AND block_type = $2 LIMIT 1`,
    [diseaseId, blockType]
  );
  const existingBlock = existingBlockRows[0];

  if (existingBlock) {
    const currentIds: string[] = existingBlock.content_config?.[idsField] ?? [];
    if (!currentIds.includes(objectId)) {
      await pool.query(
        `UPDATE editorial_block
         SET content_config = jsonb_set(content_config, ARRAY[$2::text], $3::jsonb)
         WHERE id = $1`,
        [existingBlock.id, idsField, JSON.stringify([...currentIds, objectId])]
      );
    }
  } else {
    await makeRoomAfter(diseaseId, afterPosition);
    await pool.query(
      `INSERT INTO editorial_block (disease_id, position, block_type, content_config)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [diseaseId, afterPosition + 1, blockType, JSON.stringify({ [idsField]: [objectId] })]
    );
  }
}

// The relationship type is a required, visible choice (the same
// glyph grammar readers see: confirms/rules out/contributing factor)
// — never a hidden default, per AUTHORING_EXPERIENCE.md's "no graph
// leakage" author-side corollary: pick a glyph, not an enum value
// you've never seen.
export async function insertExaminationManeuverAction(
  diseaseId: string,
  afterPosition: number,
  target: { maneuverId: string } | { maneuverName: string; technique: string; positiveFinding: string },
  relationshipType: "confirms" | "rules_out" | "assesses_contributing_factor"
) {
  await requireEditor();

  let maneuverId: string;
  if ("maneuverId" in target) {
    maneuverId = target.maneuverId;
  } else {
    const { rows } = await pool.query(
      `INSERT INTO examination_maneuver (canonical_name, technique, positive_finding, status)
       VALUES ($1, $2, $3, 'draft') RETURNING id`,
      [target.maneuverName, target.technique, target.positiveFinding]
    );
    maneuverId = rows[0].id;
  }

  await pool.query(
    `INSERT INTO maneuver_disease_relationship (examination_maneuver_id, disease_id, relationship_type)
     VALUES ($1, $2, $3)
     ON CONFLICT (examination_maneuver_id, disease_id, relationship_type) DO NOTHING`,
    [maneuverId, diseaseId, relationshipType]
  );

  await joinOrCreateAggregatorBlock(
    diseaseId,
    afterPosition,
    "examination_workflow",
    "maneuver_ids",
    maneuverId
  );
  revalidateDiseaseSurfaces();
}

// Photo Card Gallery — fully owns-content (no Knowledge Graph object
// behind it), so insertion goes through the plain insertBlockAction/
// emptyContentFor path like Icon List or Badge Row, not a search-or-
// create aggregator flow. Every mutation here rewrites the whole
// `items` array in one UPDATE — same "commit the whole list" pattern
// Icon List and Badge Row already use — rather than per-field jsonb
// paths, since items are looked up by their own generated `id`, not
// by array index.
async function getPhotoCardGalleryItems(
  blockId: string
): Promise<{ id: string; title: string; description: string; illustrationUrl?: string; metrics: { label: string; value: string }[] }[]> {
  const { rows } = await pool.query(
    `SELECT content_config->'items' AS items FROM editorial_block WHERE id = $1`,
    [blockId]
  );
  return rows[0]?.items ?? [];
}

async function writePhotoCardGalleryItems(
  blockId: string,
  items: unknown[]
) {
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['items'], $2::jsonb) WHERE id = $1`,
    [blockId, JSON.stringify(items)]
  );
  revalidateDiseaseSurfaces();
}

// Returns the new item (specifically its server-generated `id`) so
// the client can add it to local state directly — a client-generated
// placeholder id would never reconcile with the real one until a full
// page reload, since this component's local state is seeded once from
// `block.items` on mount and doesn't re-sync from fresh props after
// revalidatePath (same as every other list-editing block this session
// — Icon List, Badge Row — but those never needed a fresh server id
// mid-session, so the gap never surfaced until an add-then-remove-
// before-reload sequence here).
export async function addPhotoCardGalleryItemAction(blockId: string) {
  await requireEditor();
  const items = await getPhotoCardGalleryItems(blockId);
  const newItem = { id: randomUUID(), title: "", description: "", metrics: [] };
  await writePhotoCardGalleryItems(blockId, [...items, newItem]);
  return newItem;
}

// `title`/`description` are both RichEditableText fields — each
// sanitized server-side before storage, same as every other
// rich-text-writing action here.
export async function updatePhotoCardGalleryItemAction(
  blockId: string,
  itemId: string,
  title: string,
  description: string
) {
  await requireEditor();
  const cleanTitle = sanitizeRichText(title);
  const cleanDescription = sanitizeRichText(description);
  const items = await getPhotoCardGalleryItems(blockId);
  const updated = items.map((item) =>
    item.id === itemId ? { ...item, title: cleanTitle, description: cleanDescription } : item
  );
  await writePhotoCardGalleryItems(blockId, updated);
}

export async function updatePhotoCardGalleryMetricsAction(
  blockId: string,
  itemId: string,
  metrics: { label: string; value: string }[]
) {
  await requireEditor();
  const items = await getPhotoCardGalleryItems(blockId);
  const updated = items.map((item) => (item.id === itemId ? { ...item, metrics } : item));
  await writePhotoCardGalleryItems(blockId, updated);
}

export async function uploadPhotoCardGalleryIllustrationAction(
  blockId: string,
  itemId: string,
  formData: FormData
) {
  await requireEditor();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");
  const assetUrl = await saveUploadedIllustration(file);

  const items = await getPhotoCardGalleryItems(blockId);
  const updated = items.map((item) =>
    item.id === itemId ? { ...item, illustrationUrl: assetUrl } : item
  );
  await writePhotoCardGalleryItems(blockId, updated);
}

export async function removePhotoCardGalleryIllustrationAction(
  blockId: string,
  itemId: string
) {
  await requireEditor();
  const items = await getPhotoCardGalleryItems(blockId);
  const updated = items.map((item) => {
    if (item.id !== itemId) return item;
    const copy: Partial<typeof item> = { ...item };
    delete copy.illustrationUrl;
    return copy;
  });
  await writePhotoCardGalleryItems(blockId, updated);
}

export async function removePhotoCardGalleryItemAction(
  blockId: string,
  itemId: string
) {
  await requireEditor();
  const items = await getPhotoCardGalleryItems(blockId);
  await writePhotoCardGalleryItems(blockId, items.filter((item) => item.id !== itemId));
}

// Diagnostic Imaging is the second aggregator type. Its relationship
// to a disease is a single fixed value ('suggests', CHECK-constrained
// at the schema level) — no glyph choice needed, unlike a maneuver's
// three-way relationship.
export async function searchImagingFindingsAction(query: string) {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT f.id, f.canonical_name, f.modality,
       (SELECT count(*) FROM imaging_finding_disease_relationship WHERE imaging_finding_id = f.id) AS disease_count
     FROM imaging_finding f
     WHERE f.canonical_name ILIKE $1
     ORDER BY f.canonical_name
     LIMIT 8`,
    [`%${query}%`]
  );
  return rows.map((row) => ({
    id: row.id as string,
    name: row.canonical_name as string,
    modality: row.modality as string,
    diseaseCount: Number(row.disease_count),
  }));
}

export async function insertImagingFindingAction(
  diseaseId: string,
  afterPosition: number,
  target: { findingId: string } | { findingName: string; modality: string; description: string }
) {
  await requireEditor();

  let findingId: string;
  if ("findingId" in target) {
    findingId = target.findingId;
  } else {
    const { rows } = await pool.query(
      `INSERT INTO imaging_finding (canonical_name, modality, description, status)
       VALUES ($1, $2, $3, 'draft') RETURNING id`,
      [target.findingName, target.modality, target.description || null]
    );
    findingId = rows[0].id;
  }

  await pool.query(
    `INSERT INTO imaging_finding_disease_relationship (imaging_finding_id, disease_id, relationship_type)
     VALUES ($1, $2, 'suggests')
     ON CONFLICT (imaging_finding_id, disease_id) DO NOTHING`,
    [findingId, diseaseId]
  );

  await joinOrCreateAggregatorBlock(
    diseaseId,
    afterPosition,
    "imaging_findings",
    "imaging_finding_ids",
    findingId
  );
  revalidateDiseaseSurfaces();
}

// References is the third aggregator type, and the odd one out: there
// is no reference_disease_relationship table, so "how many pages use
// this reference" can't come from a join — it's read by checking which
// reference_list blocks' own content_config array already contains the
// id (`@>` jsonb containment), the only place in the picker that
// counts usage this way instead of via a relationship table.
export async function searchReferencesAction(query: string) {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT r.id, r.title, r.authors, r.journal, r.publication_year,
       (SELECT count(*) FROM editorial_block eb
        WHERE eb.block_type = 'reference_list'
          AND eb.content_config->'reference_ids' @> to_jsonb(r.id::text)) AS usage_count
     FROM reference r
     WHERE r.title ILIKE $1 OR r.authors ILIKE $1
     ORDER BY r.title
     LIMIT 8`,
    [`%${query}%`]
  );
  return rows.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    authors: row.authors as string | null,
    journal: row.journal as string | null,
    year: row.publication_year as number | null,
    usageCount: Number(row.usage_count),
  }));
}

export async function insertReferenceAction(
  diseaseId: string,
  afterPosition: number,
  target:
    | { referenceId: string }
    | { title: string; authors: string; journal: string; year: string }
) {
  await requireEditor();

  let referenceId: string;
  if ("referenceId" in target) {
    referenceId = target.referenceId;
  } else {
    const { rows } = await pool.query(
      `INSERT INTO reference (title, authors, journal, publication_year)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        target.title,
        target.authors || null,
        target.journal || null,
        target.year ? Number(target.year) : null,
      ]
    );
    referenceId = rows[0].id;
  }

  await joinOrCreateAggregatorBlock(
    diseaseId,
    afterPosition,
    "reference_list",
    "reference_ids",
    referenceId
  );
  revalidateDiseaseSurfaces();
}

// Medical Illustration is a singular embed, same shape as Risk Factor/
// Clinical Pearl — but unlike every other reference-object type built
// so far, it has no create-new path at all. AUTHORING_EXPERIENCE.md
// scoped upload out of v1 (asset storage is an undecided question, not
// a missing feature this action should paper over): search-and-reuse
// of existing illustrations only.
export async function searchMedicalIllustrationsAction(query: string) {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT mi.id, mi.title, mi.asset_url,
       (SELECT count(*) FROM illustration_usage WHERE medical_illustration_id = mi.id) AS usage_count
     FROM medical_illustration mi
     WHERE mi.title ILIKE $1
     ORDER BY mi.title
     LIMIT 8`,
    [`%${query}%`]
  );
  return rows.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    assetUrl: row.asset_url as string,
    usageCount: Number(row.usage_count),
  }));
}

export async function insertMedicalIllustrationBlockAction(
  diseaseId: string,
  afterPosition: number,
  illustrationId: string
) {
  await requireEditor();

  await pool.query(
    `INSERT INTO illustration_usage (medical_illustration_id, target_type, target_id)
     VALUES ($1, 'disease', $2)
     ON CONFLICT (medical_illustration_id, target_type, target_id) DO NOTHING`,
    [illustrationId, diseaseId]
  );

  await makeRoomAfter(diseaseId, afterPosition);
  await pool.query(
    `INSERT INTO editorial_block (disease_id, position, block_type, referenced_object_id, content_config)
     VALUES ($1, $2, 'medical_illustration', $3, '{}'::jsonb)`,
    [diseaseId, afterPosition + 1, illustrationId]
  );
  revalidateDiseaseSurfaces();
}

// Upload creates a brand-new medical_illustration row (never
// overwrites an existing one's asset_url) — an uploaded image always
// becomes its own object, so it can never silently change what a
// *different* disease's page already shows via the same shared row.
export async function uploadIllustrationAction(
  diseaseId: string,
  afterPosition: number,
  formData: FormData
) {
  await requireEditor();
  const file = formData.get("file") as File | null;
  const title = String(formData.get("title") ?? "").trim();
  const altText = String(formData.get("altText") ?? "").trim();
  if (!file || !title || !altText) {
    throw new Error("File, title, and alt text are all required.");
  }

  const assetUrl = await saveUploadedIllustration(file);
  const { rows } = await pool.query(
    `INSERT INTO medical_illustration (title, asset_url, alt_text, status)
     VALUES ($1, $2, $3, 'draft') RETURNING id`,
    [title, assetUrl, altText]
  );
  await insertMedicalIllustrationBlockAction(diseaseId, afterPosition, rows[0].id);
}

// Replace swaps which illustration a block points to — it never
// mutates the current illustration's own row, precisely because that
// row may be shared with other diseases (same reasoning as upload
// above). The old illustration's usage row is left alone; a slightly
// stale "used on N pages" count is a harmless imprecision, same
// judgment call as the position gaps a block delete already leaves.
export async function replaceIllustrationBlockAction(
  blockId: string,
  diseaseId: string,
  illustrationId: string
) {
  await requireEditor();
  await pool.query(
    `INSERT INTO illustration_usage (medical_illustration_id, target_type, target_id)
     VALUES ($1, 'disease', $2)
     ON CONFLICT (medical_illustration_id, target_type, target_id) DO NOTHING`,
    [illustrationId, diseaseId]
  );
  await pool.query(
    `UPDATE editorial_block SET referenced_object_id = $1 WHERE id = $2`,
    [illustrationId, blockId]
  );
  revalidateDiseaseSurfaces();
}

export async function uploadReplacementIllustrationAction(
  blockId: string,
  diseaseId: string,
  formData: FormData
) {
  await requireEditor();
  const file = formData.get("file") as File | null;
  const title = String(formData.get("title") ?? "").trim();
  const altText = String(formData.get("altText") ?? "").trim();
  if (!file || !title || !altText) {
    throw new Error("File, title, and alt text are all required.");
  }

  const assetUrl = await saveUploadedIllustration(file);
  const { rows } = await pool.query(
    `INSERT INTO medical_illustration (title, asset_url, alt_text, status)
     VALUES ($1, $2, $3, 'draft') RETURNING id`,
    [title, assetUrl, altText]
  );
  await replaceIllustrationBlockAction(blockId, diseaseId, rows[0].id);
}

// Removes the image without deleting the block — sets the reference
// back to NULL rather than deleting the editorial_block row, so the
// block's own title/subtitle/caption/annotations survive and an
// author can pick a new image into the same spot (same block id, same
// position in the page) rather than having to re-insert and re-type
// everything. The shared medical_illustration row itself, and any
// other disease page's illustration_usage row for it, are untouched —
// this only ever touches this one block's own reference.
export async function removeIllustrationImageAction(blockId: string) {
  await requireEditor();
  await pool.query(`UPDATE editorial_block SET referenced_object_id = NULL WHERE id = $1`, [
    blockId,
  ]);
  revalidateDiseaseSurfaces();
}

// The image's own width within its column — independent of, and
// nested inside, whatever row-width the block itself has if it's
// combined with another block (resizeRowAction/ResizableRow). Reuses
// the same fixed-stop vocabulary as row width for one reason: an
// author who's already learned "25/33/50/66/75/100%" from resizing a
// row shouldn't have to learn a second scale for resizing an image.
export async function setIllustrationWidthAction(
  blockId: string,
  width: "1/4" | "1/3" | "1/2" | "2/3" | "3/4" | "full"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['imageWidth'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, width]
  );
  revalidateDiseaseSurfaces();
}

// Where the annotation legend (caption + numbered label list) sits
// relative to the image — independent of the image's own width above.
// Same 3-value vocabulary as setHighlightCardImagePositionAction, with
// "bottom" instead of "top" since the legend already renders below the
// image by default here.
export async function setIllustrationLegendPositionAction(
  blockId: string,
  position: "bottom" | "left" | "right"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['legendPosition'], to_jsonb($2::text)) WHERE id = $1`,
    [blockId, position]
  );
  revalidateDiseaseSurfaces();
}

// Annotations (numbered markers + legend) live entirely in the
// block's own content_config, not on the shared illustration row —
// dragging a marker or relabeling it is per-placement, same as a
// caption, and never affects how the same illustration looks on
// another disease's page.
export async function updateIllustrationAnnotationsAction(
  blockId: string,
  annotations: { label: string; x: number; y: number }[]
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block
     SET content_config = jsonb_set(content_config, ARRAY['annotations'], $2::jsonb)
     WHERE id = $1`,
    [blockId, JSON.stringify(annotations)]
  );
  revalidateDiseaseSurfaces();
}

export async function deleteBlockAction(blockId: string) {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT disease_id, display_config->'layout'->>'row' AS row FROM editorial_block WHERE id = $1`,
    [blockId]
  );
  const info = rows[0];
  await pool.query(`DELETE FROM editorial_block WHERE id = $1`, [blockId]);
  if (info?.row) {
    await cleanupOrphanedRow(info.disease_id, info.row);
  }
  revalidateDiseaseSurfaces();
}

export async function moveBlockAction(
  diseaseId: string,
  blockId: string,
  position: number,
  direction: "up" | "down"
) {
  await requireEditor();
  const { rows: mineRows } = await pool.query(
    `SELECT display_config->'layout'->>'row' AS row, display_config->'layout'->>'col' AS col
     FROM editorial_block WHERE id = $1`,
    [blockId]
  );
  const myRow = mineRows[0]?.row as string | null;
  const myCol = mineRows[0]?.col as string | null;

  const { rows } = await pool.query(
    `SELECT id, position, display_config->'layout'->>'row' AS row, display_config->'layout'->>'col' AS col
     FROM editorial_block
     WHERE disease_id = $1 AND position ${direction === "up" ? "<" : ">"} $2
     ORDER BY position ${direction === "up" ? "DESC" : "ASC"}
     LIMIT 1`,
    [diseaseId, position]
  );
  const neighbor = rows[0];
  if (!neighbor) return;

  // Same unique-constraint hazard as insertBlockAction: swapping two
  // positions directly means the first UPDATE targets a slot the
  // second row still occupies. Free blockId's slot into negative
  // territory first, then each subsequent move lands on a slot the
  // previous step just vacated.
  await pool.query(`UPDATE editorial_block SET position = $1 WHERE id = $2`, [
    -position,
    blockId,
  ]);
  await pool.query(`UPDATE editorial_block SET position = $1 WHERE id = $2`, [
    position,
    neighbor.id,
  ]);
  await pool.query(`UPDATE editorial_block SET position = $1 WHERE id = $2`, [
    neighbor.position,
    blockId,
  ]);

  // Swapping with a cell-mate just reorders which side it renders on
  // (both stay grouped, still adjacent). Swapping with anything else
  // moves this block past its cell's edge — BlockSequence only groups
  // positionally-adjacent blocks that share both `row` and `col` (#132)
  // into one cell, so staying "in" the row while no longer next to a
  // same-cell neighbor would render as a half-empty cell. Move
  // implicitly leaves the row in that case, same as an explicit
  // "remove from row." Requires matching `col` too, not just `row` —
  // otherwise swapping past a *different* cell in the same row would
  // wrongly look like "still grouped."
  const sameCell = myRow && neighbor.row === myRow && (myCol ?? null) === (neighbor.col ?? null);
  if (myRow && !sameCell) {
    await pool.query(`UPDATE editorial_block SET display_config = display_config - 'layout' WHERE id = $1`, [
      blockId,
    ]);
    await cleanupOrphanedRow(diseaseId, myRow);
  }

  revalidateDiseaseSurfaces();
}

interface BlockOrderRow {
  id: string;
  row: string | null;
  col: string | null;
}

// Shared by reorderBlockAction and stackBlockAction: fetches the whole
// disease's block order plus row/col, computes the candidate new order
// with `blockId` moved next to `targetBlockId`, and validates that no
// *other* cell gets split apart by the move. A "cell" is one block, or
// several sharing `col` within the same `row` (#132) — grouping by
// `row ?? id` alone (like an earlier version of this guard did) would
// let a foreign drag land between two blocks of the same stacked
// column without detecting it, since the *row* stays contiguous even
// though that specific *cell* just got split. Returns null if the drop
// is invalid (unknown ids, or would split a foreign cell).
async function planBlockMove(
  diseaseId: string,
  blockId: string,
  targetBlockId: string,
  placement: "before" | "after"
): Promise<{ newOrder: string[]; rowById: Map<string, string | null>; colById: Map<string, string | null> } | null> {
  if (blockId === targetBlockId) return null;

  const { rows } = await pool.query(
    `SELECT id, display_config->'layout'->>'row' AS row, display_config->'layout'->>'col' AS col
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );
  const order: string[] = rows.map((r) => r.id);
  const rowById = new Map<string, string | null>(rows.map((r) => [r.id, r.row]));
  const colById = new Map<string, string | null>(rows.map((r) => [r.id, r.col]));

  if (!order.includes(blockId) || !order.includes(targetBlockId)) return null;

  const withoutDragged = order.filter((id) => id !== blockId);
  const targetIndex = withoutDragged.indexOf(targetBlockId);
  const insertAt = placement === "before" ? targetIndex : targetIndex + 1;
  const newOrder = [
    ...withoutDragged.slice(0, insertAt),
    blockId,
    ...withoutDragged.slice(insertAt),
  ];

  const myCellKey = (rows as BlockOrderRow[]).find((r) => r.id === blockId);
  const myCell = myCellKey?.row ? `${myCellKey.row}:${myCellKey.col ?? blockId}` : null;

  const cells = new Map<string, string[]>();
  for (const r of rows as BlockOrderRow[]) {
    if (!r.row) continue;
    const key = `${r.row}:${r.col ?? r.id}`;
    if (key === myCell) continue;
    const members = cells.get(key) ?? [];
    members.push(r.id);
    cells.set(key, members);
  }
  for (const members of cells.values()) {
    const indices = members.map((id) => newOrder.indexOf(id)).sort((a, b) => a - b);
    const contiguous = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
    if (!contiguous) return null;
  }

  return { newOrder, rowById, colById };
}

async function commitBlockOrder(newOrder: string[]) {
  // Same negative-first trick as makeRoomAfter/moveBlockAction: every
  // block in the disease is in `newOrder`, so a full two-pass renumber
  // can never collide with a not-yet-updated row's current position.
  for (let i = 0; i < newOrder.length; i++) {
    await pool.query(`UPDATE editorial_block SET position = $2 WHERE id = $1`, [newOrder[i], -(i + 1)]);
  }
  for (let i = 0; i < newOrder.length; i++) {
    await pool.query(`UPDATE editorial_block SET position = $2 WHERE id = $1`, [newOrder[i], (i + 1) * 10]);
  }
}

// General drag-and-drop reordering — unlike moveBlockAction (single
// step, adjacent neighbor only), this drops a block anywhere in the
// page relative to any other block. Renumbers the whole disease's
// block sequence in one go rather than trying to find room between
// two existing position values, which can run out (adjacent seed
// positions like 33/34 leave no integer between them).
export async function reorderBlockAction(
  diseaseId: string,
  blockId: string,
  targetBlockId: string,
  placement: "before" | "after"
) {
  await requireEditor();
  const plan = await planBlockMove(diseaseId, blockId, targetBlockId, placement);
  if (!plan) return;
  const { newOrder, rowById, colById } = plan;
  const myRow = rowById.get(blockId) ?? null;
  const myCol = colById.get(blockId) ?? null;

  await commitBlockOrder(newOrder);

  if (myRow) {
    const newIndex = newOrder.indexOf(blockId);
    const leftId = newOrder[newIndex - 1];
    const rightId = newOrder[newIndex + 1];
    // Requires matching `col` too (not just `row`) — otherwise landing
    // beside a *different* cell in the same row would wrongly look
    // like "still grouped" and keep a stale cell membership.
    const stillAdjacent =
      (leftId && rowById.get(leftId) === myRow && (colById.get(leftId) ?? null) === myCol) ||
      (rightId && rowById.get(rightId) === myRow && (colById.get(rightId) ?? null) === myCol);
    if (!stillAdjacent) {
      await pool.query(
        `UPDATE editorial_block
         SET display_config = display_config
           #- '{layout,row}' #- '{layout,col}' #- '{layout,width}' #- '{layout,rowAlign}' #- '{layout,align}'
         WHERE id = $1`,
        [blockId]
      );
      await cleanupOrphanedRow(diseaseId, myRow);
    }
  }

  revalidateDiseaseSurfaces();
}

// Stacks `blockId` into the same cell as `targetBlockId` (#132) — the
// founder's "put this block directly above/below that one, sharing a
// column" ask, distinct from combineWithAdjacentBlockAction's
// side-by-side cells. If the target isn't in a row yet, this creates a
// brand-new one-cell row (renders identically to plain sequential
// blocks — see BlockLayout.col's own comment — until a sibling cell
// exists); if the target is a lone cell in a multi-cell row, it's
// retroactively given its own `col` id so the dragged block can join
// it; if the target is already stacked, the dragged block just joins
// that existing column. Every existing member of the target's cell
// gets the dragged block's width forced onto it too (or vice versa —
// whichever the target already had) since a cell's blocks always share
// one width, mirroring resizeRowAction's own array-based sync.
export async function stackBlockAction(
  diseaseId: string,
  blockId: string,
  targetBlockId: string,
  placement: "above" | "below"
) {
  await requireEditor();
  const { rows: typeRows } = await pool.query(
    `SELECT id, block_type FROM editorial_block WHERE id = ANY($1::uuid[])`,
    [[blockId, targetBlockId]]
  );
  if (typeRows.some((r) => r.block_type === "section_heading")) return;

  const plan = await planBlockMove(diseaseId, blockId, targetBlockId, placement === "above" ? "before" : "after");
  if (!plan) return;
  const { newOrder, rowById, colById } = plan;
  const myRow = rowById.get(blockId) ?? null;

  const targetRow = rowById.get(targetBlockId) ?? null;
  const targetCol = colById.get(targetBlockId) ?? null;
  const row = targetRow ?? randomUUID();
  const col = targetCol ?? randomUUID();

  await commitBlockOrder(newOrder);

  const { rows: widthRows } = await pool.query(
    `SELECT display_config->'layout'->>'width' AS width FROM editorial_block WHERE id = $1`,
    [targetBlockId]
  );
  const width = (widthRows[0]?.width as string | null) ?? undefined;

  const cellIds = targetCol
    ? (
        await pool.query(
          `SELECT id FROM editorial_block WHERE disease_id = $1 AND display_config->'layout'->>'col' = $2`,
          [diseaseId, targetCol]
        )
      ).rows.map((r) => r.id as string)
    : [targetBlockId];

  await pool.query(
    `UPDATE editorial_block
     SET display_config = jsonb_set(
       display_config,
       ARRAY['layout'],
       COALESCE(display_config->'layout', '{}'::jsonb)
         || jsonb_build_object('row', $3::text, 'col', $4::text)
         || CASE WHEN $5::text IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('width', $5::text) END
     )
     WHERE id = ANY($1::uuid[]) OR id = $2`,
    [cellIds, blockId, row, col, width ?? null]
  );

  // If the dragged block left behind a row/cell of its own, clean it
  // up exactly like reorderBlockAction does — same "a group only means
  // something as 2+" rule, just triggered by this action instead.
  if (myRow && myRow !== row) {
    await cleanupOrphanedRow(diseaseId, myRow);
  }

  revalidateDiseaseSurfaces();
}

// Moves a *whole section* (a section_heading block plus every block up
// to, but not including, the next section_heading — the same boundary
// splitIntoSections/sections.ts already uses) to sit before/after
// another section, driven by OnThisPage's drag handles (#137). Unlike
// reorderBlockAction (one block), this treats the dragged section's
// entire id list as one atomic unit — remove it from the order, insert
// it as a contiguous run next to the target section — so the section's
// own internal block order and any rows/stacks inside it never need
// touching, only where the whole run sits relative to everything else.
export async function reorderSectionAction(
  diseaseId: string,
  headingBlockId: string,
  targetHeadingBlockId: string,
  placement: "before" | "after"
) {
  await requireEditor();
  if (headingBlockId === targetHeadingBlockId) return;

  const { rows } = await pool.query(
    `SELECT id, block_type, display_config->'layout'->>'row' AS row, display_config->'layout'->>'col' AS col
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );

  // Partition into sections the same way sections.ts does — a run
  // starting at each section_heading, up to (not including) the next
  // one. Blocks before the very first heading (if any) belong to no
  // section and are never a valid drag source or target here.
  const sections: { headingId: string; blockIds: string[] }[] = [];
  let current: { headingId: string; blockIds: string[] } | null = null;
  for (const r of rows) {
    if (r.block_type === "section_heading") {
      current = { headingId: r.id, blockIds: [r.id] };
      sections.push(current);
    } else if (current) {
      current.blockIds.push(r.id);
    }
  }

  const dragged = sections.find((s) => s.headingId === headingBlockId);
  const target = sections.find((s) => s.headingId === targetHeadingBlockId);
  if (!dragged || !target) return;

  const order = rows.map((r) => r.id as string);
  const draggedSet = new Set(dragged.blockIds);
  const withoutDragged = order.filter((id) => !draggedSet.has(id));

  const insertAt =
    placement === "before"
      ? withoutDragged.indexOf(target.headingId)
      : withoutDragged.indexOf(target.blockIds[target.blockIds.length - 1]) + 1;

  const newOrder = [
    ...withoutDragged.slice(0, insertAt),
    ...dragged.blockIds,
    ...withoutDragged.slice(insertAt),
  ];

  // Same row/cell-contiguity guard as reorderBlockAction/stackBlockAction
  // — reject a move that would split an existing row apart. Every row
  // fully contained within the dragged section stays contiguous
  // automatically (the whole section moves as one atomic run), so
  // nothing needs excluding here the way planBlockMove excludes the
  // dragged block's own row: a row spanning the section boundary is the
  // only way this can legitimately fail, and failing is correct then.
  const cells = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.row) continue;
    const key = `${r.row}:${r.col ?? r.id}`;
    const members = cells.get(key) ?? [];
    members.push(r.id);
    cells.set(key, members);
  }
  for (const members of cells.values()) {
    const indices = members.map((id) => newOrder.indexOf(id)).sort((a, b) => a - b);
    const contiguous = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
    if (!contiguous) return;
  }

  await commitBlockOrder(newOrder);
  revalidateDiseaseSurfaces();
}

// Treatment Algorithm is a singular embed (one block references one
// algorithm, same shape as Risk Factor/Clinical Pearl) — but unlike
// those, the algorithm's own steps are a real sub-table
// (treatment_algorithm_step), not owned by the block's content_config.
// A disease can carry more than one algorithm (Plantar Fasciopathy
// already has First-line and Second-line as two separate blocks), so
// line_of_therapy is captured per disease-algorithm pairing, not on
// the algorithm itself.
export async function searchTreatmentAlgorithmsAction(query: string) {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT ta.id, ta.canonical_name,
       (SELECT count(*) FROM algorithm_treats_disease WHERE treatment_algorithm_id = ta.id) AS disease_count
     FROM treatment_algorithm ta
     WHERE ta.canonical_name ILIKE $1
     ORDER BY ta.canonical_name
     LIMIT 8`,
    [`%${query}%`]
  );
  return rows.map((row) => ({
    id: row.id as string,
    name: row.canonical_name as string,
    diseaseCount: Number(row.disease_count),
  }));
}

export async function insertTreatmentAlgorithmBlockAction(
  diseaseId: string,
  afterPosition: number,
  target: { algorithmId: string } | { algorithmName: string },
  lineOfTherapy: string
) {
  await requireEditor();

  let algorithmId: string;
  if ("algorithmId" in target) {
    algorithmId = target.algorithmId;
  } else {
    const { rows } = await pool.query(
      `INSERT INTO treatment_algorithm (canonical_name, status, version)
       VALUES ($1, 'draft', 1) RETURNING id`,
      [target.algorithmName]
    );
    algorithmId = rows[0].id;
  }

  await pool.query(
    `INSERT INTO algorithm_treats_disease (treatment_algorithm_id, disease_id, line_of_therapy)
     VALUES ($1, $2, $3)
     ON CONFLICT (treatment_algorithm_id, disease_id)
     DO UPDATE SET line_of_therapy = EXCLUDED.line_of_therapy`,
    [algorithmId, diseaseId, lineOfTherapy || null]
  );

  await makeRoomAfter(diseaseId, afterPosition);
  await pool.query(
    `INSERT INTO editorial_block (disease_id, position, block_type, referenced_object_id, content_config)
     VALUES ($1, $2, 'treatment_algorithm', $3, '{}'::jsonb)`,
    [diseaseId, afterPosition + 1, algorithmId]
  );
  revalidateDiseaseSurfaces();
}

// Steps belong to the algorithm (a real, shareable object), not the
// block — editing them here is the same "editing a shared object"
// moment Clinical Pearl already established, just for a multi-row
// child table instead of a single text field. No unique constraint on
// (algorithm_id, step_order), so a direct swap is safe — unlike
// editorial_block.position, there's no collision hazard to route
// around here.
// Positional insert, not append-only — the flowchart editor's "+"
// controls each sit at a specific point in the diagram (end of the
// trunk, end of a branch's outcome stack), so the new step's order
// needs to land there directly rather than always at the very end.
// Shifting every later step_order by one is the same "make room"
// pattern editorial_block's own position column already uses. Returns
// the new step's id so the caller can immediately wire it as a
// decision's branch target when it's the first item added to an
// empty Yes/No outcome.
export async function insertTreatmentAlgorithmStepAction(
  algorithmId: string,
  afterStepId: string | null,
  instruction: string
): Promise<string> {
  await requireEditor();
  let afterOrder = 0;
  if (afterStepId) {
    const { rows } = await pool.query(
      `SELECT step_order FROM treatment_algorithm_step WHERE id = $1`,
      [afterStepId]
    );
    afterOrder = rows[0]?.step_order ?? 0;
  }
  await pool.query(
    `UPDATE treatment_algorithm_step SET step_order = step_order + 1 WHERE algorithm_id = $1 AND step_order > $2`,
    [algorithmId, afterOrder]
  );
  const { rows } = await pool.query(
    `INSERT INTO treatment_algorithm_step (algorithm_id, step_order, instruction)
     VALUES ($1, $2, $3) RETURNING id`,
    [algorithmId, afterOrder + 1, instruction]
  );
  revalidateDiseaseSurfaces();
  return rows[0].id as string;
}

// icon/nextStepIfTrue/nextStepIfFalse are always sent together with
// instruction/branchCondition from the step editor's single form, so
// one whole-row update covers every field a step can have — same
// "commit the form, not the keystroke" shape as every other block's
// text-field update action.
// `instruction`/`branchCondition` are both RichEditableText fields —
// each sanitized server-side before storage, same as every other
// rich-text-writing action here.
export async function updateTreatmentAlgorithmStepAction(
  stepId: string,
  instruction: string,
  branchCondition: string,
  icon?: string,
  nextStepIfTrue?: string | null,
  nextStepIfFalse?: string | null
) {
  await requireEditor();
  const cleanInstruction = sanitizeRichText(instruction);
  const cleanBranchCondition = branchCondition ? sanitizeRichText(branchCondition) : branchCondition;
  await pool.query(
    `UPDATE treatment_algorithm_step
     SET instruction = $1, branch_condition = $2, icon = $3, next_step_if_true = $4, next_step_if_false = $5
     WHERE id = $6`,
    [cleanInstruction, cleanBranchCondition || null, icon || null, nextStepIfTrue || null, nextStepIfFalse || null, stepId]
  );
  revalidateDiseaseSurfaces();
}

export async function deleteTreatmentAlgorithmStepAction(stepId: string) {
  await requireEditor();
  await pool.query(`DELETE FROM treatment_algorithm_step WHERE id = $1`, [stepId]);
  revalidateDiseaseSurfaces();
}

export async function moveTreatmentAlgorithmStepAction(
  algorithmId: string,
  stepId: string,
  stepOrder: number,
  direction: "up" | "down"
) {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT id, step_order FROM treatment_algorithm_step
     WHERE algorithm_id = $1 AND step_order ${direction === "up" ? "<" : ">"} $2
     ORDER BY step_order ${direction === "up" ? "DESC" : "ASC"}
     LIMIT 1`,
    [algorithmId, stepOrder]
  );
  const neighbor = rows[0];
  if (!neighbor) return;

  await pool.query(`UPDATE treatment_algorithm_step SET step_order = $1 WHERE id = $2`, [
    neighbor.step_order,
    stepId,
  ]);
  await pool.query(`UPDATE treatment_algorithm_step SET step_order = $1 WHERE id = $2`, [
    stepOrder,
    neighbor.id,
  ]);
  revalidateDiseaseSurfaces();
}

// Rehabilitation Progression differs from Treatment Algorithm in one
// real way: its steps (exercises) are themselves separately reusable
// Knowledge Objects via a join table (rehabilitation_protocol_exercise),
// the same many-to-many shape Examination Workflow's maneuvers use —
// so adding an exercise is reuse-first (search existing exercises,
// create new only as a fallback), not a plain text row.
export async function searchRehabilitationProtocolsAction(query: string) {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT rp.id, rp.canonical_name,
       (SELECT count(*) FROM rehabilitation_protocol_treats_disease WHERE rehabilitation_protocol_id = rp.id) AS disease_count
     FROM rehabilitation_protocol rp
     WHERE rp.canonical_name ILIKE $1
     ORDER BY rp.canonical_name
     LIMIT 8`,
    [`%${query}%`]
  );
  return rows.map((row) => ({
    id: row.id as string,
    name: row.canonical_name as string,
    diseaseCount: Number(row.disease_count),
  }));
}

export async function insertRehabilitationProtocolBlockAction(
  diseaseId: string,
  afterPosition: number,
  target: { protocolId: string } | { protocolName: string }
) {
  await requireEditor();

  let protocolId: string;
  if ("protocolId" in target) {
    protocolId = target.protocolId;
  } else {
    const { rows } = await pool.query(
      `INSERT INTO rehabilitation_protocol (canonical_name, status) VALUES ($1, 'draft') RETURNING id`,
      [target.protocolName]
    );
    protocolId = rows[0].id;
  }

  await pool.query(
    `INSERT INTO rehabilitation_protocol_treats_disease (rehabilitation_protocol_id, disease_id)
     VALUES ($1, $2) ON CONFLICT (rehabilitation_protocol_id, disease_id) DO NOTHING`,
    [protocolId, diseaseId]
  );

  await makeRoomAfter(diseaseId, afterPosition);
  await pool.query(
    `INSERT INTO editorial_block (disease_id, position, block_type, referenced_object_id, content_config)
     VALUES ($1, $2, 'rehabilitation_progression', $3, '{}'::jsonb)`,
    [diseaseId, afterPosition + 1, protocolId]
  );
  revalidateDiseaseSurfaces();
}

export async function searchExercisesAction(query: string) {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT id, canonical_name, instructions FROM exercise WHERE canonical_name ILIKE $1 ORDER BY canonical_name LIMIT 8`,
    [`%${query}%`]
  );
  return rows.map((row) => ({
    id: row.id as string,
    name: row.canonical_name as string,
    instructions: row.instructions as string | null,
  }));
}

export async function addProtocolExerciseAction(
  protocolId: string,
  target: { exerciseId: string } | { exerciseName: string; instructions: string }
) {
  await requireEditor();

  let exerciseId: string;
  if ("exerciseId" in target) {
    exerciseId = target.exerciseId;
  } else {
    const { rows } = await pool.query(
      `INSERT INTO exercise (canonical_name, instructions, status) VALUES ($1, $2, 'draft') RETURNING id`,
      [target.exerciseName, target.instructions || null]
    );
    exerciseId = rows[0].id;
  }

  await pool.query(
    `INSERT INTO rehabilitation_protocol_exercise (rehabilitation_protocol_id, exercise_id, step_order)
     VALUES ($1, $2, (SELECT COALESCE(MAX(step_order), 0) + 1 FROM rehabilitation_protocol_exercise WHERE rehabilitation_protocol_id = $1))
     ON CONFLICT (rehabilitation_protocol_id, exercise_id) DO NOTHING`,
    [protocolId, exerciseId]
  );
  revalidateDiseaseSurfaces();
}

export async function removeProtocolExerciseAction(
  protocolId: string,
  exerciseId: string
) {
  await requireEditor();
  await pool.query(
    `DELETE FROM rehabilitation_protocol_exercise WHERE rehabilitation_protocol_id = $1 AND exercise_id = $2`,
    [protocolId, exerciseId]
  );
  revalidateDiseaseSurfaces();
}

export async function moveProtocolExerciseAction(
  protocolId: string,
  exerciseId: string,
  stepOrder: number,
  direction: "up" | "down"
) {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT exercise_id, step_order FROM rehabilitation_protocol_exercise
     WHERE rehabilitation_protocol_id = $1 AND step_order ${direction === "up" ? "<" : ">"} $2
     ORDER BY step_order ${direction === "up" ? "DESC" : "ASC"}
     LIMIT 1`,
    [protocolId, stepOrder]
  );
  const neighbor = rows[0];
  if (!neighbor) return;

  await pool.query(
    `UPDATE rehabilitation_protocol_exercise SET step_order = $1 WHERE rehabilitation_protocol_id = $2 AND exercise_id = $3`,
    [neighbor.step_order, protocolId, exerciseId]
  );
  await pool.query(
    `UPDATE rehabilitation_protocol_exercise SET step_order = $1 WHERE rehabilitation_protocol_id = $2 AND exercise_id = $3`,
    [stepOrder, protocolId, neighbor.exercise_id]
  );
  revalidateDiseaseSurfaces();
}

// Layout as a property of any block, not a separate block type —
// `BlockLayout` already lives on `BlockBase` (every EditorialBlock
// variant inherits it) and BlockSequence already groups any
// consecutive same-row blocks into a horizontal grid regardless of
// type, so no schema or rendering change was needed to get here.
// Card Grid/Large Cards/Small Cards (lesson #42) create fresh,
// pre-grouped *new* cards; these three actions are the general case —
// composing blocks that already exist, of any type, side by side.
//
// Combining only ever joins a block to whichever neighbor is already
// positionally adjacent. BlockSequence's grouping requires adjacency
// to render as one row, so "combine with an arbitrary faraway block"
// was deliberately not built — reorder into place with the existing
// move up/down first, then combine.
export async function combineWithAdjacentBlockAction(
  diseaseId: string,
  blockId: string,
  direction: "next" | "previous"
) {
  await requireEditor();
  const { rows: mineRows } = await pool.query(
    `SELECT position, block_type, display_config->'layout'->>'row' AS row FROM editorial_block WHERE id = $1`,
    [blockId]
  );
  const mine = mineRows[0];
  if (!mine || mine.block_type === "section_heading") return;

  const { rows: neighborRows } = await pool.query(
    `SELECT id, block_type, display_config->'layout' AS layout FROM editorial_block
     WHERE disease_id = $1 AND position ${direction === "next" ? ">" : "<"} $2
     ORDER BY position ${direction === "next" ? "ASC" : "DESC"}
     LIMIT 1`,
    [diseaseId, mine.position]
  );
  const neighbor = neighborRows[0];
  if (!neighbor || neighbor.block_type === "section_heading") return;

  const neighborLayout = neighbor.layout as { row?: string; width?: string } | null;
  // Checking `neighborLayout.row` specifically, not just whether
  // `neighborLayout` exists — AlignmentPicker can now leave a `layout`
  // object on a block that was never in a row (just textAlign/width
  // for its own standalone display), and treating that alone as "this
  // neighbor already has a row" skipped writing the neighbor into the
  // new row entirely, silently combining only one side.
  const neighborHasRow = Boolean(neighborLayout?.row);
  const row = neighborLayout?.row ?? mine.row ?? randomUUID();

  // Rows cap at 4 members: ResizableRow's drag-divider only ever
  // handles a pair (by design — a "grow this, shrink that" divider
  // doesn't generalize past 2), but BlockSequence already falls back
  // to a plain equal-width 12-column grid once a row has 3+ members,
  // so 3 and 4 render fine without a divider. Widths are assigned as
  // an equal share of the *target* size (existing members + this one),
  // not just set on the new arrival — a 2-member row growing to 3
  // must rebalance both existing 1/2s down to 1/3, or the row overflows
  // its 12 columns and visually breaks (this was the original "combine
  // only ever works for 2" bug: the third block got 1/3 but its two
  // new row-mates stayed at 1/2 each).
  const EQUAL_WIDTH: Record<number, "1/2" | "1/3" | "1/4"> = {
    2: "1/2",
    3: "1/3",
    4: "1/4",
  };

  if (neighborHasRow) {
    const { rows: memberRows } = await pool.query(
      `SELECT id, display_config->'layout'->>'col' AS col FROM editorial_block
       WHERE disease_id = $1 AND display_config->'layout'->>'row' = $2`,
      [diseaseId, row]
    );
    // Counting distinct *cells*, not raw blocks (#132) — a stacked
    // column counts once no matter how many blocks share its `col`,
    // since it occupies one horizontal slot. The combined block always
    // arrives as a new lone cell of its own (this action only ever
    // makes side-by-side arrangements; stacking is `stackBlockAction`'s
    // job), so the target size is always "existing cells + 1."
    const cellCount = new Set(memberRows.map((r) => r.col ?? r.id)).size;
    const targetSize = cellCount + 1;
    if (targetSize > 4) return;
    const width = EQUAL_WIDTH[targetSize];

    // Merges into any existing `layout` object (jsonb_set + COALESCE,
    // same pattern updateBlockAlignmentAction uses) rather than
    // replacing it outright — a block that already had a textAlign/
    // textVerticalAlign preference keeps it once combined into a row,
    // instead of that preference being silently wiped by this combine.
    await pool.query(
      `UPDATE editorial_block
       SET display_config = jsonb_set(
         display_config,
         ARRAY['layout'],
         COALESCE(display_config->'layout', '{}'::jsonb) || jsonb_build_object('row', $3::text, 'width', $4::text)
       )
       WHERE id = ANY($1::uuid[]) OR id = $2`,
      [memberRows.map((r) => r.id), blockId, row, width]
    );
  } else {
    await pool.query(
      `UPDATE editorial_block
       SET display_config = jsonb_set(
         display_config,
         ARRAY['layout'],
         COALESCE(display_config->'layout', '{}'::jsonb) || jsonb_build_object('row', $3::text, 'width', '1/2')
       )
       WHERE id = $1 OR id = $2`,
      [blockId, neighbor.id, row]
    );
  }
  revalidateDiseaseSurfaces();
}

export async function removeFromRowAction(diseaseId: string, blockId: string) {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT display_config->'layout'->>'row' AS row FROM editorial_block WHERE id = $1`,
    [blockId]
  );
  const row = rows[0]?.row as string | null;
  // Strips only the row-scoped keys (row/col/width/rowAlign/align —
  // align only ever applies to a standalone, non-row block anyway)
  // rather than deleting the whole `layout` object, so a textAlign/
  // textVerticalAlign preference set via AlignmentPicker survives
  // leaving the row instead of being silently reset alongside it.
  await pool.query(
    `UPDATE editorial_block
     SET display_config = display_config
       #- '{layout,row}' #- '{layout,col}' #- '{layout,width}' #- '{layout,rowAlign}' #- '{layout,align}'
     WHERE id = $1`,
    [blockId]
  );
  if (row) {
    await cleanupOrphanedRow(diseaseId, row);
  }
  revalidateDiseaseSurfaces();
}

// Replaces the old discrete width picker: a 2-cell row's divider is
// now dragged, not chosen from a dropdown, and a drag always moves
// both sides at once — the pair's widths sum to the full 12 columns
// by construction (3/9, 4/8, 6/6, 8/4, 9/3), so one call sets both
// sides atomically rather than two writes that could observe an
// inconsistent mid-drag state. Reaching "full" is handled by leaving
// the row entirely (removeFromRowAction) rather than as a width value
// here — a block at 12/12 beside another block doesn't mean anything
// visually, same reasoning the old picker's Full option already used.
// Each side is a *cell*, not necessarily one block — a stacked column
// (#132) shares its width across every block stacked inside it, so
// both arrays are updated together rather than picking one member to
// be "the" authoritative width-holder.
export async function resizeRowAction(
  leftBlockIds: string[],
  leftWidth: "1/4" | "1/3" | "1/2" | "2/3" | "3/4",
  rightBlockIds: string[],
  rightWidth: "1/4" | "1/3" | "1/2" | "2/3" | "3/4"
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block SET display_config = jsonb_set(display_config, ARRAY['layout','width'], to_jsonb($2::text)) WHERE id = ANY($1::uuid[])`,
    [leftBlockIds, leftWidth]
  );
  await pool.query(
    `UPDATE editorial_block SET display_config = jsonb_set(display_config, ARRAY['layout','width'], to_jsonb($2::text)) WHERE id = ANY($1::uuid[])`,
    [rightBlockIds, rightWidth]
  );
  revalidateDiseaseSurfaces();
}

// Text/block alignment (AlignmentPicker) — a single merge action for
// all five fields (textAlign, textVerticalAlign, width, align,
// rowAlign) rather than one action per field, since they're all set
// from the same popover and always land in the same `layout` object.
// Unlike resizeRowAction above, this can't assume `display_config.layout`
// already exists (a block with no row/width history yet still needs to
// be alignable) — the COALESCE-then-merge handles both "layout already
// has other keys" (preserves them) and "no layout yet" (starts from {}).
export async function updateBlockAlignmentAction(
  blockId: string,
  fields: Partial<Pick<BlockLayout, "textAlign" | "textVerticalAlign" | "width" | "align" | "rowAlign">>
) {
  await requireEditor();
  await pool.query(
    `UPDATE editorial_block
     SET display_config = jsonb_set(
       display_config,
       ARRAY['layout'],
       COALESCE(display_config->'layout', '{}'::jsonb) || $2::jsonb
     )
     WHERE id = $1`,
    [blockId, JSON.stringify(fields)]
  );
  revalidateDiseaseSurfaces();
}

// The three disease-header meta fields — all live on the `disease`
// row itself (not a block's content_config), so each is its own
// small UPDATE rather than a shared helper. All three bump
// updated_at explicitly: it's what the header's own "Updated <date>"
// reads back, so an edit here needs to be visible in that same
// header, not just in the database.
export async function updateDiseaseNameAction(
  diseaseId: string,
  name: string
) {
  await requireEditor();
  await pool.query(
    `UPDATE disease SET canonical_name = $2, updated_at = now() WHERE id = $1`,
    [diseaseId, name]
  );
  revalidateDiseaseSurfaces();
}

export async function toggleEvidenceBasedAction(diseaseId: string) {
  await requireEditor();
  await pool.query(
    `UPDATE disease SET evidence_based = NOT evidence_based, updated_at = now() WHERE id = $1`,
    [diseaseId]
  );
  revalidateDiseaseSurfaces();
}

export async function updateBoardRelevanceAction(
  diseaseId: string,
  rating: number
) {
  await requireEditor();
  await pool.query(
    `UPDATE disease SET board_relevance = $2, updated_at = now() WHERE id = $1`,
    [diseaseId, rating]
  );
  revalidateDiseaseSurfaces();
}
