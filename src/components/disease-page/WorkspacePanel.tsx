import { getNote, getSavedPearls, getRecentlyViewed } from "@/lib/workspace";
import { sanitizeRichText } from "@/lib/rich-text";
import { WorkspaceDrawer } from "./WorkspaceDrawer";

interface WorkspacePanelProps {
  userId: string;
  diseaseId: string;
  diseaseSlug: string;
}

// Server-side data fetch + sanitize only — the actual drawer UI
// (open/close state, slide transition) lives in WorkspaceDrawer, a
// Client Component, since that needs interactivity a Server Component
// can't hold. Pearl bodies are sanitized here (isomorphic-dompurify
// doesn't need to ship to the client bundle) and passed down as plain
// HTML strings.
export async function WorkspacePanel({ userId, diseaseId, diseaseSlug }: WorkspacePanelProps) {
  const [note, savedPearls, recentlyViewed] = await Promise.all([
    getNote(userId, diseaseId),
    getSavedPearls(userId),
    getRecentlyViewed(userId, diseaseId),
  ]);

  return (
    <WorkspaceDrawer
      diseaseId={diseaseId}
      diseaseSlug={diseaseSlug}
      note={note}
      savedPearls={savedPearls.map((pearl) => ({
        id: pearl.id,
        html: sanitizeRichText(pearl.body),
        diseaseSlug: pearl.diseaseSlug,
      }))}
      recentlyViewed={recentlyViewed}
    />
  );
}
