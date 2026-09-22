import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { PageTypeManager } from "@/components/admin/PageTypeManager";
import type { DiseasePageType } from "@/lib/disease-page-type";

interface PageTypeRow {
  id: string;
  canonical_name: string;
  slug: string;
  status: string;
  type: DiseasePageType | null;
}

// Editor-or-admin, matching updateDiseasePageTypeAction's own gate —
// this is content metadata (like publish status), not the site-wide
// taxonomy /admin/topics manages, so it doesn't need the stricter
// admin-only check that page uses.
export default async function AdminPageTypesPage() {
  const session = await auth();
  const locale = await getLocale();
  if (!session) {
    redirect({ href: "/login", locale });
    return;
  }
  if (session.user.role !== "editor" && session.user.role !== "admin") {
    redirect({ href: "/login", locale });
    return;
  }

  const { rows } = await pool.query<PageTypeRow>(
    `SELECT id, canonical_name, slug, status, type FROM disease ORDER BY canonical_name, slug`
  );

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-reading text-2xl text-primary">Page types</h1>
        <p className="mt-1 font-ui text-sm text-secondary">
          Every page&rsquo;s type for the library home&rsquo;s Browse by area — anatomy,
          biomechanics, examination, condition, rehabilitation, or procedure. Unset pages show no
          type tag and don&rsquo;t count toward any type&rsquo;s total until set here.
        </p>
      </div>

      <PageTypeManager
        pages={rows.map((row) => ({
          id: row.id,
          canonicalName: row.canonical_name,
          slug: row.slug,
          status: row.status,
          type: row.type,
        }))}
      />
    </main>
  );
}
