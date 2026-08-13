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
 * HUSHAE header — transparent hover-white reference (exact client spec).
 *
 *   · fixed top-0 z-50, border-b border-transparent, max-w-[1600px] px-6
 *     md:px-12, py-4
 *   · ALWAYS transparent text-black; turns WHITE on hover (or when a mega
 *     panel is open) with border-b neutral-200 — no scroll-based change
 *   · logo LEFT — serif BOLD tracking-widest uppercase (HUSHAÈ)
 *   · nav CENTER — 12px medium UPPERCASE tracking 0.2em, gap-8,
 *     Sale link red, chevron on dropdown items (Women / Men / Sale)
 *   · utilities RIGHT — text links: Search · Account · Wishlist · Bag (n)
 *   · dropdowns: Women/Men/Sale open the full-width mega panel
 *   · mobile (md): nav hidden, hamburger + drawer
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

  /* Reference nav-link style — 12px medium uppercase tracking 0.2em; Sale red */
  const linkCls = useMemo(() => ({ isActive }, label = '') => {
    const base = 'inline-flex items-center gap-1 font-sans text-[12px] font-medium uppercase tracking-[0.2em] transition-colors duration-200';
    const isSale = String(label || '').toLowerCase() === 'sale';
    const color = isSale ? ' text-red-500 hover:text-red-600' : ' text-[#111111] hover:text-neutral-500';
    return base + color;
  }, []);

  const navStyle = useMemo(() => ({ fontSize: '12px', letterSpacing: '0.2em' }), []);

  return (
    <>
      <header
        data-header
        className={`fixed left-0 top-0 z-50 w-full !m-0 !p-0 border-b transition-colors duration-300 ease-in-out ${
          mega ? 'border-neutral-200 bg-white text-black' : 'border-transparent bg-transparent text-black hover:border-neutral-200 hover:bg-white'
        }`}
        onMouseLeave={() => setMega(null)}
      >
        {/* Announcement bar — hidden on the PDP per the earlier reference */}
        {!loc.pathname.startsWith('/product/') && <OfferBar />}

        {/* Reference row — transparent, white on hover, py-4 */}
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-8 px-6 py-4 md:px-12">
          {/* Burger — mobile only (nav shows from md) */}
          <button
            ref={burgerRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="-ml-2 grid h-10 w-10 shrink-0 place-items-center text-[#111111] transition-colors duration-300 md:hidden"
          >
            <Menu size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>

          {/* Logo — serif bold tracked caps (reference) */}
          <Link to="/" aria-label="HUSHAE — home" className="flex-shrink-0 font-serif text-xl font-bold uppercase tracking-widest text-[#111111] transition-colors duration-300">
            HUSHAÈ
          </Link>

          {/* Nav — CENTER (md+) */}
          <nav
            data-section="header.menu"
            aria-label="Main"
            className="hidden flex-1 items-center justify-center gap-8 md:flex"
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

          {/* Utility icons — icon buttons (reference) */}
          <div data-section="header.icons" className="flex shrink-0 items-center gap-5 text-[#111111]">
            {showSearch && (
              <button
                ref={searchBtnRef}
                type="button"
                onClick={() => setSearchOpen((s) => !s)}
                aria-label={searchOpen ? 'Close search' : 'Search products'}
                aria-expanded={searchOpen}
                aria-controls="header-search"
                className="transition-opacity duration-200 hover:opacity-60"
              >
                <Search size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            )}
            {showWishlist && (
              <Link to="/wishlist" aria-label={wishlist.length ? `Wishlist, ${wishlist.length} saved` : 'Wishlist'}
                className="transition-opacity duration-200 hover:opacity-60">
                <Heart size={16} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            )}
            {showAccount && (
              <Link to="/account" aria-label={auth ? 'Your account' : 'Sign in'}
                className="transition-opacity duration-200 hover:opacity-60">
                <User size={16} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            )}
            {showCart && (
              <button type="button" onClick={() => setDrawerOpen(true)}
                aria-label={cartCount ? `Open bag, ${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Open bag'}
                className="relative transition-opacity duration-200 hover:opacity-60">
                <ShoppingBag size={16} strokeWidth={1.5} aria-hidden="true" />
                <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white">
                  {cartCount}
                </span>
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
