/**
 * HUSHAE ADMIN LAYOUT - JET BLACK & WHITE LUXURY DESIGN
 * ====================================================
 * Complete sidebar rebuild with premium UX
 * Features: Workspace Switcher, Global Search, Inbox, Quick Create
 * Color Scheme: Jet Black (#0A0A0A) + Pure White (#FFFFFF)
 * Structure: All sections (HOME, INBOX, COMMERCE, STOREFRONT, GROWTH, OPERATIONS, CHANNELS, APPS, SETTINGS)
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  // Top Bar Icons
  Menu, PanelLeftClose, PanelRightOpen, Sun, Moon, Globe, Plus, Search, ChevronDown, X, Eye,
  // Workspace Icons
  Building2, Home, Clock,
  // Inbox Icons
  Bell, MessageSquare,
  // Commerce Icons
  ShoppingBag, ShoppingCart, Package, Users, Tag, Box, Star, MessageCircle, PackagePlus, BadgePercent, Megaphone,
  // Storefront Icons
  LayoutTemplate, FileText, ImagePlus, FolderOpen, Code2,
  // Growth Icons
  BarChart3, TrendingUp, Zap,
  // Operations Icons
  PackageCheck, Truck, CreditCard, Calculator, FileSpreadsheet,
  // Channels Icons
  Store, Smartphone, Share2, ShoppingCart as MarketplaceIcon,
  // Apps Icons
  Plug, Grid3X3,
  // Settings Icons
  Settings, ShieldCheck, UserCog, DollarSign, HelpCircle, LogOut, Banknote
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { applyAdminTheme, clearAdminTheme, getAdminTheme, setAdminTheme } from '../lib/adminTheme';
import CommandPalette from './CommandPalette';
import SettingsRail from './settings/SettingsRail';
import './orders/orders-desk.css'; /* shared od-* design system for all admin pages */
import NotificationBell from './dashboard/NotificationBell';

/* ============================================================================
 * ROLE-BASED PERMISSIONS
 * ========================================================================== */

const ALL_ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

export const ROLE_ACCESS = {
  orders: ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'],
  products: ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse'],
  customers: ['admin', 'Owner', 'Manager', 'Staff', 'Support'],
  marketing: ['admin', 'Owner', 'Manager'],
  storefront: ['admin', 'Owner', 'Manager'],
  analytics: ['admin', 'Owner', 'Manager', 'Staff'],
  settings: ['admin', 'Owner'],
  apps: ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'],
  integrations: ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'],
  sync: ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'],
};

/* ============================================================================
 * NAVIGATION STRUCTURE - FINAL VERSION
 * ========================================================================== */

// DEFAULT VISIBLE ITEMS (Simplified Sidebar)
const DEFAULT_NAV = [
  { to: '/admin', label: 'Home', icon: Home, end: true },
  { to: '/admin/inbox', label: 'Inbox', icon: Bell },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/storefront', label: 'Storefront', icon: LayoutTemplate },
  { to: '/admin/marketing', label: 'Marketing', icon: Megaphone },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/channels', label: 'Channels', icon: Store },
  { to: '/admin/apps', label: 'Apps', icon: Plug },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

// ADVANCED ITEMS (For Power Users)
const ADVANCED_NAV = [
  { to: '/admin/operations', label: 'Operations', icon: PackageCheck },
  { to: '/admin/payments', label: 'Payments & Finance', icon: CreditCard },
  { to: '/admin/taxes', label: 'Taxes & Duties', icon: Calculator },
  { to: '/admin/markets', label: 'Markets', icon: Globe },
  { to: '/admin/pos', label: 'POS', icon: ShoppingCart },
  { to: '/admin/api', label: 'API', icon: Code2 },
  { to: '/admin/webhooks', label: 'Webhooks', icon: Share2 },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileSpreadsheet },
  { to: '/admin/developer', label: 'Developer Tools', icon: Settings },
];

