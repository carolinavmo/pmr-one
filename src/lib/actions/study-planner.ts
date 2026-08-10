"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  rescheduleTask,
  type StudyTaskInput,
} from "@/lib/study-planner";
import { STUDY_CATEGORY_MAP } from "@/lib/study-categories";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const PRIORITIES = new Set(["low", "medium", "high"]);

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Forbidden");
  return session;
}

// Shared by create/update — business-rule validation returns
// {ok:false,error} for the drawer to show inline, distinct from the
// `throw` used for the auth guard above.
function validateInput(input: StudyTaskInput): { ok: false; error: string } | null {
  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  if (!STUDY_CATEGORY_MAP[input.category]) return { ok: false, error: "Choose a valid category." };
  if (!PRIORITIES.has(input.priority)) return { ok: false, error: "Choose a valid priority." };
  if (!Number.isFinite(input.estimatedMinutes) || input.estimatedMinutes <= 0) {
    return { ok: false, error: "Duration must be greater than 0." };
  }
  if (!input.scheduledDate) return { ok: false, error: "Date is required." };
  return null;
}

function revalidateStudyPlanner() {
  revalidatePath("/[locale]/study-planner", "page");
}

export async function createTaskAction(input: StudyTaskInput): Promise<ActionResult> {
  const session = await requireSession();
  const invalid = validateInput(input);
  if (invalid) return invalid;

  const id = await createTask(session.user.id, input);
  revalidateStudyPlanner();
  return { ok: true, id };
}

export async function updateTaskAction(
  taskId: string,
  input: StudyTaskInput,
): Promise<ActionResult> {
  const session = await requireSession();
  const invalid = validateInput(input);
  if (invalid) return invalid;

  const updated = await updateTask(session.user.id, taskId, input);
  if (!updated) return { ok: false, error: "Task not found." };

  revalidateStudyPlanner();
  return { ok: true };
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  const session = await requireSession();
  const deleted = await deleteTask(session.user.id, taskId);
  if (!deleted) return { ok: false, error: "Task not found." };

  revalidateStudyPlanner();
  return { ok: true };
}

export async function toggleTaskCompleteAction(taskId: string): Promise<ActionResult> {
  const session = await requireSession();
  const completed = await toggleTaskComplete(session.user.id, taskId);
  if (completed === null) return { ok: false, error: "Task not found." };

  revalidateStudyPlanner();
  return { ok: true };
}

export async function rescheduleTaskAction(
  taskId: string,
  newDate: string,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!newDate) return { ok: false, error: "Date is required." };

  const rescheduled = await rescheduleTask(session.user.id, taskId, newDate);
  if (!rescheduled) return { ok: false, error: "Task not found." };

  revalidateStudyPlanner();
  return { ok: true };
}
