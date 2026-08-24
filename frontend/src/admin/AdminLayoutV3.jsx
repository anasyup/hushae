import { Fragment, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, ShoppingBag, Package, Users, Palette, FileText, Navigation as NavIcon, Image, BookOpen, HelpCircle, Search as SearchIcon,
  Megaphone, Mail, BadgePercent, Layers, Zap, ImagePlus, Settings2,
  Truck, RotateCcw, MessageSquare, Factory, Warehouse,
  CreditCard, ShieldCheck, Receipt, Calculator, DollarSign, TrendingUp,
  BarChart3, Activity, PieChart, Eye,
  Settings, Plug, UserCog, Lock, Database, FileCode, ChevronDown, ChevronRight,
  Plus, Menu, X, PanelLeftClose, PanelRightOpen, Bell, Globe, LogOut, Sun, Moon,
  Command, ExternalLink, Store,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { applyAdminTheme, clearAdminTheme, getAdminTheme, setAdminTheme } from '../lib/adminTheme';
import ProfitCalculator from './ProfitCalculator';
import NotificationBell from './dashboard/NotificationBell';
import CommandPalette from './CommandPalette';

/* ============================================================================
 * HUSHAE ADMIN SHELL V3 — Phase 11
 * Unified Premium Commerce Operating System
 * ========================================================================== */

/* ── ROLE-BASED PERMISSIONS (preserved from Phase 1-10) ─────────────────── */
const ALL_ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];
const ROLE_ACCESS = {
  orders:     ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'],
  products:   ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse'],
  customers:  ['admin', 'Owner', 'Manager', 'Staff', 'Support'],
  marketing:  ['admin', 'Owner', 'Manager'],
  storefront: ['admin', 'Owner', 'Manager'],
  analytics:  ['admin', 'Owner', 'Manager', 'Staff'],
  finance:    ['admin', 'Owner', 'Manager'],
  operations: ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse'],
  settings:   ['admin', 'Owner'],
  system:     ['admin', 'Owner'],
};

function hasAccess(role, group) {
  if (!role || role === 'admin' || role === 'Owner') return true;
  return (ROLE_ACCESS[group] || []).includes(role);
}

function getRoleLabel(role) {
  const map = { admin: 'Administrator', Owner: 'Owner', Manager: 'Manager', Staff: 'Staff', Warehouse: 'Fulfillment', Support: 'Support' };
  return map[role] || role;
}

