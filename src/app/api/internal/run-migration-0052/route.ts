import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// One-time production migration runner for db/migrations/0052_courses.sql
// (Courses feature) — same established pattern as this session's other
// temporary internal routes: deployed, hit once, then removed. Every
// statement is IF NOT EXISTS-guarded so an accidental repeat trigger
// (a bare status-check curl still runs a GET route's real side effects,
// confirmed earlier this session) is a harmless no-op rather than an
// error on the second hit.
const SQL = `
CREATE TABLE IF NOT EXISTS course (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_module (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_module_course_id_idx ON course_module (course_id);

CREATE TABLE IF NOT EXISTS course_lesson (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES course_module(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  video_duration_seconds INT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_lesson_module_id_idx ON course_lesson (module_id);

CREATE TABLE IF NOT EXISTS course_lesson_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  last_position_seconds INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS course_lesson_progress_user_id_idx ON course_lesson_progress (user_id);

CREATE TABLE IF NOT EXISTS course_position (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lesson(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
`;

export async function GET() {
  const { rows: before } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'course%'`
  );
  await pool.query(SQL);
  const { rows: after } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'course%'`
  );
  return NextResponse.json({
    ok: true,
    tablesBefore: before.map((r) => r.table_name),
    tablesAfter: after.map((r) => r.table_name),
  });
}
