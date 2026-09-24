"use client";

import { useTranslations, useFormatter } from "next-intl";

export function TopicMetricTiles({
  dueToday,
  retentionPercent,
  nextReviewAt,
  lapsesThisWeek,
  now,
}: {
  dueToday: number;
  retentionPercent: number | null;
  nextReviewAt: string | null;
  lapsesThisWeek: number;
  // Hydration-safe "now" (TopicPageClient.tsx) — relativeTime renders
  // "—" until it's set rather than falling back to an unanchored
  // Date.now() that can disagree between server and client.
  now: Date | null;
}) {
  const t = useTranslations("flashcards");
  const format = useFormatter();

  const tiles = [
    { label: t("dueToday"), value: String(dueToday) },
    { label: t("retentionHere"), value: retentionPercent === null ? "—" : `${retentionPercent}%` },
    {
      label: t("nextReview"),
      value: nextReviewAt && now ? format.relativeTime(new Date(nextReviewAt), now) : "—",
    },
    { label: t("lapsesThisWeek"), value: String(lapsesThisWeek) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4">
          <span className="font-heading text-xl font-black text-navy">{tile.value}</span>
          <span className="font-ui text-[11px] font-bold text-secondary uppercase">{tile.label}</span>
        </div>
      ))}
    </div>
  );
}
