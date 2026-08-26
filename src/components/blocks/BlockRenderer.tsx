import type { EditorialBlock } from "@/lib/editorial-blocks";
import { SectionHeadingBlockView } from "./SectionHeadingBlock";
import { SubsectionHeadingBlockView } from "./SubsectionHeadingBlock";
import { ParagraphBlockView } from "./ParagraphBlock";
import { KeyPointBlockView } from "./KeyPointBlock";
import { MedicalIllustrationBlockView } from "./MedicalIllustrationBlock";
import { ClinicalPearlBlockView } from "./ClinicalPearlBlock";
import { TreatmentAlgorithmBlockView } from "./TreatmentAlgorithmBlock";
import { RehabilitationProgressionBlockView } from "./RehabilitationProgressionBlock";
import { ExaminationWorkflowBlockView } from "./ExaminationWorkflowBlock";
import { ImagingFindingsBlockView } from "./ImagingFindingsBlock";
import { ReferenceListBlockView } from "./ReferenceListBlock";
import { ComparisonTableBlockView } from "./ComparisonTableBlock";
import { SelfCheckBlockView } from "./SelfCheckBlock";
import { RiskFactorBlockView } from "./RiskFactorBlock";
import { WarningPitfallBlockView } from "./WarningPitfallBlock";
import { LearningObjectiveBlockView } from "./LearningObjectiveBlock";
import { TimelineBlockView } from "./TimelineBlock";
import { InfographicBlockView } from "./InfographicBlock";
import { TabsBlockView } from "./TabsBlock";
import { MediaTabsBlockView } from "./MediaTabsBlock";
import { RichTableBlockView } from "./RichTableBlock";
import { EvidenceSummaryBlockView } from "./EvidenceSummaryBlock";
import { StatCardBlockView } from "./StatCardBlock";
import { ImageComparisonBlockView } from "./ImageComparisonBlock";
import { CitationCardBlockView } from "./CitationCardBlock";
import { CalloutBannerBlockView } from "./CalloutBannerBlock";
import { BadgeRowBlockView } from "./BadgeRowBlock";
import { IconListBlockView } from "./IconListBlock";
import { PhotoCardGalleryBlockView } from "./PhotoCardGalleryBlock";
import { OverviewBlockView } from "./OverviewBlock";
import { SimpleImageBlockView } from "./SimpleImageBlock";
import { HighlightCardBlockView } from "./HighlightCardBlock";
import { IconTextBlockView } from "./IconTextBlock";

interface WorkspaceContext {
  diseaseSlug: string;
  savedPearlIds: Set<string>;
}

// A Disease Page is an ordered sequence of these — the dispatcher is
// the only place that needs to know the full set of block types
// (spec §15, Editorial Block System). `workspaceContext` is optional
// and only ever consumed by clinical_pearl today. `diseaseSlug` is
// always present — most block types need it to call their authoring
// server actions. `diseaseId` is only consumed by medical_illustration
// (its Replace flow needs it for illustration_usage tracking).
export function BlockRenderer({
  block,
  workspaceContext,
  diseaseId,
  diseaseSlug,
}: {
  block: EditorialBlock;
  workspaceContext?: WorkspaceContext;
  diseaseId: string;
  diseaseSlug: string;
}) {
  switch (block.type) {
    case "section_heading":
      return <SectionHeadingBlockView block={block} />;
    case "subsection_heading":
      return <SubsectionHeadingBlockView block={block} />;
    case "paragraph":
      return <ParagraphBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "key_point":
      return <KeyPointBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "medical_illustration":
      return <MedicalIllustrationBlockView block={block} diseaseId={diseaseId} diseaseSlug={diseaseSlug} />;
    case "clinical_pearl":
      return (
        <ClinicalPearlBlockView
          block={block}
          workspaceContext={workspaceContext}
          diseaseSlug={diseaseSlug}
        />
      );
    case "treatment_algorithm":
      return <TreatmentAlgorithmBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "rehabilitation_progression":
      return <RehabilitationProgressionBlockView block={block} />;
    case "examination_workflow":
      return <ExaminationWorkflowBlockView block={block} />;
    case "imaging_findings":
      return <ImagingFindingsBlockView block={block} />;
    case "reference_list":
      return <ReferenceListBlockView block={block} />;
    case "comparison_table":
      return <ComparisonTableBlockView block={block} />;
    case "self_check":
      return <SelfCheckBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "risk_factor":
      return <RiskFactorBlockView block={block} />;
    case "warning_pitfall":
      return <WarningPitfallBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "learning_objective":
      return <LearningObjectiveBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "timeline":
      return <TimelineBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "infographic":
      return <InfographicBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "tabs":
      return <TabsBlockView block={block} />;
    case "media_tabs":
      return <MediaTabsBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "rich_table":
      return <RichTableBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "evidence_summary":
      return <EvidenceSummaryBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "stat_card":
      return <StatCardBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "image_comparison":
      return <ImageComparisonBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "citation_card":
      return <CitationCardBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "callout_banner":
      return <CalloutBannerBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "badge_row":
      return <BadgeRowBlockView block={block} />;
    case "icon_list":
      return <IconListBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "photo_card_gallery":
      return <PhotoCardGalleryBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "overview":
      return <OverviewBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "simple_image":
      return <SimpleImageBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "highlight_card":
      return <HighlightCardBlockView block={block} diseaseSlug={diseaseSlug} />;
    case "icon_text":
      return <IconTextBlockView block={block} diseaseSlug={diseaseSlug} />;
  }
}
