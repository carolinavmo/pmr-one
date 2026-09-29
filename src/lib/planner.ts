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

// "A plan is an ordered list of library content plus how it runs"
// (PLANNER-SPEC.md, "Share, flexible plans, and completion"). `mode`
// replaces the old single always-scheduled assumption:
//   scheduled — tasks land on specific days; a missed one goes overdue
//   flexible  — no dates at all, an ordered queue you pull from
//   target    — a weekly amount, no day assigned either
// `orderMode` replaces weighted topics — see generateTasksForPlanV2's
// own comment for how each option is interpreted.
export type PlanMode = "scheduled" | "flexible" | "target";
export type OrderMode = "interleave" | "one_topic" | "as_listed";

export interface StudyPlan {
  id: string;
  name: string;
  kind: PlanKind;
  colourKey: QbankFolderColor;
  targetDate: string | null;
  status: PlanStatus;
  mode: PlanMode;
  orderMode: OrderMode;
  studyDays: number[];
  sessionMinutes: number;
  maxTasksPerDay: number;
  weeklyTarget: number | null;
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
  // Null means the task lives in a flexible/target plan's queue
  // instead of on a calendar day — see PlanMode's own comment.
  scheduledFor: string | null;
  queuePosition: number | null;
  originalDate: string | null;
  state: TaskState;
  completedAt: string | null;
  // Which legacy topic (weighted model) or ordered-content item this
  // task was generated from/scoped to — a task belongs to at most one
  // of the two, matching a plan's own topics vs. items exclusivity.
  // Surfaced so a topic/folder's own coverage row can list exactly its
  // tasks rather than the plan's flat list.
  topicId: string | null;
  planItemId: string | null;
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
  scheduled_for: string | null;
  queue_position: number | null;
  original_date: string | null;
  state: TaskState;
  completed_at: string | Date | null;
  topic_id: string | null;
  plan_item_id: string | null;
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
    queuePosition: r.queue_position,
    originalDate: r.original_date,
    state: r.state,
    completedAt: r.completed_at instanceof Date ? r.completed_at.toISOString() : r.completed_at,
    topicId: r.topic_id,
    planItemId: r.plan_item_id,
  };
}

const TASK_SELECT = `
  SELECT t.id, t.plan_id, p.name AS plan_name, p.colour_key AS plan_colour_key,
    t.type, t.target_ref, t.title, t.estimate_minutes, t.scheduled_for::text AS scheduled_for,
    t.queue_position, t.original_date::text AS original_date, t.state, t.completed_at,
    t.topic_id, t.plan_item_id
  FROM study_plan_task t
  LEFT JOIN study_plan p ON p.id = t.plan_id
`;

// The queue for a flexible/target-mode plan — unscheduled pending
// tasks in generated order, surfaced on Today as "Up next"
// (PLANNER-SPEC.md). Scheduled-mode tasks never have a queue_position,
// so this naturally only ever returns flexible/target content.
export async function getQueueTasks(userId: string, limit: number): Promise<PlannerTask[]> {
  const { rows } = await pool.query(
    `${TASK_SELECT} WHERE t.user_id = $1 AND t.state = 'pending' AND t.scheduled_for IS NULL
     ORDER BY t.queue_position LIMIT $2`,
    [userId, limit]
  );
  return rows.map(mapTaskRow);
}

// Every task belonging to one plan, any state, any mode — the plan
// page's own read (Schedule/Up next filters to pending itself; the
// per-topic/per-item task lists on Overview/Topics want the done ones
// too, "see everything" rather than only what's left). Scoped directly
// by plan_id rather than assembled from getTasksInRange + getQueueTasks,
// since those two are date-range/queue-shaped for other callers and
// would otherwise need re-filtering back down to "this one plan."
export async function getTasksForPlan(userId: string, planId: string, limit = 300): Promise<PlannerTask[]> {
  const { rows } = await pool.query(
    `${TASK_SELECT} WHERE t.user_id = $1 AND t.plan_id = $2 ORDER BY t.position, t.created_at LIMIT $3`,
    [userId, planId, limit]
  );
  return rows.map(mapTaskRow);
}

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
    // getTasksInRange's own query is `scheduled_for BETWEEN`, which is
    // never true for a NULL (queue) task — every row here is
    // guaranteed to carry a real date.
    const scheduledFor = t.scheduledFor!;
    const list = byDate.get(scheduledFor) ?? [];
    list.push(t);
    byDate.set(scheduledFor, list);
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
  mode: PlanMode;
  order_mode: OrderMode;
  study_days: number[];
  session_minutes: number;
  max_tasks_per_day: number;
  weekly_target: number | null;
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
    mode: r.mode,
    orderMode: r.order_mode,
    studyDays: r.study_days,
    sessionMinutes: r.session_minutes,
    maxTasksPerDay: r.max_tasks_per_day,
    weeklyTarget: r.weekly_target,
    tasksDone: Number(r.tasks_done),
    tasksTotal: Number(r.tasks_total),
  };
}

const PLAN_SELECT = `
  SELECT p.id, p.name, p.kind, p.colour_key, p.target_date::text AS target_date, p.status,
    p.mode, p.order_mode, p.study_days, p.session_minutes, p.max_tasks_per_day, p.weekly_target,
    COUNT(t.id) FILTER (WHERE t.state = 'done')::int AS tasks_done,
    COUNT(t.id)::int AS tasks_total
  FROM study_plan p
  LEFT JOIN study_plan_task t ON t.plan_id = p.id
`;

export async function getPlans(userId: string, status: PlanStatus | "all" = "active"): Promise<StudyPlan[]> {
  const { rows } = await pool.query(
    `${PLAN_SELECT}
     WHERE p.user_id = $1 ${status === "all" ? "" : "AND p.status = $2"}
     GROUP BY p.id
     ORDER BY p.position, p.created_at`,
    status === "all" ? [userId] : [userId, status]
  );
  return rows.map(mapPlanRow);
}

