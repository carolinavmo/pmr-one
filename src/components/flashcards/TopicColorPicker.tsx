import { TOPIC_COLOR_ORDER, TOPIC_COLOR_LABEL, TOPIC_COLOR_HEX, type TopicColor } from "@/lib/flashcard-topic-colors";

// The Candy-palette equivalent of ColorSwatchPicker.tsx — a separate
// component rather than a parameterized version of that one, since
// ColorSwatchPicker is typed to the app-wide CardColor and this reads
// a genuinely different 8-color list (flashcard topics only,
// FLASHCARDS-SPEC.md's "where the bright palette does not go").
export function TopicColorPicker({
  onPick,
  className = "absolute top-6 right-0 z-10 w-40",
}: {
  onPick: (color: TopicColor) => void;
  className?: string;
}) {
  return (
    <div className={`${className} rounded-lg border border-border bg-surface-raised p-2 shadow-md`}>
      <div className="grid grid-cols-4 gap-1.5">
        {TOPIC_COLOR_ORDER.map((color) => (
          <button
            key={color}
            type="button"
            title={TOPIC_COLOR_LABEL[color]}
            onClick={() => onPick(color)}
            className="size-7 rounded-full transition-transform duration-base hover:scale-110"
            style={{ backgroundColor: TOPIC_COLOR_HEX[color] }}
          />
        ))}
      </div>
    </div>
  );
}
