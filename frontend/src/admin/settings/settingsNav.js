/**
 * SETTINGS CONSOLE IA — moved verbatim out of the main sidebar's NAV_SECTIONS.
 * The main sidebar now carries a single Settings entry (above the account
 * block); this rail is the organised home for every settings destination.
 */
import { BarChart3, Bell, Box, Building2, Calculator, Clock, Code2, CreditCard, DollarSign, FileSpreadsheet, FileText, FolderOpen, Globe, Grid3X3, Home, ImagePlus, LayoutTemplate, Megaphone, Menu, Package, Search, Settings, Share2, ShieldCheck, ShoppingCart, Smartphone, Store, Tag, TrendingUp, Truck, UserCog, Users, Zap } from 'lucide-react';

export const SETTINGS_SECTION =   {
    label: 'SETTINGS',
    icon: Settings,
    groups: [
      {
        key: 'store',
        label: 'Store Settings',
        icon: Building2,
        children: [
          { to: '/admin/settings', label: 'Store Details', icon: Settings },
          { to: '/admin/settings/address', label: 'Business Address', icon: Building2 },
          { to: '/admin/settings/timezone', label: 'Time Zone', icon: Clock },
          { to: '/admin/settings/currency', label: 'Currency', icon: DollarSign },
          { to: '/admin/settings/units', label: 'Weight Unit', icon: Package },
          { to: '/admin/settings/domain', label: 'Domain', icon: Globe },
          { to: '/admin/settings/languages', label: 'Languages', icon: FileText },
          { to: '/admin/settings/notifications', label: 'Notifications', icon: Bell },
          { to: '/admin/settings/policies', label: 'Policies', icon: FileText },
          { to: '/admin/settings/privacy', label: 'Privacy', icon: ShieldCheck },
        ],
      },
      {
        key: 'checkout',
        label: 'Checkout & Customer Accounts',
        icon: CreditCard,
        children: [
          { to: '/admin/settings/checkout', label: 'Checkout Settings', icon: CreditCard },
          { to: '/admin/settings/customer-login', label: 'Customer Login', icon: Users },
          { to: '/admin/settings/guest-checkout', label: 'Guest Checkout', icon: ShoppingCart },
          { to: '/admin/settings/account-fields', label: 'Account Fields', icon: FileText },
          { to: '/admin/settings/store-credit', label: 'Store Credit', icon: DollarSign },
          { to: '/admin/settings/customer-privacy', label: 'Customer Privacy', icon: ShieldCheck },
        ],
      },
      {
        key: 'payments',
        label: 'Payments',
        icon: CreditCard,
        items: [
          { to: '/admin/settings/payments', label: 'Payment Methods', icon: CreditCard },
        ],
      },
      {
        key: 'shipping',
        label: 'Shipping & Delivery',
        icon: Truck,
        items: [
          { to: '/admin/settings/shipping', label: 'Shipping Settings', icon: Truck },
        ],
      },
      {
        key: 'taxes',
        label: 'Taxes & Duties',
        icon: Calculator,
        items: [
          { to: '/admin/settings/taxes', label: 'Tax Settings', icon: Calculator },
        ],
      },
      {
        key: 'markets',
        label: 'Markets & Localization',
        icon: Globe,
        items: [
          { to: '/admin/settings/markets', label: 'Markets', icon: Globe },
        ],
      },
      {
        key: 'locations',
        label: 'Locations',
        icon: Building2,
        items: [
          { to: '/admin/settings/locations', label: 'Locations', icon: Building2 },
        ],
      },
      {
        key: 'gift-cards',
        label: 'Gift Cards',
        icon: DollarSign,
        items: [
          { to: '/admin/settings/gift-cards', label: 'Gift Cards', icon: DollarSign },
        ],
      },
      {
        key: 'custom-data',
        label: 'Custom Data',
        icon: Settings,
        children: [
          { to: '/admin/settings/metafields', label: 'Metafields', icon: Code2 },
          { to: '/admin/settings/metaobjects', label: 'Metaobjects', icon: Box },
          { to: '/admin/settings/custom-fields', label: 'Custom Fields', icon: FileText },
        ],
      },
      {
        key: 'team',
        label: 'Team & Permissions',
        icon: Users,
        children: [
          { to: '/admin/settings/team', label: 'Team Members', icon: Users },
          { to: '/admin/settings/roles', label: 'Roles', icon: UserCog },
          { to: '/admin/settings/permissions', label: 'Custom Permissions', icon: ShieldCheck },
          { to: '/admin/settings/store-access', label: 'Store Access', icon: Building2 },
          { to: '/admin/settings/product-access', label: 'Product Access', icon: Package },
          { to: '/admin/settings/order-access', label: 'Order Access', icon: ShoppingCart },
          { to: '/admin/settings/customer-access', label: 'Customer Access', icon: Users },
          { to: '/admin/settings/finance-access', label: 'Finance Access', icon: DollarSign },
        ],
      },
      {
        key: 'billing',
        label: 'Plan & Billing',
        icon: DollarSign,
        children: [
          { to: '/admin/settings/billing', label: 'Current Plan', icon: DollarSign },
          { to: '/admin/settings/billing/upgrade', label: 'Upgrade Plan', icon: TrendingUp },
          { to: '/admin/settings/billing/usage', label: 'Usage', icon: BarChart3 },
          { to: '/admin/settings/billing/invoices', label: 'Invoices', icon: FileText },
          { to: '/admin/settings/billing/payment-method', label: 'Payment Method', icon: CreditCard },
          { to: '/admin/settings/billing/seats', label: 'Team Seats', icon: Users },
          { to: '/admin/settings/billing/stores', label: 'Connected Stores', icon: Store },
          { to: '/admin/settings/billing/subscription', label: 'Subscription Settings', icon: Settings },
        ],
      },
      {
        key: 'security',
        label: 'Security',
        icon: ShieldCheck,
        children: [
          { to: '/admin/settings/security', label: 'Password', icon: ShieldCheck },
          { to: '/admin/settings/security/2fa', label: 'Two-Factor Authentication', icon: ShieldCheck },
          { to: '/admin/settings/security/sessions', label: 'Active Sessions', icon: Users },
          { to: '/admin/settings/security/activity', label: 'Login Activity', icon: BarChart3 },
          { to: '/admin/settings/security/alerts', label: 'Security Alerts', icon: Bell },
        ],
      },
      {
        key: 'data',
        label: 'Data Management',
        icon: FileSpreadsheet,
        children: [
          { to: '/admin/settings/import', label: 'Import Data', icon: FileSpreadsheet },
          { to: '/admin/settings/export', label: 'Export Data', icon: FileSpreadsheet },
          { to: '/admin/settings/migration', label: 'Data Migration', icon: Share2 },
          { to: '/admin/settings/backup', label: 'Backup', icon: FileSpreadsheet },
          { to: '/admin/settings/delete', label: 'Delete Store Data', icon: ShieldCheck },
          { to: '/admin/settings/retention', label: 'Data Retention', icon: Clock },
        ],
      },
      {
        key: 'system',
        label: 'System',
        icon: Settings,
        items: [
          { to: '/admin/settings/audit-logs', label: 'Activity & Audit Logs', icon: FileSpreadsheet },
          { to: '/admin/settings/system-status', label: 'System Status', icon: BarChart3 },
          { to: '/admin/settings/error-logs', label: 'Error Logs', icon: ShieldCheck },
          { to: '/admin/settings/maintenance', label: 'Maintenance Mode', icon: Settings },
        ],
      },
      {
        key: 'advanced',
        label: 'Advanced Settings',
        icon: Settings,
        children: [
          { to: '/admin/settings/api', label: 'API', icon: Code2 },
          { to: '/admin/settings/webhooks', label: 'Webhooks', icon: Share2 },
          { to: '/admin/settings/developer', label: 'Developer Tools', icon: Settings },
          { to: '/admin/settings/flags', label: 'Feature Flags', icon: Zap },
          { to: '/admin/settings/cache', label: 'Cache', icon: Clock },
          { to: '/admin/settings/config', label: 'System Configuration', icon: Settings },
        ],
      },
    ],
  };

