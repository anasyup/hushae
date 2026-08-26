import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  Activity, BadgePercent, BarChart3, ImagePlus, ChevronDown, CreditCard, FileText, FolderOpen, Globe, Home,
  LayoutTemplate, LogOut, Mail, Maximize2, Megaphone, Menu, MessageSquare, Minimize2, Package, PackageX, Phone, Plus,
  Search, Settings as SettingsIcon, ShieldCheck, ShoppingBag, Signpost, Sparkles, Star, Store, Sun, Moon, Tags, TrendingUp, Truck, Users, X, Zap, Calculator, FileSpreadsheet, PanelLeftClose, PanelRightOpen,
  Inbox, Bell, Box, Gift, Radio, Smartphone, Building2, KeyRound, LifeBuoy, BookOpen, Keyboard, Webhook,
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
  inbox:        ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'],
  discounts:    ['admin', 'Owner', 'Manager'],
  channels:     ['admin', 'Owner', 'Manager'],
  apps:         ['admin', 'Owner'],
  workspace:    ['admin', 'Owner'],
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
      { to: '/admin/orders/new',       label: 'Draft Orders',       icon: FileText },
      { to: '/admin/abandoned-carts',  label: 'Abandoned Checkouts', icon: PackageX },
      { to: '/admin/verification-queue', label: 'Verification queue', icon: Phone },
      { to: '/admin/fulfillment',      label: 'Fulfillment',        icon: Box },
      { to: '/admin/ops/returns',      label: 'Returns',            icon: PackageX },
      { to: '/admin/desk/orders/payment-issues', label: 'Payment Issues', icon: CreditCard },
      { to: '/admin/desk/orders/documents', label: 'Order Documents', icon: FileText },
      { to: '/admin/desk/orders/notifications', label: 'Order Notifications', icon: Bell },
      { to: '/admin/desk/orders/settings', label: 'Order Settings', icon: SettingsIcon },
    ],
  },
  {
    key: 'products', label: 'Products', icon: Package,
    match: ['/admin/products', '/admin/categories', '/admin/collections', '/admin/reviews', '/admin/questions'],
    children: [
      { to: '/admin/catalog',       label: 'Catalog',       icon: Package },
      { to: '/admin/products',      label: 'Inventory',     icon: Package },
      { to: '/admin/categories',    label: 'Categories',    icon: Tags },
      { to: '/admin/collections',   label: 'Collections',   icon: FolderOpen },
      { to: '/admin/reviews',       label: 'Reviews',       icon: Star },
      { to: '/admin/questions',     label: 'Questions',     icon: MessageSquare },
      { to: '/admin/desk/products/attributes', label: 'Attributes & Variants', icon: Tags },
      { to: '/admin/desk/products/bulk', label: 'Bulk Editor', icon: FileText },
      { to: '/admin/desk/products/import-export', label: 'Import / Export', icon: FileText },
      { to: '/admin/desk/products/feeds', label: 'Product Feeds', icon: Radio },
      { to: '/admin/bundles',       label: 'Bundles & Kits', icon: Package },
      { to: '/admin/desk/products/digital', label: 'Digital Products', icon: FileText },
      { to: '/admin/desk/products/purchase-orders', label: 'Purchase Orders', icon: FileText },
      { to: '/admin/desk/products/approvals', label: 'Product Approvals', icon: ShieldCheck },
      { to: '/admin/desk/products/settings', label: 'Product Settings', icon: SettingsIcon },
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
      { to: '/admin/marketing',            label: 'Marketing Overview', icon: Megaphone },
      { to: '/admin/promotions',           label: 'Campaigns',         icon: Megaphone },
      { to: '/admin/promotions',           label: 'Promotions',        icon: Megaphone },
      { to: '/admin/bundles',              label: 'Bundles',           icon: Package },
      { to: '/admin/flash-sales',          label: 'Flash sales',       icon: Zap },
      { to: '/admin/banners',              label: 'Banners',           icon: ImagePlus },
      { to: '/admin/email-campaigns',      label: 'Email Marketing',   icon: Mail },
      { to: '/admin/sms',                  label: 'SMS Marketing',     icon: Phone },
      { to: '/admin/abandoned-carts',      label: 'Abandoned Cart',    icon: PackageX },
      { to: '/admin/customers/segments',   label: 'Customer Segments', icon: Users },
      { to: '/admin/marketing/settings',   label: 'Automations',       icon: SettingsIcon },
      { to: '/admin/marketing/analytics',  label: 'Performance',       icon: BarChart3 },
      { to: '/admin/marketing/settings',   label: 'Marketing Settings', icon: SettingsIcon },
    ],
  },
  {
    key: 'discounts', label: 'Discounts', icon: BadgePercent,
    match: ['/admin/discounts', '/admin/gift-cards'],
    children: [
      { to: '/admin/discounts', label: 'Discount Codes', icon: BadgePercent },
      { to: '/admin/discounts/automatic', label: 'Automatic Discounts', icon: BadgePercent },
      { to: '/admin/discounts/percent', label: 'Percentage Discounts', icon: BadgePercent },
      { to: '/admin/discounts/fixed', label: 'Fixed Amount Discounts', icon: BadgePercent },
      { to: '/admin/discounts/free-shipping', label: 'Free Shipping', icon: Truck },
      { to: '/admin/discounts/bogo', label: 'Buy X Get Y', icon: Gift },
      { to: '/admin/gift-cards', label: 'Gift Cards', icon: Gift },
      { to: '/admin/discounts/settings', label: 'Discount Settings', icon: SettingsIcon },
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
    match: ['/admin/analytics', '/admin/insights', '/admin/finance', '/admin/live', '/admin/growth', '/admin/search-analytics', '/admin/reports'],
    children: [
      { to: '/admin/analytics',       label: 'Analytics Overview', icon: BarChart3 },
      { to: '/admin/reports/sales',   label: 'Sales',             icon: BarChart3 },
      { to: '/admin/reports/orders',  label: 'Orders',            icon: ShoppingBag },
      { to: '/admin/reports/products', label: 'Products',         icon: Package },
      { to: '/admin/reports/customers', label: 'Customers',       icon: Users },
      { to: '/admin/reports/inventory', label: 'Inventory',       icon: Box },
      { to: '/admin/reports/marketing', label: 'Marketing',       icon: Megaphone },
      { to: '/admin/reports/conversion', label: 'Conversion',     icon: Activity },
      { to: '/admin/finance',         label: 'Finance & P&L',     icon: CreditCard },
      { to: '/admin/insights',        label: 'Deep Insights',     icon: TrendingUp },
      { to: '/admin/reports',          label: 'Reports',            icon: FileSpreadsheet },
      { to: '/admin/reports/export',   label: 'Export Reports',    icon: FileText },
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
      { to: '/admin/settings/store',      label: 'General / Store Details',  icon: Store },
      { to: '/admin/settings/domain',     label: 'Domain',                   icon: Globe },
      { to: '/admin/settings/currency',   label: 'Currency',                 icon: CreditCard },
      { to: '/admin/settings/languages',  label: 'Languages',                icon: Globe },
      { to: '/admin/settings/checkout',   label: 'Checkout',                 icon: CreditCard },
      { to: '/admin/settings/accounts',   label: 'Customer Accounts',        icon: Users },
      { to: '/admin/settings/email',      label: 'Notifications',            icon: Mail },
      { to: '/admin/settings/legal',      label: 'Policies',                 icon: FileText },
      { to: '/admin/settings/privacy',    label: 'Privacy',                  icon: ShieldCheck },
      { to: '/admin/settings/payments',   label: 'Payment settings',         icon: CreditCard },
      { to: '/admin/settings/payments/methods', label: 'Payment Methods',    icon: CreditCard },
      { to: '/admin/settings/payments/providers', label: 'Payment Providers', icon: CreditCard },
      { to: '/admin/settings/payments/transactions', label: 'Transactions',  icon: CreditCard },
      { to: '/admin/settings/payments/payouts', label: 'Payouts',            icon: CreditCard },
      { to: '/admin/settings/payments/refunds', label: 'Refund Settings',    icon: CreditCard },
      { to: '/admin/settings/payments/notifications', label: 'Payment Notifications', icon: Bell },
      { to: '/admin/settings/shipping',   label: 'Shipping & Delivery',      icon: Truck },
      { to: '/admin/settings/shipping/zones', label: 'Shipping Zones',       icon: Truck },
      { to: '/admin/settings/shipping/rates', label: 'Shipping Rates',       icon: Truck },
      { to: '/admin/settings/shipping/methods', label: 'Delivery Methods',   icon: Truck },
      { to: '/admin/settings/shipping/providers', label: 'Shipping Providers', icon: Truck },
      { to: '/admin/settings/shipping/locations', label: 'Fulfillment Locations', icon: Building2 },
      { to: '/admin/settings/shipping/pickup', label: 'Pickup',              icon: Store },
      { to: '/admin/settings/cart',       label: 'Shopping Bag',             icon: ShoppingBag },
      { to: '/admin/settings/taxes',      label: 'Taxes',                    icon: Calculator },
      { to: '/admin/settings/taxes/regions', label: 'Tax Regions',           icon: Calculator },
      { to: '/admin/settings/taxes/rates', label: 'Tax Rates',               icon: Calculator },
      { to: '/admin/settings/taxes/classes', label: 'Tax Classes',           icon: Calculator },
      { to: '/admin/settings/taxes/exemptions', label: 'Tax Exemptions',     icon: Calculator },
      { to: '/admin/markets/countries',   label: 'Countries',                icon: Globe },
      { to: '/admin/markets/currencies',  label: 'Currencies',               icon: CreditCard },
      { to: '/admin/markets/languages',   label: 'Market Languages',         icon: Globe },
      { to: '/admin/markets/pricing',     label: 'Regional Pricing',         icon: Tags },
      { to: '/admin/markets/catalogs',    label: 'Regional Catalogs',        icon: FolderOpen },
      { to: '/admin/markets/domains',     label: 'Regional Domains',         icon: Globe },
      { to: '/admin/markets/taxes',       label: 'Regional Taxes',           icon: Calculator },
      { to: '/admin/markets/shipping',    label: 'Regional Shipping',        icon: Truck },
      { to: '/admin/team',                label: 'Team Members',             icon: Users },
      { to: '/admin/team/roles',          label: 'Roles',                    icon: ShieldCheck },
      { to: '/admin/team/permissions',    label: 'Custom Permissions',       icon: ShieldCheck },
      { to: '/admin/team/store-access',   label: 'Store Access',             icon: Store },
      { to: '/admin/team/product-access', label: 'Product Access',           icon: Package },
      { to: '/admin/team/order-access',   label: 'Order Access',             icon: ShoppingBag },
      { to: '/admin/team/customer-access', label: 'Customer Access',         icon: Users },
      { to: '/admin/team/finance-access', label: 'Finance Access',           icon: CreditCard },
      { to: '/admin/team/activity',       label: 'Login Activity',           icon: Activity },
      { to: '/admin/billing',             label: 'Current Plan',             icon: CreditCard },
      { to: '/admin/billing/upgrade',     label: 'Upgrade Plan',             icon: Zap },
      { to: '/admin/billing/usage',       label: 'Usage',                    icon: BarChart3 },
      { to: '/admin/billing/invoices',    label: 'Invoices',                 icon: FileText },
      { to: '/admin/billing/payment-method', label: 'Billing Payment Method', icon: CreditCard },
      { to: '/admin/billing/seats',       label: 'Team Seats',               icon: Users },
      { to: '/admin/billing/stores',      label: 'Connected Stores',         icon: Store },
      { to: '/admin/billing/subscription', label: 'Subscription Settings',   icon: SettingsIcon },
      { to: '/admin/settings/security',   label: 'Security',                 icon: ShieldCheck },
      { to: '/admin/settings/advanced',   label: 'Advanced',                 icon: SettingsIcon },
      { to: '/admin/settings/api',        label: 'API & Webhooks',           icon: Webhook },
      { to: '/admin/settings/custom-data', label: 'Custom Data',             icon: FileText },
      { to: '/admin/settings/metafields', label: 'Metafields',               icon: Tags },
      { to: '/admin/settings/automations', label: 'Automations',             icon: Zap },
      { to: '/admin/backup',              label: 'Data Export / Backup',     icon: FileText },
      { to: '/admin/settings/activity-logs', label: 'Activity Logs',         icon: FileText },
      { to: '/admin/settings/error-logs', label: 'Error Logs',               icon: FileText },
      { to: '/admin/settings/developer',  label: 'Developer Tools',          icon: KeyRound },
    ],
  },
  {
    key: 'inbox', label: 'Inbox', icon: Inbox,
    match: ['/admin/inbox'],
    children: [
      { to: '/admin/inbox', label: 'All Messages', icon: Inbox },
      { to: '/admin/inbox/unread', label: 'Unread', icon: Bell },
      { to: '/admin/inbox/customers', label: 'Customer Messages', icon: MessageSquare },
      { to: '/admin/inbox/orders', label: 'Order Alerts', icon: ShoppingBag },
      { to: '/admin/inbox/products', label: 'Product Alerts', icon: Package },
      { to: '/admin/inbox/system', label: 'System Notifications', icon: Bell },
    ],
  },
  {
    key: 'channels', label: 'Sales Channels', icon: Radio,
    match: ['/admin/channels'],
    children: [
      { to: '/admin/store', label: 'Online Store', icon: Globe },
      { to: '/admin/channels/online/availability', label: 'Product Availability', icon: Package },
      { to: '/admin/channels/online/collections', label: 'Collection Availability', icon: FolderOpen },
      { to: '/admin/channels/online/settings', label: 'Channel Settings', icon: SettingsIcon },
      { to: '/admin/channels/mobile', label: 'Mobile Store', icon: Smartphone },
      { to: '/admin/channels/mobile/catalog', label: 'Mobile Catalog', icon: Smartphone },
      { to: '/admin/channels/mobile/home', label: 'Mobile Homepage', icon: Home },
      { to: '/admin/channels/mobile/settings', label: 'Mobile Settings', icon: SettingsIcon },
      { to: '/admin/channels/social', label: 'Social Commerce', icon: Megaphone },
      { to: '/admin/channels/social/catalog', label: 'Social Catalog', icon: Megaphone },
      { to: '/admin/channels/social/products', label: 'Social Products', icon: Package },
      { to: '/admin/channels/social/settings', label: 'Social Settings', icon: SettingsIcon },
      { to: '/admin/channels/marketplaces', label: 'Marketplaces', icon: Store },
      { to: '/admin/channels/marketplaces/catalog', label: 'Marketplace Catalog', icon: Store },
      { to: '/admin/channels/marketplaces/listings', label: 'Marketplace Listings', icon: Tags },
      { to: '/admin/channels/marketplaces/settings', label: 'Marketplace Settings', icon: SettingsIcon },
      { to: '/admin/channels/add', label: 'Add Channel', icon: Plus },
      { to: '/admin/channels/future/catalog', label: 'Channel Catalog', icon: Radio },
      { to: '/admin/channels/future/orders', label: 'Channel Orders', icon: ShoppingBag },
      { to: '/admin/channels/future/settings', label: 'Future Channel Settings', icon: SettingsIcon },
    ],
  },
  {
    key: 'apps', label: 'Apps & Integrations', icon: Zap,
    match: ['/admin/apps'],
    children: [
      { to: '/admin/apps', label: 'Installed Apps', icon: Zap },
      { to: '/admin/apps/marketplace', label: 'App Marketplace', icon: Store },
      { to: '/admin/apps/payments', label: 'Payment Integrations', icon: CreditCard },
      { to: '/admin/apps/shipping', label: 'Shipping Integrations', icon: Truck },
      { to: '/admin/apps/marketing', label: 'Marketing Integrations', icon: Megaphone },
      { to: '/admin/apps/analytics', label: 'Analytics Integrations', icon: BarChart3 },
      { to: '/admin/apps/storefront', label: 'Storefront Integrations', icon: Globe },
      { to: '/admin/apps/import', label: 'Import Connections', icon: FileText },
      { to: '/admin/apps/api-keys', label: 'API Keys', icon: KeyRound },
      { to: '/admin/apps/webhooks', label: 'Webhooks', icon: Webhook },
      { to: '/admin/apps/logs', label: 'Integration Logs', icon: FileText },
    ],
  },
];

