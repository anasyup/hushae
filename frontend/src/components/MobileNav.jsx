import { NavLink, useLocation } from 'react-router-dom';
import { Heart, Home as HomeIcon, ShoppingBag, User, Store } from 'lucide-react';
import { useApp } from '../store/AppContext';

/*
 * MobileNav — sticky bottom navigation for mobile viewports only.
 *
 * Dock lives at var(--z-mobilenav) so it always stacks above content and
 * below drawers/trays. Safe-area padding clears iOS home indicator.
 * Touch targets are all ≥ 48px; labels are real text (aria-label also set
 * on the Bag button which has no <a> wrapper).
 */
export default function MobileNav() {
  const loc = useLocation();
  const { cartCount, wishlist, setDrawerOpen } = useApp();

  // Admin routes have their own chrome and never show the storefront bottom bar.
  if (loc.pathname.startsWith('/admin')) return null;

  const linkCls = ({ isActive }) =>
    `group relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-wider
     transition-colors duration-base ease-standard
     ${isActive ? 'text-obsidian' : 'text-ash hover:text-obsidian'}`;

  const iconStroke = (active) => (active ? 2.1 : 1.6);

  const badgeCls = (variant = 'obsidian') => {
    const bg = variant === 'sage' ? 'bg-sage text-obsidian' : 'bg-obsidian text-alabaster';
    return `absolute -right-1.5 -top-1 grid h-3.5 min-w-[14px] place-items-center rounded-full px-1 text-[8px] font-bold leading-none tabular-nums ${bg}`;
  };

  return (
    <>
      {/* Spacer reserves exactly the dock height (+ safe area) so content
          cannot end up underneath. 52px min-height per link + ~2px padding ≈ 56px. */}
      <div className="h-[calc(56px+env(safe-area-inset-bottom))] md:hidden" aria-hidden="true" />

      <nav
        className="fixed inset-x-0 bottom-0 border-t border-line/80 bg-alabaster/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 md:hidden"
        style={{ zIndex: 'var(--z-mobilenav)' }}
        aria-label="Primary mobile"
      >
        <ul className="flex items-stretch">
          <li className="flex flex-1">
            <NavLink to="/" end className={linkCls}>
              {({ isActive }) => (
                <>
                  <HomeIcon size={19} strokeWidth={iconStroke(isActive)} aria-hidden="true" />
                  <span>Home</span>
                </>
              )}
            </NavLink>
          </li>

          <li className="flex flex-1">
            <NavLink to="/shop" className={linkCls}>
              {({ isActive }) => (
                <>
                  <Store size={19} strokeWidth={iconStroke(isActive)} aria-hidden="true" />
                  <span>Shop</span>
                </>
              )}
            </NavLink>
          </li>

          <li className="flex flex-1">
            <NavLink to="/wishlist" className={linkCls}>
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Heart size={19} strokeWidth={iconStroke(isActive)} aria-hidden="true" />
                    {wishlist.length > 0 && (
                      <span className={badgeCls('sage')} aria-hidden="true">{wishlist.length}</span>
                    )}
                  </span>
                  <span>Saved</span>
                </>
              )}
            </NavLink>
          </li>

          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-ash transition-colors duration-base hover:text-obsidian"
              aria-label={cartCount ? `Open bag, ${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Open bag'}
              aria-current={loc.pathname === '/cart' ? 'page' : undefined}
            >
              <span className="relative">
                <ShoppingBag size={19} strokeWidth={1.6} aria-hidden="true" />
                {cartCount > 0 && (
                  <span className={badgeCls('obsidian')} aria-hidden="true">{cartCount}</span>
                )}
              </span>
              <span>Bag</span>
            </button>
          </li>

          <li className="flex flex-1">
            <NavLink to="/account" className={linkCls}>
              {({ isActive }) => (
                <>
                  <User size={19} strokeWidth={iconStroke(isActive)} aria-hidden="true" />
                  <span>Account</span>
                </>
              )}
            </NavLink>
          </li>
        </ul>
      </nav>
    </>
  );
}
