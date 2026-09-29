"use server";

import { auth } from "@/auth";
import { revalidatePlannerSurfaces } from "@/lib/revalidation";
import { getSubjects } from "@/lib/flashcards";
import {
  createPlan,
  updatePlan,
  updatePlanSchedule,
  createTask,
  rescheduleTask,
  updateTask,
  deleteTask,
  toggleTaskState,
  searchTaskTargets,
  getFolderOptions,
  type CreatePlanInput,
  type UpdatePlanInput,
  type UpdatePlanScheduleInput,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskState,
  type TaskType,
  type TaskTargetOption,
  type GenerateResult,
  type FolderOption,
} from "@/lib/planner";

export async function createPlanAction(input: CreatePlanInput): Promise<{ id: string; generated: GenerateResult }> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const result = await createPlan(session.user.id, input);
  revalidatePlannerSurfaces();
  return result;
}

// "Any plan can be reshaped" (PLANNER-SPEC.md rule 4) — the plan's own
// settings (name, colour, target date, study days, session length,
// topics/weights), not its tasks. Never touches study_plan_task, see
// updatePlan's own comment for why.
export async function updatePlanAction(planId: string, input: UpdatePlanInput): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await updatePlan(session.user.id, planId, input);
  revalidatePlannerSurfaces();
}

// The Schedule tab's own inline edit (direct feedback) — study days
// and session length only, without the full plan-editing payload.
export async function updatePlanScheduleAction(planId: string, input: UpdatePlanScheduleInput): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await updatePlanSchedule(session.user.id, planId, input);
  revalidatePlannerSurfaces();
}

// The topic picker's own option list — the shared flashcard_subject
// taxonomy the generator resolves content from (see planner.ts's own
// comment on why). No search query needed; the app has ~10 subjects,
// small enough to just list.
export async function listPlanTopicOptionsAction(): Promise<{ id: string; name: string }[]> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const subjects = await getSubjects();
  return subjects.map((s) => ({ id: s.id, name: s.name }));
}

// The v2 Content picker's own option list — see getFolderOptions's
// own comment for why this is knowledge-graph topics, not the legacy
// picker's flashcard_subject rows above.
export async function listPlanFolderOptionsAction(): Promise<FolderOption[]> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return getFolderOptions();
}

export async function createTaskAction(input: CreateTaskInput): Promise<string> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const id = await createTask(session.user.id, input);
  revalidatePlannerSurfaces();
  return id;
}

export async function rescheduleTaskAction(taskId: string, newDate: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await rescheduleTask(session.user.id, taskId, newDate);
  revalidatePlannerSurfaces();
}

export async function updateTaskAction(taskId: string, input: UpdateTaskInput): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await updateTask(session.user.id, taskId, input);
  revalidatePlannerSurfaces();
}

export async function deleteTaskAction(taskId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await deleteTask(session.user.id, taskId);
  revalidatePlannerSurfaces();
}

export async function toggleTaskStateAction(taskId: string): Promise<TaskState | null> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const state = await toggleTaskState(session.user.id, taskId);
  revalidatePlannerSurfaces();
  return state;
}

export async function searchTaskTargetsAction(type: Exclude<TaskType, "custom">, query: string): Promise<TaskTargetOption[]> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return searchTaskTargets(type, query);
}
