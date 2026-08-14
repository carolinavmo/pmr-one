import { getLocale, getTranslations } from "next-intl/server";
import { BookOpen, Calendar, Check, X, ArrowRight, Star } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { getPlatformStats, getRecentlyPublishedDiseases } from "@/lib/disease-catalog";
import { getAllCalculators } from "@/lib/clinical-tools";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StatTile } from "@/components/ui/StatTile";
import { LinkButton } from "@/components/ui/LinkButton";
import { KnowledgeObjectCard } from "@/components/ui/KnowledgeObjectCard";
import { TrustIndicator } from "@/components/ui/TrustIndicator";
import { objectIcons } from "@/components/ui/objectIcons";
import { CARD_COLOR_CARD, CARD_COLOR_CHIP } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";

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
  const [stats, sampleDiseases, calculators] = await Promise.all([
    getPlatformStats(),
    getRecentlyPublishedDiseases(3),
    getAllCalculators(locale),
  ]);
  const publicCalculators = calculators.filter((c) => c.isPublic);
  const lockedCalculatorCount = calculators.length - publicCalculators.length;

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

  const whyItems = [
    t("whyItem1"),
    t("whyItem2"),
    t("whyItem3"),
    t("whyItem4"),
    t("whyItem5"),
    t("whyItem6"),
  ];

  // A curated subset of Plantar Fasciopathy's real section headings
  // (db/seed/plantar-fasciopathy.mjs), not the full 22-heading list —
  // enough to read as "this is a real, structured page" without
  // cramming the mockup. mockupDisease itself (below) is real data
  // from the query above, not fabricated.
  const mockupSections = [
    t("mockupSectionOverview"),
    t("mockupSectionAnatomy"),
    t("mockupSectionEpidemiology"),
    t("mockupSectionPresentation"),
    t("mockupSectionExamination"),
    t("mockupSectionRehab"),
    t("mockupSectionReferences"),
  ];
  const mockupTypeTags: { Icon: typeof objectIcons.disease; label: string; color: CardColor }[] = [
    { Icon: objectIcons.examination_maneuver, label: tHome("cardExaminationTitle"), color: "trust" },
    { Icon: objectIcons.treatment_algorithm, label: tHome("cardTreatmentTitle"), color: "insight" },
    { Icon: objectIcons.rehabilitation_protocol, label: tHome("cardRehabilitationTitle"), color: "blue" },
  ];
  const mockupDisease = sampleDiseases[0];

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

        {mockupDisease && (
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h2 className="font-heading text-2xl font-semibold text-primary">
                {t("whyHeading")}
              </h2>
              <ul className="flex flex-col gap-3">
                {whyItems.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                    <span className="font-ui text-sm text-secondary">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-lg">
              <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
                <span className="flex shrink-0 gap-1.5">
                  <span className="size-2.5 rounded-full bg-card-red/50" />
                  <span className="size-2.5 rounded-full bg-card-yellow/50" />
                  <span className="size-2.5 rounded-full bg-card-green/50" />
                </span>
                <span className="flex-1 truncate rounded-full bg-border/30 px-3 py-1 text-center font-ui text-[11px] text-secondary">
                  pmratlas.com/conditions/{mockupDisease.slug}
                </span>
              </div>

              <div className="flex flex-col gap-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-heading text-lg font-semibold text-primary">
                    {mockupDisease.canonicalName}
                  </h3>
                  <TrustIndicator reviewedAt={mockupDisease.reviewedAt} />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {mockupSections.map((section) => (
                    <span
                      key={section}
                      className="rounded-full border border-border px-2.5 py-1 font-ui text-[11px] text-secondary"
                    >
                      {section}
                    </span>
                  ))}
                </div>

                <p className="line-clamp-2 font-ui text-sm text-secondary">
                  {mockupDisease.snippet}
                </p>

                <div className="flex items-start gap-2.5 rounded-xl border border-insight/30 bg-insight/5 px-4 py-3">
                  <Star className="mt-0.5 size-4 shrink-0 text-insight" aria-hidden="true" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-ui text-xs font-semibold text-insight">
                      {t("mockupKeyTakeawayLabel")}
                    </span>
                    <span className="font-ui text-xs text-secondary">
                      {t("mockupKeyTakeawayBody")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 border-t border-border pt-3">
                  {mockupTypeTags.map(({ Icon, label, color }) => (
                    <span key={label} className="flex items-center gap-1.5 font-ui text-[11px] text-secondary">
                      <span className={`flex size-6 items-center justify-center rounded-full ${CARD_COLOR_CHIP[color]}`}>
                        <Icon className="size-3" aria-hidden="true" />
                      </span>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FeatureCard
            icon={<objectIcons.disease className="size-5" aria-hidden="true" />}
            color="accent"
            title={t("featureConditionsTitle")}
            body={t("featureConditionsBody")}
            cta={{ label: t("featureConditionsCta"), href: "/conditions" }}
          >
            {sampleDiseases.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sampleDiseases.map((disease) => (
                  <Link
                    key={disease.slug}
                    href={`/conditions/${disease.slug}`}
                    className="rounded-full border border-border bg-surface px-3 py-1 font-ui text-xs text-secondary transition-colors duration-base hover:border-accent/40 hover:text-accent"
                  >
                    {disease.canonicalName}
                  </Link>
                ))}
              </div>
            )}
          </FeatureCard>

          <FeatureCard
            icon={<objectIcons.clinical_calculator className="size-5" aria-hidden="true" />}
            color="orange"
            title={t("featureToolsTitle")}
            body={t("featureToolsBody")}
            cta={{ label: t("featureToolsCta"), href: "/clinical-tools" }}
          >
            {publicCalculators.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="font-ui text-xs font-medium text-secondary">
                  {t("featureToolsTryNow")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {publicCalculators.map((calc) => (
                    <Link
                      key={calc.id}
                      href={`/clinical-tools/${calc.slug}`}
                      className="rounded-full border border-border bg-surface px-3 py-1 font-ui text-xs text-secondary transition-colors duration-base hover:border-accent/40 hover:text-accent"
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
            )}
          </FeatureCard>

          <FeatureCard
            icon={<BookOpen className="size-5" aria-hidden="true" />}
            color="trust"
            title={t("featureHandbookTitle")}
            body={t("featureHandbookBody")}
            cta={{ label: t("featureHandbookCta"), href: "/explore/handbook" }}
          >
            <span className="font-ui text-xs text-secondary/80">{t("featureHandbookNote")}</span>
          </FeatureCard>

          <FeatureCard
            icon={<Calendar className="size-5" aria-hidden="true" />}
            color="insight"
            title={t("featurePlannerTitle")}
            body={t("featurePlannerBody")}
          >
            <span className="font-ui text-xs text-secondary/80">{t("featurePlannerNote")}</span>
          </FeatureCard>
        </div>

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
            <LinkButton
              href="/register"
              variant="secondary"
              className="!border-white !bg-white !text-accent hover:!bg-white/90"
            >
              {tHome("heroCtaSecondary")}
            </LinkButton>
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

function FeatureCard({
  icon,
  color,
  title,
  body,
  cta,
  children,
}: {
  icon: React.ReactNode;
  color: CardColor;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-4 rounded-2xl border p-6 ${CARD_COLOR_CARD[color]}`}>
      <div className="flex items-start gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[color]}`}>
          {icon}
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-base font-semibold text-primary">{title}</h3>
          <p className="font-ui text-sm text-secondary">{body}</p>
        </div>
      </div>
      {children}
      {cta && (
        <Link
          href={cta.href}
          className="mt-auto flex items-center gap-1 font-ui text-sm font-medium text-accent hover:underline"
        >
          {cta.label}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
