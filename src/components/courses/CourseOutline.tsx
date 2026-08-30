import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CourseModule } from "@/lib/courses";

// Read-only syllabus — everyone gets this (Clinical-Tools idiom, no
// content gate), only the "Continue"/checkmark state differs by
// session, same "null means no session, never a fabricated false"
// rule the data layer already follows.
export function CourseOutline({
  courseSlug,
  modules,
  lastLessonId,
  isSignedIn,
}: {
  courseSlug: string;
  modules: CourseModule[];
  lastLessonId: string | null;
  isSignedIn: boolean;
}) {
  const t = useTranslations("courses");
  const firstLessonId = modules.find((m) => m.lessons.length > 0)?.lessons[0]?.id;
  const resumeLessonId = lastLessonId ?? firstLessonId;

  return (
    <div className="flex flex-col gap-4">
      {resumeLessonId && (
        <Link
          href={`/courses/${courseSlug}/${resumeLessonId}`}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover"
        >
          <PlayCircle className="size-4" aria-hidden="true" />
          {lastLessonId ? t("continueCourse") : t("startCourse")}
        </Link>
      )}

      {modules.map((module) => (
        <div key={module.id} className="rounded-xl border border-border bg-surface-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-heading text-sm font-semibold text-primary">{module.title}</h2>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {module.lessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/courses/${courseSlug}/${lesson.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors duration-base hover:bg-border/20"
              >
                {isSignedIn ? (
                  lesson.completedAt ? (
                    <CheckCircle2 className="size-4 shrink-0 text-accent" aria-hidden="true" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-secondary/50" aria-hidden="true" />
                  )
                ) : (
                  <PlayCircle className="size-4 shrink-0 text-secondary/50" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate font-ui text-sm text-primary">{lesson.title}</span>
                {!lesson.videoUrl && (
                  <span className="shrink-0 font-ui text-xs text-secondary">{t("noVideoYet")}</span>
                )}
              </Link>
            ))}
            {module.lessons.length === 0 && (
              <p className="px-4 py-3 font-ui text-sm text-secondary">{t("noLessonsYet")}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
