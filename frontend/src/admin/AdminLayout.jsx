import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  Activity, BadgePercent, BarChart3, ChevronDown, FolderOpen, Globe, Home,
  LayoutTemplate, LogOut, Menu, Package, PackagePlus, PackageX,
  Search, Settings as SettingsIcon, ShoppingBag, Store, Tags, TrendingUp, Users, X, Zap,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { applyAdminTheme, clearAdminTheme } from '../lib/adminTheme';

/* ------------------------------------------------------------------ *
 * Sidebar structure — organized like Shopify:
 * Each group has a small header + related items only.
 * Groups: MAIN → SALES → CATALOG → STOREFRONT → INSIGHTS → CHANNELS
 * Bottom (pinned): Integrations, Settings, Sign Out
 * ------------------------------------------------------------------ */

const NAV = [
  // Group 1: MAIN
  { header: null, items: [
    { to: '/admin', label: 'Dashboard', icon: Home, end: true },
  ]},

  // Group 2: SALES — orders + customers + discounts
  { header: 'Sales', items: [
    { to: '/admin/orders',    label: 'Orders',    icon: ShoppingBag },
    { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/discounts', label: 'Discounts', icon: BadgePercent },
  ]},

  // Group 3: CATALOG — products with dropdown + categories
  { header: 'Catalog', items: [
    { label: 'Products', icon: Package, expandable: true, children: [
      { to: '/admin/products',              label: 'All products', icon: Package, end: true, exactQuery: true },
      { to: '/admin/products/new',          label: 'Add product',  icon: PackagePlus },
      { to: '/admin/products?status=draft', label: 'Drafts',       icon: FolderOpen },
      { to: '/admin/products?active=0',     label: 'Inactive',     icon: PackageX },
    ]},
    { to: '/admin/categories', label: 'Categories', icon: Tags },
  ]},

  // Group 4: STOREFRONT — everything the customer sees
  { header: 'Storefront', items: [
    { to: '/admin/store',   label: 'Online Store', icon: Store },
    { to: '/admin/content', label: 'Content',      icon: LayoutTemplate },
    { to: '/admin/markets', label: 'Markets',      icon: Globe },
  ]},

  // Group 5: INSIGHTS — data
  { header: 'Insights', items: [
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, end: true },
    { to: '/admin/live',      label: 'Live View', icon: Activity },
    { to: '/admin/growth',    label: 'Growth',    icon: TrendingUp },
  ]},
];

const BOTTOM = [
  { to: '/admin/apps',     label: 'Integrations', icon: Zap },
  { to: '/admin/settings', label: 'Settings',     icon: SettingsIcon },
];

/* ------------------------------------------------------------------ */

const linkCls = ({ isActive }) =>
  `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
    isActive
      ? 'bg-white text-neutral-900 shadow-sm'
      : 'text-neutral-600 hover:bg-white/60 hover:text-neutral-900'
  }`;

const childLinkCls = (active) =>
  `flex items-center gap-2.5 rounded-lg py-1.5 pl-9 pr-3 text-[12.5px] font-medium transition ${
    active
      ? 'bg-white text-neutral-900 shadow-sm'
      : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-800'
  }`;

function GroupHeader({ children }) {
  return (
    <p className="mb-1 mt-4 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
      {children}
    </p>
  );
}

