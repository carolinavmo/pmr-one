import { NextResponse } from "next/server";
import { readdir, stat, statfs } from "fs/promises";
import path from "path";

// TEMPORARY diagnostic — production's image uploads started failing
// with ENOSPC (see debug-capture route). This reports how full the
// volume actually is and what's using the space, so we know whether
// the fix is "grow the volume" or "clean up accumulated files."
// Remove once the upload bug is fully resolved.

export async function GET() {
  const dir = path.join(process.cwd(), "public", "uploads", "illustrations");
  try {
    const fsStats = await statfs(dir);
    const blockSize = fsStats.bsize;
    const totalBytes = fsStats.blocks * blockSize;
    const freeBytes = fsStats.bfree * blockSize;
    const availBytes = fsStats.bavail * blockSize;

    const files = await readdir(dir);
    let totalFileBytes = 0;
    const sample = [];
    for (const f of files) {
      const s = await stat(path.join(dir, f));
      totalFileBytes += s.size;
      sample.push({ name: f, bytes: s.size, mtime: s.mtime });
    }
    sample.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return NextResponse.json({
      ok: true,
      volume: {
        totalMB: (totalBytes / 1024 / 1024).toFixed(1),
        freeMB: (freeBytes / 1024 / 1024).toFixed(1),
        availMB: (availBytes / 1024 / 1024).toFixed(1),
      },
      illustrationsDir: {
        fileCount: files.length,
        totalMB: (totalFileBytes / 1024 / 1024).toFixed(1),
      },
      newest10: sample.slice(0, 10).map((s) => ({
        name: s.name,
        kb: (s.bytes / 1024).toFixed(1),
        mtime: s.mtime,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
