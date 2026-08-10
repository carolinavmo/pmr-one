// Skeleton shaped like the final KnowledgeObjectCard grid, not a
// generic spinner — Tier 3: "the wait itself previews the answer's
// shape."
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 animate-pulse rounded bg-border/60" />
        <div className="h-4 w-72 animate-pulse rounded bg-border/40" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-lg border border-border bg-surface-raised p-4"
          >
            <div className="size-12 shrink-0 animate-pulse rounded-md bg-border/60" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-border/60" />
              <div className="h-3 w-full animate-pulse rounded bg-border/40" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-border/30" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
