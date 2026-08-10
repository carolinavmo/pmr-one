import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Shared card shell for admin dashboard sections — a consistent
// icon+title header over whatever content the caller supplies.
export function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-ui text-sm font-medium text-primary">
        <Icon className="size-4 text-secondary" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}
