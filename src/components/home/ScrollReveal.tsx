"use client";

import { useEffect, useRef, useState } from "react";

// A one-shot fade+slide-up on scroll-into-view, used to give each
// homepage feature section its own small "arrival" moment as a visitor
// scrolls down. Deliberately no npm dependency — IntersectionObserver
// is already an established browser API in this codebase. Unobserves
// after the first reveal (no re-triggering on scroll back up).
//
// prefers-reduced-motion is handled in pure CSS (Tailwind's
// `motion-reduce:` variant) rather than a JS matchMedia check — the
// only setState call site is the observer's own callback, which is the
// one place React's effect-purity rules meant to allow ("subscribe to
// an external system, call setState in its callback"); a synchronous
// setState in the effect body itself (e.g. for an early
// reduced-motion branch) is exactly what those rules forbid.
export function ScrollReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-base ease-standard motion-reduce:translate-y-0 motion-reduce:opacity-100 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
