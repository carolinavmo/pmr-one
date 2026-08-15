import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StatTile } from "@/components/ui/StatTile";
import { CARD_COLOR_BADGE, CARD_COLOR_CARD, CARD_COLOR_CHIP, CARD_COLOR_TEXT } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import type { LucideIcon } from "lucide-react";

export interface TourStop {
  color: CardColor;
  icon: LucideIcon;
  eyebrow: string;
  heading: string;
  body: string;
  bullets: [string, string];
  stat?: { value: number; label: string };
  ctaLabel: string;
  ctaHref: string;
  visual: ReactNode;
  extra?: ReactNode;
}

// The /explore "guided tour" — a numbered itinerary down the page, distinct
// from the homepage's full-bleed alternating hero bands (this page lives
// inside the app shell's sidebar, so full-bleed doesn't fit here). Fixed
// text-left/mockup-right for every stop (these are tour stops in a set
// order, not a flowing narrative that benefits from alternation), and a
// lightweight text-link CTA rather than a filled button — this page's own
// FeatureCard already established that lighter CTA style.
export function GuidedTour({ stops }: { stops: TourStop[] }) {
  return (
    <div className="relative flex flex-col gap-8">
      <div
        className="absolute top-10 bottom-10 left-5 w-px bg-border"
        aria-hidden="true"
      />
      {stops.map((stop, i) => {
        const Icon = stop.icon;
        return (
          <ScrollReveal key={stop.heading}>
            <div className="relative flex gap-5">
              <div
                className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full font-heading text-sm font-semibold ${CARD_COLOR_BADGE[stop.color]}`}
              >
                {i + 1}
              </div>
              <div className={`flex-1 rounded-2xl border p-6 ${CARD_COLOR_CARD[stop.color]}`}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
                  <div className="flex flex-col gap-3">
                    <span className="flex w-fit items-center gap-2">
                      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[stop.color]}`}>
                        <Icon className="size-3.5" aria-hidden="true" />
                      </span>
                      <span className={`font-ui text-xs font-semibold tracking-wide uppercase ${CARD_COLOR_TEXT[stop.color]}`}>
                        {stop.eyebrow}
                      </span>
                    </span>

                    <h3 className="font-heading text-lg font-semibold text-primary">{stop.heading}</h3>
                    <p className="font-ui text-sm text-secondary">{stop.body}</p>

                    <ul className="flex flex-col gap-2">
                      {stop.bullets.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className={`mt-1.5 size-1 shrink-0 rounded-full ${CARD_COLOR_CHIP[stop.color]}`} aria-hidden="true" />
                          <span className="font-ui text-xs text-secondary">{item}</span>
                        </li>
                      ))}
                    </ul>

                    {stop.stat && (
                      <div className="w-fit">
                        <StatTile icon={Icon} label={stop.stat.label} value={stop.stat.value} color={stop.color} />
                      </div>
                    )}

                    {stop.extra}

                    <Link
                      href={stop.ctaHref}
                      className={`mt-1 flex w-fit items-center gap-1 font-ui text-sm font-medium hover:underline ${CARD_COLOR_TEXT[stop.color]}`}
                    >
                      {stop.ctaLabel}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>

                  <div>{stop.visual}</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        );
      })}
    </div>
  );
}
