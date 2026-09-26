import { pool } from "@/lib/db";
import { getQuestionBankRailStats } from "@/lib/question-bank";

export { DEFAULT_SESSION_SIZE, SECONDS_PER_QUESTION } from "@/lib/question-bank-session-constants";

// QBANK-IMPLEMENTATION.md Pass 4 — the session engine. Kept as its own
// file rather than folded into question-bank.ts (already large) —
// same split flashcards.ts and flashcards-admin.ts use for reader vs.
// deeper functionality.
//
// question_session_item deliberately carries no answer state of its
// own (see migration 0071's header comment) — every read here treats
// question_attempt as the one place an answer lives, joined in fresh
// each time, so a session's own bookkeeping can never drift from the
// dashboard/folder-page figures that read the same table.

export type SessionMode = "tutor" | "exam" | "timed";
export type SessionBuildFilter = "smart" | "incorrect" | "flagged" | "notSeen" | "subject" | "folder";

export interface SessionBuiltFrom {
  filter: SessionBuildFilter;
  subjectId?: string;
  folderId?: string;
  size: number;
}

export interface QuestionSessionSummary {
  id: string;
  mode: SessionMode;
  builtFrom: SessionBuiltFrom;
  position: number;
  size: number;
  startedAt: string;
  finishedAt: string | null;
}

function mapSessionRow(r: { id: string; mode: SessionMode; built_from: SessionBuiltFrom; position: number; started_at: string; finished_at: string | null }, itemCount: number): QuestionSessionSummary {
  return {
    id: r.id,
    mode: r.mode,
    builtFrom: r.built_from,
    position: r.position,
    size: itemCount,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
  };
}

