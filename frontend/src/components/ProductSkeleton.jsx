/* ============================================================================
 * ProductSkeleton — loading placeholder for product cards.
 *
 * Renders a grid of gray boxes matching the aspect ratio and layout of
 * CollectionCard (minimal variant). Used by NewArrivalsSection and
 * ProductCarouselSection while the API is loading.
 * ========================================================================== */

export function ProductCardSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col bg-white">
      {/* Image placeholder — 3/4.3 aspect ratio */}
      <div className="w-full overflow-hidden bg-[#f0f0f0]" style={{ aspectRatio: '3 / 4.3' }}>
        <div className="h-full w-full skeleton" />
      </div>
      {/* Info placeholder */}
      <div className="px-[10px] pb-1 pt-[10px]">
        {/* Swatch row */}
        <div className="mb-2 flex h-6 items-center gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-4 rounded-full skeleton" />
          ))}
        </div>
        {/* Title */}
        <div className="mb-2 h-4 w-3/4 skeleton" style={{ borderRadius: '2px' }} />
        {/* Price */}
        <div className="h-4 w-1/3 skeleton" style={{ borderRadius: '2px' }} />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-px border-y border-[#e7e5e0] bg-[#e7e5e0] md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductRowSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-px border-y border-[#e7e5e0] bg-[#e7e5e0] md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}