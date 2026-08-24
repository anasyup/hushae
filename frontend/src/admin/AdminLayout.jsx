import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  Activity, BadgePercent, BarChart3, ImagePlus, ChevronDown, CreditCard, FileText, FolderOpen, Globe, Home,
  LayoutTemplate, LogOut, Mail, Megaphone, Menu, MessageSquare, Package, PackageX, Phone, Plus,
  Search, Settings as SettingsIcon, ShieldCheck, ShoppingBag, Signpost, Sparkles, Star, Store, Sun, Moon, Tags, TrendingUp, Truck, Users, X, Zap, Calculator, FileSpreadsheet, PanelLeftClose, PanelRightOpen,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { applyAdminTheme, clearAdminTheme, getAdminTheme, setAdminTheme } from '../lib/adminTheme';
import ProfitCalculator from './ProfitCalculator';
import NotificationBell from './dashboard/NotificationBell';
import CommandPalette from './CommandPalette';

/* ============================================================================
 * HUSHAE ADMIN — PHASE 5 PREMIUM SHELL
 * Full visual rebuild. White + Jet Black luxury.
 * ========================================================================== */

/* ── ROLE-BASED PERMISSIONS ─────────────────────────────────────────────── */
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

const NAV_GROUPS = [
  {
    key: 'orders', label: 'Orders', icon: ShoppingBag,
    match: ['/admin/orders', '/admin/payments', '/admin/abandoned-carts', '/admin/verification-queue', '/admin/ops'],
    children: [
      { to: '/admin/orders',             label: 'All orders',          icon: ShoppingBag },
      { to: '/admin/verification-queue', label: 'Verification queue',  icon: Phone },
      { to: '/admin/abandoned-carts',    label: 'Abandoned carts',     icon: PackageX },
    ],
  },
  {
    key: 'products', label: 'Products', icon: Package,
    match: ['/admin/products', '/admin/categories', '/admin/collections', '/admin/reviews', '/admin/questions'],
    children: [
      { to: '/admin/products',    label: 'Inventory',   icon: Package },
      { to: '/admin/categories',  label: 'Categories',  icon: Tags },
      { to: '/admin/collections', label: 'Collections', icon: FolderOpen },
      { to: '/admin/reviews',     label: 'Reviews',     icon: Star },
      { to: '/admin/questions',   label: 'Questions',   icon: MessageSquare },
    ],
  },
  {
    key: 'customers', label: 'Customers', icon: Users,
    match: ['/admin/customers', '/admin/loyalty', '/admin/customers/groups'],
    children: [
      { to: '/admin/customers',        label: 'All customers', icon: Users },
      { to: '/admin/customers/groups', label: 'Groups',        icon: Users },
      { to: '/admin/loyalty',          label: 'Loyalty',       icon: Sparkles },
    ],
  },
  {
    key: 'marketing', label: 'Marketing', icon: Megaphone,
    match: ['/admin/promotions', '/admin/bundles', '/admin/flash-sales', '/admin/discounts', '/admin/marketing', '/admin/marketing/settings', '/admin/marketing/analytics', '/admin/email-campaigns', '/admin/banners', '/admin/banners/new', '/admin/banners/slots'],
    children: [
      { to: '/admin/promotions',          label: 'Promotions',       icon: Megaphone },
      { to: '/admin/bundles',             label: 'Bundles',          icon: Package },
      { to: '/admin/flash-sales',         label: 'Flash sales',      icon: Zap },
      { to: '/admin/banners',             label: 'Banners',          icon: ImagePlus },
      { to: '/admin/discounts',           label: 'Discounts',        icon: BadgePercent },
      { to: '/admin/email-campaigns',     label: 'Email campaigns',  icon: Mail },
      { to: '/admin/marketing/settings',  label: 'Automation rules', icon: SettingsIcon },
      { to: '/admin/marketing/analytics', label: 'Performance',      icon: BarChart3 },
    ],
  },
  {
    key: 'storefront', label: 'Storefront', icon: Store,
    match: ['/admin/store', '/admin/theme', '/admin/theme-sections', '/admin/theme-legacy', '/admin/cms', '/admin/cms/redirects', '/admin/content', '/admin/faq', '/admin/markets', '/admin/blog', '/admin/navigation'],
    children: [
      { to: '/admin/store',          label: 'Online Store',    icon: Globe },
      { to: '/admin/content',        label: 'Content',         icon: ImagePlus },
      { to: '/admin/theme',          label: 'Theme Editor',    icon: LayoutTemplate },
      { to: '/admin/theme-sections', label: 'Theme Sections',  icon: LayoutTemplate },
      { to: '/admin/navigation',     label: 'Navigation',      icon: Menu },
      { to: '/admin/cms',            label: 'Pages',           icon: FileText },
      { to: '/admin/cms/redirects',  label: 'Old addresses',   icon: Signpost },
      { to: '/admin/blog',           label: 'Blog',            icon: FileText },
      { to: '/admin/faq',            label: 'FAQ',             icon: FileText },
      { to: '/admin/markets',        label: 'Markets',         icon: Globe },
    ],
  },
  {
    key: 'analytics', label: 'Analytics', icon: BarChart3,
    match: ['/admin/analytics', '/admin/insights', '/admin/finance', '/admin/live', '/admin/growth', '/admin/search-analytics', '/admin/reports'],
    children: [
      { to: '/admin/analytics',        label: 'Overview',          icon: BarChart3 },
      { to: '/admin/finance',          label: 'Finance & P&L',     icon: CreditCard },
      { to: '/admin/insights',         label: 'Deep Insights',     icon: TrendingUp },
      { to: '/admin/reports',          label: 'Reports',           icon: FileSpreadsheet },
      { to: '/admin/search-analytics', label: 'Search Analytics',  icon: Search },
      { to: '/admin/live',             label: 'Live View',         icon: Activity },
      { to: '/admin/growth',           label: 'Growth',            icon: TrendingUp },
    ],
  },
  {
    key: 'settings', label: 'Settings', icon: SettingsIcon,
    match: ['/admin/settings', '/admin/apps', '/admin/backup'],
    children: [
      { to: '/admin/settings',            label: 'Settings Hub',          icon: SettingsIcon },
      { to: '/admin/settings/store',      label: 'Store Details',         icon: Store },
      { to: '/admin/settings/payments',   label: 'Payment settings',      icon: CreditCard },
      { to: '/admin/settings/cart',       label: 'Shopping Bag',          icon: ShoppingBag },
      { to: '/admin/settings/checkout',   label: 'Checkout',              icon: CreditCard },
      { to: '/admin/settings/accounts',   label: 'Customer Accounts',     icon: Users },
      { to: '/admin/settings/email',      label: 'Email & Notifications', icon: Mail },
      { to: '/admin/settings/security',   label: 'Security',              icon: ShieldCheck },
      { to: '/admin/settings/taxes',      label: 'Taxes',                 icon: Calculator },
      { to: '/admin/apps',                label: 'Integrations',          icon: Zap },
      { to: '/admin/backup',              label: 'Backup & Export',       icon: FileText },
      { to: '/admin/settings/advanced',   label: 'Advanced',              icon: SettingsIcon },
    ],
  },
];

