export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="skeleton aspect-[4/5]" />
          <div className="skeleton mt-3 h-3.5 w-3/4" />
          <div className="skeleton mt-2 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="skeleton h-8 w-56" />
      <div className="skeleton mt-3 h-4 w-96 max-w-full" />
      <div className="mt-10"><ProductGridSkeleton /></div>
    </div>
  );
}
