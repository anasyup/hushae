import { Link } from 'react-router-dom';

/**
 * The one empty state used across wishlist, cart, search, orders and reviews.
 *
 * The audit found seven hand-rolled versions with different icon sizes, type
 * scales and button placement. This keeps them identical without changing the
 * copy any page already shows.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,          // { label, to } — internal route
  onAction,        // or a handler, for in-page actions like "clear filters"
  actionLabel,
  secondary,       // { label, to }
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`}>
      {Icon && (
        <span className="empty-state-icon" aria-hidden="true">
          <Icon size={24} strokeWidth={1.6} />
        </span>
      )}
      <p className="mt-6 font-display text-h3">{title}</p>
      {description && <p className="mt-2 text-body-sm">{description}</p>}

      {(action || onAction) && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {action && <Link to={action.to} className="btn-primary">{action.label}</Link>}
          {onAction && <button type="button" onClick={onAction} className="btn-primary">{actionLabel}</button>}
          {secondary && <Link to={secondary.to} className="btn-ghost">{secondary.label}</Link>}
        </div>
      )}
    </div>
  );
}
