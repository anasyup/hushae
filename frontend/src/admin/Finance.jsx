import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Download, FileText, RefreshCcw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import { Chip, EmptyState, HeadRow, Metric, Row, Section } from './analytics/sections';
import { SplitBar, WaterfallChart, money } from './analytics/svgcharts';
import OrderProfitability from './finance/OrderProfitability';
import { BreakEven, CodExposure, ProfitByCustomer, ProfitByProduct } from './finance/ProfitTables';
import { buildKpis, buildMemos, buildStatement, delta, deltaTone, fmtDelta, runwayDays } from './finance/pnl';
import { exportPnlReport } from './finance/exportPnl';
import './finance/finance.css';

/* Finance rebuilt on the shared report system (analytics/sections.jsx +
 * svgcharts.jsx) so it matches the rest of the admin instead of carrying its
 * own hard-coded dark palette — the old page set `text-white` 83 times against
 * a `#FFFFFF` light background, which made it unreadable in light mode.
 *
 * Every figure comes from GET /api/finance/pnl, built on the backend's
 * utils/orderEconomics.js. The old page recomputed P&L in the browser with
 * different rules and so disagreed with its own order-profitability table by
 * PKR 1,120 on a 10-order sample. One source of truth, one set of numbers. */

const RANGES = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
];

