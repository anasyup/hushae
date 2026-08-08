import { NavLink, useLocation } from 'react-router-dom';
import { Heart, Home as HomeIcon, ShoppingBag, User, Store } from 'lucide-react';
import { useApp } from '../store/AppContext';

/*
 * MobileNav — sticky bottom navigation for mobile viewports only.
 * Fashion-app style (Zara/CK/Uniqlo) with 5 tabs.
 * Renders NULL on desktop (md+) and admin routes.
 */
export default function MobileNav() {
  const loc = useLocation();
  const { cartCount, wishlist, setDrawerOpen } = useApp();

  if (loc.pathname.startsWith('/admin')) return null;

  const cls = ({ isActive }) =>
    `flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium uppercase tracking-wider transition ${
      isActive ? 'text-charcoal' : 'text-smoke'
    }`;

  return (
    <>
      {/* spacer so content isn't hidden behind the fixed bar */}
      <div className="h-16 md:hidden" aria-hidden="true" />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-alabaster/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Primary mobile navigation"
      >
        <div className="flex items-stretch">
          <NavLink to="/" end className={cls}>
            {({ isActive }) => (
              <>
                <HomeIcon size={19} strokeWidth={isActive ? 2.1 : 1.7} />
                <span>Home</span>
              </>
            )}
          </NavLink>

          <NavLink to="/shop" className={cls}>
            {({ isActive }) => (
              <>
                <Store size={19} strokeWidth={isActive ? 2.1 : 1.7} />
                <span>Shop</span>
              </>
            )}
          </NavLink>

          <NavLink to="/wishlist" className={cls}>
            {({ isActive }) => (
              <>
                <span className="relative">
                  <Heart size={19} strokeWidth={isActive ? 2.1 : 1.7} />
                  {wishlist.length > 0 && (
                    <span className="absolute -right-1.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-obsidian px-1 text-[8px] font-bold text-alabaster">
                      {wishlist.length}
                    </span>
                  )}
                </span>
                <span>Saved</span>
              </>
            )}
          </NavLink>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-ash transition"
            aria-label="Bag — open cart"
          >
            <span className="relative">
              <ShoppingBag size={19} strokeWidth={1.7} />
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-obsidian px-1 text-[8px] font-bold text-alabaster">
                  {cartCount}
                </span>
              )}
            </span>
            <span>Bag</span>
          </button>

          <NavLink to="/account" className={cls}>
            {({ isActive }) => (
              <>
                <User size={19} strokeWidth={isActive ? 2.1 : 1.7} />
                <span>Account</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </>
  );
}
