import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  Activity, BadgePercent, BarChart3, ImagePlus, ChevronDown, CreditCard, FileText, FolderOpen, Globe, Home,
  LayoutTemplate, LogOut, Mail, Megaphone, Menu, MessageSquare, Package, PackageX, Phone, Plus,
  Search, Settings as SettingsIcon, ShieldCheck, ShoppingBag, Signpost, Sparkles, Star, Store, Sun, Moon, Tags, TrendingUp, Truck, Users, X, Zap, Calculator, FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { applyAdminTheme, clearAdminTheme, getAdminTheme, setAdminTheme } from '../lib/adminTheme';
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
    match: ['/admin/orders', '/admin/payments', '/admin/abandoned-carts', '/admin/verification-queue', '/admin/ops'],
    children: [
      { to: '/admin/orders',           label: 'All orders',         icon: ShoppingBag },
      { to: '/admin/verification-queue', label: 'Verification queue', icon: Phone },
      { to: '/admin/ops',              label: 'Commerce OS',        icon: Package },
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
    match: ['/admin/customers', '/admin/loyalty', '/admin/customers/groups'],
    children: [
      { to: '/admin/customers',      label: 'All customers', icon: Users },
      { to: '/admin/customers/groups', label: 'Groups',      icon: Users },
      { to: '/admin/loyalty',        label: 'Loyalty',       icon: Sparkles },
    ],
  },
  {
    key: 'marketing', label: 'Marketing', icon: Megaphone,
    match: ['/admin/promotions', '/admin/bundles', '/admin/flash-sales', '/admin/discounts', '/admin/marketing', '/admin/marketing/settings', '/admin/marketing/analytics', '/admin/email-campaigns', '/admin/banners', '/admin/banners/new', '/admin/banners/slots'],
    children: [
      { to: '/admin/promotions',           label: 'Promotions',        icon: Megaphone },
      { to: '/admin/bundles',              label: 'Bundles',           icon: Package },
      { to: '/admin/flash-sales',          label: 'Flash sales',       icon: Zap },
      { to: '/admin/banners',              label: 'Banners',           icon: ImagePlus },
      { to: '/admin/discounts',            label: 'Discounts',         icon: BadgePercent },
      { to: '/admin/email-campaigns',      label: 'Email campaigns',   icon: Mail },
      { to: '/admin/marketing/settings',   label: 'Automation rules',  icon: SettingsIcon },
      { to: '/admin/marketing/analytics',  label: 'Performance',       icon: BarChart3 },
    ],
  },
  {
    key: 'storefront', label: 'Storefront', icon: Store,
    match: ['/admin/store', '/admin/theme', '/admin/theme-sections', '/admin/theme-legacy', '/admin/cms', '/admin/cms/redirects', '/admin/content', '/admin/faq', '/admin/markets', '/admin/blog', '/admin/navigation'],
    children: [
      { to: '/admin/store',       label: 'Online Store',    icon: Globe },
      { to: '/admin/content',     label: 'Content',         icon: ImagePlus },
      { to: '/admin/theme',       label: 'Theme Editor',    icon: LayoutTemplate },
      { to: '/admin/theme-sections', label: 'Theme Sections', icon: LayoutTemplate },
      { to: '/admin/navigation',  label: 'Navigation',      icon: Menu },
      { to: '/admin/cms',         label: 'Pages',           icon: FileText },
      { to: '/admin/cms/redirects', label: 'Old addresses', icon: Signpost },
      { to: '/admin/blog',        label: 'Blog',            icon: FileText },
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
      { to: '/admin/reports',          label: 'Reports',            icon: FileSpreadsheet },
      { to: '/admin/search-analytics', label: 'Search Analytics', icon: Search },
      { to: '/admin/live',            label: 'Live View',         icon: Activity },
      { to: '/admin/growth',          label: 'Growth',            icon: TrendingUp },
    ],
  },
  {
    key: 'settings', label: 'Settings', icon: SettingsIcon,
    match: ['/admin/settings', '/admin/apps', '/admin/backup'],
    children: [
      { to: '/admin/settings',            label: 'Settings Hub',             icon: SettingsIcon },
      { to: '/admin/settings/store',      label: 'Store Details',            icon: Store },
      { to: '/admin/settings/payments',   label: 'Payments',                 icon: CreditCard },
      { to: '/admin/settings/shipping',   label: 'Shipping & Delivery',      icon: Truck },
      { to: '/admin/settings/cart',       label: 'Shopping Bag',             icon: ShoppingBag },
      { to: '/admin/settings/checkout',   label: 'Checkout',                 icon: CreditCard },
      { to: '/admin/settings/accounts',   label: 'Customer Accounts',        icon: Users },
      { to: '/admin/settings/email',      label: 'Email & Notifications',    icon: Mail },
      { to: '/admin/settings/security',   label: 'Security',                 icon: ShieldCheck },
      { to: '/admin/settings/taxes',      label: 'Taxes',                     icon: Calculator },
      { to: '/admin/apps',                label: 'Integrations',             icon: Zap },
      { to: '/admin/backup',              label: 'Backup & Export',          icon: FileText },
      { to: '/admin/settings/advanced',   label: 'Advanced',                 icon: SettingsIcon },
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
  `group flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium transition ${isActive ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-white/60 hover:text-neutral-900'}`;

const childLinkCls = (active) =>
  `flex items-center gap-1.5 rounded-md py-1 pl-7 pr-2 text-[13px] font-medium transition ${active ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-800'}`;

/* A nav item is active when its pathname matches AND, if the link itself
   carries a query (e.g. "?group=new"), that query also matches. Query params
   on the *current* URL (filters, pagination) no longer un-highlight the
   parent nav item. */
function isChildRouteActive(loc, to) {
  const [p, qs] = to.split('?');
  if (loc.pathname !== p) return false;
  if (qs) return loc.search.replace('?', '') === qs;
  return true;
}

function GroupDropdown({ group, onNavigate, defaultOpen }) {
  const loc = useLocation();
  const [open, setOpen] = useState(defaultOpen);
  const Icon = group.icon;
  const isChildActive = group.children.some((c) => isChildRouteActive(loc, c.to));
  useEffect(() => { if (isChildActive) setOpen(true); }, [isChildActive]);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium transition ${isChildActive ? 'text-neutral-900' : 'text-neutral-600 hover:bg-white/60 hover:text-neutral-900'}`}>
        <Icon size={14} strokeWidth={isChildActive ? 2 : 1.7} /><span className="flex-1 text-left">{group.label}</span>
        <ChevronDown size={11} className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-0.5 space-y-0.5">{group.children.map((c) => {
        const active = isChildRouteActive(loc, c.to); const ChildIcon = c.icon;
        return <NavLink key={c.to} to={c.to} onClick={onNavigate} className={() => childLinkCls(active)}><ChildIcon size={12} strokeWidth={1.7} className="opacity-70" />{c.label}</NavLink>;
      })}</div>}
    </div>
  );
}

function SidebarContent({ onNavigate, onOpenCmd }) {
  const { auth, logout } = useApp();
  const loc = useLocation();
  const role = auth?.user?.role;
  const visibleGroups = role ? NAV_GROUPS.filter((g) => roleHasAccess(role, g.key)) : NAV_GROUPS;
  const activeGroupLabel = useMemo(() => {
    for (const g of visibleGroups) { if (g.match.some((m) => loc.pathname.startsWith(m))) return g.label; }
    return null;
  }, [loc.pathname, visibleGroups]);
  return (
    <div className="flex h-full flex-col bg-[#ebebeb]">
      <div className="px-3 pb-2 pt-4">
        <NavLink to="/admin" onClick={onNavigate} className="block w-fit rounded-lg transition hover:opacity-70">
          <p className="font-sans text-[13px] font-bold tracking-[0.18em] text-neutral-900">HUSHAE</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Admin</p>
        </NavLink>
      </div>
      {role && role !== 'admin' && role !== 'Owner' && (
        <div className="mx-3 mb-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5">
          <p className="text-[13px] font-bold uppercase tracking-wider text-neutral-500">{getRoleLabel(role)} view</p>
        </div>
      )}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => onOpenCmd?.()}
          className="flex w-full items-center gap-2 rounded-lg border border-transparent bg-white/70 px-2.5 py-1.5 text-left text-[13px] text-neutral-500 transition hover:border-neutral-300 hover:bg-white"
        >
          <Search size={13} className="shrink-0 text-neutral-400" />
          <span className="flex-1">Search…</span>
          <kbd className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400">⌘K</kbd>
        </button>
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
  { prefix: '/admin/blog', key: 'storefront' }, { prefix: '/admin/navigation', key: 'storefront' },
  { prefix: '/admin/faq', key: 'storefront' },
  { prefix: '/admin/marketing', key: 'marketing' }, { prefix: '/admin/promotions', key: 'marketing' },
  { prefix: '/admin/bundles', key: 'marketing' }, { prefix: '/admin/flash-sales', key: 'marketing' },
  { prefix: '/admin/discounts', key: 'marketing' }, { prefix: '/admin/email-campaigns', key: 'marketing' },
  { prefix: '/admin/banners', key: 'marketing' },
  { prefix: '/admin/finance', key: 'analytics' },
  { prefix: '/admin/analytics', key: 'analytics' }, { prefix: '/admin/insights', key: 'analytics' },
  { prefix: '/admin/growth', key: 'analytics' }, { prefix: '/admin/search-analytics', key: 'analytics' },
  { prefix: '/admin/live', key: 'analytics' },
  { prefix: '/admin/apps', key: 'settings' },
  { prefix: '/admin/backup', key: 'settings' },
  { prefix: '/admin/loyalty', key: 'customers' },
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
        <p className="text-[15px] font-semibold text-neutral-900">Access restricted</p>
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">This section is only available to Administrator and Owner roles. You are signed in as <b>{getRoleLabel(role || '')}</b>.</p>
        <Link to="/admin" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2.5 text-[15px] font-semibold text-white transition hover:bg-black">Back to Dashboard</Link>
      </div>
    </div>
  );
  return (
    <div className="admin-shell flex min-h-screen bg-[#F4F6F8]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] md:block"><SidebarContent onOpenCmd={() => setCmdOpen(true)} /></aside>
      {drawer && <div className="fixed inset-0 z-50 md:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} /><div className="absolute inset-y-0 left-0 w-64 shadow-xl"><button onClick={() => setDrawer(false)} className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-neutral-500 hover:bg-white/70"><X size={18} /></button><SidebarContent onNavigate={() => setDrawer(false)} onOpenCmd={() => { setDrawer(false); setCmdOpen(true); }} /></div></div>}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:pl-[220px]">
        <TopBar title={title} auth={auth} onCmdK={() => setCmdOpen(true)} onMenu={() => setDrawer(true)} />
        <div className="min-w-0 flex-1 p-4 md:p-6">{title && <h1 className="mb-6 font-sans text-[14px] font-semibold leading-tight text-neutral-900 md:hidden">{title}</h1>}<div className="admin-main min-w-0">{children}</div></div>
      </div>
      <ProfitCalculator />
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  );
}

function CreateMenu({ onPick }) {
  const items = [
    { to: '/admin/products/new', icon: Package, label: 'New product' },
    { to: '/admin/promotions/new', icon: Megaphone, label: 'New promotion' },
    { to: '/admin/discounts', icon: BadgePercent, label: 'New discount' },
    { to: '/admin/cms/new', icon: FileText, label: 'New page' },
    { to: '/admin/blog/new', icon: FileText, label: 'New blog article' },
  ];
  return (
    <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link key={it.to} to={it.to} onClick={onPick} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-50">
            <Icon size={13} className="text-neutral-400" /> {it.label}
          </Link>
        );
      })}
    </div>
  );
}

function TopBar({ title, auth, onCmdK, onMenu }) {
  const { settings } = useApp();
  const loc = useLocation();
  const storeOpen = settings?.storefrontLock?.enabled !== true;
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef(null);
  const [dark, setDark] = useState(() => getAdminTheme() === 'dark');
  const toggleDark = () => { const next = !dark; setDark(next); setAdminTheme(next ? 'dark' : 'light'); };
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
  const btnGhost = 'inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-[12px] font-semibold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900';
  const btnPrimary = 'inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-neutral-900 px-3 text-[12px] font-semibold text-white transition hover:bg-neutral-800';
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 px-3 py-2.5 backdrop-blur md:px-8 md:py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button type="button" onClick={onMenu} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-700 hover:bg-neutral-100 md:hidden" aria-label="Open menu"><Menu size={20} /></button>
          <div className="min-w-0">
            <h1 className="truncate font-sans text-[15px] font-semibold leading-tight text-neutral-900 md:text-lg">{title || crumbs[crumbs.length - 1]?.label}</h1>
            <nav className="mt-0.5 hidden items-center gap-1.5 text-[13px] text-neutral-500 md:flex">{crumbs.map((c, i) => <span key={c.to} className="inline-flex items-center gap-1.5">{i > 0 && <span className="text-neutral-300">/</span>}{i === crumbs.length - 1 ? <span className="font-medium text-neutral-700">{c.label}</span> : <Link to={c.to} className="hover:text-neutral-900">{c.label}</Link>}</span>)}</nav>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <button type="button" onClick={onCmdK} className={btnGhost} title="Search admin (⌘K)"><Search size={14} /><span className="hidden sm:inline">Search</span></button>
          <span className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold lg:inline-flex ${storeOpen ? 'border-neutral-200 bg-white text-neutral-600' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><span className={`h-1.5 w-1.5 rounded-full ${storeOpen ? 'bg-emerald-500' : 'bg-amber-500'}`} />{storeOpen ? 'Store online' : 'Store locked'}</span>
          {canCreate && (
            <div className="relative" ref={createRef}>
              <button type="button" onClick={() => setCreateOpen((v) => !v)} className={btnPrimary}><Plus size={12} /> <span className="hidden sm:inline">Create</span></button>
              {createOpen && <CreateMenu onPick={() => setCreateOpen(false)} />}
            </div>
          )}
          <Link to="/" target="_blank" className={`${btnGhost} hidden md:inline-flex`} title="Open storefront"><Globe size={12} /> View store</Link>
          <button type="button" onClick={toggleDark} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} className={`${btnGhost} h-9 w-9 px-0`}>
            {dark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <NotificationBell />
          <div className="ml-0.5 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-1 pr-2 md:pr-3"><span className="grid h-7 w-7 place-items-center rounded-md bg-neutral-900 text-[12px] font-bold text-white">{initials}</span><span className="hidden text-[13px] font-semibold text-neutral-800 sm:inline">{auth?.user?.name?.split(' ')[0] || 'Admin'}</span></div>
        </div>
      </div>
    </header>
  );
}

export { Fragment };
