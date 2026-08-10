import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  Users,
  FileText,
  Eye,
  StickyNote,
  Star,
  Layers,
  FolderTree,
  UserPlus,
  Activity,
  TrendingUp,
  Trophy,
  ShieldCheck,
} from "lucide-react";
import { auth } from "@/auth";
import { getPlatformAnalytics } from "@/lib/analytics";
import { AnalyticsLineChart } from "@/components/admin/AnalyticsLineChart";
import { StatTile } from "@/components/admin/StatTile";
import { SectionCard } from "@/components/admin/SectionCard";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { CARD_COLOR_CHIP, CARD_COLOR_SWATCH } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const ROLE_COLOR: Record<string, CardColor> = { admin: "rose", editor: "accent", member: "slate" };

// Gated to admin, same reasoning as /admin/topics: this surfaces
// every member's email and activity, not just editorial content —
// a stricter bar than the editor-or-admin review queue.
export default async function AdminAnalyticsPage() {
  const session = await auth();
  const locale = await getLocale();
  if (!session) {
    redirect({ href: "/login", locale });
    return;
  }
  if (session.user.role !== "admin") {
    redirect({ href: "/admin", locale });
    return;
  }

  const data = await getPlatformAnalytics();
  const viewsTotal30d = data.viewsByDay.reduce((sum, d) => sum + d.count, 0);
  const signupsTotal30d = data.signupsByDay.reduce((sum, d) => sum + d.count, 0);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
        <div>
          <h1 className="font-reading text-[28px] leading-tight text-primary">Analytics</h1>
          <p className="mt-1 font-ui text-sm text-secondary">
            Platform-wide content and member activity.
          </p>
        </div>
        <p className="font-ui text-xs text-secondary/80">
          As of {TIMESTAMP_FORMAT.format(new Date())}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Users} label="Members" value={data.users.total} color="trust" />
        <StatTile icon={UserPlus} label="New members (30d)" value={data.newUsersLast30Days} color="trust" />
        <StatTile
          icon={FileText}
          label="Conditions"
          value={data.diseases.total}
          detail={`${data.diseases.published} published · ${data.diseases.draft} draft`}
          color="accent"
        />
        <StatTile icon={Layers} label="Content blocks" value={data.blockCount} color="accent" />
        <StatTile icon={FolderTree} label="Topics" value={data.topicCount} color="blue" />
        <StatTile
          icon={Eye}
          label="Recorded views"
          value={data.totalViews}
          detail={`${data.uniqueViewers} unique viewers`}
          color="insight"
        />
        <StatTile icon={StickyNote} label="Notes" value={data.totalNotes} color="violet" />
        <StatTile icon={Star} label="Favourites" value={data.totalFavorites} color="violet" />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          icon={Activity}
          title="Reader activity"
          subtitle="Last 30 days"
          summaryValue={viewsTotal30d}
          summaryLabel="visits"
        >
          <AnalyticsLineChart data={data.viewsByDay} label="Views" />
          <p className="font-ui text-xs text-secondary">
            Each point counts distinct readers who visited a condition page that day. A returning
            reader&rsquo;s earlier visit is re-dated, not stacked, so this tracks daily reach
            rather than raw pageview volume.
          </p>
        </ChartCard>

        <ChartCard
          icon={TrendingUp}
          title="New members"
          subtitle="Last 30 days"
          summaryValue={signupsTotal30d}
          summaryLabel="joined"
        >
          <AnalyticsLineChart data={data.signupsByDay} label="Signups" />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard icon={Trophy} title="Most-viewed conditions">
          {data.topDiseases.length === 0 ? (
            <p className="font-ui text-sm text-secondary">No views recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.topDiseases.map((d, i) => {
                const maxViews = data.topDiseases[0].viewCount || 1;
                return (
                  <li key={d.slug} className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-border/40 font-ui text-[11px] font-semibold text-secondary">
                      {i + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between gap-2 font-ui text-sm">
                        <span className="flex min-w-0 items-center gap-2 truncate text-primary">
                          <span className="truncate">{d.canonicalName}</span>
                          {d.status !== "published" && <ClinicalBadge>{d.status}</ClinicalBadge>}
                        </span>
                        <span className="shrink-0 font-medium text-secondary tabular-nums">{d.viewCount}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/40">
                        <div
                          className="h-full rounded-full bg-accent transition-[width]"
                          style={{ width: `${(d.viewCount / maxViews) * 100}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard icon={ShieldCheck} title="Members by role">
          <ul className="flex flex-col gap-3">
            {(["admin", "editor", "member"] as const).map((role) => {
              const count = data.users[role];
              const max = data.users.total || 1;
              const chip = CARD_COLOR_CHIP[ROLE_COLOR[role]];
              return (
                <li key={role} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between font-ui text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${chip}`}>
                      {role}
                    </span>
                    <span className="font-medium text-secondary tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/40">
                    <div
                      className={`h-full rounded-full ${CARD_COLOR_SWATCH[ROLE_COLOR[role]]}`}
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-ui text-sm font-medium text-primary">Members</h2>
        <div className="overflow-hidden rounded-xl border border-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse font-ui text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-left text-[11px] tracking-wide text-secondary uppercase">
                  <th className="px-4 py-2.5 font-medium">Member</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5 text-right font-medium">Views</th>
                  <th className="px-4 py-2.5 text-right font-medium">Notes</th>
                  <th className="px-4 py-2.5 text-right font-medium">Favourites</th>
                  <th className="px-4 py-2.5 font-medium">Last active</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface-raised/60">
                    <td className="px-4 py-2.5 text-primary">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-ui text-[11px] font-semibold text-white">
                          {initialsFor(m.name, m.email)}
                        </span>
                        <div className="flex min-w-0 flex-col leading-tight">
                          <span className="truncate">{m.name ?? m.email ?? "—"}</span>
                          {m.name && <span className="truncate text-xs text-secondary">{m.email}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${CARD_COLOR_CHIP[ROLE_COLOR[m.role] ?? "slate"]}`}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-secondary">{DATE_FORMAT.format(new Date(m.createdAt))}</td>
                    <td className="px-4 py-2.5 text-right text-secondary tabular-nums">{m.viewCount}</td>
                    <td className="px-4 py-2.5 text-right text-secondary tabular-nums">{m.noteCount}</td>
                    <td className="px-4 py-2.5 text-right text-secondary tabular-nums">{m.favoriteCount}</td>
                    <td className="px-4 py-2.5 text-secondary">
                      {m.lastActiveAt ? DATE_FORMAT.format(new Date(m.lastActiveAt)) : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

// Same initials rule as UserMenu.tsx's own — duplicated rather than
// shared since UserMenu's version is a client-only helper local to
// that file, and this table is the only server-rendered consumer.
function initialsFor(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
    return initials.toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

function ChartCard({
  icon: Icon,
  title,
  subtitle,
  summaryValue,
  summaryLabel,
  children,
}: {
  icon: typeof Users;
  title: string;
  subtitle: string;
  summaryValue: number;
  summaryLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="flex flex-col leading-tight">
            <h2 className="font-ui text-sm font-medium text-primary">{title}</h2>
            <span className="font-ui text-xs text-secondary">{subtitle}</span>
          </div>
        </div>
        <div className="flex flex-col items-end leading-tight">
          <span className="font-reading text-xl font-semibold text-primary tabular-nums">
            {summaryValue.toLocaleString()}
          </span>
          <span className="font-ui text-[11px] text-secondary">{summaryLabel}</span>
        </div>
      </div>
      {children}
    </section>
  );
}
