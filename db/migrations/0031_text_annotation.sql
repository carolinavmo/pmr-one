-- ============================================================
-- PM&R Atlas — Migration 0031 — Text Annotation (private highlights)
-- Per-member, private text-quote annotations on disease prose — exam-
-- study margin notes, visible only to the member who made them.
-- Distinct from `note` (0006): that's one freeform scratchpad note
-- per (user, disease); this is many, each anchored to a specific
-- highlighted phrase within a specific block's specific text field.
--
-- Anchoring uses a W3C-style TextQuoteSelector (prefix/exact/suffix)
-- resolved against the block's live rendered text at read time (see
-- src/lib/annotation-anchor.ts), not stored DOM offsets or node
-- paths — both of those break on any edit upstream of the highlight;
-- a text-quote search degrades gracefully and only fails to relocate
-- if the highlighted phrase itself is rewritten.
--
-- Anchors the source-locale text only — nothing in the app reads
-- content_translation/editorial_block_translation for the disease
-- page yet (0024), so every visitor currently sees the same
-- source-locale prose regardless of URL locale. A locale-aware anchor
-- is a future gap once real per-locale rendering ships, not a v1
-- blocker.
-- ============================================================

CREATE TABLE annotation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  disease_id UUID NOT NULL REFERENCES disease(id) ON DELETE CASCADE,

  -- Bare TEXT, no FK — same tradeoff as study_task.linked_content_id
  -- (0029): a block can be edited, reordered, or deleted independently
  -- of this row, and the annotation must survive as an orphan
  -- (surfaced in the Workspace drawer's management list) rather than
  -- cascade-delete or block the block's own deletion.
  block_id TEXT NOT NULL,

  -- Which of the block's own prose fields this anchors to (e.g.
  -- "content" for single-field blocks, or "question"/"answer",
  -- "paragraph"/"keyTakeaway", "title"/"label"/"description" for the
  -- few block types that render more than one RichEditableText off
  -- the same block_id) — without this, relocating an annotation could
  -- search the wrong field on a multi-field block.
  block_field TEXT NOT NULL,

  quote_prefix TEXT NOT NULL DEFAULT '',
  quote_exact TEXT NOT NULL,
  quote_suffix TEXT NOT NULL DEFAULT '',

  body TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every read is scoped to one member viewing one disease page (the
-- page-load fetch, and the Workspace drawer's management list) — same
-- shape as study_task_user_id_scheduled_date_idx.
CREATE INDEX annotation_user_id_disease_id_idx ON annotation (user_id, disease_id);
