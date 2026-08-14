"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { QuestionCategory } from "@/lib/question-bank";
import { NewQuestionSetDrawer } from "./NewQuestionSetDrawer";

// Small client wrapper so a server-rendered category page can still
// offer the "New Question Set" trigger + drawer without becoming a
// client component itself.
export function NewQuestionSetButton({
  categories,
  defaultCategoryId,
}: {
  categories: QuestionCategory[];
  defaultCategoryId: string | null;
}) {
  const t = useTranslations("questionBank");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-2 font-ui text-sm font-medium text-white hover:bg-accent-hover"
      >
        <Plus className="size-4" aria-hidden="true" />
        {t("newSet")}
      </button>
      <NewQuestionSetDrawer
        open={open}
        onClose={() => setOpen(false)}
        categories={categories}
        defaultCategoryId={defaultCategoryId}
      />
    </>
  );
}
