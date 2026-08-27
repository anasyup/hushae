/**
 * SETTINGS CONSOLE IA — moved verbatim out of the main sidebar's NAV_SECTIONS.
 * The main sidebar now carries a single Settings entry (above the account
 * block); this rail is the organised home for every settings destination.
 */
import { BarChart3, Bell, Box, Building2, Calculator, Clock, Code2, CreditCard, DollarSign, FileSpreadsheet, FileText, Globe, Package, Settings, Share2, ShieldCheck, ShoppingCart, Store, TrendingUp, Truck, UserCog, Users, Zap } from 'lucide-react';

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

export const SETTINGS_GROUPS = SETTINGS_SECTION.groups;

export function findSettingsItem(pathname) {
  for (const g of SETTINGS_GROUPS) {
    for (const c of g.children || []) {
      if (c.to === pathname) return { group: g, item: c };
    }
  }
  return null;
}
