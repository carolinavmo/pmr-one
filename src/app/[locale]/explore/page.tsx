import { getLocale, getTranslations } from "next-intl/server";
import { BookOpen, Calendar, Check, X, Layers, ListChecks } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { getPlatformStats, getRecentlyPublishedDiseases } from "@/lib/disease-catalog";
import { getAllCalculators } from "@/lib/clinical-tools";
import { getDeckSummaries, getDeckWithCards } from "@/lib/flashcards";
import { getDashboardStats, getSampleQuestion } from "@/lib/question-bank";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StatTile } from "@/components/ui/StatTile";
import { buttonBaseClasses } from "@/components/ui/button-styles";
import { KnowledgeObjectCard } from "@/components/ui/KnowledgeObjectCard";
import { objectIcons } from "@/components/ui/objectIcons";
import { GuidedTour, type TourStop } from "@/components/explore/GuidedTour";
import {
  ConditionsMockup,
  HandbookMockup,
  FlashcardsMockup,
  QuestionBankMockup,
  ClinicalToolsMockup,
  StudyPlannerMockup,
} from "@/components/home/FeatureMockups";
import {
  SAMPLE_PAGE_TITLE,
  SAMPLE_PROTOCOL_TITLE,
  SAMPLE_TEMPLATE_TITLE,
} from "@/lib/atlas-sample-content";

interface ComparisonRow {
  label: string;
  guest: boolean;
  member: boolean;
}

