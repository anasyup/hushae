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
  Menu, PanelLeftClose, PanelRightOpen, Sun, Moon, Globe, Plus, Search, ChevronDown, X,
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
  Settings, ShieldCheck, UserCog, DollarSign, HelpCircle, LogOut
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { applyAdminTheme, clearAdminTheme, getAdminTheme, setAdminTheme } from '../lib/adminTheme';
import CommandPalette from './CommandPalette';
import ProfitCalculator from './ProfitCalculator';
import NotificationBell from './dashboard/NotificationBell';

/* ============================================================================
 * ROLE-BASED PERMISSIONS
 * ========================================================================== */

const ALL_ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

const ROLE_ACCESS = {
  orders: ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'],
  products: ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse'],
  customers: ['admin', 'Owner', 'Manager', 'Staff', 'Support'],
  marketing: ['admin', 'Owner', 'Manager'],
  storefront: ['admin', 'Owner', 'Manager'],
  analytics: ['admin', 'Owner', 'Manager', 'Staff'],
  settings: ['admin', 'Owner'],
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
      { to: '/admin/analytics', label: 'Analytics Hub', icon: BarChart3 },
    ],
    defaultVisible: true,
  },
  {
    label: 'INBOX',
    icon: Bell,
    items: [
      { to: '/admin/inbox', label: 'All Messages', icon: MessageSquare },
      { to: '/admin/inbox/unread', label: 'Unread', icon: Bell },
      { to: '/admin/inbox/orders', label: 'Order Alerts', icon: ShoppingCart },
      { to: '/admin/inbox/payments', label: 'Payment Alerts', icon: CreditCard },
      { to: '/admin/inbox/system', label: 'System Notifications', icon: ShieldCheck },
    ],
    defaultVisible: true,
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
          { to: '/admin/orders', label: 'All Orders', icon: ShoppingBag },
          { to: '/admin/orders/draft', label: 'Draft Orders', icon: FileText },
          { to: '/admin/abandoned-carts', label: 'Abandoned Checkouts', icon: Package },
          { to: '/admin/orders/pending', label: 'Pending Payment', icon: CreditCard },
          { to: '/admin/orders/processing', label: 'Processing', icon: PackageCheck },
          { to: '/admin/orders/fulfillment', label: 'Fulfillment', icon: Truck },
          { to: '/admin/orders/shipped', label: 'Shipped', icon: ShoppingBag },
          { to: '/admin/orders/delivered', label: 'Delivered', icon: PackageCheck },
          { to: '/admin/orders/cancelled', label: 'Cancelled', icon: Box },
          { to: '/admin/orders/returns', label: 'Returns', icon: Package },
          { to: '/admin/orders/refunds', label: 'Refunds', icon: DollarSign },
          { to: '/admin/orders/issues', label: 'Payment Issues', icon: ShieldCheck },
        ],
      },
      {
        key: 'products',
        label: 'Products',
        icon: Package,
        children: [
          { to: '/admin/products', label: 'Catalog', icon: Package },
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
    defaultVisible: true,
  },
  {
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
    defaultVisible: false,
  },
  {
    label: 'GROWTH',
    icon: BarChart3,
    groups: [
      {
        key: 'marketing',
        label: 'Marketing',
        icon: Megaphone,
        children: [
          { to: '/admin/marketing', label: 'Marketing Overview', icon: BarChart3 },
          { to: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
          { to: '/admin/automations', label: 'Automations', icon: Zap },
          { to: '/admin/email-marketing', label: 'Email Marketing', icon: MessageSquare },
          { to: '/admin/sms-marketing', label: 'SMS Marketing', icon: MessageSquare },
          { to: '/admin/social-marketing', label: 'Social Marketing', icon: Share2 },
          { to: '/admin/segments', label: 'Customer Segments', icon: Users },
          { to: '/admin/abandoned-cart', label: 'Abandoned Cart', icon: ShoppingCart },
          { to: '/admin/loyalty-campaigns', label: 'Loyalty Campaigns', icon: Star },
          { to: '/admin/marketing/settings', label: 'Marketing Settings', icon: Settings },
        ],
      },
      {
        key: 'discounts',
        label: 'Discounts',
        icon: BadgePercent,
        children: [
          { to: '/admin/discounts', label: 'Discount Codes', icon: BadgePercent },
          { to: '/admin/discounts/auto', label: 'Automatic Discounts', icon: Zap },
          { to: '/admin/discounts/percentage', label: 'Percentage Discounts', icon: BadgePercent },
          { to: '/admin/discounts/fixed', label: 'Fixed Amount Discounts', icon: DollarSign },
          { to: '/admin/discounts/shipping', label: 'Free Shipping', icon: Truck },
          { to: '/admin/discounts/bundles', label: 'Buy X Get Y', icon: Package },
          { to: '/admin/discounts/customers', label: 'Customer Discounts', icon: Users },
          { to: '/admin/discounts/products', label: 'Product Discounts', icon: Package },
          { to: '/admin/discounts/collections', label: 'Collection Discounts', icon: FolderOpen },
          { to: '/admin/gift-cards', label: 'Gift Cards', icon: DollarSign },
        ],
      },
      {
        key: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
        children: [
          { to: '/admin/analytics', label: 'Overview', icon: BarChart3 },
          { to: '/admin/analytics/sales', label: 'Sales', icon: DollarSign },
          { to: '/admin/analytics/orders', label: 'Orders', icon: ShoppingCart },
          { to: '/admin/analytics/products', label: 'Products', icon: Package },
          { to: '/admin/analytics/customers', label: 'Customers', icon: Users },
          { to: '/admin/analytics/inventory', label: 'Inventory', icon: Box },
          { to: '/admin/analytics/marketing', label: 'Marketing', icon: Megaphone },
          { to: '/admin/analytics/conversion', label: 'Conversion', icon: TrendingUp },
          { to: '/admin/analytics/storefront', label: 'Storefront', icon: Store },
          { to: '/admin/analytics/finance', label: 'Finance', icon: CreditCard },
          { to: '/admin/analytics/live', label: 'Live View', icon: BarChart3 },
          { to: '/admin/analytics/custom', label: 'Custom Reports', icon: FileText },
          { to: '/admin/analytics/export', label: 'Export Reports', icon: FileSpreadsheet },
        ],
      },
    ],
    defaultVisible: false,
  },
  {
    label: 'OPERATIONS',
    icon: PackageCheck,
    groups: [
      {
        key: 'inventory',
        label: 'Inventory Operations',
        icon: Box,
        children: [
          { to: '/admin/inventory', label: 'Stock Overview', icon: Package },
          { to: '/admin/inventory/low', label: 'Low Stock', icon: ShieldCheck },
          { to: '/admin/inventory/out', label: 'Out of Stock', icon: Box },
          { to: '/admin/inventory/reserved', label: 'Reserved Stock', icon: PackageCheck },
          { to: '/admin/inventory/incoming', label: 'Incoming Stock', icon: Truck },
          { to: '/admin/warehouses', label: 'Warehouses', icon: Building2 },
          { to: '/admin/locations', label: 'Locations', icon: Building2 },
          { to: '/admin/transfers', label: 'Stock Transfers', icon: Share2 },
          { to: '/admin/adjustments', label: 'Stock Adjustments', icon: Calculator },
          { to: '/admin/inventory/history', label: 'Inventory History', icon: FileSpreadsheet },
        ],
      },
      {
        key: 'fulfillment',
        label: 'Fulfillment & Shipping',
        icon: Truck,
        children: [
          { to: '/admin/fulfillment', label: 'Fulfillment Queue', icon: PackageCheck },
          { to: '/admin/shipping/methods', label: 'Shipping Methods', icon: Truck },
          { to: '/admin/shipping/zones', label: 'Shipping Zones', icon: Globe },
          { to: '/admin/shipping/rates', label: 'Shipping Rates', icon: DollarSign },
          { to: '/admin/shipping/providers', label: 'Delivery Providers', icon: Building2 },
          { to: '/admin/shipping/labels', label: 'Shipping Labels', icon: FileText },
          { to: '/admin/shipping/tracking', label: 'Tracking', icon: TrendingUp },
          { to: '/admin/shipping/local', label: 'Local Delivery', icon: Home },
          { to: '/admin/shipping/pickup', label: 'Store Pickup', icon: Store },
          { to: '/admin/shipping/settings', label: 'Fulfillment Settings', icon: Settings },
        ],
      },
      {
        key: 'payments',
        label: 'Payments & Finance',
        icon: CreditCard,
        children: [
          { to: '/admin/payments/methods', label: 'Payment Methods', icon: CreditCard },
          { to: '/admin/payments/providers', label: 'Payment Providers', icon: Building2 },
          { to: '/admin/payments/transactions', label: 'Transactions', icon: DollarSign },
          { to: '/admin/payments/payouts', label: 'Payouts', icon: CreditCard },
          { to: '/admin/payments/invoices', label: 'Invoices', icon: FileText },
          { to: '/admin/payments/refunds', label: 'Refund Transactions', icon: DollarSign },
          { to: '/admin/payments/failures', label: 'Payment Failures', icon: ShieldCheck },
          { to: '/admin/payments/reports', label: 'Finance Reports', icon: BarChart3 },
        ],
      },
      {
        key: 'taxes',
        label: 'Taxes & Duties',
        icon: Calculator,
        children: [
          { to: '/admin/taxes/regions', label: 'Tax Regions', icon: Globe },
          { to: '/admin/taxes/rates', label: 'Tax Rates', icon: Calculator },
          { to: '/admin/taxes/classes', label: 'Tax Classes', icon: Tag },
          { to: '/admin/taxes/exemptions', label: 'Tax Exemptions', icon: ShieldCheck },
          { to: '/admin/taxes/duties', label: 'Duties', icon: Package },
          { to: '/admin/taxes/settings', label: 'Tax Settings', icon: Settings },
        ],
      },
    ],
    defaultVisible: false,
  },
  {
    label: 'CHANNELS',
    icon: Store,
    groups: [
      {
        key: 'sales-channels',
        label: 'Sales Channels',
        icon: Store,
        children: [
          { to: '/admin/channels/online', label: 'Online Store', icon: Store },
          { to: '/admin/channels/online/storefront', label: 'Storefront', icon: Home },
          { to: '/admin/channels/online/publishing', label: 'Product Publishing', icon: Package },
          { to: '/admin/channels/online/collections', label: 'Collection Publishing', icon: FolderOpen },
          { to: '/admin/channels/online/settings', label: 'Channel Settings', icon: Settings },
          { to: '/admin/channels/mobile', label: 'Mobile Store', icon: Smartphone },
          { to: '/admin/channels/mobile/catalog', label: 'Mobile Catalog', icon: Package },
          { to: '/admin/channels/mobile/homepage', label: 'Mobile Homepage', icon: Home },
          { to: '/admin/channels/mobile/settings', label: 'Mobile Settings', icon: Settings },
          { to: '/admin/channels/social', label: 'Social Commerce', icon: Share2 },
          { to: '/admin/channels/social/catalog', label: 'Social Catalog', icon: Package },
          { to: '/admin/channels/social/products', label: 'Social Products', icon: Package },
          { to: '/admin/channels/social/settings', label: 'Social Settings', icon: Settings },
          { to: '/admin/channels/marketplaces', label: 'Marketplaces', icon: MarketplaceIcon },
          { to: '/admin/channels/marketplaces/catalog', label: 'Marketplace Catalog', icon: Package },
          { to: '/admin/channels/marketplaces/listings', label: 'Listings', icon: FileSpreadsheet },
          { to: '/admin/channels/marketplaces/orders', label: 'Marketplace Orders', icon: ShoppingCart },
          { to: '/admin/channels/marketplaces/settings', label: 'Marketplace Settings', icon: Settings },
          { to: '/admin/channels/wholesale', label: 'Wholesale / B2B', icon: Building2 },
          { to: '/admin/channels/wholesale/catalogs', label: 'B2B Catalogs', icon: Package },
          { to: '/admin/channels/wholesale/pricing', label: 'Customer-Specific Pricing', icon: DollarSign },
          { to: '/admin/channels/wholesale/rules', label: 'Quantity Rules', icon: Calculator },
          { to: '/admin/channels/wholesale/orders', label: 'Wholesale Orders', icon: ShoppingCart },
          { to: '/admin/channels/pos', label: 'POS / Physical Stores', icon: ShoppingCart },
          { to: '/admin/channels/pos/locations', label: 'Store Locations', icon: Building2 },
          { to: '/admin/channels/pos/products', label: 'POS Products', icon: Package },
          { to: '/admin/channels/pos/inventory', label: 'POS Inventory', icon: Box },
          { to: '/admin/channels/pos/settings', label: 'POS Settings', icon: Settings },
        ],
      },
    ],
    defaultVisible: false,
  },
  {
    label: 'APPS & INTEGRATIONS',
    icon: Plug,
    items: [
      { to: '/admin/apps', label: 'Installed Apps', icon: Grid3X3 },
      { to: '/admin/apps/marketplace', label: 'App Marketplace', icon: Store },
      { to: '/admin/integrations/payments', label: 'Payment Integrations', icon: CreditCard },
      { to: '/admin/integrations/shipping', label: 'Shipping Integrations', icon: Truck },
      { to: '/admin/integrations/marketing', label: 'Marketing Integrations', icon: Megaphone },
      { to: '/admin/integrations/analytics', label: 'Analytics Integrations', icon: BarChart3 },
      { to: '/admin/integrations/marketplaces', label: 'Marketplace Integrations', icon: MarketplaceIcon },
      { to: '/admin/integrations/accounting', label: 'Accounting Integrations', icon: FileText },
      { to: '/admin/integrations/import', label: 'Import Connections', icon: FileSpreadsheet },
      { to: '/admin/integrations/product-sync', label: 'Product Sync', icon: Package },
      { to: '/admin/integrations/order-sync', label: 'Order Sync', icon: ShoppingCart },
      { to: '/admin/api-keys', label: 'API Keys', icon: Code2 },
      { to: '/admin/webhooks', label: 'Webhooks', icon: Share2 },
      { to: '/admin/automations', label: 'Automation Rules', icon: Zap },
      { to: '/admin/sync-history', label: 'Sync History', icon: FileSpreadsheet },
      { to: '/admin/integration-logs', label: 'Integration Logs', icon: FileText },
    ],
    defaultVisible: false,
  },
  {
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
    defaultVisible: false,
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
function getRoleLabel(role) {
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

  // Check if any child route is active (groups define either `children` or `items`)
  const groupItems = group.children || group.items || [];
  const isActive = groupItems.some(child => {
    if (child.to === loc.pathname) return true;
    if (loc.pathname.startsWith(child.to + '/')) return true;
    return false;
  });

  // Collapsed mode: Icon only
  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        title={group.label}
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
          isActive ? 'bg-[#1E1E1E] text-white' : 'text-[#6B6B6B] hover:bg-[#1A1A1A] hover:text-white'
        }`}
        aria-label={group.label}
        aria-expanded={expanded}
      >
        <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
      </button>
    );
  }

  // Expanded mode: Full dropdown
  return (
    <div className="space-y-0.5">
      <button
        onClick={onToggle}
        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all ${
          isActive ? 'bg-[#1E1E1E] text-white' : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-white'
        }`}
        aria-label={group.label}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
          <span className="text-sm">{group.label}</span>
        </div>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      
      {expanded && (
        <div className="pl-6 space-y-0.5">
          {groupItems.map(child => {
            const ChildIcon = child.icon;
            const isChildActive = loc.pathname === child.to || loc.pathname.startsWith(child.to + '/');
            const NavComponent = child.to ? NavLink : Fragment;
            
            return (
              <NavComponent
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className={({ isActive }) => {
                  const active = isActive || isChildActive;
                  return `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    active 
                      ? 'bg-[#252525] text-white font-medium'
                      : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
                  }`;
                }}
              >
                <ChildIcon size={14} strokeWidth={1.5} />
                <span>{child.label}</span>
              </NavComponent>
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
  const isActive = loc.pathname === item.to || (item.end && loc.pathname.startsWith(item.to));
  
  if (collapsed) {
    return (
      <NavLink
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        title={item.label}
        className={({ isActive }) => {
          const active = isActive || loc.pathname.startsWith(item.to + '/');
          return `flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
            active ? 'bg-[#1E1E1E] text-white' : 'text-[#6B6B6B] hover:bg-[#1A1A1A] hover:text-white'
          }`;
        }}
      >
        <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => {
        const active = isActive || loc.pathname.startsWith(item.to + '/');
        return `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
          active ? 'bg-[#1E1E1E] text-white font-medium' : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-white'
        }`;
      }}
    >
      <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
      <span>{item.label}</span>
    </NavLink>
  );
}

/* ============================================================================
 * SECTION HEADER COMPONENT
 * ========================================================================== */

function SectionHeader({ label, collapsed }) {
  if (collapsed) return null;
  
  return (
    <p className="px-3 py-1.5 text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">
      {label}
    </p>
  );
}

/* ============================================================================
 * SIDEBAR CONTENT COMPONENT
 * ========================================================================== */

function SidebarContent({ onNavigate, collapsed = false }) {
  const { auth, logout } = useApp();
  const loc = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const role = auth?.user?.role;
  const visibleSections = role 
    ? NAV_SECTIONS.filter(section => {
        if (section.groups) {
          return section.groups.some(g => roleHasAccess(role, g.key));
        }
        return section.items?.some(i => !i.requires || roleHasAccess(role, i.requires));
      })
    : NAV_SECTIONS;

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Auto-expand groups that have active children
  useEffect(() => {
    visibleSections.forEach(section => {
      section.groups?.forEach(group => {
        const hasActiveChild = (group.children || group.items || []).some(child => {
          return loc.pathname === child.to || loc.pathname.startsWith(child.to + '/');
        });
        if (hasActiveChild) {
          setExpandedGroups(prev => ({ ...prev, [group.key]: true }));
        }
      });
    });
  }, [loc.pathname, visibleSections]);

  // Get initials for user avatar
  const getInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className="flex h-full flex-col bg-[#0A0A0A] text-white">
      {/* ===== BRAND / LOGO ===== */}
      <div className="px-4 py-5 border-b border-[#252525]">
        <NavLink to="/admin" className="flex items-center gap-2 group" onClick={onNavigate}>
          {!collapsed && (
            <>
              <span className="text-xl font-bold tracking-wider">HUSHAE</span>
              <span className="text-xs text-[#6B6B6B] ml-1">Admin Console</span>
            </>
          )}
          {collapsed && <Building2 size={24} className="text-white" />}
        </NavLink>
      </div>

      {/* ===== GLOBAL SEARCH ===== */}
      <div className="px-3 py-3">
        <button
          onClick={() => { /* Will trigger CommandPalette */ }}
          className="w-full flex items-center gap-2 bg-[#111111] hover:bg-[#1E1E1E] p-2 rounded-lg transition-colors group"
        >
          <Search size={16} className="text-[#6B6B6B] group-hover:text-white" />
          {!collapsed && (
            <>
              <span className="text-sm text-[#A0A0A0] group-hover:text-white">Search anything...</span>
              <kbd className="text-xs bg-[#252525] px-2 py-0.5 rounded text-[#6B6B6B] group-hover:text-white">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* ===== NAVIGATION SECTIONS ===== */}
      <nav className="flex-1 px-2 overflow-y-auto scrollbar-thin">
        {/* Default Visible Sections */}
        {visibleSections.filter(s => s.defaultVisible).map(section => (
          <div key={section.label} className="mb-2">
            <SectionHeader label={section.label} collapsed={collapsed} />
            <div className="space-y-0.5">
              {section.items?.map(item => (
                <NavigationItem
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
              {section.groups?.map(group => (
                <GroupDropdown
                  key={group.key}
                  group={group}
                  expanded={expandedGroups[group.key]}
                  onToggle={() => toggleGroup(group.key)}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Advanced Sections Toggle */}
        {!collapsed && (
          <div className="my-2 border-t border-[#252525] pt-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg hover:bg-[#1A1A1A] transition-colors text-[#A0A0A0] hover:text-white"
            >
              <div className="flex items-center gap-2">
                <Settings size={14} />
                <span className="text-sm">Advanced</span>
              </div>
              <ChevronDown
                size={14}
                className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              />
            </button>
            
            {showAdvanced && visibleSections.filter(s => !s.defaultVisible).map(section => (
              <div key={section.label} className="mt-2">
                <SectionHeader label={section.label} collapsed={collapsed} />
                <div className="space-y-0.5">
                  {section.items?.map(item => (
                    <NavigationItem
                      key={item.to}
                      item={item}
                      collapsed={collapsed}
                      onNavigate={onNavigate}
                    />
                  ))}
                  {section.groups?.map(group => (
                    <GroupDropdown
                      key={group.key}
                      group={group}
                      expanded={expandedGroups[group.key]}
                      onToggle={() => toggleGroup(group.key)}
                      collapsed={collapsed}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* ===== SIDEBAR FOOTER ===== */}
      <div className="border-t border-[#252525] p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black font-bold text-sm shrink-0">
            {getInitials(auth?.user?.name)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{auth?.user?.name || 'Admin'}</p>
              <p className="text-xs text-[#6B6B6B] truncate">{getRoleLabel(role || '')}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-[#1A1A1A] transition-colors text-[#6B6B6B] hover:text-white"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
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

  // Get breadcrumb-like title
  const getPageTitle = () => {
    const parts = loc.pathname.split('/').filter(Boolean);
    if (parts.length <= 1) return title || 'Dashboard';
    return parts[parts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-[#252525] bg-[#0A0A0A] px-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4 w-full">
        {/* Left Side */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            className="grid h-9 w-9 shrink-0 place-items-center text-[#6B6B6B] hover:bg-[#1A1A1A] hover:text-white rounded-lg md:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-9 w-9 shrink-0 place-items-center text-[#6B6B6B] hover:bg-[#1A1A1A] hover:text-white rounded-lg md:grid"
          >
            {collapsed ? <PanelRightOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          
          <div className="min-w-0">
            <h1 className="truncate font-medium text-white">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Search */}
          <button
            type="button"
            onClick={onCmdK}
            className="hidden sm:flex h-8 items-center gap-2 rounded-lg border border-[#252525] bg-[#111111] px-3 text-sm text-[#A0A0A0] transition-colors hover:border-[#3A3A3A] hover:bg-[#1E1E1E] hover:text-white"
            title="Search anything (⌘K)"
          >
            <Search size={14} />
            <span>Search...</span>
            <kbd className="text-xs bg-[#252525] px-1.5 py-0.5 rounded text-[#6B6B6B]">⌘K</kbd>
          </button>

          {/* Store Status */}
          <span className={`hidden items-center gap-1.5 text-xs font-medium uppercase tracking-wider sm:inline-flex ${
            storeOpen ? 'text-[#6B6B6B]' : 'text-white'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${storeOpen ? 'bg-green-500' : 'bg-red-500'}`} />
            {storeOpen ? 'Store online' : 'Store locked'}
          </span>

          {/* Quick Create */}
          {canCreate && (
            <div className="relative" ref={createRef}>
              <button
                type="button"
                onClick={() => setCreateOpen(!createOpen)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-black transition hover:bg-[#E5E5E5]"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Create</span>
              </button>
              
              {createOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-[#252525] bg-[#111111] py-1 shadow-lg">
                  {createItems.map((it) => {
                    const Icon = it.icon;
                    return (
                      <Link
                        key={it.to}
                        to={it.to}
                        onClick={() => setCreateOpen(false)}
                        className="flex h-9 items-center gap-2.5 px-3 text-sm text-[#A0A0A0] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                      >
                        <Icon size={14} />
                        {it.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* View Store */}
          <Link
            to="/"
            target="_blank"
            className="hidden h-8 items-center gap-1.5 rounded-lg border border-[#252525] bg-[#111111] px-3 text-sm text-[#A0A0A0] transition-colors hover:border-[#3A3A3A] hover:bg-[#1E1E1E] hover:text-white md:inline-flex"
            title="Open storefront"
          >
            <Globe size={14} />
            <span className="hidden xl:inline">View store</span>
          </Link>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDark}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="h-8 w-8 grid place-items-center rounded-lg text-[#6B6B6B] hover:bg-[#1A1A1A] hover:text-white"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* User Profile */}
          <div className="ml-1 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-black font-semibold text-sm">
              {(auth?.user?.name || 'A').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <span className="hidden text-sm font-medium text-white xl:inline">{auth?.user?.name?.split(' ')[0] || 'Admin'}</span>
          </div>
        </div>
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

  // Apply admin theme
  useEffect(() => { 
    applyAdminTheme(); 
    return () => clearAdminTheme(); 
  }, []);

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
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
      <div className="grid min-h-screen place-items-center bg-[#0A0A0A]">
        <div className="max-w-sm rounded-xl border border-[#252525] bg-[#111111] p-10 text-center">
          <ShieldCheck size={36} className="mx-auto mb-3 text-yellow-500" />
          <p className="text-[15px] font-semibold text-white">Access restricted</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[#A0A0A0]">
            This section is only available to Administrator and Owner roles. 
            You are signed in as <b className="text-white">{getRoleLabel(role || '')}</b>.
          </p>
          <Link 
            to="/admin" 
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-[15px] font-semibold text-black transition hover:bg-[#E5E5E5]"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell flex min-h-screen bg-[#0A0A0A] text-white">
      {/* ===== SIDEBAR - DESKTOP ===== */}
      <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-[#252525] transition-all duration-200 ease-out md:flex ${
        collapsed ? 'w-16' : 'w-64'
      }`}>
        <SidebarContent onNavigate={() => {}} collapsed={collapsed} />
      </aside>

      {/* ===== MOBILE DRAWER ===== */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-[#252525] bg-[#0A0A0A]">
            <button 
              onClick={() => setDrawer(false)} 
              className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-[#6B6B6B] hover:bg-[#1A1A1A] hover:text-white"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setDrawer(false)} collapsed={false} />
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className={`flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-200 ease-out ${
        collapsed ? 'md:pl-16' : 'md:pl-64'
      }`}>
        {/* Top Bar */}
        <TopBar 
          title={title} 
          auth={auth} 
          onCmdK={() => setCmdOpen(true)} 
          onMenu={() => setDrawer(true)} 
          onToggleSidebar={toggleCollapsed} 
          collapsed={collapsed}
        />
        
        {/* Page Content */}
        <div className="min-w-0 flex-1 p-4 md:p-6">
          <div className="admin-main mx-auto w-full min-w-0 max-w-[1440px]">
            {title && (
              <h1 className="mb-5 font-medium text-white md:hidden">{title}</h1>
            )}
            {children}
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <ProfitCalculator />
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  );
}

export { Fragment };
