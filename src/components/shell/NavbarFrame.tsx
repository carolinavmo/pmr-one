"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Bell,
  BookOpen,
  Calculator,
  Calendar,
  GraduationCap,
  Layers,
  ListChecks,
  NotebookPen,
} from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import { UserMenu } from "./UserMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { GoogleTranslateWidget } from "./GoogleTranslateWidget";
import { LinkButton } from "@/components/ui/LinkButton";

// NAVBAR-SPEC.md — one solid navy block, two rows, reading as a single
// surface (no border/shadow at rest). Row 1 is the utility row (logo,
// search, language, notifications, avatar); Row 2 is the "Explore
// library" button + divider + the six tool pills, relocated here from
// the old SidebarFrame.tsx header region — same routes/behavior,
// different chrome. Founder follow-up: dropped the spec's own
// scroll-collapse-to-56px behavior — the full two-row bar now stays
// exactly as-is (still `sticky top-0`, so it still pins to the
// viewport) regardless of scroll position.
const TOOLS = [
  { key: "clinicalTools", href: "/clinical-tools", Icon: Calculator },
  { key: "studyPlanner", href: "/study-planner", Icon: Calendar },
  { key: "myAtlas", href: "/my-atlas", Icon: NotebookPen },
  { key: "flashcards", href: "/flashcards", Icon: Layers },
  { key: "questionBank", href: "/question-bank", Icon: ListChecks },
  { key: "courses", href: "/courses", Icon: GraduationCap },
] as const;

interface NavbarFrameProps {
  signedIn: boolean;
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  userImage: string | null | undefined;
  canReview: boolean;
  isAdmin: boolean;
  // MobileIndexDrawer is an async Server Component (fetches the topic
  // tree) — rendered by TopBar.tsx and handed down, since a Client
  // Component can't import/render one directly.
  mobileIndexDrawer: ReactNode;
}

export function NavbarFrame({
  signedIn,
  userName,
  userEmail,
  userImage,
  canReview,
  isAdmin,
  mobileIndexDrawer,
}: NavbarFrameProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();

  // FLASHCARDS-SPEC.md's study screen — "no navbar, no sidebar." Same
  // per-route chrome opt-out SidebarFrame.tsx already uses for My
  // Handbook, mirrored here since the study screen needs the navbar
  // gone too, not just the sidebar.
  if (pathname.startsWith("/flashcards/study")) {
    return null;
  }

  const activeTool = TOOLS.find(
    (tool) => pathname === tool.href || pathname.startsWith(`${tool.href}/`)
  );

  const avatarOrSignIn = signedIn ? (
    <>
      <span
        aria-label={t("notifications")}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#A9BBD3]"
      >
        <Bell className="size-5" aria-hidden="true" />
      </span>
      <UserMenu name={userName} email={userEmail} image={userImage} canReview={canReview} isAdmin={isAdmin} />
    </>
  ) : (
    <LinkButton
      href="/login"
      variant="secondary"
      className="!border-white/25 !bg-white/10 !text-white hover:!bg-white/20"
    >
      {tCommon("signIn")}
    </LinkButton>
  );

  return (
    <header className="sticky top-0 z-10 bg-navy">
      <nav aria-label={t("mainNav")} className="px-6 pt-4 pb-[15px]">
        {/* Row 1 — utility. Search is centered on the *whole row*
            (absolute + mx-auto), not just balanced between logo and
            utilities — those two groups stay in normal flow at their
            own ends via `justify-between`, so the centering holds
            regardless of how wide either side is. */}
        <div className="relative flex items-center justify-between gap-5">
          <div className="flex shrink-0 items-center gap-5">
            {mobileIndexDrawer}
            <Link href="/" className="flex shrink-0 items-center gap-[10px]">
              <Image src="/brand-logo-v2.png" alt="" width={1381} height={1139} priority className="h-[35px] w-auto shrink-0" />
              <span className="font-brand text-[21px] leading-none font-black text-white">
                PM&amp;R <span className="text-[#7FCBD1]">Explained</span>
              </span>
            </Link>
          </div>

          <div className="min-w-40 flex-1 min-[900px]:absolute min-[900px]:inset-x-0 min-[900px]:top-1/2 min-[900px]:mx-auto min-[900px]:w-full min-[900px]:max-w-[380px] min-[900px]:-translate-y-1/2 min-[1440px]:max-w-[520px]">
            <CommandPalette signedOut={!signedIn} />
          </div>

          <div className="flex shrink-0 items-center gap-[15px]">
            <Link
              href="/conditions"
              className="font-ui text-sm font-medium text-white hover:text-[#7FCBD1] min-[900px]:hidden"
            >
              {t("conditions")}
            </Link>
            <div className="hidden items-center gap-[15px] sm:flex">
              <LanguageSwitcher />
              <GoogleTranslateWidget />
            </div>
            {avatarOrSignIn}
          </div>
        </div>

        {/* Row 2 — library, divider, tools */}
        <div className="mt-[14px] hidden items-center gap-[5px] overflow-x-auto min-[900px]:flex">
          <Link
            href="/library"
            className="flex shrink-0 items-center gap-[10px] rounded-[20px] border-2 border-teal-on-dark bg-teal-on-dark/[0.18] px-[17px] py-[9px] font-ui text-[15px] font-black text-white transition-colors duration-base hover:bg-teal-on-dark/[0.32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FCBD1]"
          >
            <span className="flex size-[21px] shrink-0 items-center justify-center rounded-[6px] border border-white/32 bg-white/20">
              <BookOpen className="size-3" aria-hidden="true" />
            </span>
            {t("exploreLibrary")}
          </Link>
          <div className="mx-3 h-7 w-px shrink-0 bg-white/20" aria-hidden="true" />
          {TOOLS.map((tool) => {
            const isActive = tool === activeTool;
            return (
              <Link
                key={tool.key}
                href={tool.href}
                aria-current={isActive ? "page" : undefined}
                title={t(tool.key)}
                className={`flex shrink-0 items-center gap-[9px] rounded-[20px] border px-[15px] py-[9px] font-ui text-[14.5px] font-bold whitespace-nowrap transition-colors duration-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FCBD1] ${
                  isActive
                    ? "border-teal-on-dark bg-teal-on-dark text-white"
                    : "border-transparent text-[#C2D2E6] hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-[6px] border ${
                    isActive ? "border-white/45 bg-white/30" : "border-white/20 bg-white/[0.13]"
                  }`}
                >
                  <tool.Icon className="size-3" aria-hidden="true" />
                </span>
                <span className="hidden min-[1280px]:inline">{t(tool.key)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
