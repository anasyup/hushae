import { paginate, describeLayout } from './printLayout';

/* ============================================================================
 * Standalone print document builder.
 *
 * Produces a complete, self-contained HTML page — inline CSS, no React, no
 * app bundle — that is written into a new browser tab. Keeping the documents
 * out of the dashboard means the merchant can print, reprint and keep the tab
 * open while carrying on working.
 * ========================================================================== */

const DOC_TITLE = {
  packing_slip: 'Packing Slip',
  invoice: 'Invoice',
  pick_list: 'Pick List',
};

/** Escape anything that reaches the document — names and notes are user data. */
const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const money = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;

const dateFmt = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return ''; }
};


/** Compact tracking block for invoices: order number plus a short URL the
 *  customer can type. A real QR encoder can slot in here later without
 *  touching the layout. */
function trackBlock(o) {
  const url = `hushae.vercel.app/track`;
  return `
    <div class="track">
      <div class="track-lbl">Track your order</div>
      <div class="track-url">${esc(url)}</div>
      <div class="track-code">${esc(o.orderNumber)}</div>
    </div>`;
}

/* ── One document ───────────────────────────────────────────────────────── */
function slipHtml(o, docType, store) {
  const c = o.customerInfo || {};
  const paid = o.paymentLabel === 'PAID';
  const isInvoice = docType === 'invoice';
  const isPick = docType === 'pick_list';

  const rows = (o.items || []).map((it) => `
    <tr>
      ${isPick ? '<td class="tick"><span class="box"></span></td>' : ''}
      <td class="item">${esc(it.name)}</td>
      <td class="variant">${esc([it.size, it.color].filter(Boolean).join(' · ') || '—')}</td>
      <td class="qty">${esc(it.quantity)}</td>
      ${isInvoice ? `<td class="amount">${esc(money(it.lineTotal))}</td>` : ''}
    </tr>`).join('');

  const totals = isInvoice ? `
    <div class="totals">
      <div class="trow"><span>Subtotal</span><span>${esc(money(o.subtotal))}</span></div>
      ${o.shippingCharge > 0 ? `<div class="trow"><span>Shipping</span><span>${esc(money(o.shippingCharge))}</span></div>` : ''}
      ${o.discount > 0 ? `<div class="trow"><span>Discount</span><span>− ${esc(money(o.discount))}</span></div>` : ''}
      <div class="trow grand"><span>Total</span><span>${esc(money(o.total))}</span></div>
      <div class="trow pay"><span>${paid ? 'Paid in full' : 'Cash on delivery'}</span><span>${esc(o.paymentMethod)}</span></div>
    </div>` : (docType === 'packing_slip' ? `
    <div class="footline">
      <span>${paid ? 'Paid in advance — collect nothing' : 'Collect on delivery'}</span>
      <strong>${esc(money(o.total))}</strong>
    </div>` : '');

  const note = c.notes && !isPick
    ? `<p class="note"><strong>Note:</strong> ${esc(c.notes)}</p>` : '';

  return `
  <div class="slip">
    <div class="head">
      <div class="brand">
        <div class="mark">${esc(store?.name || 'HUSHAE')}</div>
        <div class="kind">${esc(DOC_TITLE[docType] || 'Document')}</div>
      </div>
      <div class="meta">
        <div class="ord">${esc(o.orderNumber)}</div>
        <div class="date">${esc(dateFmt(o.createdAt))}</div>
        <span class="pay-badge ${paid ? 'is-paid' : ''}">${esc(o.paymentLabel)}</span>
      </div>
    </div>

    <div class="cust">
      <div class="to">
        <div class="lbl">Deliver to</div>
        <div class="name">${esc(c.name)}</div>
        <div class="phone">${esc(c.phone)}</div>
        ${!isPick ? `<div class="addr">${esc(c.address)}, ${esc(c.city)}${c.postalCode ? ` – ${esc(c.postalCode)}` : ''}</div>` : ''}
      </div>
      <div class="units">
        <div class="lbl">Units</div>
        <div class="big">${esc(o.itemCount)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          ${isPick ? '<th class="tick">✓</th>' : ''}
          <th>Item</th><th>Variant</th><th class="qty">Qty</th>
          ${isInvoice ? '<th class="amount">Amount</th>' : ''}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    ${totals}
    ${note}
    ${isInvoice ? trackBlock(o) : ''}

    <div class="foot">
      <span>${isInvoice ? 'Thank you for shopping with us' : (o.discreetPackaging ? 'Discreet packaging' : '')}</span>
      <span>${esc(store?.phone || '')}</span>
    </div>
  </div>`;
}

