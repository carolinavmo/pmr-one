import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonBaseClasses } from "@/components/ui/button-styles";
import { StatTile } from "@/components/ui/StatTile";
import { CARD_COLOR_BADGE, CARD_COLOR_CARD, CARD_COLOR_CHIP, CARD_COLOR_TEXT } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";
import { ScrollReveal } from "@/components/home/ScrollReveal";

// One full-width "arrival" band per platform feature on the visitor
// homepage — see src/app/[locale]/page.tsx for the six invocations.
// Text stays first in DOM/JSX order always (screen readers, tab
// order); visual alternation between features is done purely with
// Tailwind `order-*` classes via `reverse`, never by reordering the
// elements themselves.
export function FeatureHeroSection({
  eyebrowIcon: EyebrowIcon,
  eyebrowLabel,
  heading,
  body,
  bullets,
  stat,
  ctaLabel,
  ctaHref,
  color,
  reverse,
  band,
  visual,
}: {
  eyebrowIcon: LucideIcon;
  eyebrowLabel: string;
  heading: string;
  body: string;
  bullets: string[];
  stat?: { value: number; label: string };
  ctaLabel: string;
  ctaHref: string;
  color: CardColor;
  reverse: boolean;
  band: "surface" | "surface-raised";
  visual: ReactNode;
}) {
  return (
    <section className={band === "surface" ? "w-full bg-surface" : "w-full bg-surface-raised"}>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
        <ScrollReveal>
          <div className={reverse ? "flex flex-col gap-5 lg:order-2" : "flex flex-col gap-5"}>
            <span className="flex w-fit items-center gap-2.5">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[color]}`}>
                <EyebrowIcon className="size-4.5" aria-hidden="true" />
              </span>
              <span className={`font-ui text-sm font-semibold tracking-wide uppercase ${CARD_COLOR_TEXT[color]}`}>
                {eyebrowLabel}
              </span>
            </span>

            <h2 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">{heading}</h2>
            <p className="max-w-lg font-reading text-base leading-7 text-secondary">{body}</p>

            <ul className="flex flex-col gap-2.5">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className={`mt-0.5 size-4 shrink-0 ${CARD_COLOR_TEXT[color]}`} aria-hidden="true" />
                  <span className="font-ui text-sm text-secondary">{item}</span>
                </li>
              ))}
            </ul>

            {stat && (
              <div className="w-fit">
                <StatTile icon={EyebrowIcon} label={stat.label} value={stat.value} color={color} />
              </div>
            )}

            {/* Not LinkButton's variant system — every variant carries its
                own border/background classes that would fight a
                per-color override without resorting to `!important`.
                Same buttonBaseClasses as Button/LinkButton, with
                CARD_COLOR_BADGE's solid fill applied directly instead. */}
            <Link href={ctaHref} className={`${buttonBaseClasses} w-fit ${CARD_COLOR_BADGE[color]} hover:opacity-90`}>
              {ctaLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className={reverse ? "lg:order-1" : undefined}>{visual}</div>
        </ScrollReveal>
      </div>
    </section>
  );
}

// Shared shell for the five non-Conditions mockups — Conditions reuses
// /explore's own browser-chrome shell instead (see FeatureMockups.tsx),
// since a full "browser window" treatment doesn't fit a flip-card or a
// calendar strip the way it fits a rendered page.
export function MockupCard({ color, children }: { color: CardColor; children: ReactNode }) {
  return <div className={`rounded-2xl border p-5 shadow-sm ${CARD_COLOR_CARD[color]}`}>{children}</div>;
}