/* ── Phase 02 — sidebar sections ─────────────────────────────────────────
   Groups reference the same NAV_GROUPS data (no new links, no fake routes).
   OPERATIONS surfaces three existing routes (Commerce OS, Payments,
   Shipping) that previously lived inside Orders/Settings. */
const OPERATIONS_LINKS = [
  { to: '/admin/ops',              label: 'Operations', icon: Package },
  { to: '/admin/payments',         label: 'Payments',   icon: CreditCard },
  { to: '/admin/settings/shipping',label: 'Shipping',   icon: Truck },
];

const NAV_SECTIONS = [
  { label: 'MAIN',      items: [{ to: '/admin', label: 'Overview', icon: Home, end: true }] },
  { label: 'COMMERCE',  groups: ['orders', 'products', 'customers'] },
  { label: 'GROWTH',    groups: ['marketing', 'storefront', 'analytics'] },
  { label: 'OPERATIONS', links: OPERATIONS_LINKS },
  { label: 'SYSTEM',    groups: ['settings'] },
];

function rolesForGroup(key) { return ROLE_ACCESS[key] || ['admin', 'Owner']; }
function roleHasAccess(userRole, groupKey) { if (!userRole) return false; return rolesForGroup(groupKey).includes(userRole); }
function getRoleLabel(role) {
  const map = { admin: 'Administrator', Owner: 'Owner', Manager: 'Manager', Staff: 'Staff', Warehouse: 'Fulfillment', Support: 'Support' };
  return map[role] || role;
}

