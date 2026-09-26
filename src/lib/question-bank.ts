import { cache } from "react";
import { pool } from "@/lib/db";
import type { CardColor } from "@/lib/editorial-blocks";
import type { CardIconName } from "@/components/ui/cardIcons";
import { type QbankFolderColor, pickFreeQbankFolderColor } from "@/lib/qbank-folder-colors";

// Editor/admin-authored MCQ practice questions, member read-only — see
// db/migrations/0046_question_bank.sql for why this is a standalone
// table set rather than a 15th KnowledgeObjectType, and why (unlike
// flashcards.ts) there's no owner_type/user_id anywhere here: this
// content has exactly one owner (editorial), so authoring is gated in
// the action layer (requireEditor), not in these SQL WHERE clauses —
// every function below is a plain, unscoped update once past that gate.
// Same pool.query-only, no-ORM style as every other data-layer file.

export type Difficulty = "easy" | "medium" | "hard";

export interface QuestionCategory {
  id: string;
  name: string;
  color: CardColor;
  icon: CardIconName | undefined;
  setCount: number;
  // True for the one open sample folder a signed-out visitor can fully
  // browse (mirrors clinical_calculator.is_public / FlashcardCategory.isPublic)
  // — every folder still shows its tile, but a locked one's set list is
  // gated behind a session on its detail page.
  isPublic: boolean;
  // QBANK-IMPLEMENTATION.md Pass 1 — the "By subject" rail grouping.
  // Reuses flashcard_subject (migration 0068's admin-managed MSK/
  // Neurology/Basic sciences/Other table) rather than a second,
  // duplicate taxonomy — one shared subject list across both features.
  subjectId: string;
  subjectName: string;
  subjectColor: CardColor;
  // The pastel folder-card tint (qbank-folder-colors.ts) — Pass 1 only
  // adds the field; the folder cards that actually render it are
  // Pass 2.
  colourKey: QbankFolderColor;
}

// One row per subject in "By subject" (QBANK-IMPLEMENTATION.md Pass 1)
// — accuracy is null (not 0) when the user hasn't answered anything
// under this subject yet, same "null means nothing to show, never a
// fabricated 0" rule the rest of the app follows.
export interface SubjectAccuracy {
  subjectId: string;
  subjectName: string;
  subjectColor: CardColor;
  totalQuestions: number;
  answered: number;
  accuracyPercent: number | null;
}

// The rail's own figures (QBANK-IMPLEMENTATION.md Pass 1: "▶ Start a
// session, search, Practice (all · my incorrect · flagged · not seen)
// and By subject with the user's accuracy"). null for a signed-out
// visitor — every figure here is personal.
export interface QuestionBankRailStats {
  totalQuestions: number;
  answered: number;
  accuracyPercent: number | null;
  incorrect: number;
  flagged: number;
  notSeen: number;
  bySubject: SubjectAccuracy[];
}

export interface QuestionSetSummary {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  description: string;
  color: CardColor;
  difficulty: Difficulty;
  questionCount: number;
  yourScore: number | null; // 0-100, rounded; null when signed out or nothing attempted yet
  yourAttempts: number;
  yourCorrect: number;
  lastAnsweredAt: string | null;
}

// The client-safe shape for an option the member hasn't seen the
// answer to yet — deliberately excludes isCorrect/rationale.
export interface QuestionOptionPublic {
  id: string;
  label: string;
}

export interface QuestionReveal {
  correctOptionId: string;
  explanation: string;
  optionRationales: Record<string, string | null>;
}

export interface QuestionRunnerItem {
  id: string;
  prompt: string;
  topicLabel: string | null;
  tags: string[];
  options: QuestionOptionPublic[];
  // Both present together, and only once this member already has a
  // question_attempt row for this question — safe to include since
  // they've already seen the reveal. Absent (null) for anything
  // unattempted, which is the only state a signed-out visitor ever sees.
  yourAttempt: { selectedOptionId: string | null; isCorrect: boolean; answeredAt: string } | null;
  reveal: QuestionReveal | null;
}

export interface QuestionSetDetail {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  description: string;
  color: CardColor;
  difficulty: Difficulty;
  questions: QuestionRunnerItem[];
}

export interface QuestionAttemptResult {
  isCorrect: boolean;
  correctOptionId: string;
  explanation: string;
  optionRationales: Record<string, string | null>;
}

// Full shape for the editor-only authoring UI — includes isCorrect and
// rationale regardless of any member's attempt history, since editors
// are allowed to see answers. Never exposed to the public runner fetch.
export interface QuestionOptionEditable {
  id: string;
  label: string;
  isCorrect: boolean;
  rationale: string | null;
  position: number;
}

export interface QuestionEditable {
  id: string;
  prompt: string;
  explanation: string;
  topicLabel: string | null;
  tags: string[];
  position: number;
  options: QuestionOptionEditable[];
}

