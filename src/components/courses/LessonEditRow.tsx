"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GripVertical, Pencil, PlayCircle, Trash2 } from "lucide-react";
import type { CourseLesson } from "@/lib/courses";
import { updateLessonAction, deleteLessonAction } from "@/lib/actions/courses";
import { LessonVideoUploader } from "./LessonVideoUploader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// One lesson row inside ModuleEditor (CourseWorkspace.tsx) — mirrors
// CardManager.tsx's per-card row shape (drag handle, inline edit,
// delete-with-confirm), plus the one thing a flashcard doesn't need:
// a video uploader.
export function LessonEditRow({
  lesson,
  registerRow,
  startDrag,
  dragClass,
  onChange,
  onDelete,
}: {
  lesson: CourseLesson;
  registerRow: (el: HTMLElement | null) => void;
  startDrag: (e: React.PointerEvent) => void;
  dragClass: string | undefined;
  onChange: (lesson: CourseLesson) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("courses");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function save() {
    onChange({ ...lesson, title, description });
    updateLessonAction(lesson.id, title, description);
    setEditing(false);
  }

  return (
    <div ref={registerRow} className={`flex flex-col gap-2 py-3 ${dragClass ?? ""}`}>
      {editing ? (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("lessonTitlePlaceholder")}
            className="rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t("lessonDescriptionPlaceholder")}
            className="rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
          <LessonVideoUploader
            lessonId={lesson.id}
            currentVideoUrl={lesson.videoUrl}
            onUploaded={(videoUrl) => onChange({ ...lesson, videoUrl })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="primary" onClick={save}>
              {t("save")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={startDrag}
            aria-label={t("dragToReorder")}
            className="shrink-0 cursor-grab touch-none text-secondary/60 hover:text-secondary"
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
          <PlayCircle
            className={`size-4 shrink-0 ${lesson.videoUrl ? "text-accent" : "text-secondary/40"}`}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate font-ui text-sm text-primary">{lesson.title}</span>
          {!lesson.videoUrl && (
            <span className="shrink-0 font-ui text-xs text-secondary">{t("noVideoYet")}</span>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={t("editLesson")}
            className="shrink-0 rounded-md p-1.5 text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label={t("deleteLesson")}
            className="shrink-0 rounded-md p-1.5 text-secondary hover:bg-border/40 hover:text-card-red"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t("confirmDeleteLesson")}
          confirmLabel={t("deleteLesson")}
          cancelLabel={t("cancel")}
          onConfirm={() => {
            onDelete();
            deleteLessonAction(lesson.id);
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
