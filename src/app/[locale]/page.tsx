import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Calendar, ShieldCheck, Globe } from "lucide-react";
import { auth } from "@/auth";
import {
  getPublishedDiseases,
  getPlatformStats,
  getRecentlyPublishedDiseases,
} from "@/lib/disease-catalog";
import {
  getRecentlyViewed,
  getFavoriteDiseases,
  getFavoriteCalculators,
} from "@/lib/workspace";
import { getAllAnnotationsForUser } from "@/lib/annotations";
import { getHomepageHero } from "@/lib/homepage-hero";
import { HomeHero } from "@/components/home/HomeHero";
import { KnowledgeObjectCard } from "@/components/ui/KnowledgeObjectCard";
import { LinkButton } from "@/components/ui/LinkButton";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StatTile } from "@/components/ui/StatTile";
import { objectIcons } from "@/components/ui/objectIcons";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";

interface HomeProps {
  searchParams: Promise<{ preview?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const { preview } = await searchParams;
  const [diseases, session, stats] = await Promise.all([
    getPublishedDiseases(),
    auth(),
    getPlatformStats(),
  ]);
  const canReview =
    session?.user.role === "editor" || session?.user.role === "admin";

  // The guest-facing hero below normally never renders for a signed-in
  // visitor (they get the member dashboard instead, which has its own
  // separate hero) — an editor/admin can preview and edit it anyway by
  // appending ?preview=hero (see the "Preview homepage" link in
  // UserMenu), which is the only way they'd ever see this branch while
  // signed in.
  const previewingHero = preview === "hero" && canReview;

  if (session && !previewingHero) {
    const [recentlyViewed, favoriteDiseases, favoriteCalculators, annotations, newConditions] =
      await Promise.all([
        getRecentlyViewed(session.user.id, undefined, 6),
        getFavoriteDiseases(session.user.id),
        getFavoriteCalculators(session.user.id),
        getAllAnnotationsForUser(session.user.id),
        getRecentlyPublishedDiseases(4),
      ]);

    return (
      <MemberDashboard
        name={session.user.name}
        recentlyViewed={recentlyViewed}
        favoriteDiseases={favoriteDiseases}
        favoriteCalculators={favoriteCalculators}
        annotations={annotations}
        newConditions={newConditions}
      />
    );
  }

  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const hero = await getHomepageHero();

  const statCells = [
    { label: t("statConditions"), value: stats.conditions, Icon: objectIcons.disease },
    {
      label: t("statExamManeuvers"),
      value: stats.examinationManeuvers,
      Icon: objectIcons.examination_maneuver,
    },
    {
      label: t("statClinicalPearls"),
      value: stats.clinicalPearls,
      Icon: objectIcons.clinical_pearl,
    },
    {
      label: t("statReferences"),
      value: stats.references,
      Icon: objectIcons.reference,
    },
  ];

  // Same "accent/trust/insight/blue" order the stats row below already
  // uses (statCells) — one consistent color rhythm across the page
  // rather than each section picking its own.
  const everythingCards: { title: string; body: string; Icon: typeof ShieldCheck; href: string | null; color: CardColor }[] = [
    {
      title: t("cardConditionsTitle"),
      body: t("cardConditionsBody"),
      Icon: objectIcons.disease,
      href: "/conditions",
      color: "accent",
    },
    {
      title: t("cardPlannerTitle"),
      body: t("cardPlannerBody"),
      Icon: Calendar,
      href: "/study-planner",
      color: "trust",
    },
    {
      title: t("cardEvidenceTitle"),
      body: t("cardEvidenceBody"),
      Icon: ShieldCheck,
      href: null,
      color: "insight",
    },
    {
      title: t("cardLanguageTitle"),
      body: t("cardLanguageBody"),
      Icon: Globe,
      href: null,
      color: "blue",
    },
  ];

  return (
    <main className="flex flex-1 flex-col items-center">
      {/* Hero band — a full-width tinted section (the app's usual pages
          stay plain-white; this is the one deliberately "arrival"
          moment, same reasoning the homepage's own Eyebrow component
          restricts itself to). The flowing-line artwork is a supplied
          background image, light-mode only (it's a near-white PNG —
          dark mode keeps the plain ambient glow instead of showing a
          bright rectangle on a dark surface). */}
      <section className="relative w-full overflow-hidden border-b border-border bg-surface-raised">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <Image
            src="/homepage-hero-bg.png"
            alt=""
            fill
            priority
            className="hero-bg-photo object-cover"
          />
          <div className="absolute top-0 left-1/2 h-96 w-[50rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/8 blur-3xl" />
        </div>
        <div className="relative mx-auto w-full max-w-6xl px-6 pt-6 pb-16 lg:pt-8 lg:pb-20">
          <HomeHero
            hero={hero}
            canEdit={canReview}
            browseConditionsLabel={tCommon("browseConditions")}
            ctaSecondaryLabel={t("heroCtaSecondary")}
            eyebrowLabel={t("heroEyebrow")}
          />
        </div>
      </section>

      <div className="flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
        {/* Everything you need */}
        <div className="flex flex-col gap-8">
          <h2 className="text-center font-heading text-2xl font-semibold text-primary">
            {t("everythingHeading")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {everythingCards.map(({ title, body, Icon, href, color }) => {
              const card = (
                <div className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5 shadow-sm transition-colors duration-base hover:border-accent/40">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[color]}`}
                  >
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <span className="font-ui text-sm font-semibold text-primary">{title}</span>
                  <span className="font-ui text-sm text-secondary">{body}</span>
                  {href && (
                    <ArrowRight
                      className="mt-auto size-4 text-accent opacity-0 transition-opacity duration-base group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
              return href ? (
                <Link key={title} href={href} className="block h-full">
                  {card}
                </Link>
              ) : (
                <div key={title}>{card}</div>
              );
            })}
          </div>
        </div>

        {/* Real, computed stats — never fabricated */}
        <div className="grid grid-cols-2 gap-3 border-y border-border py-10 sm:grid-cols-4">
          {statCells.map(({ label, value, Icon }, i) => (
            <StatTile
              key={label}
              icon={Icon}
              label={label}
              value={value}
              color={(["accent", "trust", "insight", "blue"] as const)[i]}
            />
          ))}
        </div>

        {/* Conditions catalog */}
        <div className="flex flex-col gap-4">
          <h2>
            <Eyebrow>{t("conditionsHeading")}</Eyebrow>
          </h2>
          {diseases.length === 0 ? (
            <p className="font-ui text-sm text-secondary">
              {tCommon("moreConditionsComing")}
              {canReview && (
                <>
                  {" "}
                  {t("publishFromQueuePrefix")}{" "}
                  <Link href="/admin" className="text-accent hover:underline">
                    {t("reviewQueueLink")}
                  </Link>
                  .
                </>
              )}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {diseases.map((disease) => (
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
          )}
        </div>

        {/* Closing CTA — the app's one real brand color (teal), not an
            invented navy block; no unbuilt-community claims. */}
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-accent px-8 py-12 text-center text-white sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-semibold">{t("ctaBannerHeading")}</h2>
            <p className="max-w-md font-ui text-sm text-white/85">{t("ctaBannerBody")}</p>
          </div>
          <LinkButton
            href="/register"
            variant="secondary"
            className="shrink-0 border-white bg-white text-accent hover:bg-white/90"
          >
            {t("ctaBannerButton")}
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
