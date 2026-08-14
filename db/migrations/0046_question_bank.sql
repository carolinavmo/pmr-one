-- Question Bank: editor/admin-authored MCQ practice questions, member
-- read-only (no member-created folders or sets, unlike Flashcards).
-- Deliberately a standalone table set, not a 15th KnowledgeObjectType —
-- same "Derived Learning Object, but authored not derived" deviation
-- Flashcards already established (see docs/product-spec-v1.md §2.6 and
-- migration 0041's own header comment). No owner_type/user_id on the
-- content tables — this content has exactly one owner (editorial), so
-- it follows clinical_calculator's simpler "public content, nobody owns
-- it" precedent instead of flashcard's dual-ownership model; authoring
-- is gated in server actions (requireEditor), not in SQL WHERE clauses.

CREATE TABLE question_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'neutral',
  icon TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE question_set (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES question_category(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'neutral',
  -- Difficulty lives on the set, not per-question — the reference
  -- mockup shows it at both levels, but one field per set is simpler
  -- and the question-runner sidebar just reads its parent set's value.
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX question_set_category_id_idx ON question_set (category_id);

CREATE TABLE question (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES question_set(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  topic_label TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX question_set_id_idx ON question (set_id);

CREATE TABLE question_option (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  rationale TEXT,
  position INT NOT NULL DEFAULT 0
);
CREATE INDEX question_option_question_id_idx ON question_option (question_id);

-- One row per user per question (upserted on re-answer) — same shape as
-- flashcard_progress. This is the only place is_correct/rationale are
-- allowed to reach the client for a question the member has answered;
-- an unattempted question's payload never includes them (see
-- src/lib/question-bank.ts's getSetWithQuestions).
CREATE TABLE question_attempt (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES question_option(id) ON DELETE SET NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX question_attempt_question_id_idx ON question_attempt (question_id);
