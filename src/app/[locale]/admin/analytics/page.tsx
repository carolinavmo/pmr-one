import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Users, FileText, Eye, StickyNote, Star, Layers, FolderTree, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { getPlatformAnalytics } from "@/lib/analytics";
import { AnalyticsLineChart } from "@/components/admin/AnalyticsLineChart";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

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

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="font-reading text-2xl text-primary">Analytics</h1>
        <p className="mt-1 font-ui text-sm text-secondary">
          Platform-wide content and member activity.
        </p>
      </div>

      <section className="flex flex-wrap gap-3">
        <StatTile icon={Users} label="Members" value={data.users.total} />
        <StatTile
          icon={UserPlus}
          label="New members (30d)"
          value={data.newUsersLast30Days}
        />
        <StatTile
          icon={FileText}
          label="Conditions"
          value={data.diseases.total}
          detail={`${data.diseases.published} published · ${data.diseases.draft} draft`}
        />
        <StatTile icon={Layers} label="Content blocks" value={data.blockCount} />
        <StatTile icon={FolderTree} label="Topics" value={data.topicCount} />
        <StatTile icon={Eye} label="Recorded views" value={data.totalViews} detail={`${data.uniqueViewers} unique viewers`} />
        <StatTile icon={StickyNote} label="Notes" value={data.totalNotes} />
        <StatTile icon={Star} label="Favourites" value={data.totalFavorites} />
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-ui text-sm font-medium text-primary">Reader activity, last 30 days</h2>
        <AnalyticsLineChart data={data.viewsByDay} label="Views" />
        <p className="font-ui text-xs text-secondary">
          Each point counts distinct readers who visited a condition page that day. A returning
          reader&rsquo;s earlier visit is re-dated, not stacked, so this tracks daily reach rather
          than raw pageview volume.
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-ui text-sm font-medium text-primary">New members, last 30 days</h2>
        <AnalyticsLineChart data={data.signupsByDay} label="Signups" />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-ui text-sm font-medium text-primary">Most-viewed conditions</h2>
          {data.topDiseases.length === 0 ? (
            <p className="font-ui text-sm text-secondary">No views recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.topDiseases.map((d) => {
                const maxViews = data.topDiseases[0].viewCount || 1;
                return (
                  <li key={d.slug} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 font-ui text-sm">
                      <span className="flex items-center gap-2 text-primary">
                        {d.canonicalName}
                        {d.status !== "published" && <ClinicalBadge>{d.status}</ClinicalBadge>}
                      </span>
                      <span className="shrink-0 text-secondary">{d.viewCount}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/40">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${(d.viewCount / maxViews) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-ui text-sm font-medium text-primary">Members by role</h2>
          <ul className="flex flex-col gap-2">
            {(["admin", "editor", "member"] as const).map((role) => {
              const count = data.users[role];
              const max = data.users.total || 1;
              return (
                <li key={role} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between font-ui text-sm">
                    <span className="capitalize text-primary">{role}</span>
                    <span className="text-secondary">{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/40">
                    <div className="h-full rounded-full bg-trust" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-ui text-sm font-medium text-primary">Members</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] border-collapse font-ui text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised text-left text-xs text-secondary">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2 font-medium">Views</th>
                <th className="px-4 py-2 font-medium">Notes</th>
                <th className="px-4 py-2 font-medium">Favourites</th>
                <th className="px-4 py-2 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-primary">
                    <div className="flex flex-col">
                      <span>{m.name ?? "—"}</span>
                      <span className="text-xs text-secondary">{m.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-secondary capitalize">{m.role}</td>
                  <td className="px-4 py-2 text-secondary">{DATE_FORMAT.format(new Date(m.createdAt))}</td>
                  <td className="px-4 py-2 text-secondary">{m.viewCount}</td>
                  <td className="px-4 py-2 text-secondary">{m.noteCount}</td>
                  <td className="px-4 py-2 text-secondary">{m.favoriteCount}</td>
                  <td className="px-4 py-2 text-secondary">
                    {m.lastActiveAt ? DATE_FORMAT.format(new Date(m.lastActiveAt)) : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-reading text-lg text-primary">{value.toLocaleString()}</span>
        <span className="font-ui text-xs whitespace-nowrap text-secondary">{label}</span>
        {detail && <span className="font-ui text-[11px] whitespace-nowrap text-secondary/80">{detail}</span>}
      </span>
    </div>
  );
}
