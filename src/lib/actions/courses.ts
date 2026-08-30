"use server";

import { auth } from "@/auth";
import { revalidateCourseSurfaces } from "@/lib/revalidation";
import {
  createCourse,
  renameCourse,
  updateCourseDescription,
  setCourseStatus,
  deleteCourse,
  reorderCourses,
  createModule,
  renameModule,
  deleteModule,
  reorderModules,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  saveLessonPosition,
  markLessonComplete,
  type CourseSummary,
  type CourseModule,
  type CourseLesson,
} from "@/lib/courses";

// Every course is editor/admin-authored (no member-owned courses,
// unlike flashcard decks) — a single role check guards every write,
// same shape as topics.ts's requireAdmin, rolled locally here rather
// than imported (each actions file defines its own, per this
// codebase's established convention).
async function requireEditor() {
  const session = await auth();
  if (session?.user.role !== "editor" && session?.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function createCourseAction(title: string): Promise<CourseSummary> {
  await requireEditor();
  const course = await createCourse(title.trim() || "Untitled course");
  revalidateCourseSurfaces();
  return course;
}

export async function renameCourseAction(courseId: string, title: string): Promise<void> {
  await requireEditor();
  await renameCourse(courseId, title.trim() || "Untitled course");
  revalidateCourseSurfaces();
}

export async function updateCourseDescriptionAction(courseId: string, description: string): Promise<void> {
  await requireEditor();
  await updateCourseDescription(courseId, description);
  revalidateCourseSurfaces();
}

export async function publishCourseAction(courseId: string): Promise<void> {
  await requireEditor();
  await setCourseStatus(courseId, "published");
  revalidateCourseSurfaces();
}

export async function unpublishCourseAction(courseId: string): Promise<void> {
  await requireEditor();
  await setCourseStatus(courseId, "draft");
  revalidateCourseSurfaces();
}

export async function deleteCourseAction(courseId: string): Promise<void> {
  await requireEditor();
  await deleteCourse(courseId);
  revalidateCourseSurfaces();
}

export async function reorderCoursesAction(orderedIds: string[]): Promise<void> {
  await requireEditor();
  await reorderCourses(orderedIds);
  revalidateCourseSurfaces();
}

export async function createModuleAction(courseId: string, title: string): Promise<CourseModule> {
  await requireEditor();
  const module_ = await createModule(courseId, title.trim() || "Untitled module");
  revalidateCourseSurfaces();
  return module_;
}

export async function renameModuleAction(moduleId: string, title: string): Promise<void> {
  await requireEditor();
  await renameModule(moduleId, title.trim() || "Untitled module");
  revalidateCourseSurfaces();
}

export async function deleteModuleAction(moduleId: string): Promise<void> {
  await requireEditor();
  await deleteModule(moduleId);
  revalidateCourseSurfaces();
}

export async function reorderModulesAction(courseId: string, orderedIds: string[]): Promise<void> {
  await requireEditor();
  await reorderModules(courseId, orderedIds);
  revalidateCourseSurfaces();
}

export async function createLessonAction(moduleId: string, title: string): Promise<CourseLesson> {
  await requireEditor();
  const lesson = await createLesson(moduleId, title.trim() || "Untitled lesson");
  revalidateCourseSurfaces();
  return lesson;
}

export async function updateLessonAction(
  lessonId: string,
  title: string,
  description: string
): Promise<void> {
  await requireEditor();
  await updateLesson(lessonId, title.trim() || "Untitled lesson", description);
  revalidateCourseSurfaces();
}

export async function deleteLessonAction(lessonId: string): Promise<void> {
  await requireEditor();
  await deleteLesson(lessonId);
  revalidateCourseSurfaces();
}

export async function reorderLessonsAction(moduleId: string, orderedIds: string[]): Promise<void> {
  await requireEditor();
  await reorderLessons(moduleId, orderedIds);
  revalidateCourseSurfaces();
}

// Fire-and-forget from the player (throttled on time updates, same
// idiom as flashcards' recordReviewAction) — any signed-in member can
// track their own progress, no editor check needed.
export async function saveLessonPositionAction(
  courseId: string,
  lessonId: string,
  seconds: number
): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await saveLessonPosition(session.user.id, courseId, lessonId, seconds);
}

export async function markLessonCompleteAction(lessonId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await markLessonComplete(session.user.id, lessonId);
  revalidateCourseSurfaces();
}
