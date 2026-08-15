import { Bookmark, Check, ChevronRight, Gem, GripVertical, Layers, ListChecks, NotebookPen } from "lucide-react";
import { TrustIndicator } from "@/components/ui/TrustIndicator";
import { iconForHeading } from "@/lib/section-icons";

// Six small, hand-built visuals for the homepage's feature sections —
// no external image assets. Conditions and Question Bank render real
// content (a real published disease, a real seeded question); My
// Handbook renders the same real seeded sample-page titles every new
// member actually gets (src/lib/atlas-sample-content.ts); Flashcards
// shows a real preset card's front text. Clinical Tools names a real
// calculator but the two input rows are representative chrome, not a
// specific real item. Study Planner has no public data to show at all
// (it's 100% personal, gated behind sign-in) so it's representative
// chrome only — same honesty framing this app applies everywhere else:
// never invent a number or a specific claim, but a generic "here's the
// shape of the UI" illustration is fine where no real data exists.

const CHROME_DOTS = (
  <span className="flex shrink-0 gap-1.5" aria-hidden="true">
    <span className="size-2.5 rounded-full bg-card-red/50" />
    <span className="size-2.5 rounded-full bg-card-yellow/50" />
    <span className="size-2.5 rounded-full bg-card-green/50" />
  </span>
);

