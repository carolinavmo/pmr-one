import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BookOpen, ArrowRight, Highlighter } from "lucide-react";
import { KnowledgeObjectCard } from "@/components/ui/KnowledgeObjectCard";
import { objectIcons } from "@/components/ui/objectIcons";
import { CARD_COLOR_SWATCH, CARD_COLOR_CHIP } from "@/lib/card-colors";
import type { DiseaseCatalogEntry } from "@/lib/disease-catalog";
import type {
  RecentlyViewedDisease,
  FavoriteDisease,
  FavoriteCalculator,
} from "@/lib/workspace";
import type { AnnotationWithDisease } from "@/lib/annotations";

interface MemberDashboardProps {
  name: string | null | undefined;
  recentlyViewed: RecentlyViewedDisease[];
  favoriteDiseases: FavoriteDisease[];
  favoriteCalculators: FavoriteCalculator[];
  annotations: AnnotationWithDisease[];
  newConditions: DiseaseCatalogEntry[];
}

interface AnnotationGroup {
  diseaseSlug: string;
  diseaseName: string;
  items: AnnotationWithDisease[];
}

// Annotations already arrive ordered by disease name (see
// getAllAnnotationsForUser's SQL), so a single pass preserves that
// order while clustering each disease's rows together — same
// Map-bucketing idiom topics.ts uses for parent/child grouping.
function groupAnnotationsByDisease(
  annotations: AnnotationWithDisease[],
): AnnotationGroup[] {
  const groups = new Map<string, AnnotationGroup>();
  for (const annotation of annotations) {
    const existing = groups.get(annotation.diseaseId);
    if (existing) {
      existing.items.push(annotation);
    } else {
      groups.set(annotation.diseaseId, {
        diseaseSlug: annotation.diseaseSlug,
        diseaseName: annotation.diseaseName,
        items: [annotation],
      });
    }
  }
  return Array.from(groups.values());
}

function greeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("greetingMorning");
  if (hour < 18) return t("greetingAfternoon");
  return t("greetingEvening");
}

// Never fabricates a name — falls back to no name at all rather than
// inventing one, same discipline as UserMenu's initialsFor.
function firstNameOf(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.trim().split(/\s+/)[0] ?? null;
}