export interface QuestionOptionInput {
  label: string;
  isCorrect: boolean;
  rationale: string | null;
}

// Every mapCategoryRow caller joins flashcard_subject the same way —
// one fragment so the alias/column names can't drift between queries
// (same pattern flashcards.ts's own CATEGORY_SUBJECT_JOIN uses).
const CATEGORY_SUBJECT_JOIN = `LEFT JOIN flashcard_subject s ON s.id = c.subject_id`;
const CATEGORY_SUBJECT_SELECT = `s.id AS subject_id, s.name AS subject_name, s.color AS subject_color`;

function mapCategoryRow(r: {
  id: string;
  name: string;
  color: CardColor;
  icon: string | null;
  set_count: string;
  is_public: boolean;
  subject_id: string;
  subject_name: string;
  subject_color: CardColor;
  colour_key: QbankFolderColor;
}): QuestionCategory {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    icon: (r.icon as CardIconName | null) ?? undefined,
    setCount: Number(r.set_count),
    isPublic: r.is_public,
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    subjectColor: r.subject_color,
    colourKey: r.colour_key,
  };
}

function mapSetSummaryRow(r: {
  id: string;
  category_id: string | null;
  category_name: string | null;
  name: string;
  description: string;
  color: CardColor;
  difficulty: Difficulty;
  question_count: string;
  correct_count: string | null;
  attempt_count: string;
  last_answered_at: string | null;
}): QuestionSetSummary {
  const attempts = Number(r.attempt_count);
  return {
    id: r.id,
    categoryId: r.category_id,
    categoryName: r.category_name,
    name: r.name,
    description: r.description,
    color: r.color,
    difficulty: r.difficulty,
    questionCount: Number(r.question_count),
    yourScore: attempts > 0 ? Math.round((Number(r.correct_count) / attempts) * 100) : null,
    yourAttempts: attempts,
    yourCorrect: Number(r.correct_count ?? 0),
    lastAnsweredAt: r.last_answered_at,
  };
}

