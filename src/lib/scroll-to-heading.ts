// Jump to a heading by id and keep it exactly where it belongs.
//
// A bare hash link / scrollIntoView aims once, at the heading's position at
// that instant. On a long page that position keeps moving afterwards — images
// and tables above the target finish laying out, web fonts swap in, a section
// above is opened or closed — so the landing spot ends up a few lines short or
// long ("it doesn't go exactly where I clicked"). This starts the usual smooth
// scroll, then watches the heading until the page stops moving and nudges it
// back to its scroll-margin offset if it drifted. Any wheel/touch/key/mouse
// input from the reader cancels the watching straight away.

const SETTLE_WINDOW_MS = 4000;
const QUIET_FRAMES = 3;
const TOLERANCE_PX = 2;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function scrollToHeading(id: string): void {
  const first = document.getElementById(id);
  if (!first) return;
  first.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });

  const startedAt = performance.now();
  let lastY = window.scrollY;
  let quiet = 0;
  let frame = 0;
  const cancelEvents = ["wheel", "touchstart", "keydown", "mousedown"] as const;

  const stop = () => {
    cancelAnimationFrame(frame);
    for (const type of cancelEvents) window.removeEventListener(type, stop);
  };
  for (const type of cancelEvents) window.addEventListener(type, stop, { passive: true });

  const tick = () => {
    const el = document.getElementById(id);
    if (el) {
      const y = window.scrollY;
      quiet = y === lastY ? quiet + 1 : 0;
      lastY = y;
      // Only correct once the scroll has come to rest, so this never fights
      // the smooth scroll that is still travelling toward the heading.
      if (quiet >= QUIET_FRAMES) {
        const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        const drift = el.getBoundingClientRect().top - margin;
        if (Math.abs(drift) > TOLERANCE_PX) {
          window.scrollBy({ top: drift, behavior: "instant" });
          lastY = window.scrollY;
          quiet = 0;
        }
      }
    }
    if (performance.now() - startedAt < SETTLE_WINDOW_MS) frame = requestAnimationFrame(tick);
    else stop();
  };
  frame = requestAnimationFrame(tick);
}
