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
import SearchPanel from './search/SearchPanel';

/* ============================================================================
 * HUSHAE header — CALVIN KLEIN reference (exact client spec).
 *
 *   · fixed top-0 z-50, max-w-[1600px] px-6 md:px-12
 *   · transparent text-black py-5 at top; on scroll (>20px) -> solid WHITE
 *     bg, text-black, shadow-sm, border-b neutral-200, py-4
 *   · logo LEFT — 22/26px normal uppercase tracking 0.18em (HUSHAÈ)
 *   · nav CENTER — 12px medium UPPERCASE tracking 0.15em, gap-8,
 *     Sale link in red, chevron on dropdown items (Women / Men / Sale)
 *   · icons RIGHT — Search · Wishlist · Account · Bag (20px, stroke 1.5) +
 *     real cart count badge (CK pill)
 *   · dropdowns: Women/Men/Sale open the full-width mega panel
 *   · mobile (lg): nav hidden, hamburger + drawer
 * Functionality preserved: cart drawer, wishlist, auth, search panel, mega
 * menus, announcement bar (OfferBar), CMS-driven menu.
 * ========================================================================== */

export default function Header() {
  const { cartCount, wishlist, auth, setDrawerOpen, settings } = useApp();
  const [cats, setCats] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCfg, setSearchCfg] = useState(null);
  const [mega, setMega] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loc = useLocation();
  const burgerRef = useRef(null);
  const searchBtnRef = useRef(null);

  useEffect(() => { api('/categories').then((d) => setCats(d.categories)).catch(() => {}); }, []);
  useEffect(() => {
    if (!searchOpen || searchCfg) return;
    api('/search/config').then(setSearchCfg).catch(() => setSearchCfg({}));
  }, [searchOpen, searchCfg]);
  useEffect(() => { setMobileOpen(false); setSearchOpen(false); setMega(null); }, [loc.pathname]);

  const wCats = useMemo(() => cats.filter((c) => c.gender === 'women'), [cats]);
  const mCats = useMemo(() => cats.filter((c) => c.gender === 'men'), [cats]);

  /* ── Menu — admin-editable, default = reference nav (7 items) ─────────── */
  const hdr = settings?.header || {};
  const baseMenu = useMemo(() => (
    Array.isArray(hdr.menu) && hdr.menu.length ? hdr.menu : [
      { label: 'Women', href: '/women', dropdown: 'women' },
      { label: 'Men', href: '/men', dropdown: 'men' },
      { label: 'New Arrivals', href: '/new' },
      { label: 'Best Sellers', href: '/best' },
      { label: 'Sale', href: '/sale', dropdown: 'sale' },
      { label: 'Fit Finder', href: '/fit-finder' },
      { label: 'Track Order', href: '/track' },
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

  /* CK nav-link style — 12px medium uppercase tracking 0.15em; Sale stays red */
  const linkCls = useMemo(() => ({ isActive }, label = '') => {
    const base = 'inline-flex items-center gap-1 font-sans text-[12px] font-medium uppercase tracking-[0.15em] transition-colors duration-200';
    const isSale = String(label || '').toLowerCase() === 'sale';
    const color = isSale ? ' text-red-600 hover:text-red-500' : ' text-[#111111] hover:text-neutral-500';
    return base + color;
  }, []);

  const navStyle = useMemo(() => ({ fontSize: '12px', letterSpacing: '0.15em' }), []);

  const iconBtn = 'grid h-10 w-10 place-items-center transition-opacity duration-200 hover:opacity-60';

  return (
    <>
      <header
        data-header
        className={`fixed left-0 top-0 z-50 w-full !m-0 !p-0 transition-all duration-300 ease-in-out ${
          isScrolled
            ? 'bg-white text-black shadow-sm border-b border-neutral-200'
            : 'bg-transparent text-black'
        }`}
        onMouseLeave={() => setMega(null)}
      >
        {/* Announcement bar — hidden on the PDP per the CK reference
            (Requirement 2: announcement bar hidden on product page) */}
        {!loc.pathname.startsWith('/product/') && <OfferBar />}

        {/* CK reference row — py-5 transparent / py-4 scrolled */}
        <div className={`mx-auto flex max-w-[1600px] items-center justify-between gap-8 px-6 transition-all duration-300 ease-in-out md:px-12 ${isScrolled ? 'py-4' : 'py-5'}`}>
          {/* Burger — mobile only */}
          <button
            ref={burgerRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="-ml-2 grid h-10 w-10 shrink-0 place-items-center text-[#111111] transition-colors duration-300 lg:hidden"
          >
            <Menu size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>

          {/* Logo — LEFT (CK: 22/26px, normal, tracking 0.18em, uppercase) */}
          <Link to="/" aria-label="HUSHAE — home" className="flex-shrink-0 font-display text-[22px] font-normal uppercase tracking-[0.18em] text-[#111111] transition-colors duration-300 md:text-[26px]">
            HUSHAÈ
          </Link>

          {/* Nav — CENTER */}
          <nav
            data-section="header.menu"
            aria-label="Main"
            className="hidden flex-1 items-center justify-center gap-8 lg:flex"
          >
            {menu.filter((m) => m && m.label).map((m, i) => {
              const dd = m.dropdown || (String(m.label).toLowerCase() === 'sale' ? 'sale' : '');
              return ['women', 'men', 'sale'].includes(dd) ? (
                <MegaMenu
                  key={`${m.label}-${i}`}
                  label={m.label}
                  to={m.href || '/'}
                  linkCls={(o) => linkCls(o, m.label)}
                  navStyle={navStyle}
                  active={mega === dd}
                  onOpen={() => setMega(dd)}
                  onClose={() => setMega(null)}
                />
              ) : (
                <NavLink key={`${m.label}-${i}`} to={m.href || '/'} style={navStyle}
                  className={({ isActive }) => linkCls({ isActive }, m.label)}>
                  {m.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Icons — RIGHT */}
          <div data-section="header.icons" className="flex shrink-0 items-center gap-6 text-[#111111]">
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
                <Search size={20} strokeWidth={1.5} aria-hidden="true" />
              </button>
            )}
            {showWishlist && (
              <Link to="/wishlist" aria-label={wishlist.length ? `Wishlist, ${wishlist.length} saved` : 'Wishlist'}
                className={`${iconBtn} hidden sm:grid`}>
                <Heart size={20} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            )}
            {showAccount && (
              <Link to="/account" aria-label={auth ? 'Your account' : 'Sign in'}
                className={`${iconBtn} hidden sm:grid`}>
                <User size={20} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            )}
            {showCart && (
              <button type="button" onClick={() => setDrawerOpen(true)}
                aria-label={cartCount ? `Open bag, ${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Open bag'}
                className={`relative ${iconBtn}`}>
                <ShoppingBag size={20} strokeWidth={1.5} aria-hidden="true" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-medium text-white">
                    {cartCount}
                  </span>
                )}
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

        {/* Full-width mega dropdown — direct child of header */}
        <MegaPanel
          open={mega}
          cats={mega === 'men' ? mCats : wCats}
          collections={COLLECTIONS}
          onClose={() => setMega(null)}
        />
      </header>

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
