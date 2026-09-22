-- Pass 4 (design/LIBRARY-HOME-MIX-SPEC.md) — "remembers the last tab
-- and region" plus sort/hide-read, per user (not per browser — a
-- reader's place should carry across devices). One row per user,
-- upserted on every change rather than versioned/history-tracked.
CREATE TYPE library_sort AS ENUM ('reading_order', 'alpha', 'shortest', 'recently_updated');

CREATE TABLE library_home_prefs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  area TEXT,
  region_slug TEXT,
  sort library_sort NOT NULL DEFAULT 'reading_order',
  hide_read BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
