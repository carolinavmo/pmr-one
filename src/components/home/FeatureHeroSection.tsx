import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonBaseClasses } from "@/components/ui/button-styles";
import { StatTile } from "@/components/ui/StatTile";
import { CARD_COLOR_BADGE, CARD_COLOR_CARD, CARD_COLOR_CHIP, CARD_COLOR_TEXT, CARD_COLOR_TINT } from "@/lib/card-colors";
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
  headingHighlight,
  headingHighlightFullLastLine,
  headingClassName,
  body,
  bullets,
  iconGrid,
  stat,
  ctaLabel,
  ctaHref,
  ctaNote,
  color,
  tintColor,
  reverse,
  band,
  visual,
}: {
  eyebrowIcon: LucideIcon;
  eyebrowLabel: string;
  heading: string;
  // When set, colors everything after the first word of heading's last
  // line (split on "\n") — e.g. "with depth and clarity." -> "with " stays
  // default ink, "depth and clarity." picks up this color. A raw CSS color
  // value (hex, or a token var() to stay dark-mode-safe) — not a CardColor
  // — since this is a one-off heading accent, independent of `color` (the
  // section's own theme).
  headingHighlight?: string;
  // When true, headingHighlight colors the entire last line instead of
  // everything after its first word — e.g. Flashcards' "Remember longer."
  // is fully colored, unlike Conditions' "with depth and clarity." (where
  // "with" stays default ink).
  headingHighlightFullLastLine?: boolean;
  // Overrides the default font-heading/text-2xl treatment — e.g. Conditions
  // matches the Basic Sciences section immediately above it on the page
  // (font-sans, bolder, larger) rather than using this component's normal
  // Poppins heading style.
  headingClassName?: string;
  body: string;
  bullets: string[];
  // Alternative to `bullets` — a 2x2 icon+title+caption grid (e.g.
  // Flashcards' "High-yield content / Spaced repetition / ..."). When set,
  // this replaces the bullet list rather than combining with it.
  iconGrid?: { icon: LucideIcon; title: string; body: string }[];
  stat?: { value: number; label: string };
  ctaLabel: string;
  ctaHref: string;
  // Small reassurance line under the CTA button (e.g. "No credit card
  // required").
  ctaNote?: string;
  color: CardColor;
  // Overrides which color band="tint" washes the section background with —
  // e.g. Question Bank keeps its own indigo chip/CTA/icons (`color`) but
  // washes its background in the platform's brand teal, same as Conditions,
  // instead of an indigo tint.
  tintColor?: CardColor;
  reverse: boolean;
  band: "surface" | "surface-raised" | "tint";
  visual: ReactNode;
}) {
  const headingLines = heading.split("\n");
  return (
    <section
      className={`w-full ${band === "tint" ? CARD_COLOR_TINT[tintColor ?? color] : band === "surface" ? "bg-surface" : "bg-surface-raised"}`}
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
        <ScrollReveal>
          <div className={reverse ? "flex flex-col gap-5 lg:order-2" : "flex flex-col gap-5"}>
            <span className={`flex w-fit items-center gap-2.5 rounded-full px-6 py-2 ${CARD_COLOR_CHIP[color]}`}>
              <EyebrowIcon className="size-5 shrink-0" aria-hidden="true" />
              <span className={`font-ui text-lg font-semibold tracking-wide uppercase ${CARD_COLOR_TEXT[color]}`}>
                {eyebrowLabel}
              </span>
            </span>

            <h2 className={headingClassName ?? "font-heading text-2xl font-semibold text-primary sm:text-3xl"}>
              {headingLines.map((line, i) => {
                const isLast = i === headingLines.length - 1;
                const spaceIndex = !headingHighlight ? -1 : headingHighlightFullLastLine ? 0 : line.indexOf(" ") + 1;
                return (
                  <span key={i} className="block">
                    {!isLast || spaceIndex <= 0 ? (
                      isLast && spaceIndex === 0 ? (
                        <span style={{ color: headingHighlight }}>{line}</span>
                      ) : (
                        line
                      )
                    ) : (
                      <>
                        {line.slice(0, spaceIndex)}
                        <span style={{ color: headingHighlight }}>{line.slice(spaceIndex)}</span>
                      </>
                    )}
                  </span>
                );
              })}
            </h2>
            <p className="max-w-lg font-reading text-base leading-7 text-secondary">{body}</p>

            {iconGrid ? (
              <div className="grid grid-cols-2 gap-4">
                {iconGrid.map(({ icon: ItemIcon, title, body: itemBody }) => (
                  <div key={title} className="flex flex-col gap-1.5">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[color]}`}>
                      <ItemIcon className={`size-4 ${CARD_COLOR_TEXT[color]}`} aria-hidden="true" />
                    </span>
                    <span className="font-ui text-sm font-semibold text-primary">{title}</span>
                    <span className="font-ui text-xs text-secondary">{itemBody}</span>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {bullets.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className={`mt-0.5 size-4 shrink-0 ${CARD_COLOR_TEXT[color]}`} aria-hidden="true" />
                    <span className="font-ui text-sm text-secondary">{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {stat && (
              <div className="w-fit">
                <StatTile icon={EyebrowIcon} label={stat.label} value={stat.value} color={color} />
              </div>
            )}

            <div className="flex flex-col gap-2">
              {/* Not LinkButton's variant system — every variant carries its
                  own border/background classes that would fight a
                  per-color override without resorting to `!important`.
                  Same buttonBaseClasses as Button/LinkButton, with
                  CARD_COLOR_BADGE's solid fill applied directly instead. */}
              <Link href={ctaHref} className={`${buttonBaseClasses} w-fit ${CARD_COLOR_BADGE[color]} hover:opacity-90`}>
                {ctaLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              {ctaNote && <span className="font-ui text-xs text-secondary">{ctaNote}</span>}
            </div>
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