function ExpandableItem({ item, isChildActive, onNavigate }) {
  const [open, setOpen] = useState(isChildActive);
  const loc = useLocation();

  // Auto-open when child becomes active (e.g. after navigation)
  useEffect(() => { if (isChildActive) setOpen(true); }, [isChildActive]);

  const Icon = item.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
          isChildActive ? 'text-neutral-900' : 'text-neutral-600 hover:bg-white/60 hover:text-neutral-900'
        }`}
        aria-expanded={open}
      >
        <Icon size={17} strokeWidth={isChildActive ? 2.1 : 1.8} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''} text-neutral-400`} />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((c) => {
            const [p, qs] = c.to.split('?');
            const active = loc.pathname === p && (qs ? loc.search.replace('?', '') === qs : !loc.search);
            return (
              <NavLink key={c.to} to={c.to} onClick={onNavigate} className={() => childLinkCls(active)}>
                <c.icon size={14} strokeWidth={1.8} className="opacity-70" />
                {c.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ onNavigate }) {
  const { logout } = useApp();
  const loc = useLocation();
  const [query, setQuery] = useState('');

  // Flatten all searchable items
  const searchable = useMemo(() => {
    const list = [];
    NAV.forEach((g) => g.items.forEach((it) => {
      if (it.to) list.push({ to: it.to, label: it.label, icon: it.icon });
      if (it.children) it.children.forEach((c) => list.push({ to: c.to, label: `${it.label} · ${c.label}`, icon: c.icon }));
    }));
    BOTTOM.forEach((it) => list.push(it));
    return list;
  }, []);

  const filtered = query.trim()
    ? searchable.filter((it) => it.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  const isChildActive = (children) => children?.some((c) => {
    const [p, qs] = c.to.split('?');
    return loc.pathname === p && (qs ? loc.search.replace('?', '') === qs : !loc.search);
  });

  return (
    <div className="flex h-full flex-col bg-[#ebebeb]">
      {/* Brand */}
      <div className="px-4 pb-3 pt-5">
        <NavLink to="/admin" onClick={onNavigate} className="block w-fit rounded-lg transition hover:opacity-70">
          <p className="font-display text-[17px] font-bold tracking-widest text-neutral-900">VÉLOURA</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-neutral-400">Admin console</p>
        </NavLink>
      </div>

      {/* Quick search */}
      <div className="relative px-3 pb-2">
        <Search size={13} className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search admin…"
          className="w-full rounded-lg border border-transparent bg-white/70 py-1.5 pl-8 pr-3 text-[12.5px] text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-300 focus:bg-white"
        />
        {filtered.length > 0 && (
          <div className="absolute inset-x-3 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
            {filtered.map((f) => (
              <Link
                key={f.to}
                to={f.to}
                onClick={() => { setQuery(''); onNavigate?.(); }}
                className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-neutral-700 hover:bg-neutral-50"
              >
                <f.icon size={14} className="text-neutral-400" /> {f.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3">
        {NAV.map((group, gi) => (
          <Fragment key={gi}>
            {group.header && <GroupHeader>{group.header}</GroupHeader>}
            {group.items.map((it) => {
              if (it.expandable) {
                return (
                  <ExpandableItem
                    key={it.label}
                    item={it}
                    isChildActive={isChildActive(it.children)}
                    onNavigate={onNavigate}
                  />
                );
              }
              const Icon = it.icon;
              return (
                <NavLink key={it.to} to={it.to} end={it.end} className={linkCls} onClick={onNavigate}>
                  {({ isActive }) => (
                    <>
                      <Icon size={17} strokeWidth={isActive ? 2.1 : 1.8} />
                      {it.label}
                    </>
                  )}
                </NavLink>
              );
            })}
          </Fragment>
        ))}
      </nav>

      {/* Bottom pinned area */}
      <div className="space-y-0.5 border-t border-black/5 px-2.5 py-3">
        {BOTTOM.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkCls} onClick={onNavigate}>
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.1 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-neutral-500 transition hover:bg-white/60 hover:text-red-600"
        >
          <LogOut size={17} strokeWidth={1.8} /> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children, title }) {
  const { auth } = useApp();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { applyAdminTheme(); return () => clearAdminTheme(); }, []);

  if (!auth) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  if (auth.user.role !== 'admin') return <Navigate to="/admin/login" replace />;

  return (
    <div className="flex min-h-screen bg-alabaster">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 md:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-neutral-500 hover:bg-white/70"><X size={18} /></button>
            <SidebarContent onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col md:pl-60">
        {/* Mobile topbar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-[#ebebeb] px-4 py-3 md:hidden">
          <button onClick={() => setDrawer(true)} className="rounded-lg p-1.5 text-neutral-700 hover:bg-white/70"><Menu size={20} /></button>
          <Link to="/admin" className="font-display text-base font-bold tracking-widest text-neutral-900">VÉLOURA</Link>
        </div>
        <main className="flex-1 p-4 md:p-8">
          <h1 className="font-display text-3xl">{title}</h1>
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
