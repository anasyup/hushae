import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, Bell, ChevronRight, CreditCard, FileText, Globe, Info,
  KeyRound, LayoutTemplate, MapPin, Package, Palette, Search, ShieldCheck,
  Megaphone, ShoppingBag, Sparkles, Star, Store, Truck, Users, Zap,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * SETTINGS HUB — Shopify/Stripe-inspired but our own design.
 *
 * Design choices:
 *  - Two-column grid of category cards (icon + title + description + status pill)
 *  - Cards show a *live* status hint (e.g. "3 payment methods enabled")
 *  - Quick search filters cards by name/keywords
 *  - Right-side "Store snapshot" panel with the store's real values
 *  - Each card is a link to its focused sub-page — no giant single form
 * ========================================================================== */

const CARDS = [
  {
    to: '/admin/settings/store',
    icon: Store,
    title: 'Store details',
    desc: 'Your store name, tagline, contact info, trust badges — everything a customer identifies you by.',
    tags: ['name', 'contact', 'email', 'phone', 'brand', 'trust'],
  },
  {
    to: '/admin/settings/payments',
    icon: CreditCard,
    title: 'Payments',
    desc: 'Enable methods (COD, JazzCash, EasyPaisa, Bank Transfer) and add your account numbers.',
    tags: ['payment', 'cod', 'jazzcash', 'easypaisa', 'bank', 'iban'],
  },
  {
    to: '/admin/settings/shipping',
    icon: Truck,
    title: 'Shipping & Delivery',
    desc: 'Flat rate, free-shipping threshold, courier defaults, and delivery time expectations.',
    tags: ['shipping', 'delivery', 'courier', 'rates', 'free'],
  },
  {
    to: '/admin/settings/cart',
    icon: ShoppingBag,
    title: 'Shopping Bag',
    desc: 'Cart wording, free-shipping bar, trust badges, promo codes, save for later, delivery promise and recommendations.',
    tags: ['cart', 'bag', 'basket', 'coupon', 'promo', 'trust', 'free shipping', 'checkout', 'undo', 'recommendations'],
  },
  {
    to: '/admin/settings/checkout',
    icon: CreditCard,
    title: 'Checkout',
    desc: 'Payment methods, delivery options, checkout wording, trust badges, terms and the thank-you page.',
    tags: ['checkout', 'payment', 'cod', 'jazzcash', 'easypaisa', 'stripe', 'paypal', 'apple pay', 'google pay', 'delivery', 'express', 'pickup', 'terms', 'thank you', 'order success'],
  },
  {
    to: '/admin/settings/accounts',
    icon: Users,
    title: 'Customer Accounts',
    desc: 'Registration, password rules, email verification, profile photos, saved addresses and what customers can do.',
    tags: ['account', 'customer', 'register', 'login', 'password', 'reset', 'verification', 'avatar', 'address', 'session'],
  },
  {
    to: '/admin/settings/experience',
    icon: Sparkles,
    title: 'Customer Experience',
    desc: 'Wishlist, recently viewed and product comparison — limits, sharing and where each one appears.',
    tags: ['wishlist', 'heart', 'saved', 'recently viewed', 'compare', 'comparison', 'experience'],
  },
  {
    to: '/admin/settings/reviews',
    icon: Star,
    title: 'Reviews & Questions',
    desc: 'Who can review, moderation, photo limits, the star breakdown and product questions.',
    tags: ['review', 'rating', 'stars', 'moderation', 'question', 'qa', 'feedback', 'verified'],
  },
  {
    to: '/admin/settings/loyalty',
    icon: Sparkles,
    title: 'Loyalty & Rewards',
    desc: 'Points, VIP tiers, referrals, store credit and gift cards — how customers are rewarded for coming back.',
    tags: ['loyalty', 'rewards', 'points', 'tier', 'vip', 'referral', 'refer', 'gift card', 'credit', 'wallet', 'badge', 'birthday', 'retention'],
  },
  {
    to: '/admin/settings/search',
    icon: Search,
    title: 'Search & Discovery',
    desc: 'What customers can search, typo tolerance, synonyms, suggestions and the shopping assistant.',
    tags: ['search', 'find', 'synonym', 'typo', 'suggest', 'autocomplete', 'filter', 'discovery', 'assistant', 'recommend'],
  },
  {
    to: '/admin/marketing',
    icon: Megaphone,
    title: 'Marketing & Automation',
    desc: 'Track recovery rates, configure abandoned cart delays, automated review requests, discount rules, and flash sales.',
    tags: ['marketing', 'promotion', 'discount', 'sale', 'flash', 'bundle', 'badge', 'upsell', 'cross sell', 'offer', 'deal', 'abandoned', 'review'],
  },
  {
    to: '/admin/apps',
    icon: Zap,
    title: 'Apps & Integrations',
    desc: 'Analytics, tracking pixels, WhatsApp chat, social links, media library — third-party connections.',
    tags: ['analytics', 'pixel', 'ga', 'facebook', 'tiktok', 'whatsapp', 'integration', 'apps'],
    badge: 'External',
  },
  {
    to: '/admin/settings/email',
    icon: Mail,
    title: 'Email & SMTP',
    desc: 'Configure SMTP credentials, edit 6 transactional email templates, and verify connections with test messages.',
    tags: ['email', 'smtp', 'templates', 'mailer', 'send', 'test', 'order confirmation', 'status'],
  },
  {
    to: '/admin/settings/security',
    icon: ShieldCheck,
    title: 'Security & Access',
    desc: 'Change your admin password, sign-in sessions, and appearance for this device.',
    tags: ['security', 'password', 'admin', 'access', 'session', 'dark mode', 'theme'],
  },
  {
    to: '/admin/settings/legal',
    icon: FileText,
    title: 'Legal & Policies',
    desc: 'Terms of service, privacy policy, refund policy, and cookie consent text.',
    tags: ['legal', 'privacy', 'terms', 'policy', 'refund', 'cookie'],
    badge: 'Coming soon',
  },
  {
    to: '/admin/content',
    icon: LayoutTemplate,
    title: 'Storefront Content',
    desc: 'Homepage hero banner, marquee, promo popup, FAQ — everything visible on the website.',
    tags: ['content', 'hero', 'banner', 'faq', 'promo', 'marquee'],
    external: true,
  },
  {
    to: '/admin/markets',
    icon: Globe,
    title: 'Markets & Regions',
    desc: 'Countries you sell to, currency preferences, and international settings.',
    tags: ['markets', 'international', 'currency', 'regions'],
    external: true,
  },
];

