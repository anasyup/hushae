import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { pkr } from '../../lib/format';
import ov from '../Overview.module.css';

/* ============================================================================
 * ORDERS PULSE — the Overview design DNA (stats + sparklines, grid3 charts,
 * quick actions, insights strip) sitting on top of the orders desk, wired to
 * real data from /orders/manage/analytics/summary. Reuses Overview's CSS
 * module classes so both pages are visibly the same family. Nothing in the
 * desk below is removed — this is additive.
 * ========================================================================== */

const cx = (...n) => n.filter(Boolean).join(' ');

export default function OrdersPulse() {
  const { auth } = useApp();
  const [sum, setSum] = useState(null);
  const chartsRef = useRef([]);

  useEffect(() => {
    let alive = true;
    api('/orders/manage/analytics/summary?days=14', { token: auth?.token })
      .then((d) => { if (alive) setSum(d); })
      .catch(() => { if (alive) setSum(null); });
    return () => { alive = false; };
  }, [auth?.token]);

  useEffect(() => () => { chartsRef.current.forEach((c) => c && c.destroy()); chartsRef.current = []; }, []);

  useEffect(() => {
    if (!sum) return;
    chartsRef.current.forEach((c) => c && c.destroy());
    chartsRef.current = [];
    const mk = (el, cfg) => { if (el) chartsRef.current.push(new Chart(el, cfg)); };
    const daily = sum.daily || [];
    const rev = daily.map((d) => d.revenue);
    const ord = daily.map((d) => d.orders);

    mk(document.getElementById('odSales'), {
      type: 'line',
      data: {
        labels: daily.map((d) => d.date.slice(5)),
        datasets: [
          { label: 'Revenue', data: rev, borderColor: '#111', backgroundColor: 'rgba(17,17,17,0.05)', fill: true, borderWidth: 2.2, tension: 0.35, pointRadius: 3, pointBackgroundColor: '#111' },
          { label: 'Orders (scaled)', data: ord.map((n) => n * 100), borderColor: '#c8c8c8', borderDash: [4, 4], borderWidth: 2, tension: 0.35, pointRadius: 0, fill: false },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f1f1' } } },
      },
    });

    const donut = (id, entries) => mk(document.getElementById(id), {
      type: 'doughnut',
      data: {
        labels: entries.map((e) => e[0]),
        datasets: [{ data: entries.map((e) => e[1]), backgroundColor: ['#111', '#555', '#8a8a8a', '#d6d6d6', '#ececec'], borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } }, animation: { duration: 900, easing: 'easeOutQuart' } },
    });
    donut('odPay', Object.entries(sum.byMethod || {}).slice(0, 5));
    donut('odStage', Object.entries(sum.byStage || {}).slice(0, 5));

    [['odsp1', rev], ['odsp2', ord], ['odsp3', rev], ['odsp4', ord], ['odsp5', rev], ['odsp6', ord]].forEach(([id, series]) => {
      mk(document.getElementById(id), {
        type: 'line',
        data: { labels: series.map((_, i) => i), datasets: [{ data: series.length ? series : [0], borderColor: '#111', borderWidth: 1.4, pointRadius: 0, tension: 0.4, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } },
      });
    });
  }, [sum]);

  const k = sum?.kpis;
  const money = (n) => pkr(Math.round(n || 0));
  const pct = (n) => `${Math.round(n || 0)}%`;
  const cards = [
    { label: 'Total Sales · 14d', val: money(k?.totalRevenue), spark: 'odsp1' },
    { label: 'Orders · 14d', val: (k?.totalOrders || 0).toLocaleString(), spark: 'odsp2' },
    { label: 'Today', val: money(k?.today?.revenue), spark: 'odsp3' },
    { label: 'Avg Order Value', val: money(k?.aov), spark: 'odsp4' },
    { label: 'Payment Verified', val: pct(k?.paymentVerifiedRate), spark: 'odsp5' },
    { label: 'Cancel Rate', val: pct(k?.cancelRate), spark: 'odsp6' },
  ];

  const quick = [
    ['New draft', '/admin/orders/draft'],
    ['All orders', '/admin/orders?group=all'],
    ['Verification', '/admin/verification-queue'],
    ['COD recon', '/admin/cod-recon'],
    ['Abandoned', '/admin/abandoned-carts'],
    ['Payment issues', '/admin/orders?paymentState=Pending'],
    ['Reports', '/admin/reports'],
    ['Finance', '/admin/finance'],
  ];

  const insights = k ? [
    [money(k.today?.revenue), 'Today', `${k.today?.orders || 0} orders so far`],
    [`${k.avgShipHours || 0}h`, 'Avg ship time', 'order → shipped'],
    [pct(k.paymentVerifiedRate), 'Verified rate', 'payments confirmed'],
    [pct(k.cancelRate), 'Cancel rate', 'of all orders'],
    [money(k.aov), 'AOV', 'average basket'],
  ] : [];

  return (
    <div style={{ marginBottom: 16 }}>
      {/* ── stats ── */}
      <div className={ov.stats}>
        {!sum
          ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={ov.stat}><div className={cx(ov.skeleton, ov['sk-block'])} /></div>
          ))
          : cards.map((c) => (
            <div className={ov.stat} key={c.label}>
              <div className={ov['stat-head']}>{c.label}</div>
              <div className={ov['stat-val']}>{c.val}</div>
              <div className={ov['stat-foot']}>
                <span className={ov['stat-vs']}>last 14 days</span>
                <canvas className={ov.spark} id={c.spark} />
              </div>
            </div>
          ))}
      </div>

      {/* ── charts row ── */}
      <div className={ov.grid3}>
        <div className={ov.card}>
          <div className={ov['card-h']}><div className={ov['card-t']}>Sales Overview</div></div>
          <div className={ov['chart-main']}><canvas id="odSales" /></div>
        </div>
        <div className={ov.card}>
          <div className={ov['card-h']}><div className={ov['card-t']}>Payment Mix</div></div>
          <div className={ov['donut-row']}>
            <div className={ov.donut}>
              <canvas id="odPay" />
              <div className={ov['donut-center']}><b>{(k?.totalOrders || 0).toLocaleString()}</b><span>orders</span></div>
            </div>
            <div className={ov['ch-list']}>
              {Object.entries(sum?.byMethod || {}).slice(0, 5).map(([m, n]) => (
                <div key={m} className={ov['ch-item']}><span className={ov['ch-name']}>{m}</span><b>{n}</b></div>
              ))}
              {!Object.keys(sum?.byMethod || {}).length && <div className={ov['ch-item']}><span className={ov['ch-name']}>No orders yet</span></div>}
            </div>
          </div>
        </div>
        <div className={ov.card}>
          <div className={ov['card-h']}><div className={ov['card-t']}>Pipeline</div></div>
          <div className={ov['donut-row']}>
            <div className={ov.donut}>
              <canvas id="odStage" />
              <div className={ov['donut-center']}><b>{(k?.totalOrders || 0).toLocaleString()}</b><span>orders</span></div>
            </div>
            <div className={ov['ch-list']}>
              {Object.entries(sum?.byStage || {}).slice(0, 5).map(([m, n]) => (
                <div key={m} className={ov['ch-item']}><span className={ov['ch-name']}>{m}</span><b>{n}</b></div>
              ))}
              {!Object.keys(sum?.byStage || {}).length && <div className={ov['ch-item']}><span className={ov['ch-name']}>No orders yet</span></div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── quick actions ── */}
      <div className={ov.quick}>
        {quick.map(([label, to]) => (
          <Link key={label} to={to} className={ov['q-btn']}>{label}</Link>
        ))}
      </div>

      {/* ── insights strip ── */}
      {insights.length > 0 && (
        <div className={ov.insights}>
          {insights.map(([v, t, h]) => (
            <div key={t} className={ov['ins-card']}>
              <div className={ov['ins-left']}>
                <b>{v}</b>
                <span>{t}</span>
              </div>
              <span className={ov['ins-hint']}>{h}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
