import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgePercent, BarChart3, ImagePlus, Mail, Megaphone, Package,
  ShoppingBag, Sparkles, TrendingUp, Users, Zap,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid } from './orders/orderUi';

/* ============================================================================
 * MARKETING OVERVIEW — Phase 6: Real-data growth dashboard
 * No fake metrics. Every number backed by a database query.
 * ========================================================================== */

function MetricCard({ icon: Icon, label, value, hint, to }) {
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper to={to} className="rounded-md border border-[#EAEAEA] bg-white p-5 transition-colors hover:bg-[#FAFAFA]">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{label}</p>
        <Icon size={14} strokeWidth={1.5} className="text-[#DCDCDC]" />
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none tracking-tight text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {hint && <p className="mt-2 text-[11px] text-[#AAAAAA]">{hint}</p>}
    </Wrapper>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-md border border-[#EAEAEA] bg-white">
      <div className="border-b border-[#EAEAEA] px-5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Marketing() {
  const { auth, toast } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api('/marketing/dashboard', { token: auth.token });
      setData(d);
    } catch {
      toast('Failed to load marketing dashboard');
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  if (loading) {
    return (
      <AdminLayout title="Marketing">
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 v2-skeleton rounded-md" />)}
        </div>
      </AdminLayout>
    );
  }

  const p = data?.promotions || {};
  const c = data?.coupons || {};
  const camp = data?.campaigns || {};
  const cart = data?.abandonedCarts || {};
  const aud = data?.audience || {};
  const ban = data?.banners || {};

  return (
    <AdminLayout title="Marketing">
      <PageHeader
        title="Marketing"
        description="Real marketing operations — promotions, campaigns, coupons, and growth."
        actions={(
          <>
            <Link to="/admin/promotions" className={btnGhost}>Promotions</Link>
            <Link to="/admin/discounts" className={btnGhost}>Coupons</Link>
            <Link to="/admin/email-campaigns" className={btnSolid}><Mail size={12} /> New Campaign</Link>
          </>
        )}
      />

      {/* ── Primary Metrics ─────────────────────────────────────────── */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Megaphone} label="Active Promotions" value={p.active || 0} hint={`${p.scheduled || 0} scheduled`} to="/admin/promotions" />
        <MetricCard icon={BadgePercent} label="Coupon Redemptions" value={c.totalRedemptions || 0} hint={`${c.active || 0} active coupons`} to="/admin/discounts" />
        <MetricCard icon={TrendingUp} label="Discount Given (30d)" value={pkr(p.discountGiven30d || 0)} hint={`${p.redemptions30d || 0} redemptions`} />
        <MetricCard icon={ShoppingBag} label="Promo Orders (30d)" value={p.attributedOrders30d || 0} hint="Orders with promotion applied" to="/admin/orders" />
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Mail} label="Campaigns Sent" value={camp.totalSent || 0} hint={`${camp.totalFailed || 0} failed · ${camp.totalSkipped || 0} skipped`} to="/admin/email-campaigns" />
        <MetricCard icon={Users} label="Audience" value={(aud.totalCustomers || 0).toLocaleString()} hint={`${aud.vip || 0} VIP · ${aud.subscribers || 0} subscribers`} to="/admin/customers" />
        <MetricCard icon={Package} label="Abandoned Carts" value={cart.open || 0} hint={`${cart.recovered || 0} recovered (${cart.recoveryRate || 0}%)`} to="/admin/abandoned-carts" />
        <MetricCard icon={ImagePlus} label="Active Banners" value={ban.active || 0} hint="Live on storefront" to="/admin/banners" />
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────── */}
      <SectionCard title="Quick Actions">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/admin/promotions/new', icon: Megaphone, label: 'New Promotion' },
            { to: '/admin/discounts', icon: BadgePercent, label: 'New Coupon' },
            { to: '/admin/email-campaigns', icon: Mail, label: 'New Campaign' },
            { to: '/admin/banners', icon: ImagePlus, label: 'New Banner' },
            { to: '/admin/flash-sales', icon: Zap, label: 'Flash Sale' },
            { to: '/admin/bundles', icon: Package, label: 'Bundle' },
            { to: '/admin/customers/groups', icon: Users, label: 'Customer Groups' },
            { to: '/admin/marketing/analytics', icon: BarChart3, label: 'Performance' },
          ].map(a => (
            <Link key={a.label} to={a.to} className="flex items-center gap-3 rounded-md border border-[#EAEAEA] p-3 text-[13px] font-medium text-black transition hover:border-[#DCDCDC] hover:bg-[#FAFAFA]">
              <a.icon size={16} strokeWidth={1.5} className="text-[#777777]" />
              {a.label}
            </Link>
          ))}
        </div>
      </SectionCard>

      {/* ── Audience Breakdown ───────────────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Audience Segments">
          <div className="space-y-3">
            {[
              { label: 'Total Customers', value: aud.totalCustomers || 0 },
              { label: 'VIP (PKR 500k+)', value: aud.vip || 0 },
              { label: 'Newsletter Subscribers', value: aud.subscribers || 0 },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between border-b border-[#F0F0F0] pb-2 last:border-0">
                <span className="text-[13px] text-[#555555]">{r.label}</span>
                <span className="text-[14px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <Link to="/admin/customers" className="mt-4 inline-block text-[12px] font-medium text-[#777777] hover:text-black">View all customers →</Link>
        </SectionCard>

        <SectionCard title="Campaign History">
          <div className="space-y-3">
            {[
              { label: 'Total Campaigns', value: camp.total || 0 },
              { label: 'Drafts', value: camp.drafts || 0 },
              { label: 'Messages Sent', value: camp.totalSent || 0 },
              { label: 'Failed / Skipped', value: (camp.totalFailed || 0) + (camp.totalSkipped || 0) },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between border-b border-[#F0F0F0] pb-2 last:border-0">
                <span className="text-[13px] text-[#555555]">{r.label}</span>
                <span className="text-[14px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <Link to="/admin/email-campaigns" className="mt-4 inline-block text-[12px] font-medium text-[#777777] hover:text-black">View all campaigns →</Link>
        </SectionCard>
      </div>
    </AdminLayout>
  );
}
