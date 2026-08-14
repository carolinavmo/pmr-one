import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Sits outside the Sidebar+content row (see AppShell.tsx) rather than
// inside the content column — the sidebar is `sticky` with a
// `100vh`-derived height (SidebarFrame.tsx), so a footer nested inside
// that row would either get squeezed under the sidebar's fixed height
// or leave a sidebar-less gap once the row grows past 100vh. Spanning
// the full row instead keeps it flush under both the sidebar and the
// content column, the same way TopBar spans above them.
export async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const year = new Date().getFullYear();

  const links: { key: string; href: "/conditions" | "/clinical-tools" | "/study-planner" | "/flashcards" }[] = [
    { key: "conditions", href: "/conditions" },
    { key: "clinicalTools", href: "/clinical-tools" },
    { key: "studyPlanner", href: "/study-planner" },
    { key: "flashcards", href: "/flashcards" },
  ];

  return (
    <footer className="bg-footer-bg">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-sm flex-col gap-1.5">
            <span className="font-heading text-sm font-semibold text-footer-text">PM&R Atlas</span>
            <p className="font-ui text-sm text-footer-text-secondary">{t("tagline")}</p>
          </div>
          <nav aria-label={t("linksLabel")} className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="font-ui text-sm text-footer-text-secondary transition-colors duration-base hover:text-footer-text"
              >
                {tNav(link.key)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t border-footer-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-ui text-xs text-footer-text-secondary">{t("copyright", { year })}</p>
          <p className="font-ui text-xs text-footer-text-secondary">{t("disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
