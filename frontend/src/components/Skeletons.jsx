/**
 * Loading placeholders.
 *
 * Each block is announced once as "Loading…" via a role="status" wrapper
 * rather than leaving a screen reader with a silent screen, and marked
 * aria-hidden inside so the shimmer bars themselves are not read out.
 */

export function ProductGridSkeleton({ count = 8, label = 'Loading products' }) {
  return (
    <div className="grid grid-cols-2 gap-x-gap-md gap-y-gap-lg md:grid-cols-3 xl:grid-cols-4"
      role="status" aria-label={label}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} aria-hidden="true">
          <div className="skeleton aspect-[4/5]" />
          <div className="skeleton mt-3 h-3.5 w-3/4 rounded-control" />
          <div className="skeleton mt-2 h-3 w-1/3 rounded-control" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="container-page py-10" role="status" aria-label="Loading page">
      <div className="skeleton h-8 w-56 rounded-control" aria-hidden="true" />
      <div className="skeleton mt-3 h-4 w-96 max-w-full rounded-control" aria-hidden="true" />
      <div className="mt-10"><ProductGridSkeleton /></div>
    </div>
  );
}

/** Single-column list rows — orders, reviews, tracking history. */
export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-card border border-line p-3" aria-hidden="true">
          <div className="skeleton h-14 w-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="skeleton h-3.5 w-2/5 rounded-control" />
            <div className="skeleton mt-2 h-3 w-3/5 rounded-control" />
          </div>
          <div className="skeleton h-4 w-16 shrink-0 rounded-control" />
        </div>
      ))}
    </div>
  );
}

/** Product detail page — image column plus buy box. */
export function ProductSkeleton() {
  return (
    <div className="container-page py-8" role="status" aria-label="Loading product">
      <div className="grid gap-gap-lg lg:grid-cols-2" aria-hidden="true">
        <div className="skeleton aspect-[4/5] w-full" />
        <div>
          <div className="skeleton h-4 w-24 rounded-control" />
          <div className="skeleton mt-4 h-9 w-3/4 rounded-control" />
          <div className="skeleton mt-3 h-5 w-32 rounded-control" />
          <div className="skeleton mt-8 h-11 w-full rounded-control" />
          <div className="skeleton mt-3 h-11 w-full rounded-control" />
          <div className="skeleton mt-6 h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
