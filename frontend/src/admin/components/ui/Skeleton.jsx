/* ============================================================================
 * Admin UI — Skeleton / spinner / loading states
 * Skeleton surface #18181B with a slow, subtle pulse (reduced-motion safe).
 * ========================================================================== */

export function Skeleton({ className = '', lines = 1 }) {
  if (lines > 1) {
    return (
      <div className="space-y-2" aria-hidden>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-3 animate-pulse rounded-md bg-admin-surface-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
          />
        ))}
      </div>
    );
  }
  return <div aria-hidden className={`animate-pulse rounded-md bg-admin-surface-3 ${className}`} />;
}

export function Spinner({ size = 16, className = '' }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border-2 border-admin-border border-t-admin-accent ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-[13px] text-admin-text-muted">
      <Spinner size={14} />
      {label}
    </div>
  );
}