// The landing spot for a signed-out visitor's "Explore PM&R Atlas" click
// (see HomeHero.tsx) — a guided tour of the platform's four pillars,
// meant to motivate account creation, not the catalog browse itself
// (that's /conditions). A signed-in visitor already has the real
// dashboard at "/" (MemberDashboard), so they're sent there instead of
// seeing a sales pitch for something they already have.
export default async function ExplorePage() {
  const session = await auth();
  if (session) {
    redirect({ href: "/", locale: await getLocale() });
    return;
  }

  const locale = await getLocale();
  const [stats, sampleDiseases, calculators, deckSummaries, questionBankStats, sampleQuestion] = await Promise.all([
    getPlatformStats(),
    getRecentlyPublishedDiseases(3),
    getAllCalculators(locale),
    getDeckSummaries(null),
    getDashboardStats(null),
    getSampleQuestion(),
  ]);
  const publicCalculators = calculators.filter((c) => c.isPublic);
  const lockedCalculatorCount = calculators.length - publicCalculators.length;

  const firstPresetDeck = deckSummaries.presetDecks[0];
  const sampleDeck = firstPresetDeck ? await getDeckWithCards(firstPresetDeck.id, null) : null;
  const flashcardFront = sampleDeck?.cards[0]?.question;
  const totalFlashcards = deckSummaries.presetDecks.reduce((sum, d) => sum + d.cardCount, 0);
  const firstCalculator = publicCalculators[0] ?? calculators[0];
  const mockupDisease = sampleDiseases[0];

  const t = await getTranslations("explore");
  const tHome = await getTranslations("home");
  const tCommon = await getTranslations("common");

  const comparisonRows: ComparisonRow[] = [
    { label: t("comparisonRowBrowse"), guest: true, member: true },
    { label: t("comparisonRowPreview"), guest: true, member: true },
    { label: t("comparisonRowAllTools"), guest: false, member: true },
    { label: t("comparisonRowSave"), guest: false, member: true },
    { label: t("comparisonRowPlanner"), guest: false, member: true },
    { label: t("comparisonRowHandbook"), guest: false, member: true },
  ];

  // The six tour stops, in the app's established feature order — same
  // colors as the homepage's six sections (consistency across pages), but
  // fresh tour-guide-voice copy and a lightweight text-link CTA instead of
  // the homepage's filled pill button (see GuidedTour.tsx).
  const tourStops: TourStop[] = [];

  if (mockupDisease) {
    tourStops.push({
      color: "accent",
      icon: objectIcons.disease,
      eyebrow: tHome("featureConditionsEyebrow"),
      heading: t("tourConditionsHeading"),
      body: t("tourConditionsBody"),
      bullets: [t("tourConditionsBullet1"), t("tourConditionsBullet2")],
      stat: { value: stats.conditions, label: tHome("featureConditionsStatLabel") },
      ctaLabel: t("tourConditionsCta"),
      ctaHref: "/conditions",
      visual: (
        <ConditionsMockup
          diseaseName={mockupDisease.canonicalName}
          snippet={mockupDisease.snippet}
          reviewedAt={mockupDisease.reviewedAt}
          tagLabels={[tHome("cardExaminationTitle"), tHome("cardTreatmentTitle"), tHome("cardRehabilitationTitle")]}
          urlLabel={tHome("featureConditionsUrlLabel", { slug: mockupDisease.slug })}
        />
      ),
    });
  }

  tourStops.push({
    color: "trust",
    icon: BookOpen,
    eyebrow: tHome("featureHandbookEyebrow"),
    heading: t("tourHandbookHeading"),
    body: t("tourHandbookBody"),
    bullets: [t("tourHandbookBullet1"), t("tourHandbookBullet2")],
    ctaLabel: t("tourHandbookCta"),
    ctaHref: "/explore/handbook",
    visual: <HandbookMockup pageTitles={[SAMPLE_PAGE_TITLE, SAMPLE_PROTOCOL_TITLE, SAMPLE_TEMPLATE_TITLE]} />,
  });

  tourStops.push({
    color: "violet",
    icon: Layers,
    eyebrow: tHome("featureFlashcardsEyebrow"),
    heading: t("tourFlashcardsHeading"),
    body: t("tourFlashcardsBody"),
    bullets: [t("tourFlashcardsBullet1"), t("tourFlashcardsBullet2")],
    stat: totalFlashcards > 0 ? { value: totalFlashcards, label: tHome("featureFlashcardsStatLabel") } : undefined,
    ctaLabel: t("tourFlashcardsCta"),
    ctaHref: "/flashcards",
    visual: <FlashcardsMockup front={flashcardFront ?? SAMPLE_PAGE_TITLE} />,
  });

  tourStops.push({
    color: "indigo",
    icon: ListChecks,
    eyebrow: tHome("featureQuestionBankEyebrow"),
    heading: t("tourQuestionBankHeading"),
    body: t("tourQuestionBankBody"),
    bullets: [t("tourQuestionBankBullet1"), t("tourQuestionBankBullet2")],
    stat: { value: questionBankStats.totalQuestions, label: tHome("featureQuestionBankStatLabel") },
    ctaLabel: t("tourQuestionBankCta"),
    ctaHref: "/question-bank",
    visual: sampleQuestion ? (
      <QuestionBankMockup prompt={sampleQuestion.prompt} options={sampleQuestion.options} />
    ) : (
      <QuestionBankMockup
        prompt={t("tourQuestionBankHeading")}
        options={[{ label: t("tourQuestionBankBullet1"), isCorrect: true }]}
      />
    ),
  });

  if (firstCalculator) {
    tourStops.push({
      color: "orange",
      icon: objectIcons.clinical_calculator,
      eyebrow: tHome("featureClinicalToolsEyebrow"),
      heading: t("tourClinicalToolsHeading"),
      body: t("tourClinicalToolsBody"),
      bullets: [t("tourClinicalToolsBullet1"), t("tourClinicalToolsBullet2")],
      stat: { value: calculators.length, label: tHome("featureClinicalToolsStatLabel") },
      ctaLabel: t("tourClinicalToolsCta"),
      ctaHref: "/clinical-tools",
      visual: (
        <ClinicalToolsMockup
          calculatorName={
            firstCalculator.abbreviation ? `${firstCalculator.name} (${firstCalculator.abbreviation})` : firstCalculator.name
          }
          itemLabels={[tHome("featureClinicalToolsItem1"), tHome("featureClinicalToolsItem2")]}
          resultLabel={tHome("featureClinicalToolsResultLabel")}
        />
      ),
      extra:
        publicCalculators.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="font-ui text-xs font-medium text-secondary">{t("featureToolsTryNow")}</span>
            <div className="flex flex-wrap gap-2">
              {publicCalculators.map((calc) => (
                <Link
                  key={calc.id}
                  href={`/clinical-tools/${calc.slug}`}
                  className="rounded-full border border-border bg-surface px-3 py-1 font-ui text-xs text-secondary transition-colors duration-base hover:border-card-orange/40 hover:text-card-orange"
                >
                  {calc.abbreviation ? `${calc.name} (${calc.abbreviation})` : calc.name}
                </Link>
              ))}
            </div>
            {lockedCalculatorCount > 0 && (
              <span className="font-ui text-xs text-secondary/80">
                {t("featureToolsLockedNote", { count: lockedCalculatorCount })}
              </span>
            )}
          </div>
        ) : undefined,
    });
  }

  tourStops.push({
    color: "insight",
    icon: Calendar,
    eyebrow: tHome("featureStudyPlannerEyebrow"),
    heading: t("tourStudyPlannerHeading"),
    body: t("tourStudyPlannerBody"),
    bullets: [t("tourStudyPlannerBullet1"), t("tourStudyPlannerBullet2")],
    ctaLabel: t("tourStudyPlannerCta"),
    ctaHref: "/register",
    visual: (
      <StudyPlannerMockup
        dayLabels={["M", "T", "W", "T", "F", "S", "S"]}
        taskLabel={tHome("featureStudyPlannerTaskLabel")}
      />
    ),
  });

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12">
      <div className="flex w-full max-w-6xl flex-col gap-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="font-heading text-3xl font-semibold text-primary sm:text-4xl">
            {t("pageTitle")}
          </h1>
          <p className="max-w-2xl font-ui text-base text-secondary">
            {t("pageSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile icon={objectIcons.disease} label={tHome("statConditions")} value={stats.conditions} color="accent" />
          <StatTile icon={objectIcons.examination_maneuver} label={tHome("statExamManeuvers")} value={stats.examinationManeuvers} color="trust" />
          <StatTile icon={objectIcons.clinical_pearl} label={tHome("statClinicalPearls")} value={stats.clinicalPearls} color="insight" />
          <StatTile icon={objectIcons.reference} label={tHome("statReferences")} value={stats.references} color="blue" />
        </div>

        <GuidedTour stops={tourStops} />

        {sampleDiseases.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-heading text-lg font-semibold text-primary">
              {t("examplesHeading")}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {sampleDiseases.map((disease) => (
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
          </div>
        )}

        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-lg font-semibold text-primary">
            {t("comparisonHeading")}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised">
            <table className="w-full min-w-[420px] border-collapse font-ui text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium text-secondary">{t("comparisonFeature")}</th>
                  <th className="w-28 px-5 py-3 text-center font-medium text-secondary">{t("comparisonGuest")}</th>
                  <th className="w-28 px-5 py-3 text-center font-medium text-secondary">{t("comparisonMember")}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, index) => (
                  <tr key={row.label} className={index < comparisonRows.length - 1 ? "border-b border-border" : ""}>
                    <td className="px-5 py-3 text-primary">{row.label}</td>
                    <td className="px-5 py-3 text-center">
                      <ComparisonMark available={row.guest} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <ComparisonMark available={row.member} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-2xl bg-accent px-8 py-12 text-center text-white sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-semibold">{t("ctaHeading")}</h2>
            <p className="max-w-md font-ui text-sm text-white/85">{t("ctaBody")}</p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Link href="/register" className={`${buttonBaseClasses} bg-white text-accent hover:bg-white/90`}>
              {tHome("heroCtaSecondary")}
            </Link>
            <Link href="/login" className="font-ui text-xs text-white/80 hover:text-white hover:underline">
              {t("alreadyHaveAccount")} {tCommon("signIn")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function ComparisonMark({ available }: { available: boolean }) {
  return available ? (
    <Check className="mx-auto size-4 text-accent" aria-hidden="true" />
  ) : (
    <X className="mx-auto size-4 text-secondary/40" aria-hidden="true" />
  );
}
