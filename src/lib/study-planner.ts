import { pool } from "@/lib/db";

// Study Planner v1 — per-user task tracking. Same pool.query pattern
// as workspace.ts, no ORM. Every mutation re-checks ownership in the
// SQL itself (WHERE id = $x AND user_id = $y) rather than trusting a
// caller-supplied id alone.

export interface StudyTask {
  id: string;
  title: string;
  notes: string | null;
  category: string;
  scheduledDate: string; // "YYYY-MM-DD"
  startTime: string | null; // "HH:MM" or null
  estimatedMinutes: number;
  priority: "low" | "medium" | "high";
  completed: boolean;
  completedAt: string | null;
  linkedContentType: string | null;
  linkedContentId: string | null;
}

export interface StudyTaskInput {
  title: string;
  notes: string | null;
  category: string;
  scheduledDate: string;
  startTime: string | null;
  estimatedMinutes: number;
  priority: "low" | "medium" | "high";
}

const TASK_COLUMNS = `
  id, title, notes, category, scheduled_date, start_time, estimated_minutes,
  priority, completed, completed_at, linked_content_type, linked_content_id
`;

function mapTaskRow(r: {
  id: string;
  title: string;
  notes: string | null;
  category: string;
  scheduled_date: string; // "YYYY-MM-DD" — see db.ts's DATE type parser override
  start_time: string | null;
  estimated_minutes: number;
  priority: "low" | "medium" | "high";
  completed: boolean;
  completed_at: Date | string | null;
  linked_content_type: string | null;
  linked_content_id: string | null;
}): StudyTask {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    category: r.category,
    scheduledDate: r.scheduled_date,
    startTime: r.start_time ? String(r.start_time).slice(0, 5) : null,
    estimatedMinutes: r.estimated_minutes,
    priority: r.priority,
    completed: r.completed,
    completedAt:
      r.completed_at instanceof Date
        ? r.completed_at.toISOString()
        : r.completed_at,
    linkedContentType: r.linked_content_type,
    linkedContentId: r.linked_content_id,
  };
}

