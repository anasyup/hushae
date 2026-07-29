/* Monthly P&L as a printable one-pager — same print-tab approach as the
 * dashboard summary, so no PDF library is added to the bundle. */

const money = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const line = (label, value, opts = {}) =>
  `<tr class="${opts.total ? 'total' : ''}${opts.indent ? ' in' : ''}">
     <td>${esc(label)}</td>
     <td class="r">${esc(value)}</td>
   </tr>`;

export function exportPnlReport({ summary: s, rangeLabel, sinceDate, until, storeName = 'HUSHAE' }) {
  const w = window.open('', '_blank');
  if (!w) return false;

  const period = `${new Date(sinceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const advisor = (s.insights || []).length
    ? `<section><h2>Advisor notes</h2><ul>${s.insights.map((i) => `<li>${esc(i.text)}</li>`).join('')}</ul></section>`
    : '';

  w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${esc(storeName)} — Profit &amp; Loss ${new Date(until).toISOString().slice(0, 10)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font: 12px/1.55 -apple-system, "Segoe UI", Inter, Arial, sans-serif; color: #141414; margin: 0; }
  header { border-bottom: 2px solid #141414; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 22px; font-weight: 600; letter-spacing: .26em; }
  .sub { font-size: 10.5px; color: #6b6b6b; margin-top: 5px; text-transform: uppercase; letter-spacing: .1em; }
  .when { text-align: right; font-size: 11px; color: #6b6b6b; }
  h2 { font-size: 10.5px; text-transform: uppercase; letter-spacing: .18em; color: #6b6b6b; margin: 24px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 0; border-bottom: 1px solid #eeebe6; font-size: 12px; }
  td.r { text-align: right; font-variant-numeric: tabular-nums; }
  tr.in td:first-child { padding-left: 16px; color: #5a5a5a; }
  tr.total td { border-top: 2px solid #141414; border-bottom: 0; font-weight: 700; font-size: 13.5px; padding-top: 10px; }
  .headline { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }
  .h-card { border: 1px solid #e3e0da; border-radius: 8px; padding: 12px; }
  .h-l { font-size: 9px; text-transform: uppercase; letter-spacing: .14em; color: #6b6b6b; margin: 0; }
  .h-v { font-size: 18px; font-weight: 600; margin: 6px 0 0; }
  ul { margin: 0; padding-left: 16px; font-size: 11.5px; }
  ul li { margin-bottom: 5px; }
  footer { margin-top: 30px; border-top: 1px solid #e3e0da; padding-top: 10px; font-size: 10px; color: #8a8a8a; line-height: 1.6; }
  .noprint { position: fixed; top: 12px; right: 12px; }
  .noprint button { font: inherit; padding: 8px 16px; border-radius: 999px; border: 0; background: #141414; color: #fff; cursor: pointer; }
  @media print { .noprint { display: none !important; } }
</style></head><body>
<div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>

<header>
  <div>
    <div class="brand">${esc(storeName)}</div>
    <div class="sub">Profit &amp; loss statement</div>
  </div>
  <div class="when">${esc(rangeLabel)}<br>${esc(period)}</div>
</header>

<div class="headline">
  <div class="h-card"><p class="h-l">Revenue</p><p class="h-v">${money(s.revenue)}</p></div>
  <div class="h-card"><p class="h-l">Net profit</p><p class="h-v">${money(s.netProfit)}</p></div>
  <div class="h-card"><p class="h-l">Net margin</p><p class="h-v">${s.margin.toFixed(1)}%</p></div>
</div>

<section>
  <h2>Income</h2>
  <table>
    ${line('Revenue from delivered and in-flight orders', money(s.revenue))}
    ${line(`Orders`, String(s.orderCount), { indent: true })}
    ${line(`Items sold`, String(s.itemCount), { indent: true })}
    ${line('Average order value', money(s.aov), { indent: true })}
  </table>
</section>

<section>
  <h2>Cost of sales</h2>
  <table>
    ${line('Cost of goods sold', money(s.cogs))}
    ${line('Packing materials', money(s.packingTotal))}
    ${line('Courier subsidy', money(s.shipSubsidy))}
    ${line('Gross profit', money(s.grossProfit), { total: true })}
  </table>
</section>

<section>
  <h2>Operating expenses</h2>
  <table>
    ${line('Advertising', money(s.adsTotal))}
    ${line('SEO / content', money(s.seoTotal))}
    ${line('Other fixed costs', money(s.otherTotal))}
    ${line('Total expenses', money(s.totalExpense), { total: true })}
  </table>
</section>

<section>
  <h2>Result</h2>
  <table>
    ${line('Net profit', money(s.netProfit), { total: true })}
    ${line('Net margin', `${s.margin.toFixed(1)}%`)}
    ${line('Cancelled before shipping', `${s.lostBeforeShip} order${s.lostBeforeShip === 1 ? '' : 's'} · no cost incurred`)}
    ${line('Failed after shipping', `${s.lostAfterShip} order${s.lostAfterShip === 1 ? '' : 's'} · ${money(s.lostAfterCost)} lost`)}
  </table>
</section>

${advisor}

<footer>
  Net profit = Revenue − (cost of goods + packing + courier + advertising + SEO + other fixed costs).
  Fixed monthly costs are prorated across the reporting period. Advertising is treated as a
  whole-business cost and is not attributed to individual orders.<br>
  Generated ${esc(new Date().toLocaleString('en-GB'))} from live store data.
</footer>
</body></html>`);
  w.document.close();
  return true;
}
