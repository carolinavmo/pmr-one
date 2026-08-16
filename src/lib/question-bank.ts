import { pool } from "@/lib/db";
import type { CardColor } from "@/lib/editorial-blocks";
import type { CardIconName } from "@/components/ui/cardIcons";

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

function mapCategoryRow(r: {
  id: string;
  name: string;
  color: CardColor;
  icon: string | null;
  set_count: string;
  is_public: boolean;
}): QuestionCategory {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    icon: (r.icon as CardIconName | null) ?? undefined,
    setCount: Number(r.set_count),
    isPublic: r.is_public,
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
    lastAnsweredAt: r.last_answered_at,
  };
}

export async function getCategories(): Promise<QuestionCategory[]> {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.color, c.icon, c.is_public,
       (SELECT COUNT(*) FROM question_set s WHERE s.category_id = c.id) AS set_count
     FROM question_category c
     ORDER BY c.position, c.name`
  );
  return rows.map(mapCategoryRow);
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
    `SELECT c.id, c.name, c.color, c.icon, c.is_public,
       (SELECT COUNT(*) FROM question_set s WHERE s.category_id = c.id) AS set_count
     FROM question_category c
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
    `INSERT INTO question_attempt (user_id, question_id, selected_option_id, is_correct, answered_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id, question_id)
     DO UPDATE SET selected_option_id = $3, is_correct = $4, answered_at = now()`,
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
  const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM question_category`);
  const { rows } = await pool.query(
    `INSERT INTO question_category (name, color, position) VALUES ($1, $2, $3)
     RETURNING id, name, color, icon`,
    [name, color, countRows[0].count]
  );
  return mapCategoryRow({ ...rows[0], set_count: "0" });
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