const OPERATIONS_LINKS = [
  { to: '/admin/ops',               label: 'Operations', icon: Package },
  { to: '/admin/payments',          label: 'Payments',   icon: CreditCard },
  { to: '/admin/settings/shipping', label: 'Shipping',   icon: Truck },
];

const NAV_SECTIONS = [
  { label: 'MAIN',       items: [{ to: '/admin', label: 'Dashboard', icon: Home, end: true }] },
  { label: 'COMMERCE',   groups: ['orders', 'products', 'customers'] },
  { label: 'GROWTH',     groups: ['marketing', 'storefront', 'analytics'] },
  { label: 'OPERATIONS', links: OPERATIONS_LINKS },
  { label: 'SYSTEM',     groups: ['settings'] },
];

function rolesForGroup(key) { return ROLE_ACCESS[key] || ['admin', 'Owner']; }
function roleHasAccess(userRole, groupKey) { if (!userRole) return false; return rolesForGroup(groupKey).includes(userRole); }
function getRoleLabel(role) {
  const map = { admin: 'Administrator', Owner: 'Owner', Manager: 'Manager', Staff: 'Staff', Warehouse: 'Fulfillment', Support: 'Support' };
  return map[role] || role;
}

/* ── NAV LINK STYLES ────────────────────────────────────────────────────── */
const navLink = ({ isActive }) =>
  `v2-nav-link group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all duration-150 ${
    isActive
      ? 'bg-black text-white font-medium'
      : 'text-[#555555] hover:bg-[#F5F5F5] hover:text-black'
  }`;

const navChildLink = (active) =>
  `v2-nav-child relative flex items-center gap-2.5 rounded-md py-1.5 pl-10 pr-3 text-[13px] transition-all duration-150 ${
    active ? 'font-medium text-black' : 'text-[#777777] hover:bg-[#F5F5F5] hover:text-black'
  }`;

