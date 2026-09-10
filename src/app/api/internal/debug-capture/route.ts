import { NextResponse } from "next/server";

// TEMPORARY diagnostic — captures console.error output into an
// in-memory ring buffer so the real (non-minified) server-side error
// behind production's React #441 image-upload crash can be read back
// over HTTP, since the Railway CLI isn't available in this environment.
// Remove this route once the upload bug is diagnosed.

declare global {
  // eslint-disable-next-line no-var
  var __debugLogBuffer: string[] | undefined;
  // eslint-disable-next-line no-var
  var __debugLogPatched: boolean | undefined;
}

if (!globalThis.__debugLogPatched) {
  globalThis.__debugLogBuffer = [];
  const buf = globalThis.__debugLogBuffer;
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      const formatted = args
        .map((a) => {
          if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack}`;
          if (typeof a === "object") {
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          }
          return String(a);
        })
        .join(" ");
      buf.push(`[${new Date().toISOString()}] ${formatted}`);
      if (buf.length > 300) buf.shift();
    } catch {}
    origError(...args);
  };
  globalThis.__debugLogPatched = true;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    patched: globalThis.__debugLogPatched ?? false,
    count: globalThis.__debugLogBuffer?.length ?? 0,
    logs: globalThis.__debugLogBuffer ?? [],
  });
}

export async function DELETE() {
  globalThis.__debugLogBuffer = [];
  return NextResponse.json({ ok: true, cleared: true });
}
