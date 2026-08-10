import type { LucideIcon } from "lucide-react";
import {
  AlignLeft,
  Heading2,
  Bookmark,
  Gem,
  Target,
  AlertTriangle,
  Image as ImageIcon,
  Table2,
  GitCommitHorizontal,
  BarChart3,
  Hand,
  Workflow,
  Dumbbell,
  Scan,
  TrendingUp,
  CircleAlert,
  Bone,
  GitCompare,
  AlertOctagon,
  Syringe,
  BookOpen,
  LayoutGrid,
  Square,
  Grid3x3,
  Columns2,
  HelpCircle,
  PanelsTopLeft,
  TableProperties,
  ShieldCheck,
  Gauge,
  Images,
  Quote,
  Info,
  Tag,
  List,
  Crosshair,
  LayoutTemplate,
  ImagePlus,
  Star,
  CircleDot,
} from "lucide-react";

// Single source of truth for every Editorial Block type the "+"
// picker can offer — the command palette, the insert Server Action,
// and (as more reference types get wired) the reuse-search panel all
// read this instead of each keeping their own copy of "which types
// exist." Growing from today's handful of real types toward the
// project's eventual 30-40 means adding a row here, not touching the
// palette component again. See docs/AUTHORING_EXPERIENCE.md, "Adding
// a block."
export type BlockGroup = "text" | "visual" | "clinical" | "knowledge-objects" | "layout";

export const BLOCK_GROUPS: { id: BlockGroup; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "visual", label: "Visual" },
  { id: "clinical", label: "Clinical" },
  { id: "knowledge-objects", label: "Knowledge Objects" },
  { id: "layout", label: "Layout" },
];

export interface BlockRegistryEntry {
  type: string;
  label: string;
  group: BlockGroup;
  icon: LucideIcon;
  // owns-content: inserting creates an empty block, drops straight
  // into inline editing (Pass 1's mechanism). references-object:
  // inserting opens search-existing-first, create-new only as a
  // fallback (findOrCreate, moved into the UI).
  kind: "owns-content" | "references-object";
  // available: the insert path actually works end-to-end today.
  // future: named and visible (per the founder's own "(future)"
  // notation), disabled, so the palette shows the full vision without
  // pretending unbuilt types work.
  status: "available" | "future";
  // Loose keyword match against the nearest preceding section heading
  // — powers the "Suggested" row. Wrong guesses cost nothing; the
  // full picker is always still there underneath.
  homeSections?: RegExp;
}

