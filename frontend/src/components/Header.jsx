import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, Search, ShoppingBag, User } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import OfferBar from './OfferBar';
import MegaMenu from './header/MegaMenu';
import MegaPanel from './header/MegaPanel';
import MobileDrawer from './header/MobileDrawer';
import { useCmsNav } from '../lib/useCmsNav';
import useHeaderScroll from './header/useHeaderScroll';
import SearchPanel from './search/SearchPanel';

/* ============================================================================
 * HUSHAE header — Calvin Klein reference (client HTML/CSS).
 *
 *   · white bar, border-bottom #e5e5e5, height 70px, max-width 1600px
 *   · logo LEFT (28px, weight 400, letter-spacing -0.5px)
 *   · nav CENTER: Underwear · Women (mega) · Men (mega) · Collection · Sale
 *   · nav links 13px / 0.2px tracking / hover underline
 *   · icons RIGHT: Search · Account · Wishlist · Bag (20px, stroke 1.8)
 *   · mega menu: promo card + FEATURED + category columns
 *   · mobile (lg): nav hidden, hamburger + drawer
 *
 * Functionality preserved: cart drawer, wishlist, auth, search panel,
 * sticky-on-scroll, announcement bar tuck.
 * ========================================================================== */

const clamp = (v, lo, hi, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};

