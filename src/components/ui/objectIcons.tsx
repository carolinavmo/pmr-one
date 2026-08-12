import {
  Stethoscope,
  Hand,
  GitBranch,
  Gem,
  BookText,
  Image as ImageIcon,
  ScrollText,
  TrendingUp,
  Scan,
  ListChecks,
  Dumbbell,
  Syringe,
  Bone,
  Calculator,
  type LucideIcon,
} from "lucide-react";
import type { KnowledgeObjectType } from "@/lib/knowledge-objects";

// Tier 1: "every Knowledge Object type gets exactly one icon, used
// identically in every lens it appears in" — this map is the single
// place that assignment lives, so it can never drift between lenses.
export const objectIcons: Record<KnowledgeObjectType, LucideIcon> = {
  disease: Stethoscope,
  examination_maneuver: Hand,
  treatment_algorithm: GitBranch,
  clinical_pearl: Gem,
  reference: BookText,
  medical_illustration: ImageIcon,
  guideline_recommendation: ScrollText,
  risk_factor: TrendingUp,
  imaging_finding: Scan,
  rehabilitation_protocol: ListChecks,
  exercise: Dumbbell,
  procedure: Syringe,
  anatomy_structure: Bone,
  clinical_calculator: Calculator,
};
