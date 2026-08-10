-- ============================================================
-- PM&R Atlas — Migration 0005 — Self-check block type
-- Deliberately NOT 'board_question' — that value is scoped to the
-- deferred Board Review/Quiz lens (Phase 7, spec §6A "STATUS:
-- UNRESOLVED"). 'self_check' is a distinct, ungraded, untracked
-- click-to-reveal retrieval prompt — reuses the interaction pattern
-- already shipped in EvidenceBadge (Sprint 1), not a Quiz Question
-- object, no scoring, no spaced repetition. Keeping it a separate
-- enum value keeps that distinction visible in the data model itself,
-- not just in a code comment.
-- ============================================================

ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'self_check';
