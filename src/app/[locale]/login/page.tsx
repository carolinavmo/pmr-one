import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { loginAction } from "./actions";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const t = await getTranslations("auth");
  const tCommon = await getTranslations("common");

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="font-reading text-2xl text-primary">{t("signInHeading")}</h1>

        {error && (
          <p className="font-ui text-sm text-warning">
            {t("invalidCredentials")}
          </p>
        )}

        <form action={loginAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-ui text-sm text-secondary">
              {t("email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-lg border border-border bg-surface-raised px-4 py-2 font-ui text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="font-ui text-sm text-secondary">
              {t("password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="rounded-lg border border-border bg-surface-raised px-4 py-2 font-ui text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button type="submit" variant="primary" className="mt-2">
            {tCommon("signIn")}
          </Button>
        </form>

        <p className="font-ui text-sm text-secondary">
          {t("newHere")}{" "}
          <Link href="/register" className="text-accent hover:underline">
            {t("createAccountLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
