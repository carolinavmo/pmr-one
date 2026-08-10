import type { ComponentType, SVGProps } from "react";

// A third icon family, distinct from both cardIcons.ts (Lucide,
// stroke SVG) and medicalIcons.ts (Health Icons, filled SVG) — these
// 5 are real joint-specific anatomy icons (Health Icons has none;
// medicalIcons.ts had to fall back to generic Arm/Joints/Skeleton
// approximations for exactly these body regions) sourced from
// Flaticon per founder request, since the founder explicitly rejected
// hand-drawing icons earlier this session. Flaticon's SVG download
// requires an account login we can't complete on the founder's
// behalf; PNG downloads don't, so these are fixed-black raster
// images rather than currentColor SVG components like every other
// icon here. Rendered as a CSS `mask-image` on a `background-color:
// currentColor` element instead of a plain `<img>` — the PNG's alpha
// channel (opaque icon shape on a transparent field) becomes the
// visible region, and the actual color comes from `currentColor`
// same as every SVG icon family, so these fully participate in
// CARD_COLOR_CHIP/CARD_COLOR_TEXT recoloring (and dark mode) with no
// separate invert-filter hack needed. Free Flaticon tier requires
// attribution — each icon's author is recorded here and surfaced
// wherever credits are needed, not just left implicit.
export interface AnatomyIconAttribution {
  author: string;
  url: string;
}

export const anatomyIconAttributions: Record<string, AnatomyIconAttribution> = {
  spine: { author: "Iconiic", url: "https://www.flaticon.com/free-icon/spine_17715009" },
  shoulder: { author: "max.icons", url: "https://www.flaticon.com/free-icon/shoulder_2416869" },
  elbow: { author: "kerismaker", url: "https://www.flaticon.com/free-icon/elbow_3816746" },
  wrist: { author: "Bambang tirta suganda", url: "https://www.flaticon.com/free-icon/wrist_17117815" },
  "hand-fingers": { author: "Graficon", url: "https://www.flaticon.com/free-icon/fracture_18615943" },
};

function makeAnatomyIcon(src: string, name: string): ComponentType<SVGProps<SVGSVGElement>> {
  function AnatomyIcon({ className }: SVGProps<SVGSVGElement>) {
    return (
      <span
        aria-hidden="true"
        className={`inline-block shrink-0 bg-current ${className ?? ""}`}
        style={{
          maskImage: `url(${src})`,
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskImage: `url(${src})`,
          WebkitMaskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
        }}
      />
    );
  }
  AnatomyIcon.displayName = `AnatomyIcon(${name})`;
  return AnatomyIcon;
}

export const anatomyIcons = {
  spine: makeAnatomyIcon("/icons/anatomy/spine.png", "spine"),
  shoulder: makeAnatomyIcon("/icons/anatomy/shoulder.png", "shoulder"),
  elbow: makeAnatomyIcon("/icons/anatomy/elbow.png", "elbow"),
  wrist: makeAnatomyIcon("/icons/anatomy/wrist.png", "wrist"),
  "hand-fingers": makeAnatomyIcon("/icons/anatomy/hand-fingers.png", "hand-fingers"),
} satisfies Record<string, ComponentType<SVGProps<SVGSVGElement>>>;

export type AnatomyIconName = keyof typeof anatomyIcons;
