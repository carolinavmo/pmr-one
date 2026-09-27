import { cache } from "react";
import { pool } from "@/lib/db";
import type { QbankFolderColor } from "@/lib/qbank-folder-colors";
import { estimateReadingMinutesFromValues } from "@/lib/reading-time";

// Study Planner v2 (PLANNER-SPEC.md) — "A plan generates tasks. A task
// points at something in the platform." Same pool.query / no-ORM
// style as every other lib file here. Table names are study_plan/
// study_plan_topic/study_plan_task/study_day_log — see migration
// 0072's own header comment for why they're not the spec's bare
// plan/task (the old study_task table already owns that name).

export type PlanKind = "exam" | "rotation" | "routine" | "custom";
export type PlanStatus = "active" | "paused" | "done";
export type TaskType = "read" | "flashcards" | "questions" | "course" | "custom";
export type TaskState = "pending" | "done" | "skipped";

export interface StudyPlan {
  id: string;
  name: string;
  kind: PlanKind;
  colourKey: QbankFolderColor;
  targetDate: string | null;
  status: PlanStatus;
  studyDays: number[];
  sessionMinutes: number;
  maxTasksPerDay: number;
  tasksDone: number;
  tasksTotal: number;
}

export interface PlannerTask {
  id: string;
  planId: string | null;
  planName: string | null;
  planColourKey: QbankFolderColor | null;
  type: TaskType;
  targetRef: string | null;
  title: string;
  estimateMinutes: number;
  scheduledFor: string;
  originalDate: string | null;
  state: TaskState;
  completedAt: string | null;
}

function mapTaskRow(r: {
  id: string;
  plan_id: string | null;
  plan_name: string | null;
  plan_colour_key: QbankFolderColor | null;
  type: TaskType;
  target_ref: string | null;
  title: string;
  estimate_minutes: number;
  scheduled_for: string;
  original_date: string | null;
  state: TaskState;
  completed_at: string | Date | null;
}): PlannerTask {
  return {
    id: r.id,
    planId: r.plan_id,
    planName: r.plan_name,
    planColourKey: r.plan_colour_key,
    type: r.type,
    targetRef: r.target_ref,
    title: r.title,
    estimateMinutes: r.estimate_minutes,
    scheduledFor: r.scheduled_for,
    originalDate: r.original_date,
    state: r.state,
    completedAt: r.completed_at instanceof Date ? r.completed_at.toISOString() : r.completed_at,
  };
}

const TASK_SELECT = `
  SELECT t.id, t.plan_id, p.name AS plan_name, p.colour_key AS plan_colour_key,
    t.type, t.target_ref, t.title, t.estimate_minutes, t.scheduled_for::text AS scheduled_for,
    t.original_date::text AS original_date, t.state, t.completed_at
  FROM study_plan_task t
  LEFT JOIN study_plan p ON p.id = t.plan_id
`;

// Missed tasks march forward one day at a time rather than a real
// nightly cron (no scheduler infra exists in this app — same "no
// notification infra" reasoning 0029's own header comment gave for
// skipping reminders) — called at the top of every Today/rail read,
// idempotent, and cheap (one indexed UPDATE) even when it matches zero
// rows. original_date is set only once (COALESCE keeps the true first
// miss) while scheduled_for keeps marching to "today" so a task missed
// three days ago still shows up as today's overdue item, not lost.
export async function rollForwardMissedTasks(userId: string): Promise<void> {
  await pool.query(
    `UPDATE study_plan_task
     SET scheduled_for = CURRENT_DATE, original_date = COALESCE(original_date, scheduled_for)
     WHERE user_id = $1 AND state = 'pending' AND scheduled_for < CURRENT_DATE`,
    [userId]
  );
}

export interface PlannerRailStats {
  todayCount: number;
  thisWeekCount: number;
  overdueCount: number;
  doneCount: number;
  streak: number;
}

