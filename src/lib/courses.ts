import { pool } from "@/lib/db";
import { slugify } from "@/lib/slugify";

// Course > Module > Lesson — a standalone "Learning Object" table set,
// same reasoning as flashcards.ts (see db/migrations/0052_courses.sql).
// Unlike flashcards, every course is editor/admin-authored (no member-
// owned courses), so there's no ownership branching here — only the
// draft/published status gate, same idiom disease-loader.ts uses.

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  status: "draft" | "published";
  moduleCount: number;
  lessonCount: number;
  completedLessonCount: number | null; // null when there's no session to score against
}

export interface CourseLesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string | null;
  videoDurationSeconds: number | null;
  position: number;
  completedAt: string | null; // null when signed out or not yet completed
  lastPositionSeconds: number | null; // null when signed out
}

export interface CourseModule {
  id: string;
  title: string;
  position: number;
  lessons: CourseLesson[];
}

export interface CourseDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  status: "draft" | "published";
  modules: CourseModule[];
  lastLessonId: string | null; // "Continue" resume point
}

function mapSummaryRow(r: {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  status: "draft" | "published";
  module_count: string;
  lesson_count: string;
  completed_lesson_count: string | null;
}): CourseSummary {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    coverImageUrl: r.cover_image_url,
    status: r.status,
    moduleCount: Number(r.module_count),
    lessonCount: Number(r.lesson_count),
    completedLessonCount:
      r.completed_lesson_count === null ? null : Number(r.completed_lesson_count),
  };
}

export async function getCourseSummaries(
  userId: string | null,
  includeUnpublished = false
): Promise<CourseSummary[]> {
  const completedSelect = userId
    ? `, (
         SELECT COUNT(*) FROM course_lesson cl
         JOIN course_module cm ON cm.id = cl.module_id
         JOIN course_lesson_progress p ON p.lesson_id = cl.id AND p.user_id = $1
         WHERE cm.course_id = c.id AND p.completed_at IS NOT NULL
       ) AS completed_lesson_count`
    : `, NULL::bigint AS completed_lesson_count`;

  const { rows } = await pool.query(
    `SELECT c.id, c.slug, c.title, c.description, c.cover_image_url, c.status,
       (SELECT COUNT(*) FROM course_module cm WHERE cm.course_id = c.id) AS module_count,
       (
         SELECT COUNT(*) FROM course_lesson cl
         JOIN course_module cm ON cm.id = cl.module_id
         WHERE cm.course_id = c.id
       ) AS lesson_count
       ${completedSelect}
     FROM course c
     WHERE c.status = 'published' OR $${userId ? 2 : 1}
     ORDER BY c.position, c.title`,
    userId ? [userId, includeUnpublished] : [includeUnpublished]
  );
  return rows.map(mapSummaryRow);
}

// Draft courses only resolve for a caller who can see unpublished
// content (canSeeUnpublished, passed in by the route the same way
// getDiseaseBySlug's caller decides it) — a signed-out or non-editor
// visitor gets null (→ 404), never a "course exists but isn't public
// yet" signal, matching getDiseaseBySlug's exact idiom.
export async function getCourseBySlug(
  slug: string,
  userId: string | null,
  canSeeUnpublished: boolean
): Promise<CourseDetail | null> {
  const { rows: courseRows } = await pool.query(
    `SELECT id, slug, title, description, cover_image_url, status FROM course WHERE slug = $1`,
    [slug]
  );
  const course = courseRows[0];
  if (!course) return null;
  if (course.status !== "published" && !canSeeUnpublished) return null;

  const { rows: moduleRows } = await pool.query(
    `SELECT id, title, position FROM course_module WHERE course_id = $1 ORDER BY position, created_at`,
    [course.id]
  );

  const { rows: lessonRows } = await pool.query(
    userId
      ? `SELECT cl.id, cl.module_id, cl.title, cl.description, cl.video_url, cl.video_duration_seconds, cl.position,
           p.completed_at, p.last_position_seconds
         FROM course_lesson cl
         JOIN course_module cm ON cm.id = cl.module_id
         LEFT JOIN course_lesson_progress p ON p.lesson_id = cl.id AND p.user_id = $2
         WHERE cm.course_id = $1
         ORDER BY cl.position, cl.created_at`
      : `SELECT cl.id, cl.module_id, cl.title, cl.description, cl.video_url, cl.video_duration_seconds, cl.position,
           NULL::timestamptz AS completed_at, NULL::int AS last_position_seconds
         FROM course_lesson cl
         JOIN course_module cm ON cm.id = cl.module_id
         WHERE cm.course_id = $1
         ORDER BY cl.position, cl.created_at`,
    userId ? [course.id, userId] : [course.id]
  );

  const lessonsByModuleId = new Map<string, CourseLesson[]>();
  for (const r of lessonRows) {
    const lesson: CourseLesson = {
      id: r.id,
      title: r.title,
      description: r.description,
      videoUrl: r.video_url,
      videoDurationSeconds: r.video_duration_seconds,
      position: r.position,
      completedAt: r.completed_at,
      lastPositionSeconds: r.last_position_seconds === null ? null : Number(r.last_position_seconds),
    };
    const list = lessonsByModuleId.get(r.module_id) ?? [];
    list.push(lesson);
    lessonsByModuleId.set(r.module_id, list);
  }

  let lastLessonId: string | null = null;
  if (userId) {
    const { rows: positionRows } = await pool.query(
      `SELECT lesson_id FROM course_position WHERE user_id = $1 AND course_id = $2`,
      [userId, course.id]
    );
    lastLessonId = positionRows[0]?.lesson_id ?? null;
  }

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    coverImageUrl: course.cover_image_url,
    status: course.status,
    modules: moduleRows.map((m) => ({
      id: m.id,
      title: m.title,
      position: m.position,
      lessons: lessonsByModuleId.get(m.id) ?? [],
    })),
    lastLessonId,
  };
}

