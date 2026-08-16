import { getLocale, getTranslations } from "next-intl/server";
import { NotebookPen } from "lucide-react";
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
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <NotebookPen className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h1 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">{t("pageTitle")}</h1>
            <p className="font-ui text-sm text-secondary">{t("pageSubtitle")}</p>
          </div>
        </div>

        <AtlasWorkspace initialSections={sections} initialPages={pages} />
      </div>
    </main>
  );
}
