import { NextResponse } from "next/server";
import { mkdir, writeFile, readFile, unlink, stat } from "fs/promises";
import path from "path";

// Temporary diagnostic: a founder reported every image upload failing
// ("Upload failed. Try again.") for a normal JPG/PNG under 8MB — that
// generic client-side message swallows the real server error (see
// ImageRowBlock.tsx's handleFile), so this reproduces exactly what
// saveUploadedIllustration (authoring.ts) does — mkdir + writeFile
// into the Railway volume-backed public/uploads/ directory — outside
// a Server Action, to see the real error without needing the founder
// to retry through the UI.
export async function GET() {
  const dir = path.join(process.cwd(), "public", "uploads", "illustrations");
  const testFile = path.join(dir, `__diskcheck_${Date.now()}.txt`);
  const result: Record<string, unknown> = { cwd: process.cwd(), dir };

  try {
    const dirStat = await stat(dir).catch((e) => ({ error: String(e) }));
    result.dirStatBefore = dirStat;
  } catch (err) {
    result.dirStatBeforeError = String(err);
  }

  try {
    await mkdir(dir, { recursive: true });
    result.mkdir = "ok";
  } catch (err) {
    result.mkdirError = err instanceof Error ? { message: err.message, code: (err as NodeJS.ErrnoException).code } : String(err);
    return NextResponse.json({ ok: false, result }, { status: 500 });
  }

  try {
    await writeFile(testFile, "disk check " + new Date().toISOString());
    result.write = "ok";
  } catch (err) {
    result.writeError = err instanceof Error ? { message: err.message, code: (err as NodeJS.ErrnoException).code } : String(err);
    return NextResponse.json({ ok: false, result }, { status: 500 });
  }

  try {
    const content = await readFile(testFile, "utf-8");
    result.readBack = content;
  } catch (err) {
    result.readError = err instanceof Error ? err.message : String(err);
  }

  try {
    await unlink(testFile);
    result.cleanup = "ok";
  } catch (err) {
    result.cleanupError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({ ok: true, result });
}
