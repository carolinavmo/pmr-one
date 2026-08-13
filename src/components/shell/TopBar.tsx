import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Bell } from "lucide-react";
import { auth } from "@/auth";
import { CommandPalette } from "./CommandPalette";
import { UserMenu } from "./UserMenu";
import { MobileIndexDrawer } from "./MobileIndexDrawer";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { GoogleTranslateWidget } from "./GoogleTranslateWidget";
import { LinkButton } from "@/components/ui/LinkButton";

// The shell's top strip — renders for every visitor now, not just
// signed-in ones (Sidebar dropped its own signed-in-only gate at the
// same time, see Sidebar.tsx). It owns the brand wordmark at every
// viewport now (AppShell.tsx puts it above Sidebar, full width) and
// carries search, plus the account cluster — "My Workspace"/"Clinical
// Tools"/"Study Planner" moved to Sidebar (SidebarFrame.tsx) instead
// of living in both places. Below `lg`, Sidebar hides itself
// entirely, so this keeps the Conditions link too, matching the old
// signed-out-only Header.tsx's mobile fallback. Notifications stays
// icon-only with no count: no notifications feature or data exists
// yet, so a badge here would be a fabricated number.
//
// At `lg`+ the search box is taken out of flow entirely
// (lg:absolute) and centered against the header's own full width via
// inset-x-0 + mx-auto — genuinely centered on the bar regardless of
// how wide the logo/account groups are. A 3-column grid (logo | search
// | account) was tried first, but equal-width grid tracks only
// guarantee equal space, not equal *content* width — with an
// asymmetric logo vs. account cluster the search box still rendered
// visibly off-center. True centering means the box's own max-width has
// to fit within the *narrower* of the two side gaps — the account
// cluster (language switcher + translate widget + sign-in) is the
// wider side, so that's what caps it, not how much empty room the
// logo side alone would allow. Below `lg` it's back in normal flex
// flow and wraps to its own line, since there's no room to overlay it
// on a narrow viewport.
export async function TopBar() {
  const session = await auth();
  const canReview = session?.user.role === "editor" || session?.user.role === "admin";
  const isAdmin = session?.user.role === "admin";
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface-raised">
      <div className="relative flex flex-wrap items-center gap-4 px-4 py-3 lg:flex-nowrap lg:justify-between lg:px-6">
        <div className="flex shrink-0 items-center gap-4">
          <MobileIndexDrawer />
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image src="/brand-logo-v2.png" alt="" width={1381} height={1139} priority className="h-11 w-auto shrink-0" />
            <span className="font-brand text-[2.75rem] leading-none tracking-wide text-primary uppercase">PM&amp;R Atlas</span>
          </Link>
        </div>

        <div className="min-w-40 flex-1 md:max-w-md lg:absolute lg:inset-x-0 lg:top-1/2 lg:mx-auto lg:w-full lg:max-w-md lg:-translate-y-1/2">
          <CommandPalette />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-4 lg:ml-0">
          <Link
            href="/conditions"
            className="inline-flex min-h-11 items-center font-ui text-sm font-medium text-primary transition-colors duration-base hover:text-accent lg:hidden"
          >
            {t("conditions")}
          </Link>
          <LanguageSwitcher />
          <GoogleTranslateWidget />
          {session ? (
            <>
              <span
                aria-label={t("notifications")}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-secondary"
              >
                <Bell className="size-5" aria-hidden="true" />
              </span>
              <UserMenu
                name={session.user.name}
                email={session.user.email}
                image={session.user.image}
                canReview={canReview}
                isAdmin={isAdmin}
              />
            </>
          ) : (
            <LinkButton href="/login" variant="secondary">
              {tCommon("signIn")}
            </LinkButton>
          )}
        </div>
      </div>
    </header>
  );
}
