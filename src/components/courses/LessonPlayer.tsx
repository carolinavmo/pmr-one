"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { saveLessonPositionAction, markLessonCompleteAction } from "@/lib/actions/courses";

interface AdjacentLesson {
  id: string;
  title: string;
}

// Progress is saved two ways: throttled on `timeupdate` (every ~5s of
// playback, not every event — timeupdate fires several times a
// second) so a resume position exists even if the visitor never
// finishes, and unconditionally on `ended` (with completion) so
// finishing the video always counts even if the last throttled save
// hadn't fired yet. Both are fire-and-forget, same idiom
// recordReviewAction uses — the player never blocks on them.
export function LessonPlayer({
  courseSlug,
  courseId,
  lessonId,
  videoUrl,
  initialPositionSeconds,
  isCompleted,
  isSignedIn,
  prevLesson,
  nextLesson,
}: {
  courseSlug: string;
  courseId: string;
  lessonId: string;
  videoUrl: string;
  initialPositionSeconds: number | null;
  isCompleted: boolean;
  isSignedIn: boolean;
  prevLesson: AdjacentLesson | null;
  nextLesson: AdjacentLesson | null;
}) {
  const t = useTranslations("courses");
  const lastSavedAt = useRef(0);

  function saveProgress(seconds: number) {
    if (!isSignedIn) return;
    const now = Date.now();
    if (now - lastSavedAt.current < 5000) return;
    lastSavedAt.current = now;
    saveLessonPositionAction(courseId, lessonId, seconds);
  }

  return (
    <div className="flex flex-col gap-4">
      <video
        key={lessonId}
        controls
        src={videoUrl}
        className="w-full rounded-xl bg-black"
        onLoadedMetadata={(e) => {
          if (initialPositionSeconds) e.currentTarget.currentTime = initialPositionSeconds;
        }}
        onTimeUpdate={(e) => saveProgress(e.currentTarget.currentTime)}
        onPause={(e) => saveProgress(e.currentTarget.currentTime)}
        onEnded={() => {
          if (!isSignedIn) return;
          saveLessonPositionAction(courseId, lessonId, 0);
          markLessonCompleteAction(lessonId);
        }}
      />

      {isSignedIn && (
        <button
          type="button"
          onClick={() => markLessonCompleteAction(lessonId)}
          disabled={isCompleted}
          className="flex w-fit items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-ui text-sm text-primary disabled:cursor-default disabled:opacity-60"
        >
          <CheckCircle2 className={`size-4 ${isCompleted ? "text-accent" : "text-secondary"}`} aria-hidden="true" />
          {isCompleted ? t("lessonCompleted") : t("markComplete")}
        </button>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        {prevLesson ? (
          <Link
            href={`/courses/${courseSlug}/${prevLesson.id}`}
            className="flex min-w-0 items-center gap-1.5 font-ui text-sm text-secondary hover:text-accent"
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{prevLesson.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {nextLesson ? (
          <Link
            href={`/courses/${courseSlug}/${nextLesson.id}`}
            className="flex min-w-0 items-center gap-1.5 font-ui text-sm text-secondary hover:text-accent"
          >
            <span className="truncate">{nextLesson.title}</span>
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
