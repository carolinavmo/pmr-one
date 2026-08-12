"use client";

import { BookOpen, ListChecks, TrendingUp } from "lucide-react";
import { EditableSection } from "@/components/disease-page/EditMode";
import { EditableText } from "@/components/ui/EditableText";
import { LinkButton } from "@/components/ui/LinkButton";
import { objectIcons } from "@/components/ui/objectIcons";
import {
  updateHomepageHeroTextAction,
  updateHomepageHeroCardFieldAction,
} from "@/lib/actions/homepage-hero";
import type { HomepageHero } from "@/lib/homepage-hero";

// The 4 feature-card icons stay fixed in code — only the cards' own
// title/body text is admin-editable (homepage_hero.cards, migration
// 0035). Position in this array lines up with position in the DB's
// cards array; adding icon-editability later would need an icon-name
// lookup like cardIcons.ts, not worth it for four never-reordered slots.
const HERO_FEATURE_ICONS = [BookOpen, objectIcons.disease, ListChecks, TrendingUp];

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
  browseConditionsLabel,
  ctaSecondaryLabel,
}: {
  hero: HomepageHero;
  canEdit: boolean;
  browseConditionsLabel: string;
  ctaSecondaryLabel: string;
}) {
  return (
    <EditableSection canEdit={canEdit}>
      <div className="flex flex-col gap-6 lg:max-w-xl">
        <div className="flex max-w-reading flex-col gap-4">
          <EditableText
            as="h1"
            value={hero.title}
            onSave={(v) => updateHomepageHeroTextAction("title", v)}
            multiline={false}
            className="font-reading text-4xl text-primary sm:text-5xl"
          />
          <EditableText
            as="p"
            value={hero.subtitle}
            onSave={(v) => updateHomepageHeroTextAction("subtitle", v)}
            className="font-reading text-lg leading-7 text-secondary"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <LinkButton href="/conditions" variant="primary">
            {browseConditionsLabel}
          </LinkButton>
          <LinkButton href="/register" variant="secondary">
            {ctaSecondaryLabel}
          </LinkButton>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2">
          {hero.cards.map((card, index) => {
            const Icon = HERO_FEATURE_ICONS[index] ?? BookOpen;
            return (
              <div key={index} className="flex flex-col gap-1.5">
                <Icon className="size-4.5 text-accent" aria-hidden="true" />
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
            );
          })}
        </div>
      </div>
    </EditableSection>
  );
}
