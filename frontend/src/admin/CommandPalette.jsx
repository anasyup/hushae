import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgePercent, BarChart3, FileText, Globe, History,
  LayoutTemplate, Megaphone, Package, PackagePlus, Search,
  Settings, ShoppingBag, Sparkles, Users,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';

/* ============================================================================
 * COMMAND PALETTE — advanced JS pass: Framer entrance + stagger, fuzzy
 * scoring, matched-text highlight, recent items memory (localStorage).
 * Data logic (live orders/products/customers search) unchanged.
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

const CAT_ICON = { Orders: ShoppingBag, Products: Package, Customers: Users, Recent: History };
const RECENT_KEY = 'hushae.cmd.recent';

const loadRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 5); } catch { return []; }
};

/* fuzzy score: startsWith > word-start > includes > keywords */
const score = (item, term) => {
  const label = item.label.toLowerCase();
  const kw = (item.keywords || []).join(' ').toLowerCase();
  if (label.startsWith(term)) return 100;
  if (label.split(/\s+/).some((w) => w.startsWith(term))) return 80;
  if (label.includes(term)) return 60;
  if (kw.includes(term)) return 40;
  return 0;
};

const Highlight = ({ text, term }) => {
  if (!term) return text;
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className="cmd-hl">{text.slice(i, i + term.length)}</span>
      {text.slice(i + term.length)}
    </>
  );
};

export default function CommandPalette({ onClose }) {
  const { auth } = useApp();
  const [q, setQ] = useState('');
  const [customerHits, setCustomerHits] = useState([]);
  const [orderHits, setOrderHits] = useState([]);
  const [productHits, setProductHits] = useState([]);
  const [idx, setIdx] = useState(0);
  const [recent, setRecent] = useState(loadRecent);
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
    if (!term) { setCustomerHits([]); setOrderHits([]); setProductHits([]); return undefined; }
    const timer = setTimeout(() => {
      api(`/orders/manage?q=${encodeURIComponent(term)}&limit=6`, { token: auth?.token, noCache: true })
        .then((data) => setOrderHits((data.orders || []).map((o) => ({
          id: `order-${o._id}`,
          label: `${o.orderNumber} — ${o.customerInfo?.name || ''}`.trim(),
          category: 'Orders', icon: ShoppingBag,
          to: `/admin/orders/${o._id}`,
          hint: `${o.stage || o.status || ''} · ${o.customerInfo?.city || ''}`.trim(),
        }))))
        .catch(() => setOrderHits([]));
      api(`/products/admin/list?q=${encodeURIComponent(term)}&limit=6`, { token: auth?.token, noCache: true })
        .then((data) => setProductHits((data.products || []).map((p) => ({
          id: `product-${p._id}`,
          label: p.name || 'Product',
          category: 'Products', icon: Package,
          to: `/admin/products/${p._id}`,
          hint: `${p.sku || ''} · stock ${p.stock ?? '—'}`.trim(),
        }))))
        .catch(() => setProductHits([]));
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
    const term = q.trim().toLowerCase();
    if (!term) {
      const rec = recent.map((r) => ({ ...r, icon: CAT_ICON[r.category] || History }));
      return [...rec, ...ITEMS.slice(0, 8 - rec.length)];
    }
    const live = [...orderHits, ...productHits, ...customerHits];
    const staticItems = ITEMS
      .map((item) => ({ item, s: score(item, term) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.item);
    return [...live, ...staticItems];
  }, [q, customerHits, orderHits, productHits, recent]);

  useEffect(() => { setIdx(0); }, [results.length]);

  const grouped = useMemo(() => {
    const map = new Map();
    results.forEach((r) => {
      const cat = q.trim() ? r.category : (r.category === 'Go to' || r.category === 'Create' ? r.category : 'Recent');
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(r);
    });
    return map;
  }, [results, q]);

  const flatItems = [...grouped.values()].flat();

  const run = (item) => {
    try {
      const next = [{ id: item.id, label: item.label, category: item.category, to: item.to, hint: item.hint }, ...loadRecent().filter((r) => r.id !== item.id)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch { /* private mode */ }
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
    <motion.div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 pt-[15vh]"
      style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_24px_80px_-24px_rgba(0,0,0,0.35)]"
        initial={{ opacity: 0, y: -14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[#EAEAEA] px-4 py-3">
          <Search size={15} className="shrink-0 text-[#777777]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search admin — orders, products, customers…"
            className="w-full bg-transparent text-[13px] text-black outline-none placeholder:text-[#777777]"
          />
          <kbd className="hidden text-[10px] uppercase tracking-[0.16em] text-[#999999] sm:inline">Esc</kbd>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {results.length === 0 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 text-center text-[12px] text-[#777777]">
              No results for “{q}”
            </motion.p>
          ) : (
            [...grouped.entries()].map(([cat, items], gi) => (
              <div key={cat}>
                <p className="adm-label px-4 pt-4">{cat}</p>
                {items.map((item, ii) => {
                  const active = flatItems.indexOf(item) === idx;
                  const Icon = item.icon || CAT_ICON[cat] || Search;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * Math.min(gi * 3 + ii, 10), duration: 0.2 }}
                      onClick={() => run(item)}
                      onMouseEnter={() => setIdx(flatItems.indexOf(item))}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? 'bg-[#F5F5F5]' : 'hover:bg-[#F7F7F7]'}`}
                    >
                      <motion.span animate={{ scale: active ? 1.08 : 1 }} className="shrink-0">
                        <Icon size={14} strokeWidth={1.6} className={active ? 'text-black' : 'text-[#777777]'} />
                      </motion.span>
                      <span className={`flex-1 text-[13px] ${active ? 'text-black' : 'text-[#555555]'}`}>
                        <Highlight text={item.label} term={q.trim()} />
                      </span>
                      <span className="max-w-[45%] truncate font-mono text-[10px] text-[#999999]">{item.hint || item.to}</span>
                    </motion.button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-4 border-t border-[#EAEAEA] px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-[#999999]">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
          <span className="ml-auto normal-case tracking-normal text-[#B4B0A5]">recent items saved</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
