import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { getAtlasWorkspace } from "@/lib/atlas";
import { AtlasWorkspace } from "@/components/atlas/AtlasWorkspace";

export default async function MyAtlasPage() {
  const session = await auth();
  if (!session) {
    // Signed-out visitors get the full feature-spotlight page instead
    // of a bare login wall — mirrors /explore/handbook's own redirect
    // back here once signed in, so the two routes form a matched pair.
    redirect({ href: "/explore/handbook", locale: await getLocale() });
    return;
  }

  const t = await getTranslations("myAtlas");
  const { sections, pages } = await getAtlasWorkspace(session.user.id, [
    t("defaultSectionPages"),
    t("defaultSectionProtocols"),
    t("defaultSectionTemplates"),
  ]);

  return (
    // HANDBOOK-SPEC.md: "the rail is the handbook" — no page-level
    // title banner above the three columns (the design's own mockup
    // goes straight from the site nav into the rail/editor/context
    // frame); an sr-only h1 keeps the route accessible/labeled without
    // competing with the new dense layout. min-h-0 lets the rail and
    // editor each own their own scroll instead of the whole page
    // scrolling past a fixed-height column.
    <main className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">{t("pageTitle")}</h1>
      <AtlasWorkspace initialSections={sections} initialPages={pages} />
    </main>
  );
}
