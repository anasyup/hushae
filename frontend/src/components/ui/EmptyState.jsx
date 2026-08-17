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
  /* Render the title as a heading instead of a <p>.
     MEASURED: /rewards had ZERO <h1> at all three viewports, because for a
     signed-out visitor the whole page IS this component and the title was
     markup-flat. A page with no heading is a real SEO and screen-reader
     defect — a screen-reader user landing there gets no document outline.
     Opt-in rather than default: most callers (empty cart, empty wishlist,
     no search results) render BELOW a real page h1, and emitting a second
     one there would break the outline in the other direction. */
  as: As = 'p',
}) {
  return (
    <div className={`empty-state ${className}`}>
      {Icon && (
        <span className="empty-state-icon" aria-hidden="true">
          <Icon size={24} strokeWidth={1.6} />
        </span>
      )}
      <As className="mt-6 font-display text-h3">{title}</As>
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
