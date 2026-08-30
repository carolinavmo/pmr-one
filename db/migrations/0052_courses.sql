-- Courses: video-lesson content as a new top-level Learning Object,
-- same reasoning as flashcards (0041) — a standalone table set, not a
-- 15th KnowledgeObjectType, since a course isn't Knowledge Graph
-- content shared across disease pages. One level deeper than
-- flashcards (course > module > lesson vs. deck > card).
--
-- Unlike flashcards, there is no member-owned course — every course is
-- editor/admin-authored (status draft/published, same idiom as
-- disease.status), so there's no owner_type/user_id split here.

CREATE TABLE course (
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

CREATE TABLE course_module (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX course_module_course_id_idx ON course_module (course_id);

-- video_url is nullable: a lesson row is created first (so it can be
-- reordered/described immediately), then the video streams in via
-- POST /api/courses/lessons/[lessonId]/video and fills this in once
-- the upload finishes.
CREATE TABLE course_lesson (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES course_module(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  video_duration_seconds INT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX course_lesson_module_id_idx ON course_lesson (module_id);

-- Mastery/completion state — null for a signed-out visitor (never a
-- fabricated false/0), same convention flashcard_progress uses.
CREATE TABLE course_lesson_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  last_position_seconds INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
CREATE INDEX course_lesson_progress_user_id_idx ON course_lesson_progress (user_id);

-- "Continue where you left off" cursor — deliberately separate from
-- course_lesson_progress (mastery), same split flashcard_deck_position
-- keeps from flashcard_progress. This is session state, not mastery.
CREATE TABLE course_position (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lesson(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
