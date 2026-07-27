import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import Tx from './Tx';
import OfferBar from './OfferBar';
import Wordmark from './Wordmark';

export default function Header() {
  const { cartCount, wishlist, auth, setDrawerOpen, settings } = useApp();
  const [cats, setCats] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const searchRef = useRef(null);

  // On the homepage the hero is edge-to-edge full-screen video/image.
  // We overlay the header on top of it (transparent), and only fill it in
  // once the user starts scrolling past the fold.
  const isHome = loc.pathname === '/';
  const heroOverlay = isHome && !scrolled;

  useEffect(() => { api('/categories').then((d) => setCats(d.categories)).catch(() => {}); }, []);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  useEffect(() => {
    if (!isHome) { setScrolled(true); return; }
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const wCats = cats.filter((c) => c.gender === 'women');
  const mCats = cats.filter((c) => c.gender === 'men');

  const linkCls = ({ isActive }) =>
    `relative text-[12px] font-semibold uppercase tracking-widest transition ${
      heroOverlay
        ? (isActive ? 'text-alabaster' : 'text-alabaster/80 hover:text-alabaster')
        : (isActive ? 'text-obsidian' : 'text-ash hover:text-obsidian')
    }`;

  const submitSearch = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    nav(`/shop?q=${encodeURIComponent(q.trim())}`);
    setSearchOpen(false); setQ(''); setMobileOpen(false);
  };

  const Drop = ({ label, to, items }) => (
    <div className="group relative">
      <NavLink to={to} className={linkCls}>{label}</NavLink>
      <div className="invisible absolute left-1/2 top-full z-40 -translate-x-1/2 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
        <div className="w-52 rounded-2xl border border-line bg-alabaster p-2 shadow-soft">
          {items.map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`} className="block rounded-xl px-4 py-2.5 text-sm text-ash transition hover:bg-satin/50 hover:text-obsidian">
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {!heroOverlay && <OfferBar />}

      <header className={`z-40 transition-colors duration-300 ${
        heroOverlay
          ? 'fixed inset-x-0 top-0 border-b border-transparent bg-transparent text-alabaster'
          : 'sticky top-0 border-b border-line bg-alabaster/95 text-obsidian backdrop-blur-md'
      }`}>
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 md:h-16 md:gap-4 md:px-8">
          <button className={`rounded-full p-1.5 -ml-1.5 md:hidden ${heroOverlay ? 'text-alabaster' : ''}`} onClick={() => setMobileOpen(true)} aria-label="Menu"><Menu size={22} /></button>
          <Wordmark forceColor={heroOverlay ? 'alabaster' : undefined} />

          <nav className="hidden items-center gap-7 md:flex">
            <Drop label={<Tx k="women" />} to="/women" items={wCats} />
            <Drop label={<Tx k="men" />} to="/men" items={mCats} />
            <NavLink to="/new" className={linkCls}><Tx k="newArrivals" /></NavLink>
            <NavLink to="/best" className={linkCls}><Tx k="bestSellers" /></NavLink>
            <NavLink to="/sale" className={({ isActive }) => `${linkCls({ isActive })} ${heroOverlay ? '' : '!text-sagedeep'}`}><Tx k="sale" /></NavLink>
            <NavLink to="/fit-finder" className={linkCls}><Tx k="fitFinder" /></NavLink>
            <NavLink to="/track" className={linkCls}><Tx k="trackOrder" /></NavLink>
          </nav>

          <div className={`flex items-center gap-0.5 md:gap-3 ${heroOverlay ? 'text-alabaster' : 'text-obsidian'}`}>
            <button onClick={() => setSearchOpen((s) => !s)} aria-label="Search" className={`rounded-full p-2 transition ${heroOverlay ? 'hover:bg-white/10' : 'hover:bg-satin/60'}`}><Search size={19} /></button>
            <Link to="/wishlist" aria-label="Wishlist" className={`relative hidden rounded-full p-2 transition md:inline-flex ${heroOverlay ? 'hover:bg-white/10' : 'hover:bg-satin/60'}`}>
              <Heart size={19} />
              {wishlist.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-sage text-[9px] font-bold text-obsidian">{wishlist.length}</span>}
            </Link>
            <Link to="/account" aria-label="Account" className={`relative hidden rounded-full p-2 transition md:inline-flex ${heroOverlay ? 'hover:bg-white/10' : 'hover:bg-satin/60'}`}>
              <User size={19} />
              {auth && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sage" />}
            </Link>
            <button onClick={() => setDrawerOpen(true)} aria-label="Cart" className={`relative rounded-full p-2 transition ${heroOverlay ? 'hover:bg-white/10' : 'hover:bg-satin/60'}`}>
              <ShoppingBag size={19} />
              {cartCount > 0 && <span className={`absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold ${heroOverlay ? 'bg-alabaster text-obsidian' : 'bg-obsidian text-alabaster'}`}>{cartCount}</span>}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.form onSubmit={submitSearch} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-line">
              <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
                <Search size={18} className="text-ash" />
                <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search bras, trunks, vests..." className="w-full bg-transparent text-sm outline-none placeholder:text-ash/60" />
                <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close"><X size={18} className="text-ash" /></button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile menu */}
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
                {[['/', 'home'], ['/new', 'newArrivals'], ['/best', 'bestSellers'], ['/sale', 'sale'], ['/fit-finder', 'fitFinder'], ['/track', 'trackOrder']].map(([to, k]) => (
                  <Link key={to} to={to} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold uppercase tracking-widest text-obsidian hover:bg-satin/50">
                    <Tx k={k} />
                  </Link>
                ))}
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
