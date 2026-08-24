/* ============================================================================
 * Admin UI — ErrorState (Phase 03-R)
 * Editorial error block: eyebrow, thin title, muted detail, flat retry.
 * ========================================================================== */

import { AlertTriangle } from 'lucide-react';
import Button from './Button';

export default function ErrorState({ title = 'Unable to load', description = "We couldn't load this information.", onRetry, className = '' }) {
  return (
    <div role="alert" className={`px-6 py-14 text-left ${className}`}>
      <AlertTriangle size={18} strokeWidth={1.4} className="text-[#555555]" aria-hidden />
      <p className="adm-eyebrow mt-5">Error</p>
      <h3 className="mt-2 text-[15px] font-medium tracking-tight text-black">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-[#999999]">{description}</p>}
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