export async function getCategories(): Promise<QuestionCategory[]> {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.color, c.icon, c.is_public, c.colour_key, ${CATEGORY_SUBJECT_SELECT},
       (SELECT COUNT(*) FROM question_set s WHERE s.category_id = c.id) AS set_count
     FROM question_category c
     ${CATEGORY_SUBJECT_JOIN}
     ORDER BY c.position, c.name`
  );
  return rows.map(mapCategoryRow);
}

// The rail's whole "Practice" + "By subject" section, from ONE grouped
// query over question_attempt (QBANK-IMPLEMENTATION.md Pass 1: "Counts
// come from one grouped query over attempt, cached per user and
// invalidated when an attempt is written"). "Cached per user" here
// means request-scoped memoization (this function is wrapped in
// React's cache() below) rather than a persistent store — this page
// is fully dynamic (session-dependent), so Next never caches it across
// requests anyway; "invalidated when an attempt is written" is what
// recordAttemptAction's revalidatePath already does, same as every
// other write in this app. flagged is a separate, non-subject-scoped
// count, so it's one small second query rather than forced into the
// same GROUP BY.
async function getQuestionBankRailStatsUncached(userId: string | null): Promise<QuestionBankRailStats> {
  const { rows } = await pool.query(
    `SELECT sub.id AS subject_id, sub.name AS subject_name, sub.color AS subject_color,
       COUNT(DISTINCT q.id)::int AS total_questions,
       COUNT(a.question_id)::int AS answered,
       COUNT(*) FILTER (WHERE a.is_correct)::int AS correct
     FROM flashcard_subject sub
     LEFT JOIN question_category c ON c.subject_id = sub.id
     LEFT JOIN question_set st ON st.category_id = c.id
     LEFT JOIN question q ON q.set_id = st.id
     LEFT JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $1
     GROUP BY sub.id, sub.name, sub.color, sub.position
     ORDER BY sub.position, sub.name`,
    [userId]
  );

  const bySubject: SubjectAccuracy[] = rows.map((r) => ({
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    subjectColor: r.subject_color,
    totalQuestions: r.total_questions,
    answered: r.answered,
    accuracyPercent: r.answered === 0 ? null : Math.round((r.correct / r.answered) * 100),
  }));

  const totalQuestions = bySubject.reduce((sum, s) => sum + s.totalQuestions, 0);
  const answered = bySubject.reduce((sum, s) => sum + s.answered, 0);
  const correct = rows.reduce((sum, r) => sum + r.correct, 0);

  const flaggedCount = userId
    ? Number((await pool.query(`SELECT COUNT(*)::int AS count FROM question_flag WHERE user_id = $1`, [userId])).rows[0].count)
    : 0;

  return {
    totalQuestions,
    answered,
    accuracyPercent: answered === 0 ? null : Math.round((correct / answered) * 100),
    incorrect: answered - correct,
    flagged: flaggedCount,
    notSeen: totalQuestions - answered,
    bySubject,
  };
}

// Request-scoped memoization only (not unstable_cache) — this is
// per-user personal data, and this route is already fully dynamic, so
// there's no persistent cache to invalidate; "cached per user" just
// means the rail and the dashboard body sharing one request don't each
// pay for their own round trip.
export const getQuestionBankRailStats = cache(getQuestionBankRailStatsUncached);

export async function toggleQuestionFlag(userId: string, questionId: string): Promise<boolean> {
  const { rows } = await pool.query(`DELETE FROM question_flag WHERE user_id = $1 AND question_id = $2 RETURNING 1`, [
    userId,
    questionId,
  ]);
  if (rows.length > 0) return false;
  await pool.query(`INSERT INTO question_flag (user_id, question_id) VALUES ($1, $2)`, [userId, questionId]);
  return true;
}

const SET_SUMMARY_SELECT = (userIdParamIndex: number) => `
  SELECT s.id, s.category_id, c.name AS category_name, s.name, s.description, s.color, s.difficulty,
    (SELECT COUNT(*) FROM question q WHERE q.set_id = s.id) AS question_count,
    (SELECT COUNT(*) FROM question q JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $${userIdParamIndex}
       WHERE q.set_id = s.id AND a.is_correct) AS correct_count,
    (SELECT COUNT(*) FROM question q JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $${userIdParamIndex}
       WHERE q.set_id = s.id) AS attempt_count,
    (SELECT MAX(a.answered_at) FROM question q JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $${userIdParamIndex}
       WHERE q.set_id = s.id) AS last_answered_at
  FROM question_set s
  LEFT JOIN question_category c ON c.id = s.category_id
`;

const SET_SUMMARY_SELECT_SIGNED_OUT = `
  SELECT s.id, s.category_id, c.name AS category_name, s.name, s.description, s.color, s.difficulty,
    (SELECT COUNT(*) FROM question q WHERE q.set_id = s.id) AS question_count,
    NULL::bigint AS correct_count,
    0 AS attempt_count,
    NULL::timestamptz AS last_answered_at
  FROM question_set s
  LEFT JOIN question_category c ON c.id = s.category_id
`;

export async function getCategoryWithSets(
  categoryId: string,
  userId: string | null
): Promise<{ category: QuestionCategory; sets: QuestionSetSummary[] } | null> {
  const { rows: categoryRows } = await pool.query(
    `SELECT c.id, c.name, c.color, c.icon, c.is_public, c.colour_key, ${CATEGORY_SUBJECT_SELECT},
       (SELECT COUNT(*) FROM question_set s WHERE s.category_id = c.id) AS set_count
     FROM question_category c
     ${CATEGORY_SUBJECT_JOIN}
     WHERE c.id = $1`,
    [categoryId]
  );
  const categoryRow = categoryRows[0];
  if (!categoryRow) return null;

  const { rows: setRows } = userId
    ? await pool.query(`${SET_SUMMARY_SELECT(2)} WHERE s.category_id = $1 ORDER BY s.position, s.name`, [
        categoryId,
        userId,
      ])
    : await pool.query(`${SET_SUMMARY_SELECT_SIGNED_OUT} WHERE s.category_id = $1 ORDER BY s.position, s.name`, [
        categoryId,
      ]);

  return { category: mapCategoryRow(categoryRow), sets: setRows.map(mapSetSummaryRow) };
}

// ============================================================
// Pass 3 — the folder page (QBANK-IMPLEMENTATION.md). The header's
// ring/bar/legend/metrics are all derived in the caller from the same
// `sets` array getCategoryWithSets already returns (sum questionCount/
// yourAttempts/yourCorrect, max lastAnsweredAt) — no separate query,
// same "one definition, reused" discipline as the dashboard.
// ============================================================

export interface FolderQuestionRow {
  id: string;
  setId: string;
  setName: string;
  prompt: string;
  status: "correct" | "incorrect" | "notSeen";
  flagged: boolean;
}

// Backs both the "All questions" and "My incorrect" tabs (the caller
// filters by status; one query covers both, matching how a single
// question_attempt row already carries everything needed for either
// view). Never leaks is_correct for a question the member hasn't
// attempted — status is derived from the attempt row, not the option
// table, same answer-leak-safety getSetWithQuestions already follows.
export async function getFolderQuestions(categoryId: string, userId: string): Promise<FolderQuestionRow[]> {
  const { rows } = await pool.query(
    `SELECT q.id, q.set_id, st.name AS set_name, q.prompt, a.is_correct, (f.user_id IS NOT NULL) AS flagged
     FROM question q
     JOIN question_set st ON st.id = q.set_id
     LEFT JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $2
     LEFT JOIN question_flag f ON f.question_id = q.id AND f.user_id = $2
     WHERE st.category_id = $1
     ORDER BY st.position, q.position`,
    [categoryId, userId]
  );
  return rows.map((r) => ({
    id: r.id,
    setId: r.set_id,
    setName: r.set_name,
    prompt: r.prompt,
    status: r.is_correct === null ? "notSeen" : r.is_correct ? "correct" : "incorrect",
    flagged: r.flagged,
  }));
}

export async function getFolderFlaggedCount(categoryId: string, userId: string): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM question_flag f
     JOIN question q ON q.id = f.question_id
     JOIN question_set st ON st.id = q.set_id
     WHERE st.category_id = $1 AND f.user_id = $2`,
    [categoryId, userId]
  );
  return rows[0].count;
}

