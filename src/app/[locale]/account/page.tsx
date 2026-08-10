import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/Button";
import { changePasswordAction } from "./actions";

interface AccountPageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const session = await auth();
  if (!session) {
    // The extra `return` (redirect() itself never returns) works
    // around a real TS narrowing gap: control-flow analysis fails to
    // treat a destructured `never`-returning function (next-intl's
    // redirect, pulled off createNavigation()'s return value) as
    // narrowing `session` below, even though its type is provably
    // `never` — confirmed via isolated repro. A local function
    // declaration doesn't hit this; only this destructured-from-a-
    // call-expression shape does.
    redirect({ href: "/login", locale: await getLocale() });
    return;
  }

  const { error, success } = await searchParams;
  const t = await getTranslations("account");

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div>
          <h1 className="font-reading text-2xl text-primary">{t("heading")}</h1>
          <p className="mt-1 font-ui text-sm text-secondary">
            {session.user.email} · {session.user.role}
          </p>
        </div>

        <form action={changePasswordAction} className="flex flex-col gap-4">
          <h2 className="font-ui text-sm font-medium text-primary">{t("changePassword")}</h2>

          {error && (
            <p className="font-ui text-sm text-warning">
              {t("currentPasswordIncorrect")}
            </p>
          )}
          {success && (
            <p className="font-ui text-sm text-trust">{t("passwordUpdated")}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="currentPassword" className="font-ui text-sm text-secondary">
              {t("currentPassword")}
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              className="rounded-lg border border-border bg-surface-raised px-4 py-2 font-ui text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="newPassword" className="font-ui text-sm text-secondary">
              {t("newPassword")}
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              className="rounded-lg border border-border bg-surface-raised px-4 py-2 font-ui text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button type="submit" variant="primary" className="mt-2">
            {t("updatePassword")}
          </Button>
        </form>
      </div>
    </main>
  );
}
