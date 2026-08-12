import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Bell, Calculator, Calendar, Home, PersonStanding } from "lucide-react";
import { auth } from "@/auth";
import { CommandPalette } from "./CommandPalette";
import { UserMenu } from "./UserMenu";
import { MobileIndexDrawer } from "./MobileIndexDrawer";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { GoogleTranslateWidget } from "./GoogleTranslateWidget";
import { LinkButton } from "@/components/ui/LinkButton";

// The shell's top strip — renders for every visitor now, not just
// signed-in ones (Sidebar dropped its own signed-in-only gate at the
// same time, see Sidebar.tsx). At `lg`+, Sidebar already owns the logo
// and Explore tree (now the sidebar's only content — SidebarNav's old
// Dashboard/Conditions/Soon-stub/quick-link rows were removed
// entirely), so this carries search, the "My Workspace" home link
// (the former sidebar Dashboard link's new home), and the account
// cluster. Below `lg`, Sidebar hides itself entirely, so this falls
// back to carrying the logo + Conditions link too — same markup the
// old signed-out-only Header.tsx used — so a mobile visitor never
// loses either regardless of session state. Notifications stays
// icon-only with no count: no notifications feature or data exists
// yet, so a badge here would be a fabricated number.
export async function TopBar() {
  const session = await auth();
  const canReview = session?.user.role === "editor" || session?.user.role === "admin";
  const isAdmin = session?.user.role === "admin";
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  return (
    <header className="sticky top-0 z-10 bg-surface">
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 lg:px-6">
        <MobileIndexDrawer />
        <Link href="/" className="flex shrink-0 items-center gap-2.5 lg:hidden">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-white">
            <PersonStanding className="size-5" aria-hidden="true" />
          </span>
          <span className="font-heading text-lg font-semibold text-primary">PM&amp;R Atlas</span>
        </Link>

        <div className="min-w-40 flex-1 md:max-w-md">
          <CommandPalette />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 font-ui text-sm font-medium text-primary transition-colors duration-base hover:text-accent"
          >
            <Home className="size-4" aria-hidden="true" />
            {t("myWorkspace")}
          </Link>
          <Link
            href="/clinical-tools"
            className="inline-flex min-h-11 items-center gap-1.5 font-ui text-sm font-medium text-primary transition-colors duration-base hover:text-accent"
          >
            <Calculator className="size-4" aria-hidden="true" />
            {t("clinicalTools")}
          </Link>
          <Link
            href="/study-planner"
            className="inline-flex min-h-11 items-center gap-1.5 font-ui text-sm font-medium text-primary transition-colors duration-base hover:text-accent"
          >
            <Calendar className="size-4" aria-hidden="true" />
            {t("studyPlanner")}
          </Link>
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