function isChildRouteActive(loc, to) {
  const [p, qs] = to.split('?');
  if (loc.pathname !== p) return false;
  if (qs) return loc.search.replace('?', '') === qs;
  return true;
}

/* ── GROUP DROPDOWN ─────────────────────────────────────────────────────── */
function GroupDropdown({ group, onNavigate, defaultOpen, collapsed }) {
  const loc = useLocation();
  const [open, setOpen] = useState(defaultOpen);
  const Icon = group.icon;
  const isChildActive = group.children.some((c) => isChildRouteActive(loc, c.to));
  useEffect(() => { if (isChildActive) setOpen(true); }, [isChildActive]);

  if (collapsed) {
    const first = group.children[0];
    return (
      <NavLink
        to={first?.to || '/'}
        onClick={onNavigate}
        title={group.label}
        className={`relative flex h-10 items-center justify-center rounded-md transition-all duration-150 ${
          isChildActive ? 'bg-black text-white' : 'text-[#555555] hover:bg-[#F5F5F5] hover:text-black'
        }`}
      >
        <Icon size={18} strokeWidth={isChildActive ? 2 : 1.5} />
      </NavLink>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all duration-150 ${
          isChildActive ? 'font-medium text-black' : 'text-[#555555] hover:bg-[#F5F5F5] hover:text-black'
        }`}
      >
        <Icon size={17} strokeWidth={isChildActive ? 2 : 1.5} className={`shrink-0 ${isChildActive ? 'text-black' : 'text-[#777777]'}`} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown size={14} className={`text-[#999999] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.children.map((c) => {
            const active = isChildRouteActive(loc, c.to);
            const ChildIcon = c.icon;
            return (
              <NavLink key={c.to} to={c.to} onClick={onNavigate} className={() => navChildLink(active)}>
                {active && <span aria-hidden className="absolute left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-black" />}
                <ChildIcon size={14} strokeWidth={1.5} className="opacity-60" />
                {c.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── SIDEBAR CONTENT ────────────────────────────────────────────────────── */
function SidebarContent({ onNavigate, onOpenCmd, collapsed = false }) {
  const { auth, logout } = useApp();
  const loc = useLocation();
  const role = auth?.user?.role;
  const visibleGroups = role ? NAV_GROUPS.filter((g) => roleHasAccess(role, g.key)) : NAV_GROUPS;
  const groupByKey = (k) => visibleGroups.find((g) => g.key === k);
  const activeGroupLabel = useMemo(() => {
    for (const g of visibleGroups) { if (g.match.some((m) => loc.pathname.startsWith(m))) return g.label; }
    return null;
  }, [loc.pathname, visibleGroups]);

  const initials = (auth?.user?.name || 'A').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex h-full flex-col" style={{ background: '#FFFFFF' }}>
      {/* ── Brand ──────────────────────────────────────────────────────── */}
      <div className={`shrink-0 border-b border-[#F0F0F0] ${collapsed ? 'px-3 py-5' : 'px-6 py-5'}`}>
        <NavLink to="/admin" onClick={onNavigate} className="block transition hover:opacity-70" title="Dashboard">
          {collapsed ? (
            <p className="text-center font-sans text-[18px] font-semibold tracking-[0.15em] text-black">H</p>
          ) : (
            <>
              <p className="font-sans text-[16px] font-semibold tracking-[0.35em] text-black">HUSHAE</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#999999]">Admin Console</p>
            </>
          )}
        </NavLink>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <div className={`shrink-0 ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
        <button
          type="button"
          onClick={() => onOpenCmd?.()}
          title="Search admin (⌘K)"
          className={`flex w-full items-center gap-2.5 rounded-md border border-[#EAEAEA] bg-[#FAFAFA] text-left text-[13px] text-[#777777] transition-all duration-150 hover:border-[#DCDCDC] hover:bg-white hover:text-black ${
            collapsed ? 'h-10 justify-center px-0' : 'px-3 py-2'
          }`}
        >
          <Search size={15} className="shrink-0 text-[#999999]" />
          {!collapsed && (
            <>
              <span className="flex-1">Search anything…</span>
              <kbd className="rounded border border-[#E0E0E0] bg-white px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[#999999]">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#DCDCDC transparent' }}>
        {NAV_SECTIONS.map((section) => {
          const groups = (section.groups || []).map(groupByKey).filter(Boolean);
          const items = section.items || [];
          const links = section.links || [];
          if (!groups.length && !items.length && !links.length) return null;
          return (
            <div key={section.label} className="mb-5">
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} title={collapsed ? label : undefined}
                    className={navLink} onClick={onNavigate}>
                    {({ isActive }) => (
                      <span className={`flex w-full items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                        <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                        {!collapsed && <span>{label}</span>}
                      </span>
                    )}
                  </NavLink>
                ))}
                {links.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} title={collapsed ? label : undefined}
                    className={navLink} onClick={onNavigate}>
                    {({ isActive }) => (
                      <span className={`flex w-full items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                        <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                        {!collapsed && <span>{label}</span>}
                      </span>
                    )}
                  </NavLink>
                ))}
                {groups.map((g) => (
                  <GroupDropdown key={g.label} group={g} onNavigate={onNavigate}
                    defaultOpen={activeGroupLabel === g.label} collapsed={collapsed} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className={`shrink-0 border-t border-[#F0F0F0] ${collapsed ? 'px-2 py-3' : 'px-4 py-4'}`}>
        {!collapsed && (
          <div className="mb-3 flex items-center gap-2 px-3">
            <span className="h-2 w-2 rounded-full bg-black" aria-hidden />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#555555]">Store Online</span>
          </div>
        )}
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-black text-[11px] font-semibold text-black">
            {initials}
          </span>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-black">{auth?.user?.name || 'Admin'}</p>
                <p className="truncate text-[11px] uppercase tracking-[0.1em] text-[#999999]">{getRoleLabel(role || '')}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#999999] transition-all duration-150 hover:bg-[#F5F5F5] hover:text-black"
              >
                <LogOut size={16} strokeWidth={1.5} />
              </button>
            </>
          )}
          {collapsed && (
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="grid h-10 w-10 place-items-center rounded-md text-[#999999] transition-all duration-150 hover:bg-[#F5F5F5] hover:text-black"
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── RESTRICTED PATHS ───────────────────────────────────────────────────── */
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

/* ── ADMIN LAYOUT (MAIN) ────────────────────────────────────────────────── */
export default function AdminLayout({ children, title }) {
  const { auth } = useApp();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('hushae.sidebar_collapsed') === '1'; } catch { return false; }
  });
  const role = auth?.user?.role;
  const toggleCollapsed = () => {
    setCollapsed((v) => {
      try { localStorage.setItem('hushae.sidebar_collapsed', v ? '0' : '1'); } catch { /* ignore */ }
      return !v;
    });
  };
  useEffect(() => { applyAdminTheme(); return () => clearAdminTheme(); }, []);

  const crumbs = (() => {
    const parts = loc.pathname.split('/').filter(Boolean);
    const out = [{ label: 'Home', to: '/admin' }];
    if (parts.length > 1) {
      let running = '/admin';
      for (const p of parts.slice(1)) {
        running += `/${p}`;
        out.push({ label: p.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), to: running });
      }
    }
    return out;
  })();

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
    <div className="admin-v2 grid min-h-screen place-items-center" style={{ background: '#FFFFFF' }}>
      <div className="v2-surface-card max-w-sm text-center">
        <ShieldCheck size={40} className="mx-auto mb-4 text-[#555555]" />
        <p className="v2-card-title">Access Restricted</p>
        <p className="v2-body-secondary mt-2">This section is only available to Administrator and Owner roles. You are signed in as <b>{getRoleLabel(role || '')}</b>.</p>
        <Link to="/admin" className="v2-btn v2-btn-primary v2-btn-lg mt-6">Back to Dashboard</Link>
      </div>
    </div>
  );

  return (
    <div className="admin-v2 admin-shell flex min-h-screen" style={{ background: '#FFFFFF' }}>
      {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-[#F0F0F0] bg-white transition-[width] duration-200 ease-out md:block ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        <SidebarContent onOpenCmd={() => setCmdOpen(true)} collapsed={collapsed} />
      </aside>

      {/* ── Mobile Drawer ──────────────────────────────────────────────── */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-xl">
            <button onClick={() => setDrawer(false)} className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-md text-[#777777] hover:bg-[#F5F5F5] hover:text-black">
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setDrawer(false)} onOpenCmd={() => { setDrawer(false); setCmdOpen(true); }} />
          </div>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className={`flex min-h-screen min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out ${collapsed ? 'md:pl-[72px]' : 'md:pl-[260px]'}`}>
        <TopBar title={title} auth={auth} onCmdK={() => setCmdOpen(true)} onMenu={() => setDrawer(true)} onToggleSidebar={toggleCollapsed} collapsed={collapsed} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full min-w-0 max-w-[1600px] px-4 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6 hidden items-center gap-1.5 text-[12px] md:flex">
              {crumbs.map((c, i) => (
                <span key={c.to} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span className="text-[#DCDCDC]">/</span>}
                  {i === crumbs.length - 1 ? (
                    <span className="font-medium text-[#555555]">{c.label}</span>
                  ) : (
                    <Link to={c.to} className="text-[#999999] transition-colors duration-150 hover:text-black">{c.label}</Link>
                  )}
                </span>
              ))}
            </nav>
            {title && <h1 className="v2-page-title mb-8 md:hidden">{title}</h1>}
            {children}
          </div>
        </main>
      </div>

      <ProfitCalculator />
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  );
}

/* ── CREATE MENU ────────────────────────────────────────────────────────── */
function CreateMenu({ onPick }) {
  const items = [
    { to: '/admin/products/new',    icon: Package,    label: 'New product' },
    { to: '/admin/promotions/new',  icon: Megaphone,  label: 'New promotion' },
    { to: '/admin/discounts',       icon: BadgePercent, label: 'New discount' },
    { to: '/admin/cms/new',         icon: FileText,   label: 'New page' },
    { to: '/admin/blog/new',        icon: FileText,   label: 'New blog article' },
  ];
  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-60 rounded-lg border border-[#EAEAEA] bg-white py-1.5" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link key={it.to} to={it.to} onClick={onPick} className="flex h-10 items-center gap-3 px-4 text-[13px] text-[#555555] transition-colors hover:bg-[#F5F5F5] hover:text-black">
            <Icon size={15} strokeWidth={1.5} className="text-[#999999]" />
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}

/* ── TOP BAR ────────────────────────────────────────────────────────────── */
function TopBar({ title, auth, onCmdK, onMenu, onToggleSidebar, collapsed }) {
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

  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center border-b border-[#F0F0F0] bg-white/95 backdrop-blur-sm">
      <div className="flex w-full items-center justify-between px-4 md:px-8">
        {/* Left: Menu toggle + Title */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button type="button" onClick={onMenu} className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[#555555] hover:bg-[#F5F5F5] md:hidden" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-10 w-10 shrink-0 place-items-center rounded-md text-[#999999] transition-colors duration-150 hover:bg-[#F5F5F5] hover:text-black md:grid"
          >
            {collapsed ? <PanelRightOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-black">
              {title || crumbs[crumbs.length - 1]?.label}
            </h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Search */}
          <button
            type="button"
            onClick={onCmdK}
            className="hidden h-9 items-center gap-2.5 rounded-md border border-[#EAEAEA] bg-[#FAFAFA] px-3.5 text-[13px] text-[#777777] transition-all duration-150 hover:border-[#DCDCDC] hover:bg-white hover:text-black sm:inline-flex"
            title="Search anything (⌘K)"
          >
            <Search size={14} />
            <span className="hidden md:inline">Search…</span>
            <kbd className="hidden rounded border border-[#E0E0E0] bg-white px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[#999999] lg:inline">⌘K</kbd>
          </button>

          {/* Store status */}
          <span className={`hidden items-center gap-2 text-[12px] lg:inline-flex ${storeOpen ? 'text-[#555555]' : 'font-medium text-black'}`}>
            <span className={`h-2 w-2 rounded-full ${storeOpen ? 'bg-[#999999]' : 'bg-black'}`} />
            {storeOpen ? 'Store online' : 'Store locked'}
          </span>

          {/* Create */}
          {canCreate && (
            <div className="relative" ref={createRef}>
              <button
                type="button"
                onClick={() => setCreateOpen((v) => !v)}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-black px-4 text-[13px] font-medium text-black transition-all duration-150 hover:bg-[#1a1a1a]"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Create</span>
              </button>
              {createOpen && <CreateMenu onPick={() => setCreateOpen(false)} />}
            </div>
          )}

          {/* View store */}
          <Link
            to="/"
            target="_blank"
            className="hidden h-9 items-center gap-2 rounded-md border border-[#EAEAEA] px-3 text-[13px] font-medium text-[#555555] transition-all duration-150 hover:border-[#DCDCDC] hover:bg-[#F5F5F5] hover:text-black md:inline-flex"
            title="Open storefront"
          >
            <Globe size={14} />
            View store
          </Link>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleDark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="grid h-9 w-9 place-items-center rounded-md text-[#999999] transition-all duration-150 hover:bg-[#F5F5F5] hover:text-black"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* User avatar */}
          <div className="ml-1 flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-black text-[11px] font-semibold text-black">{initials}</span>
            <span className="hidden text-[13px] font-medium text-black sm:inline">{auth?.user?.name?.split(' ')[0] || 'Admin'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export { Fragment };