// A signed-in member has at most one open session at a time — the
// dashboard's "Resume · Q12 of 20" reads this; starting a new session
// while one is open replaces it (see createSession's own comment).
export async function getActiveSession(userId: string): Promise<QuestionSessionSummary | null> {
  const { rows } = await pool.query(
    `SELECT s.id, s.mode, s.built_from, s.position, s.started_at, s.finished_at,
       (SELECT COUNT(*) FROM question_session_item i WHERE i.session_id = s.id)::int AS item_count
     FROM question_session s
     WHERE s.user_id = $1 AND s.finished_at IS NULL
     ORDER BY s.started_at DESC LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  return row ? mapSessionRow(row, row.item_count) : null;
}

// Selection order (QBANK-IMPLEMENTATION.md Pass 4): "incorrect first,
// then unseen, then weakest subject, unless the filters say
// otherwise." A named filter (incorrect/flagged/notSeen/subject/
// folder) narrows to exactly that pool; "smart" (the dashboard's plain
// Start button) builds the default mix.
async function selectQuestionIds(userId: string, builtFrom: SessionBuiltFrom): Promise<string[]> {
  const { filter, subjectId, folderId, size } = builtFrom;

  if (filter === "incorrect") {
    const { rows } = await pool.query(
      `SELECT q.id FROM question q
       JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $1 AND NOT a.is_correct
       ORDER BY a.wrong_count DESC, a.answered_at DESC
       LIMIT $2`,
      [userId, size]
    );
    return rows.map((r) => r.id);
  }
  if (filter === "flagged") {
    const { rows } = await pool.query(
      `SELECT q.id FROM question q
       JOIN question_flag f ON f.question_id = q.id AND f.user_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2`,
      [userId, size]
    );
    return rows.map((r) => r.id);
  }
  if (filter === "notSeen") {
    const { rows } = await pool.query(
      `SELECT q.id FROM question q
       LEFT JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $1
       WHERE a.question_id IS NULL
       ORDER BY random()
       LIMIT $2`,
      [userId, size]
    );
    return rows.map((r) => r.id);
  }
  if (filter === "subject" && subjectId) {
    const { rows } = await pool.query(
      `SELECT q.id FROM question q
       JOIN question_set st ON st.id = q.set_id
       JOIN question_category c ON c.id = st.category_id
       LEFT JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $2
       WHERE c.subject_id = $1
       ORDER BY (a.question_id IS NULL) DESC, COALESCE(NOT a.is_correct, false) DESC, random()
       LIMIT $3`,
      [subjectId, userId, size]
    );
    return rows.map((r) => r.id);
  }
  if (filter === "folder" && folderId) {
    const { rows } = await pool.query(
      `SELECT q.id FROM question q
       JOIN question_set st ON st.id = q.set_id
       LEFT JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $2
       WHERE st.category_id = $1
       ORDER BY (a.question_id IS NULL) DESC, COALESCE(NOT a.is_correct, false) DESC, random()
       LIMIT $3`,
      [folderId, userId, size]
    );
    return rows.map((r) => r.id);
  }

  // "smart" — incorrect first...
  const ids: string[] = [];
  const { rows: wrongRows } = await pool.query(
    `SELECT q.id FROM question q
     JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $1 AND NOT a.is_correct
     ORDER BY a.wrong_count DESC, a.answered_at DESC
     LIMIT $2`,
    [userId, size]
  );
  ids.push(...wrongRows.map((r) => r.id));

  // ...then unseen, weakest subject first.
  if (ids.length < size) {
    const stats = await getQuestionBankRailStats(userId);
    const subjectRank = new Map(stats.bySubject.map((s) => [s.subjectId, s.accuracyPercent ?? 101]));
    const { rows: unseenRows } = await pool.query(
      `SELECT q.id, c.subject_id FROM question q
       JOIN question_set st ON st.id = q.set_id
       JOIN question_category c ON c.id = st.category_id
       LEFT JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $1
       WHERE a.question_id IS NULL`,
      [userId]
    );
    const ranked = unseenRows
      .filter((r) => !ids.includes(r.id))
      .sort((a, b) => (subjectRank.get(a.subject_id) ?? 101) - (subjectRank.get(b.subject_id) ?? 101));
    ids.push(...ranked.slice(0, size - ids.length).map((r) => r.id));
  }

  // ...then whatever's left, to fill a short session rather than
  // refuse one (a member who's answered almost everything still gets
  // a full-size session, repeating their weakest-scored questions).
  if (ids.length < size) {
    const { rows: fillRows } = await pool.query(
      `SELECT q.id FROM question q
       LEFT JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $1
       WHERE q.id != ALL($2::uuid[])
       ORDER BY COALESCE(a.is_correct, false) ASC, random()
       LIMIT $3`,
      [userId, ids.length ? ids : ["00000000-0000-0000-0000-000000000000"], size - ids.length]
    );
    ids.push(...fillRows.map((r) => r.id));
  }

  return ids;
}

// Starting a new session while one is already open replaces it
// (finishes the old one early) — same "one active thing at a time"
// idiom as Flashcards' single active deck-position row; a member who
// clicks Start again clearly wants a fresh session, not two competing
// resume points.
export async function createSession(userId: string, mode: SessionMode, builtFrom: SessionBuiltFrom): Promise<string | null> {
  const questionIds = await selectQuestionIds(userId, builtFrom);
  if (questionIds.length === 0) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE question_session SET finished_at = now() WHERE user_id = $1 AND finished_at IS NULL`, [userId]);
    const { rows } = await client.query(
      `INSERT INTO question_session (user_id, mode, built_from) VALUES ($1, $2, $3) RETURNING id`,
      [userId, mode, JSON.stringify(builtFrom)]
    );
    const sessionId = rows[0].id;
    for (let i = 0; i < questionIds.length; i++) {
      await client.query(`INSERT INTO question_session_item (session_id, question_id, position) VALUES ($1, $2, $3)`, [sessionId, questionIds[i], i]);
    }
    await client.query("COMMIT");
    return sessionId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface SessionMapItem {
  questionId: string;
  position: number;
  status: "correct" | "incorrect" | "unseen";
}

export interface SessionQuestionDetail {
  id: string;
  prompt: string;
  setId: string;
  setName: string;
  options: { id: string; label: string }[];
  // Present only once this member has already attempted this specific
  // question — same answer-leak-safety rule getSetWithQuestions
  // follows, just re-applied per session item instead of per set.
  yourAttempt: { selectedOptionId: string | null; isCorrect: boolean } | null;
  reveal: { correctOptionId: string; explanation: string; optionRationales: Record<string, string | null> } | null;
}

export interface SessionRunnerData {
  session: QuestionSessionSummary;
  items: SessionMapItem[];
  // null once the session is finished (position walked past the last
  // item, or the member ended it early) — the caller shows results
  // instead of a question in that case, rather than 404ing.
  current: SessionQuestionDetail | null;
}

export async function getSessionRunnerData(sessionId: string, userId: string): Promise<SessionRunnerData | null> {
  const { rows: sessionRows } = await pool.query(
    `SELECT s.id, s.mode, s.built_from, s.position, s.started_at, s.finished_at,
       (SELECT COUNT(*) FROM question_session_item i WHERE i.session_id = s.id)::int AS item_count
     FROM question_session s WHERE s.id = $1 AND s.user_id = $2`,
    [sessionId, userId]
  );
  const sessionRow = sessionRows[0];
  if (!sessionRow) return null;
  const session = mapSessionRow(sessionRow, sessionRow.item_count);

  const { rows: itemRows } = await pool.query(
    `SELECT i.question_id, i.position, a.is_correct
     FROM question_session_item i
     LEFT JOIN question_attempt a ON a.question_id = i.question_id AND a.user_id = $2
     WHERE i.session_id = $1
     ORDER BY i.position`,
    [sessionId, userId]
  );
  const items: SessionMapItem[] = itemRows.map((r) => ({
    questionId: r.question_id,
    position: r.position,
    status: r.is_correct === null ? "unseen" : r.is_correct ? "correct" : "incorrect",
  }));

  const currentItem = session.finishedAt ? undefined : items[session.position];
  if (!currentItem) return { session, items, current: null };

  const { rows: qRows } = await pool.query(
    `SELECT q.id, q.prompt, q.set_id, st.name AS set_name, q.explanation, a.selected_option_id, a.is_correct
     FROM question q
     JOIN question_set st ON st.id = q.set_id
     LEFT JOIN question_attempt a ON a.question_id = q.id AND a.user_id = $2
     WHERE q.id = $1`,
    [currentItem.questionId, userId]
  );
  const q = qRows[0];
  const { rows: optionRows } = await pool.query(
    `SELECT id, label, is_correct, rationale FROM question_option WHERE question_id = $1 ORDER BY position`,
    [currentItem.questionId]
  );
  const attempted = q.selected_option_id !== null || q.is_correct !== null;
  const correctOption = optionRows.find((o) => o.is_correct);

  const current: SessionQuestionDetail = {
    id: q.id,
    prompt: q.prompt,
    setId: q.set_id,
    setName: q.set_name,
    options: optionRows.map((o) => ({ id: o.id, label: o.label })),
    yourAttempt: attempted ? { selectedOptionId: q.selected_option_id, isCorrect: q.is_correct } : null,
    reveal:
      attempted && correctOption
        ? {
            correctOptionId: correctOption.id,
            explanation: q.explanation ?? "",
            optionRationales: Object.fromEntries(optionRows.map((o) => [o.id, o.rationale as string | null])),
          }
        : null,
  };

  return { session, items, current };
}

export async function setSessionPosition(sessionId: string, userId: string, position: number): Promise<void> {
  await pool.query(`UPDATE question_session SET position = $1 WHERE id = $2 AND user_id = $3 AND finished_at IS NULL`, [position, sessionId, userId]);
}

export async function finishSession(sessionId: string, userId: string): Promise<void> {
  await pool.query(`UPDATE question_session SET finished_at = now() WHERE id = $1 AND user_id = $2`, [sessionId, userId]);
}
