/**
 * The single spinner. `label` is required for anything that blocks the user —
 * a bare spinning div tells a screen reader nothing.
 */
export default function Spinner({ size = 'md', label, className = '' }) {
  const cls = size === 'lg' ? 'spinner-lg' : 'spinner';
  return (
    <span
      className={`${cls} ${className}`}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    />
  );
}

/** Centred block spinner for a route or panel that is still loading. */
export function LoadingBlock({ label = 'Loading…', className = '' }) {
  return (
    <div className={`grid place-items-center py-16 ${className}`} role="status" aria-live="polite">
      <span className="spinner-lg text-ash" aria-hidden="true" />
      <span className="mt-3 text-body-sm">{label}</span>
    </div>
  );
}
