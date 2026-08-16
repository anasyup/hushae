import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  Activity, BadgePercent, BarChart3, ImagePlus, ChevronDown, Command, CreditCard, FileText, FolderOpen, Globe, Home,
  LayoutTemplate, LogOut, Mail, Megaphone, Menu, MessageSquare, Package, PackageX, Phone, Plus,
  Search, Settings as SettingsIcon, ShieldCheck, ShoppingBag, Signpost, Sparkles, Star, Store, Sun, Moon, Tags, TrendingUp, Truck, Users, X, Zap,
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
    match: ['/admin/orders', '/admin/payments', '/admin/abandoned-carts', '/admin/verification-queue'],
    children: [
      { to: '/admin/orders',           label: 'All orders',         icon: ShoppingBag },
      { to: '/admin/verification-queue', label: 'Verification queue', icon: Phone },
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
    match: ['/admin/promotions', '/admin/bundles', '/admin/flash-sales', '/admin/discounts', '/admin/marketing', '/admin/marketing/settings', '/admin/marketing/analytics', '/admin/email-campaigns', '/admin/banners', '/admin/banners/new', '/admin/banners/:id', '/admin/banners/slots'],
    children: [
      { to: '/admin/promotions',           label: 'Promotions',        icon: Megaphone },
      { to: '/admin/banners',                label: 'Banners',            icon: ImagePlus },
      { to: '/admin/discounts',            label: 'Discounts',         icon: BadgePercent },
      { to: '/admin/email-campaigns',      label: 'Email campaigns',   icon: Mail },
      { to: '/admin/marketing/settings',   label: 'Automation rules',  icon: SettingsIcon },
      { to: '/admin/marketing/analytics',  label: 'Performance',       icon: BarChart3 },
    ],
  },
  {
    key: 'storefront', label: 'Storefront', icon: Store,
    match: ['/admin/store', '/admin/theme', '/admin/theme-sections', '/admin/theme-legacy', '/admin/cms', '/admin/content', '/admin/faq', '/admin/markets', '/admin/blog', '/admin/navigation'],
    children: [
      { to: '/admin/store',       label: 'Online Store',    icon: Globe },
      { to: '/admin/theme',       label: 'Theme Editor',    icon: LayoutTemplate },
      { to: '/admin/theme-sections', label: 'Theme Sections', icon: LayoutTemplate },
      { to: '/admin/navigation',  label: 'Navigation',      icon: Menu },
      { to: '/admin/cms',         label: 'Pages',           icon: FileText, exact: true },
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

const NAV_ITEM = 'flex items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-[14px] transition-colors';
const navItemStyle = (isActive) => ({
  fontWeight: isActive ? 600 : 400,
  background: isActive ? '#EDEDED' : 'transparent',
  color: isActive ? 'var(--px-ink)' : 'var(--px-secondary)',
});
const linkCls = () => NAV_ITEM;
const linkStyle = ({ isActive }) => navItemStyle(isActive);
const childLinkCls = () => 'flex items-center gap-2 rounded-[8px] py-[6px] pl-7 pr-2.5 text-[14px] transition-colors';
const childLinkStyle = (active) => navItemStyle(active);

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
        className={NAV_ITEM} style={navItemStyle(isChildActive)}>
        <Icon size={14} strokeWidth={isChildActive ? 2 : 1.7} /><span className="flex-1 text-left">{group.label}</span>
        <ChevronDown size={11} className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-0.5 space-y-0.5">{group.children.map((c) => {
        const active = isChildRouteActive(loc, c.to, c.exact); const ChildIcon = c.icon;
        return <NavLink key={c.to} to={c.to} onClick={onNavigate} className={childLinkCls} style={childLinkStyle}><ChildIcon size={12} strokeWidth={1.6} style={{ color: active ? 'var(--px-accent-soft-text)' : 'var(--px-secondary)' }} />{c.label}</NavLink>;
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
    <div className="flex h-full flex-col" style={{ background: 'var(--px-bg-sidebar)', borderRight: '1px solid var(--px-border)' }}>
      <div className="px-4 pb-3 pt-5">
        <NavLink to="/admin" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="grid h-[28px] w-[28px] place-items-center rounded-[8px] text-[13px] font-bold text-white" style={{ background: 'var(--px-accent)' }} aria-hidden="true">H</span>
          <span className="text-[15px] font-semibold" style={{ color: 'var(--px-ink)' }}>HUSHAE</span>
        </NavLink>
      </div>
      {role && role !== 'admin' && role !== 'Owner' && (
        <div className="mx-4 mb-2"><p className="text-[11px] font-medium" style={{ color: 'var(--px-muted)' }}>{getRoleLabel(role)} view</p></div>
      )}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3">
        {NAV_TOP.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkCls} style={linkStyle} onClick={onNavigate}>
            {({ isActive }) => <><Icon size={16} strokeWidth={1.6} style={{ color: isActive ? 'var(--px-ink)' : 'var(--px-muted)' }} />{label}</>}
          </NavLink>
        ))}
        <div className="mt-2" />
        {visibleGroups.map((g) => <GroupDropdown key={g.label} group={g} onNavigate={onNavigate} defaultOpen={activeGroupLabel === g.label} />)}
      </nav>
      <div className="px-2.5 py-3" style={{ borderTop: '1px solid var(--px-border)' }}>
        <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-[14px] transition-colors hover:bg-[var(--px-bg-hover)]" style={{ color: 'var(--px-secondary)' }}><LogOut size={16} strokeWidth={1.6} /> Sign Out</button>
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
    <div className="grid min-h-screen place-items-center" style={{ background: "var(--px-bg-page)" }}>
      <div className="rounded-2xl border border-amber-200 bg-white p-10 text-center shadow-sm max-w-sm">
        <ShieldCheck size={36} className="mx-auto mb-3 text-amber-600" />
        <p className="text-[15px] font-semibold text-neutral-900">Access restricted</p>
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">This section is only available to Administrator and Owner roles. You are signed in as <b>{getRoleLabel(role || '')}</b>.</p>
        <Link to="/admin" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2.5 text-[15px] font-semibold text-white transition hover:bg-black">Back to Dashboard</Link>
      </div>
    </div>
  );
  return (
    <div className="admin-shell flex min-h-screen" style={{ background: "var(--px-bg-page)", color: "var(--px-ink)" }}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] md:block"><SidebarContent /></aside>
      {drawer && <div className="fixed inset-0 z-50 md:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} /><div className="absolute inset-y-0 left-0 w-64 shadow-xl"><button onClick={() => setDrawer(false)} className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-neutral-500 hover:bg-white/70"><X size={18} /></button><SidebarContent onNavigate={() => setDrawer(false)} /></div></div>}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:pl-[220px]">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 md:hidden" style={{ background: "var(--px-bg-sidebar)", borderColor: "var(--px-border)" }}><button onClick={() => setDrawer(true)} className="rounded-lg p-1.5" style={{ color: "var(--px-secondary)" }}><Menu size={20} /></button><Link to="/admin" className="text-[13px] font-semibold" style={{ color: "var(--px-ink)" }}>Hushae</Link></div>
        <TopBar title={title} auth={auth} onCmdK={() => setCmdOpen(true)} />
        <div className="min-w-0 flex-1 p-5 md:p-8">{title && <h1 className="mb-6 text-[20px] font-bold leading-tight md:hidden" style={{ color: "var(--px-ink)" }}>{title}</h1>}<div className="admin-main min-w-0">{children}</div></div>
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
  return (
    <header className="sticky top-0 z-20 hidden border-b md:block" style={{ borderColor: "var(--px-border)", background: "var(--px-bg-sidebar)" }}>
      <div className="flex items-center gap-4 px-5 py-2.5">
        {/* Store name — left */}
        <Link to="/admin" className="hidden shrink-0 items-center gap-2.5 lg:flex">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-[8px] text-[14px] font-bold text-white" style={{ background: 'var(--px-accent)' }} aria-hidden="true">H</span>
          <span className="text-[14px] font-semibold" style={{ color: 'var(--px-ink)' }}>HUSHAE</span>
        </Link>

        {/* CENTER SEARCH — the signature Shopify topbar element */}
        <button onClick={onCmdK} className="mx-auto flex w-full max-w-[540px] items-center gap-2.5 rounded-[8px] border px-3.5 py-2 text-left transition-colors hover:border-[var(--px-border-strong)]" style={{ borderColor: 'var(--px-border)', background: 'var(--px-bg-card)', color: 'var(--px-muted)' }}>
          <Search size={16} strokeWidth={1.6} aria-hidden="true" />
          <span className="flex-1 truncate text-[14px]">Search orders, products, customers…</span>
          <kbd className="hidden shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-medium sm:inline" style={{ borderColor: 'var(--px-border)', color: 'var(--px-muted)' }}>⌘K</kbd>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden items-center gap-1.5 px-2 text-[12px] xl:inline-flex" style={{ color: "var(--px-muted)" }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--px-success)" }} aria-hidden="true" />Store online</span>
          {canCreate && <div className="relative" ref={createRef}><button onClick={() => setCreateOpen((v) => !v)} className="inline-flex items-center gap-1 rounded-[8px] border px-3.5 py-[7px] text-[14px] font-medium transition-colors hover:bg-[var(--px-bg-hover)] active:scale-[0.98]" style={{ borderColor: "var(--px-border-strong)", color: "var(--px-secondary)" }}>Create <ChevronDown size={14} /></button>{createOpen && <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-[10px] border py-1" style={{ background: "var(--px-bg-card)", borderColor: "var(--px-border)", boxShadow: "var(--px-shadow-pop)" }}><Link to="/admin/products/new" onClick={() => setCreateOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors hover:bg-[var(--px-bg-hover)]" style={{ color: "var(--px-secondary)" }}><Package size={13} style={{ color: "var(--px-muted)" }} /> New product</Link><Link to="/admin/promotions/new" onClick={() => setCreateOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors hover:bg-[var(--px-bg-hover)]" style={{ color: "var(--px-secondary)" }}><Megaphone size={13} style={{ color: "var(--px-muted)" }} /> New promotion</Link><Link to="/admin/discounts" onClick={() => setCreateOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors hover:bg-[var(--px-bg-hover)]" style={{ color: "var(--px-secondary)" }}><BadgePercent size={13} style={{ color: "var(--px-muted)" }} /> New discount</Link><Link to="/admin/cms/new" onClick={() => setCreateOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors hover:bg-[var(--px-bg-hover)]" style={{ color: "var(--px-secondary)" }}><FileText size={13} style={{ color: "var(--px-muted)" }} /> New page</Link><Link to="/admin/blog/new" onClick={() => setCreateOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors hover:bg-[var(--px-bg-hover)]" style={{ color: "var(--px-secondary)" }}><FileText size={13} style={{ color: "var(--px-muted)" }} /> New blog article</Link></div>}</div>}
          <Link to="/" target="_blank" className="hidden items-center gap-1.5 rounded-[8px] border px-3.5 py-[7px] text-[14px] font-medium transition-colors hover:bg-[var(--px-bg-hover)] xl:inline-flex" style={{ borderColor: "var(--px-border-strong)", color: "var(--px-secondary)" }} title="Open storefront"><Globe size={15} strokeWidth={1.5} /> View store</Link>
          {/* ONE primary action */}
          {canCreate && <Link to="/admin/products/new" className="inline-flex items-center gap-1.5 rounded-[8px] px-4 py-[7px] text-[14px] font-medium text-[#FFFFFF] transition-colors active:scale-[0.98]" style={{ background: "var(--px-primary)" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--px-primary-hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "var(--px-primary)")}><Plus size={15} /> Add product</Link>}
          <button onClick={toggleDark} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="hidden items-center justify-center rounded-[8px] p-2 transition-colors hover:bg-[var(--px-bg-hover)] md:inline-flex" style={{ color: "var(--px-muted)" }}>
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <NotificationBell />
          <div className="ml-1 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-semibold" style={{ background: "var(--px-bg-hover)", color: "var(--px-secondary)" }}>{initials}</span><span className="hidden text-[14px] xl:inline" style={{ color: "var(--px-secondary)" }}>{auth?.user?.name?.split(' ')[0] || 'Admin'}</span></div>
        </div>
      </div>
    </header>
  );
}

export { Fragment };
