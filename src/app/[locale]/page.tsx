import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { auth } from "@/auth";
import { getRecentlyPublishedDiseases } from "@/lib/disease-catalog";
import {
  getRecentlyViewed,
  getFavoriteDiseases,
  getFavoriteCalculators,
} from "@/lib/workspace";
import { getAllAnnotationsForUser } from "@/lib/annotations";
import { getHomepageHero } from "@/lib/homepage-hero";
import { HomeHero } from "@/components/home/HomeHero";
import { LinkButton } from "@/components/ui/LinkButton";
import { objectIcons } from "@/components/ui/objectIcons";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";

interface HomeProps {
  searchParams: Promise<{ preview?: string }>;
}

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
  const hero = await getHomepageHero();

  // Same "accent/trust/insight/blue" color rhythm the app's other
  // decorative palettes use — one consistent order rather than each
  // section picking its own. Icons are the app's own
  // per-Knowledge-Object-type vocabulary (objectIcons — the same
  // stethoscope/hand/branch/checklist glyphs used in search results
  // and knowledge-object cards elsewhere), not a one-off set picked
  // just for this section. Examination, Treatment, and Rehabilitation
  // don't have their own top-level browse route (that content lives
  // inside each condition page, not as a standalone index), so those
  // three stay non-clickable — same "info card" treatment the old
  // Evidence-Based/Multi-Language claims used, rather than links to
  // pages that don't exist.
  const everythingCards: { title: string; body: string; Icon: LucideIcon; href: string | null; color: CardColor }[] = [
    {
      title: t("cardConditionsTitle"),
      body: t("cardConditionsBody"),
      Icon: objectIcons.disease,
      href: "/conditions",
      color: "accent",
    },
    {
      title: t("cardExaminationTitle"),
      body: t("cardExaminationBody"),
      Icon: objectIcons.examination_maneuver,
      href: null,
      color: "trust",
    },
    {
      title: t("cardTreatmentTitle"),
      body: t("cardTreatmentBody"),
      Icon: objectIcons.treatment_algorithm,
      href: null,
      color: "insight",
    },
    {
      title: t("cardRehabilitationTitle"),
      body: t("cardRehabilitationBody"),
      Icon: objectIcons.rehabilitation_protocol,
      href: null,
      color: "blue",
    },
    {
      title: t("cardClinicalToolsTitle"),
      body: t("cardClinicalToolsBody"),
      Icon: objectIcons.clinical_calculator,
      href: "/clinical-tools",
      color: "orange",
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

      <div className="flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
        {/* Everything you need */}
        <div className="flex flex-col gap-8">
          <h2 className="text-center font-heading text-2xl font-semibold text-primary">
            {t("everythingHeading")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {everythingCards.map(({ title, body, Icon, href, color }) => {
              const card = (
                <div className="group flex h-full flex-col items-center gap-3 rounded-2xl bg-surface-raised px-6 py-10 text-center shadow-sm transition-shadow duration-base hover:shadow-md">
                  <span
                    className={`flex size-12 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[color]}`}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-ui text-sm font-semibold text-primary">{title}</span>
                  <span className="font-ui text-sm text-secondary">{body}</span>
                  {href && (
                    <ArrowRight
                      className="mt-auto size-4 text-accent transition-transform duration-base group-hover:translate-x-0.5"
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
