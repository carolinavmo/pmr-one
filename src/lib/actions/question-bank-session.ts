"use server";

import { auth } from "@/auth";
import { revalidateQuestionBankSurfaces } from "@/lib/revalidation";
import {
  createSession,
  getActiveSession,
  setSessionPosition,
  finishSession,
  type SessionMode,
  type SessionBuiltFrom,
  type QuestionSessionSummary,
} from "@/lib/question-bank-session";

export async function startSessionAction(mode: SessionMode, builtFrom: SessionBuiltFrom): Promise<string | null> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const id = await createSession(session.user.id, mode, builtFrom);
  revalidateQuestionBankSurfaces();
  return id;
}

export async function getActiveSessionAction(): Promise<QuestionSessionSummary | null> {
  const session = await auth();
  if (!session) return null;
  return getActiveSession(session.user.id);
}

// "Write the attempt before advancing" (QBANK-IMPLEMENTATION.md Pass 4)
// — the caller always calls recordAttemptAction first, then this,
// never the other way around.
export async function advanceSessionAction(sessionId: string, position: number): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await setSessionPosition(sessionId, session.user.id, position);
}

export async function finishSessionAction(sessionId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await finishSession(sessionId, session.user.id);
  revalidateQuestionBankSurfaces();
}