export default function SettingsHub() {
  const { auth } = useApp();
  const [q, setQ] = useState('');

  // Filter cards by search query
  const query = q.trim().toLowerCase();
  const filtered = query
    ? CARDS.filter((c) =>
        c.title.toLowerCase().includes(query) ||
        c.desc.toLowerCase().includes(query) ||
        c.tags.some((t) => t.includes(query))
      )
    : CARDS;

  return (
    <AdminLayout title="Settings">
      {/* Intro row: name + description + quick search */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-[13px] leading-relaxed text-neutral-500">
            Configure how your store runs — from your name and contact info to payments,
            shipping, security and the apps you connect. Every card below opens a focused page.
          </p>
        </div>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search settings…"
            className="input !w-72 !py-2.5 !pl-9 !text-[13px]"
          />
        </div>
      </div>

      {/* Main grid: cards + snapshot */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Card grid */}
        <div>
          {filtered.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center">
              <Search size={26} className="mb-2 text-neutral-300" />
              <p className="text-sm text-neutral-500">No settings match "{q}"</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((c) => {
                const Icon = c.icon;
                return (
                  <Link
                    key={c.to}
                    to={c.to}
                    className="group relative flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-sm"
                  >
                    <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-50 text-neutral-700 transition group-hover:bg-neutral-900 group-hover:text-white">
                      <Icon size={18} strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-neutral-900">{c.title}</p>
                        {c.badge && (
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            c.badge === 'Coming soon'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}>{c.badge}</span>
                        )}
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">{c.desc}</p>
                    </div>
                    <span className="absolute right-4 top-4 text-neutral-300 transition group-hover:text-neutral-900">
                      {c.external ? <ArrowUpRight size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sidebar: quick info panel */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-neutral-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Signed in as</p>
            </div>
            <p className="mt-2 text-[13px] font-semibold text-neutral-900">{auth?.user?.name || 'Admin'}</p>
            <p className="mt-0.5 font-mono text-[11px] text-neutral-500">{auth?.user?.email || 'underadmin'}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Admin access
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Popular tasks</p>
            <div className="mt-3 space-y-1">
              {[
                { to: '/admin/settings/security', label: 'Change admin password' },
                { to: '/admin/settings/payments', label: 'Add JazzCash number' },
                { to: '/admin/apps',              label: 'Connect Google Analytics' },
                { to: '/admin/settings/shipping', label: 'Update shipping rates' },
              ].map((t) => (
                <Link key={t.to} to={t.to} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px] text-neutral-700 transition hover:bg-neutral-50">
                  {t.label}
                  <ChevronRight size={12} className="text-neutral-400" />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-900 bg-neutral-900 p-5 text-neutral-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Need help?</p>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-200">
              Every setting page has inline hints. If you get stuck, contact your developer or open the changelog.
            </p>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}
