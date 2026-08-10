import type { ComponentType, SVGProps } from "react";
import { cardIcons } from "@/components/ui/cardIcons";
import { medicalIcons } from "@/components/ui/medicalIcons";
import { anatomyIcons } from "@/components/ui/anatomyIcons";
import type { TopicIconName } from "@/lib/topics";

type TopicIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

// Merged lookup for anywhere a topic's icon is rendered generically
// (IndexSidebar, IconSwatchPicker, TopicTreeEditor) without caring
// which family it came from — cardIcons.ts (Lucide, interface
// chrome), medicalIcons.ts (Health Icons, the broader PM&R medical
// library), and anatomyIcons.tsx (Flaticon, precise joint-specific
// icons) each stay the source of truth for their own name set; this
// just combines them for lookup by a single TopicIconName.
export const topicIcons: Record<TopicIconName, TopicIconComponent> = {
  ...cardIcons,
  ...medicalIcons,
  ...anatomyIcons,
};
