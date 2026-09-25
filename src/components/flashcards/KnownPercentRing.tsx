// "The ring is the topic's identity. Same colour and same percentage
// everywhere it appears" (FLASHCARDS-SPEC.md rule 1) — one component
// so Session Complete (Pass 2), the topic page header (Pass 3) and a
// future dashboard tile (Pass 4) can never each round or color the
// same number differently.
export function KnownPercentRing({
  percent,
  size,
  strokeColor = "var(--color-trust)",
  topicColor,
  label,
  sublabel,
}: {
  percent: number;
  size: number;
  strokeColor?: string;
  // When set, the ring reads the topic's own colour instead of
  // `strokeColor` — "same colour... everywhere it appears"
  // (FLASHCARDS-SPEC.md rule 1).
  topicColor?: string;
  label?: string;
  sublabel?: string;
}) {
  const radius = size / 2 - size * 0.08;
  const stroke = size * 0.08;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100);
  const center = size / 2;

  return (
    <div
      data-topic-color={topicColor}
      className="relative flex shrink-0 flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" stroke={topicColor ? "var(--topic-bd)" : "var(--color-border)"} strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={topicColor ? "var(--topic)" : strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-heading font-black text-navy" style={{ fontSize: size * 0.19 }}>
          {label ?? `${percent}%`}
        </span>
        {sublabel && (
          <span className="font-ui font-black tracking-wide text-secondary uppercase" style={{ fontSize: Math.max(8, size * 0.075) }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
