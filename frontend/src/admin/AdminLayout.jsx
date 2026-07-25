import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  Activity, BadgePercent, BarChart3, Bell, ChevronDown, CreditCard, FileText, FolderOpen, Globe, Home,
  LayoutTemplate, LogOut, Menu, Package, PackagePlus, PackageX,
  Search, Settings as SettingsIcon, ShieldCheck, ShoppingBag, Store, Tags, TrendingUp, Truck, Users, X, Zap,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { applyAdminTheme, clearAdminTheme } from '../lib/adminTheme';

/* ------------------------------------------------------------------ *
 * Sidebar structure — Shopify-style with collapsible groups.
 * Each group is a dropdown (except Dashboard which is a single item).
 * Groups: Dashboard | Sales | Catalog | Storefront | Insights
 * Bottom (pinned): Integrations, Settings, Sign Out
 * ------------------------------------------------------------------ */

const NAV_TOP = [
  { to: '/admin', label: 'Dashboard', icon: Home, end: true },
];

const NAV_GROUPS = [
  {
    label: 'Sales',
    icon: ShoppingBag,
    match: ['/admin/orders', '/admin/customers', '/admin/discounts'],
    children: [
      { to: '/admin/orders',    label: 'Orders',    icon: ShoppingBag },
      { to: '/admin/customers', label: 'Customers', icon: Users },
      { to: '/admin/discounts', label: 'Discounts', icon: BadgePercent },
    ],
  },
  {
    label: 'Catalog',
    icon: Package,
    match: ['/admin/products', '/admin/categories'],
    children: [
      { to: '/admin/products',              label: 'Inventory',    icon: Package, exact: true },
      { to: '/admin/products/new',          label: 'Add product',  icon: PackagePlus },
      { to: '/admin/products?active=0',     label: 'Archived',     icon: PackageX },
      { to: '/admin/categories',            label: 'Categories',   icon: Tags },
    ],
  },
  {
    label: 'Storefront',
    icon: Store,
    match: ['/admin/store', '/admin/content', '/admin/markets'],
    children: [
      { to: '/admin/store',   label: 'Online Store', icon: Store },
      { to: '/admin/content', label: 'Content',      icon: LayoutTemplate },
      { to: '/admin/markets', label: 'Markets',      icon: Globe },
    ],
  },
  {
    label: 'Insights',
    icon: BarChart3,
    match: ['/admin/analytics', '/admin/insights', '/admin/finance', '/admin/live', '/admin/growth'],
    children: [
      { to: '/admin/finance',   label: 'Finance',       icon: CreditCard },
      { to: '/admin/analytics', label: 'Analytics',     icon: BarChart3 },
      { to: '/admin/insights',  label: 'Deep insights', icon: TrendingUp },
      { to: '/admin/live',      label: 'Live view',     icon: Activity },
      { to: '/admin/growth',    label: 'Growth',        icon: TrendingUp },
    ],
  },
  {
    label: 'Settings',
    icon: SettingsIcon,
    match: ['/admin/settings', '/admin/apps'],
    children: [
      { to: '/admin/settings',              label: 'Overview',       icon: SettingsIcon, exact: true },
      { to: '/admin/settings/store',        label: 'Store details',  icon: Store },
      { to: '/admin/settings/payments',     label: 'Payments',       icon: CreditCard },
      { to: '/admin/settings/shipping',     label: 'Shipping',       icon: Truck },
      { to: '/admin/apps',                  label: 'Integrations',   icon: Zap },
      { to: '/admin/settings/security',     label: 'Security',       icon: ShieldCheck },
      { to: '/admin/settings/legal',        label: 'Legal & Policy', icon: FileText },
    ],
  },
];

const BOTTOM = [];

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

// Check if a link matches the current URL considering query params
function isChildRouteActive(loc, to, exact = false) {
  const [p, qs] = to.split('?');
  if (loc.pathname !== p) return false;
  if (qs) return loc.search.replace('?', '') === qs;
  if (exact) return !loc.search;
  return !loc.search;
}

