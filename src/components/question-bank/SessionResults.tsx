"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { QuestionSessionSummary, SessionMapItem } from "@/lib/question-bank-session";

// End-of-session summary — a smaller slice of Pass 6 ("end of session
// and statistics"), just enough to land somewhere coherent once
// SessionRunner's `current` goes null. Full Pass 6 (accuracy by topic
// within the session, two next actions) comes later.
export function SessionResults({ session, items }: { session: QuestionSessionSummary; items: SessionMapItem[] }) {
  const t = useTranslations("questionBank");
  const total = items.length;
  const correct = items.filter((i) => i.status === "correct").length;
  const wrong = items.filter((i) => i.status === "incorrect").length;
  const unseen = total - correct - wrong;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface-sunken px-4 py-10">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="font-heading text-5xl font-black text-navy">{percent}%</span>
        <p className="font-ui text-sm font-bold text-navy">{t("sessionCompleteScore", { correct, total })}</p>
        <p className="font-ui text-xs text-secondary">{t(`sessionMode_${session.mode}` as "sessionMode_tutor")}</p>
      </div>
      <div className="flex items-center gap-6 rounded-xl border border-border bg-surface px-6 py-4">
        <Stat value={correct} label={t("correctLabel")} color="text-trust" />
        <Stat value={wrong} label={t("incorrectLabel")} color="text-warning" />
        <Stat value={unseen} label={t("unansweredLabel")} color="text-secondary" />
      </div>
      <Link href="/question-bank" className="rounded-lg bg-accent px-5 py-2.5 font-ui text-sm font-bold text-white hover:bg-accent-hover">
        {t("goToQuestionBank")}
      </Link>
    </div>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`font-heading text-xl font-black ${color}`}>{value}</span>
      <span className="font-ui text-[11px] text-secondary">{label}</span>
    </div>
  );
}
