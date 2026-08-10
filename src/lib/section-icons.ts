import {
  Star,
  Bone,
  Cog,
  Users,
  CircleCheck,
  Stethoscope,
  GitCompare,
  Scan,
  Workflow,
  Dumbbell,
  Sparkles,
  GraduationCap,
  TrendingUp,
  Gem,
  HelpCircle,
  BookOpen,
  Circle,
  type LucideIcon,
} from "lucide-react";

// Best-effort icon per section heading, matched by keyword against the
// heading's own free-text title — same "loose regex against
// author-written text" approach block-registry.ts already uses for its
// "Suggested" row (homeSections). A heading nothing here matches still
// renders, just with a plain circle, so an unusual section title never
// blocks a caller from rendering. Shared by OnThisPage (the inline
// TOC) and SectionCard (each section's own header) so the same
// icon identifies a section in both places.
const HEADING_ICONS: { pattern: RegExp; icon: LucideIcon }[] = [
  { pattern: /overview/i, icon: Star },
  { pattern: /anatomy/i, icon: Bone },
  { pattern: /biomechanic/i, icon: Cog },
  { pattern: /epidemiology/i, icon: Users },
  { pattern: /clinical presentation|symptom/i, icon: CircleCheck },
  { pattern: /exam/i, icon: Stethoscope },
  { pattern: /differential/i, icon: GitCompare },
  { pattern: /imaging|diagnos/i, icon: Scan },
  { pattern: /treatment/i, icon: Workflow },
  { pattern: /rehab/i, icon: Dumbbell },
  { pattern: /return to sport/i, icon: Sparkles },
  { pattern: /patient education/i, icon: GraduationCap },
  { pattern: /prognosis/i, icon: TrendingUp },
  { pattern: /clinical pearl/i, icon: Gem },
  { pattern: /quiz|test yourself|self.?check/i, icon: HelpCircle },
  { pattern: /reference/i, icon: BookOpen },
];

export function iconForHeading(heading: string): LucideIcon {
  return HEADING_ICONS.find((entry) => entry.pattern.test(heading))?.icon ?? Circle;
}