/* ── Full page ──────────────────────────────────────────────────────────── */
export function buildPrintHtml({ orders, docType, store }) {
  const layout = paginate(orders, docType);
  const summary = describeLayout(layout);

  const sheets = layout.pages.map((page) => `
    <section class="sheet">
      ${page.slips.map(({ order, size }) => `
        <div class="cell cell--${size}">${slipHtml(order, docType, store)}</div>`).join('')}
    </section>`).join('');

  const title = `${DOC_TITLE[docType] || 'Documents'} · ${orders.length} order${orders.length === 1 ? '' : 's'}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — HUSHAE</title>
<style>
  :root { --ink:#111; --muted:#666; --line:#c9c9c9; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:#e9e9e9; color:var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* ── Screen toolbar ─────────────────────────────────────────────── */
  .bar { position:sticky; top:0; z-index:10; display:flex; align-items:center;
    justify-content:space-between; gap:16px; flex-wrap:wrap;
    padding:12px 18px; background:#fff; border-bottom:1px solid #ddd;
    box-shadow:0 1px 3px rgba(0,0,0,.06); }
  .bar h1 { margin:0; font-size:15px; font-weight:600; }
  .bar p  { margin:2px 0 0; font-size:12.5px; color:var(--muted); }
  .actions { display:flex; gap:8px; }
  button { font:inherit; cursor:pointer; border-radius:8px; padding:9px 16px;
    font-size:13px; font-weight:600; border:1px solid #ccc; background:#fff; color:#222; }
  button.primary { background:#111; color:#fff; border-color:#111; }
  button:hover { opacity:.9; }
  .hint { font-size:11.5px; color:var(--muted); }

  /* ── A4 sheets ──────────────────────────────────────────────────── */
  .wrap { padding:22px 12px 40px; }
  .sheet { width:190mm; min-height:277mm; margin:0 auto 20px; background:#fff;
    display:grid; grid-template-columns:1fr 1fr; grid-auto-rows:138.5mm;
    box-shadow:0 8px 26px rgba(0,0,0,.16); }
  .cell { padding:5mm; overflow:hidden;
    border-right:1px dashed var(--line); border-bottom:1px dashed var(--line); }
  .cell--half { grid-column:span 2; }
  .cell--full { grid-column:span 2; grid-row:span 2; }

  /* ── Slip internals ─────────────────────────────────────────────── */
  .slip { display:flex; flex-direction:column; height:100%;
    font-size:9.5pt; line-height:1.32; }
  .head { display:flex; justify-content:space-between; align-items:flex-start;
    border-bottom:1px solid #000; padding-bottom:3px; }
  .mark { font-family:Inter,Helvetica,Arial,sans-serif; font-size:13pt;
    font-weight:600; letter-spacing:.18em; }
  .kind { font-size:7pt; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); }
  .meta { text-align:right; flex-shrink:0; }
  .ord  { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:8.5pt; font-weight:700; }
  .date { font-size:7pt; color:var(--muted); }
  .pay-badge { display:inline-block; margin-top:2px; padding:1px 6px;
    font-size:7.5pt; font-weight:700; border:1px solid #000; border-radius:3px; }
  .pay-badge.is-paid { background:#000; color:#fff; }

  .cust { display:flex; justify-content:space-between; gap:10px; margin-top:5px; }
  .lbl  { font-size:7pt; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
  .name { font-size:10pt; font-weight:700; }
  .phone{ font-size:8.5pt; }
  .addr { font-size:8pt; line-height:1.25; }
  .units { text-align:right; flex-shrink:0; }
  .big  { font-size:13pt; font-weight:700; line-height:1; }

  table { width:100%; border-collapse:collapse; margin-top:5px; }
  th { font-size:7pt; text-transform:uppercase; letter-spacing:.08em; color:var(--muted);
    text-align:left; padding:2px 0; border-top:1px solid #999; border-bottom:1px solid #999; }
  td { padding:2px 0; border-bottom:1px solid #e6e6e6; vertical-align:top; }
  td.item { font-weight:500; padding-right:4px; }
  td.variant, th.variant { font-size:8pt; color:var(--muted); }
  .qty, th.qty { text-align:right; font-weight:700; font-variant-numeric:tabular-nums; }
  .amount, th.amount { text-align:right; font-variant-numeric:tabular-nums; }
  .tick { width:14px; }
  .box  { display:inline-block; width:9px; height:9px; border:1px solid #555; }

  .totals { margin-top:4px; margin-left:auto; width:52mm; font-size:8.5pt; }
  .trow { display:flex; justify-content:space-between; }
  .trow span:last-child { font-variant-numeric:tabular-nums; }
  .trow.grand { border-top:1px solid #000; margin-top:2px; padding-top:2px;
    font-size:10.5pt; font-weight:700; }
  .trow.pay { margin-top:2px; font-size:7.5pt; color:var(--muted);
    text-transform:uppercase; letter-spacing:.06em; }

  .footline { display:flex; justify-content:space-between; align-items:center;
    border-top:1px solid #000; margin-top:4px; padding-top:3px; }
  .footline span { font-size:7.5pt; text-transform:uppercase;
    letter-spacing:.06em; color:var(--muted); }
  .footline strong { font-size:11pt; font-variant-numeric:tabular-nums; }

  .note { margin:4px 0 0; padding:3px 4px; border:1px solid #999; font-size:7.5pt; }
  .track { margin-top:4px; padding:3px 5px; border:1px dashed #666; display:flex;
    align-items:baseline; gap:6px; }
  .track-lbl { font-size:6.5pt; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
  .track-url { font-size:8pt; font-weight:600; }
  .track-code { margin-left:auto; font-family:ui-monospace,Menlo,monospace; font-size:8pt; font-weight:700; }
  .foot { margin-top:auto; padding-top:3px; display:flex;
    justify-content:space-between; font-size:6.5pt; color:var(--muted); }

  /* ── Print ──────────────────────────────────────────────────────── */
  @media print {
    @page { size:A4; margin:10mm; }
    html, body { background:#fff; }
    .bar, .wrap > .tip { display:none !important; }
    .wrap { padding:0; }
    .sheet { width:auto; min-height:auto; height:277mm; margin:0;
      box-shadow:none; break-after:page; page-break-after:always; }
    .sheet:last-child { break-after:auto; page-break-after:auto; }
    .cell { border-color:#aaa; }
  }
</style>
</head>
<body>
  <div class="bar">
    <div>
      <h1>${esc(title)}</h1>
      <p>${esc(summary)}</p>
    </div>
    <div class="actions">
      <span class="hint">Tip: choose “Background graphics” in the print dialog</span>
      <button onclick="window.close()">Close</button>
      <button class="primary" onclick="window.print()">Print</button>
    </div>
  </div>
  <div class="wrap">${sheets}</div>
</body>
</html>`;
}