export const STOREFRONT_SECTION =   {
    label: 'STOREFRONT',
    icon: LayoutTemplate,
    groups: [
      {
        key: 'theme',
        label: 'Theme Editor',
        icon: LayoutTemplate,
        children: [
          { to: '/admin/theme', label: 'Theme Library', icon: Grid3X3 },
          { to: '/admin/theme/current', label: 'Current Theme', icon: LayoutTemplate },
          { to: '/admin/theme/drafts', label: 'Draft Themes', icon: FileText },
          { to: '/admin/theme/homepage', label: 'Homepage', icon: Home },
          { to: '/admin/theme/product', label: 'Product Page', icon: Package },
          { to: '/admin/theme/collection', label: 'Collection Page', icon: FolderOpen },
          { to: '/admin/theme/catalog', label: 'Catalog Page', icon: Package },
          { to: '/admin/theme/cart', label: 'Cart Page', icon: ShoppingCart },
          { to: '/admin/theme/checkout', label: 'Checkout Page', icon: CreditCard },
          { to: '/admin/theme/search', label: 'Search Page', icon: Search },
          { to: '/admin/theme/header', label: 'Header', icon: LayoutTemplate },
          { to: '/admin/theme/footer', label: 'Footer', icon: LayoutTemplate },
          { to: '/admin/theme/sections', label: 'Sections', icon: Code2 },
          { to: '/admin/theme/blocks', label: 'Blocks', icon: Box },
          { to: '/admin/theme/templates', label: 'Templates', icon: FileText },
          { to: '/admin/theme/styles', label: 'Global Styles', icon: Settings },
          { to: '/admin/theme/preview', label: 'Preview', icon: Home },
          { to: '/admin/theme/publish', label: 'Publish', icon: Share2 },
        ],
      },
      {
        key: 'content',
        label: 'Content Studio',
        icon: FileText,
        children: [
          { to: '/admin/pages', label: 'Pages', icon: FileText },
          { to: '/admin/blog', label: 'Blog', icon: FileText },
          { to: '/admin/blog/categories', label: 'Blog Categories', icon: Tag },
          { to: '/admin/banners', label: 'Banners', icon: ImagePlus },
          { to: '/admin/popups', label: 'Popups', icon: LayoutTemplate },
          { to: '/admin/announcements', label: 'Announcement Bar', icon: Megaphone },
          { to: '/admin/landing', label: 'Landing Pages', icon: Home },
          { to: '/admin/editorial', label: 'Editorial Content', icon: FileText },
          { to: '/admin/blocks', label: 'Content Blocks', icon: Box },
        ],
      },
      {
        key: 'navigation',
        label: 'Navigation',
        icon: Menu,
        children: [
          { to: '/admin/navigation/header', label: 'Header Menu', icon: LayoutTemplate },
          { to: '/admin/navigation/footer', label: 'Footer Menu', icon: LayoutTemplate },
          { to: '/admin/navigation/mega', label: 'Mega Menu', icon: Grid3X3 },
          { to: '/admin/navigation/mobile', label: 'Mobile Menu', icon: Smartphone },
          { to: '/admin/navigation/settings', label: 'Menu Settings', icon: Settings },
        ],
      },
      {
        key: 'media',
        label: 'Media Library',
        icon: ImagePlus,
        children: [
          { to: '/admin/media', label: 'All Media', icon: ImagePlus },
          { to: '/admin/media/images', label: 'Images', icon: ImagePlus },
          { to: '/admin/media/videos', label: 'Videos', icon: FileText },
          { to: '/admin/media/documents', label: 'Documents', icon: FileText },
          { to: '/admin/media/product', label: 'Product Media', icon: Package },
          { to: '/admin/media/campaign', label: 'Campaign Media', icon: Megaphone },
          { to: '/admin/media/folders', label: 'Folders', icon: FolderOpen },
        ],
      },
      {
        key: 'seo',
        label: 'SEO',
        icon: TrendingUp,
        children: [
          { to: '/admin/seo', label: 'Store SEO', icon: BarChart3 },
          { to: '/admin/seo/products', label: 'Product SEO', icon: Package },
          { to: '/admin/seo/collections', label: 'Collection SEO', icon: FolderOpen },
          { to: '/admin/seo/pages', label: 'Page SEO', icon: FileText },
          { to: '/admin/seo/blog', label: 'Blog SEO', icon: FileText },
          { to: '/admin/redirects', label: 'Redirects', icon: Share2 },
          { to: '/admin/sitemap', label: 'Sitemap', icon: Code2 },
          { to: '/admin/schema', label: 'Structured Data', icon: Settings },
        ],
      },
      {
        key: 'preview',
        label: 'Store Preview',
        icon: Home,
        children: [
          { to: '/admin/preview/desktop', label: 'Desktop Preview', icon: Home },
          { to: '/admin/preview/mobile', label: 'Mobile Preview', icon: Smartphone },
          { to: '/admin/preview/guest', label: 'Guest Preview', icon: Users },
          { to: '/admin/preview/customer', label: 'Customer Preview', icon: UserCog },
          { to: '/admin/preview/market', label: 'Market Preview', icon: Store },
        ],
      },
    ],
  };

export const SETTINGS_GROUPS = [...SETTINGS_SECTION.groups, ...STOREFRONT_SECTION.groups];

export function findSettingsItem(pathname) {
  for (const g of SETTINGS_GROUPS) {
    for (const c of g.children || []) {
      if (c.to === pathname) return { group: g, item: c };
    }
  }
  return null;
}
