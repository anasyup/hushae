import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgePercent, BarChart3, Command, FileText, Globe,
  LayoutTemplate, Megaphone, Package, PackagePlus, Search,
  Settings, ShoppingBag, Sparkles, Store, Users,
} from 'lucide-react';

/* ============================================================================
 * COMMAND PALETTE — ⌘K from anywhere in admin.
 * Phase 4: fuzzy search across all admin pages + quick-create.
 * ========================================================================== */

const ITEMS = [
  { id: 'dashboard', label: 'Dashboard', category: 'Go to', icon: BarChart3, to: '/admin', keywords: ['home', 'overview'] },
  { id: 'orders', label: 'All orders', category: 'Go to', icon: ShoppingBag, to: '/admin/orders', keywords: ['sales'] },
  { id: 'products', label: 'Inventory', category: 'Go to', icon: Package, to: '/admin/products', keywords: ['catalog'] },
  { id: 'customers', label: 'Customers', category: 'Go to', icon: Users, to: '/admin/customers', keywords: ['buyers'] },
  { id: 'analytics', label: 'Analytics', category: 'Go to', icon: BarChart3, to: '/admin/analytics', keywords: ['stats'] },
  { id: 'finance', label: 'Finance & P&L', category: 'Go to', icon: BarChart3, to: '/admin/finance', keywords: ['profit', 'money'] },
  { id: 'theme', label: 'Theme Editor', category: 'Go to', icon: LayoutTemplate, to: '/admin/theme', keywords: ['design', 'visual'] },
  { id: 'settings', label: 'Settings Hub', category: 'Go to', icon: Settings, to: '/admin/settings', keywords: ['config'] },
  { id: 'cms', label: 'Pages', category: 'Go to', icon: FileText, to: '/admin/cms', keywords: ['content'] },
  { id: 'promotions', label: 'Promotions', category: 'Go to', icon: Megaphone, to: '/admin/promotions', keywords: ['sale'] },
  { id: 'discounts', label: 'Discounts', category: 'Go to', icon: BadgePercent, to: '/admin/discounts', keywords: ['coupon'] },
  { id: 'loyalty', label: 'Loyalty', category: 'Go to', icon: Sparkles, to: '/admin/loyalty', keywords: ['rewards'] },
  { id: 'store', label: 'View storefront', category: 'Go to', icon: Globe, to: '/', keywords: ['website', 'live'], external: true },
  { id: 'new-product', label: 'New product', category: 'Create', icon: PackagePlus, to: '/admin/products/new', keywords: ['add'] },
  { id: 'new-promotion', label: 'New promotion', category: 'Create', icon: Megaphone, to: '/admin/promotions/new', keywords: ['add', 'sale'] },
  { id: 'new-discount', label: 'New discount', category: 'Create', icon: BadgePercent, to: '/admin/discounts', keywords: ['add', 'coupon'] },
  { id: 'new-page', label: 'New page', category: 'Create', icon: FileText, to: '/admin/cms/new', keywords: ['add', 'content'] },
];

export default function CommandPalette({ onClose }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const results = useMemo(() => {
    if (!q.trim()) return ITEMS.slice(0, 8);
    const term = q.toLowerCase();
    return ITEMS.filter((item) => {
      return item.label.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        (item.keywords || []).join(' ').toLowerCase().includes(term);
    });
  }, [q]);

  useEffect(() => { setIdx(0); }, [results.length]);

  const grouped = useMemo(() => {
    const map = new Map();
    results.forEach((r) => {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category).push(r);
    });
    return map;
  }, [results]);

  const flatItems = [...grouped.values()].flat();

  const run = (item) => {
    if (item.external) { window.open(item.to, '_blank'); }
    else { navigate(item.to); }
    onClose();
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, flatItems.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter' && flatItems[idx]) { e.preventDefault(); run(flatItems[idx]); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[15vh]" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-4">
          <Search size={17} className="shrink-0 text-neutral-400" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Search admin… (type a page name or command)"
            className="w-full bg-transparent text-[12px] text-neutral-900 outline-none placeholder:text-neutral-400" />
          <kbd className="hidden items-center gap-0.5 rounded-md border border-neutral-300 bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-500 sm:flex"><Command size={10} />K</kbd>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="p-8 text-center text-[13px] text-neutral-500">No results for "{q}"</p>
          ) : (
            [...grouped.entries()].map(([cat, items]) => (
              <div key={cat} className="mb-1">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">{cat}</p>
                {items.map((item) => {
                  const active = flatItems.indexOf(item) === idx;
                  const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => run(item)} onMouseEnter={() => setIdx(flatItems.indexOf(item))}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${active ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}>
                      <Icon size={16} strokeWidth={1.8} className={active ? 'text-neutral-900' : 'text-neutral-500'} />
                      <span className="flex-1 text-[14px] font-medium text-neutral-900">{item.label}</span>
                      <span className="text-[11px] text-neutral-400">{item.to}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-4 border-t border-neutral-100 px-4 py-2.5">
          <span className="text-[10px] text-neutral-400"><kbd className="rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-500">↑↓</kbd> navigate</span>
          <span className="text-[10px] text-neutral-400"><kbd className="rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-500">↵</kbd> open</span>
          <span className="text-[10px] text-neutral-400"><kbd className="rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-500">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
