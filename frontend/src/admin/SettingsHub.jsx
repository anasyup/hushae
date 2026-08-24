import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import {
  PageHeader, ctl, EditorialEmpty, MonoStatus,
} from './settings/chrome';

/* ===========================================================================
 * SETTINGS HUB — editorial index. Destinations that already exist only.
 * ========================================================================== */

const GROUPS = [
  {
    index: '01',
    title: 'Store',
    items: [
      { to: '/admin/settings/store', title: 'Store details', desc: 'Name, tagline, contact and trust badges.', tags: ['name', 'contact', 'email', 'phone', 'brand', 'trust'] },
      { to: '/admin/settings/cart', title: 'Shopping Bag', desc: 'Cart wording, free-shipping bar, badges and recommendations.', tags: ['cart', 'bag', 'coupon', 'promo', 'trust'] },
      { to: '/admin/settings/checkout', title: 'Checkout', desc: 'Payment methods, delivery options, wording and thank-you page.', tags: ['checkout', 'payment', 'cod', 'delivery', 'terms'] },
      { to: '/admin/settings/accounts', title: 'Customer Accounts', desc: 'Registration, password rules, sessions and account permissions.', tags: ['account', 'register', 'login', 'password', 'session'] },
      { to: '/admin/settings/search', title: 'Search & Discovery', desc: 'Search fields, synonyms, suggestions and the shopping assistant.', tags: ['search', 'synonym', 'typo', 'suggest', 'assistant'] },
      { to: '/admin/settings/legal', title: 'Legal & Policies', desc: 'Terms, privacy, refund and cookie consent — reserved.', tags: ['legal', 'privacy', 'terms', 'policy', 'refund', 'cookie'] },
    ],
  },
  {
    index: '02',
    title: 'Commerce',
    items: [
      { to: '/admin/settings/payments', title: 'Payments', desc: 'COD, JazzCash, EasyPaisa, bank transfer and card gateways.', tags: ['payment', 'cod', 'jazzcash', 'easypaisa', 'bank', 'safepay'] },
      { to: '/admin/settings/shipping', title: 'Shipping', desc: 'Flat rate, free-shipping threshold and operating costs.', tags: ['shipping', 'delivery', 'courier', 'rates', 'free'] },
      { to: '/admin/settings/taxes', title: 'Taxes', desc: 'Global rate and Pakistan tax zones.', tags: ['tax', 'gst', 'zone', 'invoice'] },
    ],
  },
  {
    index: '03',
    title: 'Customer experience',
    items: [
      { to: '/admin/settings/experience', title: 'Customer Experience', desc: 'Wishlist, recently viewed and product comparison.', tags: ['wishlist', 'recently viewed', 'compare'] },
      { to: '/admin/settings/reviews', title: 'Reviews', desc: 'Who can review, moderation, photos and product questions.', tags: ['review', 'rating', 'moderation', 'question'] },
      { to: '/admin/settings/loyalty', title: 'Loyalty', desc: 'Points, VIP tiers, referrals, store credit and gift cards.', tags: ['loyalty', 'rewards', 'points', 'tier', 'referral'] },
    ],
  },
  {
    index: '04',
    title: 'Communication',
    items: [
      { to: '/admin/settings/email', title: 'Email & Notifications', desc: 'SMTP credentials, transactional templates and test send.', tags: ['email', 'smtp', 'templates', 'notification'] },
    ],
  },
  {
    index: '05',
    title: 'Integrations',
    items: [
      { to: '/admin/apps', title: 'Apps / Integrations', desc: 'WhatsApp, social, analytics pixels, SMTP and media library.', tags: ['analytics', 'pixel', 'ga', 'whatsapp', 'integration', 'apps'] },
    ],
  },
  {
    index: '06',
    title: 'System',
    items: [
      { to: '/admin/backup', title: 'Backup & Export', desc: 'JSON snapshot, restore and CSV exports.', tags: ['backup', 'export', 'restore', 'csv'] },
      { to: '/admin/settings/advanced', title: 'Advanced', desc: 'Analytics preferences, store identity and password.', tags: ['advanced', 'analytics', 'test orders', 'reorder'] },
    ],
  },
  {
    index: '07',
    title: 'Security',
    items: [
      { to: '/admin/settings/security', title: 'Security & Access', desc: 'Login, staff, devices, audit logs, fraud review and JWT rotation.', tags: ['security', 'password', 'staff', 'roles', 'audit', 'session', 'fraud', '2fa'] },
    ],
  },
  {
    index: '08',
    title: 'Also in admin',
    items: [
      { to: '/admin/marketing', title: 'Marketing & Automation', desc: 'Promotions, abandoned carts and automation rules.', tags: ['marketing', 'promotion', 'discount'] },
      { to: '/admin/content', title: 'Storefront Content', desc: 'Homepage, FAQ and merchandising content.', tags: ['content', 'hero', 'faq'] },
      { to: '/admin/markets', title: 'Markets & Regions', desc: 'Pakistan-first market configuration.', tags: ['markets', 'currency', 'regions'] },
    ],
  },
];

