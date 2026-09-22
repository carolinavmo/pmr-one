import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — applies migrations 0056 (disease.type), 0057
// (disease.is_topic_of_week / topic_of_week_pitch), and 0058
// (library_home_prefs) against production. All idempotent (IF NOT
// EXISTS / duplicate_object-caught CREATE TYPE) — safe to hit more
// than once, and touches nothing else. Remove this route after use.
export async function GET() {
  await pool.query(`DO $$ BEGIN
    CREATE TYPE disease_page_type AS ENUM (
      'anatomy', 'biomechanics', 'examination', 'condition', 'rehabilitation', 'procedure'
    );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  await pool.query(`ALTER TABLE disease ADD COLUMN IF NOT EXISTS type disease_page_type`);

  await pool.query(`ALTER TABLE disease ADD COLUMN IF NOT EXISTS is_topic_of_week BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE disease ADD COLUMN IF NOT EXISTS topic_of_week_pitch TEXT`);
  await pool.query(`DO $$ BEGIN
    CREATE UNIQUE INDEX disease_topic_of_week_singleton ON disease (is_topic_of_week) WHERE is_topic_of_week;
  EXCEPTION WHEN duplicate_table THEN NULL; END $$;`);

  await pool.query(`DO $$ BEGIN
    CREATE TYPE library_sort AS ENUM ('reading_order', 'alpha', 'shortest', 'recently_updated');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  await pool.query(`CREATE TABLE IF NOT EXISTS library_home_prefs (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    area TEXT,
    region_slug TEXT,
    sort library_sort NOT NULL DEFAULT 'reading_order',
    hide_read BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  return NextResponse.json({
    ok: true,
    diseaseType: "ready",
    topicOfWeek: "ready",
    libraryHomePrefs: "ready",
  });
}
