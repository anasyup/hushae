import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import OfferBar from './OfferBar';
import Wordmark from './Wordmark';

const clamp = (v, lo, hi, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};

export default function Header() {
  const { cartCount, wishlist, auth, setDrawerOpen, settings } = useApp();
  const [cats, setCats] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);   // past the hero fold (home only)
  const [atTop, setAtTop] = useState(true);          // very top of any page
  const [fitGap, setFitGap] = useState(null);        // auto-tightened link spacing
  const [flowLeft, setFlowLeft] = useState(false);   // centred menu ran out of room
  const [collapsed, setCollapsed] = useState(false); // too many links → hamburger
  const nav = useNavigate();
  const loc = useLocation();
  const searchRef = useRef(null);
  const navRef = useRef(null);
  const logoRef = useRef(null);
  const iconsRef = useRef(null);
  const contentRef = useRef(0);   // last good total width of the links

  // On the homepage the hero is edge-to-edge full-screen video/image.
  // We overlay the header on top of it (transparent), and only fill it in
  // once the user starts scrolling past the fold.
  const isHome = loc.pathname === '/';
  const heroOverlay = isHome && !scrolled;

  useEffect(() => { api('/categories').then((d) => setCats(d.categories)).catch(() => {}); }, []);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setAtTop(y <= 8);
      setScrolled(isHome ? y > 60 : true);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const wCats = cats.filter((c) => c.gender === 'women');
  const mCats = cats.filter((c) => c.gender === 'men');


  // ── Header config — every value below is admin-editable from /admin/theme ──
  const hdr = settings?.header || {};
  const menu = Array.isArray(hdr.menu) && hdr.menu.length ? hdr.menu : [
    { label: 'Women', href: '/women', dropdown: 'women' },
    { label: 'Men', href: '/men', dropdown: 'men' },
    { label: 'New Arrivals', href: '/new' },
    { label: 'Best Sellers', href: '/best' },
    { label: 'Sale', href: '/sale', highlight: true },
    { label: 'Fit Finder', href: '/fit-finder' },
    { label: 'Track Order', href: '/track' },
  ];
  const dropItems = (kind) => (kind === 'women' ? wCats : kind === 'men' ? mCats : []);

  // Layout knobs (defaults reproduce the editorial full-width look:
  // logo hard left · menu optically centred in the viewport · icons hard right)
  const boxed     = hdr.width === 'boxed';
  const deskH     = clamp(hdr.height, 56, 120, 80);
  const navSize   = clamp(hdr.navSize, 10, 18, 13);
  const navGap    = clamp(hdr.navGap, 12, 64, 34);
  const navUpper  = hdr.navUppercase === true;        // default = sentence case
  const centred   = hdr.menuAlign !== 'left';          // default = centred menu
  const hairline  = hdr.border !== false;              // hairline only once scrolled

  const showLine = hairline && !heroOverlay && !atTop;

  // ── Auto-fit ──────────────────────────────────────────────────────────────
  // The merchant can add as many links as they like. Rather than let a long
  // menu collide with the logo, we shrink the spacing first and, only if it
  // still cannot fit, fall back to the hamburger. Nothing to configure.
  const menuKey = menu.map((m) => m && m.label).join('|');
  useEffect(() => {
    contentRef.current = 0;
    const measure = () => {
      const el = navRef.current;
      if (!el || window.innerWidth < 1024) { setCollapsed(false); setFitGap(null); setFlowLeft(false); return; }
      const kids = [...el.children];
      if (kids.length < 2) { setFitGap(null); setCollapsed(false); setFlowLeft(false); return; }
      // Sum the links themselves so the reading never depends on the gap that
      // is currently applied — that self-reference was making it oscillate.
      // Once collapsed the bar is display:none and every width reads 0, so the
      // last good measurement is cached and reused; that makes it converge.
      const live = kids.reduce((sum, k) => sum + k.getBoundingClientRect().width, 0);
      if (live > 0) contentRef.current = live;
      const content = live > 0 ? live : contentRef.current;
      if (!content) return;
      const pad = 80;                                              // px-10 both sides
      // The icon row is measured from the settings, not the DOM: collapsing
      // hides two icons, which would otherwise shrink the reading and flip the
      // decision back — an endless loop.
      const iconsW = 12 + [hdr.showSearch, hdr.showWishlist, hdr.showAccount, hdr.showCart]
        .filter((f) => f !== false).length * 44;
      const logoW = logoRef.current?.offsetWidth || 0;
      const slots = kids.length - 1;

      // 1 · centred, at the merchant's spacing — the ideal
      const centreRoom = window.innerWidth - pad - Math.max(logoW, iconsW) * 2 - 48;
      if (content + slots * navGap <= centreRoom) { setFitGap(null); setFlowLeft(false); setCollapsed(false); return; }

      // 2 · centred, tightened spacing
      const gCentre = Math.floor((centreRoom - content) / slots);
      if (gCentre >= 18) { setFitGap(Math.min(navGap, gCentre)); setFlowLeft(false); setCollapsed(false); return; }

      // 3 · give up on centring — flow the menu next to the logo instead,
      //     which unlocks the whole empty half of the bar
      const flowRoom = window.innerWidth - pad - logoW - iconsW - 72;
      const gFlow = Math.floor((flowRoom - content) / slots);
      if (content + slots * navGap <= flowRoom) { setFitGap(null); setFlowLeft(true); setCollapsed(false); return; }
      if (gFlow >= 14) { setFitGap(Math.min(navGap, gFlow)); setFlowLeft(true); setCollapsed(false); return; }

      // 4 · genuinely too many links — hand it to the hamburger
      setFitGap(14); setFlowLeft(false); setCollapsed(true);
    };
    measure();
    const t = setTimeout(measure, 400);                            // after webfonts land
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuKey, navGap, navSize, navUpper, hdr.showSearch, hdr.showWishlist, hdr.showAccount, hdr.showCart]);

  const gapPx = fitGap ?? navGap;

  const linkCls = ({ isActive }) =>
    `relative whitespace-nowrap py-1 transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:bg-current after:transition-transform after:duration-300 ${
      isActive ? 'after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-100'
    } ${navUpper ? 'font-semibold uppercase' : 'font-medium'} ${
      heroOverlay
        ? (isActive ? 'text-alabaster' : 'text-alabaster/85 hover:text-alabaster')
        : (isActive ? 'text-obsidian' : 'text-ink/80 hover:text-obsidian')
    }`;

  const navStyle = { fontSize: `${navSize}px`, letterSpacing: navUpper ? '0.14em' : '0.005em' };

  const submitSearch = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    nav(`/shop?q=${encodeURIComponent(q.trim())}`);
    setSearchOpen(false); setQ(''); setMobileOpen(false);
  };

  const Drop = ({ label, to, items }) => (
    <div className="group relative">
      <NavLink to={to} className={linkCls} style={navStyle}>{label}</NavLink>
      <div className="invisible absolute left-1/2 top-full z-40 -translate-x-1/2 pt-5 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
        <div className="min-w-[13rem] rounded-2xl border border-line bg-alabaster p-2 shadow-soft">
          {items.map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`} className="block rounded-xl px-4 py-2.5 text-[13px] text-ash transition hover:bg-satin/50 hover:text-obsidian">
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  const iconBtn = `grid h-11 w-11 place-items-center rounded-full transition ${
    heroOverlay ? 'hover:bg-white/10' : 'hover:bg-satin/60'
  }`;

  return (
    <>
      {!heroOverlay && <OfferBar />}

      <header
        style={{ '--hdr-h': `${deskH}px` }}
        className={`z-40 transition-colors duration-300 ${
          heroOverlay
            ? 'fixed inset-x-0 top-0 border-b border-transparent bg-transparent text-alabaster'
            : `sticky top-0 border-b bg-alabaster/95 text-obsidian backdrop-blur-md ${showLine ? 'border-line' : 'border-transparent'}`
        }`}>
        <div className={`relative flex h-14 items-center px-4 md:px-6 lg:h-[var(--hdr-h)] lg:px-10 ${
          boxed ? 'mx-auto w-full max-w-7xl' : 'w-full'
        }`}>
          {/* Mobile: hamburger sits left, wordmark is optically centred. */}
          <button
            className={`-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${collapsed ? '' : 'lg:hidden'} ${heroOverlay ? 'text-alabaster hover:bg-white/10' : 'hover:bg-satin/60'}`}
            onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={22} strokeWidth={1.6} />
          </button>

          <span
            ref={logoRef}
            data-section="header.logo"
            className={`absolute left-1/2 -translate-x-1/2 ${collapsed ? '' : 'lg:static lg:translate-x-0'}`}>
            <Wordmark forceColor={heroOverlay ? 'alabaster' : undefined} />
          </span>

          {/* Desktop menu — absolutely centred on the viewport, like the big houses */}
          <nav
            ref={navRef}
            data-section="header.menu"
            style={{ gap: `${gapPx}px` }}
            className={`hidden items-center ${collapsed ? '' : 'lg:flex'} ${
              centred && !flowLeft ? 'absolute left-1/2 -translate-x-1/2' : 'ml-10'
            }`}>
            {menu.filter((m) => m && m.label).map((m, i) => (
              m.dropdown ? (
                <Drop key={i} label={m.label} to={m.href || '/'} items={dropItems(m.dropdown)} />
              ) : (
                <NavLink key={i} to={m.href || '/'} style={navStyle}
                  className={({ isActive }) => `${linkCls({ isActive })} ${m.highlight && !heroOverlay ? '!text-sagedeep' : ''}`}>
                  {m.label}
                </NavLink>
              )
            ))}
          </nav>

          <div ref={iconsRef} data-section="header.icons"
            className={`ml-auto flex shrink-0 items-center gap-0.5 md:gap-1 ${heroOverlay ? 'text-alabaster' : 'text-obsidian'}`}>
            {hdr.showSearch !== false && (
              <button onClick={() => setSearchOpen((s) => !s)} aria-label="Search" className={iconBtn}>
                <Search size={20} strokeWidth={1.5} />
              </button>
            )}
            {hdr.showWishlist !== false && (
              <Link to="/wishlist" aria-label="Wishlist" className={`relative hidden ${collapsed ? '' : 'lg:grid'} ${iconBtn}`}>
                <Heart size={20} strokeWidth={1.5} />
                {wishlist.length > 0 && <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-sage text-[9px] font-bold text-obsidian">{wishlist.length}</span>}
              </Link>
            )}
            {hdr.showAccount !== false && (
              <Link to="/account" aria-label="Account" className={`relative hidden ${collapsed ? '' : 'lg:grid'} ${iconBtn}`}>
                <User size={20} strokeWidth={1.5} />
                {auth && <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-sage" />}
              </Link>
            )}
            {hdr.showCart !== false && (
              <button onClick={() => setDrawerOpen(true)} aria-label="Cart" className={`relative -mr-2 md:mr-0 ${iconBtn}`}>
                <ShoppingBag size={20} strokeWidth={1.5} />
                {cartCount > 0 && <span className={`absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold ${heroOverlay ? 'bg-alabaster text-obsidian' : 'bg-obsidian text-alabaster'}`}>{cartCount}</span>}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.form onSubmit={submitSearch} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-line">
              <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
                <Search size={18} className="text-ash" strokeWidth={1.5} />
                <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search bras, trunks, vests..." className="w-full bg-transparent text-sm outline-none placeholder:text-ash/60" />
                <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close"><X size={18} className="text-ash" /></button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile / tablet menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-obsidian/30" onClick={() => setMobileOpen(false)}>
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.25 }}
              className="h-full w-[85%] max-w-xs overflow-y-auto bg-alabaster p-6" onClick={(e) => e.stopPropagation()}>
              <div className="mb-6 flex items-center justify-between">
                <Wordmark />
                <button onClick={() => setMobileOpen(false)} aria-label="Close"><X size={20} /></button>
              </div>
              <div className="space-y-1">
                {[['/', 'Home'], ...menu.filter((m) => m && m.label && !m.dropdown).map((m) => [m.href || '/', m.label])].map(([to, k]) => (
                  <Link key={to} to={to} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-obsidian hover:bg-satin/50">
                    {k}
                  </Link>
                ))}
                <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-obsidian hover:bg-satin/50">Wishlist</Link>
                <Link to="/account" onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-obsidian hover:bg-satin/50">Account</Link>
              </div>
              {[['Women', '/women', wCats], ['Men', '/men', mCats]].map(([g, to, list]) => (
                <div key={g} className="mt-6">
                  <Link to={to} onClick={() => setMobileOpen(false)} className="px-3 text-[11px] font-bold uppercase tracking-widest text-ash">{settings?.storeName} — {g}</Link>
                  {list.map((c) => (
                    <Link key={c.slug} to={`/category/${c.slug}`} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-obsidian hover:bg-satin/50">{c.name}</Link>
                  ))}
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
