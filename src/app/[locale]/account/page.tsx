import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { FileText, Star, Eye, StickyNote } from "lucide-react";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { getAllNotes, getSavedPearls, getFavoriteDiseases, getPageViewCount } from "@/lib/workspace";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/ui/StatTile";
import { AvatarUploader } from "@/components/account/AvatarUploader";
import { ThemeToggle } from "@/components/account/ThemeToggle";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { changePasswordAction, updateNameAction } from "./actions";

interface AccountPageProps {
  searchParams: Promise<{ error?: string; success?: string; nameError?: string; nameSuccess?: string }>;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

function initialsFor(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
    return initials.toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const session = await auth();
  if (!session) {
    // See the matching comment in account/page.tsx — the extra
    // `return` works around a TS narrowing gap with destructured
    // `never`-returning functions.
    redirect({ href: "/login", locale: await getLocale() });
    return;
  }

  const { error, success, nameError, nameSuccess } = await searchParams;
  const t = await getTranslations("account");

  const [{ rows: userRows }, notes, savedPearls, favorites, viewCount] = await Promise.all([
    pool.query<{ created_at: string }>(`SELECT created_at FROM users WHERE id = $1`, [session.user.id]),
    getAllNotes(session.user.id),
    getSavedPearls(session.user.id),
    getFavoriteDiseases(session.user.id),
    getPageViewCount(session.user.id),
  ]);
  const memberSince = userRows[0]?.created_at ? new Date(userRows[0].created_at) : null;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col gap-10">
        <div className="flex items-center gap-5">
          <AvatarUploader
            initialImageUrl={session.user.image ?? null}
            initials={initialsFor(session.user.name, session.user.email)}
            changeLabel={t("changePhoto")}
            removeLabel={t("removePhoto")}
          />
          <div className="flex flex-col gap-1">
            <h1 className="font-reading text-2xl text-primary">{session.user.name ?? t("heading")}</h1>
            <p className="font-ui text-sm text-secondary">{session.user.email}</p>
            <div className="flex items-center gap-2">
              <ClinicalBadge>{session.user.role}</ClinicalBadge>
              {memberSince && (
                <span className="font-ui text-xs text-secondary">
                  {t("memberSince", { date: DATE_FORMAT.format(memberSince) })}
                </span>
              )}
            </div>
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-ui text-sm font-medium text-primary">{t("activityHeading")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon={StickyNote} label={t("notesLabel")} value={notes.length} color="violet" />
            <StatTile icon={Star} label={t("savedPearlsLabel")} value={savedPearls.length} color="insight" />
            <StatTile icon={FileText} label={t("favouritesLabel")} value={favorites.length} color="accent" />
            <StatTile icon={Eye} label={t("viewedLabel")} value={viewCount} color="trust" />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-ui text-sm font-medium text-primary">{t("appearanceHeading")}</h2>
          <ThemeToggle
            groupLabel={t("appearanceHeading")}
            optionLabels={{
              light: t("themeLight"),
              dark: t("themeDark"),
              system: t("themeSystem"),
            }}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-ui text-sm font-medium text-primary">{t("profileSection")}</h2>
          <form action={updateNameAction} className="flex flex-col gap-1.5">
            {nameError && <p className="font-ui text-sm text-warning">{t("nameRequired")}</p>}
            {nameSuccess && <p className="font-ui text-sm text-trust">{t("nameUpdated")}</p>}
            <label htmlFor="name" className="font-ui text-sm text-secondary">
              {t("displayName")}
            </label>
            <div className="flex gap-2">
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={session.user.name ?? ""}
                className="flex-1 rounded-lg border border-border bg-surface-raised px-4 py-2 font-ui text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <Button type="submit" variant="secondary">
                {t("saveName")}
              </Button>
            </div>
          </form>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-ui text-sm font-medium text-primary">{t("securityHeading")}</h2>
          <form action={changePasswordAction} className="flex flex-col gap-4">
            <h3 className="font-ui text-sm text-secondary">{t("changePassword")}</h3>

            {error && <p className="font-ui text-sm text-warning">{t("currentPasswordIncorrect")}</p>}
            {success && <p className="font-ui text-sm text-trust">{t("passwordUpdated")}</p>}

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
            <Button type="submit" variant="primary" className="mt-2 self-start">
              {t("updatePassword")}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
