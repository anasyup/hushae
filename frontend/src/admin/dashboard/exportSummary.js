/* ============================================================================
 * One-page dashboard snapshot, opened in a print tab.
 *
 * Same pattern as the order desk's printDocument.js: a self-contained HTML
 * document written into a new window, so nothing on the dashboard is disturbed
 * and the merchant can "Save as PDF" from the browser's own print dialog. No
 * PDF library, no extra bundle weight.
 * ========================================================================== */

const money = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const row = (label, value, strong) =>
  `<tr><td>${esc(label)}</td><td class="r${strong ? ' b' : ''}">${esc(value)}</td></tr>`;

export function exportDashboardSummary({ d, goal, alerts, insights, storeName = 'HUSHAE', compareLabel = '' }) {
  const w = window.open('', '_blank');   // must be synchronous or the blocker eats it
  if (!w) return false;

  const k = d.kpis;
  const now = new Date();

  const kpiCells = [
    ['Revenue (30d)', money(k.revenue.value), k.revenue.change],
    ['Orders (30d)', String(k.orders.value), k.orders.change],
    ['New customers', String(k.customers.value), k.customers.change],
    ['Average order value', money(k.aov.value), k.aov.change],
  ].map(([label, value, change]) => `
    <div class="kpi">
      <p class="kpi-l">${esc(label)}</p>
      <p class="kpi-v">${esc(value)}</p>
      ${change ? `<p class="kpi-c ${change > 0 ? 'up' : 'down'}">${change > 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%</p>` : '<p class="kpi-c">&nbsp;</p>'}
    </div>`).join('');

  const pipeline = [
    ['Pending', d.stats.pending], ['Confirmed', d.stats.confirmed],
    ['Processing', d.stats.processing], ['Ready to ship', d.stats.readyToShip],
    ['In transit', d.stats.shipped], ['Delivered', d.stats.delivered],
  ].map(([l, n]) => row(l, String(n))).join('');

  const best = (d.bestSellers || []).slice(0, 5)
    .map((b) => row(b.name, `${b.qty} sold · ${money(b.revenue)}`)).join('') || row('No sales yet', '—');

  const low = (d.lowStock || []).slice(0, 5)
    .map((p) => row(p.name, `${p.stock} left`)).join('') || row('All stocked up', '—');

  const alertList = (alerts || []).length
    ? `<ul class="alerts">${alerts.map((a) => `<li>${esc(a.title)}</li>`).join('')}</ul>`
    : '<p class="ok">All caught up — nothing needed attention at the time of this snapshot.</p>';

  const insightList = (insights || []).length
    ? `<ul class="alerts">${insights.map((i) => `<li>${esc(i.text)}</li>`).join('')}</ul>` : '';

  const goalBlock = goal && goal.goal > 0 ? `
    <section>
      <h2>Monthly revenue goal</h2>
      <table>
        ${row('Target', money(goal.goal))}
        ${row('Earned so far', money(goal.earned), true)}
        ${row('Progress', `${goal.pctAchieved}% (month ${goal.pctElapsed}% elapsed)`)}
        ${row('Pace', goal.pace === 'ahead' ? 'Ahead of pace' : goal.pace === 'behind' ? 'Behind pace' : 'On track')}
        ${row('Days remaining', String(goal.daysRemaining))}
      </table>
    </section>` : '';

  w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${esc(storeName)} — Dashboard summary ${now.toISOString().slice(0, 10)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font: 12px/1.5 -apple-system, "Segoe UI", Inter, Arial, sans-serif; color: #141414; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #141414; padding-bottom: 12px; }
  .brand { font-size: 22px; font-weight: 600; letter-spacing: .26em; }
  .sub { font-size: 10.5px; color: #6b6b6b; margin-top: 4px; letter-spacing: .08em; text-transform: uppercase; }
  .when { text-align: right; font-size: 11px; color: #6b6b6b; }
  h2 { font-size: 10.5px; text-transform: uppercase; letter-spacing: .18em; color: #6b6b6b; margin: 22px 0 8px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 18px; }
  .kpi { border: 1px solid #e3e0da; border-radius: 8px; padding: 10px 12px; }
  .kpi-l { font-size: 9px; text-transform: uppercase; letter-spacing: .14em; color: #6b6b6b; margin: 0; }
  .kpi-v { font-size: 16px; font-weight: 600; margin: 5px 0 0; }
  .kpi-c { font-size: 10px; margin: 3px 0 0; color: #6b6b6b; }
  .kpi-c.up { color: #047857; } .kpi-c.down { color: #b91c1c; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 5px 0; border-bottom: 1px solid #eeebe6; font-size: 11.5px; }
  td.r { text-align: right; } td.b { font-weight: 700; }
  .alerts { margin: 0; padding-left: 16px; font-size: 11.5px; }
  .alerts li { margin-bottom: 4px; }
  .ok { font-size: 11.5px; color: #047857; margin: 0; }
  footer { margin-top: 26px; border-top: 1px solid #e3e0da; padding-top: 10px; font-size: 10px; color: #8a8a8a; }
  @media print { .noprint { display: none !important; } }
  .noprint { position: fixed; top: 12px; right: 12px; }
  .noprint button { font: inherit; padding: 8px 16px; border-radius: 999px; border: 0; background: #141414; color: #fff; cursor: pointer; }
</style></head><body>
<div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>

<header>
  <div>
    <div class="brand">${esc(storeName)}</div>
    <div class="sub">Dashboard summary</div>
  </div>
  <div class="when">
    ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}<br>
    ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    ${compareLabel ? `<br><span style="font-size:10px">${esc(compareLabel)}</span>` : ''}
  </div>
</header>

<div class="kpis">${kpiCells}</div>

<section>
  <h2>Needs attention</h2>
  ${alertList}
</section>

${goalBlock}

<div class="cols">
  <section>
    <h2>Order pipeline</h2>
    <table>${pipeline}</table>
  </section>
  <section>
    <h2>Profit &amp; loss (30 days)</h2>
    <table>
      ${row('Revenue', money(k.revenue.value))}
      ${row('Cost of goods', money(k.cost.value))}
      ${row('Gross profit', money(k.profit.value), true)}
      ${row('Margin', `${k.margin.value}%`)}
    </table>
  </section>
</div>

<div class="cols">
  <section>
    <h2>Best sellers</h2>
    <table>${best}</table>
  </section>
  <section>
    <h2>Low stock</h2>
    <table>${low}</table>
  </section>
</div>

${insightList ? `<section><h2>Insights</h2>${insightList}</section>` : ''}

<footer>
  Generated from live data at ${esc(now.toISOString())}. Figures cover the last 30 days unless stated otherwise.
</footer>
</body></html>`);
  w.document.close();
  return true;
}
