-- ============================================================
-- PM&R Atlas — Migration 0068 — Flashcard subjects become a table
-- Migration 0066 made "Browse the library" grouping a fixed 4-value
-- CHECK constraint (msk/neuro/basic/other). An admin now needs to
-- create/rename/reorder/delete these groups themselves, so they move
-- into their own table, same shape as flashcard_category itself
-- (name + color + position). color reuses the app's existing CardColor
-- palette keys (card-colors.ts), not a raw hex value, so the same
-- ColorSwatchPicker admins already use for a folder's color works
-- here unchanged. Seed rows keep the original 4 subjects and their
-- English labels, snapped to the closest CardColor key (there's no
-- exact hex match anymore — an admin can repick any of them).
-- ============================================================

CREATE TABLE flashcard_subject (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'green',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO flashcard_subject (id, name, color, position) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Musculoskeletal', 'umber', 0),
  ('00000000-0000-0000-0000-000000000002', 'Neurology', 'violet', 1),
  ('00000000-0000-0000-0000-000000000003', 'Basic sciences', 'teal', 2),
  ('00000000-0000-0000-0000-000000000004', 'Other', 'green', 3);

ALTER TABLE flashcard_category ADD COLUMN subject_id UUID REFERENCES flashcard_subject(id);

UPDATE flashcard_category SET subject_id = CASE subject
  WHEN 'msk' THEN '00000000-0000-0000-0000-000000000001'
  WHEN 'neuro' THEN '00000000-0000-0000-0000-000000000002'
  WHEN 'basic' THEN '00000000-0000-0000-0000-000000000003'
  ELSE '00000000-0000-0000-0000-000000000004'
END::uuid;

ALTER TABLE flashcard_category ALTER COLUMN subject_id SET NOT NULL;
ALTER TABLE flashcard_category DROP COLUMN subject;