export function ConditionsMockup({
  diseaseName,
  snippet,
  reviewedAt,
  tagLabels,
  urlLabel,
  breadcrumbLabel,
  indexLabel,
  overviewLabel,
  sections,
  keyPointsLabel,
  keyPointsBody,
  clinicalPearlsLabel,
  clinicalPearlsBody,
}: {
  diseaseName: string;
  snippet: string;
  reviewedAt: string | null;
  tagLabels: string[];
  urlLabel: string;
  breadcrumbLabel: string;
  indexLabel: string;
  overviewLabel: string;
  sections: { id: string; heading: string }[];
  keyPointsLabel: string;
  keyPointsBody: string;
  clinicalPearlsLabel: string;
  clinicalPearlsBody: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-lg">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        {CHROME_DOTS}
        <span className="flex-1 truncate rounded-full bg-border/30 px-3 py-1 text-center font-ui text-[11px] text-secondary">
          {urlLabel}
        </span>
      </div>
      <div className="flex flex-col gap-4 p-5 sm:flex-row">
        {sections.length > 0 && (
          <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-border bg-surface p-3 sm:w-36">
            <span className="px-1 font-ui text-[10px] font-semibold tracking-wide text-secondary uppercase">
              {indexLabel}
            </span>
            <div className="flex flex-col gap-0.5">
              {sections.map((section, i) => {
                const SectionIcon = iconForHeading(section.heading);
                return (
                  <span
                    key={section.id}
                    className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 font-ui text-[11px] ${
                      i === 0 ? "bg-accent/10 text-accent" : "text-secondary"
                    }`}
                  >
                    <SectionIcon className="size-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{section.heading}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-1 font-ui text-[11px] text-secondary">
            <span>{breadcrumbLabel}</span>
            <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate text-primary">{diseaseName}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading text-lg font-semibold text-primary">{diseaseName}</h3>
            <TrustIndicator reviewedAt={reviewedAt} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-ui text-[11px] font-semibold tracking-wide text-secondary uppercase">
              {overviewLabel}
            </span>
            <p className="line-clamp-3 font-ui text-sm text-secondary">{snippet}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
            {tagLabels.map((label) => (
              <span key={label} className="rounded-full border border-border px-2.5 py-1 font-ui text-[11px] text-secondary">
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 rounded-lg border border-accent/20 bg-accent/5 p-3">
              <span className="flex items-center gap-1.5 font-ui text-[11px] font-semibold text-accent">
                <Bookmark className="size-3.5 shrink-0" aria-hidden="true" />
                {keyPointsLabel}
              </span>
              <p className="font-ui text-[11px] text-secondary">{keyPointsBody}</p>
            </div>
            <div className="flex flex-col gap-1.5 rounded-lg border border-card-yellow/30 bg-card-yellow/5 p-3">
              <span className="flex items-center gap-1.5 font-ui text-[11px] font-semibold text-card-yellow">
                <Gem className="size-3.5 shrink-0" aria-hidden="true" />
                {clinicalPearlsLabel}
              </span>
              <p className="font-ui text-[11px] text-secondary">{clinicalPearlsBody}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HandbookMockup({ pageTitles }: { pageTitles: string[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-trust/30 bg-trust/5 p-5">
      {pageTitles.map((title, i) => (
        <div
          key={title}
          className={`flex items-center gap-3 rounded-xl bg-surface px-3.5 py-3 shadow-sm ${i === 0 ? "ring-1 ring-trust/40" : ""}`}
        >
          <NotebookPen className="size-4 shrink-0 text-trust" aria-hidden="true" />
          <span className="truncate font-ui text-sm text-primary">{title}</span>
        </div>
      ))}
    </div>
  );
}

export function FlashcardsMockup({ front }: { front: string }) {
  return (
    <div className="relative px-4 py-6">
      <div className="absolute inset-x-8 top-2 h-full rounded-2xl border border-card-violet/20 bg-card-violet/5" aria-hidden="true" />
      <div className="relative flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-card-violet/30 bg-surface p-6 text-center shadow-md">
        <span className="flex items-center gap-1.5 rounded-full bg-card-violet/15 px-2.5 py-1 font-ui text-[11px] font-semibold text-card-violet">
          <Layers className="size-3" aria-hidden="true" />
          Front
        </span>
        <p className="font-reading text-sm font-medium text-primary">{front}</p>
      </div>
    </div>
  );
}

export function QuestionBankMockup({
  prompt,
  options,
}: {
  prompt: string;
  options: { label: string; isCorrect: boolean }[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-card-indigo/30 bg-card-indigo/5 p-5">
      <p className="font-ui text-sm font-medium text-primary">{prompt}</p>
      <div className="flex flex-col gap-2">
        {options.map((option, i) => (
          <div
            key={option.label}
            className={`flex items-center gap-3 rounded-lg border p-2.5 font-ui text-xs ${
              option.isCorrect ? "border-trust bg-trust/10" : "border-border bg-surface"
            }`}
          >
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full border font-ui text-[10px] font-medium ${
                option.isCorrect ? "border-trust bg-trust/15 text-trust" : "border-border text-secondary"
              }`}
            >
              {String.fromCharCode(65 + i)}
            </span>
            <span className={option.isCorrect ? "font-medium text-trust" : "text-secondary"}>{option.label}</span>
            {option.isCorrect && <Check className="ml-auto size-3.5 shrink-0 text-trust" aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClinicalToolsMockup({
  calculatorName,
  itemLabels,
  resultLabel,
}: {
  calculatorName: string;
  itemLabels: [string, string];
  resultLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-card-orange/30 bg-card-orange/5 p-5">
      <span className="flex items-center gap-2 font-ui text-sm font-semibold text-primary">
        <ListChecks className="size-4 shrink-0 text-card-orange" aria-hidden="true" />
        {calculatorName}
      </span>
      {itemLabels.map((label) => (
        <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3.5 py-2.5 shadow-sm">
          <span className="font-ui text-xs text-secondary">{label}</span>
          <span className="flex gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`size-2.5 rounded-full ${i === 0 ? "bg-card-orange" : "bg-border"}`} />
            ))}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between rounded-lg bg-badge-orange px-3.5 py-2.5">
        <span className="font-ui text-xs font-medium text-white/90">{resultLabel}</span>
        <span className="font-heading text-sm font-semibold text-white">—</span>
      </div>
    </div>
  );
}

export function StudyPlannerMockup({ dayLabels, taskLabel }: { dayLabels: string[]; taskLabel: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-insight/30 bg-insight/5 p-5">
      <div className="grid grid-cols-7 gap-1.5">
        {dayLabels.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="font-ui text-[10px] text-secondary">{day}</span>
            <span
              className={`flex size-7 items-center justify-center rounded-full font-ui text-xs ${
                i === 2 || i === 4 ? "bg-insight text-white" : "bg-surface text-secondary"
              }`}
            >
              {i + 1}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-surface px-3.5 py-3 shadow-sm">
        <GripVertical className="size-4 shrink-0 text-secondary/50" aria-hidden="true" />
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-insight" aria-hidden="true" />
        <span className="truncate font-ui text-sm text-primary">{taskLabel}</span>
      </div>
    </div>
  );
}
