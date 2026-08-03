import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  Activity, BadgePercent, BarChart3, ChevronDown, Command, CreditCard, FileText, FolderOpen, Globe, Home,
  LayoutTemplate, LogOut, Megaphone, Menu, MessageSquare, Package, PackageX, Plus,
  Search, Settings as SettingsIcon, ShieldCheck, ShoppingBag, Signpost, Sparkles, Star, Store, Tags, TrendingUp, Truck, Users, X, Zap,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { applyAdminTheme, clearAdminTheme } from '../lib/adminTheme';
import ProfitCalculator from './ProfitCalculator';
import NotificationBell from './dashboard/NotificationBell';
import CommandPalette from './CommandPalette';

/* ============================================================================
 * ROLE-BASED PERMISSIONS
 * ========================================================================== */

const ALL_ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

const ROLE_ACCESS = {
  orders:       ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'],
  products:     ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse'],
  customers:    ['admin', 'Owner', 'Manager', 'Staff', 'Support'],
  marketing:    ['admin', 'Owner', 'Manager'],
  storefront:   ['admin', 'Owner', 'Manager'],
  analytics:    ['admin', 'Owner', 'Manager', 'Staff'],
  settings:     ['admin', 'Owner'],
};

const NAV_TOP = [
  { to: '/admin', label: 'Dashboard', icon: Home, end: true },
];

const NAV_GROUPS = [
  {
    key: 'orders', label: 'Orders', icon: ShoppingBag,
    match: ['/admin/orders', '/admin/payments', '/admin/abandoned-carts'],
    children: [
      { to: '/admin/orders',           label: 'All orders',         icon: ShoppingBag },
      { to: '/admin/payments',         label: 'Payments',           icon: CreditCard },
      { to: '/admin/abandoned-carts',  label: 'Abandoned carts',    icon: PackageX },
    ],
  },
  {
    key: 'products', label: 'Products', icon: Package,
    match: ['/admin/products', '/admin/categories', '/admin/collections', '/admin/reviews', '/admin/questions'],
    children: [
      { to: '/admin/products',      label: 'Inventory',     icon: Package },
      { to: '/admin/categories',    label: 'Categories',    icon: Tags },
      { to: '/admin/collections',   label: 'Collections',   icon: FolderOpen },
      { to: '/admin/reviews',       label: 'Reviews',       icon: Star },
      { to: '/admin/questions',     label: 'Questions',     icon: MessageSquare },
    ],
  },
  {
    key: 'customers', label: 'Customers', icon: Users,
    match: ['/admin/customers', '/admin/loyalty'],
    children: [
      { to: '/admin/customers',  label: 'All customers', icon: Users },
      { to: '/admin/loyalty',    label: 'Loyalty',       icon: Sparkles },
    ],
  },
  {
    key: 'marketing', label: 'Marketing', icon: Megaphone,
    match: ['/admin/promotions', '/admin/bundles', '/admin/flash-sales', '/admin/discounts', '/admin/marketing', '/admin/marketing/settings', '/admin/marketing/analytics'],
    children: [
      { to: '/admin/promotions',           label: 'Promotions',        icon: Megaphone },
      { to: '/admin/discounts',            label: 'Discounts',         icon: BadgePercent },
      { to: '/admin/marketing/settings',   label: 'Automation rules',  icon: SettingsIcon },
      { to: '/admin/marketing/analytics',  label: 'Performance',       icon: BarChart3 },
    ],
  },
  {
    key: 'storefront', label: 'Storefront', icon: Store,
    match: ['/admin/store', '/admin/theme', '/admin/theme-legacy', '/admin/cms', '/admin/content', '/admin/faq', '/admin/markets'],
    children: [
      { to: '/admin/store',       label: 'Online Store',    icon: Globe },
      { to: '/admin/theme',       label: 'Theme Editor',    icon: LayoutTemplate },
      { to: '/admin/cms',         label: 'Pages',           icon: FileText, exact: true },
      { to: '/admin/cms/redirects', label: 'Old addresses', icon: Signpost },
      { to: '/admin/faq',         label: 'FAQ',             icon: FileText },
      { to: '/admin/markets',     label: 'Markets',         icon: Globe },
    ],
  },
  {
    key: 'analytics', label: 'Analytics', icon: BarChart3,
    match: ['/admin/analytics', '/admin/insights', '/admin/finance', '/admin/live', '/admin/growth', '/admin/search-analytics'],
    children: [
      { to: '/admin/analytics',       label: 'Overview',          icon: BarChart3 },
      { to: '/admin/finance',         label: 'Finance & P&L',     icon: CreditCard },
      { to: '/admin/insights',        label: 'Deep Insights',     icon: TrendingUp },
      { to: '/admin/search-analytics', label: 'Search Analytics', icon: Search },
      { to: '/admin/live',            label: 'Live View',         icon: Activity },
      { to: '/admin/growth',          label: 'Growth',            icon: TrendingUp },
    ],
  },
  {
    key: 'settings', label: 'Settings', icon: SettingsIcon,
    match: ['/admin/settings', '/admin/apps', '/admin/backup'],
    children: [
      { to: '/admin/settings',            label: 'Settings Hub',             icon: SettingsIcon, exact: true },
      { to: '/admin/settings/store',      label: 'Store Details',            icon: Store },
      { to: '/admin/settings/payments',   label: 'Payments',                 icon: CreditCard },
      { to: '/admin/settings/shipping',   label: 'Shipping & Delivery',      icon: Truck },
      { to: '/admin/settings/accounts',   label: 'Accounts & Security',      icon: ShieldCheck },
      { to: '/admin/settings/email',      label: 'Email & Notifications',    icon: Megaphone },
      { to: '/admin/apps',                label: 'Integrations',             icon: Zap },
      { to: '/admin/backup',              label: 'Backup & Export',          icon: FileText },
    ],
  },
];

