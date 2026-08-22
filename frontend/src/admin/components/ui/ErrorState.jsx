/* ============================================================================
 * Admin UI — ErrorState
 * "Something went wrong" + recovery action. Never show blank content.
 * ========================================================================== */

import { AlertTriangle } from 'lucide-react';
import Button from './Button';

export default function ErrorState({ title = 'Something went wrong', description = "We couldn't load this information.", onRetry, className = '' }) {
  return (
    <div role="alert" className={`grid place-items-center px-6 py-14 text-center ${className}`}>
      <div className="grid h-12 w-12 place-items-center rounded-[10px] border border-admin-border bg-admin-danger/10 text-admin-danger">
        <AlertTriangle size={20} strokeWidth={1.6} />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-admin-text">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-admin-text-muted">{description}</p>}
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
