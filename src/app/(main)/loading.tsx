/**
 * Route-level loading state for the main app shell. Shows a calm branded
 * placeholder while a page segment streams in.
 */

export default function Loading() {
  return (
    <main className="min-h-dvh stitch-shell">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8 space-y-3">
          <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
          <div className="h-12 w-3/4 max-w-md animate-pulse rounded-2xl bg-muted" />
          <div className="h-4 w-2/3 max-w-sm animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mb-8 grid grid-cols-12 gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="h-2.5 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-[2.4rem] bg-muted" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-[2rem] bg-muted" />
          <div className="h-56 animate-pulse rounded-[2rem] bg-muted" />
        </div>
      </div>
    </main>
  );
}
