import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import Tx from './Tx';
import OfferBar from './OfferBar';

const Wordmark = () => (
  <Link to="/" className="select-none font-display text-xl md:text-2xl tracking-widest2 text-obsidian">
    V É L O U R A
  </Link>
);

export default function Header() {
  const { cartCount, wishlist, auth, setDrawerOpen, lang, setLang, settings } = useApp();
  const [cats, setCats] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const searchRef = useRef(null);

  useEffect(() => { api('/categories').then((d) => setCats(d.categories)).catch(() => {}); }, []);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  const wCats = cats.filter((c) => c.gender === 'women');
  const mCats = cats.filter((c) => c.gender === 'men');

  const linkCls = ({ isActive }) =>
    `relative text-[12px] font-semibold uppercase tracking-widest transition hover:text-obsidian ${isActive ? 'text-obsidian' : 'text-ash'}`;

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
      <OfferBar />

      <header className="sticky top-0 z-40 border-b border-line bg-alabaster/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <button className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Menu"><Menu size={20} /></button>
          <Wordmark />

          <nav className="hidden items-center gap-7 md:flex">
            <Drop label={<Tx k="women" />} to="/women" items={wCats} />
            <Drop label={<Tx k="men" />} to="/men" items={mCats} />
            <NavLink to="/new" className={linkCls}><Tx k="newArrivals" /></NavLink>
            <NavLink to="/best" className={linkCls}><Tx k="bestSellers" /></NavLink>
            <NavLink to="/sale" className={({ isActive }) => `${linkCls({ isActive })} !text-sagedeep`}><Tx k="sale" /></NavLink>
            <NavLink to="/fit-finder" className={linkCls}><Tx k="fitFinder" /></NavLink>
            <NavLink to="/track" className={linkCls}><Tx k="trackOrder" /></NavLink>
          </nav>

          <div className="flex items-center gap-1.5 md:gap-3">
            <button onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
              className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ash transition hover:text-obsidian ${lang === 'ur' ? 'font-urdu !text-sm' : ''}`}>
              {lang === 'en' ? 'اردو' : 'EN'}
            </button>
            <button onClick={() => setSearchOpen((s) => !s)} aria-label="Search" className="rounded-full p-2 text-obsidian transition hover:bg-satin/60"><Search size={19} /></button>
            <Link to="/wishlist" aria-label="Wishlist" className="relative rounded-full p-2 text-obsidian transition hover:bg-satin/60">
              <Heart size={19} />
              {wishlist.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-sage text-[9px] font-bold text-obsidian">{wishlist.length}</span>}
            </Link>
            <Link to="/account" aria-label="Account" className="relative rounded-full p-2 text-obsidian transition hover:bg-satin/60">
              <User size={19} />
              {auth && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sage" />}
            </Link>
            <button onClick={() => setDrawerOpen(true)} aria-label="Cart" className="relative rounded-full p-2 text-obsidian transition hover:bg-satin/60">
              <ShoppingBag size={19} />
              {cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-obsidian text-[9px] font-bold text-alabaster">{cartCount}</span>}
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
