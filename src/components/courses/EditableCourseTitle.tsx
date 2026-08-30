"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, X } from "lucide-react";
import { renameCourseAction } from "@/lib/actions/courses";

// Mirrors EditableDeckName.tsx exactly — only rendered once the
// caller has already confirmed isEditor.
export function EditableCourseTitle({ courseId, initialTitle }: { courseId: string; initialTitle: string }) {
  const t = useTranslations("courses");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [draft, setDraft] = useState(initialTitle);
  const [isPending, startTransition] = useTransition();

  function startEdit() {
    setDraft(title);
    setEditing(true);
  }

  function handleSave() {
    const trimmed = draft.trim() || "Untitled course";
    setTitle(trimmed);
    setEditing(false);
    startTransition(() => {
      renameCourseAction(courseId, trimmed);
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          disabled={isPending}
          className="border-b border-accent bg-transparent font-heading text-2xl text-primary outline-none"
        />
        <button
          type="button"
          onClick={handleSave}
          aria-label={t("save")}
          className="flex size-7 items-center justify-center rounded-full text-accent hover:bg-border/40"
        >
          <Check className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label={t("cancel")}
          className="flex size-7 items-center justify-center rounded-full text-secondary hover:bg-border/40"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="font-heading text-2xl text-primary">{title}</h1>
      <button
        type="button"
        onClick={startEdit}
        aria-label={t("renameCourse")}
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-border/40 hover:text-primary"
      >
        <Pencil className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
