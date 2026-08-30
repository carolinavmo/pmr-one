"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createCourseAction } from "@/lib/actions/courses";
import { Button } from "@/components/ui/Button";

// Structurally modeled on NewDeckDrawer.tsx — a course title is short
// structured input, not long-form notes, so a plain form is the right
// shape here. Unlike a deck, a new course has no color to pick (no
// per-course color field in this schema); the cover image and
// description are added afterward on the course detail page.
export function NewCourseDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("courses");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTitle("");
  }

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function handleSubmit() {
    if (!title.trim()) return;
    startTransition(async () => {
      const course = await createCourseAction(title);
      onClose();
      router.push(`/courses/${course.slug}`);
    });
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />}

      <aside
        aria-label={t("newCourseTitle")}
        className={`fixed top-0 right-0 z-50 flex h-full w-96 max-w-[90vw] flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-5 shadow-xl transition-transform duration-base ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-primary">{t("newCourseTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("cancel")}
            className="rounded-full p-1.5 text-secondary hover:bg-border/40 hover:text-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("courseTitleLabel")}</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
        </label>

        <div className="mt-auto flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={isPending || !title.trim()}>
            {isPending ? t("creating") : t("createCourse")}
          </Button>
        </div>
      </aside>
    </>
  );
}
