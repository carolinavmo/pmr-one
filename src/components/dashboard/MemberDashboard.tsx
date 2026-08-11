import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Compass,
  UserCog,
  ClipboardCheck,
  BookMarked,
  Sparkles,
  NotebookPen,
  Highlighter,
  HeartPulse,
  Ruler,
  Gauge,
} from "lucide-react";
import { KnowledgeObjectCard } from "@/components/ui/KnowledgeObjectCard";
import { objectIcons } from "@/components/ui/objectIcons";
import { BmiCalculatorCard } from "./BmiCalculatorCard";
import type { DiseaseCatalogEntry } from "@/lib/disease-catalog";
import type {
  RecentlyViewedDisease,
  FavoriteDisease,
  UserNote,
} from "@/lib/workspace";
import type { AnnotationWithDisease } from "@/lib/annotations";

interface SavedPearlView {
  id: string;
  html: string;
  diseaseSlug: string | null;
  diseaseName: string | null;
}

interface MemberDashboardProps {
  name: string | null | undefined;
  canReview: boolean;
  recentlyViewed: RecentlyViewedDisease[];
  savedPearls: SavedPearlView[];
  favoriteDiseases: FavoriteDisease[];
  notes: UserNote[];
  annotations: AnnotationWithDisease[];
  suggestedDiseases: DiseaseCatalogEntry[];
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
const TILE_COLOR = {
  accent: "bg-accent/10 text-accent",
  violet: "bg-card-violet/10 text-card-violet",
  rose: "bg-card-rose/10 text-card-rose",
  blue: "bg-card-blue/10 text-card-blue",
} as const;

// Cycled by row index for visual variety — every favourite is
// honestly the same real type (a condition), so this is purely
// decorative, same reasoning as TILE_COLOR's own comment above.
const FAVORITE_TILE_COLORS = [
  TILE_COLOR.accent,
  TILE_COLOR.violet,
  TILE_COLOR.rose,
  TILE_COLOR.blue,
];

// Section anchors (`id`s below) are what Sidebar's Saved/Recent/Notes/
// Bookmarks links jump to — this page is the one real destination for
// all four, reachable from any route since Sidebar renders globally.
export async function MemberDashboard({
  name,
  canReview,
  recentlyViewed,
  savedPearls,
  favoriteDiseases,
  notes,
  annotations,
  suggestedDiseases,
}: MemberDashboardProps) {
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("nav");
  const tAnnotations = await getTranslations("annotations");
  const firstName = firstNameOf(name);
  const annotationGroups = groupAnnotationsByDisease(annotations);

  const QUICK_ACCESS = [
    {
      label: tCommon("browseConditions"),
      href: "/conditions",
      Icon: Compass,
      tile: TILE_COLOR.accent,
    },
    {
      label: t("accountSettings"),
      href: "/account",
      Icon: UserCog,
      tile: TILE_COLOR.blue,
    },
  ];

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

        <section
          id="bookmarks"
          className="flex scroll-mt-20 flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-primary">
              {t("myFavourites")}
            </h2>
            <span className="font-ui text-xs text-secondary">
              {t("favouritedCount", { count: favoriteDiseases.length })}
            </span>
          </div>
          {favoriteDiseases.length === 0 ? (
            <p className="font-ui text-sm text-secondary">
              {t("favouriteEmpty")}
            </p>
          ) : (
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
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-base font-semibold text-primary">
            {t("myTools")}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <BmiCalculatorCard />
            {[
              { label: t("painCalculator"), Icon: Gauge },
              { label: t("romCalculator"), Icon: Ruler },
              { label: t("riskCalculator"), Icon: HeartPulse },
            ].map(({ label, Icon }) => (
              <div
                key={label}
                className="flex cursor-default flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-surface p-4 opacity-70"
                title={t("toolComingSoonTitle", { label })}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-border/40 text-secondary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex items-center gap-2 font-ui text-sm font-medium text-primary">
                  {label}
                  <span className="rounded-full bg-border/50 px-1.5 py-0.5 font-ui text-[10px] font-medium tracking-wide text-secondary uppercase">
                    {t("soonBadge")}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
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
              id="my-notes"
              className="flex scroll-mt-20 flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <NotebookPen className="size-4" aria-hidden="true" />
                </span>
                <div className="flex flex-col">
                  <span className="font-heading text-base font-semibold text-primary">
                    {t("myNotes")}
                  </span>
                  <span className="font-ui text-xs text-secondary">
                    {t("noteCount", { count: notes.length })}
                  </span>
                </div>
              </div>
              {notes.length === 0 ? (
                <p className="font-ui text-sm text-secondary">
                  {t("notesEmpty")}
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {notes.map((note) => (
                    <li
                      key={note.diseaseSlug}
                      className="flex flex-col gap-0.5 py-2.5"
                    >
                      <Link
                        href={`/conditions/${note.diseaseSlug}`}
                        className="font-ui text-sm font-medium text-primary hover:text-accent"
                      >
                        {note.diseaseName}
                      </Link>
                      <p className="line-clamp-2 font-ui text-sm text-secondary">
                        {note.body}
                      </p>
                    </li>
                  ))}
                </ul>
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
                            <blockquote className="line-clamp-1 font-ui text-xs text-secondary italic">
                              &ldquo;{annotation.quoteExact}&rdquo;
                            </blockquote>
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

            {suggestedDiseases.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="font-heading text-base font-semibold text-primary">
                  {t("exploreMoreConditions")}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {suggestedDiseases.map((disease) => (
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

          <div className="flex flex-col gap-4">
            <section className="flex flex-col gap-3 rounded-xl border border-border/40 bg-surface-raised p-3.5 shadow-sm">
              <h2 className="font-ui text-sm font-medium text-primary">
                {t("quickAccess")}
              </h2>
              <div className="flex flex-col gap-1">
                {QUICK_ACCESS.map(({ label, href, Icon, tile }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-md px-2 py-2 font-ui text-sm text-primary transition-colors duration-base hover:bg-border/40"
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${tile}`}
                    >
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    {label}
                  </Link>
                ))}
                {canReview && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 rounded-md px-2 py-2 font-ui text-sm text-primary transition-colors duration-base hover:bg-border/40"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card-rose/10 text-card-rose">
                      <ClipboardCheck className="size-3.5" aria-hidden="true" />
                    </span>
                    {t("reviewQueue")}
                  </Link>
                )}
              </div>
            </section>

            <section
              id="saved-pearls"
              className="flex scroll-mt-20 flex-col gap-3 rounded-xl border border-border/40 bg-surface-raised p-3.5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-insight/10 text-insight">
                  <BookMarked className="size-4" aria-hidden="true" />
                </span>
                <div className="flex flex-col">
                  <span className="font-ui text-sm font-medium text-primary">
                    {tCommon("savedPearls")}
                  </span>
                  <span className="font-ui text-xs text-secondary">
                    {tCommon("savedCount", { count: savedPearls.length })}
                  </span>
                </div>
              </div>
              {savedPearls.length === 0 ? (
                <p className="font-ui text-sm text-secondary">
                  {tCommon("bookmarkPearlEmpty")}
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {savedPearls.map((pearl) => (
                    <li key={pearl.id} className="flex flex-col gap-0.5">
                      {pearl.diseaseSlug ? (
                        <Link
                          href={`/conditions/${pearl.diseaseSlug}`}
                          className="line-clamp-2 font-ui text-sm text-primary hover:text-accent"
                          dangerouslySetInnerHTML={{ __html: pearl.html }}
                        />
                      ) : (
                        <span
                          className="line-clamp-2 font-ui text-sm text-primary"
                          dangerouslySetInnerHTML={{ __html: pearl.html }}
                        />
                      )}
                      {pearl.diseaseName && (
                        <span className="font-ui text-xs text-secondary">
                          {pearl.diseaseName}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-2 rounded-xl border border-accent/30 bg-accent/5 p-4">
              <span className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Sparkles className="size-4" aria-hidden="true" />
                </span>
                <span className="flex items-center gap-2 font-ui text-sm font-medium text-primary">
                  {tNav("aiAssistant")}
                  <span className="rounded-full bg-accent/15 px-1.5 py-0.5 font-ui text-[10px] font-medium tracking-wide text-accent uppercase">
                    {t("betaBadge")}
                  </span>
                </span>
              </span>
              <p className="font-ui text-xs text-secondary">
                {t("aiDescription")}
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
