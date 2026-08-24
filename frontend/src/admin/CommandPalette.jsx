import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgePercent, BarChart3, FileText, Globe,
  LayoutTemplate, Megaphone, Package, PackagePlus, Search,
  Settings, ShoppingBag, Sparkles, Users,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';

/* ============================================================================
 * COMMAND PALETTE — Phase 5 Premium Rebuild
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
  const { auth } = useApp();
  const [q, setQ] = useState('');
  const [customerHits, setCustomerHits] = useState([]);
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setCustomerHits([]); return undefined; }
    const timer = setTimeout(() => {
      api(`/customers/search?q=${encodeURIComponent(term)}&limit=6`, { token: auth?.token, noCache: true })
        .then((data) => setCustomerHits((data.customers || []).map((customer) => ({
          id: `customer-${customer.id}`,
          label: customer.name || 'Unnamed customer',
          category: 'Customers', icon: Users,
          to: `/admin/customers/${customer.id}`,
          keywords: [customer.email, customer.phone, customer.whatsApp, customer.id].filter(Boolean),
          hint: `${customer.email || customer.phone || customer.id} · ${customer.metrics?.orders || 0} orders`,
        }))))
        .catch(() => setCustomerHits([]));
    }, 180);
    return () => clearTimeout(timer);
  }, [q, auth?.token]);

  const results = useMemo(() => {
    if (!q.trim()) return ITEMS.slice(0, 8);
    const term = q.toLowerCase();
    const staticItems = ITEMS.filter((item) => (
      item.label.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term) ||
      (item.keywords || []).join(' ').toLowerCase().includes(term)
    ));
    return [...customerHits, ...staticItems];
  }, [q, customerHits]);

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
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/20 backdrop-blur-sm pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg border border-[#EAEAEA] bg-white"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[#EAEAEA] px-5 py-4">
          <Search size={18} className="shrink-0 text-[#AAAAAA]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search anything…"
            className="w-full bg-transparent text-[15px] text-black outline-none placeholder:text-[#AAAAAA]"
          />
          <kbd className="hidden rounded border border-[#E0E0E0] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#999999] sm:inline">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="py-16 text-center">
              <Search size={24} className="mx-auto mb-3 text-[#DCDCDC]" />
              <p className="text-[13px] text-[#999999]">No results for "{q}"</p>
            </div>
          ) : (
            [...grouped.entries()].map(([cat, items]) => (
              <div key={cat}>
                <p className="px-5 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">{cat}</p>
                {items.map((item) => {
                  const active = flatItems.indexOf(item) === idx;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => run(item)}
                      onMouseEnter={() => setIdx(flatItems.indexOf(item))}
                      className={`flex w-full items-center gap-3.5 px-5 py-3 text-left transition-colors duration-100 ${active ? 'bg-[#F5F5F5]' : 'hover:bg-[#FAFAFA]'}`}
                    >
                      <Icon size={16} strokeWidth={1.5} className={active ? 'text-black' : 'text-[#AAAAAA]'} />
                      <span className={`flex-1 text-[14px] ${active ? 'font-medium text-black' : 'text-[#555555]'}`}>{item.label}</span>
                      <span className="max-w-[45%] truncate text-[11px] text-[#AAAAAA]">{item.hint || item.to}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-5 border-t border-[#EAEAEA] px-5 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#AAAAAA]">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