function matches(item, query) {
  if (!query) return true;
  return (
    item.title.toLowerCase().includes(query) ||
    item.desc.toLowerCase().includes(query) ||
    item.tags.some((t) => t.includes(query))
  );
}

export default function SettingsHub() {
  const { auth } = useApp();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const visible = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => matches(i, query)) })).filter((g) => g.items.length);
  const total = GROUPS.reduce((n, g) => n + g.items.length, 0);

  return (
    <AdminLayout title="Settings">
      <PageHeader
        title="Settings"
        description="Manage your store configuration and administration."
        actions={
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search settings"
            className={`${ctl} w-56 max-w-full`}
            aria-label="Search settings"
          />
        }
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          {visible.length === 0 ? (
            <EditorialEmpty title="No matching settings" description={`Nothing matches “${q}”.`} />
          ) : (
            visible.map((g) => (
              <section key={g.title} className="mb-10">
                <p className="adm-index">{g.index} — {g.title}</p>
                <div className="border-y border-[#EAEAEA]">
                  {g.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="adm-row-hover flex items-start justify-between gap-4 border-b border-[#F0F0F0] px-1 py-4 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] text-black">{item.title}</p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-[#AAAAAA]">{item.desc}</p>
                      </div>
                      <span className="mt-0.5 shrink-0 text-[9px] font-medium uppercase tracking-[0.18em] text-white/25">Open</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
          <section>
            <p className="adm-index">Signed in</p>
            <div className="border-y border-[#EAEAEA] py-5">
              <p className="text-[13px] text-black">{auth?.user?.name || 'Admin'}</p>
              <p className="mt-1 font-mono text-[12px] text-[#999999]">{auth?.user?.email || '—'}</p>
              <div className="mt-3">
                <MonoStatus label={auth?.user?.role ? String(auth.user.role).toUpperCase() : 'ADMIN'} />
              </div>
            </div>
          </section>

          <section>
            <p className="adm-index">Popular</p>
            <div className="border-y border-[#EAEAEA]">
              {[
                { to: '/admin/settings/security', label: 'Change admin password' },
                { to: '/admin/settings/payments', label: 'Add JazzCash number' },
                { to: '/admin/apps', label: 'Connect Google Analytics' },
                { to: '/admin/settings/shipping', label: 'Update shipping rates' },
              ].map((t) => (
                <Link key={t.to} to={t.to} className="adm-row-hover flex items-center justify-between border-b border-[#F0F0F0] px-1 py-3 text-[12px] text-[#555555] last:border-0 hover:text-black">
                  {t.label}
                  <span className="text-white/25">→</span>
                </Link>
              ))}
            </div>
          </section>

          <p className="text-[11px] leading-relaxed text-white/25">
            {total} destinations. Every page keeps the same save behaviour — only the presentation has changed.
          </p>
        </aside>
      </div>
    </AdminLayout>
  );
}
