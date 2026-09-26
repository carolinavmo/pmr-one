"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { startSessionAction } from "@/lib/actions/question-bank-session";
import type { QuestionSessionSummary, SessionMode } from "@/lib/question-bank-session";
import { DEFAULT_SESSION_SIZE, SECONDS_PER_QUESTION } from "@/lib/question-bank-session-constants";

const MODES: SessionMode[] = ["tutor", "exam", "timed"];

// The dashboard's session panel (QBANK-IMPLEMENTATION.md Pass 2,
// deliberately left undone until Pass 4's session engine existed to
// back it — see Pass 2's own commit message). "Resume · Q12 of 20"
// when a session is open; otherwise the mode selector + Start, sized
// to the default session ("weakest first, then unseen, then weakest
// subject" — createSession's own "smart" build).
export function QuestionBankSessionPanel({ activeSession, notSeenCount }: { activeSession: QuestionSessionSummary | null; notSeenCount: number }) {
  const t = useTranslations("questionBank");
  const router = useRouter();
  const [mode, setMode] = useState<SessionMode>("tutor");
  const [isPending, startTransition] = useTransition();

  const size = Math.min(DEFAULT_SESSION_SIZE, Math.max(1, notSeenCount || DEFAULT_SESSION_SIZE));
  const estimatedMinutes = Math.round((size * SECONDS_PER_QUESTION) / 60);

  function handleStart() {
    startTransition(async () => {
      const sessionId = await startSessionAction(mode, { filter: "smart", size: DEFAULT_SESSION_SIZE });
      if (sessionId) router.push(`/question-bank/session/${sessionId}`);
    });
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-navy-fill p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-[11px] font-black tracking-[1.6px] text-[#7FCBD1] uppercase">{t("sessionPanelHeading")}</span>
          {activeSession ? (
            <span className="font-heading text-[34px] leading-none font-black text-white">{t("resumeQOfN", { current: activeSession.position + 1, total: activeSession.size })}</span>
          ) : (
            <span className="font-heading text-[34px] leading-none font-black text-white">{t("sessionSizeHeadline", { count: size, minutes: estimatedMinutes })}</span>
          )}
          {!activeSession && (
            <div className="mt-1 flex items-center gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-[10px] border px-3.5 py-2 font-ui text-xs font-bold ${
                    mode === m ? "border-white/50 bg-white/15 text-white" : "border-white/25 text-white/70 hover:text-white"
                  }`}
                >
                  {t(`sessionMode_${m}` as "sessionMode_tutor")}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={activeSession ? () => router.push(`/question-bank/session/${activeSession.id}`) : handleStart}
          disabled={isPending}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 font-ui text-sm font-bold text-navy hover:bg-white/90 disabled:opacity-70"
        >
          <Play className="size-3.5 fill-navy" aria-hidden="true" />
          {activeSession ? t("resume") : t("start")}
        </button>
      </div>
    </div>
  );
}