function rolesForGroup(key) { return ROLE_ACCESS[key] || ['admin', 'Owner']; }
function roleHasAccess(userRole, groupKey) { if (!userRole) return false; return rolesForGroup(groupKey).includes(userRole); }
function getRoleLabel(role) {
  const map = { admin: 'Administrator', Owner: 'Owner', Manager: 'Manager', Staff: 'Staff', Warehouse: 'Fulfillment', Support: 'Support' };
  return map[role] || role;
}

const linkCls = ({ isActive }) =>
  `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${isActive ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-white/60 hover:text-neutral-900'}`;

const childLinkCls = (active) =>
  `flex items-center gap-2.5 rounded-lg py-1.5 pl-9 pr-3 text-[12.5px] font-medium transition ${active ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-800'}`;

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
  useEffect(() => { if (isChildActive) setOpen(true); }, [isChildActive]);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${isChildActive ? 'text-neutral-900' : 'text-neutral-600 hover:bg-white/60 hover:text-neutral-900'}`}>
        <Icon size={17} strokeWidth={isChildActive ? 2.1 : 1.8} /><span className="flex-1 text-left">{group.label}</span>
        <ChevronDown size={14} className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-0.5 space-y-0.5">{group.children.map((c) => {
        const active = isChildRouteActive(loc, c.to, c.exact); const ChildIcon = c.icon;
        return <NavLink key={c.to} to={c.to} onClick={onNavigate} className={() => childLinkCls(active)}><ChildIcon size={14} strokeWidth={1.8} className="opacity-70" />{c.label}</NavLink>;
      })}</div>}
    </div>
  );
}

function SidebarContent({ onNavigate }) {
  const { auth, logout } = useApp();
  const loc = useLocation();
  const [query, setQuery] = useState('');
  const role = auth?.user?.role;
  const visibleGroups = role ? NAV_GROUPS.filter((g) => roleHasAccess(role, g.key)) : NAV_GROUPS;
  const searchable = useMemo(() => {
    const list = [];
    NAV_TOP.forEach((it) => list.push({ to: it.to, label: it.label, icon: it.icon }));
    visibleGroups.forEach((g) => g.children.forEach((c) => list.push({ to: c.to, label: `${g.label} · ${c.label}`, icon: c.icon })));
    return list;
  }, [visibleGroups]);
  const filtered = query.trim() ? searchable.filter((it) => it.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8) : [];
  const activeGroupLabel = useMemo(() => {
    for (const g of visibleGroups) { if (g.match.some((m) => loc.pathname.startsWith(m))) return g.label; }
    return null;
  }, [loc.pathname, visibleGroups]);
  return (
    <div className="flex h-full flex-col bg-[#ebebeb]">
      <div className="px-4 pb-3 pt-5">
        <NavLink to="/admin" onClick={onNavigate} className="block w-fit rounded-lg transition hover:opacity-70">
          <p className="font-sans text-[17px] font-bold tracking-widest text-neutral-900">HUSHAE</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-neutral-400">Admin console</p>
        </NavLink>
      </div>
      {role && role !== 'admin' && role !== 'Owner' && (
        <div className="mx-3 mb-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{getRoleLabel(role)} view</p>
        </div>
      )}
      <div className="relative px-3 pb-2">
        <Search size={13} className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search admin… (⌘K)"
          className="w-full rounded-lg border border-transparent bg-white/70 py-1.5 pl-8 pr-8 text-[12.5px] text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-300 focus:bg-white" />
        <kbd className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-neutral-400"><Command size={9} />K</kbd>
        {filtered.length > 0 && <div className="absolute inset-x-3 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">{filtered.map((f) => <Link key={f.to} to={f.to} onClick={() => { setQuery(''); onNavigate?.(); }} className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-neutral-700 hover:bg-neutral-50"><f.icon size={14} className="text-neutral-400" /> {f.label}</Link>)}</div>}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3">
        {NAV_TOP.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={linkCls} onClick={onNavigate}>{({ isActive }) => <><Icon size={17} strokeWidth={isActive ? 2.1 : 1.8} />{label}</>}</NavLink>)}
        <div className="mt-2" />
        {visibleGroups.map((g) => <GroupDropdown key={g.label} group={g} onNavigate={onNavigate} defaultOpen={activeGroupLabel === g.label} />)}
      </nav>
      <div className="border-t border-black/5 px-2.5 py-3">
        <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-neutral-500 transition hover:bg-white/60 hover:text-red-600"><LogOut size={17} strokeWidth={1.8} /> Sign Out</button>
      </div>
    </div>
  );
}

const RESTRICTED_PATHS = [
  { prefix: '/admin/settings', key: 'settings' }, { prefix: '/admin/theme', key: 'storefront' },
  { prefix: '/admin/cms', key: 'storefront' }, { prefix: '/admin/store', key: 'storefront' },
  { prefix: '/admin/markets', key: 'storefront' }, { prefix: '/admin/content', key: 'storefront' },
  { prefix: '/admin/marketing', key: 'marketing' }, { prefix: '/admin/promotions', key: 'marketing' },
  { prefix: '/admin/bundles', key: 'marketing' }, { prefix: '/admin/flash-sales', key: 'marketing' },
  { prefix: '/admin/discounts', key: 'marketing' }, { prefix: '/admin/finance', key: 'analytics' },
  { prefix: '/admin/analytics', key: 'analytics' }, { prefix: '/admin/insights', key: 'analytics' },
  { prefix: '/admin/growth', key: 'analytics' }, { prefix: '/admin/apps', key: 'settings' },
  { prefix: '/admin/backup', key: 'settings' },
];

function isPathBlocked(pathname, role) {
  if (!role || role === 'admin' || role === 'Owner') return false;
  for (const r of RESTRICTED_PATHS) { if (pathname.startsWith(r.prefix) && !roleHasAccess(role, r.key)) return true; }
  return false;
}

export default function AdminLayout({ children, title }) {
  const { auth } = useApp();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const role = auth?.user?.role;
  useEffect(() => { applyAdminTheme(); return () => clearAdminTheme(); }, []);
  // Cmd+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setCmdOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  if (!auth) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  if (!ALL_ROLES.includes(role || '')) return <Navigate to="/admin/login" replace />;
  if (isPathBlocked(loc.pathname, role)) return (
    <div className="grid min-h-screen place-items-center bg-[#F4F6F8]">
      <div className="rounded-2xl border border-amber-200 bg-white p-10 text-center shadow-sm max-w-sm">
        <ShieldCheck size={36} className="mx-auto mb-3 text-amber-600" />
        <p className="text-[16px] font-semibold text-neutral-900">Access restricted</p>
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">This section is only available to Administrator and Owner roles. You are signed in as <b>{getRoleLabel(role || '')}</b>.</p>
        <Link to="/admin" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-black">Back to Dashboard</Link>
      </div>
    </div>
  );
  return (
    <div className="admin-shell flex min-h-screen bg-[#F4F6F8]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 md:block"><SidebarContent /></aside>
      {drawer && <div className="fixed inset-0 z-50 md:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} /><div className="absolute inset-y-0 left-0 w-64 shadow-xl"><button onClick={() => setDrawer(false)} className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-neutral-500 hover:bg-white/70"><X size={18} /></button><SidebarContent onNavigate={() => setDrawer(false)} /></div></div>}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:pl-60">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-[#ebebeb] px-4 py-3 md:hidden"><button onClick={() => setDrawer(true)} className="rounded-lg p-1.5 text-neutral-700 hover:bg-white/70"><Menu size={20} /></button><Link to="/admin" className="font-sans text-base font-bold tracking-widest text-neutral-900">HUSHAE</Link></div>
        <TopBar title={title} auth={auth} onCmdK={() => setCmdOpen(true)} />
        <div className="min-w-0 flex-1 p-4 md:p-8">{title && <h1 className="mb-6 font-sans text-[28px] font-semibold leading-tight text-neutral-900 md:hidden">{title}</h1>}<div className="admin-main min-w-0">{children}</div></div>
      </div>
      <ProfitCalculator />
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  );
}

function TopBar({ title, auth, onCmdK }) {
  const loc = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef(null);
  const role = auth?.user?.role;
  const canCreate = !role || role === 'admin' || role === 'Owner' || role === 'Manager';
  useEffect(() => {
    if (!createOpen) return;
    const onDoc = (e) => { if (createRef.current && !createRef.current.contains(e.target)) setCreateOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setCreateOpen(false); };
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [createOpen]);
  const crumbs = (() => {
    const parts = loc.pathname.split('/').filter(Boolean);
    const out = [{ label: 'Home', to: '/admin' }];
    if (parts.length > 1) { let running = '/admin'; for (const p of parts.slice(1)) { running += `/${p}`; out.push({ label: p.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), to: running }); } }
    return out;
  })();
  const initials = (auth?.user?.name || 'A').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <header className="sticky top-0 z-20 hidden border-b border-neutral-200 bg-white/85 px-8 py-3 backdrop-blur md:block">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1"><h1 className="truncate font-sans text-[22px] font-semibold leading-tight text-neutral-900">{title || crumbs[crumbs.length - 1]?.label}</h1><nav className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-500">{crumbs.map((c, i) => <span key={c.to} className="inline-flex items-center gap-1.5">{i > 0 && <span className="text-neutral-300">/</span>}{i === crumbs.length - 1 ? <span className="font-medium text-neutral-700">{c.label}</span> : <Link to={c.to} className="hover:text-neutral-900">{c.label}</Link>}</span>)}</nav></div>
        <div className="flex items-center gap-2">
          {/* ⌘K Search button */}
          <button onClick={onCmdK} className="hidden items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 md:inline-flex" title="Search admin (⌘K)"><Command size={10} /> Search</button>
          <span className="hidden items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-600 lg:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Store online</span>
          {canCreate && <div className="relative" ref={createRef}><button onClick={() => setCreateOpen((v) => !v)} className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-neutral-800"><Plus size={12} /> Create</button>{createOpen && <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"><Link to="/admin/products/new" onClick={() => setCreateOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium text-neutral-700 transition hover:bg-neutral-50"><Package size={13} className="text-neutral-400" /> New product</Link><Link to="/admin/promotions/new" onClick={() => setCreateOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium text-neutral-700 transition hover:bg-neutral-50"><Megaphone size={13} className="text-neutral-400" /> New promotion</Link><Link to="/admin/discounts" onClick={() => setCreateOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium text-neutral-700 transition hover:bg-neutral-50"><BadgePercent size={13} className="text-neutral-400" /> New discount</Link><Link to="/admin/cms/new" onClick={() => setCreateOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium text-neutral-700 transition hover:bg-neutral-50"><FileText size={13} className="text-neutral-400" /> New page</Link></div>}</div>}
          <Link to="/" target="_blank" className="hidden items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 md:inline-flex" title="Open storefront"><Globe size={12} /> View store</Link>
          <NotificationBell />
          <div className="ml-1 flex items-center gap-2 rounded-full border border-neutral-200 bg-white p-1 pl-1 pr-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">{initials}</span><span className="text-[11px] font-semibold text-neutral-800">{auth?.user?.name?.split(' ')[0] || 'Admin'}</span></div>
        </div>
      </div>
    </header>
  );
}

export { Fragment };