// Request-scoped memoization only (not unstable_cache) — same
// reasoning getQuestionBankRailStats's own comment gives: this route
// is fully dynamic and per-user, so there's no persistent cache to
// invalidate; this just means Sidebar.tsx (the persistent rail) and
// page.tsx sharing one request don't each pay for their own round
// trip, as long as both pass the same todayIso/weekEndIso.
async function getPlannerRailStatsUncached(userId: string, todayIso: string, weekEndIso: string): Promise<PlannerRailStats> {
  const { rows } = await pool.query<{ today_count: string; this_week_count: string; overdue_count: string; done_count: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE scheduled_for = $2 AND state = 'pending')::int AS today_count,
       COUNT(*) FILTER (WHERE scheduled_for BETWEEN $2 AND $3)::int AS this_week_count,
       COUNT(*) FILTER (WHERE scheduled_for = $2 AND state = 'pending' AND original_date IS NOT NULL)::int AS overdue_count,
       COUNT(*) FILTER (WHERE state = 'done')::int AS done_count
     FROM study_plan_task WHERE user_id = $1`,
    [userId, todayIso, weekEndIso]
  );
  const r = rows[0];
  const streak = await getStreak(userId);
  return {
    todayCount: Number(r?.today_count ?? 0),
    thisWeekCount: Number(r?.this_week_count ?? 0),
    overdueCount: Number(r?.overdue_count ?? 0),
    doneCount: Number(r?.done_count ?? 0),
    streak,
  };
}

export const getPlannerRailStats = cache(getPlannerRailStatsUncached);

// Consecutive days with >= 1 task done, from study_day_log — same
// grace-period shape as flashcards.ts's getUserStreak (today not
// having a completion yet doesn't zero the streak before the day is
// over).
export async function getStreak(userId: string): Promise<number> {
  const { rows } = await pool.query<{ date: string }>(
    `SELECT date::text FROM study_day_log WHERE user_id = $1 AND tasks_done > 0 ORDER BY date DESC LIMIT 400`,
    [userId]
  );
  const days = new Set(rows.map((r) => r.date));
  const now = new Date();
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!days.has(toIso(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(toIso(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function getTasksForDate(userId: string, date: string): Promise<PlannerTask[]> {
  const { rows } = await pool.query(`${TASK_SELECT} WHERE t.user_id = $1 AND t.scheduled_for = $2 ORDER BY t.position, t.created_at`, [userId, date]);
  return rows.map(mapTaskRow);
}

export async function getTasksInRange(userId: string, from: string, to: string): Promise<PlannerTask[]> {
  const { rows } = await pool.query(`${TASK_SELECT} WHERE t.user_id = $1 AND t.scheduled_for BETWEEN $2 AND $3 ORDER BY t.scheduled_for, t.position`, [
    userId,
    from,
    to,
  ]);
  return rows.map(mapTaskRow);
}

// "Coming up" — the next N days, excluding today (that's the Today
// panel's own job), pending only.
export async function getUpcomingTasks(userId: string, fromExclusiveIso: string, days: number, limit: number): Promise<PlannerTask[]> {
  const { rows } = await pool.query(
    `${TASK_SELECT} WHERE t.user_id = $1 AND t.state = 'pending' AND t.scheduled_for > $2 AND t.scheduled_for <= $2::date + $3::int
     ORDER BY t.scheduled_for, t.position LIMIT $4`,
    [userId, fromExclusiveIso, days, limit]
  );
  return rows.map(mapTaskRow);
}

export interface WeekDaySummary {
  date: string;
  isRestDay: boolean;
  doneCount: number;
  missedCount: number;
  plannedCount: number;
}

// The week strip — one row per day in [from, to], classifying that
// day's tasks (a day with any 'done' still counts as done even if it
// also has a missed one, matching the mockup's own Tuesday: "1
// missed" shown even though Monday/Wednesday/Thursday all read
// "N done" — the label picks the most informative single state per
// day, not a full breakdown). A day is a "rest day" only when it
// falls outside every active plan's study_days AND has no tasks of
// its own — an explicit state, never a blank cell (spec rule 5).
export async function getWeekSummary(userId: string, from: string, to: string, studyDayNumbers: Set<number>): Promise<WeekDaySummary[]> {
  const tasks = await getTasksInRange(userId, from, to);
  const byDate = new Map<string, PlannerTask[]>();
  for (const t of tasks) {
    const list = byDate.get(t.scheduledFor) ?? [];
    list.push(t);
    byDate.set(t.scheduledFor, list);
  }
  const days: WeekDaySummary[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    const dayTasks = byDate.get(iso) ?? [];
    const doneCount = dayTasks.filter((t) => t.state === "done").length;
    const missedCount = dayTasks.filter((t) => t.state === "pending" && t.originalDate !== null && t.originalDate !== iso).length;
    const plannedCount = dayTasks.filter((t) => t.state === "pending" && (t.originalDate === null || t.originalDate === iso)).length;
    // ISO day-of-week: 1=Mon..7=Sun, matching study_plan.study_days.
    const isoDow = ((cursor.getUTCDay() + 6) % 7) + 1;
    days.push({
      date: iso,
      isRestDay: dayTasks.length === 0 && !studyDayNumbers.has(isoDow),
      doneCount,
      missedCount,
      plannedCount,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

// Every active plan's study_days, merged — used only to decide which
// blank days in the week strip read "rest day" vs a plain empty
// planned day (a day no plan studies on, vs. a day that simply has
// nothing scheduled yet).
export async function getActiveStudyDayNumbers(userId: string): Promise<Set<number>> {
  const { rows } = await pool.query<{ study_days: number[] }>(`SELECT study_days FROM study_plan WHERE user_id = $1 AND status = 'active'`, [userId]);
  const set = new Set<number>();
  for (const r of rows) for (const d of r.study_days) set.add(d);
  return set;
}

function mapPlanRow(r: {
  id: string;
  name: string;
  kind: PlanKind;
  colour_key: QbankFolderColor;
  target_date: string | null;
  status: PlanStatus;
  study_days: number[];
  session_minutes: number;
  max_tasks_per_day: number;
  tasks_done: string;
  tasks_total: string;
}): StudyPlan {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    colourKey: r.colour_key,
    targetDate: r.target_date,
    status: r.status,
    studyDays: r.study_days,
    sessionMinutes: r.session_minutes,
    maxTasksPerDay: r.max_tasks_per_day,
    tasksDone: Number(r.tasks_done),
    tasksTotal: Number(r.tasks_total),
  };
}

export async function getPlans(userId: string, status: PlanStatus | "all" = "active"): Promise<StudyPlan[]> {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.kind, p.colour_key, p.target_date::text AS target_date, p.status,
       p.study_days, p.session_minutes, p.max_tasks_per_day,
       COUNT(t.id) FILTER (WHERE t.state = 'done')::int AS tasks_done,
       COUNT(t.id)::int AS tasks_total
     FROM study_plan p
     LEFT JOIN study_plan_task t ON t.plan_id = p.id
     WHERE p.user_id = $1 ${status === "all" ? "" : "AND p.status = $2"}
     GROUP BY p.id
     ORDER BY p.position, p.created_at`,
    status === "all" ? [userId] : [userId, status]
  );
  return rows.map(mapPlanRow);
}

