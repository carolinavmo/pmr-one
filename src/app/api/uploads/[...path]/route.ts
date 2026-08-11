import { stat, readFile } from "fs/promises";
import path from "path";

// Every runtime image upload (illustrations, hero backgrounds,
// avatars — see authoring.ts/dashboard-hero.ts/account/actions.ts)
// writes straight to public/uploads/ on the volume-backed disk, the
// same directory Next.js's own static file server is supposed to
// cover. In production that static path only serves files that
// existed in public/ when the server process last started — a file
// written by a live upload request mid-lifetime is invisible to it
// until the next deploy restarts the process and it re-scans public/
// (confirmed directly against Railway: a freshly uploaded file 404'd
// on request while verifiably sitting on disk via SSH, and an older
// file uploaded before the current deploy served fine). This route
// sidesteps that entirely by reading straight from disk on every
// request, so a file is servable the instant it's written — no
// restart required. New uploads are pointed here (see the three
// saveUploaded* helpers); already-existing /uploads/... rows are
// untouched and keep working through the static path exactly as
// before, since by the time of any future deploy those files are
// already sitting in the persisted volume and get picked up like any
// other build-time public asset.
const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const resolved = path.resolve(UPLOADS_ROOT, ...segments);

  // Reject anything that escapes the uploads directory (e.g. a "../"
  // segment) — the only thing this route is allowed to read.
  if (resolved !== UPLOADS_ROOT && !resolved.startsWith(UPLOADS_ROOT + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const info = await stat(resolved);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    const data = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream",
        // Filenames are random UUIDs, never reused for different
        // content — safe to cache forever once served.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
