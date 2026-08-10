"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp } from "lucide-react";

// Fixed to the viewport rather than anchored at the end of the reading
// column (the first pass) — on a long page like plantar-fasciopathy-v2
// (14 sections) "the bottom" is a long scroll away, so an in-flow
// button was invisible for nearly the whole read. Fixed positioning
// mirrors WorkspaceDrawer's own edge tab (`fixed ... z-30`) one
// component over. Hidden near the top of the page, where there's
// nothing yet to scroll back to, and faded in past a scroll threshold
// instead of always present and mostly redundant.
export function BackToTop() {
  const t = useTranslations("disease");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 400);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("backToTop")}
      className={`fixed right-6 bottom-6 z-30 flex size-11 items-center justify-center rounded-full border border-border bg-surface-card text-secondary shadow-md transition-all duration-base hover:border-accent/40 hover:bg-accent/5 hover:text-accent ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <ArrowUp className="size-4" aria-hidden="true" />
    </button>
  );
}