/* ── NAVIGATION STRUCTURE (Phase 11 Information Architecture) ───────────── */
const NAV = [
  {
    section: null,
    items: [
      { to: '/admin', label: 'Dashboard', icon: Home, exact: true, group: 'orders' },
    ],
  },
  {
    section: 'Commerce',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, group: 'orders',
        children: [
          { to: '/admin/orders', label: 'All Orders' },
          { to: '/admin/orders/new', label: 'Create Order' },
          { to: '/admin/verification-queue', label: 'Verification' },
        ],
      },
      { to: '/admin/products', label: 'Products', icon: Package, group: 'products',
        children: [
          { to: '/admin/products', label: 'Catalog' },
          { to: '/admin/categories', label: 'Categories' },
          { to: '/admin/collections', label: 'Collections' },
          { to: '/admin/reviews', label: 'Reviews' },
          { to: '/admin/questions', label: 'Questions' },
        ],
      },
      { to: '/admin/customers', label: 'Customers', icon: Users, group: 'customers',
        children: [
          { to: '/admin/customers', label: 'All Customers' },
          { to: '/admin/customers/groups', label: 'Groups' },
          { to: '/admin/loyalty', label: 'Loyalty' },
        ],
      },
    ],
  },
  {
    section: 'Storefront',
    items: [
      { to: '/admin/theme', label: 'Theme Editor', icon: Palette, group: 'storefront' },
      { to: '/admin/cms', label: 'Pages', icon: FileText, group: 'storefront' },
      { to: '/admin/navigation', label: 'Navigation', icon: NavIcon, group: 'storefront' },
      { to: '/admin/blog', label: 'Blog', icon: BookOpen, group: 'storefront' },
      { to: '/admin/content', label: 'Media', icon: Image, group: 'storefront' },
      { to: '/admin/faq', label: 'FAQ', icon: HelpCircle, group: 'storefront' },
    ],
  },
  {
    section: 'Marketing',
    items: [
      { to: '/admin/marketing', label: 'Overview', icon: Megaphone, group: 'marketing' },
      { to: '/admin/promotions', label: 'Promotions', icon: Zap, group: 'marketing',
        children: [
          { to: '/admin/promotions', label: 'All Promotions' },
          { to: '/admin/bundles', label: 'Bundles' },
          { to: '/admin/flash-sales', label: 'Flash Sales' },
        ],
      },
      { to: '/admin/discounts', label: 'Discounts', icon: BadgePercent, group: 'marketing' },
      { to: '/admin/banners', label: 'Banners', icon: ImagePlus, group: 'marketing' },
      { to: '/admin/email-campaigns', label: 'Campaigns', icon: Mail, group: 'marketing' },
      { to: '/admin/marketing/settings', label: 'Automation', icon: Settings2, group: 'marketing' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/admin/ops', label: 'Overview', icon: Factory, group: 'operations' },
      { to: '/admin/ops/inventory', label: 'Inventory', icon: Warehouse, group: 'operations' },
      { to: '/admin/ops/returns', label: 'Returns', icon: RotateCcw, group: 'operations' },
      { to: '/admin/ops/comms', label: 'Communications', icon: MessageSquare, group: 'operations' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { to: '/admin/finance', label: 'Overview', icon: DollarSign, group: 'finance' },
      { to: '/admin/payments', label: 'Payments', icon: CreditCard, group: 'finance' },
      { to: '/admin/settings/taxes', label: 'Taxes', icon: Calculator, group: 'finance' },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { to: '/admin/analytics', label: 'Overview', icon: BarChart3, group: 'analytics' },
      { to: '/admin/insights', label: 'Insights', icon: PieChart, group: 'analytics' },
      { to: '/admin/search-analytics', label: 'Search', icon: SearchIcon, group: 'analytics' },
      { to: '/admin/live', label: 'Live View', icon: Eye, group: 'analytics' },
      { to: '/admin/reports', label: 'Reports', icon: FileText, group: 'analytics' },
      { to: '/admin/growth', label: 'Growth', icon: TrendingUp, group: 'analytics' },
    ],
  },
  {
    section: 'System',
    items: [
      { to: '/admin/settings', label: 'Settings', icon: Settings, group: 'settings',
        children: [
          { to: '/admin/settings', label: 'General' },
          { to: '/admin/settings/store', label: 'Store' },
          { to: '/admin/settings/payments', label: 'Payments' },
          { to: '/admin/settings/shipping', label: 'Shipping' },
          { to: '/admin/settings/checkout', label: 'Checkout' },
          { to: '/admin/settings/email', label: 'Email' },
          { to: '/admin/settings/accounts', label: 'Accounts' },
          { to: '/admin/settings/security', label: 'Security' },
        ],
      },
      { to: '/admin/apps', label: 'Integrations', icon: Plug, group: 'system' },
      { to: '/admin/settings/security', label: 'Security', icon: Lock, group: 'system' },
      { to: '/admin/backup', label: 'Backups', icon: Database, group: 'system' },
    ],
  },
];

/* ── SIDEBAR COMPONENTS ─────────────────────────────────────────────────── */

function SidebarLink({ item, collapsed, onNavigate }) {
  const loc = useLocation();
  const isActive = item.exact
    ? loc.pathname === item.to
    : loc.pathname.startsWith(item.to) && !item.children?.some(c => loc.pathname === c.to);

  if (collapsed) {
    return (
      <NavLink to={item.to} onClick={onNavigate} title={item.label}
        className={`flex h-10 w-10 items-center justify-center rounded-[5px] transition-colors ${isActive ? 'bg-[#EDEEF0] text-[#111]' : 'text-[#6B7280] hover:bg-[#F0F1F3] hover:text-[#111]'}`}>
        <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
      </NavLink>
    );
  }

  if (!item.children) {
    return (
      <NavLink to={item.to} onClick={onNavigate} end={item.exact}
        className={`v3-sidebar-link ${isActive ? 'active' : ''}`}>
        <span className="v3-sidebar-link-dot" />
        {item.label}
      </NavLink>
    );
  }

  return <SidebarGroup item={item} isActive={isActive} onNavigate={onNavigate} />;
}

function SidebarGroup({ item, isActive, onNavigate }) {
  const loc = useLocation();
  const [open, setOpen] = useState(isActive || item.children?.some(c => loc.pathname.startsWith(c.to)));
  const Icon = item.icon;
  const childActive = item.children?.some(c => loc.pathname === c.to);
  const groupActive = isActive || childActive;

  useEffect(() => {
    if (groupActive) setOpen(true);
  }, [groupActive]);

  return (
    <div className="v3-sidebar-group">
      <button onClick={() => setOpen(!open)}
        className={`v3-sidebar-group-toggle ${groupActive ? 'active' : ''}`}>
        <Icon size={18} strokeWidth={groupActive ? 2 : 1.5} className="v3-sidebar-group-icon" />
        <span style={{ flex: 1 }}>{item.label}</span>
        <ChevronDown size={14} className={`v3-sidebar-group-chevron ${open ? 'open' : ''}`} />
      </button>
      {open && (
        <div className="v3-sidebar-group-children">
          {item.children.map(child => {
            const active = loc.pathname === child.to;
            return (
              <NavLink key={child.to} to={child.to} onClick={onNavigate}
                className={`v3-sidebar-link ${active ? 'active' : ''}`}>
                <span className="v3-sidebar-link-dot" />
                {child.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Sidebar({ collapsed, onNavigate, onOpenCmd }) {
  const { auth, logout } = useApp();
  const role = auth?.user?.role;
  const initials = (auth?.user?.name || 'A').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={`v3-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand */}
      <div className="v3-sidebar-brand">
        {collapsed ? (
          <Link to="/admin" onClick={onNavigate} className="block text-center">
            <span className="text-[16px] font-bold tracking-[0.15em] text-[#111]">H</span>
          </Link>
        ) : (
          <Link to="/admin" onClick={onNavigate} className="block">
            <span className="v3-sidebar-brand-text">Hushae</span>
            <span className="block text-[10px] font-medium tracking-[0.12em] text-[#9CA3AF] mt-0.5 uppercase">Commerce Admin</span>
          </Link>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="v3-sidebar-search">
          <div className="relative">
            <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <button onClick={onOpenCmd} className="v3-sidebar-search-input text-left cursor-pointer" style={{ paddingLeft: 32 }}>
              Search…
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-medium tracking-wider text-[#C4C7CC]">⌘K</span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="v3-sidebar-nav">
        {NAV.map((group, gi) => {
          const visibleItems = group.items.filter(item => hasAccess(role, item.group));
          if (!visibleItems.length) return null;
          return (
            <div key={gi}>
              {group.section && !collapsed && (
                <div className="v3-sidebar-section">
                  <span className="v3-sidebar-section-label">{group.section}</span>
                </div>
              )}
              {group.section && collapsed && <div className="my-2 mx-3 border-t border-[#E5E7EB]" />}
              {visibleItems.map(item => (
                <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="v3-sidebar-footer">
        <div className="v3-sidebar-user" onClick={logout}>
          <span className="v3-sidebar-avatar">{initials}</span>
          {!collapsed && (
            <div className="v3-sidebar-user-info">
              <div className="v3-sidebar-user-name">{auth?.user?.name || 'Admin'}</div>
              <div className="v3-sidebar-user-role">{getRoleLabel(role)}</div>
            </div>
          )}
          {!collapsed && <LogOut size={14} className="text-[#9CA3AF] flex-shrink-0" />}
        </div>
      </div>
    </div>
  );
}

/* ── TOPBAR ─────────────────────────────────────────────────────────────── */

function Topbar({ title, auth, onCmdK, onMenu, onToggleSidebar, collapsed }) {
  const { settings } = useApp();
  const loc = useLocation();
  const nav = useNavigate();
  const storeOpen = settings?.storefrontLock?.enabled !== true;
  const [createOpen, setCreateOpen] = useState(false);
  const [dark, setDark] = useState(() => getAdminTheme() === 'dark');
  const createRef = useRef(null);
  const role = auth?.user?.role;
  const canCreate = !role || role === 'admin' || role === 'Owner' || role === 'Manager';

  const toggleDark = () => { const next = !dark; setDark(next); setAdminTheme(next ? 'dark' : 'light'); };

  useEffect(() => {
    if (!createOpen) return;
    const onDoc = (e) => { if (createRef.current && !createRef.current.contains(e.target)) setCreateOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setCreateOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [createOpen]);

  const pageTitle = title || (() => {
    const path = loc.pathname;
    for (const group of NAV) {
      for (const item of group.items) {
        if (item.children) {
          for (const child of item.children) {
            if (path === child.to) return child.label;
          }
        }
        if (item.exact ? path === item.to : path.startsWith(item.to)) return item.label;
      }
    }
    return 'Admin';
  })();

  const createItems = [
    { to: '/admin/products/new', icon: Package, label: 'Product' },
    { to: '/admin/orders/new', icon: ShoppingBag, label: 'Order' },
    { to: '/admin/promotions/new', icon: Zap, label: 'Promotion' },
    { to: '/admin/discounts', icon: BadgePercent, label: 'Discount' },
    { to: '/admin/cms/new', icon: FileText, label: 'Page' },
    { to: '/admin/blog/new', icon: BookOpen, label: 'Blog Article' },
    { to: '/admin/email-campaigns', icon: Mail, label: 'Campaign' },
  ];

  return (
    <header className="v3-topbar">
      <div className="v3-topbar-left">
        <button onClick={onMenu} className="v3-btn v3-btn-icon v3-btn-ghost md:hidden" aria-label="Menu">
          <Menu size={18} />
        </button>
        <button onClick={onToggleSidebar} className="v3-btn v3-btn-icon v3-btn-ghost hidden md:flex" aria-label="Toggle sidebar">
          {collapsed ? <PanelRightOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <h1 className="v3-topbar-title">{pageTitle}</h1>
      </div>
      <div className="v3-topbar-right">
        <button onClick={onCmdK} className="v3-btn v3-btn-secondary v3-btn-sm hidden sm:flex" style={{ gap: 8 }}>
          <SearchIcon size={13} />
          <span>Search</span>
          <span className="text-[9px] font-medium tracking-wider text-[#C4C7CC] ml-2">⌘K</span>
        </button>

        <div className="v3-topbar-status hidden lg:flex">
          <span className={`v3-topbar-status-dot ${storeOpen ? 'online' : ''}`} />
          {storeOpen ? 'Store online' : 'Store locked'}
        </div>

        {canCreate && (
          <div className="relative" ref={createRef}>
            <button onClick={() => setCreateOpen(!createOpen)} className="v3-btn v3-btn-primary v3-btn-sm">
              <Plus size={13} />
              <span className="hidden sm:inline">Create</span>
            </button>
            {createOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[#E5E7EB] rounded-[5px] py-1 z-50" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                {createItems.map(item => (
                  <Link key={item.to} to={item.to} onClick={() => setCreateOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-[#4A4A4A] hover:bg-[#F5F6F8] hover:text-[#111] transition-colors">
                    <item.icon size={14} className="text-[#9CA3AF]" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <Link to="/" target="_blank" className="v3-btn v3-btn-icon v3-btn-ghost hidden md:flex" title="View storefront">
          <Globe size={15} />
        </Link>

        <button onClick={toggleDark} className="v3-btn v3-btn-icon v3-btn-ghost" title={dark ? 'Light mode' : 'Dark mode'}>
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <NotificationBell />
      </div>
    </header>
  );
}

/* ── RESTRICTED PATHS (preserved) ───────────────────────────────────────── */
const RESTRICTED_PATHS = [
  { prefix: '/admin/settings', key: 'settings' },
  { prefix: '/admin/theme', key: 'storefront' },
  { prefix: '/admin/cms', key: 'storefront' },
  { prefix: '/admin/store', key: 'storefront' },
  { prefix: '/admin/markets', key: 'storefront' },
  { prefix: '/admin/content', key: 'storefront' },
  { prefix: '/admin/blog', key: 'storefront' },
  { prefix: '/admin/navigation', key: 'storefront' },
  { prefix: '/admin/faq', key: 'storefront' },
  { prefix: '/admin/marketing', key: 'marketing' },
  { prefix: '/admin/promotions', key: 'marketing' },
  { prefix: '/admin/bundles', key: 'marketing' },
  { prefix: '/admin/flash-sales', key: 'marketing' },
  { prefix: '/admin/discounts', key: 'marketing' },
  { prefix: '/admin/email-campaigns', key: 'marketing' },
  { prefix: '/admin/banners', key: 'marketing' },
  { prefix: '/admin/finance', key: 'finance' },
  { prefix: '/admin/analytics', key: 'analytics' },
  { prefix: '/admin/insights', key: 'analytics' },
  { prefix: '/admin/growth', key: 'analytics' },
  { prefix: '/admin/search-analytics', key: 'analytics' },
  { prefix: '/admin/live', key: 'analytics' },
  { prefix: '/admin/apps', key: 'system' },
  { prefix: '/admin/backup', key: 'system' },
  { prefix: '/admin/loyalty', key: 'customers' },
];

function isPathBlocked(pathname, role) {
  if (!role || role === 'admin' || role === 'Owner') return false;
  for (const r of RESTRICTED_PATHS) {
    if (pathname.startsWith(r.prefix) && !hasAccess(role, r.key)) return true;
  }
  return false;
}

/* ── MAIN LAYOUT ────────────────────────────────────────────────────────── */

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
    setCollapsed(v => {
      try { localStorage.setItem('hushae.sidebar_collapsed', v ? '0' : '1'); } catch {}
      return !v;
    });
  };

  useEffect(() => { applyAdminTheme(); return () => clearAdminTheme(); }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!auth) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  if (!ALL_ROLES.includes(role || '')) return <Navigate to="/admin/login" replace />;

  if (isPathBlocked(loc.pathname, role)) {
    return (
      <div className="v3-admin">
        <div className="grid min-h-screen place-items-center">
          <div className="v3-card-flat max-w-sm text-center">
            <ShieldCheck size={32} className="mx-auto mb-3 text-[#6B7280]" />
            <p className="v3-h-card">Access Restricted</p>
            <p className="v3-h-small mt-2">This section requires higher permissions. You are signed in as <strong>{getRoleLabel(role)}</strong>.</p>
            <Link to="/admin" className="v3-btn v3-btn-primary mt-4">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="v3-admin v3-shell">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onOpenCmd={() => setCmdOpen(true)} />
      </div>

      {/* Mobile Drawer */}
      {drawer && (
        <>
          <div className="v3-drawer-overlay md:hidden" onClick={() => setDrawer(false)} />
          <div className="v3-sidebar mobile-open md:hidden" style={{ display: 'flex', width: 280 }}>
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-4 z-10">
              <X size={18} className="text-[#6B7280]" />
            </button>
            <Sidebar onNavigate={() => setDrawer(false)} onOpenCmd={() => { setDrawer(false); setCmdOpen(true); }} />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className={`v3-content ${collapsed ? 'collapsed' : ''}`}>
        <Topbar title={title} auth={auth} onCmdK={() => setCmdOpen(true)} onMenu={() => setDrawer(true)} onToggleSidebar={toggleCollapsed} collapsed={collapsed} />
        <main className="v3-page">
          {children}
        </main>
      </div>

      <ProfitCalculator />
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  );
}

export { Fragment };
