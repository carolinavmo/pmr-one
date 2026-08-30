"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import type { CourseModule, CourseLesson } from "@/lib/courses";
import {
  createModuleAction,
  renameModuleAction,
  deleteModuleAction,
  reorderModulesAction,
  createLessonAction,
  reorderLessonsAction,
} from "@/lib/actions/courses";
import { useReorderDrag, dragRowClass } from "@/lib/useReorderDrag";
import { LessonEditRow } from "./LessonEditRow";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Editor-only module/lesson CRUD — mirrors DeckWorkspace.tsx/
// CardManager.tsx one level deeper (course > module > lesson vs.
// deck > card). Modules live in this component's own state (so an
// add/rename/delete/reorder is immediately visible); each module's
// lessons are owned by the ModuleEditor row below it, for the same
// reason CardManager keeps cards local to itself.
export function CourseWorkspace({
  courseId,
  initialModules,
}: {
  courseId: string;
  initialModules: CourseModule[];
}) {
  const t = useTranslations("courses");
  const [modules, setModules] = useState(initialModules);
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");

  const moduleIds = modules.map((m) => m.id);
  const { draggedId, overId, registerRow, startDrag } = useReorderDrag(moduleIds, (orderedIds) => {
    setModules((prev) => orderedIds.map((id) => prev.find((m) => m.id === id)!));
    reorderModulesAction(courseId, orderedIds);
  });

  async function handleAddModule() {
    if (!newModuleTitle.trim()) return;
    const module_ = await createModuleAction(courseId, newModuleTitle);
    setModules((prev) => [...prev, module_]);
    setNewModuleTitle("");
    setAddingModule(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {modules.map((module) => (
        <div
          key={module.id}
          ref={registerRow(module.id)}
          className={dragRowClass(module.id, draggedId, overId)}
        >
          <ModuleEditor
            module={module}
            startModuleDrag={startDrag(module.id)}
            onModuleChange={(updated) =>
              setModules((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
            }
            onModuleDelete={() => setModules((prev) => prev.filter((m) => m.id !== module.id))}
          />
        </div>
      ))}

      {addingModule ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-card p-3">
          <input
            type="text"
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            autoFocus
            placeholder={t("moduleTitlePlaceholder")}
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
          <Button type="button" variant="secondary" onClick={() => setAddingModule(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="primary" onClick={handleAddModule}>
            {t("addModule")}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingModule(true)}
          className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2.5 font-ui text-sm text-secondary hover:border-accent/40 hover:text-accent"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("addModule")}
        </button>
      )}
    </div>
  );
}

function ModuleEditor({
  module,
  startModuleDrag,
  onModuleChange,
  onModuleDelete,
}: {
  module: CourseModule;
  startModuleDrag: (e: React.PointerEvent) => void;
  onModuleChange: (module: CourseModule) => void;
  onModuleDelete: () => void;
}) {
  const t = useTranslations("courses");
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(module.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");

  const lessonIds = module.lessons.map((l) => l.id);
  const { draggedId, overId, registerRow, startDrag } = useReorderDrag(lessonIds, (orderedIds) => {
    onModuleChange({
      ...module,
      lessons: orderedIds.map((id) => module.lessons.find((l) => l.id === id)!),
    });
    reorderLessonsAction(module.id, orderedIds);
  });

  function saveTitle() {
    onModuleChange({ ...module, title });
    renameModuleAction(module.id, title);
    setRenaming(false);
  }

  async function handleAddLesson() {
    if (!newLessonTitle.trim()) return;
    const lesson = await createLessonAction(module.id, newLessonTitle);
    onModuleChange({ ...module, lessons: [...module.lessons, lesson] });
    setNewLessonTitle("");
    setAddingLesson(false);
  }

  function updateLesson(updated: CourseLesson) {
    onModuleChange({
      ...module,
      lessons: module.lessons.map((l) => (l.id === updated.id ? updated : l)),
    });
  }

  function removeLesson(lessonId: string) {
    onModuleChange({ ...module, lessons: module.lessons.filter((l) => l.id !== lessonId) });
  }

  return (
    <div className="rounded-xl border border-border bg-surface-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <button
          type="button"
          onPointerDown={startModuleDrag}
          aria-label={t("dragToReorder")}
          className="shrink-0 cursor-grab touch-none text-secondary/60 hover:text-secondary"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
        {renaming ? (
          <>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="flex-1 rounded-md border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
            />
            <Button type="button" variant="secondary" onClick={() => setRenaming(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="primary" onClick={saveTitle}>
              {t("save")}
            </Button>
          </>
        ) : (
          <>
            <h2 className="min-w-0 flex-1 truncate font-heading text-sm font-semibold text-primary">
              {module.title}
            </h2>
            <button
              type="button"
              onClick={() => setRenaming(true)}
              aria-label={t("editModule")}
              className="shrink-0 rounded-md p-1.5 text-secondary hover:bg-border/40 hover:text-primary"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label={t("deleteModule")}
              className="shrink-0 rounded-md p-1.5 text-secondary hover:bg-border/40 hover:text-card-red"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col divide-y divide-border px-4">
        {module.lessons.map((lesson) => (
          <LessonEditRow
            key={lesson.id}
            lesson={lesson}
            registerRow={registerRow(lesson.id)}
            startDrag={startDrag(lesson.id)}
            dragClass={dragRowClass(lesson.id, draggedId, overId)}
            onChange={updateLesson}
            onDelete={() => removeLesson(lesson.id)}
          />
        ))}
      </div>

      <div className="p-4 pt-3">
        {addingLesson ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              autoFocus
              placeholder={t("lessonTitlePlaceholder")}
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            />
            <Button type="button" variant="secondary" onClick={() => setAddingLesson(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="primary" onClick={handleAddLesson}>
              {t("addLesson")}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingLesson(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 font-ui text-sm text-secondary hover:border-accent/40 hover:text-accent"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("addLesson")}
          </button>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={t("confirmDeleteModule")}
          confirmLabel={t("deleteModule")}
          cancelLabel={t("cancel")}
          onConfirm={() => {
            onModuleDelete();
            deleteModuleAction(module.id);
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
