import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { MARKETS, loadMarket, saveMarket } from '../lib/market';

export default function CountrySelector({ compact = false, onChange }) {
  const [market, setMarket] = useState(loadMarket);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const select = (code) => {
    const m = MARKETS[code];
    if (!m) return;
    setMarket(m);
    saveMarket(code);
    setOpen(false);
    onChange?.(m);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.10em] hover:opacity-70 text-obsidian">
        {compact ? <><Globe size={14} />{market.code}</> : <><Globe size={14} />{market.name} · {market.currency}</>}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 border border-line bg-white shadow-sm">
          {Object.values(MARKETS).map((m) => (
            <button key={m.code} onClick={() => select(m.code)}
              className={`block w-full px-3 py-2 text-left text-[12px] ${market.code === m.code ? 'bg-obsidian text-white' : 'text-obsidian hover:bg-alabaster'}`}>
              {m.name} · {m.currency}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