export async function getPlanById(userId: string, planId: string): Promise<StudyPlan | null> {
  const { rows } = await pool.query(
    `${PLAN_SELECT}
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
  mode: PlanMode;
  orderMode: OrderMode;
  studyDays: number[];
  sessionMinutes: number;
  maxTasksPerDay: number;
  weeklyTarget: number | null;
  // PlanTopicInput/PlanItemInput are declared further down (the
  // generator section) — fine for a type reference, TS interfaces
  // aren't subject to declaration-order the way a const binding is.
  // `topics` is the legacy weighted-subject shape (still accepted so
  // existing callers/plans keep working); `items` is the new ordered
  // library-content list. A plan is created with one or the other —
  // generateTasksForPlan's own dispatcher picks the generator to run
  // based on which one actually has rows.
  topics?: PlanTopicInput[];
  items?: PlanItemInput[];
}

// Creating a plan with topics/items runs the generator immediately —
// "a plan generates tasks" isn't a separate step the caller has to
// remember (PLANNER-IMPLEMENTATION.md: "This is the feature"). A plan
// with no target date (a weekly routine) or no content still gets
// created; it just has nothing to schedule yet.
export async function createPlan(userId: string, input: CreatePlanInput): Promise<{ id: string; generated: GenerateResult }> {
  const { rows } = await pool.query(
    `INSERT INTO study_plan (user_id, name, kind, colour_key, target_date, mode, order_mode, study_days, session_minutes, max_tasks_per_day, weekly_target)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [
      userId,
      input.name,
      input.kind,
      input.colourKey,
      input.targetDate,
      input.mode,
      input.orderMode,
      input.studyDays,
      input.sessionMinutes,
      input.maxTasksPerDay,
      input.weeklyTarget,
    ]
  );
  const id = rows[0].id;
  if (input.items && input.items.length > 0) {
    await setPlanItems(id, input.items);
  } else if (input.topics && input.topics.length > 0) {
    await setPlanTopics(id, input.topics);
  }
  const generated = await generateTasksForPlan(userId, id);
  return { id, generated };
}

export interface UpdatePlanInput {
  name: string;
  kind: PlanKind;
  colourKey: QbankFolderColor;
  targetDate: string | null;
  mode: PlanMode;
  orderMode: OrderMode;
  studyDays: number[];
  sessionMinutes: number;
  maxTasksPerDay: number;
  weeklyTarget: number | null;
  topics: PlanTopicInput[];
  items?: PlanItemInput[];
}

// "Any plan can be reshaped" (PLANNER-SPEC.md rule 4) — the edit path
// setPlanTopics's own comment said Pass 2 didn't build yet. Deliberately
// does NOT touch study_plan_task: editing study days, the target date
// or content can leave the existing schedule out of step with the new
// settings, but that's what Regenerate/Adjust the pace are for — two
// explicit, separately-understood actions already on this page, not
// something an edit should silently trigger (a name/colour-only edit
// has no business deleting and re-picking every pending task).
export async function updatePlan(userId: string, planId: string, input: UpdatePlanInput): Promise<void> {
  await pool.query(
    `UPDATE study_plan
     SET name = $3, kind = $4, colour_key = $5, target_date = $6, mode = $7, order_mode = $8,
         study_days = $9, session_minutes = $10, max_tasks_per_day = $11, weekly_target = $12, updated_at = now()
     WHERE id = $1 AND user_id = $2`,
    [
      planId,
      userId,
      input.name,
      input.kind,
      input.colourKey,
      input.targetDate,
      input.mode,
      input.orderMode,
      input.studyDays,
      input.sessionMinutes,
      input.maxTasksPerDay,
      input.weeklyTarget,
    ]
  );
  if (input.items) {
    await updatePlanItems(planId, input.items);
  } else {
    await updatePlanTopics(planId, input.topics);
  }
}

export interface UpdatePlanScheduleInput {
  studyDays: number[];
  sessionMinutes: number;
  maxTasksPerDay: number;
}

// A lighter-weight sibling of updatePlan — the Schedule tab's own
// inline "edit study days / session length" (direct feedback), which
// only ever touches these three columns rather than requiring the
// full plan-editing payload (name, colour, content, …) updatePlan
// needs. Same "settings changing never rewrites tasks" rule as
// updatePlan itself — Regenerate/Adjust the pace existed for that
// before this session removed both; a study-days/session-length edit
// alone still shouldn't silently re-lay the schedule.
export async function updatePlanSchedule(userId: string, planId: string, input: UpdatePlanScheduleInput): Promise<void> {
  await pool.query(
    `UPDATE study_plan SET study_days = $3, session_minutes = $4, max_tasks_per_day = $5, updated_at = now()
     WHERE id = $1 AND user_id = $2`,
    [planId, userId, input.studyDays, input.sessionMinutes, input.maxTasksPerDay]
  );
}

