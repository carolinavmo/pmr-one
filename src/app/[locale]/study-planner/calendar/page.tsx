import { getTranslations } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

// PLANNER-IMPLEMENTATION.md Pass 3 builds the real month/week/agenda
// calendar — chips, drag-to-move, the day panel. Until then this is a
// real, working (not fake) placeholder rather than a 404, so the
// rail's Calendar link and the week strip's "Open the calendar ›"
// always go somewhere honest.
export default async function StudyPlannerCalendarPage() {
  const session = await auth();
  if (!session) {
    redirect({ href: "/login", locale: await getLocale() });
    return;
  }
  const t = await getTranslations("studyPlanner");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-8 py-20 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <CalendarDays className="size-6" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-black text-primary">{t("calendarComingSoonHeading")}</h1>
        <p className="max-w-md font-ui text-sm text-secondary">{t("calendarComingSoonBody")}</p>
        <Link href="/study-planner" className="rounded-lg bg-accent px-4 py-2.5 font-ui text-sm font-bold text-white hover:bg-accent-hover">
          {t("backToToday")}
        </Link>
      </div>
    </main>
  );
}
