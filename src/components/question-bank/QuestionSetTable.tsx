"use client";

import { useTranslations } from "next-intl";
import { ListChecks } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { QuestionSetSummary } from "@/lib/question-bank";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import { DifficultyDots } from "./QuestionSetCard";
import { StartSetButton } from "./StartSetButton";

// Table layout for a folder's question sets, mirroring the reference
// screenshot's index table. Scoped to one folder already (this renders
// under a single category page), so there's no "System" column here —
// that column's job is done by the folder itself.
export function QuestionSetTable({ sets }: { sets: QuestionSetSummary[] }) {
  const t = useTranslations("questionBank");

  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse font-ui text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised text-left text-[11px] tracking-wide text-secondary uppercase">
              <th className="px-4 py-2.5 font-medium">{t("columnQuestionSet")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("columnQuestions")}</th>
              <th className="px-4 py-2.5 font-medium">{t("difficultyLabel")}</th>
              <th className="px-4 py-2.5 font-medium">{t("statsYourScore")}</th>
              <th className="px-4 py-2.5 font-medium">{t("lastUsed")}</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sets.map((set) => (
              <tr key={set.id} className="border-b border-border last:border-0 hover:bg-surface-raised/60">
                <td className="px-4 py-3">
                  <Link href={`/question-bank/set/${set.id}`} className="flex items-center gap-3">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[set.color]}`}
                    >
                      <ListChecks className="size-4" aria-hidden="true" />
                    </span>
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate font-medium text-primary">{set.name}</span>
                      {set.description && (
                        <span className="truncate text-xs text-secondary">{set.description}</span>
                      )}
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right text-secondary tabular-nums">{set.questionCount}</td>
                <td className="px-4 py-3">
                  <DifficultyDots difficulty={set.difficulty} />
                </td>
                <td className="px-4 py-3">
                  {set.yourScore !== null ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium tabular-nums ${set.yourScore >= 70 ? "text-trust" : "text-card-red"}`}
                      >
                        {set.yourScore}%
                      </span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border/40">
                        <div
                          className={`h-full rounded-full ${set.yourScore >= 70 ? "bg-trust" : "bg-card-red"}`}
                          style={{ width: `${set.yourScore}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-secondary">
                  {set.lastAnsweredAt ? new Date(set.lastAnsweredAt).toLocaleDateString() : t("never")}
                </td>
                <td className="px-4 py-3 text-right">
                  <StartSetButton set={set} variant="table" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