export interface CreateTaskInput {
  planId: string | null;
  type: TaskType;
  targetRef: string | null;
  title: string;
  estimateMinutes: number;
  scheduledFor: string;
  // Set when "add task" was opened from inside a specific topic/folder
  // row (Overview/Topics tab) rather than the plan generally — a task
  // created that way is attributed to that row from the start, same
  // coverage-by-topic attribution the generator itself gives a task.
  // At most one is ever set, matching a plan's own topics/items
  // exclusivity.
  topicId?: string | null;
  planItemId?: string | null;
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO study_plan_task (user_id, plan_id, type, target_ref, title, estimate_minutes, scheduled_for, topic_id, plan_item_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      userId,
      input.planId,
      input.type,
      input.targetRef,
      input.title,
      input.estimateMinutes,
      input.scheduledFor,
      input.topicId ?? null,
      input.planItemId ?? null,
    ]
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

export interface UpdateTaskInput {
  title: string;
  estimateMinutes: number;
  scheduledFor: string;
  planId: string | null;
}

// The general edit path (NewTaskDrawer's edit mode) — title/estimate
// only ever change for a 'custom' task in practice (the drawer keeps
// them read-only for every other type, since they're derived from
// real content there), but this takes whatever it's given rather than
// branching on type itself, same "the caller decides, this just
// writes" shape as createTask. scheduled_for/original_date follow
// rescheduleTask's own semantics — an edited task is no longer
// "missed", it's freshly placed. Pending only, matching
// rescheduleTask: a done task's date isn't something you'd edit.
export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput): Promise<void> {
  // topic_id only clears when the plan itself actually changes —
  // reassigning to a different plan (or to one-off) leaves the old
  // topic's coverage math pointing at a task that isn't really that
  // plan's anymore, but a same-plan edit (date, title) is still the
  // same generated task and should keep its coverage attribution.
  // The CASE reads plan_id's pre-update value, same row SET compares
  // against.
  await pool.query(
    `UPDATE study_plan_task
     SET title = $3, estimate_minutes = $4, scheduled_for = $5, original_date = NULL, plan_id = $6,
         topic_id = CASE WHEN plan_id IS DISTINCT FROM $6 THEN NULL ELSE topic_id END
     WHERE id = $1 AND user_id = $2 AND state = 'pending'`,
    [taskId, userId, input.title, input.estimateMinutes, input.scheduledFor, input.planId]
  );
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

// ============================================================
// The generator (PLANNER-IMPLEMENTATION.md Pass 2) — "Given a plan,
// produce tasks." topic_ref is a flashcard_subject.id: the one
// taxonomy this app already shares between Flashcards and Question
// Bank (QBANK-SPEC.md's subject list was deliberately the same
// taxonomy as Flashcards', not a second one), so a single topic
// resolves real content across all three task types without
// inventing a fourth classification system:
//   read       — a disease page that's the *source* of a deck filed
//                under this subject (flashcard_deck.source_disease_id)
//   flashcards — a published deck filed under this subject
//   questions  — a question set filed under a folder with this subject
// ============================================================

export interface PlanTopicInput {
  topicRef: string;
  label: string;
  weight: number;
}

export interface PlanTopic extends PlanTopicInput {
  id: string;
}

export async function getPlanTopics(planId: string): Promise<PlanTopic[]> {
  const { rows } = await pool.query<{ id: string; topic_ref: string; label: string; weight: number }>(
    `SELECT id, topic_ref, label, weight FROM study_plan_topic WHERE plan_id = $1 ORDER BY position`,
    [planId]
  );
  return rows.map((r) => ({ id: r.id, topicRef: r.topic_ref, label: r.label, weight: r.weight }));
}

// Replace-all — only ever called once, right after creation (a brand
// new plan has no study_plan_task rows pointing at any topic yet, so
// there's nothing a delete-and-reinsert could orphan). Editing an
// existing plan's topics goes through updatePlanTopics below instead,
// which preserves a topic's id — and therefore every already-generated
// task's topic_id — for any topicRef that survives the edit.
export async function setPlanTopics(planId: string, topics: PlanTopicInput[]): Promise<void> {
  await pool.query(`DELETE FROM study_plan_topic WHERE plan_id = $1`, [planId]);
  for (let i = 0; i < topics.length; i++) {
    await pool.query(`INSERT INTO study_plan_topic (plan_id, topic_ref, label, weight, position) VALUES ($1, $2, $3, $4, $5)`, [
      planId,
      topics[i].topicRef,
      topics[i].label,
      topics[i].weight,
      i,
    ]);
  }
}

// The edit path: keeps each surviving topic's row (and id) in place —
// only its label/weight/position change — rather than the blunt
// delete-and-reinsert setPlanTopics does for a brand-new plan. A topic
// removed from the picker really is deleted (its tasks' topic_id falls
// back to NULL via the column's ON DELETE SET NULL, same as any topic
// the generator itself excludes for having no content); a topic that's
// still checked keeps its id, so getPlanTopicCoverage's per-topic
// counts don't reset to zero just because the user opened Edit plan
// and re-saved with the same topics.
export async function updatePlanTopics(planId: string, topics: PlanTopicInput[]): Promise<void> {
  const existing = await getPlanTopics(planId);
  const existingByRef = new Map(existing.map((t) => [t.topicRef, t]));
  const incomingRefs = new Set(topics.map((t) => t.topicRef));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const toDelete = existing.filter((t) => !incomingRefs.has(t.topicRef)).map((t) => t.id);
    if (toDelete.length > 0) {
      await client.query(`DELETE FROM study_plan_topic WHERE id = ANY($1::uuid[])`, [toDelete]);
    }
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      const existingRow = existingByRef.get(topic.topicRef);
      if (existingRow) {
        await client.query(`UPDATE study_plan_topic SET label = $2, weight = $3, position = $4 WHERE id = $1`, [existingRow.id, topic.label, topic.weight, i]);
      } else {
        await client.query(`INSERT INTO study_plan_topic (plan_id, topic_ref, label, weight, position) VALUES ($1, $2, $3, $4, $5)`, [
          planId,
          topic.topicRef,
          topic.label,
          topic.weight,
          i,
        ]);
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

interface GeneratorContentOption {
  id: string;
  title: string;
  minutes: number;
}

async function pickReadTargets(subjectId: string): Promise<GeneratorContentOption[]> {
  const { rows } = await pool.query<{ id: string; canonical_name: string }>(
    `SELECT DISTINCT dis.id, dis.canonical_name
     FROM disease dis
     JOIN flashcard_deck d ON d.source_disease_id = dis.id
     JOIN flashcard_category c ON c.id = d.category_id
     WHERE c.subject_id = $1 AND dis.status = 'published'
     ORDER BY dis.canonical_name`,
    [subjectId]
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
  return rows.map((r) => ({ id: r.id, title: r.canonical_name, minutes: estimateReadingMinutesFromValues(byDisease.get(r.id) ?? []) }));
}

async function pickFlashcardTargets(subjectId: string): Promise<GeneratorContentOption[]> {
  const { rows } = await pool.query<{ id: string; name: string; card_count: string }>(
    `SELECT d.id, d.name, COUNT(f.id)::int AS card_count
     FROM flashcard_deck d
     JOIN flashcard_category c ON c.id = d.category_id
     LEFT JOIN flashcard f ON f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL
     WHERE c.subject_id = $1 AND d.status = 'published' AND d.archived_at IS NULL
     GROUP BY d.id
     HAVING COUNT(f.id) > 0
     ORDER BY d.position, d.name`,
    [subjectId]
  );
  return rows.map((r) => ({ id: r.id, title: r.name, minutes: Math.max(1, Math.round((Number(r.card_count) * 6) / 60)) }));
}

async function pickQuestionTargets(subjectId: string): Promise<GeneratorContentOption[]> {
  const { rows } = await pool.query<{ id: string; name: string; question_count: string }>(
    `SELECT s.id, s.name, COUNT(q.id)::int AS question_count
     FROM question_set s
     JOIN question_category c ON c.id = s.category_id
     LEFT JOIN question q ON q.set_id = s.id
     WHERE c.subject_id = $1
     GROUP BY s.id
     HAVING COUNT(q.id) > 0
     ORDER BY s.position, s.name`,
    [subjectId]
  );
  return rows.map((r) => ({ id: r.id, title: r.name, minutes: Math.max(1, Math.round((Number(r.question_count) * 45) / 60)) }));
}

interface GeneratedTaskSeed {
  type: TaskType;
  targetRef: string;
  title: string;
  estimateMinutes: number;
  topicId: string;
}

// Largest-remainder apportionment — weights are relative, not
// percentages (PLANNER-IMPLEMENTATION.md), and this is what keeps
// per-topic slot counts summing to exactly totalSlots regardless of
// rounding, rather than drifting a few slots short/over.
function apportion(weights: number[], total: number): number[] {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (w / totalWeight) * total);
  const base = raw.map(Math.floor);
  const remainder = total - base.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, frac: v - base[i] })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder && k < order.length; k++) base[order[k].i]++;
  return base;
}

