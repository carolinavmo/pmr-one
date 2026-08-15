import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { BookOpen, Calendar, Layers, ListChecks } from "lucide-react";
import { auth } from "@/auth";
import { getPlatformStats, getRecentlyPublishedDiseases } from "@/lib/disease-catalog";
import {
  getRecentlyViewed,
  getFavoriteDiseases,
  getFavoriteCalculators,
} from "@/lib/workspace";
import { getAllAnnotationsForUser } from "@/lib/annotations";
import { getHomepageHero } from "@/lib/homepage-hero";
import { getDeckSummaries, getDeckWithCards } from "@/lib/flashcards";
import { getDashboardStats, getSampleQuestion } from "@/lib/question-bank";
import { getAllCalculators } from "@/lib/clinical-tools";
import { HomeHero } from "@/components/home/HomeHero";
import { BasicSciencesSection } from "@/components/home/BasicSciencesSection";
import { FeatureHeroSection } from "@/components/home/FeatureHeroSection";
import {
  ConditionsMockup,
  HandbookMockup,
  FlashcardsMockup,
  QuestionBankMockup,
  ClinicalToolsMockup,
  StudyPlannerMockup,
} from "@/components/home/FeatureMockups";
import { Link } from "@/i18n/navigation";
import { buttonBaseClasses } from "@/components/ui/button-styles";
import { objectIcons } from "@/components/ui/objectIcons";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";
import {
  SAMPLE_PAGE_TITLE,
  SAMPLE_PROTOCOL_TITLE,
  SAMPLE_TEMPLATE_TITLE,
} from "@/lib/atlas-sample-content";

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

  const [hero, platformStats, recentDiseases, deckSummaries, questionBankStats, sampleQuestion, calculators] =
    await Promise.all([
      getHomepageHero(),
      getPlatformStats(),
      getRecentlyPublishedDiseases(1),
      getDeckSummaries(null),
      getDashboardStats(null),
      getSampleQuestion(),
      getAllCalculators(locale),
    ]);

  const sampleDisease = recentDiseases[0];
  const firstPresetDeck = deckSummaries.presetDecks[0];
  // A second, dependent fetch — needs the deck id from the query above,
  // so it can't join the Promise.all. Only the front-of-card text is
  // used (FlashcardsMockup), a small extra query for one homepage visual.
  const sampleDeck = firstPresetDeck ? await getDeckWithCards(firstPresetDeck.id, null) : null;
  const flashcardFront = sampleDeck?.cards[0]?.question;
  const totalFlashcards = deckSummaries.presetDecks.reduce((sum, d) => sum + d.cardCount, 0);
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
          band="surface"
          reverse={false}
          color="accent"
          eyebrowIcon={objectIcons.disease}
          eyebrowLabel={t("featureConditionsEyebrow")}
          heading={t("featureConditionsHeading")}
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
            />
          }
        />
      )}

      <FeatureHeroSection
        band="surface-raised"
        reverse={true}
        color="trust"
        eyebrowIcon={BookOpen}
        eyebrowLabel={t("featureHandbookEyebrow")}
        heading={t("featureHandbookHeading")}
        body={t("featureHandbookBody")}
        bullets={[t("featureHandbookBullet1"), t("featureHandbookBullet2"), t("featureHandbookBullet3")]}
        ctaLabel={t("featureHandbookCta")}
        ctaHref="/explore/handbook"
        visual={<HandbookMockup pageTitles={[SAMPLE_PAGE_TITLE, SAMPLE_PROTOCOL_TITLE, SAMPLE_TEMPLATE_TITLE]} />}
      />

      <FeatureHeroSection
        band="surface"
        reverse={false}
        color="violet"
        eyebrowIcon={Layers}
        eyebrowLabel={t("featureFlashcardsEyebrow")}
        heading={t("featureFlashcardsHeading")}
        body={t("featureFlashcardsBody")}
        bullets={[t("featureFlashcardsBullet1"), t("featureFlashcardsBullet2"), t("featureFlashcardsBullet3")]}
        stat={totalFlashcards > 0 ? { value: totalFlashcards, label: t("featureFlashcardsStatLabel") } : undefined}
        ctaLabel={t("featureFlashcardsCta")}
        ctaHref="/flashcards"
        visual={<FlashcardsMockup front={flashcardFront ?? SAMPLE_PAGE_TITLE} />}
      />

      <FeatureHeroSection
        band="surface-raised"
        reverse={true}
        color="indigo"
        eyebrowIcon={ListChecks}
        eyebrowLabel={t("featureQuestionBankEyebrow")}
        heading={t("featureQuestionBankHeading")}
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

      {firstCalculator && (
        <FeatureHeroSection
          band="surface"
          reverse={false}
          color="orange"
          eyebrowIcon={objectIcons.clinical_calculator}
          eyebrowLabel={t("featureClinicalToolsEyebrow")}
          heading={t("featureClinicalToolsHeading")}
          body={t("featureClinicalToolsBody")}
          bullets={[t("featureClinicalToolsBullet1"), t("featureClinicalToolsBullet2"), t("featureClinicalToolsBullet3")]}
          stat={{ value: calculators.length, label: t("featureClinicalToolsStatLabel") }}
          ctaLabel={t("featureClinicalToolsCta")}
          ctaHref="/clinical-tools"
          visual={
            <ClinicalToolsMockup
              calculatorName={
                firstCalculator.abbreviation ? `${firstCalculator.name} (${firstCalculator.abbreviation})` : firstCalculator.name
              }
              itemLabels={[t("featureClinicalToolsItem1"), t("featureClinicalToolsItem2")]}
              resultLabel={t("featureClinicalToolsResultLabel")}
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