function GroupDropdown({ group, onNavigate, defaultOpen }) {
  const loc = useLocation();
  const [open, setOpen] = useState(defaultOpen);
  const Icon = group.icon;

  const isChildActive = group.children.some((c) => isChildRouteActive(loc, c.to, c.exact));

  // Auto-open when a child becomes active
  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
          isChildActive
            ? 'text-neutral-900'
            : 'text-neutral-600 hover:bg-white/60 hover:text-neutral-900'
        }`}
      >
        <Icon size={17} strokeWidth={isChildActive ? 2.1 : 1.8} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown size={14} className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.children.map((c) => {
            const active = isChildRouteActive(loc, c.to, c.exact);
            const ChildIcon = c.icon;
            return (
              <NavLink key={c.to} to={c.to} onClick={onNavigate} className={() => childLinkCls(active)}>
                <ChildIcon size={14} strokeWidth={1.8} className="opacity-70" />
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

  // Flatten searchable items
  const searchable = useMemo(() => {
    const list = [];
    NAV_TOP.forEach((it) => list.push({ to: it.to, label: it.label, icon: it.icon }));
    NAV_GROUPS.forEach((g) => g.children.forEach((c) =>
      list.push({ to: c.to, label: `${g.label} · ${c.label}`, icon: c.icon })
    ));
    BOTTOM.forEach((it) => list.push(it));
    return list;
  }, []);

  const filtered = query.trim()
    ? searchable.filter((it) => it.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  // Decide which group opens by default: the one whose pathname matches
  const activeGroupLabel = useMemo(() => {
    for (const g of NAV_GROUPS) {
      if (g.match.some((m) => loc.pathname.startsWith(m))) return g.label;
    }
    return null;
  }, [loc.pathname]);

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

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3">
        {/* Top single items (Dashboard) */}
        {NAV_TOP.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkCls} onClick={onNavigate}>
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.1 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        <div className="mt-2" />

        {/* Collapsible groups */}
        {NAV_GROUPS.map((g) => (
          <GroupDropdown
            key={g.label}
            group={g}
            onNavigate={onNavigate}
            defaultOpen={activeGroupLabel === g.label}
          />
        ))}
      </nav>

      {/* Bottom: Sign Out only (Settings + Integrations moved into main nav) */}
      <div className="border-t border-black/5 px-2.5 py-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-neutral-500 transition hover:bg-white/60 hover:text-red-600"
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

        {/* Desktop topbar — breadcrumb, quick actions, notifications */}
        <TopBar title={title} auth={auth} />

        <main className="flex-1 p-4 md:p-8">
          {title && <h1 className="mb-6 font-display text-[28px] font-semibold leading-tight text-neutral-900 md:hidden">{title}</h1>}
          <div>{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ==========================================================================
 * TOPBAR — sticky header with breadcrumb, quick actions, avatar
 * ======================================================================== */
function TopBar({ title, auth }) {
  const loc = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);

  const crumbs = (() => {
    const parts = loc.pathname.split('/').filter(Boolean); // ['admin', ...]
    const out = [{ label: 'Home', to: '/admin' }];
    if (parts.length > 1) {
      let running = '/admin';
      for (const p of parts.slice(1)) {
        running += `/${p}`;
        const label = p.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
        out.push({ label, to: running });
      }
    }
    return out;
  })();

  const initials = (auth?.user?.name || 'A').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-20 hidden border-b border-neutral-200 bg-white/85 px-8 py-3 backdrop-blur md:block">
      <div className="flex items-center justify-between gap-6">
        {/* Breadcrumb */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[22px] font-semibold leading-tight text-neutral-900">
            {title || crumbs[crumbs.length - 1]?.label}
          </h1>
          <nav className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-500">
            {crumbs.map((c, i) => (
              <span key={c.to} className="inline-flex items-center gap-1.5">
                {i > 0 && <span className="text-neutral-300">/</span>}
                {i === crumbs.length - 1 ? (
                  <span className="font-medium text-neutral-700">{c.label}</span>
                ) : (
                  <Link to={c.to} className="hover:text-neutral-900">{c.label}</Link>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-600 lg:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Store online
          </span>

          <Link
            to="/"
            target="_blank"
            className="hidden items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 md:inline-flex"
            title="Open storefront in a new tab"
          >
            <Globe size={12} /> View store
          </Link>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded-full border border-neutral-200 bg-white p-2 text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
              aria-label="Notifications"
            >
              <Bell size={15} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
                <div className="border-b border-neutral-100 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Notifications</p>
                </div>
                <div className="p-3 text-center">
                  <p className="py-6 text-[12px] text-neutral-400">You&apos;re all caught up.</p>
                </div>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="ml-1 flex items-center gap-2 rounded-full border border-neutral-200 bg-white p-1 pl-1 pr-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">{initials}</span>
            <span className="text-[11px] font-semibold text-neutral-800">{auth?.user?.name?.split(' ')[0] || 'Admin'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

// Re-export Fragment to keep import list stable if used elsewhere
export { Fragment };
