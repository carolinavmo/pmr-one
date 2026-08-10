// Skeleton shaped like the final Disease Page (rail + heading + a
// handful of block-width bars) rather than a generic spinner.
export default function Loading() {
  return (
    <main className="flex gap-12 px-3 py-16">
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-3 w-32 animate-pulse rounded bg-border/40" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        <div className="h-9 w-2/3 animate-pulse rounded bg-border/60" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="h-5 w-1/3 animate-pulse rounded bg-border/50" />
            <div className="h-4 w-full animate-pulse rounded bg-border/30" />
            <div className="h-4 w-full animate-pulse rounded bg-border/30" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-border/30" />
          </div>
        ))}
      </div>
    </main>
  );
}
