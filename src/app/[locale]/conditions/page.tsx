import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getAllDiseasesForCatalog, getPublishedDiseases } from "@/lib/disease-catalog";
import { getTopicFilter } from "@/lib/topics";
import { KnowledgeObjectCard } from "@/components/ui/KnowledgeObjectCard";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { LinkButton } from "@/components/ui/LinkButton";

interface ConditionsPageProps {
  searchParams: Promise<{ topic?: string }>;
}

export default async function ConditionsPage({ searchParams }: ConditionsPageProps) {
  const { topic: topicSlug } = await searchParams;
  const session = await auth();
  const canReview = session?.user.role === "editor" || session?.user.role === "admin";

  const allDiseases = canReview ? await getAllDiseasesForCatalog() : await getPublishedDiseases();

  // `?topic=` comes from Breadcrumbs links on the disease page — a
  // simple filter on the existing flat catalog rather than a whole
  // dedicated topic-landing-page route, which doesn't exist yet.
  // Falls back to the unfiltered catalog for an unrecognized slug
  // rather than an empty page.
  const topicFilter = topicSlug ? await getTopicFilter(topicSlug) : null;
  const diseases = topicFilter
    ? allDiseases.filter((d) => topicFilter.diseaseSlugs.has(d.slug))
    : allDiseases;
  const t = await getTranslations("catalog");
  const tCommon = await getTranslations("common");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-16">
      <div>
        {topicFilter && (
          <LinkButton href="/conditions" variant="secondary" className="mb-3">
            {t("backToAll")}
          </LinkButton>
        )}
        <h1 className="font-reading text-3xl text-primary">
          {topicFilter ? topicFilter.name : t("heading")}
        </h1>
        <p className="mt-1 font-ui text-sm text-secondary">
          {topicFilter
            ? t("underTopic", { topic: topicFilter.name })
            : canReview
              ? t("allIncludingDrafts")
              : t("evidenceBased")}
        </p>
      </div>

      {diseases.length === 0 ? (
        <p className="font-ui text-sm text-secondary">
          {topicFilter ? t("emptyTopic") : tCommon("moreConditionsComing")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {diseases.map((disease) => (
            <div key={disease.id} className="relative">
              {disease.status !== "published" && (
                <span className="absolute right-3 top-3 z-10">
                  <ClinicalBadge>{disease.status}</ClinicalBadge>
                </span>
              )}
              <KnowledgeObjectCard
                type="disease"
                icon={disease.icon}
                title={disease.canonicalName}
                context={disease.snippet}
                href={`/conditions/${disease.slug}`}
                reviewedAt={disease.reviewedAt}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
