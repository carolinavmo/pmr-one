"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  updateCourseDescriptionAction,
  publishCourseAction,
  unpublishCourseAction,
  deleteCourseAction,
} from "@/lib/actions/courses";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Editor-only: description textarea (blurs to save, same idiom
// RichEditableText's onSave-on-blur uses elsewhere) plus publish/
// unpublish and delete-course controls. Only rendered once the caller
// has already confirmed isEditor.
export function CourseHeaderControls({
  courseId,
  initialDescription,
  status,
}: {
  courseId: string;
  initialDescription: string;
  status: "draft" | "published";
}) {
  const t = useTranslations("courses");
  const router = useRouter();
  const [description, setDescription] = useState(initialDescription);
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={() => updateCourseDescriptionAction(courseId, description)}
        rows={2}
        placeholder={t("courseDescriptionPlaceholder")}
        className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
      />
      <div className="flex items-center gap-2">
        {status === "draft" ? (
          <Button
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={() => startTransition(() => publishCourseAction(courseId))}
          >
            {t("publishCourse")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => startTransition(() => unpublishCourseAction(courseId))}
          >
            {t("unpublishCourse")}
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={() => setConfirmDelete(true)}>
          {t("deleteCourse")}
        </Button>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={t("confirmDeleteCourse")}
          confirmLabel={t("deleteCourse")}
          cancelLabel={t("cancel")}
          onConfirm={async () => {
            await deleteCourseAction(courseId);
            router.push("/courses");
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
