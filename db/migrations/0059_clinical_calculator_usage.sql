-- ============================================================
-- PM&R Atlas — Migration 0059 — Clinical calculator usage log
-- TOOLS-DASHBOARD-SPEC.md's "Used 3× this week" chip — an append-only
-- open-event log (one row per open, not per user+calculator like
-- clinical_calculator_favorite's PK), so a 7-day rolling count is a
-- plain range query rather than a maintained counter. Signed-out opens
-- are never logged (nothing to attach them to, and the chip is a
-- per-user "your own usage" signal, not a global popularity count).
-- ============================================================

CREATE TABLE IF NOT EXISTS clinical_calculator_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calculator_id UUID NOT NULL REFERENCES clinical_calculator(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clinical_calculator_usage_user_calc_opened_idx
  ON clinical_calculator_usage (user_id, calculator_id, opened_at);
