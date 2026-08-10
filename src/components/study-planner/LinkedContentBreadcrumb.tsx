import { Link2 } from "lucide-react";
import type { StudyTask } from "@/lib/study-planner";

// Defensive-only for now — linked_content_type/linked_content_id are
// always NULL in Phase 1 (no picker UI exists to set them yet), so
// this never actually renders. Kept so the schema's content-link
// columns have a real consumer ready the moment a future picker
// starts populating them, rather than silently doing nothing.
export function LinkedContentBreadcrumb({ task }: { task: StudyTask }) {
  if (!task.linkedContentType || !task.linkedContentId) return null;

  return (
    <span className="inline-flex items-center gap-1 font-ui text-xs text-accent">
      <Link2 className="size-3" aria-hidden="true" />
      {task.linkedContentType}: {task.linkedContentId}
    </span>
  );
}
