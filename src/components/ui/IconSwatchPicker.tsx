import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";
import { medicalIcons, type MedicalIconName } from "@/components/ui/medicalIcons";
import { anatomyIcons, type AnatomyIconName } from "@/components/ui/anatomyIcons";
import type { TopicIconName } from "@/lib/topics";

// Mirrors ColorSwatchPicker.tsx exactly (same popover shape/styling,
// same "caller positions it, doesn't own a trigger" contract) for the
// admin topic editor's icon picker — the two pickers always appear
// together there, so keeping their look identical matters more than
// it would for a one-off. Three labeled sections, not one merged grid
// — cardIcons (Lucide, generic interface chrome), medicalIcons
// (Health Icons, the broader PM&R medical library), and anatomyIcons
// (Flaticon, precise joint-specific icons) are deliberately distinct
// families, not one blended set, so the picker keeps that distinction
// legible rather than hiding it.
export function IconSwatchPicker({
  onPick,
  className = "absolute top-6 right-0 z-10 w-64",
}: {
  onPick: (icon: TopicIconName) => void;
  className?: string;
}) {
  return (
    <div
      className={`${className} max-h-80 overflow-y-auto rounded-lg border border-border bg-surface-raised p-2 shadow-md`}
    >
      <p className="px-1 pt-0.5 pb-1 font-ui text-[10px] font-medium tracking-wide text-secondary uppercase">
        Interface
      </p>
      <div className="grid grid-cols-6 gap-1">
        {(Object.keys(cardIcons) as CardIconName[]).map((name) => {
          const Icon = cardIcons[name];
          return (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => onPick(name)}
              className="flex size-7 items-center justify-center rounded text-secondary transition-colors duration-base hover:bg-border/40 hover:text-primary"
            >
              <Icon className="size-4" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <p className="px-1 pt-2 pb-1 font-ui text-[10px] font-medium tracking-wide text-secondary uppercase">
        Medical
      </p>
      <div className="grid grid-cols-6 gap-1">
        {(Object.keys(medicalIcons) as MedicalIconName[]).map((name) => {
          const Icon = medicalIcons[name];
          return (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => onPick(name)}
              className="flex size-7 items-center justify-center rounded text-secondary transition-colors duration-base hover:bg-border/40 hover:text-primary"
            >
              <Icon className="size-4" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <p className="px-1 pt-2 pb-1 font-ui text-[10px] font-medium tracking-wide text-secondary uppercase">
        Anatomy
      </p>
      <div className="grid grid-cols-6 gap-1">
        {(Object.keys(anatomyIcons) as AnatomyIconName[]).map((name) => {
          const Icon = anatomyIcons[name];
          return (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => onPick(name)}
              className="flex size-7 items-center justify-center rounded text-secondary transition-colors duration-base hover:bg-border/40 hover:text-primary"
            >
              <Icon className="size-4" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