export async function createTask(
  userId: string,
  input: StudyTaskInput,
): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO study_task
       (user_id, title, notes, category, scheduled_date, start_time, estimated_minutes, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      userId,
      input.title,
      input.notes,
      input.category,
      input.scheduledDate,
      input.startTime,
      input.estimatedMinutes,
      input.priority,
    ],
  );
  return rows[0].id;
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: StudyTaskInput,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE study_task
     SET title = $3, notes = $4, category = $5, scheduled_date = $6,
         start_time = $7, estimated_minutes = $8, priority = $9, updated_at = now()
     WHERE id = $1 AND user_id = $2`,
    [
      taskId,
      userId,
      input.title,
      input.notes,
      input.category,
      input.scheduledDate,
      input.startTime,
      input.estimatedMinutes,
      input.priority,
    ],
  );
  return (rowCount ?? 0) > 0;
}

export async function rescheduleTask(
  userId: string,
  taskId: string,
  newDate: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE study_task SET scheduled_date = $3, updated_at = now()
     WHERE id = $1 AND user_id = $2`,
    [taskId, userId, newDate],
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteTask(
  userId: string,
  taskId: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM study_task WHERE id = $1 AND user_id = $2`,
    [taskId, userId],
  );
  return (rowCount ?? 0) > 0;
}

// Single atomic flip — the SET clause's right-hand sides all evaluate
// against the pre-update row, so `NOT completed` correctly reads the
// old value even though `completed` is also being written in the same
// statement. Returns the new state, or null if no matching row (not
// found / not owned by this user).
export async function toggleTaskComplete(
  userId: string,
  taskId: string,
): Promise<boolean | null> {
  const { rows } = await pool.query(
    `UPDATE study_task
     SET completed = NOT completed,
         completed_at = CASE WHEN NOT completed THEN now() ELSE NULL END,
         updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING completed`,
    [taskId, userId],
  );
  return rows[0]?.completed ?? null;
}

// Backs the month grid (caller passes the visible 6-week range,
// including adjacent-month spillover days) and "today" (fromDate ===
// toDate).
export async function getTasksInRange(
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<StudyTask[]> {
  const { rows } = await pool.query(
    `SELECT ${TASK_COLUMNS} FROM study_task
     WHERE user_id = $1 AND scheduled_date BETWEEN $2 AND $3
     ORDER BY scheduled_date, start_time NULLS LAST, created_at`,
    [userId, fromDate, toDate],
  );
  return rows.map(mapTaskRow);
}

// Includes fromDate itself (matches the spec's own "Upcoming Tasks"
// example, which lists a task due "Today" first).
export async function getUpcomingTasks(
  userId: string,
  fromDate: string,
  limit = 5,
): Promise<StudyTask[]> {
  const { rows } = await pool.query(
    `SELECT ${TASK_COLUMNS} FROM study_task
     WHERE user_id = $1 AND scheduled_date >= $2 AND NOT completed
     ORDER BY scheduled_date, start_time NULLS LAST
     LIMIT $3`,
    [userId, fromDate, limit],
  );
  return rows.map(mapTaskRow);
}

// Small dataset, computed in JS rather than a recursive SQL CTE —
// same "small dataset, do it in JS" philosophy topics.ts already
// uses for the topic tree. Streaks count by the day a task was
// checked off (completed_at's date), not the day it was scheduled
// for, so catching up on an overdue task today still credits today —
// same mental model as a GitHub contribution streak.
export async function getStreak(userId: string): Promise<number> {
  const { rows } = await pool.query(
    `SELECT DISTINCT completed_at::date AS day
     FROM study_task
     WHERE user_id = $1 AND completed_at IS NOT NULL
       AND completed_at >= now() - interval '60 days'`,
    [userId],
  );
  // `completed_at::date` returns a DATE column, which db.ts's type
  // parser override already returns as a plain "YYYY-MM-DD" string —
  // no Date reconstruction needed here.
  const completedDays = new Set<string>(rows.map((r) => r.day as string));

  // Local calendar-date components, not toISOString() — the same
  // local-vs-UTC pitfall this file's DATE-column fix addresses
  // applies equally to a plain `new Date()` cursor in any timezone
  // ahead of UTC.
  const now = new Date();
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Grace period: if today has no completion yet, don't zero the
  // streak before the day is over — start counting from yesterday.
  if (!completedDays.has(toIso(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (completedDays.has(toIso(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Distinct dates (by completed_at, not scheduled_date) within a
// range — backs the Study Streak card's week-of-dots row, which shows
// which days something was actually checked off, same semantics as
// getStreak's own day-boundary logic.
export async function getCompletedDatesInRange(
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT DISTINCT completed_at::date AS day
     FROM study_task
     WHERE user_id = $1 AND completed_at IS NOT NULL
       AND completed_at::date BETWEEN $2 AND $3`,
    [userId, fromDate, toDate],
  );
  return rows.map((r) => r.day as string);
}

export interface WeeklyProgress {
  completed: number;
  total: number;
}

export async function getWeeklyProgress(
  userId: string,
  weekStartDate: string,
  weekEndDate: string,
): Promise<WeeklyProgress> {
  const { rows } = await pool.query(
    `SELECT
       count(*) FILTER (WHERE completed)::int AS completed,
       count(*)::int AS total
     FROM study_task
     WHERE user_id = $1 AND scheduled_date BETWEEN $2 AND $3`,
    [userId, weekStartDate, weekEndDate],
  );
  return { completed: rows[0]?.completed ?? 0, total: rows[0]?.total ?? 0 };
}

export interface OverallProgress {
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
}

export async function getOverallProgress(
  userId: string,
): Promise<OverallProgress> {
  const { rows } = await pool.query(
    `SELECT
       count(*) FILTER (WHERE completed)::int AS completed,
       count(*) FILTER (WHERE NOT completed AND scheduled_date <= CURRENT_DATE)::int AS in_progress,
       count(*) FILTER (WHERE NOT completed AND scheduled_date > CURRENT_DATE)::int AS pending,
       count(*)::int AS total
     FROM study_task
     WHERE user_id = $1`,
    [userId],
  );
  const r = rows[0];
  return {
    completed: r?.completed ?? 0,
    inProgress: r?.in_progress ?? 0,
    pending: r?.pending ?? 0,
    total: r?.total ?? 0,
  };
}
