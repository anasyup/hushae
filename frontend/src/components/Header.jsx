import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import OfferBar from './OfferBar';
import Wordmark from './Wordmark';
import NavDropdown from './header/NavDropdown';
import MegaMenu from './header/MegaMenu';
import MobileDrawer from './header/MobileDrawer';
import { useCmsNav } from '../lib/useCmsNav';
import useHeaderScroll from './header/useHeaderScroll';
import useNavFit from './header/useNavFit';
import SearchPanel from './search/SearchPanel';

const clamp = (v, lo, hi, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};

/* ============================================================================
 * HUSHAE header.
 *
 * Layout: logo hard left · menu optically centred on the viewport · icons hard
 * right — the editorial register the brand is built on. Every value is
 * admin-editable from /admin/theme, and the menu auto-fits so a merchant can
 * add links without ever breaking the bar.
 *
 * ── Why the whole bar is one positioned group ───────────────────────────────
 * The announcement strip and the bar used to mount and re-position on scroll:
 * the strip appeared, and the header went fixed → sticky. That moved every
 * page 115px and measured CLS 0.4558 on the home page.
 *
 * Now the group's position is decided by the ROUTE, never by scroll:
 *   home  → fixed, so the full-bleed hero runs underneath it
 *   else  → sticky, so it occupies its own box in the flow
 * Scrolling only repaints colour, blur, border and shadow. Nothing in the
 * layout can move, so the header contributes no layout shift at all.
 * ========================================================================== */
