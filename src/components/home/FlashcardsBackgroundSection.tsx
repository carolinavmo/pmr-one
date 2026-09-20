import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonBaseClasses } from "@/components/ui/button-styles";

// Flashcards' background is a supplied reference image
// (public/flashcards-hero-bg.png), masked to fade into the section —
// previously kept on fixed literal colors so it wouldn't clash with a
// dark-mode flip (a "deliberate island," same precedent as
// BasicSciencesSection); now on this app's own tokens per the
// DESIGN-BRIEF.md restyle, so it adapts like every other section. If
// this doesn't work out, reverting is a one-line swap back to
// FeatureHeroSection in page.tsx — this component isn't wired into
// anything else.
export function FlashcardsBackgroundSection({
  eyebrowIcon: EyebrowIcon,
  eyebrowLabel,
  headingLine1,
  headingLine2,
  body,
  iconGrid,
  ctaLabel,
  ctaHref,
  ctaNote,
}: {
  eyebrowIcon: LucideIcon;
  eyebrowLabel: string;
  headingLine1: string;
  headingLine2: string;
  body: string;
  iconGrid: { icon: LucideIcon; title: string; body: string }[];
  ctaLabel: string;
  ctaHref: string;
  ctaNote: string;
}) {
  return (
    <section className="relative w-full overflow-hidden bg-surface">
      {/* Pushed into the right portion of the section and masked to fade
          to transparent on its own left edge — same "illustration
          bleeding into a gradient fade" technique BasicSciencesSection
          uses for its anatomy image, just mirrored (fade in from the
          left instead of out to the right). Narrower + right-anchored
          keeps the card-stack art clear of the text column instead of
          stretching it edge-to-edge. */}
      <div className="absolute inset-y-0 right-0 w-full sm:w-4/5 lg:w-3/5">
        <Image
          src="/flashcards-hero-bg.png"
          alt=""
          fill
          unoptimized
          className="object-cover object-right"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 40%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 40%)",
          }}
          aria-hidden="true"
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-7 lg:py-9">
        <span className="flex w-fit items-center gap-2 rounded-full bg-accent-bg px-5 py-1.5">
          <EyebrowIcon className="size-4 shrink-0 text-accent" aria-hidden="true" />
          <span className="font-ui text-sm font-semibold tracking-wide text-accent uppercase">{eyebrowLabel}</span>
        </span>

        <h2 className="font-sans text-3xl leading-tight font-bold text-primary sm:text-4xl">
          <span className="block">{headingLine1}</span>
          <span className="block text-accent">{headingLine2}</span>
        </h2>

        <p className="max-w-lg font-reading text-base leading-7 text-secondary">{body}</p>

        <div className="grid max-w-lg grid-cols-2 gap-4 sm:grid-cols-4">
          {iconGrid.map(({ icon: ItemIcon, title, body: itemBody }) => (
            <div key={title} className="flex flex-col gap-1.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-bg">
                <ItemIcon className="size-4 text-accent" aria-hidden="true" />
              </span>
              <span className="font-ui text-xs font-semibold text-primary">{title}</span>
              <span className="font-ui text-xs leading-tight text-secondary">{itemBody}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href={ctaHref} className={`${buttonBaseClasses} w-fit bg-accent text-white hover:opacity-90`}>
            {ctaLabel}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <span className="font-ui text-xs text-secondary">{ctaNote}</span>
        </div>
      </div>
    </section>
  );
}