export async function createCourse(title: string): Promise<CourseSummary> {
  const slug = await uniqueCourseSlug(title);
  const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM course`);
  const { rows } = await pool.query(
    `INSERT INTO course (slug, title, position) VALUES ($1, $2, $3)
     RETURNING id, slug, title, description, cover_image_url, status`,
    [slug, title, countRows[0].count]
  );
  return mapSummaryRow({ ...rows[0], module_count: "0", lesson_count: "0", completed_lesson_count: "0" });
}

async function uniqueCourseSlug(base: string): Promise<string> {
  const slug = slugify(base) || "course";
  const { rows } = await pool.query(`SELECT slug FROM course WHERE slug = $1 OR slug LIKE $2`, [
    slug,
    `${slug}-%`,
  ]);
  const existing = new Set<string>(rows.map((r) => r.slug));
  if (!existing.has(slug)) return slug;
  let n = 2;
  while (existing.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

export async function renameCourse(courseId: string, title: string): Promise<void> {
  await pool.query(`UPDATE course SET title = $1, updated_at = now() WHERE id = $2`, [title, courseId]);
}

export async function updateCourseDescription(courseId: string, description: string): Promise<void> {
  await pool.query(`UPDATE course SET description = $1, updated_at = now() WHERE id = $2`, [
    description,
    courseId,
  ]);
}

export async function setCourseStatus(
  courseId: string,
  status: "draft" | "published"
): Promise<void> {
  await pool.query(`UPDATE course SET status = $1, updated_at = now() WHERE id = $2`, [status, courseId]);
}

export async function deleteCourse(courseId: string): Promise<void> {
  await pool.query(`DELETE FROM course WHERE id = $1`, [courseId]);
}

export async function reorderCourses(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(`UPDATE course SET position = $1 WHERE id = $2`, [i, orderedIds[i]]);
  }
}

export async function createModule(courseId: string, title: string): Promise<CourseModule> {
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM course_module WHERE course_id = $1`,
    [courseId]
  );
  const { rows } = await pool.query(
    `INSERT INTO course_module (course_id, title, position) VALUES ($1, $2, $3) RETURNING id, title, position`,
    [courseId, title, countRows[0].count]
  );
  return { id: rows[0].id, title: rows[0].title, position: rows[0].position, lessons: [] };
}

export async function renameModule(moduleId: string, title: string): Promise<void> {
  await pool.query(`UPDATE course_module SET title = $1 WHERE id = $2`, [title, moduleId]);
}

export async function deleteModule(moduleId: string): Promise<void> {
  await pool.query(`DELETE FROM course_module WHERE id = $1`, [moduleId]);
}

export async function reorderModules(courseId: string, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(`UPDATE course_module SET position = $1 WHERE id = $2 AND course_id = $3`, [
      i,
      orderedIds[i],
      courseId,
    ]);
  }
}

export async function createLesson(moduleId: string, title: string): Promise<CourseLesson> {
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM course_lesson WHERE module_id = $1`,
    [moduleId]
  );
  const { rows } = await pool.query(
    `INSERT INTO course_lesson (module_id, title, position) VALUES ($1, $2, $3)
     RETURNING id, title, description, video_url, video_duration_seconds, position`,
    [moduleId, title, countRows[0].count]
  );
  const row = rows[0];
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    videoUrl: row.video_url,
    videoDurationSeconds: row.video_duration_seconds,
    position: row.position,
    completedAt: null,
    lastPositionSeconds: null,
  };
}

export async function updateLesson(
  lessonId: string,
  title: string,
  description: string
): Promise<void> {
  await pool.query(`UPDATE course_lesson SET title = $1, description = $2 WHERE id = $3`, [
    title,
    description,
    lessonId,
  ]);
}

export async function deleteLesson(lessonId: string): Promise<void> {
  await pool.query(`DELETE FROM course_lesson WHERE id = $1`, [lessonId]);
}

export async function reorderLessons(moduleId: string, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(`UPDATE course_lesson SET position = $1 WHERE id = $2 AND module_id = $3`, [
      i,
      orderedIds[i],
      moduleId,
    ]);
  }
}

// Called from the player on pause/unmount (throttled) and on `ended`
// (with completed forwarded true) — also writes course_position so
// "Continue" resumes on this lesson next visit.
export async function saveLessonPosition(
  userId: string,
  courseId: string,
  lessonId: string,
  seconds: number
): Promise<void> {
  await pool.query(
    `INSERT INTO course_lesson_progress (user_id, lesson_id, last_position_seconds, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET last_position_seconds = $3, updated_at = now()`,
    [userId, lessonId, Math.round(seconds)]
  );
  await pool.query(
    `INSERT INTO course_position (user_id, course_id, lesson_id, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, course_id) DO UPDATE SET lesson_id = $3, updated_at = now()`,
    [userId, courseId, lessonId]
  );
}

export async function markLessonComplete(userId: string, lessonId: string): Promise<void> {
  await pool.query(
    `INSERT INTO course_lesson_progress (user_id, lesson_id, completed_at, updated_at)
     VALUES ($1, $2, now(), now())
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET completed_at = now(), updated_at = now()`,
    [userId, lessonId]
  );
}
