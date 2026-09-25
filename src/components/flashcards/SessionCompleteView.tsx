"use client";

import { useTranslations } from "next-intl";
import type { SessionLogEntry } from "./StudySession";
import { KnownPercentRing } from "./KnownPercentRing";

function formatDuration(ms: number, t: ReturnType<typeof useTranslations>): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? t("studyDurationMinSec", { minutes, seconds }) : t("studyDurationSec", { seconds });
}

export function SessionCompleteView({
  log,
  elapsedMs,
  streak,
  knownBefore,
  knownAfter,
  onBack,
}: {
  log: SessionLogEntry[];
  elapsedMs: number;
  streak: number | null;
  knownBefore: number | null;
  knownAfter: number | null;
  onBack: () => void;
}) {
  const t = useTranslations("flashcards");

  const total = log.length;
  // "Correct" = didn't forget it — hard/good/easy all mean the card
  // was recalled, only "again" is a lapse. Same split Pass 3's topic
  // retention (`getTopicRetention`) and "lapses" use, so this session's
  // own accuracy number means the same thing as the dashboard's.
  const correct = log.filter((e) => e.grade !== "again").length;
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
  const toSeeAgain = new Set(log.filter((e) => e.grade === "again" || e.grade === "hard").map((e) => e.cardId)).size;
  const knownDelta = knownBefore !== null && knownAfter !== null ? knownAfter - knownBefore : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface-sunken px-4 py-10">
      <KnownPercentRing percent={accuracy} size={128} />

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-ui text-sm font-bold text-primary">{t("studyCardsDoneIn", { count: total, time: formatDuration(elapsedMs, t) })}</p>
        {knownDelta !== null && knownAfter !== null && (
          <p className="font-ui text-sm text-secondary">
            {knownDelta === 0
              ? t("studyKnownNowFlat", { percent: knownAfter })
              : knownDelta > 0
                ? t("studyKnownNowUp", { percent: knownAfter, points: knownDelta })
                : t("studyKnownNowDown", { percent: knownAfter, points: Math.abs(knownDelta) })}
          </p>
        )}
      </div>

      <div className="flex items-center gap-6 rounded-xl border border-border bg-surface px-6 py-4">
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-heading text-xl font-black text-trust">{correct}</span>
          <span className="font-ui text-[11px] text-secondary">{t("studyCorrect")}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-heading text-xl font-black" style={{ color: "#E8564B" }}>
            {toSeeAgain}
          </span>
          <span className="font-ui text-[11px] text-secondary">{t("studySeeAgainToday")}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-heading text-xl font-black text-accent">{streak ?? "—"}</span>
          <span className="font-ui text-[11px] text-secondary">{t("studyStreak")}</span>
        </div>
      </div>

      <button type="button" onClick={onBack} className="rounded-lg bg-accent px-5 py-2.5 font-ui text-sm font-bold text-white">
        {t("studyBackToDeck")}
      </button>
    </div>
  );
}
