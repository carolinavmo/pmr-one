import { pool } from "@/lib/db";

// page_view is a per-(user, disease) "last viewed" record, not an
// append-only event log — recordPageView() does
// `ON CONFLICT (user_id, disease_id) DO UPDATE SET viewed_at = now()`.
// So count(*) here means "distinct reader×condition pairs ever
// visited," and a daily bucket means "pairs whose most recent visit
// landed on that day," not raw hit volume. Every place this data
// reaches the UI says so explicitly (see analytics/page.tsx's caption)
// rather than passing it off as a hit counter — the same "state an
// honest caveat rather than a confident wrong number" rule the seed
// scripts already follow for unverified evidence claims.

export interface DailyCount {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface TopDisease {
  slug: string;
  canonicalName: string;
  status: string;
  viewCount: number;
}

export interface MemberRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  viewCount: number;
  noteCount: number;
  favoriteCount: number;
  lastActiveAt: string | null;
}

export interface PlatformAnalytics {
  users: { total: number; member: number; editor: number; admin: number };
  newUsersLast30Days: number;
  diseases: { total: number; published: number; draft: number };
  blockCount: number;
  topicCount: number;
  totalViews: number;
  uniqueViewers: number;
  totalNotes: number;
  totalFavorites: number;
  viewsByDay: DailyCount[];
  signupsByDay: DailyCount[];
  topDiseases: TopDisease[];
  members: MemberRow[];
}

// One bucketed count for every day in [start, today], zero-filled —
// a chart built straight from a sparse GROUP BY would silently show
// gaps as "no bar" instead of an honest zero.
function fillDailyRange(
  rows: { day: string; count: number }[],
  days: number
): DailyCount[] {
  const counts = new Map(rows.map((r) => [r.day, r.count]));
  const out: DailyCount[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const [
    userRoleCounts,
    newUsers,
    diseaseCounts,
    blockCountRow,
    topicCountRow,
    viewTotals,
    noteCountRow,
    favoriteCountRow,
    viewsByDayRaw,
    signupsByDayRaw,
    topDiseasesRaw,
    membersRaw,
  ] = await Promise.all([
    pool.query<{ role: string; count: number }>(
      `SELECT role, count(*)::int AS count FROM users GROUP BY role`
    ),
    pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM users WHERE created_at >= now() - interval '30 days'`
    ),
    pool.query<{ status: string; count: number }>(
      `SELECT status, count(*)::int AS count FROM disease GROUP BY status`
    ),
    pool.query<{ count: number }>(`SELECT count(*)::int AS count FROM editorial_block`),
    pool.query<{ count: number }>(`SELECT count(*)::int AS count FROM topic WHERE kind = 'topic'`),
    pool.query<{ total: number; unique_viewers: number }>(
      `SELECT count(*)::int AS total, count(DISTINCT user_id)::int AS unique_viewers FROM page_view`
    ),
    pool.query<{ count: number }>(`SELECT count(*)::int AS count FROM note`),
    pool.query<{ count: number }>(`SELECT count(*)::int AS count FROM disease_favorite`),
    pool.query<{ day: string; count: number }>(
      `SELECT to_char(date_trunc('day', viewed_at), 'YYYY-MM-DD') AS day, count(*)::int AS count
       FROM page_view
       WHERE viewed_at >= now() - interval '30 days'
       GROUP BY 1`
    ),
    pool.query<{ day: string; count: number }>(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS count
       FROM users
       WHERE created_at >= now() - interval '30 days'
       GROUP BY 1`
    ),
    pool.query<{ slug: string; canonical_name: string; status: string; view_count: number }>(
      `SELECT d.slug, d.canonical_name, d.status, count(pv.*)::int AS view_count
       FROM disease d
       JOIN page_view pv ON pv.disease_id = d.id
       GROUP BY d.id, d.slug, d.canonical_name, d.status
       ORDER BY view_count DESC
       LIMIT 5`
    ),
    pool.query<{
      id: string;
      name: string | null;
      email: string | null;
      role: string;
      created_at: string;
      view_count: number;
      note_count: number;
      favorite_count: number;
      last_active_at: string | null;
    }>(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
              (SELECT count(*)::int FROM page_view pv WHERE pv.user_id = u.id) AS view_count,
              (SELECT count(*)::int FROM note n WHERE n.user_id = u.id) AS note_count,
              (SELECT count(*)::int FROM disease_favorite df WHERE df.user_id = u.id) AS favorite_count,
              (SELECT max(pv.viewed_at) FROM page_view pv WHERE pv.user_id = u.id) AS last_active_at
       FROM users u
       ORDER BY u.created_at DESC`
    ),
  ]);

  const roleCount = (role: string) =>
    userRoleCounts.rows.find((r) => r.role === role)?.count ?? 0;
  const statusCount = (status: string) =>
    diseaseCounts.rows.find((r) => r.status === status)?.count ?? 0;

  return {
    users: {
      total: userRoleCounts.rows.reduce((sum, r) => sum + r.count, 0),
      member: roleCount("member"),
      editor: roleCount("editor"),
      admin: roleCount("admin"),
    },
    newUsersLast30Days: newUsers.rows[0]?.count ?? 0,
    diseases: {
      total: diseaseCounts.rows.reduce((sum, r) => sum + r.count, 0),
      published: statusCount("published"),
      draft: statusCount("draft"),
    },
    blockCount: blockCountRow.rows[0]?.count ?? 0,
    topicCount: topicCountRow.rows[0]?.count ?? 0,
    totalViews: viewTotals.rows[0]?.total ?? 0,
    uniqueViewers: viewTotals.rows[0]?.unique_viewers ?? 0,
    totalNotes: noteCountRow.rows[0]?.count ?? 0,
    totalFavorites: favoriteCountRow.rows[0]?.count ?? 0,
    viewsByDay: fillDailyRange(viewsByDayRaw.rows, 30),
    signupsByDay: fillDailyRange(signupsByDayRaw.rows, 30),
    topDiseases: topDiseasesRaw.rows.map((r) => ({
      slug: r.slug,
      canonicalName: r.canonical_name,
      status: r.status,
      viewCount: r.view_count,
    })),
    members: membersRaw.rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      createdAt: r.created_at,
      viewCount: r.view_count,
      noteCount: r.note_count,
      favoriteCount: r.favorite_count,
      lastActiveAt: r.last_active_at,
    })),
  };
}
