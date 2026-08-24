import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import OrderProfitability from './finance/OrderProfitability';
import { BreakEven, CodExposure, ProfitByCustomer, ProfitByProduct } from './finance/ProfitTables';
import { btnGhost, btnSolid, TableSkeleton } from './orders/orderUi';

/* ============================================================================
 * FINANCE & P&L — Phase 7: Comprehensive Financial Dashboard
 * Every metric backed by shared backend calculations. No fake numbers.
 * ========================================================================== */

const RANGES = [
  { key: '7',  label: '7 days',  days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
  { key: '365', label: '1 year', days: 365 },
];

function MetricTile({ label, value, hint, icon: Icon, tone = 'neutral' }) {
  return (
    <div className="rounded-md border border-[#EAEAEA] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{label}</p>
        {Icon && <Icon size={14} strokeWidth={1.5} className={tone === 'positive' ? 'text-black' : tone === 'negative' ? 'text-[#777777]' : 'text-[#DCDCDC]'} />}
      </div>
      <p className="mt-3 text-[22px] font-semibold leading-none tracking-tight text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {hint && <p className="mt-2 text-[11px] text-[#AAAAAA]">{hint}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-md border border-[#EAEAEA] bg-white">
      <div className="border-b border-[#EAEAEA] px-5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Row({ label, value, bold = false, muted = false }) {
  return (
    <div className="flex items-center justify-between border-b border-[#F0F0F0] py-2 last:border-0">
      <span className={`text-[13px] ${muted ? 'text-[#999999]' : 'text-[#555555]'}`}>{label}</span>
      <span className={`text-[13px] ${bold ? 'font-semibold text-black' : 'text-black'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

export default function Finance() {
  const { auth, toast } = useApp();
  const [range, setRange] = useState('30');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const load = async () => {
    setLoading(true);
    try {
      const r = RANGES.find(r => r.key === range);
      const d = await api(`/finance/dashboard?days=${r?.days || 30}`, { token: auth.token });
      setData(d);
    } catch { toast('Failed to load finance data'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [range]); // eslint-disable-line

  const exportCsv = async (type) => {
    try {
      const r = RANGES.find(r => r.key === range);
      const res = await fetch(`/api/finance/export/${type}?days=${r?.days || 30}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `hushae-${type}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast('Export downloaded');
    } catch { toast('Export failed'); }
  };

  if (loading) return <AdminLayout title="Finance"><div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-28 v2-skeleton rounded-md" />)}</div></AdminLayout>;

  const d = data || {};
  const sales = d.sales || {};
  const payments = d.payments || {};
  const refunds = d.refunds || {};
  const shipping = d.shipping || {};
  const tax = d.tax || {};
  const costs = d.costs || {};
  const profit = d.profit || {};
  const cash = d.cashFlow || {};

  return (
    <AdminLayout title="Finance & P&L">
      <PageHeader
        title="Finance & P&L"
        description="Revenue, costs, profit, cash flow — all from shared backend calculations."
        actions={(
          <>
            <button onClick={() => exportCsv('sales')} className={btnGhost}><Download size={12} /> Export Sales</button>
            <button onClick={() => exportCsv('expenses')} className={btnGhost}><FileText size={12} /> Export Expenses</button>
          </>
        )}
      />

      {/* Date range */}
      <div className="mb-6 flex gap-2">
        {RANGES.map(r => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className={`rounded-md px-4 py-2 text-[12px] font-medium transition ${range === r.key ? 'bg-black text-white' : 'border border-[#EAEAEA] text-[#555555] hover:border-[#DCDCDC]'}`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-[#EAEAEA]">
        {['overview', 'profitability', 'reports'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${tab === t ? 'border-black text-black' : 'border-transparent text-[#AAAAAA] hover:text-[#777777]'}`}>
            {t === 'overview' ? 'P&L Overview' : t === 'profitability' ? 'Profitability' : 'Reports'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Primary Metrics */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="Net Revenue" value={pkr(sales.netRevenue || 0)} hint={`${sales.orders || 0} orders · AOV ${pkr(sales.aov || 0)}`} icon={TrendingUp} tone="positive" />
            <MetricTile label="Estimated Profit" value={pkr(profit.estimated || 0)} hint={`Margin: ${profit.margin || 0}%`} icon={profit.estimated >= 0 ? TrendingUp : TrendingDown} tone={profit.estimated >= 0 ? 'positive' : 'negative'} />
            <MetricTile label="Total Refunds" value={pkr(refunds.total || 0)} hint={`${refunds.count || 0} refunds`} />
            <MetricTile label="Tax Collected" value={pkr(tax.collected || 0)} />
          </div>

          {/* P&L Breakdown */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Section title="Revenue">
              <Row label="Gross Sales" value={pkr(sales.grossRevenue || 0)} />
              <Row label="Discounts Given" value={`- ${pkr(sales.grossRevenue - (sales.netRevenue || 0))}`} muted />
              <Row label="Net Revenue" value={pkr(sales.netRevenue || 0)} bold />
              <Row label="Shipping Collected" value={pkr(shipping.collected || 0)} />
              <Row label="Tax Collected" value={pkr(tax.collected || 0)} muted />
              <Row label="Cancelled Orders" value={String(sales.cancelledOrders || 0)} muted />
            </Section>

            <Section title="Costs">
              <Row label="Product Cost (COGS)" value={pkr(costs.cogs || 0)} />
              <Row label="Packaging" value={pkr(costs.packaging || 0)} />
              <Row label="Courier / Shipping" value={pkr(costs.courier || 0)} />
              <Row label="Payment Fees" value={pkr(costs.paymentFees || 0)} />
              <Row label="Business Expenses" value={pkr(costs.expenses || 0)} />
              <Row label="Refunds" value={pkr(refunds.total || 0)} muted />
            </Section>
          </div>

          {/* Cash Flow */}
          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            <MetricTile label="Cash Inflows" value={pkr(cash.inflows || 0)} hint="Paid orders" icon={TrendingUp} tone="positive" />
            <MetricTile label="Cash Outflows" value={pkr(cash.outflows || 0)} hint="Refunds + expenses + costs" icon={TrendingDown} tone="negative" />
            <MetricTile label="Net Cash Flow" value={pkr(cash.net || 0)} tone={cash.net >= 0 ? 'positive' : 'negative'} />
          </div>

          {/* Shipping */}
          <div className="mb-6">
            <Section title="Shipping Profitability">
              <div className="grid gap-4 sm:grid-cols-3">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Charged to Customers</p><p className="mt-1 text-[18px] font-semibold text-black">{pkr(shipping.collected || 0)}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Courier Cost</p><p className="mt-1 text-[18px] font-semibold text-black">{pkr(shipping.cost || 0)}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Shipping Margin</p><p className={`mt-1 text-[18px] font-semibold ${(shipping.margin || 0) >= 0 ? 'text-black' : 'text-[#777777]'}`}>{pkr(shipping.margin || 0)}</p></div>
              </div>
            </Section>
          </div>

          {/* Payment breakdown */}
          {payments.breakdown && Object.keys(payments.breakdown).length > 0 && (
            <Section title="Payment Methods">
              <div className="space-y-2">
                {Object.entries(payments.breakdown).map(([method, data]) => (
                  <Row key={method} label={`${method} (${data.count} orders)`} value={pkr(data.total)} />
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-[12px] text-[#999999]">
                <span>{payments.paid || 0} paid</span>
                <span>{payments.pending || 0} pending</span>
              </div>
            </Section>
          )}

          <p className="mt-6 text-[11px] text-[#AAAAAA]">
            ⚠️ Estimated Profit is commerce-level reporting, not audited accounting. Cash flow is not bank reconciliation.
          </p>
        </>
      )}

      {tab === 'profitability' && (
        <div className="space-y-6">
          <OrderProfitability />
          <div className="grid gap-6 lg:grid-cols-2">
            <ProfitByProduct />
            <ProfitByCustomer />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <CodExposure />
            <BreakEven />
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-6">
          <Section title="Financial Reports">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Sales Report', desc: 'All orders with totals', action: () => exportCsv('sales') },
                { label: 'Expense Report', desc: 'Business expenses by category', action: () => exportCsv('expenses') },
              ].map(r => (
                <button key={r.label} onClick={r.action} className="flex items-center justify-between rounded-md border border-[#EAEAEA] p-4 text-left transition hover:border-[#DCDCDC] hover:bg-[#FAFAFA]">
                  <div>
                    <p className="text-[14px] font-medium text-black">{r.label}</p>
                    <p className="mt-1 text-[12px] text-[#999999]">{r.desc}</p>
                  </div>
                  <Download size={16} className="text-[#AAAAAA]" />
                </button>
              ))}
            </div>
          </Section>
          <Section title="Quick Links">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { to: '/admin/orders', label: 'All Orders' },
                { to: '/admin/payments', label: 'Payment Verification' },
                { to: '/admin/ops', label: 'Operations' },
                { to: '/admin/settings/taxes', label: 'Tax Settings' },
              ].map(l => (
                <Link key={l.label} to={l.to} className="rounded-md border border-[#EAEAEA] p-3 text-center text-[13px] font-medium text-black transition hover:border-[#DCDCDC] hover:bg-[#FAFAFA]">
                  {l.label}
                </Link>
              ))}
            </div>
          </Section>
        </div>
      )}
    </AdminLayout>
  );
}
