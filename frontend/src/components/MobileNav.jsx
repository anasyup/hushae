import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Heart, Home as HomeIcon, ShoppingBag, Sparkles, Store, User } from 'lucide-react';
import { useApp } from '../store/AppContext';

/*
 * MobileNav — sticky bottom navigation for mobile viewports only.
 * Fashion-app style (Zara/CK/Uniqlo) with 5 tabs.
 * Renders NULL on desktop (md+) and admin routes.
 */
export default function MobileNav() {
  const loc = useLocation();
  const { cartCount, wishlist, setDrawerOpen } = useApp();
  const navRef = useRef(null);
  const isAdmin = loc.pathname.startsWith('/admin');

  /* Publish this bar's REAL height (including the iOS safe-area inset) as
     --nav-h so every other bottom-docked element stacks on top of it instead
     of hard-coding 53px.

     MEASURED at 390px: the WhatsApp float sat at bottom-5 and overlapped this
     nav by 48x33px — the bubble covered the ACCOUNT tab. CompareTray already
     read --nav-h with a 53px fallback, but nothing ever SET it, so the
     fallback was doing all the work and was wrong on any device with a home
     indicator (iPhone X+ adds up to 34px of safe-area padding).

     Hooks must run before the admin early-return, so the effect guards on
     isAdmin rather than the component returning first. */
  useEffect(() => {
    const root = document.documentElement;
    if (isAdmin) { root.style.removeProperty('--nav-h'); return undefined; }
    const el = navRef.current;
    if (!el) return undefined;

    const publish = () => {
      /* Desktop hides the bar with `md:hidden`.
         NOT offsetParent: this element is position:fixed, and a fixed element
         reports offsetParent === null ALWAYS (its containing block is the
         viewport, not an ancestor box). Using it reported "hidden" on mobile
         too, so --nav-h published 0px and every bar that depends on it stayed
         exactly where it was. getComputedStyle().display is the honest test. */
      const hidden = getComputedStyle(el).display === 'none';
      root.style.setProperty('--nav-h', hidden ? '0px' : `${Math.round(el.getBoundingClientRect().height)}px`);
    };
    publish();

    let ro;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(publish); ro.observe(el); }
    window.addEventListener('resize', publish);
    window.addEventListener('orientationchange', publish);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', publish);
      window.removeEventListener('orientationchange', publish);
      root.style.removeProperty('--nav-h');
    };
  }, [isAdmin]);

  if (isAdmin) return null;

  /* Label was 10px (and 9.5px on Bag) — below the 11px floor for a primary
     navigation surface. Raised to 11px; the icons and 52px tap target are
     unchanged, so nothing reflows. */
  const cls = ({ isActive }) =>
    `flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium uppercase tracking-wider transition ${
      isActive ? 'text-charcoal' : 'text-smoke'
    }`;

  return (
    <>
      {/* spacer so content isn't hidden behind the fixed bar */}
      <div className="h-16 md:hidden" aria-hidden="true" />

      <nav
        ref={navRef}
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

          <NavLink to="/new" className={cls}>
            {({ isActive }) => (
              <>
                <Sparkles size={19} strokeWidth={isActive ? 2.1 : 1.7} />
                <span>New</span>
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
            className="flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-smoke transition"
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