// FULL NAVIGATION STRUCTURE
const NAV_SECTIONS = [
  {
    label: 'HOME',
    icon: Home,
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutTemplate, end: true },
      { to: '/admin/setup', label: 'Setup Guide', icon: Settings },
    ],
  },
  {
    label: 'COMMERCE',
    icon: ShoppingBag,
    groups: [
      {
        key: 'orders',
        label: 'Orders',
        icon: ShoppingCart,
        children: [
          /* One entry per distinct destination. Pipeline states (pending,
             processing, shipped, delivered, cancelled, returns, refunds)
             live inside the All Orders desk as tabs/filters — listing them
             here too put the same option in two places. */
          { to: '/admin/orders', label: 'All Orders', icon: ShoppingBag },
          { to: '/admin/orders/draft', label: 'Draft Orders', icon: FileText },
          { to: '/admin/abandoned-carts', label: 'Abandoned Checkouts', icon: Package },
          { to: '/admin/orders/issues', label: 'Payment Issues', icon: ShieldCheck },
          { to: '/admin/cod-recon', label: 'COD Reconciliation', icon: DollarSign },
        ],
      },
      {
        key: 'products',
        label: 'Products',
        icon: Package,
        children: [
          { to: '/admin/products', label: 'Products', icon: Package },
          { to: '/admin/products/inventory', label: 'Inventory', icon: Box },
          { to: '/admin/categories', label: 'Categories', icon: Tag },
          { to: '/admin/collections', label: 'Collections', icon: FolderOpen },
          { to: '/admin/reviews', label: 'Reviews & Questions', icon: Star },
          { to: '/admin/products/attributes', label: 'Attributes & Variants', icon: Settings },
          { to: '/admin/products/bundles', label: 'Bundles & Kits', icon: Package },
          { to: '/admin/products/digital', label: 'Digital Products', icon: FileText },
          { to: '/admin/products/import', label: 'Import / Export', icon: FileSpreadsheet },
          { to: '/admin/products/settings', label: 'Product Settings', icon: Settings },
        ],
      },
      {
        key: 'customers',
        label: 'Customers',
        icon: Users,
        children: [
          { to: '/admin/customers', label: 'All Customers', icon: Users },
          { to: '/admin/customers/profiles', label: 'Customer Profiles', icon: UserCog },
          { to: '/admin/customers/groups', label: 'Customer Groups', icon: Users },
          { to: '/admin/customers/segments', label: 'Customer Segments', icon: BarChart3 },
          { to: '/admin/loyalty', label: 'Loyalty', icon: Star },
          { to: '/admin/customers/credit', label: 'Store Credit', icon: DollarSign },
          { to: '/admin/customers/b2b', label: 'Companies / B2B', icon: Building2 },
          { to: '/admin/customers/settings', label: 'Customer Settings', icon: Settings },
        ],
      },
    ],
  },
  {
    label: 'GROWTH',
    icon: TrendingUp,
    items: [
      { to: '/admin/marketing', label: 'Marketing', icon: Megaphone },
      { to: '/admin/discounts', label: 'Discounts', icon: BadgePercent },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/admin/email-campaigns', label: 'Email Campaigns', icon: FileText },
    ],
  },
  {
    label: 'OPERATIONS',
    icon: PackageCheck,
    items: [
      { to: '/admin/cod', label: 'COD Command', icon: Banknote },
      { to: '/admin/ops/inventory', label: 'Inventory & Stock', icon: Box },
      { to: '/admin/ops', label: 'Fulfillment & Returns', icon: Truck },
      { to: '/admin/settings/shipping', label: 'Shipping & Delivery', icon: Truck },
      { to: '/admin/settings/payments', label: 'Payments', icon: CreditCard },
      { to: '/admin/settings/taxes', label: 'Taxes & Duties', icon: Calculator },
      { to: '/admin/finance', label: 'Finance', icon: DollarSign },
      { to: '/admin/finance/transactions', label: 'Transactions', icon: CreditCard },
    ],
  },
  {
    label: 'APPS & INTEGRATIONS',
    icon: Plug,
    items: [
      { to: '/admin/apps', label: 'Apps & Integrations', icon: Plug },
    ],
  },
];

