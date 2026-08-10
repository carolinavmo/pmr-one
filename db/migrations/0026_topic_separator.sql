ALTER TABLE topic ADD COLUMN kind TEXT NOT NULL DEFAULT 'topic' CHECK (kind IN ('topic', 'separator'));
