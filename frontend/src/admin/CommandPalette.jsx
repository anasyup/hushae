import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgePercent, BarChart3, Command, FileText, Globe, LayoutTemplate,
  Megaphone, Package, PackagePlus, Search, Settings, ShoppingBag,
  Sparkles, Store, Users,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';

/* ============================================================================
 * COMMAND PALETTE — ⌘K. Two-tier results:
 *   1. REAL entities (Products / Orders / Customers) from GET /api/search
 *   2. Go-to pages + quick-create commands
 * Navigation targets are real routes only.
 * ========================================================================== */

const ITEMS = [
  { id: 'dashboard', label: 'Dashboard', category: 'Go to', icon: BarChart3, to: '/admin', keywords: ['home', 'overview'] },
  { id: 'orders', label: 'All orders', category: 'Go to', icon: ShoppingBag, to: '/admin/orders', keywords: ['sales'] },
  { id: 'products', label: 'Inventory', category: 'Go to', icon: Package, to: '/admin/products', keywords: ['catalog'] },
  { id: 'customers', label: 'Customers', category: 'Go to', icon: Users, to: '/admin/customers', keywords: ['buyers'] },
  { id: 'verification', label: 'Verification queue', category: 'Go to', icon: ShoppingBag, to: '/admin/verification-queue', keywords: ['pending', 'call'] },
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
  const { auth } = useApp();

  const [entities, setEntities] = useState({ products: [], orders: [], customers: [] });
  const [loading, setLoading] = useState(false);

  // Real entity search — debounced, only when the term is ≥ 2 chars.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setEntities({ products: [], orders: [], customers: [] }); return; }
    setLoading(true);
    const t = setTimeout(() => {
      api(`/search/admin?q=${encodeURIComponent(term)}`, { token: auth.token })
        .then((d) => setEntities({ products: d.products || [], orders: d.orders || [], customers: d.customers || [] }))
        .catch(() => setEntities({ products: [], orders: [], customers: [] }))
        .finally(() => setLoading(false));
    }, 180);
    return () => clearTimeout(t);
  }, [q, auth.token]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const navResults = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term ? ITEMS.filter((i) =>
      i.label.toLowerCase().includes(term) || i.category.toLowerCase().includes(term) || (i.keywords || []).join(' ').toLowerCase().includes(term))
      : ITEMS.slice(0, 8);
    return base;
  }, [q]);

  /* Build the flat ordered list: entity groups first (when searching), then nav. */
  const flat = useMemo(() => {
    const list = [];
    const term = q.trim().toLowerCase();
    if (term.length >= 2) {
      entities.products.forEach((p) => list.push({ kind: 'product', id: p._id, label: p.name, sub: p.sku, to: `/admin/products/${p._id}` }));
      entities.orders.forEach((o) => list.push({ kind: 'order', id: o._id, label: o.orderNumber, sub: `${o.customerInfo?.name} · ${pkr(o.total)}`, to: `/admin/orders/${o._id}` }));
      entities.customers.forEach((c) => list.push({ kind: 'customer', id: c._id, label: c.name || c.email, sub: c.phone || c.email, to: '/admin/customers' }));
    }
    navResults.forEach((i) => list.push({ kind: 'nav', id: i.id, label: i.label, sub: i.to, to: i.to, external: i.external, category: i.category, icon: i.icon }));
    return list;
  }, [entities, navResults, q]);

  useEffect(() => { setIdx(0); }, [flat.length]);

  const run = (item) => {
    if (item.external) { window.open(item.to, '_blank'); }
    else { navigate(item.to); }
    onClose();
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, flat.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter' && flat[idx]) { e.preventDefault(); run(flat[idx]); }
  };

  const entityGroups = [];
  if (q.trim().length >= 2) {
    if (entities.products.length) entityGroups.push(['Products', entities.products.map((p) => ({ id: p._id, label: p.name, sub: p.sku || p.slug, to: `/admin/products/${p._id}` }))]);
    if (entities.orders.length) entityGroups.push(['Orders', entities.orders.map((o) => ({ id: o._id, label: o.orderNumber, sub: `${o.customerInfo?.name || ''} · ${pkr(o.total)}`, to: `/admin/orders/${o._id}` }))]);
    if (entities.customers.length) entityGroups.push(['Customers', entities.customers.map((c) => ({ id: c._id, label: c.name || c.email, sub: c.phone || c.email, to: '/admin/customers' }))]);
  }

  const navGroups = useMemo(() => {
    const map = new Map();
    navResults.forEach((r) => {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category).push({ id: r.id, label: r.label, sub: r.to, to: r.to, external: r.external, icon: r.icon });
    });
    return map;
  }, [navResults]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[15vh]" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-xl shadow-2xl ring-1" style={{ background: 'var(--px-bg-card)', boxShadow: 'var(--px-shadow-pop)', borderColor: 'var(--px-border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b px-4 py-3.5" style={{ borderColor: 'var(--px-border)' }}>
          <Search size={16} className="shrink-0" style={{ color: 'var(--px-muted)' }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Search orders, products, customers… (or a page name)"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--px-faint)]" style={{ color: 'var(--px-ink)' }} />
          {loading && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2" style={{ borderColor: 'var(--px-border-strong)', borderTopColor: 'var(--px-accent)' }} aria-hidden="true" />}
          <kbd className="hidden items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold sm:flex" style={{ borderColor: 'var(--px-border-strong)', color: 'var(--px-muted)' }}><Command size={10} />K</kbd>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-1.5">
          {flat.length === 0 && !loading ? (
            <p className="p-8 text-center text-[13px]" style={{ color: 'var(--px-muted)' }}>No results for “{q}”</p>
          ) : (
            <>
              {entityGroups.map(([cat, items]) => (
                <div key={cat} className="mb-1">
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--px-muted)' }}>{cat}</p>
                  {items.map((item) => {
                    const active = flat.findIndex((f) => f.id === item.id && f.to === item.to) === idx;
                    return (
                      <button key={item.id} onClick={() => run(item)} onMouseEnter={() => setIdx(flat.findIndex((f) => f.id === item.id && f.to === item.to))}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
                        style={{ background: active ? 'var(--px-accent-soft-bg)' : 'transparent' }}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium" style={{ color: active ? 'var(--px-accent-soft-text)' : 'var(--px-ink)' }}>{item.label}</span>
                          <span className="block truncate text-[11px]" style={{ color: 'var(--px-muted)' }}>{item.sub}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}

              {[...navGroups.entries()].map(([cat, items]) => (
                <div key={cat} className="mb-1">
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--px-muted)' }}>{cat}</p>
                  {items.map((item) => {
                    const active = flat.findIndex((f) => f.kind === 'nav' && f.id === item.id) === idx;
                    const Icon = item.icon;
                    return (
                      <button key={item.id} onClick={() => run(item)} onMouseEnter={() => setIdx(flat.findIndex((f) => f.kind === 'nav' && f.id === item.id))}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
                        style={{ background: active ? 'var(--px-accent-soft-bg)' : 'transparent' }}>
                        {Icon && <Icon size={15} strokeWidth={1.7} style={{ color: active ? 'var(--px-accent-soft-text)' : 'var(--px-muted)' }} />}
                        <span className="flex-1 text-[13px] font-medium" style={{ color: active ? 'var(--px-accent-soft-text)' : 'var(--px-secondary)' }}>{item.label}</span>
                        <span className="text-[11px]" style={{ color: 'var(--px-faint)' }}>{item.sub}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center gap-4 border-t px-4 py-2.5" style={{ borderColor: 'var(--px-border)' }}>
          <span className="text-[11px]" style={{ color: 'var(--px-muted)' }}><kbd className="rounded border px-1.5 py-0.5 text-[10px] font-semibold" style={{ borderColor: 'var(--px-border-strong)' }}>↑↓</kbd> navigate</span>
          <span className="text-[11px]" style={{ color: 'var(--px-muted)' }}><kbd className="rounded border px-1.5 py-0.5 text-[10px] font-semibold" style={{ borderColor: 'var(--px-border-strong)' }}>↵</kbd> open</span>
          <span className="text-[11px]" style={{ color: 'var(--px-muted)' }}><kbd className="rounded border px-1.5 py-0.5 text-[10px] font-semibold" style={{ borderColor: 'var(--px-border-strong)' }}>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
