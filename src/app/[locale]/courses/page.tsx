import { getTranslations } from "next-intl/server";
import { GraduationCap, PlayCircle, CheckCircle2 } from "lucide-react";
import { auth } from "@/auth";
import { getCourseSummaries } from "@/lib/courses";
import { CoursesBrowser } from "@/components/courses/CoursesBrowser";

// Public browse (Clinical-Tools/Flashcards idiom, not Study-Planner's
// hard redirect) — published courses are reference content anyone can
// look at and watch; only authoring (creating/editing) needs an
// editor session, and only progress needs any session at all.
export default async function CoursesPage() {
  const session = await auth();
  const isEditor = session?.user.role === "editor" || session?.user.role === "admin";
  const courses = await getCourseSummaries(session?.user.id ?? null, isEditor);
  const t = await getTranslations("courses");

  const totalLessons = courses.reduce((sum, c) => sum + c.lessonCount, 0);
  const inProgress = courses.filter(
    (c) => c.completedLessonCount !== null && c.completedLessonCount > 0 && c.completedLessonCount < c.lessonCount
  ).length;
  const completed = courses.filter(
    (c) => c.completedLessonCount !== null && c.lessonCount > 0 && c.completedLessonCount === c.lessonCount
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <GraduationCap className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-heading text-3xl text-primary">{t("pageTitle")}</h1>
          <p className="mt-1 font-ui text-sm text-secondary">{t("pageSubtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={GraduationCap} value={courses.length} label={t("statsTotalCourses")} />
        <StatTile icon={PlayCircle} value={totalLessons} label={t("statsTotalLessons")} />
        {session && (
          <>
            <StatTile icon={PlayCircle} value={inProgress} label={t("statsInProgress")} />
            <StatTile icon={CheckCircle2} value={completed} label={t("statsCompleted")} />
          </>
        )}
      </div>

      <CoursesBrowser courses={courses} isEditor={isEditor} />
    </main>
  );
}

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof GraduationCap;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-card p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <span className="font-heading text-xl font-semibold text-primary tabular-nums">{value}</span>
        <span className="font-ui text-xs text-secondary">{label}</span>
      </div>
    </div>
  );
}