export interface WorthRevisitingRow {
  id: string;
  setId: string;
  setName: string;
  prompt: string;
  wrongCount: number;
}

// "The actual questions answered wrong more than once" (QBANK-SPEC.md)
// — wrong_count (migration 0070) is the cumulative counter recordAttempt
// bumps on every wrong answer, not just the latest attempt's outcome.
export async function getWorthRevisiting(categoryId: string, userId: string, limit = 10): Promise<WorthRevisitingRow[]> {
  const { rows } = await pool.query(
    `SELECT q.id, q.set_id, st.name AS set_name, q.prompt, a.wrong_count
     FROM question q
     JOIN question_set st ON st.id = q.set_id
     JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $2
     WHERE st.category_id = $1 AND a.wrong_count >= 2
     ORDER BY a.wrong_count DESC, a.answered_at DESC
     LIMIT $3`,
    [categoryId, userId, limit]
  );
  return rows.map((r) => ({ id: r.id, setId: r.set_id, setName: r.set_name, prompt: r.prompt, wrongCount: r.wrong_count }));
}

export async function getUnfiledSets(userId: string | null): Promise<QuestionSetSummary[]> {
  const { rows } = userId
    ? await pool.query(`${SET_SUMMARY_SELECT(1)} WHERE s.category_id IS NULL ORDER BY s.position, s.name`, [userId])
    : await pool.query(`${SET_SUMMARY_SELECT_SIGNED_OUT} WHERE s.category_id IS NULL ORDER BY s.position, s.name`);
  return rows.map(mapSetSummaryRow);
}

export async function getDashboardStats(
  userId: string | null
): Promise<{ totalQuestions: number; totalSets: number; yourAverageScore: number | null; yourAttempts: number }> {
  const { rows: totalsRows } = await pool.query(
    `SELECT (SELECT COUNT(*) FROM question)::int AS total_questions,
            (SELECT COUNT(*) FROM question_set)::int AS total_sets`
  );
  const totals = totalsRows[0];

  if (!userId) {
    return { totalQuestions: totals.total_questions, totalSets: totals.total_sets, yourAverageScore: null, yourAttempts: 0 };
  }

  const { rows: attemptRows } = await pool.query(
    `SELECT COUNT(*)::int AS attempts, COUNT(*) FILTER (WHERE is_correct)::int AS correct
     FROM question_attempt WHERE user_id = $1`,
    [userId]
  );
  const { attempts, correct } = attemptRows[0];
  return {
    totalQuestions: totals.total_questions,
    totalSets: totals.total_sets,
    yourAverageScore: attempts > 0 ? Math.round((correct / attempts) * 100) : null,
    yourAttempts: attempts,
  };
}

// ============================================================
// Pass 2 — the dashboard (QBANK-IMPLEMENTATION.md). Definitions
// "implemented once and reused": accuracy = correct / answered (this
// table only ever holds the latest attempt per question, so no
// "latest attempt per question" filtering is needed the way an
// append-only log would require); to review = answered wrong;
// streak = consecutive days with >= 1 attempt.
// ============================================================

