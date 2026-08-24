/* ============================================================================
 * Admin UI — Skeleton / spinner (Phase 03-R)
 * Flat white/8 blocks, slow subtle pulse (reduced-motion safe). No radius.
 * ========================================================================== */

export function Skeleton({ className = '', lines = 1 }) {
  if (lines > 1) {
    return (
      <div className="space-y-2" aria-hidden>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-3 animate-pulse bg-white/8 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
          />
        ))}
      </div>
    );
  }
  return <div aria-hidden className={`animate-pulse bg-white/8 ${className}`} />;
}

export function Spinner({ size = 16, className = '' }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border border-[#DCDCDC] border-t-white ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#999999]">
      <Spinner size={13} />
      {label}
    </div>
  );
}