/* ============================================================================
 * HELPER FUNCTIONS
 * ========================================================================== */

function rolesForGroup(key) { return ROLE_ACCESS[key] || ['admin', 'Owner']; }
function roleHasAccess(userRole, groupKey) {
  if (!userRole) return false;
  return rolesForGroup(groupKey).includes(userRole);
}
export function getRoleLabel(role) {
  const map = {
    admin: 'Administrator',
    Owner: 'Owner',
    Manager: 'Manager',
    Staff: 'Staff',
    Warehouse: 'Fulfillment',
    Support: 'Support'
  };
  return map[role] || role;
}

/* ============================================================================
 * RESTRICTED PATHS
 * ========================================================================== */

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
  { prefix: '/admin/finance', key: 'analytics' },
  { prefix: '/admin/analytics', key: 'analytics' },
  { prefix: '/admin/insights', key: 'analytics' },
  { prefix: '/admin/growth', key: 'analytics' },
  { prefix: '/admin/search-analytics', key: 'analytics' },
  { prefix: '/admin/live', key: 'analytics' },
  { prefix: '/admin/apps', key: 'settings' },
  { prefix: '/admin/backup', key: 'settings' },
  { prefix: '/admin/loyalty', key: 'customers' },
];

function isPathBlocked(pathname, role) {
  if (!role || role === 'admin' || role === 'Owner') return false;
  for (const r of RESTRICTED_PATHS) {
    if (pathname.startsWith(r.prefix) && !roleHasAccess(role, r.key)) return true;
  }
  return false;
}

/* ============================================================================
 * WORKSPACE SWITCHER COMPONENT
 * ========================================================================== */