// Same day-walk-backwards shape as flashcards.ts's getUserStreak, over
// question_attempt.answered_at instead of flashcard_review_log.
export async function getQuestionBankStreak(userId: string, todayYmd: string): Promise<number> {
  const { rows } = await pool.query<{ day: string }>(
    `SELECT DISTINCT (answered_at AT TIME ZONE 'UTC')::date::text AS day
     FROM question_attempt WHERE user_id = $1
     ORDER BY day DESC LIMIT 400`,
    [userId]
  );
  const answeredDays = new Set(rows.map((r) => r.day));
  let streak = 0;
  const cursor = new Date(`${todayYmd}T00:00:00Z`);
  while (answeredDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

// "Browse by folder" (QBANK-SPEC.md's minimal pastel cards) — one
// grouped query per folder, not per subject, since a folder card needs
// its own set/question counts and accuracy regardless of how the
// subject-level rail rolls them up.
export interface QuestionBankFolderTile {
  id: string;
  name: string;
  colourKey: QbankFolderColor;
  subjectId: string;
  isPublic: boolean;
  setCount: number;
  questionCount: number;
  answered: number;
  accuracyPercent: number | null;
}

export async function getQuestionBankFolderTiles(userId: string | null): Promise<QuestionBankFolderTile[]> {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.colour_key, c.subject_id, c.is_public,
       COUNT(DISTINCT st.id)::int AS set_count,
       COUNT(DISTINCT q.id)::int AS question_count,
       COUNT(a.question_id)::int AS answered,
       COUNT(*) FILTER (WHERE a.is_correct)::int AS correct
     FROM question_category c
     LEFT JOIN question_set st ON st.category_id = c.id
     LEFT JOIN question q ON q.set_id = st.id
     LEFT JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $1
     GROUP BY c.id
     ORDER BY c.position, c.name`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    colourKey: r.colour_key,
    subjectId: r.subject_id,
    isPublic: r.is_public,
    setCount: r.set_count,
    questionCount: r.question_count,
    answered: r.answered,
    accuracyPercent: r.answered === 0 ? null : Math.round((r.correct / r.answered) * 100),
  }));
}

export interface QuestionBankSubjectGroup {
  subjectId: string;
  subjectName: string;
  subjectColor: CardColor;
  folders: QuestionBankFolderTile[];
}

// Groups getQuestionBankFolderTiles' flat list by subject in JS — same
// shape as flashcards.ts's groupLibraryTopicsBySubject. `subjects` is
// the admin-managed list (already ordered by position); a subject with
// no folders simply doesn't appear.
export function groupFoldersBySubject(
  folders: QuestionBankFolderTile[],
  subjects: { id: string; name: string; color: CardColor }[]
): QuestionBankSubjectGroup[] {
  const groups = new Map<string, QuestionBankFolderTile[]>();
  for (const folder of folders) {
    const existing = groups.get(folder.subjectId);
    if (existing) existing.push(folder);
    else groups.set(folder.subjectId, [folder]);
  }
  return subjects
    .filter((s) => groups.has(s.id))
    .map((s) => ({ subjectId: s.id, subjectName: s.name, subjectColor: s.color, folders: groups.get(s.id)! }));
}

const QBANK_PROGRESS_WEEKS = 12;
const WEAKEST_FOLDERS_MIN_ANSWERED = 3;
const WEAKEST_FOLDERS_COUNT = 4;

// Monday-start week boundary — same as flashcards.ts's own
// startOfIsoWeek, duplicated rather than shared since importing from
// flashcards.ts here would be a cross-feature coupling this file has
// otherwise avoided (it only reads flashcard_subject, never
// flashcards.ts's own functions).
function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + ((day === 0 ? -6 : 1) - day));
  return d;
}

export interface QuestionBankProgress {
  accuracyPercent: number | null;
  answered: number;
  totalQuestions: number;
  incorrect: number;
  notSeen: number;
  // QBANK_PROGRESS_WEEKS entries, oldest first, last entry = this week.
  weeklyCounts: number[];
  weeklyAverage: number;
  weakestFolders: { id: string; name: string; colourKey: QbankFolderColor; accuracyPercent: number }[];
}

// null when the visitor has never answered a single question — nothing
// to chart yet (same "never show a statistic with no data" rule
// flashcards.ts's progress panels follow).
export async function getQuestionBankProgress(userId: string, todayYmd: string): Promise<QuestionBankProgress | null> {
  const [railStats, weekRows, folderTiles] = await Promise.all([
    getQuestionBankRailStats(userId),
    pool.query<{ week_start: string; count: string }>(
      `SELECT date_trunc('week', answered_at)::date::text AS week_start, COUNT(*)::int AS count
       FROM question_attempt
       WHERE user_id = $1 AND answered_at >= now() - interval '${QBANK_PROGRESS_WEEKS} weeks'
       GROUP BY week_start`,
      [userId]
    ),
    getQuestionBankFolderTiles(userId),
  ]);

  if (railStats.answered === 0) return null;

  const byWeek = new Map(weekRows.rows.map((r) => [r.week_start, Number(r.count)]));
  const thisWeekStart = startOfIsoWeek(new Date(`${todayYmd}T00:00:00Z`));
  const weeklyCounts: number[] = [];
  for (let i = QBANK_PROGRESS_WEEKS - 1; i >= 0; i--) {
    const d = new Date(thisWeekStart);
    d.setUTCDate(d.getUTCDate() - i * 7);
    weeklyCounts.push(byWeek.get(d.toISOString().slice(0, 10)) ?? 0);
  }

  const weakestFolders = folderTiles
    .filter((f) => f.answered >= WEAKEST_FOLDERS_MIN_ANSWERED && f.accuracyPercent !== null)
    .sort((a, b) => a.accuracyPercent! - b.accuracyPercent!)
    .slice(0, WEAKEST_FOLDERS_COUNT)
    .map((f) => ({ id: f.id, name: f.name, colourKey: f.colourKey, accuracyPercent: f.accuracyPercent! }));

  return {
    accuracyPercent: railStats.accuracyPercent,
    answered: railStats.answered,
    totalQuestions: railStats.totalQuestions,
    incorrect: railStats.incorrect,
    notSeen: railStats.notSeen,
    weeklyCounts,
    weeklyAverage: Math.round(weeklyCounts.reduce((a, b) => a + b, 0) / QBANK_PROGRESS_WEEKS),
    weakestFolders,
  };
}

// One real question + its options, for the homepage's Question Bank
// showcase mockup — unlike getSetWithQuestions this deliberately DOES
// include is_correct, since this is marketing copy illustrating the
// interaction pattern (not the live runner, where hiding the answer
// pre-attempt is the whole point). Picks the very first question by
// position/created_at so the result is stable rather than random.
export async function getSampleQuestion(): Promise<{ prompt: string; options: { label: string; isCorrect: boolean }[] } | null> {
  const { rows: questionRows } = await pool.query(
    `SELECT id, prompt FROM question ORDER BY position, created_at LIMIT 1`
  );
  const question = questionRows[0];
  if (!question) return null;
  const { rows: optionRows } = await pool.query(
    `SELECT label, is_correct FROM question_option WHERE question_id = $1 ORDER BY position LIMIT 4`,
    [question.id]
  );
  return {
    prompt: question.prompt,
    options: optionRows.map((r) => ({ label: r.label, isCorrect: r.is_correct })),
  };
}

// The answer-leak-safe fetch behind the member-facing question runner
// — see the migration file's header comment and this session's plan
// for why unanswered questions never carry isCorrect/rationale.
export async function getSetWithQuestions(setId: string, userId: string | null): Promise<QuestionSetDetail | null> {
  const { rows: setRows } = await pool.query(
    `SELECT s.id, s.category_id, c.name AS category_name, s.name, s.description, s.color, s.difficulty
     FROM question_set s
     LEFT JOIN question_category c ON c.id = s.category_id
     WHERE s.id = $1`,
    [setId]
  );
  const setRow = setRows[0];
  if (!setRow) return null;

  const { rows: questionRows } = await pool.query(
    `SELECT id, prompt, topic_label, tags FROM question WHERE set_id = $1 ORDER BY position, created_at`,
    [setId]
  );

  const { rows: optionRows } = await pool.query(
    `SELECT o.id, o.question_id, o.label, o.is_correct, o.rationale
     FROM question_option o
     JOIN question q ON q.id = o.question_id
     WHERE q.set_id = $1
     ORDER BY o.position`,
    [setId]
  );

  const attemptsByQuestionId = new Map<
    string,
    { selected_option_id: string | null; is_correct: boolean; answered_at: string }
  >();
  if (userId) {
    const { rows: attemptRows } = await pool.query(
      `SELECT a.question_id, a.selected_option_id, a.is_correct, a.answered_at
       FROM question_attempt a
       JOIN question q ON q.id = a.question_id
       WHERE q.set_id = $1 AND a.user_id = $2`,
      [setId, userId]
    );
    for (const row of attemptRows) attemptsByQuestionId.set(row.question_id, row);
  }

  const optionsByQuestionId = new Map<string, typeof optionRows>();
  for (const row of optionRows) {
    const list = optionsByQuestionId.get(row.question_id) ?? [];
    list.push(row);
    optionsByQuestionId.set(row.question_id, list);
  }

  const questions: QuestionRunnerItem[] = questionRows.map((q) => {
    const options = optionsByQuestionId.get(q.id) ?? [];
    const attempt = attemptsByQuestionId.get(q.id);
    const reveal: QuestionReveal | null = attempt
      ? {
          correctOptionId: options.find((o) => o.is_correct)?.id ?? "",
          explanation: "", // filled in below from the question row
          optionRationales: Object.fromEntries(options.map((o) => [o.id, o.rationale as string | null])),
        }
      : null;
    return {
      id: q.id,
      prompt: q.prompt,
      topicLabel: q.topic_label,
      tags: q.tags ?? [],
      options: options.map((o) => ({ id: o.id, label: o.label })),
      yourAttempt: attempt
        ? { selectedOptionId: attempt.selected_option_id, isCorrect: attempt.is_correct, answeredAt: attempt.answered_at }
        : null,
      reveal,
    };
  });

  // explanation lives on the question row, not the option rows — fill
  // it in on the reveal object now that we have both in scope.
  const explanationByQuestionId = new Map(questionRows.map((q) => [q.id, q.explanation as string]));
  for (const question of questions) {
    if (question.reveal) question.reveal.explanation = explanationByQuestionId.get(question.id) ?? "";
  }

  return {
    id: setRow.id,
    categoryId: setRow.category_id,
    categoryName: setRow.category_name,
    name: setRow.name,
    description: setRow.description,
    color: setRow.color,
    difficulty: setRow.difficulty,
    questions,
  };
}

// The one function allowed to read is_correct/rationale for a question
// the caller hasn't necessarily answered yet — upserts the attempt and
// returns exactly the reveal payload the client is allowed to see.
export async function recordAttempt(
  userId: string,
  questionId: string,
  selectedOptionId: string
): Promise<QuestionAttemptResult | null> {
  const { rows: optionRows } = await pool.query(
    `SELECT id, is_correct, rationale FROM question_option WHERE question_id = $1 ORDER BY position`,
    [questionId]
  );
  if (optionRows.length === 0) return null;
  const selected = optionRows.find((o) => o.id === selectedOptionId);
  if (!selected) return null;
  const correctOption = optionRows.find((o) => o.is_correct);
  if (!correctOption) return null;

  const { rows: questionRows } = await pool.query(`SELECT explanation FROM question WHERE id = $1`, [questionId]);
  const explanation = questionRows[0]?.explanation ?? "";

  await pool.query(
    `INSERT INTO question_attempt (user_id, question_id, selected_option_id, is_correct, answered_at, wrong_count)
     VALUES ($1, $2, $3, $4, now(), CASE WHEN $4 THEN 0 ELSE 1 END)
     ON CONFLICT (user_id, question_id)
     DO UPDATE SET selected_option_id = $3, is_correct = $4, answered_at = now(),
       wrong_count = question_attempt.wrong_count + (CASE WHEN $4 THEN 0 ELSE 1 END)`,
    [userId, questionId, selectedOptionId, selected.is_correct]
  );

  return {
    isCorrect: selected.is_correct,
    correctOptionId: correctOption.id,
    explanation,
    optionRationales: Object.fromEntries(optionRows.map((o) => [o.id, o.rationale as string | null])),
  };
}

// Called from the "Start over" control — deletes this member's
// question_attempt rows for every question in the set, same "wipe
// progress outright" reset Flashcards uses for its own Start Over
// control (see flashcards.ts's resetDeckProgress). A plain DELETE with
// no matching rows is a harmless no-op.
export async function resetSetAttempts(userId: string, setId: string): Promise<void> {
  await pool.query(
    `DELETE FROM question_attempt WHERE user_id = $1 AND question_id IN (SELECT id FROM question WHERE set_id = $2)`,
    [userId, setId]
  );
}

// ---- Editor-only authoring reads/writes below ----

export async function getQuestionsForManagement(setId: string): Promise<QuestionEditable[]> {
  const { rows: questionRows } = await pool.query(
    `SELECT id, prompt, explanation, topic_label, tags, position FROM question WHERE set_id = $1 ORDER BY position, created_at`,
    [setId]
  );
  const { rows: optionRows } = await pool.query(
    `SELECT o.id, o.question_id, o.label, o.is_correct, o.rationale, o.position
     FROM question_option o
     JOIN question q ON q.id = o.question_id
     WHERE q.set_id = $1
     ORDER BY o.position`,
    [setId]
  );
  const optionsByQuestionId = new Map<string, QuestionOptionEditable[]>();
  for (const row of optionRows) {
    const list = optionsByQuestionId.get(row.question_id) ?? [];
    list.push({ id: row.id, label: row.label, isCorrect: row.is_correct, rationale: row.rationale, position: row.position });
    optionsByQuestionId.set(row.question_id, list);
  }
  return questionRows.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    explanation: q.explanation,
    topicLabel: q.topic_label,
    tags: q.tags ?? [],
    position: q.position,
    options: optionsByQuestionId.get(q.id) ?? [],
  }));
}

export async function createCategory(name: string, color: CardColor): Promise<QuestionCategory> {
  const { rows: siblingRows } = await pool.query<{ colour_key: QbankFolderColor | null }>(
    `SELECT colour_key FROM question_category`
  );
  const colourKey = pickFreeQbankFolderColor(siblingRows.map((r) => r.colour_key));
  // A brand-new folder starts on whichever subject sorts first — same
  // "always at least one row" guarantee flashcards.ts's own
  // createCategory relies on (flashcards.ts's deleteSubject refuses to
  // remove the last subject left).
  const { rows: subjectRows } = await pool.query<{ id: string; name: string; color: CardColor }>(
    `SELECT id, name, color FROM flashcard_subject ORDER BY position, name LIMIT 1`
  );
  const fallbackSubject = subjectRows[0];
  const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM question_category`);
  const { rows } = await pool.query(
    `INSERT INTO question_category (name, color, colour_key, subject_id, position) VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, color, icon`,
    [name, color, colourKey, fallbackSubject.id, countRows[0].count]
  );
  return mapCategoryRow({
    ...rows[0],
    is_public: false,
    colour_key: colourKey,
    subject_id: fallbackSubject.id,
    subject_name: fallbackSubject.name,
    subject_color: fallbackSubject.color,
    set_count: "0",
  });
}

export async function renameCategory(categoryId: string, name: string): Promise<void> {
  await pool.query(`UPDATE question_category SET name = $1 WHERE id = $2`, [name, categoryId]);
}

export async function updateCategoryColor(categoryId: string, color: CardColor): Promise<void> {
  await pool.query(`UPDATE question_category SET color = $1 WHERE id = $2`, [color, categoryId]);
}

// Sets in this folder aren't deleted — category_id just falls back to
// NULL (ON DELETE SET NULL), same as Flashcards' deleteCategory.
export async function deleteCategory(categoryId: string): Promise<void> {
  await pool.query(`DELETE FROM question_category WHERE id = $1`, [categoryId]);
}

export async function createQuestionSet(
  name: string,
  color: CardColor,
  difficulty: Difficulty,
  categoryId: string | null
): Promise<{ id: string }> {
  const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM question_set`);
  const { rows } = await pool.query(
    `INSERT INTO question_set (category_id, name, color, difficulty, position)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [categoryId, name, color, difficulty, countRows[0].count]
  );
  return { id: rows[0].id };
}