function formatViewedAt(iso: string, today: string, yesterday: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterdayDate.toDateString();

  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (isToday) return `${today} ${time}`;
  if (isYesterday) return `${yesterday} ${time}`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// A small, purely-decorative rotation over the app's existing
// card-color tokens (card-colors.ts) — the same palette
// ParagraphBlockView already uses for author-chosen card backgrounds,
// reused here for icon-tile variety instead of inventing new colors.
// Favorite calculators use their real category color instead
// (CARD_COLOR_CHIP[calc.categoryColor]) since that's meaningful, not
// decorative — matching how /clinical-tools itself colors them.
const FAVORITE_TILE_COLORS = [
  "bg-accent/10 text-accent",
  "bg-card-violet/10 text-card-violet",
  "bg-card-rose/10 text-card-rose",
  "bg-card-blue/10 text-card-blue",
];

// Section anchors (`id`s below) are what Sidebar's Saved/Recent/
// Bookmarks links jump to — this page is the one real destination for
// each, reachable from any route since Sidebar renders globally.
export async function MemberDashboard({
  name,
  recentlyViewed,
  favoriteDiseases,
  favoriteCalculators,
  annotations,
  newConditions,
}: MemberDashboardProps) {
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("nav");
  const tAnnotations = await getTranslations("annotations");
  const firstName = firstNameOf(name);
  const annotationGroups = groupAnnotationsByDisease(annotations);
  const favoriteCount = favoriteDiseases.length + favoriteCalculators.length;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">
            {greeting(t)}
            {firstName ? `, ${t("doctorPrefix")} ${firstName}` : ""} 👋
          </h1>
          <p className="font-ui text-sm text-secondary">
            {t("continueJourney")}
          </p>
        </div>

        {/* My Handbook — the platform's newest feature, given real
            visual weight (full-width banner, larger icon/type) rather
            than a narrow sidebar card, so it reads as a headline
            destination and not an afterthought. */}
        <Link
          href="/my-atlas"
          className="group flex flex-col items-start gap-4 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-6 transition-colors duration-base hover:border-accent/50 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <BookOpen className="size-6" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2 font-heading text-lg font-semibold text-primary">
                {tNav("myAtlas")}
                <span className="rounded-full bg-accent/15 px-2 py-0.5 font-ui text-[10px] font-medium tracking-wide text-accent uppercase">
                  {t("newBadge")}
                </span>
              </span>
              <p className="max-w-md font-ui text-sm text-secondary">
                {t("myHandbookDescription")}
              </p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 font-ui text-sm font-medium text-white transition-colors duration-base group-hover:bg-accent-hover">
            {t("myHandbookCta")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </Link>

        <section
          id="bookmarks"
          className="flex scroll-mt-20 flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-primary">
              {t("myFavourites")}
            </h2>
            <span className="font-ui text-xs text-secondary">
              {t("favouritedCount", { count: favoriteCount })}
            </span>
          </div>
          {favoriteCount === 0 ? (
            <p className="font-ui text-sm text-secondary">
              {t("favouriteEmpty")}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {favoriteDiseases.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-ui text-xs font-semibold tracking-wide text-secondary uppercase">
                    {t("favouriteConditionsLabel")}
                  </span>
                  <div className="flex flex-col divide-y divide-border">
                    {favoriteDiseases.map((disease, index) => (
                      <Link
                        key={disease.slug}
                        href={`/conditions/${disease.slug}`}
                        className="flex items-center gap-3 py-2.5 transition-colors duration-base hover:text-accent"
                      >
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-md ${FAVORITE_TILE_COLORS[index % FAVORITE_TILE_COLORS.length]}`}
                        >
                          <objectIcons.disease
                            className="size-4"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="min-w-0 truncate font-ui text-sm font-medium text-primary">
                          {disease.canonicalName}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {favoriteCalculators.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-ui text-xs font-semibold tracking-wide text-secondary uppercase">
                    {t("favouriteCalculatorsLabel")}
                  </span>
                  <div className="flex flex-col divide-y divide-border">
                    {favoriteCalculators.map((calculator) => (
                      <Link
                        key={calculator.id}
                        href={`/clinical-tools/${calculator.slug}`}
                        className="flex items-center gap-3 py-2.5 transition-colors duration-base hover:text-accent"
                      >
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-md ${CARD_COLOR_CHIP[calculator.categoryColor]}`}
                        >
                          <objectIcons.clinical_calculator
                            className="size-4"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="min-w-0 truncate font-ui text-sm font-medium text-primary">
                          {calculator.abbreviation
                            ? `${calculator.name} (${calculator.abbreviation})`
                            : calculator.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section
          id="recent-activity"
          className="flex scroll-mt-20 flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-primary">
              {t("recentActivity")}
            </h2>
            <Link
              href="/conditions"
              className="font-ui text-sm text-accent hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>
          {recentlyViewed.length === 0 ? (
            <p className="font-ui text-sm text-secondary">
              {t("recentActivityEmpty")}
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              <div className="hidden grid-cols-[1fr_auto_auto] gap-4 px-1 pb-1 font-ui text-xs text-secondary sm:grid">
                <span>{t("colItem")}</span>
                <span>{t("colType")}</span>
                <span>{t("colLastViewed")}</span>
              </div>
              {recentlyViewed.map((disease) => (
                <Link
                  key={disease.slug}
                  href={`/conditions/${disease.slug}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 py-2.5 transition-colors duration-base hover:text-accent sm:grid-cols-[1fr_auto_auto]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                      <objectIcons.disease
                        className="size-4"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="min-w-0 truncate font-ui text-sm font-medium text-primary">
                      {disease.canonicalName}
                    </span>
                  </span>
                  <span className="hidden font-ui text-xs text-secondary sm:block">
                    {t("typeCondition")}
                  </span>
                  <span className="shrink-0 font-ui text-xs text-secondary">
                    {formatViewedAt(disease.viewedAt, t("today"), t("yesterday"))}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section
          id="highlights-notes"
          className="flex scroll-mt-20 flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Highlighter className="size-4" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="font-heading text-base font-semibold text-primary">
                {tAnnotations("highlightsAndNotes")}
              </span>
              <span className="font-ui text-xs text-secondary">
                {tCommon("savedCount", { count: annotations.length })}
              </span>
            </div>
          </div>
          {annotationGroups.length === 0 ? (
            <p className="font-ui text-sm text-secondary">
              {tAnnotations("noHighlightsYet")}
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {annotationGroups.map((group) => (
                <div key={group.diseaseSlug} className="flex flex-col gap-2 py-2.5">
                  <Link
                    href={`/conditions/${group.diseaseSlug}`}
                    className="font-ui text-sm font-medium text-primary hover:text-accent"
                  >
                    {group.diseaseName}
                  </Link>
                  <ul className="flex flex-col gap-2">
                    {group.items.map((annotation) => (
                      <li
                        key={annotation.id}
                        className="flex flex-col gap-0.5 border-l-2 border-border pl-3"
                      >
                        <div className="flex items-start gap-1.5">
                          <span
                            className={`mt-1 size-2 shrink-0 rounded-full ${CARD_COLOR_SWATCH[annotation.color]}`}
                            aria-hidden="true"
                          />
                          <blockquote className="line-clamp-1 min-w-0 flex-1 font-ui text-xs text-secondary italic">
                            &ldquo;{annotation.quoteExact}&rdquo;
                          </blockquote>
                        </div>
                        <p className="line-clamp-2 font-ui text-sm text-primary">
                          {annotation.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {newConditions.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-base font-semibold text-primary">
              {t("newConditionsHeading")}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {newConditions.map((disease) => (
                <KnowledgeObjectCard
                  key={disease.id}
                  type="disease"
                  icon={disease.icon}
                  title={disease.canonicalName}
                  context={disease.snippet}
                  href={`/conditions/${disease.slug}`}
                  reviewedAt={disease.reviewedAt}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