export default function Header() {
  const { cartCount, wishlist, auth, setDrawerOpen, settings } = useApp();
  const [cats, setCats] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCfg, setSearchCfg] = useState(null);

  const loc = useLocation();
  const burgerRef = useRef(null);
  const searchBtnRef = useRef(null);

  const isHome = loc.pathname === '/';
  const { past, reveal } = useHeaderScroll({ enableHide: false, revealAfter: 10 });
  const [hovered, setHovered] = useState(false);
  const [mega, setMega] = useState(null);
  /* ghost = transparent over hero (white text). Turns solid on scroll OR on
     hover — CK reference has both `.ck-header:hover` and `.ck-header.scrolled`. */
  const ghost = isHome && !past && !hovered;

  useEffect(() => { api('/categories').then((d) => setCats(d.categories)).catch(() => {}); }, []);
  useEffect(() => {
    if (!searchOpen || searchCfg) return;
    api('/search/config').then(setSearchCfg).catch(() => setSearchCfg({}));
  }, [searchOpen, searchCfg]);
  useEffect(() => { if (searchOpen || mobileOpen) reveal(); }, [searchOpen, mobileOpen, reveal]);
  useEffect(() => { setMobileOpen(false); setSearchOpen(false); setMega(null); }, [loc.pathname]);

  const wCats = useMemo(() => cats.filter((c) => c.gender === 'women'), [cats]);
  const mCats = useMemo(() => cats.filter((c) => c.gender === 'men'), [cats]);

  /* ── Menu — admin-editable, default = CK reference nav ─────────────────── */
  const hdr = settings?.header || {};
  const baseMenu = useMemo(() => (
    Array.isArray(hdr.menu) && hdr.menu.length ? hdr.menu : [
      { label: 'Underwear', href: '/shop' },
      { label: 'Women', href: '/women', dropdown: 'women' },
      { label: 'Men', href: '/men', dropdown: 'men' },
      { label: 'Collection', href: '/collection/new-arrivals' },
      { label: 'Sale', href: '/sale' },
    ]
  ), [hdr.menu]);

  const cmsNav = useCmsNav();
  const cmsHeaderKey = JSON.stringify(cmsNav.header || []);
  const menu = useMemo(() => {
    let links = [];
    try { links = JSON.parse(cmsHeaderKey); } catch { links = []; }
    if (!links.length) return baseMenu;
    const existing = new Set(baseMenu.map((m) => String(m?.href || '').replace(/\/+$/, '')));
    const fresh = links
      .filter((l) => !existing.has(`/${l.slug}`))
      .map((l) => ({ label: l.label, href: `/${l.slug}` }));
    if (!fresh.length) return baseMenu;
    return [...baseMenu, ...fresh];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmsHeaderKey, baseMenu]);

  const deskH = clamp(hdr.height, 40, 90, 65);
  const navSize = clamp(hdr.navSize, 11, 16, 13);
  const navGap = clamp(hdr.navGap, 16, 64, 32);
  const hairline = hdr.border !== false;

  const showSearch = hdr.showSearch !== false;
  const showWishlist = hdr.showWishlist !== false;
  const showAccount = hdr.showAccount !== false;
  const showCart = hdr.showCart !== false;


  const COLLECTIONS = useMemo(() => ([
    { label: 'New Arrivals', href: '/new' },
    { label: 'Best Sellers', href: '/best', bold: true },
    { label: 'The Collection', href: '/collection/new-arrivals', bold: true },
    { label: 'Sale', href: '/sale', bold: true },
  ]), []);

  const linkCls = useMemo(() => ({ isActive }) => (
    /* CK hover underline — inset 2px, white over hero, black when scrolled */
    `inline-block whitespace-nowrap px-1 py-[22px] text-[13px] font-normal tracking-[0.006em] transition-colors duration-300 ${
      ghost ? 'text-white' : 'text-black'
    } ${
      isActive
        ? (ghost ? 'shadow-[inset_0_-2px_0_0_#ffffff]' : 'shadow-[inset_0_-2px_0_0_#000000]')
        : (ghost ? 'hover:shadow-[inset_0_-2px_0_0_#ffffff]' : 'hover:shadow-[inset_0_-2px_0_0_#000000]')
    }`
  ), [ghost]);

  const navStyle = useMemo(
    () => ({ fontSize: `${navSize}px`, letterSpacing: '0.006em' }),
    [navSize],
  );

  const iconBtn = `grid h-10 w-10 place-items-center transition-colors duration-300 hover:opacity-60 ${ghost ? 'text-white' : 'text-black'}`;
  const dot = `absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${ghost ? 'bg-white' : 'bg-black'}`;

  return (
    <>
      {!isHome && <OfferBar />}

      <div
        className={`${isHome ? 'fixed inset-x-0 top-0' : 'sticky top-0'} z-40`}
      >
        {isHome && <OfferBar hideOnScroll />}
        <header
          data-header
          style={{ '--hdr-h': `${deskH}px` }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { setHovered(false); setMega(null); }}
          className={`relative border-b transition-[background-color,border-color,top,box-shadow] duration-300 ${
            ghost
              ? 'border-transparent bg-transparent text-white'
              : `border-[#e5e5e5] bg-white text-black shadow-[0_2px_10px_rgba(0,0,0,0.03)] ${hairline ? '' : 'border-transparent'}`
          }`}
        >
          <div className="flex h-11 w-full items-center justify-between px-5 md:px-8 lg:h-[var(--hdr-h)] lg:px-[45px]">
            {/* Burger — mobile only */}
            <button
              ref={burgerRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className={`-ml-2 grid h-10 w-10 shrink-0 place-items-center lg:hidden ${iconBtn}`}
            >
              <Menu size={20} strokeWidth={1.6} aria-hidden="true" />
            </button>

            {/* Logo — LEFT (CK reference) */}
            <Link to="/" aria-label="HUSHAE — home" className={`mr-8 text-[24px] font-medium uppercase leading-none tracking-[0.04em] transition-colors duration-300 ${ghost ? "text-white" : "text-black"}`}>
              HUSHAE
            </Link>

            {/* Nav — center */}
            <nav
              data-section="header.menu"
              aria-label="Main"
              style={{ gap: `${navGap}px` }}
              className="hidden items-center lg:flex"
            >
              {menu.filter((m) => m && m.label).map((m, i) => (
                m.dropdown === 'women' || m.dropdown === 'men' ? (
                  <MegaMenu
                    key={`${m.label}-${i}`}
                    label={m.label}
                    to={m.href || '/'}
                    linkCls={linkCls}
                    navStyle={navStyle}
                    active={mega === m.dropdown}
                    onOpen={() => setMega(m.dropdown)}
                    onClose={() => setMega(null)}
                  />
                ) : (
                  <NavLink key={`${m.label}-${i}`} to={m.href || '/'} style={navStyle}
                    className={({ isActive }) => linkCls({ isActive })}>
                    {m.label}
                  </NavLink>
                )
              ))}
            </nav>

            {/* Icons — right */}
            <div data-section="header.icons" className="flex shrink-0 items-center gap-[18px]">
              {showSearch && (
                <button
                  ref={searchBtnRef}
                  type="button"
                  onClick={() => setSearchOpen((s) => !s)}
                  aria-label={searchOpen ? 'Close search' : 'Search products'}
                  aria-expanded={searchOpen}
                  aria-controls="header-search"
                  className={iconBtn}
                >
                  <Search size={20} strokeWidth={1.6} aria-hidden="true" />
                </button>
              )}
              {showWishlist && (
                <Link to="/wishlist" aria-label={wishlist.length ? `Wishlist, ${wishlist.length} saved` : 'Wishlist'}
                  className={`relative hidden lg:grid ${iconBtn}`}>
                  <Heart size={20} strokeWidth={1.6} aria-hidden="true" />
                  {wishlist.length > 0 && <span className={dot} aria-hidden="true" />}
                </Link>
              )}
              {showAccount && (
                <Link to="/account" aria-label={auth ? 'Your account' : 'Sign in'}
                  className={`relative hidden lg:grid ${iconBtn}`}>
                  <User size={20} strokeWidth={1.6} aria-hidden="true" />
                  {auth && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-black" aria-hidden="true" />}
                </Link>
              )}
              {showCart && (
                <button type="button" onClick={() => setDrawerOpen(true)}
                  aria-label={cartCount ? `Open bag, ${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Open bag'}
                  className={`relative ${iconBtn}`}>
                  <ShoppingBag size={20} strokeWidth={1.6} aria-hidden="true" />
                  {cartCount > 0 && <span className={dot} aria-hidden="true" />}
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {searchOpen && (
              <motion.div
                key="search"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <SearchPanel
                  cfg={searchCfg}
                  open={searchOpen}
                  onClose={() => { setSearchOpen(false); searchBtnRef.current?.focus(); }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Full-width mega dropdown — direct child of header (reference v2) */}
          <MegaPanel
            open={mega}
            cats={mega === 'men' ? mCats : wCats}
            collections={COLLECTIONS}
            onClose={() => setMega(null)}
          />
        </header>
      </div>

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        menu={menu}
        wCats={wCats}
        mCats={mCats}
        storeName={settings?.storeName || 'HUSHAE'}
        returnFocusTo={burgerRef}
      />
    </>
  );
}