export async function renameQuestionSet(setId: string, name: string): Promise<void> {
  await pool.query(`UPDATE question_set SET name = $1 WHERE id = $2`, [name, setId]);
}

export async function updateQuestionSetColor(setId: string, color: CardColor): Promise<void> {
  await pool.query(`UPDATE question_set SET color = $1 WHERE id = $2`, [color, setId]);
}

export async function updateQuestionSetDifficulty(setId: string, difficulty: Difficulty): Promise<void> {
  await pool.query(`UPDATE question_set SET difficulty = $1 WHERE id = $2`, [difficulty, setId]);
}

export async function setQuestionSetCategory(setId: string, categoryId: string | null): Promise<void> {
  await pool.query(`UPDATE question_set SET category_id = $1 WHERE id = $2`, [categoryId, setId]);
}

export async function deleteQuestionSet(setId: string): Promise<void> {
  await pool.query(`DELETE FROM question_set WHERE id = $1`, [setId]);
}

export async function createQuestion(
  setId: string,
  prompt: string,
  explanation: string,
  topicLabel: string | null,
  tags: string[],
  options: QuestionOptionInput[]
): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: countRows } = await client.query(`SELECT COUNT(*)::int AS count FROM question WHERE set_id = $1`, [
      setId,
    ]);
    const { rows: questionRows } = await client.query(
      `INSERT INTO question (set_id, prompt, explanation, topic_label, tags, position)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [setId, prompt, explanation, topicLabel, tags, countRows[0].count]
    );
    const questionId = questionRows[0].id;
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      await client.query(
        `INSERT INTO question_option (question_id, label, is_correct, rationale, position)
         VALUES ($1, $2, $3, $4, $5)`,
        [questionId, option.label, option.isCorrect, option.rationale, i]
      );
    }
    await client.query("COMMIT");
    return questionId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Replaces the question's options wholesale (delete + reinsert in
// position order) rather than diffing — option lists are always 2-5
// items, so this is simpler and safer than tracking per-option identity
// across an edit. Existing question_attempt rows for this question keep
// their historical is_correct/selected_option_id (the latter falls back
// to NULL via ON DELETE SET NULL if its option no longer exists) —
// accepted as a rare edge case, not worth extra complexity to preserve.
export async function updateQuestion(
  questionId: string,
  prompt: string,
  explanation: string,
  topicLabel: string | null,
  tags: string[],
  options: QuestionOptionInput[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE question SET prompt = $1, explanation = $2, topic_label = $3, tags = $4 WHERE id = $5`,
      [prompt, explanation, topicLabel, tags, questionId]
    );
    await client.query(`DELETE FROM question_option WHERE question_id = $1`, [questionId]);
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      await client.query(
        `INSERT INTO question_option (question_id, label, is_correct, rationale, position)
         VALUES ($1, $2, $3, $4, $5)`,
        [questionId, option.label, option.isCorrect, option.rationale, i]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await pool.query(`DELETE FROM question WHERE id = $1`, [questionId]);
}

export async function reorderQuestions(setId: string, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(`UPDATE question SET position = $1 WHERE id = $2 AND set_id = $3`, [i, orderedIds[i], setId]);
  }
}
