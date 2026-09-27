"use server";

import { auth } from "@/auth";
import { revalidatePlannerSurfaces } from "@/lib/revalidation";
import {
  createPlan,
  setPlanStatus,
  createTask,
  rescheduleTask,
  deleteTask,
  toggleTaskState,
  searchTaskTargets,
  type CreatePlanInput,
  type CreateTaskInput,
  type PlanStatus,
  type TaskState,
  type TaskType,
  type TaskTargetOption,
} from "@/lib/planner";

export async function createPlanAction(input: CreatePlanInput): Promise<string> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const id = await createPlan(session.user.id, input);
  revalidatePlannerSurfaces();
  return id;
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
