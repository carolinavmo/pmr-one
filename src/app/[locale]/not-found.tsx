import { getTranslations } from "next-intl/server";
import { LinkButton } from "@/components/ui/LinkButton";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  const tCommon = await getTranslations("common");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="font-ui text-sm text-secondary">{t("status")}</p>
      <h1 className="font-reading text-2xl text-primary">
        {t("heading")}
      </h1>
      <p className="max-w-reading font-ui text-sm text-secondary">
        {t("body")}
      </p>
      <div className="mt-2 flex gap-3">
        <LinkButton href="/conditions" variant="primary">
          {tCommon("browseConditions")}
        </LinkButton>
        <LinkButton href="/" variant="secondary">
          {tCommon("home")}
        </LinkButton>
      </div>
    </main>
  );
}
