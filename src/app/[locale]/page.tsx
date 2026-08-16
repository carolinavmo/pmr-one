import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { BookOpen, Calendar, Layers, ListChecks, RotateCw, Smartphone, Sparkles, TrendingUp } from "lucide-react";
import { auth } from "@/auth";
import { getPlatformStats, getRecentlyPublishedDiseases, getDiseaseBySlugForCatalog } from "@/lib/disease-catalog";
import { getSectionIndex } from "@/lib/disease-loader";
import {
  getRecentlyViewed,
  getFavoriteDiseases,
  getFavoriteCalculators,
} from "@/lib/workspace";
import { getAllAnnotationsForUser } from "@/lib/annotations";
import { getHomepageHero } from "@/lib/homepage-hero";
import { getDashboardStats, getSampleQuestion } from "@/lib/question-bank";
import { getAllCalculators } from "@/lib/clinical-tools";
import { HomeHero } from "@/components/home/HomeHero";
import { BasicSciencesSection } from "@/components/home/BasicSciencesSection";
import { FeatureHeroSection } from "@/components/home/FeatureHeroSection";
import { FlashcardsBackgroundSection } from "@/components/home/FlashcardsBackgroundSection";
import {
  ConditionsMockup,
  HandbookMockup,
  QuestionBankMockup,
  ClinicalToolsGridMockup,
  StudyPlannerMockup,
} from "@/components/home/FeatureMockups";
import { Link } from "@/i18n/navigation";
import { buttonBaseClasses } from "@/components/ui/button-styles";
import { objectIcons } from "@/components/ui/objectIcons";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";
import { SAMPLE_PAGE_TITLE } from "@/lib/atlas-sample-content";

interface HomeProps {
  searchParams: Promise<{ preview?: string }>;
}

