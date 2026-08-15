import { Bone, PersonStanding, Waves, BookOpen, Link2, Layers, Target, Share2, Brain, ClipboardCheck, Trophy } from "lucide-react";

// A deliberate visual "island" — the user asked to match a reference
// screenshot's exact light/teal look, distinct from the rest of this
// app's dark-safe design system. Every class here is a literal Tailwind
// palette color (bg-white, text-slate-900, etc.), never this app's own
// semantic tokens (bg-surface, text-primary) — that's what keeps it
// rendering identically regardless of the site's own dark-mode toggle,
// which is the point.
//
// This is a teaser only: Anatomy/Biomechanics/Physical Agents aren't
// real content yet (no topic branch, no seeded pages anywhere in this
// app), so the three cards below are deliberately not links and carry
// no chevron/arrow affordance — nothing here claims to be clickable.
// Copy is kept to intent/design-philosophy statements rather than
// specific unbuilt-feature promises (no "3D models", no counts).

const TOPICS = [
  { key: "anatomy", icon: Bone, iconBg: "bg-teal-50", iconColor: "text-teal-600" },
  { key: "biomechanics", icon: PersonStanding, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { key: "physicalAgents", icon: Waves, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
] as const;

const FEATURES = [
  { key: "feature1", icon: BookOpen },
  { key: "feature2", icon: Link2 },
  { key: "feature3", icon: Layers },
  { key: "feature4", icon: Target },
] as const;

const STEPS = [
  { key: "step1", icon: Share2, dot: "bg-teal-500" },
  { key: "step2", icon: Brain, dot: "bg-emerald-500" },
  { key: "step3", icon: ClipboardCheck, dot: "bg-violet-500" },
  { key: "step4", icon: Trophy, dot: "bg-amber-500" },
] as const;

export function BasicSciencesSection({
  eyebrow,
  headingLine1,
  headingLine2,
  body,
  features,
  topics,
  flowHeading,
  flowBody,
  steps,
}: {
  eyebrow: string;
  headingLine1: string;
  headingLine2: string;
  body: string;
  features: Record<string, { title: string; body: string }>;
  topics: Record<string, { title: string; body: string }>;
  flowHeading: string;
  flowBody: string;
  steps: Record<string, { title: string; body: string }>;
}) {
  return (
    <section className="w-full bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Text column */}
          <div className="flex flex-col gap-5">
            <span className="flex w-fit items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5">
              <Bone className="size-3.5 text-teal-600" aria-hidden="true" />
              <span className="font-sans text-xs font-semibold tracking-wide text-teal-700 uppercase">{eyebrow}</span>
            </span>

            <h2 className="font-sans text-3xl leading-tight font-bold text-slate-900 sm:text-4xl">
              {headingLine1}
              <br />
              <span className="text-teal-600">{headingLine2}</span>
            </h2>

            <p className="max-w-lg font-sans text-base leading-relaxed text-slate-600">{body}</p>

            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3">
              {FEATURES.map(({ key, icon: Icon }) => (
                <div key={key} className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden="true" />
                  <div className="flex flex-col">
                    <span className="font-sans text-sm font-semibold text-slate-900">{features[key].title}</span>
                    <span className="font-sans text-xs text-slate-500">{features[key].body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Illustration column: abstract vertebral column + connected topic cards */}
          <div className="relative flex items-center gap-6">
            <svg viewBox="0 0 140 320" className="h-72 w-28 shrink-0" aria-hidden="true">
              <path
                d="M70 10 C 40 60, 100 100, 70 150 C 40 200, 100 240, 70 310"
                fill="none"
                stroke="#99f6e4"
                strokeWidth="3"
              />
              {Array.from({ length: 9 }).map((_, i) => {
                const y = 20 + i * 33;
                const x = 70 + Math.sin(i * 0.9) * 28;
                return <circle key={i} cx={x} cy={y} r="9" fill="#0d9488" opacity={0.15 + (i % 3) * 0.15} />;
              })}
            </svg>

            <div className="flex flex-1 flex-col gap-4">
              {TOPICS.map(({ key, icon: Icon, iconBg, iconColor }) => (
                <div
                  key={key}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                    <Icon className={`size-5 ${iconColor}`} aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-sans text-sm font-semibold text-slate-900">{topics[key].title}</span>
                    <span className="font-sans text-xs leading-relaxed text-slate-500">{topics[key].body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Connected-flow strip */}
        <div className="mt-14 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="mb-8 flex flex-col gap-1.5">
            <h3 className="font-sans text-xl font-bold text-slate-900">{flowHeading}</h3>
            <p className="max-w-xl font-sans text-sm text-slate-500">{flowBody}</p>
          </div>

          <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-start sm:justify-between">
            {STEPS.map(({ key, icon: Icon, dot }, i) => (
              <div key={key} className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center">
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${dot}/10`}>
                  <Icon className={`size-5 ${dot.replace("bg-", "text-")}`} aria-hidden="true" />
                </span>
                <div className="flex flex-col sm:mt-1">
                  <span className="font-sans text-sm font-semibold text-slate-900">
                    {i + 1}. {steps[key].title}
                  </span>
                  <span className="font-sans text-xs text-slate-500">{steps[key].body}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