export async function getPlanById(userId: string, planId: string): Promise<StudyPlan | null> {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.kind, p.colour_key, p.target_date::text AS target_date, p.status,
       p.study_days, p.session_minutes, p.max_tasks_per_day,
       COUNT(t.id) FILTER (WHERE t.state = 'done')::int AS tasks_done,
       COUNT(t.id)::int AS tasks_total
     FROM study_plan p
     LEFT JOIN study_plan_task t ON t.plan_id = p.id
     WHERE p.user_id = $1 AND p.id = $2
     GROUP BY p.id`,
    [userId, planId]
  );
  return rows[0] ? mapPlanRow(rows[0]) : null;
}

export interface CreatePlanInput {
  name: string;
  kind: PlanKind;
  colourKey: QbankFolderColor;
  targetDate: string | null;
  studyDays: number[];
  sessionMinutes: number;
  maxTasksPerDay: number;
}

export async function createPlan(userId: string, input: CreatePlanInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO study_plan (user_id, name, kind, colour_key, target_date, study_days, session_minutes, max_tasks_per_day)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [userId, input.name, input.kind, input.colourKey, input.targetDate, input.studyDays, input.sessionMinutes, input.maxTasksPerDay]
  );
  return rows[0].id;
}

export async function setPlanStatus(userId: string, planId: string, status: PlanStatus): Promise<void> {
  await pool.query(`UPDATE study_plan SET status = $3, updated_at = now() WHERE id = $1 AND user_id = $2`, [planId, userId, status]);
}

export interface CreateTaskInput {
  planId: string | null;
  type: TaskType;
  targetRef: string | null;
  title: string;
  estimateMinutes: number;
  scheduledFor: string;
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO study_plan_task (user_id, plan_id, type, target_ref, title, estimate_minutes, scheduled_for)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [userId, input.planId, input.type, input.targetRef, input.title, input.estimateMinutes, input.scheduledFor]
  );
  return rows[0].id;
}

export async function rescheduleTask(userId: string, taskId: string, newDate: string): Promise<void> {
  await pool.query(`UPDATE study_plan_task SET scheduled_for = $3, original_date = NULL WHERE id = $1 AND user_id = $2 AND state = 'pending'`, [
    taskId,
    userId,
    newDate,
  ]);
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  await pool.query(`DELETE FROM study_plan_task WHERE id = $1 AND user_id = $2`, [taskId, userId]);
}

// Toggling keeps study_day_log in sync in the same transaction — the
// header's "hours studied this week" and the streak both read that
// table, not a live re-aggregation of study_plan_task, so this is the
// one place that bookkeeping has to happen. Un-completing (the
// checkbox is a toggle, matching the mockup's own checked box) removes
// its own contribution rather than just floor-clamping at zero, so
// toggling the same task on and off within a day is exactly reversible.
export async function toggleTaskState(userId: string, taskId: string): Promise<TaskState | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ state: TaskState; estimate_minutes: number; completed_at: string | null }>(
      `SELECT state, estimate_minutes, completed_at::text AS completed_at FROM study_plan_task WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [taskId, userId]
    );
    const task = rows[0];
    if (!task) {
      await client.query("ROLLBACK");
      return null;
    }
    const nextState: TaskState = task.state === "done" ? "pending" : "done";
    const completedAtDate = nextState === "done" ? new Date() : null;
    await client.query(`UPDATE study_plan_task SET state = $3, completed_at = $4 WHERE id = $1 AND user_id = $2`, [
      taskId,
      userId,
      nextState,
      completedAtDate,
    ]);
    const logDate = (completedAtDate ?? (task.completed_at ? new Date(task.completed_at) : new Date())).toISOString().slice(0, 10);
    const delta = nextState === "done" ? 1 : -1;
    await client.query(
      `INSERT INTO study_day_log (user_id, date, minutes_studied, tasks_done)
       VALUES ($1, $2, GREATEST(0, $3::int * $4::int), GREATEST(0, $3::int))
       ON CONFLICT (user_id, date) DO UPDATE
       SET minutes_studied = GREATEST(0, study_day_log.minutes_studied + $3::int * $4::int),
           tasks_done = GREATEST(0, study_day_log.tasks_done + $3::int)`,
      [userId, logDate, delta, task.estimate_minutes]
    );
    await client.query("COMMIT");
    return nextState;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface TaskTargetOption {
  id: string;
  title: string;
  estimateMinutes: number;
  meta: string;
}