export default function Finance() {
  const { auth } = useApp();
  const [range, setRange] = useState('30');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const days = RANGES.find((r) => r.key === range)?.days || 30;

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await api(`/finance/pnl?days=${days}`, { token: auth?.token });
      setD(r);
    } catch (e) {
      setErr(e.message || 'Could not load finance');
    } finally {
      setBusy(false);
    }
  }, [auth?.token, days]);

  useEffect(() => { load(); }, [load]);

  const c = d?.current;
  const prev = d?.previous;
  const kpis = buildKpis(c, prev);
  const statement = buildStatement(c);
  const memos = buildMemos(c);
  const cover = c ? runwayDays(c.contribution, c.opexTotal * (30 / Math.max(1, c.days || days))) : null;

  const actions = (
    <div className="fn-act">
      <div className="od-seg" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button key={r.key} type="button" className={range === r.key ? 'on' : ''} onClick={() => setRange(r.key)}>
            {r.label}
          </button>
        ))}
      </div>
      <button type="button" className="adm-chip" onClick={load} disabled={busy}>
        <RefreshCcw size={13} className={busy ? 'fn-spin' : ''} /> Refresh
      </button>
      <button
        type="button"
        className="adm-chip"
        disabled={!c}
        onClick={() => exportPnlReport({
          summary: {
            revenue: c.revenue, grossProfit: c.grossProfit, netProfit: c.netProfit,
            margin: c.netMargin, grossMargin: c.grossMargin, aov: c.aov, orderCount: c.orders,
            itemCount: 0, totalExpense: (c.costs?.total || 0) + (c.opexTotal || 0),
            daily: c.daily, paymentMix: c.paymentMix, insights: [],
            statement, memos,
          },
          rangeLabel: `${days} days`,
          sinceDate: d.range.from,
          until: d.range.to,
        })}
      >
        <FileText size={13} /> P&amp;L
      </button>
      <a className="adm-chip" href="/admin/finance/transactions">
        <Download size={13} /> Transactions
      </a>
    </div>
  );

  if (err) {
    return (
      <AdminLayout title="Finance">
        <div className="od-page">
          <div className="od-head">
            <div>
              <p className="adm-eyebrow" style={{ padding: 0 }}>Money</p>
              <h2 className="od-display" style={{ fontSize: 26 }}>Finance</h2>
            </div>
          </div>
          <div className="od-empty">
            <p className="od-empty-t">Unable to load finance</p>
            <p className="od-empty-b">{err}</p>
            <button type="button" className="od-fbtn" style={{ marginTop: 12 }} onClick={load}>Retry</button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!c) {
    return (
      <AdminLayout title="Finance">
        <div className="od-page">
          <div className="od-head">
            <div>
              <p className="adm-eyebrow" style={{ padding: 0 }}>Money</p>
              <h2 className="od-display" style={{ fontSize: 26 }}>Finance</h2>
            </div>
            {actions}
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="od-card">
                <div className="od-skel" style={{ height: 16, width: '32%' }} />
                <div className="od-skel" style={{ height: 96, marginTop: 12 }} />
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Finance">
      <div className="od-page an-charts">
        <div className="od-head">
          <div>
            <p className="adm-eyebrow" style={{ padding: 0 }}>Money</p>
            <h2 className="od-display" style={{ fontSize: 26 }}>Finance</h2>
            <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-label)' }}>
              Profit &amp; loss, cash and unit economics — last {c.days} days, against the {c.days} days before.
            </p>
          </div>
          {actions}
        </div>

        {/* the page's own numbers must agree with its own tables */}
        {c.ladderCheck !== 0 && (
          <div className="an-callout">
            <AlertTriangle size={14} />
            <span>
              These figures do not reconcile with the order-level tables (drift {pkr(c.ladderCheck)}).
              Treat them as indicative and check product cost prices.
            </span>
          </div>
        )}
        {Math.abs(c.reconcileDrift || 0) > 1 && (
          <div className="an-callout">
            <AlertTriangle size={14} />
            <span>
              Income lines differ from net sales by {pkr(c.reconcileDrift)} — usually an order edited
              after checkout. Worth a look before month end.
            </span>
          </div>
        )}

        <div className="an-grid">

          {/* ── 1 · headline ─────────────────────────────────────────────── */}
          <Section className="an-c12" title="Where the money landed" subtitle={`Last ${c.days} days · % is against the previous ${c.days} days`}>
            <div className="fn-kpis">
              {kpis.map((k) => (
                <div className="fn-kpi" key={k.key}>
                  <div className="fn-kpi-l">{k.label}</div>
                  <div className={`fn-kpi-v ${k.verdict ? (k.value < 0 ? 'neg' : 'pos') : ''}`}>{pkr(k.value)}</div>
                  <div className="fn-kpi-f">
                    <span className={`fn-chip ${k.tone}`}>{fmtDelta(k.pct)}</span>
                    <span className="fn-kpi-s">{k.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── 2 · gross to net ─────────────────────────────────────────── */}
          <Section
            className="an-c12"
            delay={40}
            title="From sales to profit"
            subtitle="Every deduction between what customers paid and what you keep. The deposit is not the revenue."
          >
            <WaterfallChart steps={d.waterfall} />
          </Section>

          {/* ── 3 · P&L statement ────────────────────────────────────────── */}
          <Section
            className="an-c7"
            delay={80}
            title="Profit &amp; loss"
            subtitle="Activity-based — each group shows what created the number"
            footer={
              cover != null ? (
                <span>
                  Contribution covers about <b>{cover} days</b> of your fixed monthly costs.
                </span>
              ) : (
                <span>Add monthly marketing, SEO and other costs in Settings → Shipping &amp; Operating Costs to see runway.</span>
              )
            }
          >
            <div className="fn-pl">
              {statement.map((g) => (
                <div className="fn-pl-g" key={g.title}>
                  <p className="fn-pl-t">{g.title}</p>
                  {g.rows.filter((r) => r.value !== 0).map((r) => (
                    <div className="fn-pl-r" key={r.label}>
                      <span className="fn-pl-l">{r.label}</span>
                      <span className={`fn-pl-v ${r.value < 0 ? 'neg' : ''}`}>
                        {r.value < 0 ? '−' : ''}{pkr(Math.abs(r.value))}
                      </span>
                    </div>
                  ))}
                  <div className={`fn-pl-s ${g.subtotal.emphasis ? 'em' : ''}`}>
                    <span>{g.subtotal.label}</span>
                    <span>
                      {g.subtotal.value < 0 ? '−' : ''}{pkr(Math.abs(g.subtotal.value))}
                      {g.subtotal.rate != null && <em>{g.subtotal.rate}%</em>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── 4 · memos + payment mix ──────────────────────────────────── */}
          <Section className="an-c5" delay={120} title="Not revenue" subtitle="Money that moved but is not income">
            {memos.length === 0 ? (
              <EmptyState title="Nothing to report" body="No tax, refunds or cancellations in this range." />
            ) : (
              <ul className="fn-memo">
                {memos.map((m) => (
                  <li key={m.label}>
                    <span>{m.label}</span>
                    <b>{pkr(m.value)}</b>
                  </li>
                ))}
              </ul>
            )}

            <p className="an-sub-h" style={{ marginTop: 18 }}>Payment methods</p>
            {c.paymentMix.length === 0 ? (
              <EmptyState title="No payments in this range" />
            ) : (
              <SplitBar
                label="Share of net sales"
                data={c.paymentMix.map((m) => ({ label: m.method, value: m.revenue }))}
              />
            )}

            {c.paymentMix.some((m) => m.fees > 0) && (
              <div className="fn-fees">
                <HeadRow label="Method" cols={[{ label: 'Fees paid', span: 3 }, { label: 'Profit', span: 3 }]} />
                {c.paymentMix.map((m) => (
                  <Row key={m.method} title={m.method} sub={`${m.orders} orders`}>
                    <Metric span={3} value={m.fees > 0 ? `−${pkr(m.fees)}` : pkr(0)} mute={m.fees === 0} />
                    <Metric span={3} value={pkr(m.profit)} money big />
                  </Row>
                ))}
              </div>
            )}
          </Section>

          {/* ── 5 · cash by day ──────────────────────────────────────────── */}
          <Section className="an-c12" delay={160} title="Cash by day" subtitle="Revenue against what each day cost to fulfil">
            {c.daily.length === 0 ? (
              <EmptyState title="No orders in this range" />
            ) : (
              <div className="fn-daily">
                <HeadRow
                  label="Day"
                  cols={[
                    { label: 'Orders', span: 1, align: 'c' },
                    { label: 'Revenue', span: 3 },
                    { label: 'Costs', span: 2 },
                    { label: 'Profit', span: 2 },
                  ]}
                />
                <div className="an-list scroll">
                  {[...c.daily].reverse().map((r) => (
                    <Row
                      key={r.date}
                      title={new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      sub={r.profit < 0 ? 'loss-making day' : `${Math.round((r.profit / (r.revenue || 1)) * 100)}% margin`}
                    >
                      <Metric span={1} align="c" value={r.orders} mute />
                      <Metric span={3} value={pkr(r.revenue)} money />
                      <Metric span={2} value={`−${pkr(r.cogs + r.costs)}`} mute />
                      <Metric span={2} value={r.profit < 0 ? `−${pkr(Math.abs(r.profit))}` : pkr(r.profit)} money big />
                    </Row>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* ── 6 · failed orders ────────────────────────────────────────── */}
          <Section
            className="an-c12"
            delay={200}
            title="What failed orders cost"
            subtitle="A cancellation before dispatch costs nothing. Once the parcel is with the courier, that money is gone — and a return bills both legs."
            actions={
              <Chip tone={c.sunkCost > 0 ? 'bad' : 'good'}>
                {c.sunkCost > 0 ? `−${pkr(c.sunkCost)}` : 'no sunk cost'}
              </Chip>
            }
          >
            <div className="fn-failed">
              <div className="fn-failed-i">
                <div className="fn-kpi-l">Cancelled before dispatch</div>
                <div className="fn-kpi-v">{c.failed.cancelledBeforeShip}</div>
                <div className="fn-kpi-s">cost {pkr(c.failed.cancelledBeforeShipCost)}</div>
              </div>
              <div className="fn-failed-i">
                <div className="fn-kpi-l">Returned after dispatch</div>
                <div className="fn-kpi-v">{c.failed.returnedAfterShip}</div>
                <div className="fn-kpi-s">cost {pkr(c.failed.returnedAfterShipCost)}</div>
              </div>
              <div className="fn-failed-i">
                <div className="fn-kpi-l">Order health</div>
                <div className="fn-kpi-v">{c.health.profitable}<span className="fn-dim">/{c.orders}</span></div>
                <div className="fn-kpi-s">
                  {c.health.thin} thin margin · {c.health.loss} loss-making
                </div>
              </div>
              <div className="fn-failed-i">
                <div className="fn-kpi-l">Refunded value</div>
                <div className="fn-kpi-v">{pkr(c.memos.refundedValue || 0)}</div>
                <div className="fn-kpi-s">{c.memos.refundedCount || 0} orders</div>
              </div>
            </div>
          </Section>
        </div>

        {/* existing, data-backed tables — restyled onto the same tokens */}
        <div className="fn-tables">
          <OrderProfitability days={days} />
          <div className="fn-grid-2">
            <ProfitByProduct days={days} />
            <ProfitByCustomer days={days} />
          </div>
          <div className="fn-grid-2">
            <CodExposure />
            <BreakEven days={days} />
          </div>
        </div>

        <p className="fn-note">
          Costs resolve in this order: the value stored on the order, then your settings default,
          then zero. Recording a real courier invoice against an order therefore overrides the
          estimate with no code change. Set them in{' '}
          <Link to="/admin/settings/shipping">Settings → Shipping &amp; Operating Costs</Link>.
        </p>
      </div>
    </AdminLayout>
  );
}
