// Shared by every image block that crops to a fixed aspect ratio
// (SimpleImageBlock, HighlightCardBlock — MedicalIllustrationBlock
// deliberately opts out, see its own comment) so the same 3x3
// focal-point picker and object-position vocabulary aren't redefined
// per block. Originally OverviewBlock's own local copy; extracted once
// a second block needed the identical picker rather than a duplicate.
export type ImageFocalPoint =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

export const FOCAL_POINT_OPTIONS: { value: ImageFocalPoint; label: string }[] = [
  { value: "top-left", label: "Top left" },
  { value: "top", label: "Top" },
  { value: "top-right", label: "Top right" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom", label: "Bottom" },
  { value: "bottom-right", label: "Bottom right" },
];

// Which part of the image stays visible once `object-cover` fits it
// into a fixed-aspect-ratio box. Literal Tailwind classes — the four
// corners need bracket-value arbitrary properties since
// `object-position`'s compound corner keywords aren't core utilities.
export const FOCAL_POINT_CLASS: Record<ImageFocalPoint, string> = {
  "top-left": "object-[left_top]",
  top: "object-top",
  "top-right": "object-[right_top]",
  left: "object-left",
  center: "object-center",
  right: "object-right",
  "bottom-left": "object-[left_bottom]",
  bottom: "object-bottom",
  "bottom-right": "object-[right_bottom]",
};
