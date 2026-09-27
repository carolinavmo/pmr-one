"use server";

import { auth } from "@/auth";
import { revalidatePlannerSurfaces } from "@/lib/revalidation";
import { getSubjects } from "@/lib/flashcards";
import {
  createPlan,
  setPlanStatus,
  createTask,
  rescheduleTask,
  updateTask,
  deleteTask,
  toggleTaskState,
  searchTaskTargets,
  generateTasksForPlan,
  adjustPlanPace,
  type CreatePlanInput,
  type CreateTaskInput,
  type UpdateTaskInput,
  type PlanStatus,
  type TaskState,
  type TaskType,
  type TaskTargetOption,
  type GenerateResult,
} from "@/lib/planner";

export async function createPlanAction(input: CreatePlanInput): Promise<{ id: string; generated: GenerateResult }> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const result = await createPlan(session.user.id, input);
  revalidatePlannerSurfaces();
  return result;
}

// Re-runs the generator for an existing plan — the same function
// createPlanAction calls on first creation, exposed here for "Adjust
// the pace" (Pass 4's own name for this) and for a plan whose topics
// were only added after creation. Never touches tasks already marked
// done (see generateTasksForPlan's own comment).
export async function regeneratePlanAction(planId: string): Promise<GenerateResult> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const result = await generateTasksForPlan(session.user.id, planId);
  revalidatePlannerSurfaces();
  return result;
}

// "Adjust the pace" (PLANNER-IMPLEMENTATION.md Pass 4) — re-times the
// plan's existing pending tasks across the weeks left rather than
// picking new content the way regeneratePlanAction does.
export async function adjustPlanPaceAction(planId: string): Promise<GenerateResult> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const result = await adjustPlanPace(session.user.id, planId);
  revalidatePlannerSurfaces();
  return result;
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

export async function setPlanStatusAction(planId: string, status: PlanStatus): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await setPlanStatus(session.user.id, planId, status);
  revalidatePlannerSurfaces();
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
