import { NextResponse } from "next/server";
import { createWriteStream } from "fs";
import { mkdir, unlink } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireEditor } from "@/lib/actions/authoring";
import { pool } from "@/lib/db";
import { revalidateCourseSurfaces } from "@/lib/revalidation";

// Lesson videos are far larger than the 8MB images
// saveUploadedIllustration handles, so this deliberately isn't a
// Server Action: a Server Action's FormData carries its own body-size
// ceiling and (like saveUploadedIllustration) tends to buffer the
// whole file into memory before writing it, which risks the
// container's memory on a multi-hundred-MB lecture recording. This
// route instead takes the raw video bytes as the request body (the
// client does `fetch(url, { method: "POST", body: file, headers:
// {"Content-Type": file.type} })` — a browser File is a valid fetch
// body on its own, no FormData needed) and streams it straight to
// disk via pipeline(), so memory use stays flat regardless of file
// size.
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

const EXT_BY_MIME: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export async function POST(request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  await requireEditor();
  const { lessonId } = await params;

  const { rows } = await pool.query(`SELECT id FROM course_lesson WHERE id = $1`, [lessonId]);
  if (!rows[0]) {
    return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("video/")) {
    return NextResponse.json({ error: "Only video files can be uploaded." }, { status: 400 });
  }
  const ext = EXT_BY_MIME[contentType];
  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported video format — use MP4, WebM, or MOV." },
      { status: 400 }
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Video is too large (2GB max)." }, { status: 413 });
  }
  if (!request.body) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "lesson-videos");
  const filePath = path.join(dir, filename);

  let bytesWritten = 0;
  try {
    await mkdir(dir, { recursive: true });
    const source = Readable.fromWeb(request.body as import("stream/web").ReadableStream);
    source.on("data", (chunk: Buffer) => {
      bytesWritten += chunk.length;
      if (bytesWritten > MAX_UPLOAD_BYTES) {
        source.destroy(new Error("Video is too large (2GB max)."));
      }
    });
    await pipeline(source, createWriteStream(filePath));
  } catch (err) {
    await unlink(filePath).catch(() => {});
    console.error(`lesson video upload: failed writing to ${filePath}`, err);
    const message = err instanceof Error ? err.message : "Could not save the uploaded video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const videoUrl = `/api/uploads/lesson-videos/${filename}`;
  await pool.query(`UPDATE course_lesson SET video_url = $1 WHERE id = $2`, [videoUrl, lessonId]);
  revalidateCourseSurfaces();

  return NextResponse.json({ videoUrl });
}
