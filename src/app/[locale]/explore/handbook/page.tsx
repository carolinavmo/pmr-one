import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  Check,
  Clipboard,
  FileText,
  GripVertical,
  Palette,
  PenLine,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LinkButton } from "@/components/ui/LinkButton";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";
import {
  SAMPLE_PAGE_TITLE,
  SAMPLE_PROTOCOL_TITLE,
  SAMPLE_TEMPLATE_TITLE,
} from "@/lib/atlas-sample-content";

// The "My Handbook" feature-spotlight a signed-out visitor lands on
// from the /explore card. Every string in the mockup panel below is
// real: the three section names and the "Lateral Epicondylopathy"
// sample page/protocol/template titles are exactly what
// getAtlasWorkspace seeds into a brand-new member's real My Handbook
// (src/lib/atlas-sample-content.ts) — same reasoning as the
// disease-page mockup on /explore itself, not fabricated UI. The
// panel deliberately stays a page LIST (title + section + status),
// not an open-note editor view — that's what the real feature
// actually shows once you're signed in, so a 3-item list is the
// honest state for a brand-new account rather than a padded fake one.
export default async function ExploreHandbookPage() {
  const session = await auth();
  if (session) {
    redirect({ href: "/my-atlas", locale: await getLocale() });
    return;
  }

  const t = await getTranslations("explore");
  const tMyAtlas = await getTranslations("myAtlas");
  const tHome = await getTranslations("home");
  const tNav = await getTranslations("nav");

  const whyItems = [
    t("handbookWhy1"),
    t("handbookWhy2"),
    t("handbookWhy3"),
    t("handbookWhy4"),
    t("handbookWhy5"),
  ];

  const features: { icon: LucideIcon; title: string; body: string; color: CardColor }[] = [
    { icon: PenLine, title: t("handbookFeature1Title"), body: t("handbookFeature1Body"), color: "accent" },
    { icon: Palette, title: t("handbookFeature2Title"), body: t("handbookFeature2Body"), color: "trust" },
    { icon: Clipboard, title: t("handbookFeature3Title"), body: t("handbookFeature3Body"), color: "insight" },
    { icon: GripVertical, title: t("handbookFeature4Title"), body: t("handbookFeature4Body"), color: "blue" },
    { icon: ShieldCheck, title: t("handbookFeature5Title"), body: t("handbookFeature5Body"), color: "orange" },
  ];

  const pages: { color: CardColor; sectionLabel: string; pageTitle: string }[] = [
    { color: "accent", sectionLabel: tMyAtlas("defaultSectionPages"), pageTitle: SAMPLE_PAGE_TITLE },
    { color: "trust", sectionLabel: tMyAtlas("defaultSectionProtocols"), pageTitle: SAMPLE_PROTOCOL_TITLE },
    { color: "insight", sectionLabel: tMyAtlas("defaultSectionTemplates"), pageTitle: SAMPLE_TEMPLATE_TITLE },
  ];

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12">
      <div className="flex w-full max-w-6xl flex-col gap-10">
        <Link
          href="/explore"
          className="flex items-center gap-1.5 self-start font-ui text-sm text-secondary hover:text-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("handbookBackToTour")}
        </Link>

        <div className="flex flex-col items-center gap-3 text-center">
          <Eyebrow>{t("handbookEyebrow")}</Eyebrow>
          <h1 className="font-heading text-3xl font-semibold text-primary sm:text-4xl">
            {t("handbookHeading")}
          </h1>
          <p className="max-w-2xl font-ui text-base text-secondary">{t("handbookSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {features.map(({ icon: Icon, title, body, color }) => (
            <div key={title} className="flex flex-col gap-2 rounded-xl border border-border bg-surface-raised p-4">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[color]}`}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="font-ui text-sm font-semibold text-primary">{title}</span>
              <span className="font-ui text-xs text-secondary">{body}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,280px)_1fr]">
          <div className="flex flex-col gap-4">
            <h2 className="font-heading text-xl font-semibold text-primary">
              {t("handbookWhyHeading")}
            </h2>
            <ul className="flex flex-col gap-3">
              {whyItems.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="font-ui text-sm text-secondary">{item}</span>
                </li>
              ))}
            </ul>
            <LinkButton href="/register" variant="primary" className="self-start">
              {tHome("heroCtaSecondary")}
            </LinkButton>

            <Link
              href="/register"
              className="flex items-center gap-3 rounded-xl bg-accent px-4 py-3.5 transition-colors duration-base hover:bg-accent-hover"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <span className="flex flex-col">
                <span className="font-ui text-sm font-medium text-white">{tNav("goPremium")}</span>
                <span className="font-ui text-xs text-white/80">{tNav("goPremiumSubtitle")}</span>
              </span>
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <span className="font-heading text-base font-semibold text-primary">
                {tMyAtlas("pageTitle")}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 font-ui text-xs font-medium text-white">
                <Plus className="size-3.5" aria-hidden="true" />
                {tMyAtlas("newPage")}
              </span>
            </div>

            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
                <Search className="size-3.5 shrink-0 text-secondary" aria-hidden="true" />
                <span className="truncate font-ui text-xs text-secondary">
                  {tMyAtlas("searchPlaceholder")}
                </span>
              </div>

              <div className="flex flex-col divide-y divide-border">
                {pages.map((page) => (
                  <div key={page.pageTitle} className="flex items-center gap-3 py-3">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${CARD_COLOR_CHIP[page.color]}`}>
                      <FileText className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-ui text-sm font-medium text-primary">
                      {page.pageTitle}
                    </span>
                    <span
                      className={`hidden shrink-0 rounded-full px-2 py-0.5 font-ui text-[11px] sm:inline ${CARD_COLOR_CHIP[page.color]}`}
                    >
                      {page.sectionLabel}
                    </span>
                    <span className="shrink-0 font-ui text-xs text-secondary">{tMyAtlas("saved")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