export const BLOCK_REGISTRY: BlockRegistryEntry[] = [
  // Text
  { type: "paragraph", label: "Paragraph", group: "text", icon: AlignLeft, kind: "owns-content", status: "available" },
  { type: "section_heading", label: "Heading", group: "text", icon: Heading2, kind: "owns-content", status: "available" },
  { type: "key_point", label: "Key Point", group: "text", icon: Bookmark, kind: "owns-content", status: "available" },
  { type: "clinical_pearl", label: "Clinical Pearl", group: "text", icon: Gem, kind: "references-object", status: "available" },
  { type: "learning_objective", label: "Learning Objective", group: "text", icon: Target, kind: "owns-content", status: "available" },
  { type: "warning_pitfall", label: "Warning / Pitfall", group: "text", icon: AlertTriangle, kind: "owns-content", status: "available" },
  { type: "callout_banner", label: "Callout Banner", group: "text", icon: Info, kind: "owns-content", status: "available" },
  { type: "badge_row", label: "Badge Row", group: "text", icon: Tag, kind: "owns-content", status: "available" },
  { type: "icon_list", label: "Icon List", group: "text", icon: List, kind: "owns-content", status: "available" },
  { type: "highlight_card", label: "Highlight Card", group: "text", icon: Star, kind: "owns-content", status: "available" },
  { type: "icon_text", label: "Icon + Text", group: "text", icon: CircleDot, kind: "owns-content", status: "available" },

  // Visual
  { type: "overview", label: "Overview", group: "visual", icon: LayoutTemplate, kind: "owns-content", status: "available", homeSections: /overview/i },
  { type: "simple_image", label: "Image", group: "visual", icon: ImagePlus, kind: "owns-content", status: "available" },
  { type: "medical_illustration", label: "Medical Illustration", group: "visual", icon: ImageIcon, kind: "references-object", status: "available" },
  { type: "comparison_table", label: "Comparison Table", group: "visual", icon: Table2, kind: "owns-content", status: "available" },
  { type: "rich_table", label: "Rich Table", group: "visual", icon: TableProperties, kind: "owns-content", status: "available" },
  { type: "image_comparison", label: "Image Comparison", group: "visual", icon: Images, kind: "owns-content", status: "available" },
  { type: "timeline", label: "Timeline", group: "visual", icon: GitCommitHorizontal, kind: "owns-content", status: "available" },
  { type: "infographic", label: "Infographic", group: "visual", icon: BarChart3, kind: "owns-content", status: "available" },
  { type: "evidence_summary", label: "Evidence Summary", group: "visual", icon: ShieldCheck, kind: "owns-content", status: "available" },
  { type: "stat_card", label: "Stat Card", group: "visual", icon: Gauge, kind: "owns-content", status: "available" },
  { type: "photo_card_gallery", label: "Photo Card Gallery", group: "visual", icon: Crosshair, kind: "owns-content", status: "available" },

  // Clinical
  { type: "examination_workflow", label: "Examination Workflow", group: "clinical", icon: Hand, kind: "references-object", status: "available", homeSections: /exam/i },
  { type: "treatment_algorithm", label: "Treatment Algorithm", group: "clinical", icon: Workflow, kind: "references-object", status: "available", homeSections: /treatment/i },
  { type: "rehabilitation_progression", label: "Rehabilitation Progression", group: "clinical", icon: Dumbbell, kind: "references-object", status: "available", homeSections: /rehab/i },
  { type: "imaging_findings", label: "Diagnostic Imaging", group: "clinical", icon: Scan, kind: "references-object", status: "available", homeSections: /imaging|diagnos/i },
  { type: "outcome_measures", label: "Outcome Measures", group: "clinical", icon: TrendingUp, kind: "references-object", status: "future", homeSections: /outcome|prognosis/i },
  { type: "self_check", label: "Test Yourself", group: "clinical", icon: HelpCircle, kind: "owns-content", status: "available" },
  { type: "tabs", label: "Tabs", group: "clinical", icon: PanelsTopLeft, kind: "owns-content", status: "available", homeSections: /rehab|treatment/i },

  // Knowledge Objects
  { type: "risk_factor", label: "Risk Factors", group: "knowledge-objects", icon: CircleAlert, kind: "references-object", status: "available", homeSections: /epidemiology|risk/i },
  { type: "anatomy", label: "Anatomy", group: "knowledge-objects", icon: Bone, kind: "references-object", status: "future", homeSections: /anatomy/i },
  { type: "differential_diagnosis", label: "Differential Diagnosis", group: "knowledge-objects", icon: GitCompare, kind: "references-object", status: "future" },
  { type: "complications", label: "Complications", group: "knowledge-objects", icon: AlertOctagon, kind: "references-object", status: "future" },
  { type: "procedures", label: "Procedures", group: "knowledge-objects", icon: Syringe, kind: "references-object", status: "future" },
  { type: "reference_list", label: "References", group: "knowledge-objects", icon: BookOpen, kind: "references-object", status: "available", homeSections: /reference/i },
  { type: "citation_card", label: "Citation Card", group: "knowledge-objects", icon: Quote, kind: "references-object", status: "available", homeSections: /reference/i },

  // Layout
  { type: "card_grid", label: "Card Grid", group: "layout", icon: LayoutGrid, kind: "owns-content", status: "available" },
  { type: "large_cards", label: "Large Cards", group: "layout", icon: Square, kind: "owns-content", status: "available" },
  { type: "small_cards", label: "Small Cards", group: "layout", icon: Grid3x3, kind: "owns-content", status: "available" },
  { type: "two_column", label: "Two-column layout", group: "layout", icon: Columns2, kind: "owns-content", status: "future" },
];

export function suggestedBlockTypes(nearestHeading: string | undefined): BlockRegistryEntry[] {
  if (!nearestHeading) return [];
  return BLOCK_REGISTRY.filter(
    (entry) => entry.status === "available" && entry.homeSections?.test(nearestHeading)
  );
}
