"use client";

import { FileDown } from "lucide-react";

// Admin-only. Opens the browser's print dialog on this page — globals.css's
// `@media print` block strips the site chrome and edit controls, so "Save as
// PDF" there yields the page content with its own styling. Print uses the
// document title as the default file name, and a dark-theme reader would
// otherwise print a dark page, so both are swapped for the print and restored
// once the dialog closes.
export function DownloadPdfButton({ title }: { title: string }) {
  const handleClick = () => {
    const root = document.documentElement;
    const previousTheme = root.getAttribute("data-theme");
    const previousTitle = document.title;
    root.setAttribute("data-theme", "light");
    document.title = title;
    const restore = () => {
      window.removeEventListener("afterprint", restore);
      if (previousTheme === null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", previousTheme);
      document.title = previousTitle;
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 font-ui text-xs font-medium text-secondary transition-colors duration-base hover:border-accent hover:text-accent print:hidden"
    >
      <FileDown className="size-3" aria-hidden="true" />
      Download PDF
    </button>
  );
}