const WEEK_DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default async function Home({ searchParams }: HomeProps) {
  const { preview } = await searchParams;
  const session = await auth();
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
  const locale = await getLocale();

  const [hero, platformStats, sampleDisease, questionBankStats, sampleQuestion, calculators] =
    await Promise.all([
      getHomepageHero(),
      getPlatformStats(),
      // A specific, curated disease for the Conditions mockup below —
      // not "most recently published" (that could later become any
      // disease, and the mockup shows a hand-picked one deliberately).
      // Independent of publish status, same as the mockup being
      // unlinked/decorative rather than a real catalog entry.
      getDiseaseBySlugForCatalog("rotator-cuff-tendinopathy"),
      getDashboardStats(null),
      getSampleQuestion(),
      getAllCalculators(locale),
    ]);

  // getSectionIndex is the same cheap "heading text only" query the real
  // disease page's own TOC uses, reused here so the homepage's Conditions
  // mockup can show a real section index instead of inventing one.
  // includeUnpublished: true — this mockup is intentionally independent
  // of publish status (see getDiseaseBySlugForCatalog above), so its
  // section index shouldn't be gated either.
  const sampleSectionIndex = sampleDisease ? await getSectionIndex(sampleDisease.slug, true) : null;
  const firstCalculator = calculators[0];

  return (
    <main className="flex flex-1 flex-col items-center">
      {/* Hero band — a full-width tinted section (the app's usual pages
          stay plain-white; this is the one deliberately "arrival"
          moment, same reasoning the homepage's own Eyebrow component
          restricts itself to). The flowing-line artwork is a supplied
          background image, light-mode only (it's a near-white PNG —
          dark mode keeps the plain ambient glow instead of showing a
          bright rectangle on a dark surface). */}
      <section className="relative w-full overflow-hidden bg-surface-raised">
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
        <div className="relative mx-auto w-full max-w-6xl px-6 pt-8 pb-20 lg:pt-10 lg:pb-28">
          <HomeHero
            hero={hero}
            canEdit={canReview}
            ctaPrimaryLabel={t("heroCtaPrimary")}
            ctaSecondaryLabel={t("heroCtaSecondary")}
            eyebrowLabel={t("heroEyebrow")}
          />
        </div>
      </section>

      {/* Basic Sciences — a deliberate visual "island" ahead of the six
          feature sections below: a fixed light/teal treatment (literal
          Tailwind palette classes, never this app's own dark-aware
          tokens) that doesn't shift with the site's own theme toggle,
          matching a reference the user asked to follow closely. Teaser
          only — Anatomy/Biomechanics/Physical Agents aren't real
          content anywhere in this app yet, so nothing here is a link. */}
      <BasicSciencesSection
        eyebrow={t("basicSciencesEyebrow")}
        headingLine1={t("basicSciencesHeadingLine1")}
        headingLine2={t("basicSciencesHeadingLine2")}
        body={t("basicSciencesBody")}
        topics={{
          anatomy: { title: t("basicSciencesTopicAnatomyTitle"), body: t("basicSciencesTopicAnatomyBody") },
          biomechanics: { title: t("basicSciencesTopicBiomechanicsTitle"), body: t("basicSciencesTopicBiomechanicsBody") },
          physicalAgents: { title: t("basicSciencesTopicPhysicalAgentsTitle"), body: t("basicSciencesTopicPhysicalAgentsBody") },
        }}
        flowHeadingLine1={t("basicSciencesFlowHeadingLine1")}
        flowHeadingLine2={t("basicSciencesFlowHeadingLine2")}
        flowBody={t("basicSciencesFlowBody")}
        steps={{
          step1: { title: t("basicSciencesStep1Title"), body: t("basicSciencesStep1Body") },
          step2: { title: t("basicSciencesStep2Title"), body: t("basicSciencesStep2Body") },
          step3: { title: t("basicSciencesStep3Title"), body: t("basicSciencesStep3Body") },
          step4: { title: t("basicSciencesStep4Title"), body: t("basicSciencesStep4Body") },
        }}
      />

      {/* Six feature sections, one per platform feature, alternating
          band color and text/visual side as the visitor scrolls — see
          FeatureHeroSection.tsx. Order matches the app's own top-level
          nav order. My Handbook and Study Planner are personal,
          empty-until-you-start features for a visitor, so neither gets
          a fabricated stat chip (see this app's long-standing
          no-invented-numbers convention) — their sections lean on
          bullets/copy instead. */}
      {sampleDisease && (
        <FeatureHeroSection
          band="tint"
          reverse={false}
          color="accent"
          eyebrowIcon={objectIcons.disease}
          eyebrowLabel={t("featureConditionsEyebrow")}
          heading={t("featureConditionsHeading")}
          headingHighlight="#5CA4B5"
          headingClassName="font-sans text-3xl leading-tight font-bold text-primary sm:text-4xl"
          body={t("featureConditionsBody")}
          bullets={[t("featureConditionsBullet1"), t("featureConditionsBullet2"), t("featureConditionsBullet3")]}
          stat={{ value: platformStats.conditions, label: t("featureConditionsStatLabel") }}
          ctaLabel={t("featureConditionsCta")}
          ctaHref="/conditions"
          visual={
            <ConditionsMockup
              diseaseName={sampleDisease.canonicalName}
              snippet={sampleDisease.snippet}
              reviewedAt={sampleDisease.reviewedAt}
              tagLabels={[t("cardExaminationTitle"), t("cardTreatmentTitle"), t("cardRehabilitationTitle")]}
              urlLabel={t("featureConditionsUrlLabel", { slug: sampleDisease.slug })}
              breadcrumbLabel={t("featureConditionsEyebrow")}
              indexLabel={t("featureConditionsIndexLabel")}
              overviewLabel={t("featureConditionsOverviewLabel")}
              sections={sampleSectionIndex?.sections ?? []}
              keyPointsLabel={t("featureConditionsKeyPointsLabel")}
              keyPointsBody={t("featureConditionsKeyPointsBody")}
              clinicalPearlsLabel={t("featureConditionsClinicalPearlsLabel")}
              clinicalPearlsBody={t("featureConditionsClinicalPearlsBody")}
            />
          }
        />
      )}

      <FlashcardsBackgroundSection
        eyebrowIcon={Layers}
        eyebrowLabel={t("featureFlashcardsEyebrow")}
        headingLine1={t("featureFlashcardsHeadingLine1")}
        headingLine2={t("featureFlashcardsHeadingLine2")}
        body={t("featureFlashcardsBody")}
        iconGrid={[
          { icon: Sparkles, title: t("featureFlashcardsIcon1Title"), body: t("featureFlashcardsIcon1Body") },
          { icon: RotateCw, title: t("featureFlashcardsIcon2Title"), body: t("featureFlashcardsIcon2Body") },
          { icon: TrendingUp, title: t("featureFlashcardsIcon3Title"), body: t("featureFlashcardsIcon3Body") },
          { icon: Smartphone, title: t("featureFlashcardsIcon4Title"), body: t("featureFlashcardsIcon4Body") },
        ]}
        ctaLabel={t("featureFlashcardsCta")}
        ctaHref="/flashcards"
        ctaNote={t("featureFlashcardsCtaNote")}
      />

      <FeatureHeroSection
        band="tint"
        reverse={false}
        color="accent"
        eyebrowIcon={ListChecks}
        eyebrowLabel={t("featureQuestionBankEyebrow")}
        heading={`${t("featureQuestionBankHeadingLine1")}\n${t("featureQuestionBankHeadingLine2")}`}
        headingHighlight="var(--color-accent)"
        headingHighlightFullLastLine
        headingClassName="font-sans text-3xl leading-tight font-bold text-primary sm:text-4xl"
        body={t("featureQuestionBankBody")}
        bullets={[t("featureQuestionBankBullet1"), t("featureQuestionBankBullet2"), t("featureQuestionBankBullet3")]}
        stat={{ value: questionBankStats.totalQuestions, label: t("featureQuestionBankStatLabel") }}
        ctaLabel={t("featureQuestionBankCta")}
        ctaHref="/question-bank"
        visual={
          sampleQuestion ? (
            <QuestionBankMockup prompt={sampleQuestion.prompt} options={sampleQuestion.options} />
          ) : (
            <QuestionBankMockup
              prompt={t("featureQuestionBankHeading")}
              options={[{ label: t("featureQuestionBankBullet1"), isCorrect: true }]}
            />
          )
        }
      />

      <FeatureHeroSection
        band="surface-raised"
        reverse={true}
        color="accent"
        eyebrowIcon={BookOpen}
        eyebrowLabel={t("featureHandbookEyebrow")}
        heading={t("featureHandbookHeading")}
        body={t("featureHandbookBody")}
        bullets={[t("featureHandbookBullet1"), t("featureHandbookBullet2"), t("featureHandbookBullet3")]}
        ctaLabel={t("featureHandbookCta")}
        ctaHref="/explore/handbook"
        visual={
          <HandbookMockup
            pageTitles={[
              SAMPLE_PAGE_TITLE,
              "Plantar Fasciopathy",
              "Achilles Tendinopathy",
              "Bell's Palsy",
              "Carpal Tunnel Syndrome",
              "Knee Osteoarthritis",
              "Rotator Cuff Tendinopathy",
            ]}
          />
        }
      />

      {firstCalculator && (
        <FeatureHeroSection
          band="tint"
          reverse={false}
          color="accent"
          eyebrowIcon={objectIcons.clinical_calculator}
          eyebrowLabel={t("featureClinicalToolsEyebrow")}
          heading={t("featureClinicalToolsHeading")}
          body={t("featureClinicalToolsBody")}
          bullets={[t("featureClinicalToolsBullet1"), t("featureClinicalToolsBullet2"), t("featureClinicalToolsBullet3")]}
          stat={{ value: calculators.length, label: t("featureClinicalToolsStatLabel") }}
          ctaLabel={t("featureClinicalToolsCta")}
          ctaHref="/clinical-tools"
          visual={
            <ClinicalToolsGridMockup
              calculators={calculators.slice(0, 4).map((c) => ({
                name: c.name,
                abbreviation: c.abbreviation,
                categoryName: c.categoryName,
              }))}
              moreLabel={calculators.length > 4 ? t("featureClinicalToolsMoreLabel", { count: calculators.length - 4 }) : null}
            />
          }
        />
      )}

      <FeatureHeroSection
        band="surface-raised"
        reverse={true}
        color="insight"
        eyebrowIcon={Calendar}
        eyebrowLabel={t("featureStudyPlannerEyebrow")}
        heading={t("featureStudyPlannerHeading")}
        body={t("featureStudyPlannerBody")}
        bullets={[t("featureStudyPlannerBullet1"), t("featureStudyPlannerBullet2"), t("featureStudyPlannerBullet3")]}
        ctaLabel={t("featureStudyPlannerCta")}
        ctaHref="/register"
        visual={<StudyPlannerMockup dayLabels={WEEK_DAY_LABELS} taskLabel={t("featureStudyPlannerTaskLabel")} />}
      />

      <div className="w-full max-w-6xl px-6 py-16">
        {/* Closing CTA — the app's one real brand color (teal), not an
            invented navy block; no unbuilt-community claims. */}
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-accent px-8 py-12 text-center text-white sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-semibold">{t("ctaBannerHeading")}</h2>
            <p className="max-w-md font-ui text-sm text-white/85">{t("ctaBannerBody")}</p>
          </div>
          <Link href="/register" className={`${buttonBaseClasses} shrink-0 bg-white text-accent hover:bg-white/90`}>
            {t("ctaBannerButton")}
          </Link>
        </div>
      </div>
    </main>
  );
}
