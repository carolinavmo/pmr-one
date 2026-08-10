import {
  Bone,
  Brain,
  HeartPulse,
  Baby,
  Flame,
  Zap,
  BrainCircuit,
  Accessibility,
  Wrench,
  Activity,
  Syringe,
  Dumbbell,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import type { CardColor } from "@/lib/editorial-blocks";

export interface StudyCategory {
  key: string;
  label: string;
  icon: LucideIcon;
  color: CardColor;
}

// A hardcoded list, not a DB table — study categories are a fixed
// domain vocabulary the founder specified directly, not user-managed
// content. Colors cycle through the 7 non-neutral CardColor values
// ("neutral" is skipped — it reads as "no color chosen," wrong for an
// always-set category chip), reused once each list of 8 runs out.
export const STUDY_CATEGORIES: StudyCategory[] = [
  { key: "musculoskeletal", label: "Musculoskeletal", icon: Bone, color: "accent" },
  { key: "neurology", label: "Neurology", icon: Brain, color: "trust" },
  { key: "cardiorespiratory", label: "Cardiorespiratory", icon: HeartPulse, color: "insight" },
  { key: "pediatrics", label: "Pediatrics", icon: Baby, color: "blue" },
  { key: "pain", label: "Pain", icon: Flame, color: "violet" },
  { key: "spinal_cord_injury", label: "Spinal Cord Injury", icon: Zap, color: "rose" },
  { key: "brain_injury", label: "Brain Injury", icon: BrainCircuit, color: "slate" },
  { key: "amputee_rehabilitation", label: "Amputee Rehabilitation", icon: Accessibility, color: "accent" },
  { key: "prosthetics_orthotics", label: "Prosthetics & Orthotics", icon: Wrench, color: "trust" },
  { key: "electrodiagnosis", label: "Electrodiagnosis", icon: Activity, color: "insight" },
  { key: "procedures", label: "Procedures", icon: Syringe, color: "blue" },
  { key: "rehabilitation", label: "Rehabilitation", icon: Dumbbell, color: "violet" },
  { key: "board_review", label: "Board Review", icon: GraduationCap, color: "rose" },
];

export const STUDY_CATEGORY_MAP: Record<string, StudyCategory> = Object.fromEntries(
  STUDY_CATEGORIES.map((category) => [category.key, category]),
);