function WorkspaceSwitcher() {
  const { auth } = useApp();
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState([]);
  
  // Mock data for now - will be replaced with real API call
  const mockStores = [
    { id: '1', name: 'HUSHAE', current: true },
    { id: '2', name: 'Store 2', current: false },
    { id: '3', name: 'Store 3', current: false },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111111] hover:bg-[#1E1E1E] transition-colors text-white text-sm font-medium"
      >
        <Building2 size={14} />
        <span>HUSHAE</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-[#111111] border border-[#252525] rounded-lg shadow-lg py-1 z-50">
          <div className="px-3 py-1.5 text-xs text-[#6B6B6B] uppercase tracking-wider">Current Store</div>
          {mockStores.map(store => (
            <div key={store.id} className="px-3 py-1.5">
              <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${store.current ? 'bg-[#1E1E1E] text-white' : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-white'}`}>
                <Building2 size={14} />
                <span className="text-sm">{store.name}</span>
                {store.current && <span className="ml-auto text-xs bg-[#252525] px-1.5 py-0.5 rounded">Current</span>}
              </div>
            </div>
          ))}
          <div className="border-t border-[#252525] mt-1 pt-1">
            <Link to="/admin/workspace" className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-white">
              <Building2 size={14} />
              All Stores
            </Link>
            <Link to="/admin/workspace/new" className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-white">
              <Plus size={14} />
              Add New Store
            </Link>
          </div>
          <div className="border-t border-[#252525] mt-1 pt-1">
            <Link to="/admin/workspace/settings" className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-white">
              <Settings size={14} />
              Workspace Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * GROUP DROPDOWN COMPONENT (Collapsible)
 * ========================================================================== */

function GroupDropdown({ group, expanded, onToggle, collapsed, onNavigate }) {
  const loc = useLocation();
  const Icon = group.icon;

  /* Groups declare their children as `children` or `items` — accept both so a
     group without either still renders as a plain row instead of crashing. */
  const groupItems = group.children || group.items || [];
  const isActive = groupItems.some((child) =>
    loc.pathname === child.to || loc.pathname.startsWith(child.to + '/')
  );
  const chevron = <ChevronDown size={14} strokeWidth={1.5} className={`adm-chev ${expanded ? 'is-open' : ''}`} />;

  /* Collapsed rail: icon only. The tooltip carries the label. */
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        title={group.label}
        className={`adm-row ${isActive ? 'is-active' : ''}`}
        aria-label={group.label}
        aria-expanded={expanded}
      >
        <span className="adm-ico"><Icon size={16} strokeWidth={isActive ? 2 : 1.5} /></span>
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`adm-row set-parent ${isActive ? 'is-active' : ''}`}
        aria-expanded={expanded}
      >
        <span className="adm-ico"><Icon size={16} strokeWidth={isActive ? 2 : 1.5} /></span>
        <span className="adm-txt">{group.label}</span>
        {chevron}
      </button>

      {expanded && groupItems.length > 0 && (
        <div className="set-kids">
          {groupItems.map((child) => {
            const active = loc.pathname === child.to || loc.pathname.startsWith(child.to + '/');
            /* Reference pattern: children are icon-less indented text rows;
               the highlight (soft fill + left bar) lives on the child. */
            return child.to ? (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                title={child.label}
                className={`adm-child ${active ? 'is-active' : ''}`}
              >
                {child.label}
              </NavLink>
            ) : (
              <Fragment key={child.label}><span className="adm-child">{child.label}</span></Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * NAVIGATION ITEM COMPONENT
 * ========================================================================== */

function NavigationItem({ item, collapsed, onNavigate }) {
  const loc = useLocation();
  const Icon = item.icon;
  /* `/admin` must not swallow every child route, hence the `end` flag; every
     other entry is active for its own subtree. */
  const active = item.end ? loc.pathname === item.to : loc.pathname.startsWith(item.to);

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`adm-row ${active ? 'is-active' : ''}`}
    >
      <span className="adm-ico"><Icon size={16} strokeWidth={active ? 2 : 1.5} /></span>
      <span className="adm-txt">{item.label}</span>
    </NavLink>
  );
}

/* ============================================================================
 * SECTION HEADER COMPONENT
 * ========================================================================== */

function SectionHeader({ label, collapsed }) {
  if (collapsed) return null;
  return <p className="adm-eyebrow">{label}</p>;
}

/* ============================================================================
 * SIDEBAR CONTENT COMPONENT
 * ========================================================================== */

function SidebarContent({ onNavigate, onSearch, collapsed = false }) {
  const { auth, logout } = useApp();
  const loc = useLocation();
  /* The group owning the current route starts expanded on first paint, so a
     deep link shows its own branch immediately (SSR included). */
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const init = {};
    NAV_SECTIONS.forEach((section) => {
      section.groups?.forEach((group) => {
        const hit = (group.children || group.items || []).some(
          (child) => loc.pathname === child.to || loc.pathname.startsWith(child.to + '/')
        );
        if (hit) init[group.key] = true;
      });
    });
    return init;
  });

  const role = auth?.user?.role;
  /* Memoised by role — a fresh array every render made the auto-expand effect
     below re-run forever ("Maximum update depth exceeded"). */
  const visibleSections = useMemo(() => (role
    ? NAV_SECTIONS.filter((section) => {
        if (section.groups) {
          return section.groups.some((g) => roleHasAccess(role, g.key));
        }
        return section.items?.some((i) => !i.requires || roleHasAccess(role, i.requires));
      })
    : NAV_SECTIONS), [role]);

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  /* Auto-expand whichever group owns the current route, so a deep link always
     shows where you are. Memoised on pathname only — the section array is
     rebuilt every render and using it as a dep re-ran this forever. */
  useEffect(() => {
    const parents = [];
    visibleSections.forEach((section) => {
      section.groups?.forEach((group) => {
        const hit = (group.children || group.items || []).some(
          (child) => loc.pathname === child.to || loc.pathname.startsWith(child.to + '/')
        );
        if (hit) parents.push(group.key);
      });
    });
    if (!parents.length) return;
    setExpandedGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      parents.forEach((k) => { if (next[k] !== true) { next[k] = true; changed = true; } });
      return changed ? next : prev;
    });
  }, [loc.pathname, visibleSections]);

  const initials = (name) =>
    (name || 'A').trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  /* Every section renders directly. The old "Advanced" collapse hid
     Storefront / Growth / Operations / Channels / Apps / Settings behind a
     toggle, so they read as missing navigation — the boss must not have to
     hunt for them. */
  const renderSection = (section) => (
    <div key={section.label} className="adm-section">
      <SectionHeader label={section.label} collapsed={collapsed} />
      {section.items?.map((item) => (
        <NavigationItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
      {section.groups?.map((group) => (
        <GroupDropdown
          key={group.key}
          group={group}
          expanded={!!expandedGroups[group.key]}
          onToggle={() => toggleGroup(group.key)}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );

  const sections = collapsed ? (
    <div className="adm-railstack">
      {visibleSections.map(renderSection)}
    </div>
  ) : (
    visibleSections.map(renderSection)
  );

  return (
    <div className="adm-sidebar-inner">
      {/* ===== BRAND ===== */}
      <NavLink to="/admin" className="adm-brand" onClick={onNavigate} title="HUSHAE Admin">
        {collapsed
          ? <Building2 size={20} strokeWidth={1.5} />
          : (
            <>
              <span className="adm-brand-word">HUSHAE</span>
              <span className="adm-brand-sub">Admin</span>
            </>
          )}
      </NavLink>

      {/* ===== GLOBAL SEARCH — opens the command palette ===== */}
      <div className="adm-searchwrap">
        <button
          type="button"
          onClick={onSearch}
          className="adm-search"
          title="Search anything (Ctrl / Cmd + K)"
          aria-label="Search anything"
        >
          <Search size={15} strokeWidth={1.5} />
          <span className="adm-search-txt">Search anything…</span>
          <span className="adm-kbd">⌘K</span>
        </button>
      </div>

      {/* ===== NAVIGATION ===== */}
      <nav className="adm-nav-scroll" aria-label="Admin navigation">
        {sections}
      </nav>

      {/* ===== SETTINGS — single entry; the console rail owns the detail ===== */}
      {(!role || roleHasAccess(role, 'settings')) && (
        <div className="adm-setbtnwrap">
          <NavLink
            to="/admin/settings"
            className={({ isActive }) => `adm-row ${isActive ? 'is-active' : ''}`}
            title="Settings"
          >
            <span className="adm-ico"><Settings size={16} strokeWidth={1.5} /></span>
            <span className="adm-txt">Settings</span>
          </NavLink>
        </div>
      )}

      {/* ===== ACCOUNT ===== */}
      <div className="adm-acct">
        <span className="adm-avatar" aria-hidden="true">{initials(auth?.user?.name)}</span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="adm-acct-name block">{auth?.user?.name || 'Admin'}</span>
            <span className="adm-acct-role block">{getRoleLabel(role || '')}</span>
          </span>
        )}
        <button type="button" onClick={logout} className="adm-iconbtn" title="Sign out" aria-label="Sign out">
          <LogOut size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
 * TOP BAR COMPONENT
 * ========================================================================== */

function TopBar({ title, auth, onCmdK, onMenu, onToggleSidebar, collapsed }) {
  const { settings } = useApp();
  const loc = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => getAdminTheme() === 'dark');
  const createRef = useRef(null);

  const storeOpen = settings?.storefrontLock?.enabled !== true;
  const onSettings = loc.pathname.startsWith('/admin/settings');

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    setAdminTheme(next ? 'dark' : 'light');
  };

  const role = auth?.user?.role;
  const canCreate = !role || role === 'admin' || role === 'Owner' || role === 'Manager';

  const createItems = [
    { to: '/admin/products/new', icon: Package, label: 'New Product' },
    { to: '/admin/orders/new', icon: ShoppingCart, label: 'New Order' },
    { to: '/admin/customers/new', icon: Users, label: 'New Customer' },
    { to: '/admin/pages/new', icon: FileText, label: 'New Page' },
    { to: '/admin/promotions/new', icon: Megaphone, label: 'New Promotion' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!createOpen) return;
    const onDoc = (e) => {
      if (createRef.current && !createRef.current.contains(e.target)) {
        setCreateOpen(false);
      }
    };
    const onEsc = (e) => { if (e.key === 'Escape') setCreateOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [createOpen]);

  /* Route-derived title, with "Admin" as the eyebrow. Deep URLs become
     readable words; the leaf page name stays the single h1. */
  const crumb = loc.pathname === '/admin' ? '' : 'Admin';
  const pageTitle = (() => {
    const parts = loc.pathname.split('/').filter(Boolean);
    if (parts.length <= 1) return title || 'Dashboard';
    return parts[parts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  })();

  /* Tab title — the browser tab always reads "HUSHAE Admin · <page>"
     so the H logo never sits next to a bare storefront tagline. */
  useEffect(() => {
    document.title = `HUSHAE Admin · ${pageTitle}`;
  }, [pageTitle]);

  const initials = (auth?.user?.name || 'A').trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="adm-topbar">
      {/* Left — one menu button per viewport, divider, page title */}
      <div className="tb-left">
        <button
          type="button"
          onClick={onMenu}
          className="tb-menu md:hidden"
          aria-label="Open menu"
          title="Open menu"
        >
          <Menu size={14} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="tb-menu hidden md:grid"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu size={14} strokeWidth={2} />
        </button>
        <span className="tb-div" aria-hidden="true" />
        <h1 className="tb-title">{pageTitle}</h1>
      </div>

      {/* Right — status pill, create, view store, theme, notifications */}
      <div className="tb-right">
        <span className={`tb-pill ${storeOpen ? '' : 'off'}`}>
          <span className="tb-dot" aria-hidden="true" />
          {storeOpen ? 'Store online' : 'Store locked'}
        </span>

        {canCreate && (
          <div className="relative" ref={createRef}>
            <button
              type="button"
              onClick={() => setCreateOpen((v) => !v)}
              className="tb-create"
              aria-expanded={createOpen}
              aria-haspopup="menu"
            >
              <Plus size={11} strokeWidth={2.5} />
              <span>Create</span>
            </button>

            {createOpen && (
              <div className="adm-pop" role="menu">
                {createItems.map((it) => {
                  const Icon = it.icon;
                  return (
                    <Link key={it.to} to={it.to} onClick={() => setCreateOpen(false)} className="adm-pop-row" role="menuitem">
                      <Icon size={14} strokeWidth={1.5} />
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <Link to="/" target="_blank" rel="noreferrer" className="tb-view" title="Open storefront">
          <Eye size={14} strokeWidth={1.6} />
          <span className="hidden sm:inline">View store</span>
        </Link>

        <button
          type="button"
          onClick={toggleDark}
          aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
          title={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
          className="tb-icon"
        >
          {darkMode ? <Sun size={14} strokeWidth={1.6} /> : <Moon size={14} strokeWidth={1.6} />}
        </button>

        <NotificationBell />
      </div>
    </header>
  );
}

/* ============================================================================
 * MAIN ADMIN LAYOUT COMPONENT
 * ========================================================================== */

export default function AdminLayout({ children, title }) {
  const { auth, logout } = useApp();
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

  const openSearch = () => setCmdOpen(true);

  /* Settings-console rail: collapsible on desktop, drawer on mobile — so the
     top bar's left buttons stay identical (and useful) on every page. */
  const [railHidden, setRailHidden] = useState(false);
  const [railDrawer, setRailDrawer] = useState(false);

  /* The settings console is its own page with its own rail — the main admin
     sidebar, drawer and content offset all step aside there. */
  const onSettings = loc.pathname.startsWith('/admin/settings');

  // Apply admin theme
  useEffect(() => {
    applyAdminTheme();
    return () => clearAdminTheme();
  }, []);

  /* Lazy weekly cron: when the owner opens the admin after 6+ days, the
     backend sends the weekly digest email once (it guards the window). */
  const digestFired = useRef(false);
  useEffect(() => {
    if (!auth?.token || digestFired.current) return;
    digestFired.current = true;
    api('/analytics/weekly-digest', { method: 'POST', token: auth.token }).catch(() => {});
  }, [auth?.token]);

  // Cmd+K opens the palette from anywhere in the admin; Esc closes it.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setCmdOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Check if user is authenticated and has valid role
  if (!auth) {
    return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  }

  if (!ALL_ROLES.includes(role || '')) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check if path is blocked for this role
  if (isPathBlocked(loc.pathname, role)) {
    return (
      <div className="admin-shell grid min-h-screen place-items-center p-6">
        <div className="max-w-sm rounded-[6px] border p-10 text-center"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <ShieldCheck size={32} className="mx-auto mb-3" strokeWidth={1.5} style={{ color: 'var(--admin-text-muted)' }} />
          <p className="text-[16px] font-semibold">Access restricted</p>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--admin-text-secondary)' }}>
            This section is only available to Administrator and Owner roles.
            You are signed in as <b>{getRoleLabel(role || '')}</b>.
          </p>
          <Link to="/admin" className="adm-chip solid mt-5 h-9 justify-center px-5 text-[13px]">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell flex min-h-screen">
      {/* ===== SIDEBAR — DESKTOP (hidden on the settings console) ===== */}
      {!onSettings && (
        <aside className={`adm-sidebar ${collapsed ? 'is-rail' : ''}`} aria-label="Admin sidebar">
          <SidebarContent onNavigate={() => {}} onSearch={openSearch} collapsed={collapsed} />
        </aside>
      )}

      {/* ===== SETTINGS RAIL DRAWER (mobile) ===== */}
      {onSettings && railDrawer && (
        <>
          <div className="adm-scrim" onClick={() => setRailDrawer(false)} aria-hidden="true" />
          <div className="set-drawer" role="dialog" aria-modal="true" aria-label="Settings menu">
            <div className="adm-drawer-close">
              <button
                type="button"
                onClick={() => setRailDrawer(false)}
                className="adm-iconbtn"
                aria-label="Close settings menu"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <SettingsRail />
          </div>
        </>
      )}

      {/* ===== MOBILE DRAWER ===== */}
      {!onSettings && drawer && (
        <>
          <div className="adm-scrim md:hidden" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div className="adm-drawer md:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <div className="adm-drawer-close">
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="adm-iconbtn"
                aria-label="Close menu"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <SidebarContent onNavigate={() => setDrawer(false)} onSearch={openSearch} collapsed={false} />
          </div>
        </>
      )}

      {/* ===== MAIN ===== */}
      <div className={`admin-main-offset flex min-h-screen min-w-0 flex-1 flex-col ${onSettings ? '' : collapsed ? 'is-rail' : 'is-open'}`}>
        <TopBar
          title={title}
          auth={auth}
          onCmdK={openSearch}
          onMenu={() => (onSettings ? setRailDrawer(true) : setDrawer(true))}
          onToggleSidebar={() => (onSettings ? setRailHidden((v) => !v) : toggleCollapsed())}
          collapsed={onSettings ? railHidden : collapsed}
        />

        <main className="min-w-0 flex-1 p-4 md:p-6 md:pt-4">
          <div className="admin-main w-full min-w-0">
            {loc.pathname.startsWith('/admin/settings') ? (
              <div className="set-wrap">
                {!railHidden && <SettingsRail />}
                <div className="set-pane min-w-0 flex-1">{children}</div>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>

      {/* Floating Elements */}
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  );
}

export { Fragment };
