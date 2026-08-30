import { GraduationCap, PlayCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CourseSummary } from "@/lib/courses";

export function CourseCard({ course, t }: { course: CourseSummary; t: (key: string, values?: Record<string, string | number>) => string }) {
  const progressPct =
    course.completedLessonCount !== null && course.lessonCount > 0
      ? Math.round((course.completedLessonCount / course.lessonCount) * 100)
      : null;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface-card transition-colors duration-base hover:border-accent/40"
    >
      <div className="relative flex h-32 items-center justify-center bg-accent/10">
        {course.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.coverImageUrl} alt="" className="size-full object-cover" />
        ) : (
          <GraduationCap className="size-9 text-accent" aria-hidden="true" />
        )}
        {course.status === "draft" && (
          <span className="absolute top-2 right-2 rounded-full bg-surface px-2 py-0.5 font-ui text-xs font-medium text-secondary shadow">
            {t("draftBadge")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-base font-semibold text-primary">{course.title}</h3>
        {course.description && (
          <p className="line-clamp-2 font-ui text-sm text-secondary">{course.description}</p>
        )}
        <div className="mt-auto flex items-center gap-1.5 pt-2 font-ui text-xs text-secondary">
          <PlayCircle className="size-3.5" aria-hidden="true" />
          {t("lessonCount", { count: course.lessonCount })}
        </div>
        {progressPct !== null && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/50">
            <div className="h-full rounded-full bg-accent" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>
    </Link>
  );
}
