"use client";

import { useTranslations, useFormatter } from "next-intl";
import type { DashboardProgress } from "@/lib/flashcards";
import { KnownPercentRing } from "./KnownPercentRing";

const KNOWN_GREEN = "#4FBF86";
const HEATMAP_LEVELS = ["#EEF1F5", "#CFEDE6", "#8FDCCB", "#3FC9A9", "#17BF9A"];
const STUDY_DAYS_WINDOW = 84;
const REVIEW_VOLUME_WEEKS = 16;

function heatmapLevel(count: number): string {
  if (count === 0) return HEATMAP_LEVELS[0];
  if (count <= 2) return HEATMAP_LEVELS[1];
  if (count <= 5) return HEATMAP_LEVELS[2];
  if (count <= 9) return HEATMAP_LEVELS[3];
  return HEATMAP_LEVELS[4];
}

// "Your progress" (FLASHCARDS-SPEC.md "The dashboard — final order")
// — three panels answering three questions: what do I know, how much
// do I study, how well does it stick. Each panel hides itself when
// there isn't enough data to answer its question rather than showing
// a fabricated zero (FLASHCARDS-DASHBOARD-STATES.md rule 1); the
// whole section hides when all three do.
export function FlashcardsProgressPanels({ progress, now }: { progress: DashboardProgress; now: Date | null }) {
  const t = useTranslations("flashcards");
  const format = useFormatter();
  const { whatYouKnow, reviewVolume, retention } = progress;

  if (!whatYouKnow && !reviewVolume && !retention) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2.5">
        <h2 className="font-heading text-lg font-black text-navy">{t("yourProgress")}</h2>
        {retention?.firstStudyDay && now && (
          <span className="font-ui text-xs font-bold text-secondary">
            {t("progressSinceStarted", { time: format.relativeTime(new Date(`${retention.firstStudyDay}T00:00:00Z`), now) })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {whatYouKnow && <WhatYouKnowPanel data={whatYouKnow} />}
        {reviewVolume && <ReviewVolumePanel data={reviewVolume} />}
        {retention && <RetentionPanel data={retention} />}
      </div>
    </div>
  );
}

function WhatYouKnowPanel({ data }: { data: NonNullable<DashboardProgress["whatYouKnow"]> }) {
  const t = useTranslations("flashcards");
  const barWidth = Math.min(100, Math.round((data.knownCount / data.milestoneTarget) * 100));

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-4">
      <span className="font-ui text-[9.5px] font-black tracking-[1.3px] text-secondary uppercase">{t("panelWhatYouKnow")}</span>

      <div className="flex items-center gap-4">
        <KnownPercentRing percent={data.knownPercent} size={104} sublabel={t("known")} strokeColor={KNOWN_GREEN} />
        <div className="flex flex-col gap-1">
          <span className="font-heading text-[19px] font-black text-navy">{t("cardsKnownOfTotal", { known: data.knownCount, total: data.totalCards })}</span>
          <span className="font-ui text-[12.5px] text-secondary">{t("cardsKnownLabel")}</span>
          {data.knownThisMonth > 0 && (
            <span className="font-ui text-xs font-bold" style={{ color: KNOWN_GREEN }}>
              {t("knownTrendUp", { count: data.knownThisMonth })}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-t border-[#F0F2F5] pt-3">
        <div>
          <span className="block font-heading text-[17px] font-black text-navy">{data.learningCount}</span>
          <span className="font-ui text-[11px] font-bold text-secondary">{t("progressLearningLabel")}</span>
        </div>
        <div>
          <span className="block font-heading text-[17px] font-black text-navy">{data.notStartedCount}</span>
          <span className="font-ui text-[11px] font-bold text-secondary">{t("progressNotStartedLabel")}</span>
        </div>
      </div>

      <div className="border-t border-[#F0F2F5] pt-3">
        <span className="mb-1.5 block font-ui text-[9.5px] font-black tracking-[1.3px] text-secondary uppercase">{t("nextMilestone")}</span>
        <span className="font-ui text-[13.5px] font-extrabold text-navy">{t("milestoneCardsKnown", { count: data.milestoneTarget })}</span>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#EEF1F5]">
          <div className="h-2 rounded-full" style={{ width: `${barWidth}%`, backgroundColor: KNOWN_GREEN }} />
        </div>
        <span className="mt-1.5 block font-ui text-[11.5px] font-bold text-secondary">
          {t("milestoneProgress", { count: data.milestoneRemaining, sessions: data.milestoneSessions })}
        </span>
      </div>
    </div>
  );
}

function ReviewVolumePanel({ data }: { data: NonNullable<DashboardProgress["reviewVolume"]> }) {
  const t = useTranslations("flashcards");
  const format = useFormatter();
  const max = Math.max(1, ...data.weeklyCounts);
  const bestWeekday =
    data.bestWeekdayIndex === null
      ? null
      : format.dateTime(new Date(Date.UTC(2024, 0, 7 + data.bestWeekdayIndex)), { weekday: "short" });

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-4">
      <span className="font-ui text-[9.5px] font-black tracking-[1.3px] text-secondary uppercase">{t("panelReviewVolume", { count: REVIEW_VOLUME_WEEKS })}</span>

      <div className="flex h-[72px] items-end gap-[3px]">
        {data.weeklyCounts.map((count, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${Math.max(4, (count / max) * 100)}%`, backgroundColor: i === data.weeklyCounts.length - 1 ? "var(--color-acc)" : "var(--color-acc-dk)" }}
          />
        ))}
      </div>
      <div className="flex justify-between font-ui text-[10.5px] font-bold text-secondary">
        <span>{t("weeksAgoAxis", { count: REVIEW_VOLUME_WEEKS })}</span>
        <span>{t("thisWeekAxis")}</span>
      </div>

      <div className="flex gap-4 border-t border-[#F0F2F5] pt-3">
        <div>
          <span className="block font-heading text-[17px] font-black text-navy">{data.totalReviews.toLocaleString()}</span>
          <span className="font-ui text-[11px] font-bold text-secondary">{t("reviewsTotalStat", { count: data.totalReviews })}</span>
        </div>
        <div>
          <span className="block font-heading text-[17px] font-black text-navy">{data.weeklyAverage}</span>
          <span className="font-ui text-[11px] font-bold text-secondary">{t("reviewsWeeklyAvgStat", { count: data.weeklyAverage })}</span>
        </div>
        {bestWeekday && (
          <div>
            <span className="block font-heading text-[17px] font-black text-navy">{bestWeekday}</span>
            <span className="font-ui text-[11px] font-bold text-secondary">{t("reviewsBestDayStat")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function RetentionPanel({ data }: { data: NonNullable<DashboardProgress["retention"]> }) {
  const t = useTranslations("flashcards");
  // Column-major: each group of 7 consecutive days is one week, oldest
  // week first — STUDY_DAYS_WINDOW is exactly 12 * 7, so every column
  // is a full week (no partial-week filler needed).
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < data.studyDayCounts.length; i += 7) {
    weeks.push(data.studyDayCounts.slice(i, i + 7));
  }
  const hasStreakData = data.currentStreak > 0 || data.bestStreak > 0 || data.daysStudiedOutOf84 > 0;

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-4">
      <span className="font-ui text-[9.5px] font-black tracking-[1.3px] text-secondary uppercase">{t("panelRetention")}</span>

      {data.retentionPercent !== null && (
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-[34px] font-black tracking-tight text-navy">{data.retentionPercent}%</span>
            {data.retentionChangePts !== null && data.retentionChangePts !== 0 && (
              <span className="font-ui text-xs font-extrabold" style={{ color: "var(--color-trust)" }}>
                {data.retentionChangePts > 0
                  ? t("retentionChangeUp", { count: data.retentionChangePts })
                  : t("retentionChangeDown", { count: Math.abs(data.retentionChangePts) })}
              </span>
            )}
          </div>
          <p className="mt-0.5 font-ui text-xs text-secondary">{t("retentionOverLast30")}</p>
        </div>
      )}

      {hasStreakData && (
        <div className={data.retentionPercent !== null ? "border-t border-[#F0F2F5] pt-3" : undefined}>
          <span className="mb-2 block font-ui text-[9.5px] font-black tracking-[1.3px] text-secondary uppercase">
            {t("studyDaysHeading", { count: STUDY_DAYS_WINDOW / 7 })}
          </span>
          <div className="flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => (
                  <div key={day.date} className="size-[13px] rounded-[4px]" style={{ backgroundColor: heatmapLevel(day.count) }} title={day.date} />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1 font-ui text-[10.5px] font-bold text-secondary">
            <span>{t("heatmapLess")}</span>
            {HEATMAP_LEVELS.map((color) => (
              <span key={color} className="size-[11px] rounded-[3px]" style={{ backgroundColor: color }} />
            ))}
            <span>{t("heatmapMore")}</span>
          </div>
          <p className="mt-2.5 font-ui text-[12.5px] font-bold text-secondary">
            {t("streakSummary", { streak: data.currentStreak, best: data.bestStreak, days: data.daysStudiedOutOf84, window: STUDY_DAYS_WINDOW })}
          </p>
        </div>
      )}
    </div>
  );
}
