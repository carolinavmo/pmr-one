import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbTopic } from "@/lib/topics";

interface BreadcrumbsProps {
  path: BreadcrumbTopic[];
}

// Root-first ancestor chain from getBreadcrumbPath — "Explore" is
// always the first crumb (links back to the sidebar tree's own root,
// i.e. the homepage), followed by every topic from the tree's root
// down to the disease's immediate parent. The disease's own name is
// deliberately not part of this trail — it's already the page's H1
// right below. Each topic crumb links to the catalog page filtered to
// that topic (and its descendants) rather than a dedicated topic
// landing page, which doesn't exist yet.
export async function Breadcrumbs({ path }: BreadcrumbsProps) {
  if (path.length === 0) return null;
  const t = await getTranslations("nav");
  const tDisease = await getTranslations("disease");

  return (
    <nav aria-label={tDisease("breadcrumbLabel")} className="flex flex-wrap items-center gap-1.5 font-ui text-sm">
      <Link href="/" className="text-secondary transition-colors duration-base hover:text-accent">
        {t("explore")}
      </Link>
      {path.map((topic) => (
        <span key={topic.slug} className="flex items-center gap-1.5">
          <ChevronRight className="size-3.5 shrink-0 text-secondary/60" aria-hidden="true" />
          <Link
            href={`/conditions?topic=${topic.slug}`}
            className="text-secondary transition-colors duration-base hover:text-accent"
          >
            {topic.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}
