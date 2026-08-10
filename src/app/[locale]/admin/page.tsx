import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import {
  FileText,
  CheckCircle2,
  Clock,
  Users,
  BarChart3,
  FolderTree,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { DeleteDiseaseButton } from "@/components/admin/DeleteDiseaseButton";
import { StatTile } from "@/components/ui/StatTile";
import { publishDisease, unpublishDisease } from "./actions";

interface DiseaseRow {
  id: string;
  canonical_name: string;
  slug: string;
  status: string;
  published_at: string | null;
  reviewed_at: string | null;
  reviewed_by_email: string | null;
  block_count: number;
}

const TIMESTAMP_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function AdminPage() {
  const session = await auth();
  const locale = await getLocale();
  if (!session) {
    // See the matching comment in account/page.tsx — the extra
    // `return` works around a TS narrowing gap with destructured
    // `never`-returning functions.
    redirect({ href: "/login", locale });
    return;
  }
  if (session.user.role !== "editor" && session.user.role !== "admin") {
    redirect({ href: "/login", locale });
    return;
  }
  const isAdmin = session.user.role === "admin";

  const [{ rows: diseases }, memberCountRow] = await Promise.all([
    pool.query<DiseaseRow>(
      `SELECT d.id, d.canonical_name, d.slug, d.status, d.published_at, d.reviewed_at,
              u.email AS reviewed_by_email,
              (SELECT count(*)::int FROM editorial_block b WHERE b.disease_id = d.id) AS block_count
       FROM disease d
       LEFT JOIN users u ON u.id = d.reviewed_by
       -- slug as a tiebreaker: two diseases can share a canonical_name
       -- (e.g. "plantar-fasciopathy" / "-v2"), and without one Postgres
       -- doesn't guarantee stable order between them across requests —
       -- a real cause of a past misclick between two identically-labeled
       -- Publish/Unpublish buttons whose rows silently swapped position.
       ORDER BY d.canonical_name, d.slug`
    ),
    // Only admins see the tile that uses this — skip the query
    // entirely for an editor rather than run it and throw the result
    // away.
    isAdmin ? pool.query<{ count: number }>(`SELECT count(*)::int AS count FROM users`) : null,
  ]);

  const publishedCount = diseases.filter((d) => d.status === "published").length;
  const draftCount = diseases.length - publishedCount;
  const blockTotal = diseases.reduce((sum, d) => sum + d.block_count, 0);
  const memberCount = memberCountRow?.rows[0]?.count ?? 0;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
        <div>
          <h1 className="font-reading text-[28px] leading-tight text-primary">Dashboard</h1>
          <p className="mt-1 font-ui text-sm text-secondary">
            {isAdmin ? "Platform overview and content review." : "Review and publish content."}
          </p>
        </div>
        <p className="font-ui text-xs text-secondary/80">As of {TIMESTAMP_FORMAT.format(new Date())}</p>
      </div>

      <section className={`grid grid-cols-2 gap-3 ${isAdmin ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        <StatTile icon={FileText} label="Conditions" value={diseases.length} color="accent" />
        <StatTile icon={CheckCircle2} label="Published" value={publishedCount} color="trust" />
        <StatTile icon={Clock} label="Awaiting review" value={draftCount} color="insight" />
        {isAdmin ? (
          <StatTile icon={Users} label="Members" value={memberCount} color="violet" />
        ) : (
          <StatTile icon={ClipboardList} label="Content blocks" value={blockTotal} color="violet" />
        )}
      </section>

      {isAdmin && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <QuickLinkCard
            href="/admin/analytics"
            icon={BarChart3}
            title="Analytics"
            description="Reader activity, member growth, and engagement across the platform."
          />
          <QuickLinkCard
            href="/admin/topics"
            icon={FolderTree}
            title="Manage Topics"
            description="Rename, reorder, recolor, or add branches of the Explore sidebar."
          />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-ui text-sm font-medium text-primary">Review queue</h2>
          <p className="font-ui text-xs text-secondary">
            Publish or unpublish a condition to control what visitors can see.
          </p>
        </div>

        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border shadow-sm">
          {diseases.map((disease) => (
            <div
              key={disease.id}
              className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 hover:bg-surface-raised/60"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-ui text-sm font-medium text-primary">
                    {disease.canonical_name}
                  </span>
                  <ClinicalBadge>{disease.status}</ClinicalBadge>
                </div>
                <p className="font-ui text-xs text-secondary">
                  /conditions/{disease.slug} · {disease.block_count} block
                  {disease.block_count === 1 ? "" : "s"}
                  {disease.reviewed_at &&
                    ` · last reviewed ${new Date(disease.reviewed_at).toLocaleDateString()}${
                      disease.reviewed_by_email ? ` by ${disease.reviewed_by_email}` : ""
                    }`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {disease.status === "published" ? (
                  <form action={unpublishDisease}>
                    <input type="hidden" name="diseaseId" value={disease.id} />
                    <Button type="submit" variant="secondary">
                      Unpublish
                    </Button>
                  </form>
                ) : (
                  <form action={publishDisease}>
                    <input type="hidden" name="diseaseId" value={disease.id} />
                    <Button type="submit" variant="primary">
                      Publish
                    </Button>
                  </form>
                )}
                {isAdmin && (
                  <DeleteDiseaseButton
                    diseaseId={disease.id}
                    canonicalName={disease.canonical_name}
                    slug={disease.slug}
                    status={disease.status}
                    blockCount={disease.block_count}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function QuickLinkCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof BarChart3;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-accent/40 hover:bg-accent/5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-ui text-sm font-medium text-primary">{title}</span>
        <span className="font-ui text-xs text-secondary">{description}</span>
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
        aria-hidden="true"
      />
    </Link>
  );
}
