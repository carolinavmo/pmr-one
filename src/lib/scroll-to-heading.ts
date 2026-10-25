// Keep a heading jump on target while the page layout settles.
//
// A hash link aims once, at the heading's position at that instant. On a long
// page that position keeps moving afterwards — images and tables above the
// target finish laying out, web fonts swap in, a section above is opened or
// closed — so the landing spot ends up a few lines short or long ("it doesn't
// go exactly where I clicked"). This leaves the normal smooth scroll alone and
// only watches the heading once the page has come to rest, nudging it back to
// its scroll-margin offset if it drifted. Any wheel/touch/key/mouse input from
// the reader cancels the watching straight away.
//
// The hash link itself is what scrolls (Next's own hash navigation). The one
// case it does nothing is a click on the link for the hash already in the URL,
// so only then does this start the smooth scroll itself.

const SETTLE_WINDOW_MS = 5000;
// How long the scroll position must hold still before it counts as "arrived".
const REST_MS = 160;
// If nothing moved at all (an instant jump, reduced motion), wait this long
// before treating the page as at rest.
const NO_MOVEMENT_GRACE_MS = 900;
const TOLERANCE_PX = 2;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Call from the link's onClick, before navigation updates the URL hash.
export function scrollToHeading(id: string): void {
  const first = document.getElementById(id);
  if (!first) return;
  if (window.location.hash.slice(1) === id) {
    first.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  const startedAt = performance.now();
  let lastY = window.scrollY;
  let lastChangeAt = startedAt;
  let moved = false;
  let frame = 0;
  const cancelEvents = ["wheel", "touchstart", "keydown", "mousedown"] as const;

  const stop = () => {
    cancelAnimationFrame(frame);
    for (const type of cancelEvents) window.removeEventListener(type, stop);
  };
  for (const type of cancelEvents) window.addEventListener(type, stop, { passive: true });

  const tick = () => {
    const now = performance.now();
    const y = window.scrollY;
    if (y !== lastY) {
      lastY = y;
      lastChangeAt = now;
      moved = true;
    }
    const atRest = now - lastChangeAt >= REST_MS && (moved || now - startedAt >= NO_MOVEMENT_GRACE_MS);
    if (atRest) {
      const el = document.getElementById(id);
      if (el) {
        const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        const drift = el.getBoundingClientRect().top - margin;
        if (Math.abs(drift) > TOLERANCE_PX) {
          window.scrollBy({ top: drift, behavior: "instant" });
          lastY = window.scrollY;
          lastChangeAt = now;
        }
      }
    }
    if (now - startedAt < SETTLE_WINDOW_MS) frame = requestAnimationFrame(tick);
    else stop();
  };
  frame = requestAnimationFrame(tick);
}
