"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useTranslations, useLocale } from "next-intl";
import { RotateCcw, Copy, Check, ExternalLink, TriangleAlert, ShieldAlert } from "lucide-react";
import type { Calculator, CalculatorItem } from "@/lib/clinical-tools";
import { scoreCalculator, resolveInterpretation } from "@/lib/calculator-scoring";

// A band's severity maps to one of this app's existing semantic color
// tokens — not the decorative CardColor palette (card-colors.ts),
// since "good"/"warning"/"serious"/"critical" are meanings, not
// author-chosen decoration, same distinction editorial-blocks.ts's own
// CardColor comment already draws. "serious" borrows the widened
// decorative palette's orange (no dedicated semantic token sits
// between insight/amber and warning/red); the other three map to this
// app's three real meaningful roles. Used as a solid fill for both the
// range-bar segments and the interpretation legend's dots.
const SEVERITY_FILL_CLASS: Record<string, string> = {
  good: "bg-trust",
  warning: "bg-insight",
  serious: "bg-card-orange",
  critical: "bg-warning",
};
const DEFAULT_SEVERITY_FILL_CLASS = "bg-border";

function itemMin(item: CalculatorItem) {
  return Math.min(...item.options.map((option) => option.value));
}
function itemMax(item: CalculatorItem) {
  return Math.max(...item.options.map((option) => option.value));
}

// Same red→orange→amber→green spectrum as the overall result bar's
// gradient, but sampled continuously per item (instead of bucketed into
// 4 flat severity colors) so "Score by item" reads as a smooth ramp —
// the ratio is relative to that item's own max, not the scale's, since
// items don't share a common point value (Barthel mixes 5/10/15-point
// items). color-mix() blends the theme's own CSS custom properties
// directly, so this stays correct in dark mode without any JS-side
// color math or hex duplication.
const GRADIENT_STOPS = ["var(--color-warning)", "var(--color-card-orange)", "var(--color-insight)", "var(--color-trust)"];

function itemFillStyle(value: number, max: number, descendingGood?: boolean): CSSProperties {
  if (max <= 0) return { backgroundColor: "var(--color-border)" };
  let ratio = Math.max(0, Math.min(1, value / max));
  if (descendingGood) ratio = 1 - ratio;
  // Biases the ramp toward green as it approaches a good result — a
  // plain linear interpolation reaches full green only at ratio 1,
  // which reads as too much amber/orange for scores that are already
  // mostly independent.
  const eased = Math.pow(ratio, 0.6);
  const segmentCount = GRADIENT_STOPS.length - 1;
  const scaled = eased * segmentCount;
  const segmentIndex = Math.min(Math.floor(scaled), segmentCount - 1);
  const localT = scaled - segmentIndex;
  const fromColor = GRADIENT_STOPS[segmentIndex];
  const toColor = GRADIENT_STOPS[segmentIndex + 1];
  return {
    backgroundColor: `color-mix(in srgb, ${toColor} ${localT * 100}%, ${fromColor})`,
  };
}