/**
 * Open a print tab.
 *
 * The window is opened synchronously by the caller (so the browser attributes
 * it to the click and does not block it) and handed here once the data has
 * arrived.
 */
export function writePrintWindow(win, payload) {
  if (!win || win.closed) return false;
  win.document.open();
  win.document.write(buildPrintHtml(payload));
  win.document.close();
  // Let layout settle before the dialog appears, otherwise Chrome sometimes
  // measures the sheets before the fonts have applied.
  win.setTimeout(() => { try { win.focus(); win.print(); } catch { /* user can press Print */ } }, 350);
  return true;
}

/** Placeholder shown while the batch request is in flight. */
export function writeLoadingWindow(win, label = 'Preparing documents…') {
  if (!win || win.closed) return;
  win.document.open();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(label)}</title>
  <style>
    body{margin:0;height:100vh;display:grid;place-items:center;background:#f5f5f5;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;color:#555}
    .s{width:26px;height:26px;border:3px solid #ddd;border-top-color:#111;border-radius:50%;
      animation:spin .8s linear infinite;margin:0 auto 14px}
    @keyframes spin{to{transform:rotate(360deg)}}
    p{font-size:13.5px;margin:0;text-align:center}
  </style></head>
  <body><div><div class="s"></div><p>${esc(label)}</p></div></body></html>`);
  win.document.close();
}

/** Friendly failure page — better than a blank tab. */
export function writeErrorWindow(win, message) {
  if (!win || win.closed) return;
  win.document.open();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print failed</title>
  <style>
    body{margin:0;height:100vh;display:grid;place-items:center;background:#f5f5f5;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;color:#333;padding:24px}
    .c{max-width:380px;text-align:center}
    h1{font-size:16px;margin:0 0 8px}
    p{font-size:13.5px;color:#666;margin:0 0 18px;line-height:1.5}
    button{font:inherit;padding:9px 18px;border-radius:8px;border:1px solid #111;
      background:#111;color:#fff;font-weight:600;cursor:pointer}
  </style></head>
  <body><div class="c"><h1>Could not prepare the documents</h1>
  <p>${esc(message || 'Something went wrong.')}</p>
  <button onclick="window.close()">Close tab</button></div></body></html>`);
  win.document.close();
}
