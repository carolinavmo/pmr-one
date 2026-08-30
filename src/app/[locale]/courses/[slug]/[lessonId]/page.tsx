import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getCourseBySlug } from "@/lib/courses";
import { LessonPlayer } from "@/components/courses/LessonPlayer";

interface LessonPageProps {
  params: Promise<{ slug: string; lessonId: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug, lessonId } = await params;
  const session = await auth();
  const isEditor = session?.user.role === "editor" || session?.user.role === "admin";
  const course = await getCourseBySlug(slug, session?.user.id ?? null, isEditor);
  if (!course) notFound();

  // Flatten every module's lessons in display order to find the
  // current lesson and its prev/next neighbors — cheap over an
  // already-fetched tree, no extra query needed.
  const flatLessons = course.modules.flatMap((m) => m.lessons);
  const index = flatLessons.findIndex((l) => l.id === lessonId);
  const lesson = flatLessons[index];
  if (!lesson) notFound();
  if (!lesson.videoUrl && !isEditor) notFound();

  const t = await getTranslations("courses");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <Link href={`/courses/${course.slug}`} className="font-ui text-sm text-secondary hover:text-accent">
        {t("backToCourse", { title: course.title })}
      </Link>

      <div>
        <h1 className="font-heading text-2xl text-primary">{lesson.title}</h1>
        {lesson.description && <p className="mt-1 font-ui text-sm text-secondary">{lesson.description}</p>}
      </div>

      {lesson.videoUrl ? (
        <LessonPlayer
          courseSlug={course.slug}
          courseId={course.id}
          lessonId={lesson.id}
          videoUrl={lesson.videoUrl}
          initialPositionSeconds={lesson.lastPositionSeconds}
          isCompleted={Boolean(lesson.completedAt)}
          isSignedIn={Boolean(session)}
          prevLesson={index > 0 ? flatLessons[index - 1] : null}
          nextLesson={index < flatLessons.length - 1 ? flatLessons[index + 1] : null}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-8 text-center font-ui text-sm text-secondary">
          {t("noVideoYet")}
        </p>
      )}
    </main>
  );
}
