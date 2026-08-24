import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Store, CreditCard, Truck, ShoppingCart, Mail, Users, ShieldCheck, Calculator,
  Globe, Search, Bell, Palette, Megaphone, Plug, Database, Settings2, ChevronRight,
  Lock, FileText, Zap, Eye,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * SETTINGS HUB V3 — Phase 11 Consolidated Settings
 * Professional settings center with clear categories and navigation.
 * ========================================================================== */

const SETTINGS_GROUPS = [
  {
    section: 'Store',
    items: [
      { to: '/admin/settings/store', icon: Store, label: 'General', desc: 'Store name, contact, address, currency' },
      { to: '/admin/settings/checkout', icon: ShoppingCart, label: 'Checkout', desc: 'Checkout flow, terms, guest checkout' },
      { to: '/admin/settings/cart', icon: ShoppingCart, label: 'Shopping Bag', desc: 'Cart behavior, abandoned cart recovery' },
    ],
  },
  {
    section: 'Payments & Shipping',
    items: [
      { to: '/admin/settings/payments', icon: CreditCard, label: 'Payments', desc: 'Payment gateways, methods, configuration' },
      { to: '/admin/settings/shipping', icon: Truck, label: 'Shipping', desc: 'Shipping zones, rates, methods' },
      { to: '/admin/settings/taxes', icon: Calculator, label: 'Taxes', desc: 'Tax zones, rates, inclusive/exclusive' },
    ],
  },
  {
    section: 'Customers',
    items: [
      { to: '/admin/settings/accounts', icon: Users, label: 'Accounts', desc: 'Registration, login, customer experience' },
      { to: '/admin/settings/reviews', icon: Star, label: 'Reviews', desc: 'Review moderation, display settings' },
      { to: '/admin/settings/loyalty', icon: Zap, label: 'Loyalty', desc: 'Points, tiers, rewards configuration' },
    ],
  },
  {
    section: 'Communication',
    items: [
      { to: '/admin/settings/email', icon: Mail, label: 'Email', desc: 'SMTP, templates, notifications' },
    ],
  },
  {
    section: 'Storefront',
    items: [
      { to: '/admin/settings/search', icon: Search, label: 'Search', desc: 'Search behavior, synonyms, results' },
      { to: '/admin/settings/experience', icon: Eye, label: 'Experience', desc: 'Storefront display, product cards' },
    ],
  },
  {
    section: 'System',
    items: [
      { to: '/admin/settings/security', icon: ShieldCheck, label: 'Security', desc: 'Users, roles, audit logs, sessions' },
      { to: '/admin/apps', icon: Plug, label: 'Integrations', desc: 'Connected apps, API keys, webhooks' },
      { to: '/admin/backup', icon: Database, label: 'Backups', desc: 'Backup schedule, snapshots, restore' },
    ],
  },
];

function Star({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function SettingsHub() {
  const { auth } = useApp();
  const loc = useLocation();
  const [search, setSearch] = useState('');

  const filteredGroups = SETTINGS_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item =>
      !search || item.label.toLowerCase().includes(search.toLowerCase()) || item.desc.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(group => group.items.length > 0);

  return (
    <AdminLayout title="Settings">
      {/* Header */}
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb">
            <Link to="/admin">Home</Link>
            <span>/</span>
            <span>Settings</span>
          </div>
          <h1 className="v3-h-page">Settings</h1>
          <p className="v3-h-small mt-1">Configure your store, payments, shipping, and system preferences.</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search settings…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="v3-input"
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>

      {/* Settings Groups */}
      <div className="space-y-8">
        {filteredGroups.map(group => (
          <div key={group.section}>
            <div className="v3-h-label mb-3">{group.section}</div>
            <div className="v3-card">
              <div className="divide-y divide-[#F0F1F3]">
                {group.items.map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-[#F5F6F8] transition-colors"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="w-9 h-9 rounded-[5px] bg-[#F5F6F8] flex items-center justify-center flex-shrink-0">
                      <item.icon size={16} className="text-[#6B7280]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#111]">{item.label}</div>
                      <div className="text-[12px] text-[#9CA3AF] mt-0.5">{item.desc}</div>
                    </div>
                    <ChevronRight size={14} className="text-[#C4C7CC] flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="v3-empty">
          <Search size={24} className="v3-empty-icon" />
          <p className="v3-empty-title">No settings found</p>
          <p className="v3-empty-desc">Try a different search term.</p>
        </div>
      )}
    </AdminLayout>
  );
}
