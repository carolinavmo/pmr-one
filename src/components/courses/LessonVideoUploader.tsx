"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";

// Plain fetch() doesn't expose upload progress (only download/response
// progress), so this uses XMLHttpRequest directly — the one place in
// this codebase that needs to, since every other upload (images) is
// small enough not to need a progress bar at all. Posts the raw file
// as the request body (not FormData) to match the streaming route's
// expectation (src/app/api/courses/lessons/[lessonId]/video/route.ts).
export function LessonVideoUploader({
  lessonId,
  currentVideoUrl,
  onUploaded,
}: {
  lessonId: string;
  currentVideoUrl: string | null;
  onUploaded: (videoUrl: string) => void;
}) {
  const t = useTranslations("courses");
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/courses/lessons/${lessonId}/video`);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        const body = JSON.parse(xhr.responseText) as { videoUrl: string };
        onUploaded(body.videoUrl);
      } else {
        try {
          const body = JSON.parse(xhr.responseText) as { error?: string };
          setError(body.error ?? t("uploadFailed"));
        } catch {
          setError(t("uploadFailed"));
        }
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setError(t("uploadFailed"));
    };
    xhr.send(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null}
        className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 font-ui text-sm text-secondary hover:border-accent/40 hover:text-accent disabled:opacity-60"
      >
        <Upload className="size-4" aria-hidden="true" />
        {progress !== null ? t("uploading", { percent: progress }) : currentVideoUrl ? t("replaceVideo") : t("uploadVideo")}
      </button>
      {progress !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/50">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="font-ui text-xs text-card-red">{error}</p>}
    </div>
  );
}
