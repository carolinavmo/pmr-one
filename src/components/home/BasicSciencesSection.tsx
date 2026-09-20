import Image from "next/image";
import { Bone, PersonStanding, Waves, Share2, Brain, ClipboardCheck, Trophy, ArrowRight } from "lucide-react";

// Previously a deliberate visual "island" on literal Tailwind palette
// colors, kept fixed-light regardless of the site's own dark-mode
// toggle; now on this app's own tokens per the DESIGN-BRIEF.md
// restyle, so it adapts like every other section.
//
// This is a teaser only: Anatomy/Biomechanics/Physical Agents aren't
// real content yet (no topic branch, no seeded pages anywhere in this
// app), so the three cards below are deliberately not links and carry
// no chevron/arrow affordance — nothing here claims to be clickable.
// Copy is kept to intent/design-philosophy statements rather than
// specific unbuilt-feature promises (no "3D models", no counts).

const TOPICS = [
  { key: "anatomy", icon: Bone },
  { key: "biomechanics", icon: PersonStanding },
  { key: "physicalAgents", icon: Waves },
] as const;

const STEPS = [
  { key: "step1", icon: Share2, iconBg: "bg-card-indigo/15", iconColor: "text-card-indigo" },
  { key: "step2", icon: Brain, iconBg: "bg-trust-bg", iconColor: "text-trust" },
  { key: "step3", icon: ClipboardCheck, iconBg: "bg-concept-bg", iconColor: "text-concept" },
  { key: "step4", icon: Trophy, iconBg: "bg-insight-bg", iconColor: "text-insight" },
] as const;

export function BasicSciencesSection({
  eyebrow,
  headingLine1,
  headingLine2,
  body,
  topics,
  flowHeadingLine1,
  flowHeadingLine2,
  flowBody,
  steps,
}: {
  eyebrow: string;
  headingLine1: string;
  headingLine2: string;
  body: string;
  topics: Record<string, { title: string; body: string }>;
  flowHeadingLine1: string;
  flowHeadingLine2: string;
  flowBody: string;
  steps: Record<string, { title: string; body: string }>;
}) {
  return (
    <section className="w-full bg-gradient-to-b from-surface-sunken to-surface">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Text column */}
          <div className="flex flex-col gap-5">
            <span className="flex w-fit items-center gap-2.5 rounded-full bg-accent-bg px-6 py-2">
              <Bone className="size-5 shrink-0 text-accent" aria-hidden="true" />
              <span className="font-sans text-lg font-semibold tracking-wide text-accent uppercase">{eyebrow}</span>
            </span>

            <h2 className="font-sans text-3xl leading-tight font-bold text-primary sm:text-4xl">
              {headingLine1}
              <br />
              <span className="text-accent">{headingLine2.split(" ")[0]}</span>{" "}
              {headingLine2.split(" ").slice(1).join(" ")}
            </h2>

            <p className="max-w-lg font-sans text-base leading-relaxed text-secondary">{body}</p>
          </div>

          {/* Illustration column: anatomy illustration bleeding into a gradient
              fade, dashed connector lines running from the fade to each
              topic card in that card's own accent color */}
          <div className="relative flex items-center">
            <div
              className="relative -mr-10 h-80 shrink-0 sm:h-96"
              style={{
                maskImage: "linear-gradient(to right, black 45%, transparent 92%)",
                WebkitMaskImage: "linear-gradient(to right, black 45%, transparent 92%)",
              }}
            >
              <Image
                src="/basic-sciences-anatomy.png"
                alt=""
                width={532}
                height={800}
                unoptimized
                style={{
                  maskImage: "linear-gradient(to bottom, black 65%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 65%, transparent 100%)",
                }}
                className="h-full w-auto object-contain"
              />
            </div>

            <div className="flex flex-1 flex-col gap-4">
              {TOPICS.map(({ key, icon: Icon }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex flex-1 items-center gap-3 rounded-xl border border-accent/40 bg-surface p-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-bg">
                      <Icon className="size-6 text-accent" aria-hidden="true" />
                    </span>
                    <span className="font-heading text-base font-normal text-primary uppercase">{topics[key].title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Connected-flow strip — text block on the left, four steps in a
            single row to the right, connected by straight arrows. Matches
            the reference layout (not stacked/numbered like a first pass
            at this had it). */}
        <div className="mt-14 rounded-2xl border border-border bg-surface p-8 shadow-md">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">
            <div className="flex flex-col gap-1.5 lg:w-64 lg:shrink-0">
              <h3 className="font-sans text-xl leading-tight font-bold text-primary">
                <span className="block whitespace-nowrap">{flowHeadingLine1}</span>
                <span className="block whitespace-nowrap">{flowHeadingLine2}</span>
              </h3>
              <p className="font-sans text-sm text-secondary">{flowBody}</p>
            </div>

            <div className="relative flex flex-1 items-start">
              {STEPS.map(({ key, icon: Icon, iconBg, iconColor }, i) => (
                <div key={key} className="flex flex-1 items-start">
                  <div className="flex flex-1 flex-col items-center gap-3 text-center">
                    <span className={`relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                      <Icon className={`size-5 ${iconColor}`} aria-hidden="true" />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-sans text-sm font-semibold text-primary">{steps[key].title}</span>
                      <span className="font-sans text-xs text-secondary">{steps[key].body}</span>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ArrowRight className="mt-4 hidden size-6 shrink-0 text-border lg:block" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
