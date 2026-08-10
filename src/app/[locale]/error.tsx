"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";

// Next.js requires error.tsx to be a Client Component. Deliberately
// generic copy — no raw error/stack text — and never phrased anything
// like a clinical finding (Tier 3: "an error state must never be
// visually or linguistically confusable with a clinical gap").
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error");
  const tCommon = useTranslations("common");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="font-ui text-sm text-warning">{t("status")}</p>
      <h1 className="font-reading text-2xl text-primary">
        {t("heading")}
      </h1>
      <p className="max-w-reading font-ui text-sm text-secondary">
        {t("body")}
      </p>
      <div className="mt-2 flex gap-3">
        <Button type="button" variant="primary" onClick={() => reset()}>
          {t("tryAgain")}
        </Button>
        <LinkButton href="/" variant="secondary">
          {tCommon("home")}
        </LinkButton>
      </div>
    </main>
  );
}
