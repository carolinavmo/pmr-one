"use client";

import { useEffect } from "react";

// Publishes `--scroll-offset` on <html>: how far down a heading should land
// when a link or the "On this page" rail jumps to it — the sticky navbar's own
// height plus room for the section card's top band (the label strip that sits
// above the title) and a little air. The navbar's height changes with width
// and locale (it wraps to a second row), so a fixed scroll-margin either
// covers the title or leaves a gap; measuring the real header keeps the title
// clear at every size. Heading blocks read it through scroll-mt-[...] with a
// fallback for the moment before this runs.
const BAND_AND_AIR_PX = 50;

export function ScrollOffsetVar() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header.sticky");
    if (!header) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--scroll-offset", `${Math.ceil(header.getBoundingClientRect().height) + BAND_AND_AIR_PX}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--scroll-offset");
    };
  }, []);

  return null;
}
