import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { DeleteDiseaseButton } from "@/components/admin/DeleteDiseaseButton";
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

  const { rows: diseases } = await pool.query<DiseaseRow>(
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
  );

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="font-reading text-2xl text-primary">Review queue</h1>
        <p className="mt-1 font-ui text-sm text-secondary">
          Publish or unpublish a condition to control what visitors can see.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {diseases.map((disease) => (
          <div
            key={disease.id}
            className="flex flex-wrap items-center justify-between gap-4 p-4"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-ui text-sm font-medium text-primary">
                  {disease.canonical_name}
                </span>
                <ClinicalBadge>{disease.status}</ClinicalBadge>
              </div>
              <p className="font-ui text-xs text-secondary">
                /conditions/{disease.slug}
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
              {session.user.role === "admin" && (
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
    </main>
  );
}
