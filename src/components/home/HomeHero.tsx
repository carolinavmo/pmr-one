"use client";

import Image from "next/image";
import { Bookmark, GraduationCap, Plus, ShieldCheck, Target } from "lucide-react";
import { useEditMode, EditableSection } from "@/components/disease-page/EditMode";
import { EditableText } from "@/components/ui/EditableText";
import { LinkButton } from "@/components/ui/LinkButton";
import {
  updateHomepageHeroTextAction,
  updateHomepageHeroCardFieldAction,
} from "@/lib/actions/homepage-hero";
import type { HomepageHero } from "@/lib/homepage-hero";

// The 4 feature-bullet icons stay fixed in code — only the bullets'
// own title/body text is admin-editable (homepage_hero.cards,
// migration 0035). Position in this array lines up with position in
// the DB's cards array.
const HERO_FEATURE_ICONS = [ShieldCheck, Bookmark, Target, GraduationCap];

// The hero title is one free-text field (no separate "line 2" column
// in homepage_hero) — split on the first ". " so an editor's plain
// sentence ("Master PM&R. From residency to clinical practice.")
// still reads as the two-tone, two-line treatment below. A title
// without that punctuation just renders as a single line, same tone
// throughout — a graceful fallback, not an error state.
function splitHeroTitle(title: string): [string, string | null] {
  const cut = title.indexOf(". ");
  if (cut === -1) return [title, null];
  return [title.slice(0, cut + 1), title.slice(cut + 2)];
}

// A "use client" leaf, same reason every other editable surface in
// this app (OverviewBlockView, DashboardHeroSection, ...) is one — the
// onSave closures below wrap a server action call with extra
// arguments (field name, card index), and a plain closure like that
// can't be handed to a Client Component as a prop straight from a
// Server Component (only a direct reference to a "use server" export
// serializes across that boundary). Defining the closures here, on
// the client side of that boundary, sidesteps the problem entirely —
// `updateHomepageHeroTextAction` itself is still the thing that
// actually crosses to the server, same RPC mechanism as any other
// server action call from client code.
export function HomeHero({
  hero,
  canEdit,
  ctaPrimaryLabel,
  ctaSecondaryLabel,
  eyebrowLabel,
}: {
  hero: HomepageHero;
  canEdit: boolean;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
  eyebrowLabel: string;
}) {
  return (
    <EditableSection canEdit={canEdit}>
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex size-48 items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-accent/10 blur-xl"
            />
            <Image
              src="/brand-logo-v2.png"
              alt=""
              width={1381}
              height={1139}
              priority
              className="relative w-40"
            />
            <Plus
              aria-hidden="true"
              className="absolute top-0 left-2 size-4 text-accent/50"
              strokeWidth={2.5}
            />
            <Plus
              aria-hidden="true"
              className="absolute right-1 bottom-3 size-3.5 text-accent/35"
              strokeWidth={2.5}
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="rounded-full bg-accent/10 px-4 py-1.5 font-ui text-xs font-semibold tracking-wide text-accent uppercase">
              {eyebrowLabel}
            </span>
            <div className="flex flex-col items-center gap-4">
              <HeroTitle
                title={hero.title}
                onSave={(v) => updateHomepageHeroTextAction("title", v)}
              />
              <EditableText
                as="p"
                value={hero.subtitle}
                onSave={(v) => updateHomepageHeroTextAction("subtitle", v)}
                className="max-w-4xl font-reading text-lg leading-7 text-secondary"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton href="/explore" variant="primary">
            {ctaPrimaryLabel}
          </LinkButton>
          <LinkButton href="/register" variant="secondary">
            {ctaSecondaryLabel}
          </LinkButton>
        </div>
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
          {hero.cards.map((card, index) => {
            const Icon = HERO_FEATURE_ICONS[index] ?? ShieldCheck;
            return (
              <div
                key={index}
                className="flex items-start gap-2.5 py-4 text-left sm:border-l sm:border-border sm:px-6 sm:py-0 sm:first:border-l-0 sm:first:pl-0"
              >
                <Icon className="mt-0.5 size-4.5 shrink-0 text-accent" aria-hidden="true" />
                <div className="flex flex-col">
                  <EditableText
                    as="span"
                    value={card.title}
                    onSave={(v) => updateHomepageHeroCardFieldAction(index, "title", v)}
                    multiline={false}
                    className="font-ui text-sm font-medium text-primary"
                  />
                  <EditableText
                    as="span"
                    value={card.body}
                    onSave={(v) => updateHomepageHeroCardFieldAction(index, "body", v)}
                    multiline={false}
                    className="font-ui text-xs text-secondary"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </EditableSection>
  );
}

// Editing (the "Edit" toggle is on) falls back to the plain single-
// line EditableText — an editor typing a new sentence needs to see
// and select raw text, not a pre-split two-color preview. The
// two-tone split render only kicks in for the (vast majority of)
// views where editing is off: visitors, and editors just browsing.
function HeroTitle({
  title,
  onSave,
}: {
  title: string;
  onSave: (value: string) => Promise<void>;
}) {
  const { editing } = useEditMode();

  if (editing) {
    return (
      <EditableText
        as="h1"
        value={title}
        onSave={onSave}
        multiline={false}
        className="font-heading text-3xl font-bold text-primary sm:text-4xl"
      />
    );
  }

  const [line1, line2] = splitHeroTitle(title);
  return (
    <h1 className="font-heading leading-tight font-bold">
      <span className="block text-6xl text-primary sm:text-7xl">{line1}</span>
      {line2 && (
        <span className="mt-1 block text-4xl text-accent sm:text-5xl lg:whitespace-nowrap">
          {line2}
        </span>
      )}
    </h1>
  );
}
