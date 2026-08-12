"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, Copy, Check, ExternalLink } from "lucide-react";
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

// The one generic engine every calculator (present and future) renders
// through — given a Calculator, it doesn't know or care whether the
// scale is a 10-category point-sum (Barthel), a single-select ordinal,
// or eventually a Likert-formula scale; scoreCalculator/
// resolveInterpretation (calculator-scoring.ts) handle that branching.
// Answers live in local state only — no persistence, no server round-
// trip, matching the reference site's own stateless behavior.
export function CalculatorRunner({ calculator }: { calculator: Calculator }) {
  const t = useTranslations("clinicalTools");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  const { items, calculationExplanation, source } = calculator.definition;
  const answeredCount = Object.keys(answers).length;
  const totalCount = items.length;
  const percent = totalCount === 0 ? 0 : Math.round((answeredCount / totalCount) * 100);

  const score = scoreCalculator(calculator.definition, answers);
  const interpretation = score === null ? null : resolveInterpretation(calculator.definition, score);
  const bands = calculator.definition.interpretation ?? [];

  // Derived rather than solely relying on the stored maxScore field, so
  // the range bar stays correct even for a future calculator that omits
  // it — scoreMin has no stored equivalent at all (every scale so far
  // starts at 0, but that's an assumption this computes instead of bakes in).
  const scoreMin = items.reduce((sum, item) => sum + itemMin(item), 0);
  const scoreMax = calculator.definition.maxScore ?? items.reduce((sum, item) => sum + itemMax(item), 0);
  const scoreRange = Math.max(scoreMax - scoreMin, 1);
  const pointerPercent =
    score === null ? null : Math.min(100, Math.max(0, ((score - scoreMin) / scoreRange) * 100));

  const calculationExpression =
    score === null ? null : `${items.map((item) => answers[item.id]).join(" + ")} = ${score}`;

  async function handleCopyCalculation() {
    if (!calculationExpression) return;
    await navigator.clipboard.writeText(calculationExpression);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Consecutive items sharing the same (optional) section collapse into
  // one subsection — Barthel authors no section on any item, so this
  // produces a single unlabeled group and renders as a flat list; a
  // future domain-organized scale (e.g. FIM) gets real subsections for
  // free just by authoring item.section.
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

  // Shared between the live result (with a pointer marking the current
  // score) and the always-visible "how to interpret" card (without one)
  // — same segmented, severity-colored bar either way. Segment widths
  // use flex-grow weights (item count, not raw percentages) so a
  // single-value band like Barthel's "100" still renders with a
  // visible sliver instead of collapsing to zero width.
  function renderRangeBar(withPointer: boolean) {
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
        <div className="flex h-3 overflow-hidden rounded-full">
          {bands.map((band) => (
            <div
              key={`${band.min}-${band.max}-${band.label}`}
              style={{ flexGrow: Math.max(band.max - band.min + 1, 3) }}
              className={SEVERITY_FILL_CLASS[band.severity ?? ""] ?? DEFAULT_SEVERITY_FILL_CLASS}
            />
          ))}
        </div>
        <div className="mt-1.5 flex items-center justify-between font-ui text-xs text-secondary">
          <span className="tabular-nums">{scoreMin}</span>
          <span className="tabular-nums">{scoreMax}</span>
        </div>
        {bands.length > 0 && (
          <div className="flex items-center justify-between font-ui text-[11px] text-secondary/80">
            <span>{bands[0].label}</span>
            <span>{bands[bands.length - 1].label}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-surface-raised p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="font-ui text-sm font-medium text-primary">
            {t("itemsAnswered", { answered: answeredCount, total: totalCount })}
          </span>
          <div className="flex items-center gap-3">
            <span className="font-ui text-sm font-medium text-primary tabular-nums">{percent}%</span>
            {answeredCount > 0 && (
              <button
                type="button"
                onClick={() => setAnswers({})}
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
          const selected = answers[item.id];
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
              <div className="flex flex-wrap gap-2">
                {item.options.map((option) => {
                  const isSelected = selected === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setAnswers((current) => ({ ...current, [item.id]: option.value }))
                      }
                      className={`flex min-w-36 flex-1 flex-col gap-1 rounded-lg border p-3 text-left transition-colors duration-base ${
                        isSelected
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/50 hover:bg-border/10"
                      }`}
                    >
                      <span
                        className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 font-ui text-xs font-semibold tabular-nums ${
                          isSelected ? "bg-accent text-white" : "bg-border/50 text-secondary"
                        }`}
                      >
                        {t("pointsAbbrev", { value: option.value })}
                      </span>
                      <span className="font-ui text-sm text-primary">{option.label}</span>
                      {option.description && (
                        <span className="font-ui text-xs text-secondary">{option.description}</span>
                      )}
                    </button>
                  );
                })}
              </div>
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
            {interpretation && (
              <div>
                <h3 className="font-ui text-xs font-semibold tracking-wide text-secondary uppercase">
                  {t("interpretationHeading")}
                </h3>
                <p className="font-ui text-base font-semibold text-primary">{interpretation.label}</p>
                {interpretation.description && (
                  <p className="font-ui text-sm text-secondary">{interpretation.description}</p>
                )}
              </div>
            )}
          </div>
          {bands.length > 0 && renderRangeBar(true)}
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
                              className="h-full rounded-full bg-accent transition-all duration-base"
                              style={{ width: `${itemPercent}%` }}
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

      {calculationExpression && (
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
          <p className="font-ui text-sm text-primary tabular-nums">{calculationExpression}</p>
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
