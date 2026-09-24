import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ForecastDay } from "@/lib/flashcards";

const SPLIT_COLORS = { new: "#E8564B", learning: "#0E9BA6", review: "#4FBF86" } as const;

// "TODAY'S SESSION" navy panel (FLASHCARDS-IMPLEMENTATION.md Pass 4) —
// solid bg-navy-fill, same fill token callouts.tsx's KeyNumbersCallout
// already uses for "figures worth memorising", reused here since a
// due count + time estimate is exactly that. "Start review" links to
// /flashcards/study with no deck/topic param — getStudyCardsForAccount
// pulls every due card across every deck the user can reach, so this
// is the one entry point with no single deck/topic to scope to.
// FLASHCARDS-SPEC.md rule 2, "never offer a session that doesn't
// exist": the button is replaced by an up-to-date message at dueToday
// === 0 rather than linking to an empty session.
export function FlashcardsSessionPanel({
  dueToday,
  estimatedMinutes,
  newCount,
  learningCount,
  reviewCount,
  forecast,
}: {
  dueToday: number;
  estimatedMinutes: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  forecast: ForecastDay[];
}) {
  const t = useTranslations("flashcards");
  const locale = useLocale();
  const dayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }), [locale]);
  const maxForecast = Math.max(1, ...forecast.map((d) => d.count));

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-navy-fill p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-[11px] font-black tracking-[1.6px] text-[#7FCBD1] uppercase">{t("todaysSession")}</span>
          <span className="font-heading text-[34px] leading-none font-black text-white">
            {dueToday > 0 ? t("dueCardsHeadline", { count: dueToday, minutes: estimatedMinutes }) : t("studyUpToDate")}
          </span>
          <div className="mt-1 flex items-center gap-4 font-ui text-xs font-bold text-white/70">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: SPLIT_COLORS.new }} />
              {t("studyStateNew")} {newCount}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: SPLIT_COLORS.learning }} />
              {t("studyStateLearning")} {learningCount}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: SPLIT_COLORS.review }} />
              {t("studyStateReview")} {reviewCount}
            </span>
          </div>
        </div>

        {dueToday > 0 && (
          <Link
            href="/flashcards/study"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 font-ui text-sm font-bold text-navy hover:bg-white/90"
          >
            <Play className="size-3.5" aria-hidden="true" />
            {t("startReview")}
          </Link>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-white/10 pt-4">
        {forecast.map((day) => {
          const date = new Date(`${day.date}T00:00:00Z`);
          const label = dayFormatter.format(date);
          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-14 w-full items-end">
                <div
                  className="w-full rounded-t-sm bg-white/25"
                  style={{ height: `${Math.max(4, (day.count / maxForecast) * 100)}%` }}
                  title={String(day.count)}
                />
              </div>
              <span className="font-ui text-[10px] font-bold text-white/50 uppercase">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
