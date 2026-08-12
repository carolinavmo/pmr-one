import { Link } from "@/i18n/navigation";
import { objectIcons } from "./objectIcons";
import { cardIcons, type CardIconName } from "./cardIcons";
import { TrustIndicator } from "./TrustIndicator";
import type { KnowledgeObjectType } from "@/lib/knowledge-objects";
import type { CardColor } from "@/lib/editorial-blocks";
import { CARD_COLOR_CARD, CARD_COLOR_CHIP } from "@/lib/card-colors";

interface BaseProps {
  title: string;
  context: string;
  href: string;
  reviewedAt?: Date | string | null;
  // Overrides the type-derived icon (objectIcons[type]) — e.g. a
  // region-derived icon per disease so a card grid isn't the same
  // icon repeated for every row. Optional: every existing call site
  // that doesn't pass one keeps its current icon unchanged.
  icon?: CardIconName;
  // A subtle border/background/icon-chip tint (same CARD_COLOR_CARD/
  // CARD_COLOR_CHIP tokens the topic sidebar and admin editor already
  // use) — currently only ClinicalToolsBrowser passes this, tying each
  // calculator card to its category's color. Optional and additive:
  // every other call site keeps its current plain-neutral look.
  categoryColor?: CardColor;
}

// Illustration cards are the one exception to "icon leads" — the
// thumbnail IS the content, not a label for it (Tier 2) — so a
// thumbnail is required for that variant and only that variant.
type KnowledgeObjectCardProps =
  | (BaseProps & { type: Exclude<KnowledgeObjectType, "medical_illustration"> })
  | (BaseProps & {
      type: "medical_illustration";
      thumbnailUrl: string;
      thumbnailAlt: string;
    });

// One skeleton, reused for every object type — the literal mechanism
// behind "one object, one look, everywhere" (Tier 2). Variants only
// change content, never the five-slot layout.
export function KnowledgeObjectCard(props: KnowledgeObjectCardProps) {
  const { type, title, context, href, reviewedAt, icon, categoryColor } = props;
  const Icon = icon ? cardIcons[icon] : objectIcons[type];
  const isPearl = type === "clinical_pearl";
  const showTrust = type !== "reference";

  return (
    <Link
      href={href}
      className={`flex items-start gap-3 rounded-lg border p-4 transition-colors duration-base hover:bg-border/20 ${
        categoryColor ? CARD_COLOR_CARD[categoryColor] : isPearl ? "border-insight/40 bg-surface-raised" : "border-border bg-surface-raised"
      }`}
    >
      {type === "medical_illustration" ? (
        // eslint-disable-next-line @next/next/no-img-element -- asset_url is an arbitrary external URL (schema-v1.0.sql); no fixed remote-pattern domain to configure yet.
        <img
          src={props.thumbnailUrl}
          alt={props.thumbnailAlt}
          className="size-12 shrink-0 rounded-md object-cover"
        />
      ) : (
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-md ${
            categoryColor
              ? CARD_COLOR_CHIP[categoryColor]
              : isPearl
                ? "bg-insight/10 text-insight"
                : "bg-surface text-secondary"
          }`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-2 font-reading text-base text-primary">
          {title}
        </span>
        <span className="truncate font-ui text-sm text-secondary">
          {context}
        </span>
        {showTrust && <TrustIndicator reviewedAt={reviewedAt} />}
      </span>
    </Link>
  );
}
