"use server";

import { auth } from "@/auth";
import { revalidateQuestionBankSurfaces } from "@/lib/revalidation";
import type { CardColor } from "@/lib/editorial-blocks";
import {
  createCategory,
  renameCategory,
  updateCategoryColor,
  deleteCategory,
  createQuestionSet,
  renameQuestionSet,
  updateQuestionSetColor,
  updateQuestionSetDifficulty,
  setQuestionSetCategory,
  deleteQuestionSet,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  recordAttempt,
  resetSetAttempts,
  getQuestionsForManagement,
  type Difficulty,
  type QuestionCategory,
  type QuestionOptionInput,
  type QuestionEditable,
  type QuestionAttemptResult,
} from "@/lib/question-bank";

// Question Bank content is editor/admin-authored only — there's no
// "or it's the caller's own row" case like Flashcards has, so this
// guard just throws rather than returning a boolean to widen a SQL
// check. Rolled locally rather than imported/shared, matching how
// flashcards.ts, topics.ts, and admin/actions.ts each define their own.
async function requireEditor() {
  const session = await auth();
  if (session?.user.role !== "editor" && session?.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function createCategoryAction(name: string, color: CardColor): Promise<QuestionCategory> {
  await requireEditor();
  const category = await createCategory(name.trim() || "Untitled folder", color);
  revalidateQuestionBankSurfaces();
  return category;
}

export async function renameCategoryAction(categoryId: string, name: string): Promise<void> {
  await requireEditor();
  await renameCategory(categoryId, name.trim() || "Untitled folder");
  revalidateQuestionBankSurfaces();
}

export async function updateCategoryColorAction(categoryId: string, color: CardColor): Promise<void> {
  await requireEditor();
  await updateCategoryColor(categoryId, color);
  revalidateQuestionBankSurfaces();
}

export async function deleteCategoryAction(categoryId: string): Promise<void> {
  await requireEditor();
  await deleteCategory(categoryId);
  revalidateQuestionBankSurfaces();
}

export async function createQuestionSetAction(
  name: string,
  color: CardColor,
  difficulty: Difficulty,
  categoryId: string | null
): Promise<{ id: string }> {
  await requireEditor();
  const set = await createQuestionSet(name.trim() || "Untitled set", color, difficulty, categoryId);
  revalidateQuestionBankSurfaces();
  return set;
}

export async function renameQuestionSetAction(setId: string, name: string): Promise<void> {
  await requireEditor();
  await renameQuestionSet(setId, name.trim() || "Untitled set");
  revalidateQuestionBankSurfaces();
}

export async function updateQuestionSetColorAction(setId: string, color: CardColor): Promise<void> {
  await requireEditor();
  await updateQuestionSetColor(setId, color);
  revalidateQuestionBankSurfaces();
}

export async function updateQuestionSetDifficultyAction(setId: string, difficulty: Difficulty): Promise<void> {
  await requireEditor();
  await updateQuestionSetDifficulty(setId, difficulty);
  revalidateQuestionBankSurfaces();
}

export async function setQuestionSetCategoryAction(setId: string, categoryId: string | null): Promise<void> {
  await requireEditor();
  await setQuestionSetCategory(setId, categoryId);
  revalidateQuestionBankSurfaces();
}

export async function deleteQuestionSetAction(setId: string): Promise<void> {
  await requireEditor();
  await deleteQuestionSet(setId);
  revalidateQuestionBankSurfaces();
}

export async function createQuestionAction(
  setId: string,
  prompt: string,
  explanation: string,
  topicLabel: string,
  tags: string[],
  options: QuestionOptionInput[]
): Promise<string> {
  await requireEditor();
  if (options.length < 2) throw new Error("A question needs at least 2 options.");
  if (!options.some((o) => o.isCorrect)) throw new Error("Mark one option as correct.");
  const id = await createQuestion(
    setId,
    prompt.trim(),
    explanation.trim(),
    topicLabel.trim() || null,
    tags,
    options
  );
  revalidateQuestionBankSurfaces();
  return id;
}

export async function updateQuestionAction(
  questionId: string,
  prompt: string,
  explanation: string,
  topicLabel: string,
  tags: string[],
  options: QuestionOptionInput[]
): Promise<void> {
  await requireEditor();
  if (options.length < 2) throw new Error("A question needs at least 2 options.");
  if (!options.some((o) => o.isCorrect)) throw new Error("Mark one option as correct.");
  await updateQuestion(questionId, prompt.trim(), explanation.trim(), topicLabel.trim() || null, tags, options);
  revalidateQuestionBankSurfaces();
}

export async function deleteQuestionAction(questionId: string): Promise<void> {
  await requireEditor();
  await deleteQuestion(questionId);
  revalidateQuestionBankSurfaces();
}

export async function reorderQuestionsAction(setId: string, orderedIds: string[]): Promise<void> {
  await requireEditor();
  await reorderQuestions(setId, orderedIds);
  revalidateQuestionBankSurfaces();
}

export async function getQuestionsForManagementAction(setId: string): Promise<QuestionEditable[]> {
  await requireEditor();
  return getQuestionsForManagement(setId);
}

// The one member-facing action — any signed-in member can answer a
// question, no editor check. Signed-out visitors never reach this: the
// runner shows a sign-in prompt in place of the option buttons instead
// (same idiom as Flashcards' review gate).
export async function recordAttemptAction(
  questionId: string,
  selectedOptionId: string
): Promise<QuestionAttemptResult> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const result = await recordAttempt(session.user.id, questionId, selectedOptionId);
  if (!result) throw new Error("Invalid question or option.");
  revalidateQuestionBankSurfaces();
  return result;
}

// Called from the "Start over" control on a set the member has already
// attempted — any signed-in member, no editor check, same gating as
// recordAttemptAction.
export async function restartSetAction(setId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await resetSetAttempts(session.user.id, setId);
  revalidateQuestionBankSurfaces();
}