// The "New task" drawer's target picker — one search per type, each
// returning a real, computed estimate (PLANNER-SPEC.md: "Estimate:
// minutes, from the target"), not a placeholder. Reuses the exact
// same per-unit conventions already shipped elsewhere in the app
// (reading-time.ts's 200 wpm; 6 s/card from flashcards.ts's own
// estimatedMinutes; 45 s/question from SECONDS_PER_QUESTION) rather
// than inventing new ones.
export async function searchTaskTargets(type: Exclude<TaskType, "custom">, query: string): Promise<TaskTargetOption[]> {
  const q = `%${query.trim()}%`;

  if (type === "read") {
    const { rows } = await pool.query<{ id: string; canonical_name: string }>(
      `SELECT id, canonical_name FROM disease WHERE status = 'published' AND canonical_name ILIKE $1 ORDER BY canonical_name LIMIT 20`,
      [q]
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const { rows: blockRows } = await pool.query<{ disease_id: string; content_config: Record<string, unknown> }>(
      `SELECT disease_id, content_config FROM editorial_block WHERE disease_id = ANY($1)`,
      [ids]
    );
    const byDisease = new Map<string, unknown[]>();
    for (const r of blockRows) {
      const list = byDisease.get(r.disease_id) ?? [];
      list.push(r.content_config);
      byDisease.set(r.disease_id, list);
    }
    return rows.map((r) => {
      const minutes = estimateReadingMinutesFromValues(byDisease.get(r.id) ?? []);
      return { id: r.id, title: r.canonical_name, estimateMinutes: minutes, meta: `${minutes} min read` };
    });
  }

  if (type === "flashcards") {
    const { rows } = await pool.query<{ id: string; name: string; card_count: string }>(
      `SELECT d.id, d.name, COUNT(f.id)::int AS card_count
       FROM flashcard_deck d LEFT JOIN flashcard f ON f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL
       WHERE d.status = 'published' AND d.archived_at IS NULL AND d.name ILIKE $1
       GROUP BY d.id ORDER BY d.name LIMIT 20`,
      [q]
    );
    return rows.map((r) => {
      const count = Number(r.card_count);
      const minutes = Math.max(1, Math.round((count * 6) / 60));
      return { id: r.id, title: r.name, estimateMinutes: minutes, meta: `${count} cards` };
    });
  }

  if (type === "questions") {
    const { rows } = await pool.query<{ id: string; name: string; question_count: string }>(
      `SELECT s.id, s.name, COUNT(q.id)::int AS question_count
       FROM question_set s LEFT JOIN question q ON q.set_id = s.id
       WHERE s.name ILIKE $1
       GROUP BY s.id ORDER BY s.name LIMIT 20`,
      [q]
    );
    return rows.map((r) => {
      const count = Number(r.question_count);
      const minutes = Math.max(1, Math.round((count * 45) / 60));
      return { id: r.id, title: r.name, estimateMinutes: minutes, meta: `${count} questions` };
    });
  }

  // course
  const { rows } = await pool.query<{ id: string; title: string; lesson_count: string; total_seconds: string | null }>(
    `SELECT c.id, c.title, COUNT(l.id)::int AS lesson_count, COALESCE(SUM(l.video_duration_seconds), 0)::int AS total_seconds
     FROM course c LEFT JOIN course_module m ON m.course_id = c.id LEFT JOIN course_lesson l ON l.module_id = m.id
     WHERE c.status = 'published' AND c.title ILIKE $1
     GROUP BY c.id ORDER BY c.title LIMIT 20`,
    [q]
  );
  return rows.map((r) => {
    const lessonCount = Number(r.lesson_count);
    const seconds = Number(r.total_seconds);
    const minutes = seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : lessonCount * 10;
    return { id: r.id, title: r.title, estimateMinutes: minutes, meta: `${lessonCount} ${lessonCount === 1 ? "lesson" : "lessons"}` };
  });
}

export interface StartableTask extends PlannerTask {
  // null for a custom task (no target) or a target that's since been
  // deleted — "every task starts something" (spec rule 2) except the
  // one type explicitly exempted.
  startHref: string | null;
}

// Batched, not per-task — a task list can hold dozens of rows, and
// 'flashcards'/'questions' need no lookup at all (their target_ref is
// already the id the route takes), so only 'read'/'course' tasks ever
// touch the DB here, one IN-query each regardless of how many of that
// type appear.
export async function attachStartHrefs(tasks: PlannerTask[]): Promise<StartableTask[]> {
  const readIds = [...new Set(tasks.filter((t) => t.type === "read" && t.targetRef).map((t) => t.targetRef!))];
  const courseIds = [...new Set(tasks.filter((t) => t.type === "course" && t.targetRef).map((t) => t.targetRef!))];

  const [diseaseRows, courseRows] = await Promise.all([
    readIds.length ? pool.query<{ id: string; slug: string }>(`SELECT id, slug FROM disease WHERE id = ANY($1::uuid[])`, [readIds]) : Promise.resolve({ rows: [] }),
    courseIds.length ? pool.query<{ id: string; slug: string }>(`SELECT id, slug FROM course WHERE id = ANY($1::uuid[])`, [courseIds]) : Promise.resolve({ rows: [] }),
  ]);
  const diseaseSlugs = new Map(diseaseRows.rows.map((r) => [r.id, r.slug]));
  const courseSlugs = new Map(courseRows.rows.map((r) => [r.id, r.slug]));

  return tasks.map((t) => {
    let startHref: string | null = null;
    if (t.targetRef) {
      if (t.type === "read") {
        const slug = diseaseSlugs.get(t.targetRef);
        startHref = slug ? `/conditions/${slug}` : null;
      } else if (t.type === "flashcards") {
        startHref = `/flashcards/study?deck=${t.targetRef}`;
      } else if (t.type === "questions") {
        startHref = `/question-bank/set/${t.targetRef}`;
      } else if (t.type === "course") {
        const slug = courseSlugs.get(t.targetRef);
        startHref = slug ? `/courses/${slug}` : null;
      }
    }
    return { ...t, startHref };
  });
}

export async function getHoursThisWeek(userId: string, from: string, to: string): Promise<number> {
  const { rows } = await pool.query<{ minutes: string }>(`SELECT COALESCE(SUM(minutes_studied), 0)::int AS minutes FROM study_day_log WHERE user_id = $1 AND date BETWEEN $2 AND $3`, [
    userId,
    from,
    to,
  ]);
  return Math.round(((Number(rows[0]?.minutes ?? 0) / 60) * 10)) / 10;
}

export interface WeekProgress {
  done: number;
  total: number;
}

export async function getWeekProgress(userId: string, from: string, to: string): Promise<WeekProgress> {
  const { rows } = await pool.query<{ done: string; total: string }>(
    `SELECT COUNT(*) FILTER (WHERE state = 'done')::int AS done, COUNT(*)::int AS total
     FROM study_plan_task WHERE user_id = $1 AND scheduled_for BETWEEN $2 AND $3`,
    [userId, from, to]
  );
  return { done: Number(rows[0]?.done ?? 0), total: Number(rows[0]?.total ?? 0) };
}