export default function Header() {
  const { cartCount, wishlist, auth, setDrawerOpen, settings } = useApp();
  const [cats, setCats] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  /* Fetched once, lazily, the first time the shopper opens search — the
     storefront must not pay for this on every page load. */
  const [searchCfg, setSearchCfg] = useState(null);
  const [q, setQ] = useState('');

  const nav = useNavigate();
  const loc = useLocation();
  const navRef = useRef(null);
  const logoRef = useRef(null);
  const burgerRef = useRef(null);
  const searchBtnRef = useRef(null);

  const isHome = loc.pathname === '/';
  const { atTop, past, hidden, reveal } = useHeaderScroll({
    enableHide: !searchOpen && !mobileOpen,
  });

  // Over a full-bleed hero the bar paints transparent until the fold is passed.
  const overHero = isHome && !past;

  useEffect(() => { api('/categories').then((d) => setCats(d.categories)).catch(() => {}); }, []);
  useEffect(() => {
    if (!searchOpen || searchCfg) return;
    api('/search/config').then(setSearchCfg).catch(() => setSearchCfg({}));
  }, [searchOpen, searchCfg]);

  // A panel opening while the bar is tucked away would leave it off-screen.
  useEffect(() => { if (searchOpen || mobileOpen) reveal(); }, [searchOpen, mobileOpen, reveal]);

  // Close transient UI on navigation.
  useEffect(() => { setMobileOpen(false); setSearchOpen(false); }, [loc.pathname]);

  const wCats = useMemo(() => cats.filter((c) => c.gender === 'women'), [cats]);
  const mCats = useMemo(() => cats.filter((c) => c.gender === 'men'), [cats]);

  // ── Admin-editable config ────────────────────────────────────────────────
  const hdr = settings?.header || {};
  const baseMenu = useMemo(() => (
    Array.isArray(hdr.menu) && hdr.menu.length ? hdr.menu : [
      { label: 'Women', href: '/women', dropdown: 'women' },
      { label: 'Men', href: '/men', dropdown: 'men' },
      { label: 'New Arrivals', href: '/new' },
      { label: 'Best Sellers', href: '/best' },
      { label: 'Sale', href: '/sale', highlight: true },
      { label: 'Fit Finder', href: '/fit-finder' },
      { label: 'Track Order', href: '/track' },
    ]
  ), [hdr.menu]);

  /* CMS pages the merchant ticked "show in the top menu", APPENDED to whatever
     the theme editor already defines. Never replacing it: the shop's own
     Women / Men / Sale links are the navigation, and a page is an addition.

     WHY THIS IS RISKIER THAN THE FOOTER, AND WHAT GUARDS IT
     `menu` feeds useNavFit(), which measures the rendered bar and shrinks the
     gap until the links fit. Changing the menu AFTER first paint therefore
     re-runs a measurement and can move the whole header — the exact class of
     bug that cost 0.5504 CLS in the footer this sprint. Two mitigations:
       · dependencies are SERIALISED strings, so the array identity only
         changes when the content genuinely does;
       · `baseMenu` is returned BY REFERENCE when there is nothing to add,
         which is the case on every shop that has not marked a page for the
         header — so the common path produces no new array and no re-measure.
     Verified by measuring CLS on the live header after deploy. */
  const cmsNav = useCmsNav();
  const cmsHeaderKey = JSON.stringify(cmsNav.header || []);
  const baseMenuKey = JSON.stringify(baseMenu);
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
  }, [cmsHeaderKey, baseMenuKey]);

  const boxed    = hdr.width === 'boxed';
  const deskH    = clamp(hdr.height, 56, 120, 80);
  const navSize  = clamp(hdr.navSize, 10, 18, 13);
  const navGap   = clamp(hdr.navGap, 12, 64, 34);
  const navUpper = hdr.navUppercase === true;
  const centred  = hdr.menuAlign !== 'left';
  const hairline = hdr.border !== false;

  const showSearch   = hdr.showSearch !== false;
  const showWishlist = hdr.showWishlist !== false;
  const showAccount  = hdr.showAccount !== false;
  const showCart     = hdr.showCart !== false;
  const iconCount = [showSearch, showWishlist, showAccount, showCart].filter(Boolean).length;

  const menuKey = useMemo(() => menu.map((m) => m && m.label).join('|'), [menu]);
  const { fitGap, flowLeft, collapsed } = useNavFit({
    navRef, logoRef, menuKey, navGap, navSize, navUpper, iconCount,
  });
  const gapPx = fitGap ?? navGap;

  const dropItems = useCallback(
    (kind) => (kind === 'women' ? wCats : kind === 'men' ? mCats : []),
    [wCats, mCats],
  );

  /* The mega menu's "Collections" rung. These are the shop's OWN existing
     routes — the same ones already in baseMenu — not invented destinations.
     Static, so it never causes a re-measure in useNavFit. */
  const COLLECTIONS = useMemo(() => ([
    { label: 'New Arrivals', href: '/new' },
    { label: 'Best Sellers', href: '/best' },
    { label: 'Sale', href: '/sale' },
  ]), []);

  const linkCls = useCallback(({ isActive }) => (
    `relative whitespace-nowrap py-1 transition-colors duration-base ease-standard after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:bg-current after:transition-transform after:duration-base after:ease-entrance ${
      isActive ? 'after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-100'
    } ${navUpper ? 'font-semibold uppercase' : 'font-medium'} ${
      overHero
        ? (isActive ? 'text-alabaster' : 'text-alabaster/85 hover:text-alabaster')
        : (isActive ? 'text-obsidian' : 'text-ink/80 hover:text-obsidian')
    }`
  ), [navUpper, overHero]);

  const navStyle = useMemo(
    () => ({ fontSize: `${navSize}px`, letterSpacing: navUpper ? '0.14em' : '0.005em' }),
    [navSize, navUpper],
  );

  const iconBtn = `btn-icon ${overHero ? 'text-alabaster hover:bg-white/10' : 'text-obsidian hover:bg-satin/60'}`;
  const badge = 'absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold leading-none tabular-nums';

  return (
    <>
      {/* Off the home page the strip sits in normal flow and scrolls away;
          only the bar below it sticks. It is unconditionally mounted, so its
          box never appears or disappears mid-scroll. */}
      {!isHome && <OfferBar />}

      <div
        className={`${isHome ? 'fixed inset-x-0 top-0' : 'sticky top-0'} z-40
          transition-transform duration-base ease-standard
          ${hidden ? '-translate-y-full' : 'translate-y-0'}`}
      >
        {/* On the home page the whole group is fixed — out of normal flow —
            so the strip can appear once the hero is passed without moving a
            single pixel of the page behind it. This is the specific reason
            the bar no longer switches between fixed and sticky. */}
        {isHome && !overHero && (
          <div className="animate-fadeUp">
            <OfferBar />
          </div>
        )}
        <header
          data-header
          style={{ '--hdr-h': `${deskH}px` }}
          className={`border-b transition-[background-color,border-color,box-shadow] duration-base ease-standard ${
            overHero
              ? 'on-dark border-transparent bg-transparent text-alabaster'
              : `bg-alabaster/85 text-obsidian backdrop-blur-xl backdrop-saturate-150 ${
                atTop ? 'border-transparent' : `${hairline ? 'border-line' : 'border-transparent'} shadow-e-1`
              }`
          }`}
        >
          <div className={`relative flex h-14 items-center px-4 md:px-6 lg:h-[var(--hdr-h)] lg:px-10 ${
            boxed ? 'mx-auto w-full max-w-7xl xl:max-w-[1360px] 2xl:max-w-[1560px] 3xl:max-w-shell' : 'w-full'
          }`}>

            <button
              ref={burgerRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className={`-ml-2 shrink-0 ${collapsed ? '' : 'lg:hidden'} ${iconBtn}`}
            >
              <Menu size={21} strokeWidth={1.7} aria-hidden="true" />
            </button>

            <span
              ref={logoRef}
              data-section="header.logo"
              className={`absolute left-1/2 -translate-x-1/2 ${collapsed ? '' : 'lg:static lg:translate-x-0'}`}
            >
              <Wordmark forceColor={overHero ? 'alabaster' : undefined} />
            </span>

            <nav
              ref={navRef}
              data-section="header.menu"
              aria-label="Main"
              style={{ gap: `${gapPx}px` }}
              className={`hidden items-center ${collapsed ? '' : 'lg:flex'} ${
                centred && !flowLeft ? 'absolute left-1/2 -translate-x-1/2' : 'ml-10'
              }`}
            >
              {menu.filter((m) => m && m.label).map((m, i) => (
                m.dropdown ? (
                  /* Women and Men get the editorial panel; any other dropdown a
                     merchant defines keeps the compact list, which is the right
                     shape for a short utility menu. */
                  (m.dropdown === 'women' || m.dropdown === 'men') ? (
                    <MegaMenu
                      key={`${m.label}-${i}`}
                      label={m.label}
                      to={m.href || '/'}
                      items={dropItems(m.dropdown)}
                      collections={COLLECTIONS}
                      linkCls={linkCls}
                      navStyle={navStyle}
                      onDark={overHero}
                    />
                  ) : (
                    <NavDropdown
                      key={`${m.label}-${i}`}
                      label={m.label}
                      to={m.href || '/'}
                      items={dropItems(m.dropdown)}
                      linkCls={linkCls}
                      navStyle={navStyle}
                      onDark={overHero}
                    />
                  )
                ) : (
                  <NavLink
                    key={`${m.label}-${i}`}
                    to={m.href || '/'}
                    style={navStyle}
                    className={({ isActive }) => `${linkCls({ isActive })} ${m.highlight && !overHero ? '!text-sagedeep' : ''}`}
                  >
                    {m.label}
                  </NavLink>
                )
              ))}
            </nav>

            <div
              data-section="header.icons"
              className={`ml-auto flex shrink-0 items-center gap-0.5 md:gap-1 ${overHero ? 'text-alabaster' : 'text-obsidian'}`}
            >
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
                  <Search size={19} strokeWidth={1.6} aria-hidden="true" />
                </button>
              )}

              {showWishlist && (
                <Link
                  to="/wishlist"
                  aria-label={wishlist.length ? `Wishlist, ${wishlist.length} saved` : 'Wishlist'}
                  className={`relative hidden ${collapsed ? '' : 'lg:grid'} ${iconBtn}`}
                >
                  <Heart size={19} strokeWidth={1.6} aria-hidden="true" />
                  {wishlist.length > 0 && (
                    <span className={`${badge} bg-sage text-obsidian`} aria-hidden="true">{wishlist.length}</span>
                  )}
                </Link>
              )}

              {showAccount && (
                <Link
                  to="/account"
                  aria-label={auth ? 'Your account' : 'Sign in'}
                  className={`relative hidden ${collapsed ? '' : 'lg:grid'} ${iconBtn}`}
                >
                  <User size={19} strokeWidth={1.6} aria-hidden="true" />
                  {auth && <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-sage" aria-hidden="true" />}
                </Link>
              )}

              {showCart && (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label={cartCount ? `Open bag, ${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Open bag'}
                  className={`relative -mr-2 md:mr-0 ${iconBtn}`}
                >
                  <ShoppingBag size={19} strokeWidth={1.6} aria-hidden="true" />
                  {cartCount > 0 && (
                    <span className={`${badge} ${overHero ? 'bg-alabaster text-obsidian' : 'bg-obsidian text-alabaster'}`} aria-hidden="true">
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