// The one generic engine every calculator (present and future) renders
// through — given a Calculator, it doesn't know or care whether the
// scale is a 10-category point-sum (Barthel), a single-select ordinal,
// or eventually a Likert-formula scale; scoreCalculator/
// resolveInterpretation (calculator-scoring.ts) handle that branching.
// Answers live in local state only — no persistence, no server round-
// trip, matching the reference site's own stateless behavior.
export function CalculatorRunner({ calculator }: { calculator: Calculator }) {
  const t = useTranslations("clinicalTools");
  const locale = useLocale();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // Tracked separately from answers (which stores the selected option's
  // point value, for scoring) because several items — e.g. Lawton-Brody's
  // housekeeping domain — have multiple options that share the same
  // value. Highlighting and React's list key both need to identify the
  // exact option clicked, not just its point value.
  const [selectedIndex, setSelectedIndex] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  // The shell's <header> is itself sticky and its height varies — it
  // wraps to extra rows below the `lg` breakpoint (and at any width, in
  // a longer-label locale), so no fixed Tailwind offset tracks it
  // correctly. Measuring it directly is the only robust way to stick
  // the progress bar right beneath it rather than under or far below it.
  const [stickyOffset, setStickyOffset] = useState(76);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const updateOffset = () => setStickyOffset(header.getBoundingClientRect().height + 8);
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const { items, calculationExplanation, source, resultNote, descendingGood } = calculator.definition;
  const answeredCount = Object.keys(answers).length;
  const totalCount = items.length;
  const percent = totalCount === 0 ? 0 : Math.round((answeredCount / totalCount) * 100);

  const score = scoreCalculator(calculator.definition, answers);
  const interpretation = score === null ? null : resolveInterpretation(calculator.definition, score);
  const bands = calculator.definition.interpretation ?? [];
  // resultNote is a fallback for scales with no discrete severity bands
  // (e.g. FIM) — same label/description shape as a band's interpretation,
  // but paired with a continuous gradient bar instead of colored segments.
  const interpretationDisplay = bands.length > 0 ? interpretation : (resultNote ?? null);

  // Derived from the items themselves by default — correct for every
  // "sum"-scored calculator so far, all of which start at 0. A
  // "formula"-scored calculator's result lives on a different scale
  // than its raw item values (e.g. DASH's 1-5 items produce a 0-100
  // result), so minScore/maxScore must be stated explicitly there.
  const scoreMin = calculator.definition.minScore ?? items.reduce((sum, item) => sum + itemMin(item), 0);
  const scoreMax = calculator.definition.maxScore ?? items.reduce((sum, item) => sum + itemMax(item), 0);
  const scoreRange = Math.max(scoreMax - scoreMin, 1);
  const pointerPercent =
    score === null ? null : Math.min(100, Math.max(0, ((score - scoreMin) / scoreRange) * 100));

  // Consecutive items sharing the same (optional) section collapse into
  // one subsection — Barthel authors no section on any item, so this
  // produces a single unlabeled group and renders as a flat list; a
  // domain-organized scale (e.g. FIM's 6 official subscales) gets real
  // subsections for free just by authoring item.section.
  const itemGroups: { section: string | null; items: CalculatorItem[] }[] = [];
  for (const item of items) {
    const key = item.section ?? null;
    const current = itemGroups[itemGroups.length - 1];
    if (current && current.section === key) {
      current.items.push(item);
    } else {
      itemGroups.push({ section: key, items: [item] });
    }
  }

  // The calculation detail names every item rather than showing a bare
  // arithmetic sum ("7 + 7 + ... = 126") — with 18 items sharing a 1-7
  // rubric, a flat list of numbers can't be matched back to the item it
  // came from, which defeats the point of a copyable clinical record.
  // domainTotals rolls sections up one level further (e.g. FIM's
  // Motor/Cognitive split above its 6 subscales) for the header line's
  // per-domain subtotal — only calculators that author item.domain get
  // this; everything else just gets a plain score line.
  const domainOrder: string[] = [];
  const domainTotals: Record<string, { score: number; max: number }> = {};
  for (const item of items) {
    if (!item.domain) continue;
    if (!domainTotals[item.domain]) {
      domainTotals[item.domain] = { score: 0, max: 0 };
      domainOrder.push(item.domain);
    }
    domainTotals[item.domain].score += answers[item.id] ?? 0;
    domainTotals[item.domain].max += itemMax(item);
  }

  type CalculationLine = { kind: "header" | "section" | "item"; text: string };
  const calculationLines: CalculationLine[] =
    score === null
      ? []
      : [
          {
            kind: "header",
            text:
              `${calculator.abbreviation ?? calculator.name} = ${score}/${scoreMax} ${t("calculationPointsLabel")}` +
              (domainOrder.length > 0
                ? ` (${domainOrder.map((domain) => `${domain}: ${domainTotals[domain].score}`).join(" | ")})`
                : ""),
          },
          ...itemGroups.flatMap((group) => [
            ...(group.section ? [{ kind: "section" as const, text: group.section }] : []),
            ...group.items.map((item) => ({
              kind: "item" as const,
              text: `${item.label}: ${answers[item.id] ?? 0}`,
            })),
          ]),
        ];
  const calculationCopyText = calculationLines
    .map((line) => (line.kind === "item" ? `- ${line.text}` : line.text))
    .join("\n");

  async function handleCopyCalculation() {
    if (calculationLines.length === 0) return;
    await navigator.clipboard.writeText(calculationCopyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Shared between the live result (with a pointer marking the current
  // score) and the always-visible "how to interpret" card (without one)
  // — same bar either way. Two fill modes: a segmented, severity-colored
  // bar when discrete bands are authored (segment widths use flex-grow
  // weights — item count, not raw percentages — so a single-value band
  // like Barthel's "100" still renders with a visible sliver instead of
  // collapsing to zero width); otherwise, for a resultNote-only scale
  // (e.g. FIM, which has no published cut-offs), a continuous gradient
  // across the same red→amber→green severity colors, since there's no
  // band structure to segment by.
  function renderRangeBar(withPointer: boolean) {
    const useGradient = bands.length === 0 && !!resultNote;
    return (
      <div className={withPointer ? "relative pt-6" : undefined}>
        {withPointer && pointerPercent !== null && (
          <div
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${pointerPercent}%` }}
          >
            <span className="rounded-md bg-primary px-1.5 py-0.5 font-ui text-[11px] font-semibold text-white tabular-nums">
              {score}
            </span>
            <span className="-mt-1 size-1.5 rotate-45 bg-primary" aria-hidden="true" />
          </div>
        )}
        {useGradient ? (
          <div
            className="h-3 overflow-hidden rounded-full"
            style={{
              background: `linear-gradient(to right, ${(descendingGood ? [...GRADIENT_STOPS].reverse() : GRADIENT_STOPS).join(", ")})`,
            }}
          />
        ) : (
          <div className="flex h-3 overflow-hidden rounded-full">
            {bands.map((band) => (
              <div
                key={`${band.min}-${band.max}-${band.label}`}
                style={{ flexGrow: Math.max(band.max - band.min + 1, 3) }}
                className={SEVERITY_FILL_CLASS[band.severity ?? ""] ?? DEFAULT_SEVERITY_FILL_CLASS}
              />
            ))}
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-between font-ui text-xs text-secondary">
          <span className="tabular-nums">{scoreMin}</span>
          <span className="tabular-nums">{scoreMax}</span>
        </div>
        {useGradient ? (
          <div className="flex items-center justify-between font-ui text-[11px] text-secondary/80">
            <span>{resultNote!.lowLabel}</span>
            <span>{resultNote!.highLabel}</span>
          </div>
        ) : (
          bands.length > 0 && (
            <div className="flex items-center justify-between font-ui text-[11px] text-secondary/80">
              <span>{bands[0].label}</span>
              <span>{bands[bands.length - 1].label}</span>
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {calculator.definition.proprietary && (
        <div className="flex items-start gap-3 rounded-xl border border-insight/30 bg-insight/5 p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-insight" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h3 className="font-ui text-sm font-semibold text-primary">{t("proprietaryNoticeHeading")}</h3>
            <p className="font-ui text-sm text-secondary">{t("proprietaryNoticeBody")}</p>
          </div>
        </div>
      )}

      {locale !== "en" && (
        <div className="flex items-start gap-3 rounded-xl border border-insight/30 bg-insight/5 p-4">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-insight" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h3 className="font-ui text-sm font-semibold text-primary">
              {t("unofficialTranslationHeading")}
            </h3>
            <p className="font-ui text-sm text-secondary">{t("unofficialTranslationBody")}</p>
          </div>
        </div>
      )}

      <div
        className="sticky z-[5] flex flex-col gap-2 rounded-xl border border-border/40 bg-surface-raised p-3.5 shadow-sm"
        style={{ top: stickyOffset }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-ui text-sm font-medium text-primary">
            {t("itemsAnswered", { answered: answeredCount, total: totalCount })}
          </span>
          <div className="flex items-center gap-3">
            <span className="font-ui text-sm font-medium text-primary tabular-nums">{percent}%</span>
            {answeredCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setSelectedIndex({});
                }}
                className="inline-flex items-center gap-1 font-ui text-xs font-medium text-secondary transition-colors duration-base hover:text-accent"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                {t("clearAnswers")}
              </button>
            )}
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border/50">
          <div
            className="h-full rounded-full bg-accent transition-all duration-base"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {items.map((item, index) => {
          const currentSelectedIndex = selectedIndex[item.id];
          return (
            <div key={item.id} className="flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-border/50 font-ui text-[11px] font-semibold text-secondary tabular-nums">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-ui text-sm font-semibold text-primary">{item.label}</h3>
                  {item.instructions && (
                    <p className="font-ui text-xs text-secondary">{item.instructions}</p>
                  )}
                </div>
              </div>
              {/* Scales with many options per item (e.g. FIM's 7-level
                  rubric) use a denser card so all options still fit on
                  one row instead of wrapping — everything else (max 5
                  options, e.g. Berg) keeps the original, more spacious
                  sizing unchanged. A numericScale item (SPADI/PRWE's
                  0-10 scales) skips the card layout entirely: every
                  option is just its own numeral, so it renders as one
                  non-wrapping row of small numbered buttons, with the
                  two endpoint descriptions (if any) shown once below
                  the row instead of repeated inside every button. */}
              {item.numericScale ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-1">
                    {item.options.map((option, optionIndex) => {
                      const isSelected = currentSelectedIndex === optionIndex;
                      return (
                        <button
                          key={optionIndex}
                          type="button"
                          onClick={() => {
                            setAnswers((current) => ({ ...current, [item.id]: option.value }));
                            setSelectedIndex((current) => ({ ...current, [item.id]: optionIndex }));
                          }}
                          className={`flex-1 rounded-md border py-1.5 text-center font-ui text-xs font-semibold tabular-nums transition-colors duration-base ${
                            isSelected
                              ? "border-accent bg-accent text-white"
                              : "border-border text-secondary hover:border-accent/50 hover:bg-border/10"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  {(item.options[0]?.description || item.options[item.options.length - 1]?.description) && (
                    <div className="flex items-center justify-between font-ui text-[11px] text-secondary/80">
                      <span>{item.options[0]?.description}</span>
                      <span>{item.options[item.options.length - 1]?.description}</span>
                    </div>
                  )}
                </div>
              ) : (
                (() => {
                  const isCompact = item.options.length >= 6;
                  return (
                    <div className={`flex flex-wrap ${isCompact ? "gap-1.5" : "gap-2"}`}>
                      {item.options.map((option, optionIndex) => {
                        const isSelected = currentSelectedIndex === optionIndex;
                        return (
                          <button
                            key={optionIndex}
                            type="button"
                            onClick={() => {
                              setAnswers((current) => ({ ...current, [item.id]: option.value }));
                              setSelectedIndex((current) => ({ ...current, [item.id]: optionIndex }));
                            }}
                            className={`flex flex-1 flex-col text-left transition-colors duration-base ${
                              isCompact ? "min-w-24 gap-0.5 rounded-md border p-2" : "min-w-36 gap-1 rounded-lg border p-3"
                            } ${
                              isSelected
                                ? "border-accent bg-accent/5"
                                : "border-border hover:border-accent/50 hover:bg-border/10"
                            }`}
                          >
                            <span
                              className={`inline-flex w-fit items-center rounded-full font-ui font-semibold tabular-nums ${
                                isCompact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
                              } ${isSelected ? "bg-accent text-white" : "bg-border/50 text-secondary"}`}
                            >
                              {t("pointsAbbrev", { value: option.value })}
                            </span>
                            <span className={`font-ui text-primary ${isCompact ? "text-xs" : "text-sm"}`}>
                              {option.label}
                            </span>
                            {option.description && (
                              <span className={`font-ui text-secondary ${isCompact ? "text-[10px]" : "text-xs"}`}>
                                {option.description}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
          );
        })}
      </div>

      {score !== null && (
        <div className="flex flex-col gap-4 rounded-xl border border-border/40 bg-surface-raised p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
            <div>
              <h3 className="font-ui text-xs font-semibold tracking-wide text-secondary uppercase">
                {t("resultHeading")}
              </h3>
              <p className="font-heading text-3xl font-semibold text-primary tabular-nums">
                {score}
                <span className="text-lg font-medium text-secondary">/{scoreMax}</span>
              </p>
            </div>
            {interpretationDisplay && (
              <div>
                <h3 className="font-ui text-xs font-semibold tracking-wide text-secondary uppercase">
                  {t("interpretationHeading")}
                </h3>
                <p className="font-ui text-base font-semibold text-primary">{interpretationDisplay.label}</p>
                {interpretationDisplay.description && (
                  <p className="font-ui text-sm text-secondary">{interpretationDisplay.description}</p>
                )}
              </div>
            )}
          </div>
          {(bands.length > 0 || resultNote) && renderRangeBar(true)}
        </div>
      )}

      {score !== null && (
        <div className="flex flex-col gap-4 rounded-xl border border-border/40 bg-surface-raised p-4">
          <h3 className="font-ui text-xs font-semibold tracking-wide text-secondary uppercase">
            {t("itemScoreHeading")}
          </h3>
          <div className="flex flex-col gap-5">
            {itemGroups.map((group, groupIndex) => {
              const groupMax = group.items.reduce((sum, item) => sum + itemMax(item), 0);
              const groupScore = group.items.reduce((sum, item) => sum + (answers[item.id] ?? 0), 0);
              return (
                <div key={groupIndex} className="flex flex-col gap-2">
                  {group.section && (
                    <div className="flex items-baseline justify-between font-ui text-sm font-semibold text-primary">
                      <span>{group.section}</span>
                      <span className="tabular-nums text-secondary">
                        {groupScore} / {groupMax}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    {group.items.map((item) => {
                      const value = answers[item.id] ?? 0;
                      const max = itemMax(item);
                      const itemPercent = max === 0 ? 0 : (value / max) * 100;
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          <span className="w-32 shrink-0 truncate font-ui text-sm text-primary" title={item.label}>
                            {item.label}
                          </span>
                          <div className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-border/50">
                            <div
                              className="h-full rounded-full transition-all duration-base"
                              style={{ width: `${itemPercent}%`, ...itemFillStyle(value, max, descendingGood) }}
                            />
                          </div>
                          <span className="w-6 shrink-0 text-right font-ui text-xs font-medium text-secondary tabular-nums">
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {calculationLines.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-surface-raised p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-ui text-xs font-semibold tracking-wide text-secondary uppercase">
              {t("calculationDetailHeading")}
            </h3>
            <button
              type="button"
              onClick={handleCopyCalculation}
              className="inline-flex items-center gap-1 font-ui text-xs font-medium text-secondary transition-colors duration-base hover:text-accent"
            >
              {copied ? (
                <>
                  <Check className="size-3" aria-hidden="true" />
                  {t("calculationCopied")}
                </>
              ) : (
                <>
                  <Copy className="size-3" aria-hidden="true" />
                  {t("copyCalculation")}
                </>
              )}
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {calculationLines.map((line, index) => {
              if (line.kind === "header") {
                return (
                  <p key={index} className="font-ui text-sm font-semibold text-primary tabular-nums">
                    {line.text}
                  </p>
                );
              }
              if (line.kind === "section") {
                return (
                  <p
                    key={index}
                    className="mt-2 font-ui text-xs font-semibold tracking-wide text-secondary uppercase first:mt-1"
                  >
                    {line.text}
                  </p>
                );
              }
              return (
                <p key={index} className="pl-3 font-ui text-sm text-primary tabular-nums">
                  {"- "}
                  {line.text}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {calculationExplanation && (
        <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-surface-raised p-4">
          <h3 className="font-ui text-xs font-semibold tracking-wide text-secondary uppercase">
            {t("howCalculatedHeading")}
          </h3>
          {calculator.definition.scoring.method === "sum" && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface p-3">
              <p className="font-heading text-lg font-semibold text-primary">
                {calculator.abbreviation ?? calculator.name}
                <span className="mx-2 text-secondary">=</span>
                {"Σ "}
                {t("itemScoresLabel")}
              </p>
              <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 font-ui text-xs font-semibold text-white tabular-nums">
                {scoreMin}–{scoreMax}
              </span>
            </div>
          )}
          <p className="font-ui text-sm text-secondary">{calculationExplanation}</p>
        </div>
      )}

      {bands.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-surface-raised p-4">
          <h3 className="font-ui text-xs font-semibold tracking-wide text-secondary uppercase">
            {t("howToInterpretHeading")}
          </h3>
          {renderRangeBar(false)}
          <div className="flex flex-col gap-1.5">
            {bands.map((band) => (
              <div key={`${band.min}-${band.max}-${band.label}`} className="flex items-start gap-2 font-ui text-sm">
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${
                    SEVERITY_FILL_CLASS[band.severity ?? ""] ?? DEFAULT_SEVERITY_FILL_CLASS
                  }`}
                  aria-hidden="true"
                />
                <span className="text-secondary">
                  <span className="font-medium text-primary tabular-nums">
                    {band.min === band.max ? band.min : `${band.min}–${band.max}`}
                  </span>
                  {" — "}
                  {band.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {source && (
        <div className="flex flex-col gap-1 rounded-xl border border-border/40 bg-surface-raised p-4">
          <h3 className="font-ui text-xs font-semibold tracking-wide text-secondary uppercase">
            {t("sourceHeading")}
          </h3>
          <p className="font-ui text-sm text-secondary">{source.citation}</p>
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex w-fit items-center gap-1 font-ui text-sm font-medium text-accent transition-colors duration-base hover:underline"
            >
              {t("viewSource")}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      <p className="font-ui text-xs text-secondary">{t("disclaimer")}</p>
    </div>
  );
}