export interface GenerateResult {
  created: number;
  reason?: "no-target-date" | "no-topics" | "no-content";
}

// Idempotent for completed tasks: only ever deletes this plan's
// *pending* rows before laying out a fresh schedule — a 'done' task,
// wherever it sits, is never touched (PLANNER-SPEC.md rule: "Nothing
// is silently deleted").
//
// Legacy weighted-subject path (pre-migration-0074). A plan created
// before Study Planner v2's ordered-content model has no
// study_plan_item rows, so generateTasksForPlan's dispatcher falls
// back to this unchanged rather than forcing every old plan through a
// one-time content migration — additive, same as the migration itself.
async function generateTasksForPlanLegacy(userId: string, planId: string): Promise<GenerateResult> {
  const plan = await getPlanById(userId, planId);
  if (!plan || !plan.targetDate) return { created: 0, reason: "no-target-date" };
  const topics = await getPlanTopics(planId);
  if (topics.length === 0) return { created: 0, reason: "no-topics" };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(`${plan.targetDate}T00:00:00Z`);
  const daysRemaining = Math.max(1, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
  const weeks = Math.max(1, Math.ceil(daysRemaining / 7));
  const slotsPerWeek = plan.studyDays.length * plan.maxTasksPerDay;
  const totalSlots = weeks * slotsPerWeek;

  // Resolve content pools before apportioning: a topic with zero
  // available content (no read/flashcard/question targets under its
  // subject) must not eat a share of totalSlots that it can never
  // fill — its weight is excluded so the slots go to topics that can
  // actually use them, rather than silently vanishing.
  const topicPools = await Promise.all(
    topics.map(async (t) => {
      const [readOpts, cardOpts, qOpts] = await Promise.all([pickReadTargets(t.topicRef), pickFlashcardTargets(t.topicRef), pickQuestionTargets(t.topicRef)]);
      return { topic: t, readOpts, cardOpts, qOpts };
    })
  );
  const withContent = topicPools.filter((p) => p.readOpts.length + p.cardOpts.length + p.qOpts.length > 0);
  if (withContent.length === 0) return { created: 0, reason: "no-content" };

  const perTopic = apportion(
    withContent.map((p) => p.topic.weight),
    totalSlots
  );

  const CYCLE = ["read", "flashcards", "questions"] as const;
  const topicQueues: GeneratedTaskSeed[][] = [];
  for (let i = 0; i < withContent.length; i++) {
    const wanted = perTopic[i];
    if (wanted <= 0) {
      topicQueues.push([]);
      continue;
    }
    const { readOpts, cardOpts, qOpts } = withContent[i];
    const pools: Record<"read" | "flashcards" | "questions", GeneratorContentOption[]> = { read: readOpts, flashcards: cardOpts, questions: qOpts };
    const cursors = { read: 0, flashcards: 0, questions: 0 };
    const queue: GeneratedTaskSeed[] = [];
    let cycleIdx = 0;
    let guard = 0;
    while (queue.length < wanted && guard < wanted * 6 + 12) {
      guard++;
      const type = CYCLE[cycleIdx % CYCLE.length];
      cycleIdx++;
      const opts = pools[type];
      if (opts.length === 0) continue;
      const item = opts[cursors[type] % opts.length];
      cursors[type]++;
      queue.push({ type, targetRef: item.id, title: item.title, estimateMinutes: item.minutes, topicId: withContent[i].topic.id });
    }
    topicQueues.push(queue);
  }

  // Round-robin interleave — "spacing beats blocking" (Pass 2's own
  // rule): topic A's second task should land days after its first,
  // not immediately after, so the reader cycles subjects rather than
  // finishing one before starting the next.
  const interleaved: GeneratedTaskSeed[] = [];
  for (let idx = 0; ; idx++) {
    let any = false;
    for (const q of topicQueues) {
      if (idx < q.length) {
        interleaved.push(q[idx]);
        any = true;
      }
    }
    if (!any) break;
  }
  if (interleaved.length === 0) return { created: 0, reason: "no-content" };

  // Lay onto study days only, walking forward from today, capped at
  // maxTasksPerDay of *this plan's own* tasks per day.
  const studyDaySet = new Set(plan.studyDays);
  const types: string[] = [];
  const targetRefs: string[] = [];
  const titles: string[] = [];
  const minutes: number[] = [];
  const dates: string[] = [];
  const positions: number[] = [];
  const topicIds: string[] = [];

  const cursor = new Date(today);
  let taskIdx = 0;
  let position = 0;
  let safety = 0;
  while (taskIdx < interleaved.length && safety < 3650) {
    safety++;
    const isoDow = ((cursor.getUTCDay() + 6) % 7) + 1;
    if (studyDaySet.has(isoDow)) {
      for (let slot = 0; slot < plan.maxTasksPerDay && taskIdx < interleaved.length; slot++) {
        const seed = interleaved[taskIdx++];
        types.push(seed.type);
        targetRefs.push(seed.targetRef);
        titles.push(seed.title);
        minutes.push(seed.estimateMinutes);
        dates.push(cursor.toISOString().slice(0, 10));
        positions.push(position++);
        topicIds.push(seed.topicId);
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM study_plan_task WHERE plan_id = $1 AND state = 'pending'`, [planId]);
    await client.query(
      `INSERT INTO study_plan_task (user_id, plan_id, type, target_ref, title, estimate_minutes, scheduled_for, position, topic_id)
       SELECT $1, $2, x.type, x.target_ref, x.title, x.estimate_minutes, x.scheduled_for, x.position, x.topic_id
       FROM unnest($3::text[], $4::text[], $5::text[], $6::int[], $7::date[], $8::int[], $9::uuid[])
         AS x(type, target_ref, title, estimate_minutes, scheduled_for, position, topic_id)`,
      [userId, planId, types, targetRefs, titles, minutes, dates, positions, topicIds]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { created: types.length };
}

// ============================================================
// Study Planner v2 content model (migration 0074) — "A plan is an
// ordered list of library content, not a set of weighted subjects."
// kind='folder' resolves through the knowledge-graph `topic` table
// (disease.topic_id), not flashcard_subject — the two are different
// granularities (4 broad subjects vs ~20 real topics), and a folder's
// own name in the mockups ("Spinal cord injury", "MSK — spine") reads
// as a topic-tree name. Question sets have no per-topic linkage in
// this schema, so a folder only ever expands to read + flashcards
// content; a question set is only ever added as its own plan_item.
// ============================================================

export type PlanItemKind = "folder" | "page" | "deck" | "question_set";

export interface PlanItemInput {
  kind: PlanItemKind;
  refId: string;
}

export interface PlanItem extends PlanItemInput {
  id: string;
}

export interface FolderOption {
  id: string;
  name: string;
  diseaseCount: number;
  deckCount: number;
}

// The Content picker's own option list — every topic that resolves to
// real content (pickReadTargetsForTopic's own join: a published
// disease directly filed under it), each with a disease/deck count so
// the picker can show what a folder actually contains before it's
// added, same spirit as the legacy topic picker's own preview. Flat,
// not the tree topics.ts builds for the Explore sidebar — a plan's
// content list doesn't nest, so there's nothing for hierarchy to buy
// here, and it keeps this independent of that file's separator/tree
// concerns.
export async function getFolderOptions(): Promise<FolderOption[]> {
  const { rows } = await pool.query<{ id: string; name: string; disease_count: string; deck_count: string }>(
    `SELECT t.id, t.name,
       COUNT(DISTINCT dis.id)::int AS disease_count,
       COUNT(DISTINCT fd.id)::int AS deck_count
     FROM topic t
     LEFT JOIN disease dis ON dis.topic_id = t.id AND dis.status = 'published'
     LEFT JOIN flashcard_deck fd ON fd.source_disease_id = dis.id AND fd.status = 'published'
     WHERE t.kind = 'topic'
     GROUP BY t.id, t.name
     HAVING COUNT(DISTINCT dis.id) > 0
     ORDER BY t.position, t.name`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, diseaseCount: Number(r.disease_count), deckCount: Number(r.deck_count) }));
}

export async function getPlanItems(planId: string): Promise<PlanItem[]> {
  const { rows } = await pool.query<{ id: string; kind: PlanItemKind; ref_id: string }>(
    `SELECT id, kind, ref_id FROM study_plan_item WHERE plan_id = $1 ORDER BY position`,
    [planId]
  );
  return rows.map((r) => ({ id: r.id, kind: r.kind, refId: r.ref_id }));
}

export interface PlanItemDetailed extends PlanItem {
  label: string;
}

// The Content section's own read — same batched-lookup shape as
// attachStartHrefs, one IN-query per kind rather than N+1, since a
// plan_item's ref_id points at a different table per kind and there's
// no single join that covers all four at once.
export async function getPlanItemsDetailed(planId: string): Promise<PlanItemDetailed[]> {
  const items = await getPlanItems(planId);
  if (items.length === 0) return [];

  const idsByKind: Record<PlanItemKind, string[]> = { folder: [], page: [], deck: [], question_set: [] };
  for (const item of items) idsByKind[item.kind].push(item.refId);

  const [topicRows, diseaseRows, deckRows, setRows] = await Promise.all([
    idsByKind.folder.length ? pool.query<{ id: string; name: string }>(`SELECT id, name FROM topic WHERE id = ANY($1::uuid[])`, [idsByKind.folder]) : Promise.resolve({ rows: [] }),
    idsByKind.page.length
      ? pool.query<{ id: string; canonical_name: string }>(`SELECT id, canonical_name FROM disease WHERE id = ANY($1::uuid[])`, [idsByKind.page])
      : Promise.resolve({ rows: [] }),
    idsByKind.deck.length ? pool.query<{ id: string; name: string }>(`SELECT id, name FROM flashcard_deck WHERE id = ANY($1::uuid[])`, [idsByKind.deck]) : Promise.resolve({ rows: [] }),
    idsByKind.question_set.length
      ? pool.query<{ id: string; name: string }>(`SELECT id, name FROM question_set WHERE id = ANY($1::uuid[])`, [idsByKind.question_set])
      : Promise.resolve({ rows: [] }),
  ]);
  const labelsByKind: Record<PlanItemKind, Map<string, string>> = {
    folder: new Map(topicRows.rows.map((r) => [r.id, r.name])),
    page: new Map(diseaseRows.rows.map((r) => [r.id, r.canonical_name])),
    deck: new Map(deckRows.rows.map((r) => [r.id, r.name])),
    question_set: new Map(setRows.rows.map((r) => [r.id, r.name])),
  };

  return items.map((item) => ({ ...item, label: labelsByKind[item.kind].get(item.refId) ?? item.refId }));
}

// Replace-all — mirrors setPlanTopics: only ever called right after
// creation, when there are no study_plan_task rows pointing at any
// item yet.
export async function setPlanItems(planId: string, items: PlanItemInput[]): Promise<void> {
  await pool.query(`DELETE FROM study_plan_item WHERE plan_id = $1`, [planId]);
  for (let i = 0; i < items.length; i++) {
    await pool.query(`INSERT INTO study_plan_item (plan_id, kind, ref_id, position) VALUES ($1, $2, $3, $4)`, [planId, items[i].kind, items[i].refId, i]);
  }
}

// The edit path — mirrors updatePlanTopics: keeps a surviving item's
// row (and id) in place, keyed by (kind, refId) since that pair is an
// item's real identity (its own id is only ever used to link back
// from study_plan_task.plan_item_id). A removed item's tasks fall
// back to plan_item_id = NULL via the column's ON DELETE SET NULL,
// same as a removed legacy topic falls back to topic_id = NULL.
export async function updatePlanItems(planId: string, items: PlanItemInput[]): Promise<void> {
  const existing = await getPlanItems(planId);
  const keyOf = (k: PlanItemKind, ref: string) => `${k}:${ref}`;
  const existingByKey = new Map(existing.map((it) => [keyOf(it.kind, it.refId), it]));
  const incomingKeys = new Set(items.map((it) => keyOf(it.kind, it.refId)));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const toDelete = existing.filter((it) => !incomingKeys.has(keyOf(it.kind, it.refId))).map((it) => it.id);
    if (toDelete.length > 0) {
      await client.query(`DELETE FROM study_plan_item WHERE id = ANY($1::uuid[])`, [toDelete]);
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const existingRow = existingByKey.get(keyOf(item.kind, item.refId));
      if (existingRow) {
        await client.query(`UPDATE study_plan_item SET position = $2 WHERE id = $1`, [existingRow.id, i]);
      } else {
        await client.query(`INSERT INTO study_plan_item (plan_id, kind, ref_id, position) VALUES ($1, $2, $3, $4)`, [planId, item.kind, item.refId, i]);
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function pickReadTargetsForTopic(topicId: string): Promise<GeneratorContentOption[]> {
  const { rows } = await pool.query<{ id: string; canonical_name: string }>(
    `SELECT id, canonical_name FROM disease WHERE topic_id = $1 AND status = 'published' ORDER BY position, canonical_name`,
    [topicId]
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
  return rows.map((r) => ({ id: r.id, title: r.canonical_name, minutes: estimateReadingMinutesFromValues(byDisease.get(r.id) ?? []) }));
}

async function pickFlashcardTargetsForTopic(topicId: string): Promise<GeneratorContentOption[]> {
  const { rows } = await pool.query<{ id: string; name: string; card_count: string }>(
    `SELECT d.id, d.name, COUNT(f.id)::int AS card_count
     FROM flashcard_deck d
     JOIN disease dis ON dis.id = d.source_disease_id
     LEFT JOIN flashcard f ON f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL
     WHERE dis.topic_id = $1 AND d.status = 'published' AND d.archived_at IS NULL
     GROUP BY d.id
     HAVING COUNT(f.id) > 0
     ORDER BY d.position, d.name`,
    [topicId]
  );
  return rows.map((r) => ({ id: r.id, title: r.name, minutes: Math.max(1, Math.round((Number(r.card_count) * 6) / 60)) }));
}

async function resolvePageItem(diseaseId: string): Promise<GeneratorContentOption | null> {
  const { rows } = await pool.query<{ id: string; canonical_name: string }>(
    `SELECT id, canonical_name FROM disease WHERE id = $1 AND status = 'published'`,
    [diseaseId]
  );
  if (!rows[0]) return null;
  const { rows: blockRows } = await pool.query<{ content_config: Record<string, unknown> }>(`SELECT content_config FROM editorial_block WHERE disease_id = $1`, [diseaseId]);
  return { id: rows[0].id, title: rows[0].canonical_name, minutes: estimateReadingMinutesFromValues(blockRows.map((r) => r.content_config)) };
}

async function resolveDeckItem(deckId: string): Promise<GeneratorContentOption | null> {
  const { rows } = await pool.query<{ id: string; name: string; card_count: string }>(
    `SELECT d.id, d.name, COUNT(f.id)::int AS card_count
     FROM flashcard_deck d LEFT JOIN flashcard f ON f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL
     WHERE d.id = $1 AND d.status = 'published' AND d.archived_at IS NULL
     GROUP BY d.id`,
    [deckId]
  );
  if (!rows[0]) return null;
  return { id: rows[0].id, title: rows[0].name, minutes: Math.max(1, Math.round((Number(rows[0].card_count) * 6) / 60)) };
}

async function resolveQuestionSetItem(setId: string): Promise<GeneratorContentOption | null> {
  const { rows } = await pool.query<{ id: string; name: string; question_count: string }>(
    `SELECT s.id, s.name, COUNT(q.id)::int AS question_count
     FROM question_set s LEFT JOIN question q ON q.set_id = s.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [setId]
  );
  if (!rows[0]) return null;
  return { id: rows[0].id, title: rows[0].name, minutes: Math.max(1, Math.round((Number(rows[0].question_count) * 45) / 60)) };
}

interface GeneratedTaskSeedV2 {
  type: TaskType;
  targetRef: string;
  title: string;
  estimateMinutes: number;
  planItemId: string;
}

function seedV2(type: TaskType, opt: GeneratorContentOption, planItemId: string): GeneratedTaskSeedV2 {
  return { type, targetRef: opt.id, title: opt.title, estimateMinutes: opt.minutes, planItemId };
}

// Alternates two lists (read, then flashcards, then read, …) rather
// than emitting all of one type before the other — "one_topic" still
// benefits from type-spacing *within* the folder it's finishing before
// moving on, same "spacing beats blocking" idea the legacy generator's
// cross-topic interleave used, just applied one level down.
function alternate(a: GeneratedTaskSeedV2[], b: GeneratedTaskSeedV2[]): GeneratedTaskSeedV2[] {
  const out: GeneratedTaskSeedV2[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

function roundRobin(groups: GeneratedTaskSeedV2[][]): GeneratedTaskSeedV2[] {
  const out: GeneratedTaskSeedV2[] = [];
  for (let idx = 0; ; idx++) {
    let any = false;
    for (const g of groups) {
      if (idx < g.length) {
        out.push(g[idx]);
        any = true;
      }
    }
    if (!any) break;
  }
  return out;
}

// Ordered-content generator (PLANNER-IMPLEMENTATION.md Pass 2, v2):
// "content = plan_items expanded to pages/decks/sets, in position
// order" and no weight/apportionment math — every resolvable atom in
// every item is included, order only ever changes the SEQUENCE:
//   interleave  — round-robin across items, one atom from each per pass
//   one_topic   — finish an item's atoms before the next item's, with
//                 read/flashcards alternated *within* a folder item
//   as_listed   — exactly the stored item order, each item's atoms
//                 flat (all its reads, then all its flashcards)
// Then placed according to mode: scheduled lands on study days capped
// at maxTasksPerDay same as the legacy walk; flexible/target set
// scheduled_for = null and queue_position instead.
async function generateTasksForPlanV2(userId: string, planId: string, plan: StudyPlan, items: PlanItem[]): Promise<GenerateResult> {
  if (plan.mode === "scheduled" && !plan.targetDate) return { created: 0, reason: "no-target-date" };

  const groups: GeneratedTaskSeedV2[][] = [];
  for (const item of items) {
    if (item.kind === "folder") {
      const [readOpts, cardOpts] = await Promise.all([pickReadTargetsForTopic(item.refId), pickFlashcardTargetsForTopic(item.refId)]);
      const reads = readOpts.map((o) => seedV2("read", o, item.id));
      const cards = cardOpts.map((o) => seedV2("flashcards", o, item.id));
      groups.push(plan.orderMode === "one_topic" ? alternate(reads, cards) : [...reads, ...cards]);
    } else if (item.kind === "page") {
      const opt = await resolvePageItem(item.refId);
      groups.push(opt ? [seedV2("read", opt, item.id)] : []);
    } else if (item.kind === "deck") {
      const opt = await resolveDeckItem(item.refId);
      groups.push(opt ? [seedV2("flashcards", opt, item.id)] : []);
    } else {
      const opt = await resolveQuestionSetItem(item.refId);
      groups.push(opt ? [seedV2("questions", opt, item.id)] : []);
    }
  }

  const ordered = plan.orderMode === "interleave" ? roundRobin(groups) : groups.flat();
  if (ordered.length === 0) return { created: 0, reason: "no-content" };

  const types: string[] = [];
  const targetRefs: string[] = [];
  const titles: string[] = [];
  const minutes: number[] = [];
  const dates: (string | null)[] = [];
  const queuePositions: (number | null)[] = [];
  const positions: number[] = [];
  const planItemIds: string[] = [];

  if (plan.mode === "scheduled") {
    const studyDaySet = new Set(plan.studyDays);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const cursor = new Date(today);
    let taskIdx = 0;
    let position = 0;
    let safety = 0;
    while (taskIdx < ordered.length && safety < 3650) {
      safety++;
      const isoDow = ((cursor.getUTCDay() + 6) % 7) + 1;
      if (studyDaySet.has(isoDow)) {
        for (let slot = 0; slot < plan.maxTasksPerDay && taskIdx < ordered.length; slot++) {
          const seed = ordered[taskIdx++];
          types.push(seed.type);
          targetRefs.push(seed.targetRef);
          titles.push(seed.title);
          minutes.push(seed.estimateMinutes);
          dates.push(cursor.toISOString().slice(0, 10));
          queuePositions.push(null);
          positions.push(position++);
          planItemIds.push(seed.planItemId);
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else {
    // flexible / target — no dates, an ordered queue instead.
    for (let i = 0; i < ordered.length; i++) {
      const seed = ordered[i];
      types.push(seed.type);
      targetRefs.push(seed.targetRef);
      titles.push(seed.title);
      minutes.push(seed.estimateMinutes);
      dates.push(null);
      queuePositions.push(i);
      positions.push(i);
      planItemIds.push(seed.planItemId);
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM study_plan_task WHERE plan_id = $1 AND state = 'pending'`, [planId]);
    await client.query(
      `INSERT INTO study_plan_task (user_id, plan_id, type, target_ref, title, estimate_minutes, scheduled_for, queue_position, position, plan_item_id)
       SELECT $1, $2, x.type, x.target_ref, x.title, x.estimate_minutes, x.scheduled_for, x.queue_position, x.position, x.plan_item_id
       FROM unnest($3::text[], $4::text[], $5::text[], $6::int[], $7::date[], $8::int[], $9::int[], $10::uuid[])
         AS x(type, target_ref, title, estimate_minutes, scheduled_for, queue_position, position, plan_item_id)`,
      [userId, planId, types, targetRefs, titles, minutes, dates, queuePositions, positions, planItemIds]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { created: types.length };
}

// The public entry point every caller uses. A plan created under the
// new ordered-content model has study_plan_item rows and runs the v2
// generator; a plan created before migration 0074 has none and falls
// back to the legacy weighted-subject generator unchanged — additive,
// same convention the migration's own header comment promises.
export async function generateTasksForPlan(userId: string, planId: string): Promise<GenerateResult> {
  const items = await getPlanItems(planId);
  if (items.length > 0) {
    const plan = await getPlanById(userId, planId);
    if (!plan) return { created: 0 };
    return generateTasksForPlanV2(userId, planId, plan, items);
  }
  return generateTasksForPlanLegacy(userId, planId);
}

export interface PlanStats {
  onTrackDelta: number;
  overdueCount: number;
  pacePerWeek: number;
  hoursPerWeekAvg: number;
  projectedFinishIso: string | null;
}

// PLANNER-IMPLEMENTATION.md Pass 4: "on_track = tasks_done minus
// tasks_that_should_be_done_by_now" and "projected_finish uses the
// actual pace over the last four weeks, not the plan's intended pace."
// tasksScheduledByNow counts every task (any state) whose scheduled_for
// has already arrived — a rolled-forward task's scheduled_for is
// always today (see rollForwardMissedTasks), so this stays correct
// whether or not that sweep has already run this request.
export async function getPlanStats(plan: StudyPlan, todayIso: string): Promise<PlanStats> {
  const { rows } = await pool.query<{
    scheduled_by_now: string;
    overdue_count: string;
    done_last_4w: string;
    minutes_last_4w: string;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE scheduled_for <= $2::date) AS scheduled_by_now,
       COUNT(*) FILTER (WHERE state = 'pending' AND original_date IS NOT NULL) AS overdue_count,
       COUNT(*) FILTER (WHERE state = 'done' AND completed_at >= $2::date - INTERVAL '28 days') AS done_last_4w,
       COALESCE(SUM(estimate_minutes) FILTER (WHERE state = 'done' AND completed_at >= $2::date - INTERVAL '28 days'), 0) AS minutes_last_4w
     FROM study_plan_task
     WHERE plan_id = $1`,
    [plan.id, todayIso]
  );
  const r = rows[0];
  const scheduledByNow = Number(r.scheduled_by_now);
  const overdueCount = Number(r.overdue_count);
  const pacePerWeek = Math.round(Number(r.done_last_4w) / 4);
  const hoursPerWeekAvg = Math.round((Number(r.minutes_last_4w) / 60 / 4) * 10) / 10;

  const tasksRemaining = plan.tasksTotal - plan.tasksDone;
  let projectedFinishIso: string | null = null;
  if (tasksRemaining <= 0) {
    projectedFinishIso = todayIso;
  } else if (pacePerWeek > 0) {
    const weeksNeeded = Math.ceil(tasksRemaining / pacePerWeek);
    const finish = new Date(`${todayIso}T00:00:00Z`);
    finish.setUTCDate(finish.getUTCDate() + weeksNeeded * 7);
    projectedFinishIso = finish.toISOString().slice(0, 10);
  }

  return {
    onTrackDelta: plan.tasksDone - scheduledByNow,
    overdueCount,
    pacePerWeek,
    hoursPerWeekAvg,
    projectedFinishIso,
  };
}

export interface TopicCoverage {
  id: string;
  label: string;
  weight: number;
  taskCount: number;
  doneCount: number;
}

// "Coverage beats completion" (PLANNER-SPEC.md rule 3) — 62% overall
// can hide a topic that hasn't started; this is the query the topic
// bars read from. A topic with zero tasks (e.g. it had no content when
// the plan was generated, see generateTasksForPlan's own withContent
// filter) still shows, at 0%, rather than disappearing.
export async function getPlanTopicCoverage(planId: string): Promise<TopicCoverage[]> {
  const { rows } = await pool.query<{ id: string; label: string; weight: number; task_count: string; done_count: string }>(
    `SELECT pt.id, pt.label, pt.weight,
       COUNT(t.id)::int AS task_count,
       COUNT(t.id) FILTER (WHERE t.state = 'done')::int AS done_count
     FROM study_plan_topic pt
     LEFT JOIN study_plan_task t ON t.topic_id = pt.id
     WHERE pt.plan_id = $1
     GROUP BY pt.id
     ORDER BY pt.position`,
    [planId]
  );
  return rows.map((r) => ({ id: r.id, label: r.label, weight: r.weight, taskCount: Number(r.task_count), doneCount: Number(r.done_count) }));
}

export interface PlanItemCoverage {
  id: string;
  label: string;
  kind: PlanItemKind;
  taskCount: number;
  doneCount: number;
}

// v2's own equivalent of getPlanTopicCoverage — "coverage beats
// completion" (PLANNER-SPEC.md rule 3) applies just as much to an
// ordered-content plan's folders/items as it did to a weighted plan's
// topics, just keyed by plan_item_id instead of topic_id.
export async function getPlanItemCoverage(planId: string): Promise<PlanItemCoverage[]> {
  const items = await getPlanItemsDetailed(planId);
  if (items.length === 0) return [];

  const { rows } = await pool.query<{ plan_item_id: string; task_count: string; done_count: string }>(
    `SELECT plan_item_id, COUNT(*)::int AS task_count, COUNT(*) FILTER (WHERE state = 'done')::int AS done_count
     FROM study_plan_task WHERE plan_id = $1 AND plan_item_id IS NOT NULL
     GROUP BY plan_item_id`,
    [planId]
  );
  const countsById = new Map(rows.map((r) => [r.plan_item_id, { taskCount: Number(r.task_count), doneCount: Number(r.done_count) }]));

  return items.map((item) => ({
    id: item.id,
    label: item.label,
    kind: item.kind,
    taskCount: countsById.get(item.id)?.taskCount ?? 0,
    doneCount: countsById.get(item.id)?.doneCount ?? 0,
  }));
}

export type WeekSquareState = "done" | "missed" | "planned";

export interface PlanWeek {
  weekStartIso: string;
  squares: WeekSquareState[];
}

// "One row per week, one square per task" (PLANNER-SPEC.md) — a task
// that rolled forward is bucketed into the week it was *originally*
// due (original_date), coloured missed, rather than the week it
// happens to sit in today; everything else uses its own scheduled_for.
// That's the only way the grid can show where a week actually fell
// short, given scheduled_for gets overwritten to today the moment a
// task rolls forward.
export async function getPlanWeeks(userId: string, planId: string, fromIso: string, toIso: string): Promise<PlanWeek[]> {
  const tasks = await getTasksInRange(userId, fromIso, toIso);
  const planTasks = tasks.filter((t) => t.planId === planId);

  const byWeek = new Map<string, WeekSquareState[]>();
  for (const task of planTasks) {
    const homeDate = task.originalDate ?? task.scheduledFor;
    const d = new Date(`${homeDate}T00:00:00Z`);
    const dow = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dow);
    const weekStartIso = d.toISOString().slice(0, 10);

    const state: WeekSquareState = task.state === "done" ? "done" : task.originalDate !== null ? "missed" : "planned";
    const list = byWeek.get(weekStartIso) ?? [];
    list.push(state);
    byWeek.set(weekStartIso, list);
  }

  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStartIso, squares]) => ({ weekStartIso, squares }));
}