const linkCls = ({ isActive }) =>
  `relative flex h-8 items-center gap-2.5 px-2 text-[12px] transition-colors duration-150 ease-out ${
    isActive
      ? 'bg-[#F5F5F5] font-medium text-black'
      : 'text-[#555555] hover:bg-[#F7F7F7] hover:text-black'
  }`;

const childLinkCls = (active) =>
  `relative flex h-7 items-center gap-2 pl-8 pr-2 text-[12px] transition-colors duration-150 ease-out ${
    active ? 'font-medium text-black' : 'text-[#777777] hover:bg-[#F7F7F7] hover:text-black'
  }`;

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

function GroupDropdown({ group, onNavigate, defaultOpen, collapsed }) {
  const loc = useLocation();
  const [open, setOpen] = useState(defaultOpen);
  const Icon = group.icon;
  const isChildActive = group.children.some((c) => isChildRouteActive(loc, c.to));
  useEffect(() => { if (isChildActive) setOpen(true); }, [isChildActive]);

  // Collapsed: icon-only, tooltip via title, click opens first child
  if (collapsed) {
    const first = group.children[0];
    return (
      <div>
        <NavLink
          to={first?.to || '/'}
          onClick={onNavigate}
          title={group.label}
          className={`relative flex h-9 items-center justify-center transition-colors duration-150 ease-out ${
            isChildActive ? 'bg-[#F5F5F5] text-black' : 'text-[#555555] hover:bg-[#F7F7F7] hover:text-black'
          }`}
        >
          {isChildActive && <span aria-hidden className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 bg-black" />}
          <Icon size={16} strokeWidth={isChildActive ? 2 : 1.7} />
        </NavLink>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className={`flex h-8 w-full items-center gap-2.5 px-2 text-[12px] transition-colors duration-150 ease-out ${
          isChildActive ? 'font-medium text-black' : 'text-[#555555] hover:bg-[#F7F7F7] hover:text-black'
        }`}>
        <Icon size={15} strokeWidth={isChildActive ? 2 : 1.7} className={isChildActive ? 'text-black' : 'text-[#777777]'} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown size={11} className={`text-[#999999] transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.children.map((c) => {
            const active = isChildRouteActive(loc, c.to);
            const ChildIcon = c.icon;
            return (
              <NavLink key={c.to} to={c.to} onClick={onNavigate} className={() => childLinkCls(active)}>
                {active && <span aria-hidden className="absolute left-1.5 top-1/2 h-3.5 w-[2px] -translate-y-1/2 bg-black" />}
                <ChildIcon size={12} strokeWidth={1.7} className="opacity-70" />{c.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkspaceMenu({ onNavigate }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative mt-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between border border-[#EAEAEA] px-2 py-1.5 text-left text-[11px] font-medium text-[#555]">
        <span>HUSHAE · Current store</span>
        <ChevronDown size={11} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 border border-[#EAEAEA] bg-white py-1">
          {[
            ['/admin/workspace/current', 'Current Store'],
            ['/admin/workspace/all', 'All Stores'],
            ['/admin/workspace/add', 'Add Store'],
            ['/admin/workspace/switch', 'Switch Workspace'],
            ['/admin/workspace/settings', 'Workspace Settings'],
          ].map(([to, label]) => (
            <NavLink key={to} to={to} onClick={() => { setOpen(false); onNavigate?.(); }} className="block px-2 py-1.5 text-[12px] text-[#555] hover:bg-[#F7F7F7] hover:text-black">
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

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
    <div className="flex h-full flex-col bg-white">
      {/* ── Brand ─────────────────────────────────────────────────────── */}
      <div className="px-4 pb-3 pt-5">
        <NavLink to="/admin" onClick={onNavigate} className="block w-fit transition hover:opacity-80" title="Dashboard">
          {collapsed ? (
            <p className="px-1 font-sans text-[16px] font-medium tracking-[0.1em] text-black">H</p>
          ) : (
            <>
              <p className="font-sans text-[14px] font-medium tracking-[0.3em] text-black">HUSHAE</p>
              <p className="adm-eyebrow mt-1.5">Admin console</p>
            </>
          )}
        </NavLink>
        {!collapsed && <WorkspaceMenu onNavigate={onNavigate} />}
      </div>

      {/* ── Search (collapsed: icon only) ─────────────────────────────── */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => onOpenCmd?.()}
          title="Search admin (⌘K)"
          className={`flex w-full items-center gap-2 border-b border-[#EAEAEA] text-left text-[12px] text-[#777777] transition-colors duration-150 hover:border-black hover:text-black ${
            collapsed ? 'h-9 justify-center border-b-0 px-0' : 'px-0.5 pb-1.5'
          }`}
        >
          <Search size={13} className="shrink-0 text-[#777777]" />
          {!collapsed && (
            <>
              <span className="flex-1">Search anything…</span>
              <kbd className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#999999]">⌘K</kbd>
            </>
          )}
        </button>
        {!collapsed && (
          <div className="mt-2 space-y-0.5 px-0.5">
            {[
              ['/admin/search/products', 'Search Products'],
              ['/admin/search/orders', 'Search Orders'],
              ['/admin/search/customers', 'Search Customers'],
              ['/admin/search/pages', 'Search Pages'],
              ['/admin/search/apps', 'Search Apps'],
              ['/admin/search/settings', 'Search Settings'],
            ].map(([to, label]) => (
              <NavLink key={to} to={to} onClick={onNavigate} className="block py-0.5 pl-5 text-[11px] text-[#999] hover:text-black">{label}</NavLink>
            ))}
          </div>
        )}
      </div>

      {/* ── Navigation sections ───────────────────────────────────────── */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 pb-4 pt-2">
        {NAV_SECTIONS.map((section) => {
          const groups = (section.groups || []).map(groupByKey).filter(Boolean);
          const items = section.items || [];
          const links = section.links || [];
          if (!groups.length && !items.length && !links.length) return null;
          return (
            <div key={section.label}>
              {!collapsed && (
                <p className="adm-eyebrow px-2 pb-2">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} title={collapsed ? label : undefined}
                    className={linkCls} onClick={onNavigate}>
                    {({ isActive }) => (
                      <span className={`flex w-full items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
                        {isActive && !collapsed && (
                          <span aria-hidden className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 bg-black" />
                        )}
                        <Icon size={16} strokeWidth={isActive ? 2 : 1.7} className={isActive ? 'text-black' : 'text-[#777777]'} />
                        {!collapsed && <span>{label}</span>}
                      </span>
                    )}
                  </NavLink>
                ))}
                {links.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} title={collapsed ? label : undefined}
                    className={linkCls} onClick={onNavigate}>
                    {({ isActive }) => (
                      <span className={`flex w-full items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
                        {isActive && !collapsed && (
                          <span aria-hidden className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 bg-black" />
                        )}
                        <Icon size={16} strokeWidth={isActive ? 2 : 1.7} className={isActive ? 'text-black' : 'text-[#777777]'} />
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

      {/* ── Footer: store status + account + sign out ─────────────────── */}
      <div className="border-t border-admin-border-subtle px-2.5 py-3">
        {!collapsed && (
          <div className="mb-2 space-y-0.5">
            <Link to="/" target="_blank" className="flex items-center gap-2 px-2 py-1 text-[12px] text-[#555] hover:text-black"><Globe size={13} /> View Store</Link>
            <NavLink to="/admin/help" onClick={onNavigate} className="flex items-center gap-2 px-2 py-1 text-[12px] text-[#555] hover:text-black"><LifeBuoy size={13} /> Help & Support</NavLink>
            <NavLink to="/admin/docs" onClick={onNavigate} className="flex items-center gap-2 px-2 py-1 text-[12px] text-[#555] hover:text-black"><BookOpen size={13} /> Documentation</NavLink>
            <NavLink to="/admin/shortcuts" onClick={onNavigate} className="flex items-center gap-2 px-2 py-1 text-[12px] text-[#555] hover:text-black"><Keyboard size={13} /> Keyboard Shortcuts</NavLink>
            <NavLink to="/admin/profile" onClick={onNavigate} className="flex items-center gap-2 px-2 py-1 text-[12px] text-[#555] hover:text-black"><Users size={13} /> Admin Profile</NavLink>
          </div>
        )}
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2 px-2 py-1">
            <span className="h-1 w-1 rounded-full bg-black" aria-hidden />
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#555555]">Store online</span>
          </div>
        )}
        <div className="flex items-center gap-2.5 border-t border-[#EAEAEA] px-2 pt-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center bg-black text-[10px] font-semibold text-[#FFFFFF]">
            {initials}
          </span>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-black">{auth?.user?.name || 'Admin'}</p>
                <p className="truncate text-[10px] uppercase tracking-[0.12em] text-[#777777]">{getRoleLabel(role || '')}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
                className="grid h-7 w-7 shrink-0 place-items-center text-[#777777] transition-colors duration-150 hover:bg-[#F5F5F5] hover:text-black"
              >
                <LogOut size={15} strokeWidth={1.8} />
              </button>
            </>
          )}
          {collapsed && (
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="grid h-8 w-8 place-items-center rounded-lg text-admin-text-muted transition-colors duration-150 hover:bg-admin-surface-2 hover:text-admin-danger"
            >
              <LogOut size={15} strokeWidth={1.8} />
            </button>
          )}
        </div>
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
  { prefix: '/admin/apps', key: 'apps' },
  { prefix: '/admin/backup', key: 'settings' },
  { prefix: '/admin/loyalty', key: 'customers' },
  { prefix: '/admin/inbox', key: 'inbox' },
  { prefix: '/admin/channels', key: 'channels' },
  { prefix: '/admin/workspace', key: 'workspace' },
  { prefix: '/admin/team', key: 'settings' },
  { prefix: '/admin/billing', key: 'settings' },
  { prefix: '/admin/gift-cards', key: 'discounts' },
];

function isPathBlocked(pathname, role) {
  if (!role || role === 'admin' || role === 'Owner') return false;
  for (const r of RESTRICTED_PATHS) { if (pathname.startsWith(r.prefix) && !roleHasAccess(role, r.key)) return true; }
  return false;
}

export default function AdminLayout({ children, title, subtitle, headerExtra, hideContentTitle, chromeless = false }) {
  const { auth } = useApp();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false); // sidebar starts open on every load
  const role = auth?.user?.role;
  const toggleCollapsed = () => {
    setCollapsed((v) => {
      try { localStorage.setItem('hushae.sidebar_collapsed', v ? '0' : '1'); } catch { /* ignore */ }
      return !v;
    });
  };
  useEffect(() => { applyAdminTheme(); return () => clearAdminTheme(); }, []);
  const crumbs = (() => {
    const parts = loc.pathname.split('/').filter(Boolean); // ['admin', 'products']
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
        if (loc.pathname === '/admin') return; // Overview has its own ⌘K (search focus)
        e.preventDefault(); setCmdOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [loc.pathname]);
  if (!auth) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  if (!ALL_ROLES.includes(role || '')) return <Navigate to="/admin/login" replace />;
  if (isPathBlocked(loc.pathname, role)) return (
    <div className="grid min-h-screen place-items-center bg-admin-bg">
      <div className="max-w-sm rounded-xl border border-admin-border bg-admin-surface p-10 text-center">
        <ShieldCheck size={36} className="mx-auto mb-3 text-admin-warning" />
        <p className="text-[15px] font-semibold text-admin-text">Access restricted</p>
        <p className="mt-2 text-[13px] leading-relaxed text-admin-text-2">This section is only available to Administrator and Owner roles. You are signed in as <b>{getRoleLabel(role || '')}</b>.</p>
        <Link to="/admin" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-admin-text px-5 py-2.5 text-[15px] font-semibold text-admin-bg transition hover:bg-admin-accent-hover">Back to Dashboard</Link>
      </div>
    </div>
  );
  return (
    <div className="admin-shell flex min-h-screen bg-admin-bg">
      {!chromeless && (
        <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-admin-border transition-[width] duration-200 ease-out md:block ${collapsed ? 'w-[68px]' : 'w-[200px]'}`}>
          <SidebarContent onOpenCmd={() => setCmdOpen(true)} collapsed={collapsed} />
        </aside>
      )}
      {drawer && <div className="fixed inset-0 z-50 md:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} /><div className="absolute inset-y-0 left-0 w-72 border-r border-admin-border bg-admin-sidebar"><button onClick={() => setDrawer(false)} className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-admin-text-muted hover:bg-admin-surface-2"><X size={18} /></button><SidebarContent onNavigate={() => setDrawer(false)} onOpenCmd={() => { setDrawer(false); setCmdOpen(true); }} /></div></div>}
      <div className={`flex min-h-screen min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out ${!chromeless && (collapsed ? 'md:pl-[68px]' : 'md:pl-[200px]')}`}>
        {!chromeless && <TopBar title={title} auth={auth} onCmdK={() => setCmdOpen(true)} onMenu={() => setDrawer(true)} onToggleSidebar={toggleCollapsed} collapsed={collapsed} />}
        <div className={chromeless ? 'min-w-0 flex-1' : 'min-w-0 flex-1 p-4 md:p-6 xl:p-8'}>
          <div className={chromeless ? 'admin-main w-full min-w-0' : 'admin-main mx-auto w-full min-w-0 max-w-[1440px]'}>
            {!chromeless && title && <h1 className="mb-5 font-sans text-[16px] font-medium text-admin-text md:hidden">{title}</h1>}
            {!chromeless && (
            <nav aria-label="Breadcrumb" className="adm-eyebrow mb-5 hidden items-center md:flex">
              {crumbs.map((c, i) => (
                <span key={c.to} className="inline-flex items-center">
                  {i > 0 && <span className="mx-1.5 text-[#D8D8D8]">/</span>}
                  {i === crumbs.length - 1 ? (
                    <span className="font-medium text-[#555555]">{c.label}</span>
                  ) : (
                    <Link to={c.to} className="transition-colors duration-150 hover:text-black">{c.label}</Link>
                  )}
                </span>
              ))}
            </nav>
            )}
            {children}
          </div>
        </div>
      </div>
      <ProfitCalculator />
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  );
}

