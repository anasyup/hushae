import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { pkr } from '../lib/format';

/* Global search overlay — live results as you type, 200ms debounce. */

export default function SearchOverlay({ onClose }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null); // null = initial, [] = no results
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const search = (val) => {
    setQ(val);
    clearTimeout(timer.current);
    if (val.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const d = await api(`/products?q=${encodeURIComponent(val.trim())}&limit=8`);
        setResults(d.products || []);
      } catch { setResults([]); }
      setLoading(false);
    }, 200);
  };

  const quickLinks = [
    { label: 'Women', to: '/women' },
    { label: 'Men', to: '/men' },
    { label: 'New Arrivals', to: '/new' },
    { label: 'Best Sellers', to: '/best' },
    { label: 'Sale', to: '/sale' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-white/95 backdrop-blur-sm pt-[12vh]" onClick={onClose}>
      <div className="w-full max-w-2xl px-4" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-line pb-3">
          <Search size={18} className="shrink-0 text-ash" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => search(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-transparent text-[18px] font-normal text-obsidian outline-none placeholder:text-ash"
            style={{ fontFamily: "'Family Klein', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
          />
          <button onClick={onClose} className="grid h-8 w-8 place-items-center text-ash hover:text-obsidian">
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {!q && results === null && (
            <div className="space-y-1">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-ash">Quick links</p>
              {quickLinks.map((l) => (
                <Link key={l.to} to={l.to} onClick={onClose}
                  className="flex items-center justify-between rounded px-3 py-2.5 text-[15px] text-obsidian hover:bg-alabaster">
                  {l.label} <ArrowRight size={14} className="text-ash" />
                </Link>
              ))}
            </div>
          )}

          {loading && (
            <p className="py-8 text-center text-[13px] text-ash">Searching...</p>
          )}

          {results && results.length === 0 && !loading && (
            <div className="py-10 text-center">
              <p className="text-[15px] text-obsidian">No results for "{q}"</p>
              <p className="mt-1 text-[13px] text-ash">Try a different term or browse categories.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {quickLinks.map((l) => (
                  <Link key={l.to} to={l.to} onClick={onClose}
                    className="border border-line px-4 py-2 text-[12px] font-medium uppercase tracking-[0.10em] text-obsidian hover:bg-alabaster">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-0.5">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-ash">{results.length} product{results.length === 1 ? '' : 's'}</p>
              {results.map((p) => (
                <Link key={p._id} to={`/product/${p.slug}`} onClick={onClose}
                  className="flex items-center gap-3 rounded px-3 py-2.5 hover:bg-alabaster">
                  <img src={p.images?.[0]?.url || p.image} alt="" className="h-14 w-11 shrink-0 object-cover bg-line" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium uppercase tracking-[0.04em] text-obsidian">{p.name}</p>
                    <p className="mt-0.5 text-[12px] text-ash tabular-nums">{pkr(p.price)}</p>
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-ash" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
