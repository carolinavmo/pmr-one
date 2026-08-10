import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { getPublishedDiseases, getPlatformStats } from "@/lib/disease-catalog";
import {
  getRecentlyViewed,
  getSavedPearls,
  getFavoriteDiseases,
  getAllNotes,
} from "@/lib/workspace";
import { sanitizeRichText } from "@/lib/rich-text";
import { KnowledgeObjectCard } from "@/components/ui/KnowledgeObjectCard";
import { LinkButton } from "@/components/ui/LinkButton";
import { Eyebrow } from "@/components/ui/Eyebrow";
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
    const [recentlyViewed, savedPearls, favoriteDiseases, notes] =
      await Promise.all([
        getRecentlyViewed(session.user.id, undefined, 6),
        getSavedPearls(session.user.id),
        getFavoriteDiseases(session.user.id),
        getAllNotes(session.user.id),
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

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-5xl flex-col gap-12">
        <div className="flex max-w-reading flex-col gap-4">
          <h1 className="font-reading text-4xl text-primary sm:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="font-reading text-lg leading-7 text-secondary">
            {t("heroSubtitle")}
          </p>
          <div>
            <LinkButton href="/conditions" variant="primary">
              {tCommon("browseConditions")}
            </LinkButton>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCells.map(({ label, value, Icon }) => (
            <div
              key={label}
              className="flex flex-col gap-1 rounded-lg border border-border bg-surface-raised p-4"
            >
              <Icon className="size-4 text-secondary" aria-hidden="true" />
              <span className="font-reading text-2xl text-primary">
                {value}
              </span>
              <span className="font-ui text-sm text-secondary">{label}</span>
            </div>
          ))}
        </div>

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
      </div>
    </main>
  );
}
