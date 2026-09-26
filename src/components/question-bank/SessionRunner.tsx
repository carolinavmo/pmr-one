"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Flag, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { recordAttemptAction, toggleQuestionFlagAction } from "@/lib/actions/question-bank";
import { advanceSessionAction, finishSessionAction } from "@/lib/actions/question-bank-session";
import type { SessionRunnerData } from "@/lib/question-bank-session";
import { SessionResults } from "./SessionResults";

// QBANK-IMPLEMENTATION.md Pass 4/5 — the answering screen.
// "No navbar, no sidebar" (SidebarFrame.tsx/NavbarFrame.tsx both opt
// out for /question-bank/session/*). A leaner build than Pass 5's full
// mockup (distractor share %, source panel, Add-to-flashcards/Note/
// Report) — this pass is "the session engine," so it covers the
// engine's own rules precisely (submit and next are two actions, a
// wrong answer everywhere, resume-exact) with the existing
// QuestionRunner's visual language rather than the redesigned column.
//
// Every render is driven by `data`, freshly fetched server-side for
// the session's current position — advancing calls router.refresh()
// rather than holding "the next question" in client state, so a
// reload or a second device always lands on the same server truth
// (session.position), which is the whole point of Resume being exact.
export function SessionRunner({ data }: { data: SessionRunnerData }) {
  const t = useTranslations("questionBank");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const { session, items, current } = data;
  const total = items.length;
  const correctSoFar = items.filter((i) => i.status === "correct").length;
  const wrongSoFar = items.filter((i) => i.status === "incorrect").length;
  const isTutor = session.mode === "tutor";
  const isTimed = session.mode === "timed";

  // Timed mode's countdown — client-only, reset whenever the session
  // (not the question) changes; a reload mid-session restarts the
  // clock from the full budget rather than trying to persist an exact
  // remaining-seconds value server-side, which QBANK-SPEC.md doesn't
  // ask for.
  useEffect(() => {
    if (!isTimed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: resets the countdown when a new session mounts, not a derivable render value
    setSecondsLeft(total * 45);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed on the session id, not `total`
  }, [session.id]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleFinish();
      return;
    }
    const timeout = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  if (!current) {
    return <SessionResults session={session} items={items} />;
  }

  const reveal = current.reveal;
  const alreadyAnswered = current.yourAttempt !== null;
  // Exam/timed modes withhold the reveal until the session ends, even
  // though the attempt is written immediately (so accuracy/streak stay
  // live everywhere else) — "exam mode explains at the end."
  const showReveal = isTutor && (reveal !== null || submitted);
  const effectiveSelected = selectedOptionId ?? current.yourAttempt?.selectedOptionId ?? null;

  function handleExit() {
    router.push("/question-bank");
  }

  function handleFlag() {
    startTransition(async () => {
      const isFlagged = await toggleQuestionFlagAction(current!.id);
      setFlagged(isFlagged);
    });
  }

  function handleSubmit() {
    if (!effectiveSelected || isPending) return;
    startTransition(async () => {
      await recordAttemptAction(current!.id, effectiveSelected);
      setSubmitted(true);
      if (!isTutor) {
        // Exam/timed: no reveal shown now — just move on immediately,
        // same as pressing "Next" right after submitting.
        await goNext();
      }
    });
  }

  async function goNext() {
    const nextPosition = session.position + 1;
    if (nextPosition >= total) {
      await handleFinish();
      return;
    }
    await advanceSessionAction(session.id, nextPosition);
    setSelectedOptionId(null);
    setSubmitted(false);
    router.refresh();
  }

  function handleNext() {
    startTransition(goNext);
  }

  function handleSkip() {
    startTransition(goNext);
  }

  async function handleFinish() {
    await finishSessionAction(session.id);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-sunken">
      <div className="flex items-center gap-4 border-b border-border bg-surface px-5 py-3">
        <button type="button" onClick={handleExit} aria-label={t("exitSession")} className="flex size-8 items-center justify-center rounded-full text-secondary hover:bg-border/40">
          <X className="size-4" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-sm font-bold text-navy">{current.setName}</p>
          <p className="font-ui text-xs text-secondary">{t(`sessionMode_${session.mode}` as "sessionMode_tutor")}</p>
        </div>
        <span className="shrink-0 font-ui text-sm font-bold text-secondary tabular-nums">{t("questionOf", { current: session.position + 1, total })}</span>
        {isTimed && secondsLeft !== null && (
          <span className={`shrink-0 font-ui text-sm font-black tabular-nums ${secondsLeft < 60 ? "text-warning" : "text-navy"}`}>
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </span>
        )}
        <span className="shrink-0 font-ui text-xs font-bold text-trust">{correctSoFar} ✓</span>
        <span className="shrink-0 font-ui text-xs font-bold text-warning">{wrongSoFar} ✗</span>
        <button
          type="button"
          onClick={handleFlag}
          aria-label={t("flagQuestion")}
          aria-pressed={flagged}
          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${flagged ? "text-insight" : "text-secondary hover:bg-border/40"}`}
        >
          <Flag className="size-4" aria-hidden="true" fill={flagged ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="h-[5px] w-full bg-border/40">
        <div className="h-[5px] bg-accent transition-all duration-base" style={{ width: `${((session.position + 1) / total) * 100}%` }} />
      </div>

      <div className="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-6 px-5 py-8 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <p className="font-ui text-[23px] leading-[1.5] text-primary">{current.prompt}</p>

          <div className="flex flex-col gap-2.5">
            {current.options.map((option, i) => {
              const letter = String.fromCharCode(65 + i);
              const isSelected = effectiveSelected === option.id;
              const isCorrectOption = showReveal && reveal?.correctOptionId === option.id;
              const isWrongSelected = showReveal && isSelected && !isCorrectOption;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => !alreadyAnswered && !submitted && setSelectedOptionId(option.id)}
                  disabled={alreadyAnswered || submitted || isPending}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3.5 text-left font-ui text-[15px] transition-colors duration-base ${
                    isCorrectOption
                      ? "border-trust bg-trust/10"
                      : isWrongSelected
                        ? "border-warning bg-warning/10"
                        : isSelected
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/40"
                  }`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-ui text-sm font-bold ${
                      isCorrectOption ? "border-trust bg-trust/15 text-trust" : isWrongSelected ? "border-warning bg-warning/15 text-warning" : isSelected ? "border-accent text-accent" : "border-border text-secondary"
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="min-w-0 flex-1 text-primary">{option.label}</span>
                  {isCorrectOption && <Check className="size-4 shrink-0 text-trust" aria-hidden="true" />}
                  {isWrongSelected && <X className="size-4 shrink-0 text-warning" aria-hidden="true" />}
                  <span className="shrink-0 font-ui text-xs text-secondary">{i + 1}</span>
                </button>
              );
            })}
          </div>

          {showReveal && reveal && (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${current.yourAttempt?.isCorrect ? "bg-trust/15 text-trust" : "bg-warning/15 text-warning"}`}>
                  {current.yourAttempt?.isCorrect ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
                </span>
                <span className={`font-ui text-sm font-bold ${current.yourAttempt?.isCorrect ? "text-trust" : "text-warning"}`}>{current.yourAttempt?.isCorrect ? t("correct") : t("incorrect")}</span>
              </div>
              {reveal.explanation && <p className="font-ui text-sm text-secondary">{reveal.explanation}</p>}
              {Object.values(reveal.optionRationales).some(Boolean) && (
                <div>
                  <p className="font-ui text-xs font-bold text-warning">{t("whyOthersIncorrect")}</p>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {current.options.map((option, i) => {
                      const rationale = reveal.optionRationales[option.id];
                      if (!rationale || option.id === reveal.correctOptionId) return null;
                      return (
                        <li key={option.id} className="flex items-start gap-2 font-ui text-sm text-secondary">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-warning/15 font-ui text-xs font-bold text-warning">{String.fromCharCode(65 + i)}</span>
                          <span>{rationale}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {!alreadyAnswered && !submitted && (
              <button type="button" onClick={handleSkip} disabled={isPending} className="font-ui text-sm font-bold text-secondary hover:text-primary disabled:opacity-60">
                {t("skipForNow")}
              </button>
            )}
            {alreadyAnswered || submitted ? (
              <button type="button" onClick={handleNext} disabled={isPending} className="rounded-xl bg-navy px-6 py-3 font-ui text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
                {session.position + 1 >= total ? t("viewResults") : t("nextQuestion")}
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={!effectiveSelected || isPending} className="rounded-xl bg-navy px-6 py-3 font-ui text-sm font-bold text-white hover:opacity-90 disabled:opacity-40">
                {t("submitAnswer")}
              </button>
            )}
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-[220px]">
          <p className="mb-2 font-ui text-[10px] font-black tracking-[1.3px] text-secondary uppercase">{t("questionMap")}</p>
          <div className="grid grid-cols-5 gap-1.5 lg:grid-cols-4">
            {items.map((item) => {
              const isCurrent = item.position === session.position;
              const bg = isCurrent ? "bg-navy text-white" : item.status === "correct" ? "bg-trust/20 text-trust" : item.status === "incorrect" ? "bg-warning/20 text-warning" : "bg-border/40 text-secondary";
              return (
                <button
                  key={item.questionId}
                  type="button"
                  onClick={() => startTransition(async () => {
                    await advanceSessionAction(session.id, item.position);
                    setSelectedOptionId(null);
                    setSubmitted(false);
                    router.refresh();
                  })}
                  className={`flex size-9 items-center justify-center rounded-lg font-ui text-xs font-bold ${bg}`}
                >
                  {item.position + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
