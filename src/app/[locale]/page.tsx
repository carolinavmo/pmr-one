import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  BookOpen,
  ListChecks,
  TrendingUp,
  Calendar,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { auth } from "@/auth";
import { getPublishedDiseases, getPlatformStats } from "@/lib/disease-catalog";
import {
  getRecentlyViewed,
  getSavedPearls,
  getFavoriteDiseases,
  getAllNotes,
} from "@/lib/workspace";
import { getAllAnnotationsForUser } from "@/lib/annotations";
import { sanitizeRichText } from "@/lib/rich-text";
import { KnowledgeObjectCard } from "@/components/ui/KnowledgeObjectCard";
import { LinkButton } from "@/components/ui/LinkButton";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StatTile } from "@/components/ui/StatTile";
import { objectIcons } from "@/components/ui/objectIcons";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";

export default async function Home() {
  const [diseases, session, stats] = await Promise.all([
    getPublishedDiseases(),
    auth(),
    getPlatformStats(),
  ]);
  const canReview =
    session?.user.role === "editor" || session?.user.role === "admin";

  if (session) {
    const [recentlyViewed, savedPearls, favoriteDiseases, notes, annotations] =
      await Promise.all([
        getRecentlyViewed(session.user.id, undefined, 6),
        getSavedPearls(session.user.id),
        getFavoriteDiseases(session.user.id),
        getAllNotes(session.user.id),
        getAllAnnotationsForUser(session.user.id),
      ]);
    const viewedSlugs = new Set(recentlyViewed.map((d) => d.slug));
    const suggestedDiseases = diseases
      .filter((d) => !viewedSlugs.has(d.slug))
      .slice(0, 4);

    return (
      <MemberDashboard
        name={session.user.name}
        canReview={canReview}
        recentlyViewed={recentlyViewed}
        savedPearls={savedPearls.slice(0, 5).map((pearl) => ({
          id: pearl.id,
          html: sanitizeRichText(pearl.body),
          diseaseSlug: pearl.diseaseSlug,
          diseaseName: pearl.diseaseName,
        }))}
        favoriteDiseases={favoriteDiseases}
        notes={notes}
        annotations={annotations}
        suggestedDiseases={suggestedDiseases}
      />
    );
  }

  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");

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

  const featureRow = [
    { title: t("featureEvidenceTitle"), body: t("featureEvidenceBody"), Icon: BookOpen },
    { title: t("featureClinicalTitle"), body: t("featureClinicalBody"), Icon: objectIcons.disease },
    { title: t("featureStructuredTitle"), body: t("featureStructuredBody"), Icon: ListChecks },
    { title: t("featureProgressTitle"), body: t("featureProgressBody"), Icon: TrendingUp },
  ];

  const everythingCards = [
    {
      title: t("cardConditionsTitle"),
      body: t("cardConditionsBody"),
      Icon: objectIcons.disease,
      href: "/conditions",
    },
    {
      title: t("cardPlannerTitle"),
      body: t("cardPlannerBody"),
      Icon: Calendar,
      href: "/study-planner",
    },
    {
      title: t("cardEvidenceTitle"),
      body: t("cardEvidenceBody"),
      Icon: ShieldCheck,
      href: null,
    },
    {
      title: t("cardLanguageTitle"),
      body: t("cardLanguageBody"),
      Icon: Globe,
      href: null,
    },
  ];

  return (
    <main className="flex flex-1 flex-col items-center">
      {/* Hero band — a full-width tinted section (the app's usual pages
          stay plain-white; this is the one deliberately "arrival"
          moment, same reasoning the homepage's own Eyebrow component
          restricts itself to). The running-brain illustration (same
          mascot as the navbar logo) is a true background layer, not a
          boxed photo — it was composed with an empty light-toned left
          half specifically for text to sit over, so content stays in a
          capped-width column that clears the figure on the right.
          Light-mode only: the image's near-white background would read
          as a stray pale rectangle on the dark surface, so dark mode
          falls back to the plain tinted section it already used
          everywhere else. Desktop (lg+) only for the same reason
          object-cover cropping on a narrow mobile viewport would mostly
          just show empty space or an awkwardly tight crop of the
          figure. */}
      <section className="relative w-full overflow-hidden border-b border-border bg-surface-raised">
        <Image
          src="/hero-brain-bg.png"
          alt=""
          fill
          priority
          className="pointer-events-none absolute inset-0 hidden object-cover object-right lg:block dark:lg:hidden"
        />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
          {/* Capped width only at lg — no auto margins of its own, so
              it hugs this container's left edge (matching the rest of
              the page's max-w-6xl alignment) instead of re-centering
              itself inside the full-bleed section above. */}
          <div className="flex flex-col gap-6 lg:max-w-xl">
            <div className="flex max-w-reading flex-col gap-4">
              <h1 className="font-reading text-4xl text-primary sm:text-5xl">
                {t("heroTitle")}
              </h1>
              <p className="font-reading text-lg leading-7 text-secondary">
                {t("heroSubtitle")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/conditions" variant="primary">
                {tCommon("browseConditions")}
              </LinkButton>
              <LinkButton href="/register" variant="secondary">
                {t("heroCtaSecondary")}
              </LinkButton>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2">
              {featureRow.map(({ title, body, Icon }) => (
                <div key={title} className="flex flex-col gap-1.5">
                  <Icon className="size-4.5 text-accent" aria-hidden="true" />
                  <span className="font-ui text-sm font-medium text-primary">{title}</span>
                  <span className="font-ui text-xs text-secondary">{body}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
        {/* Everything you need */}
        <div className="flex flex-col gap-8">
          <h2 className="text-center font-heading text-2xl font-semibold text-primary">
            {t("everythingHeading")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {everythingCards.map(({ title, body, Icon, href }) => {
              const card = (
                <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5 shadow-sm transition-colors duration-base hover:border-accent/40">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <span className="font-ui text-sm font-semibold text-primary">{title}</span>
                  <span className="font-ui text-sm text-secondary">{body}</span>
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