function CreateMenu({ onPick }) {
  const items = [
    { to: '/admin/products/new', icon: Package, label: 'New product' },
    { to: '/admin/orders/new', icon: ShoppingBag, label: 'New order' },
    { to: '/admin/promotions/new', icon: Megaphone, label: 'New promotion' },
    { to: '/admin/discounts', icon: BadgePercent, label: 'New discount' },
    { to: '/admin/cms/new', icon: FileText, label: 'New page' },
    { to: '/admin/blog/new', icon: FileText, label: 'New blog article' },
  ];
  return (
    <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-[4px] border border-[#EAEAEA] bg-white py-1">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link key={it.to} to={it.to} onClick={onPick} className="flex h-9 items-center gap-2.5 px-3.5 text-[12px] text-[#555555] transition-colors hover:bg-[#F5F5F5] hover:text-black">
            <Icon size={13} className="text-[#777777]" /> {it.label}
          </Link>
        );
      })}
    </div>
  );
}

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
  const btnGhost = 'inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-admin-border bg-admin-surface-2 px-2.5 text-[12px] font-medium text-admin-text-2 transition hover:border-admin-border hover:bg-admin-surface-3 hover:text-admin-text';
  const btnPrimary = 'inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-admin-text px-3 text-[12px] font-semibold text-admin-bg transition hover:bg-admin-accent-hover';
  return (
    <header className="sticky top-0 z-20 flex h-[56px] items-center border-b border-[#EAEAEA] bg-white px-4 backdrop-blur md:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button type="button" onClick={onMenu} className="grid h-9 w-9 shrink-0 place-items-center text-[#555555] hover:bg-[#F5F5F5] md:hidden" aria-label="Open menu"><Menu size={20} /></button>
          <button type="button" onClick={onToggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="hidden h-9 w-9 shrink-0 place-items-center text-[#777777] transition-colors duration-150 hover:bg-[#F5F5F5] hover:text-black md:grid">
            {collapsed ? <PanelRightOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-sans text-[15px] font-medium tracking-tight text-black">{title || crumbs[crumbs.length - 1]?.label}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <button
            type="button"
            onClick={onCmdK}
            className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-[#DCDCDC] bg-white px-3 text-[12px] text-[#777777] transition-colors duration-150 hover:border-black hover:text-black"
            title="Search anything (⌘K)"
          >
            <Search size={13} />
            <span className="hidden sm:inline">Search anything…</span>
            <kbd className="hidden text-[9px] font-medium uppercase tracking-[0.14em] text-[#999999] sm:inline">⌘K</kbd>
          </button>
          <span className={`hidden items-center gap-1.5 lg:inline-flex ${storeOpen ? 'text-[#555555]' : 'text-black'}`}><span className={`h-1 w-1 rounded-full ${storeOpen ? 'bg-[#999999]' : 'bg-black'}`} />{storeOpen ? 'Store online' : 'Store locked'}</span>
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
          <div className="ml-1 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center bg-black text-[10px] font-semibold text-[#FFFFFF]">{initials}</span><span className="hidden text-[12px] font-medium text-black sm:inline">{auth?.user?.name?.split(' ')[0] || 'Admin'}</span></div>
        </div>
      </div>
    </header>
  );
}

export { Fragment };
