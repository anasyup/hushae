/* Printable P&L one-pager — same print-tab approach as the dashboard summary,
 * so no PDF library is added to the bundle.
 *
 * Rewritten for the /api/finance/pnl shape. The previous version read fields
 * (margin, cogs, packingTotal, shipSubsidy, adsTotal, lostAfterCost...) that
 * the rebuilt page no longer supplies, so it would have thrown on
 * `s.margin.toFixed(1)` and printed "PKR 0" for eight lines. A printed
 * statement that disagrees with the screen is worse than no statement.
 *
 * The document now renders the same activity-based groups the page shows, so
 * the paper and the screen cannot diverge.
 *
 * buildPnlHtml() is pure so scripts/test-finance-export.mjs can assert the
 * output contains no NaN and that its subtotals match the on-screen ones. */

const money = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return 'PKR 0';
  return `${v < 0 ? '\u2212' : ''}PKR ${Math.abs(Math.round(v)).toLocaleString('en-PK')}`;
};
const signed = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return 'PKR 0';
  return `${v < 0 ? '−' : ''}PKR ${Math.abs(Math.round(v)).toLocaleString('en-PK')}`;
};
const pct = (n) => (Number.isFinite(Number(n)) ? `${Number(n).toFixed(1)}%` : '—');
const count = (n) => (Number.isFinite(Number(n)) ? String(Number(n)) : '0');
const esc = (s) => String(s ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const row = (label, value, opts = {}) =>
  `<tr class="${opts.total ? 'total' : ''}${opts.em ? ' em' : ''}">
     <td>${esc(label)}</td>
     <td class="r">${esc(value)}</td>
   </tr>`;

/** Pure: returns the full HTML document for the P&L. */
export function buildPnlHtml({ data, rangeLabel, storeName = 'HUSHAE', generatedAt = new Date() }) {
  const d = data || {};
  const c = d.current || {};
  const inc = c.income || {};
  const costs = c.costs || {};
  const opex = c.opex || {};
  const failed = c.failed || {};
  const memos = c.memos || {};
  const range = d.range || {};

  const fmtDate = (v) => (v
    ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—');
  const period = `${fmtDate(range.from)} – ${fmtDate(range.to)}`;

  const groups = [
    {
      title: 'Income',
      rows: [
        ['Merchandise', money(inc.merchandise)],
        ['Shipping charged', money(inc.shipping)],
        ['Discounts & promotions', signed(-(Number(inc.discounts) || 0))],
        ['Store credit redeemed', signed(-(Number(inc.rewards) || 0))],
      ],
      total: ['Net sales', money(inc.net)],
    },
    {
      title: 'Cost of goods',
      rows: [['Wholesale cost of items sold', signed(-costs.cogs)]],
      total: ['Gross profit', `${money(c.grossProfit)}  ·  ${pct(c.grossMargin)}`],
    },
    {
      title: 'Fulfilment & fees',
      rows: [
        ['Packaging', signed(-costs.packaging)],
        ['Courier', signed(-costs.courier)],
        ['Payment gateway fees', signed(-costs.paymentFees)],
      ],
      total: ['Trading profit', `${money(c.contribution)}  ·  ${pct(c.contributionMargin)}`],
    },
    {
      title: 'Lost orders',
      rows: [
        [`Returns after dispatch (${count(failed.returnedAfterShip)})`, signed(-failed.returnedAfterShipCost)],
        [`Cancellations before dispatch (${count(failed.cancelledBeforeShip)})`, signed(-failed.cancelledBeforeShipCost)],
      ],
      total: ['Profit after losses', money((Number(c.contribution) || 0) - (Number(c.sunkCost) || 0))],
    },
    /* Recorded expenses — the actual rent, salaries, photoshoot entries.
     * Printed as their own block so the statement shows what was really spent
     * versus what was merely estimated in settings. */
    ...(c.recorded?.length ? [{
      title: 'Recorded expenses',
      rows: c.recorded.map((r) => [
        `${String(r.category).charAt(0).toUpperCase()}${String(r.category).slice(1)}`,
        signed(-r.amount),
      ]),
      total: ['Profit after expenses', money((Number(c.contribution) || 0) - (Number(c.sunkCost) || 0) - (Number(c.recordedTotal) || 0))],
    }] : []),
    {
      title: 'Operating cost estimates',
      rows: [
        ['Marketing (settings)', signed(-opex.marketing)],
        ['SEO (settings)', signed(-opex.seo)],
        ['Other (settings)', signed(-opex.other)],
      ],
      total: ['Net profit', `${money(c.netProfit)}  ·  ${pct(c.netMargin)}`, true],
    },
  ];

  const sections = groups.map((g) => `
<section>
  <h2>${esc(g.title)}</h2>
  <table>
    ${g.rows.map(([l, v]) => row(l, v)).join('\n    ')}
    ${row(g.total[0], g.total[1], { total: true, em: g.total[2] })}
  </table>
</section>`).join('\n');

  /* Money that moved but is not income. Kept out of the statement on purpose:
   * a refund is cash out, a cancelled order was never collected, and tax is a
   * liability — folding any of them into revenue makes the accounts lie. */
  const memoRows = [
    [Number(inc.tax) ? `Tax collected — liability, not revenue` : null, inc.tax],
    [memos.refundedValue ? `Refunded to customers (${count(memos.refundedCount)})` : null, memos.refundedValue],
    [memos.cancelledValue ? `Cancelled, never collected (${count(memos.cancelledCount)})` : null, memos.cancelledValue],
  ].filter(([l]) => l);

  const memoSection = memoRows.length ? `
<section>
  <h2>Not revenue</h2>
  <table>
    ${memoRows.map(([l, v]) => row(l, money(v))).join('\n    ')}
  </table>
</section>` : '';

  /* Payment mix with the fee each method actually cost. */
  const mix = Array.isArray(c.paymentMix) ? c.paymentMix : [];
  const mixSection = mix.length ? `
<section>
  <h2>Payment methods</h2>
  <table>
    ${mix.map((m) => row(`${m.method} — ${count(m.orders)} orders · fees ${money(m.fees)}`, money(m.profit))).join('\n    ')}
  </table>
</section>` : '';

  /* Say so out loud if the page's own numbers did not reconcile. */
  const drift = Number(c.reconcileDrift) || 0;
  const ladder = Number(c.ladderCheck) || 0;
  const warnings = [];
  if (Math.abs(drift) > 1) warnings.push(`Income lines differ from net sales by ${money(drift)}.`);
  if (ladder !== 0) warnings.push(`The profit ladder does not reconcile (drift ${money(ladder)}).`);
  const warningBlock = warnings.length
    ? `<div class="warn"><strong>Check before filing:</strong> ${warnings.map(esc).join(' ')}</div>`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(storeName)} — Profit &amp; loss ${esc(new Date(range.to || generatedAt).toISOString().slice(0, 10))}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font: 12px/1.55 -apple-system, "Segoe UI", Inter, Arial, sans-serif; color: #141414; margin: 0; }
  header { border-bottom: 2px solid #141414; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 22px; font-weight: 600; letter-spacing: .26em; }
  .sub { font-size: 10.5px; color: #6b6b6b; margin-top: 5px; text-transform: uppercase; letter-spacing: .1em; }
  .when { text-align: right; font-size: 11px; color: #6b6b6b; }
  h2 { font-size: 10.5px; text-transform: uppercase; letter-spacing: .18em; color: #6b6b6b; margin: 22px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 0; border-bottom: 1px solid #eeebe6; font-size: 12px; }
  td.r { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total td { border-top: 1px solid #141414; border-bottom: 0; font-weight: 700; padding-top: 9px; }
  tr.em td { border-top: 2px solid #141414; font-size: 14px; padding-top: 11px; }
  .headline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
  .h-card { border: 1px solid #e3e0da; border-radius: 8px; padding: 11px; }
  .h-l { font-size: 9px; text-transform: uppercase; letter-spacing: .14em; color: #6b6b6b; margin: 0; }
  .h-v { font-size: 17px; font-weight: 600; margin: 6px 0 0; font-variant-numeric: tabular-nums; }
  .warn { margin-top: 14px; padding: 10px 12px; border: 1px solid #e0b4b4; background: #fdf3f3; border-radius: 8px; font-size: 11.5px; color: #7a2020; }
  footer { margin-top: 26px; border-top: 1px solid #e3e0da; padding-top: 10px; font-size: 10px; color: #8a8a8a; line-height: 1.6; }
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
  <div class="when">${esc(rangeLabel || `${count(range.days)} days`)}<br>${esc(period)}</div>
</header>

<div class="headline">
  <div class="h-card"><p class="h-l">Net sales</p><p class="h-v">${money(inc.net)}</p></div>
  <div class="h-card"><p class="h-l">Gross profit</p><p class="h-v">${money(c.grossProfit)}</p></div>
  <div class="h-card"><p class="h-l">Contribution</p><p class="h-v">${money(c.contribution)}</p></div>
  <div class="h-card"><p class="h-l">Net profit</p><p class="h-v">${money(c.netProfit)}</p></div>
</div>

${warningBlock}

${sections}
${memoSection}
${mixSection}

<footer>
  Net profit = net sales − cost of goods − packaging − courier − payment gateway fees − the sunk
  cost of failed orders − marketing − SEO − other fixed costs. Fixed monthly costs are prorated
  across the ${count(range.days)}-day period. Costs resolve from the value stored on each order,
  then the settings default, then zero. Advertising is a whole-business cost and is not attributed
  to individual orders.<br>
  Generated ${esc(generatedAt.toLocaleString('en-GB'))} from live store data.
</footer>
</body></html>`;
}

/** Opens the printable P&L in a new tab. Returns false if the popup was blocked. */
export function exportPnlReport({ data, rangeLabel, storeName = 'HUSHAE' }) {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(buildPnlHtml({ data, rangeLabel, storeName }));
  w.document.close();
  return true;
}
