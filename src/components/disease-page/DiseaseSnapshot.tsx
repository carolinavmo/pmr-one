import type {
  EditorialBlock,
  ParagraphBlock,
  MedicalIllustrationBlock,
} from "@/lib/editorial-blocks";
import { categoryForRegions } from "@/lib/disease-icons";
import { MedicalIllustrationBlockView } from "@/components/blocks/MedicalIllustrationBlock";
import { DiseaseHeader } from "@/components/disease-page/DiseaseHeader";

interface SnapshotBlocks {
  overview: ParagraphBlock;
  illustration: MedicalIllustrationBlock;
  rest: EditorialBlock[];
}

// VISUAL_IDENTITY.md §3 — the Clinical Snapshot only activates when a
// disease's blocks start with the exact arrival shape (an intro
// paragraph immediately followed by its anatomy illustration, no
// heading between them). Every other disease falls through to null
// and renders exactly as it does today — this is additive, not a
// rewrite of the block-rendering model.
export function extractSnapshot(blocks: EditorialBlock[]): SnapshotBlocks | null {
  const [heading, overview, illustration, ...rest] = blocks;
  if (
    heading?.type === "section_heading" &&
    heading.text === "Overview" &&
    overview?.type === "paragraph" &&
    illustration?.type === "medical_illustration"
  ) {
    return { overview, illustration, rest };
  }
  return null;
}

interface DiseaseSnapshotProps {
  diseaseId: string;
  diseaseSlug: string;
  diseaseName: string;
  status: string;
  regions: (string | null)[];
  evidenceBased: boolean;
  boardRelevance: number | null;
  updatedAt: string;
  readingMinutes: number;
  isSignedIn: boolean;
  isFavorited: boolean;
  illustration: MedicalIllustrationBlock;
  canEdit?: boolean;
  isAdmin?: boolean;
  blockCount?: number;
}

export function DiseaseSnapshot({
  diseaseId,
  diseaseSlug,
  diseaseName,
  status,
  regions,
  evidenceBased,
  boardRelevance,
  updatedAt,
  readingMinutes,
  isSignedIn,
  isFavorited,
  illustration,
  canEdit,
  isAdmin,
  blockCount,
}: DiseaseSnapshotProps) {
  const category = categoryForRegions(regions);

  return (
    <div className="flex flex-col gap-3">
      <DiseaseHeader
        diseaseId={diseaseId}
        diseaseSlug={diseaseSlug}
        diseaseName={diseaseName}
        status={status}
        category={category}
        evidenceBased={evidenceBased}
        boardRelevance={boardRelevance}
        updatedAt={updatedAt}
        readingMinutes={readingMinutes}
        isSignedIn={isSignedIn}
        isFavorited={isFavorited}
        canEdit={canEdit}
        isAdmin={isAdmin}
        blockCount={blockCount}
      />

      <MedicalIllustrationBlockView block={illustration} diseaseId={diseaseId} diseaseSlug={diseaseSlug} />
    </div>
  );
}
