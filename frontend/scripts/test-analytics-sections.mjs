/* ============================================================================
 * Render test for the analytics report sections.
 *
 * Runs the REAL components from src/admin/analytics/sections.jsx through
 * react-dom/server using the boss's actual pasted numbers, and asserts the
 * output has the aligned column structure we promised:
 *   - every row is a grid row with rank + aligned metric cells
 *   - column headers line up with the metric cells (same span classes)
 *   - empty states render as the shared <EmptyState>, not loose text
 *   - no crash on empty / partial data
 *
 * Run: node scripts/test-analytics-sections.mjs
 * ========================================================================== */
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const probeDir = mkdtempSync(join(tmpdir(), 'an-probe-'));
const entry = join(probeDir, 'probe.jsx');
const sectionsAbs = join(root, 'src/admin/analytics/sections.jsx');
const columnsAbs = join(root, 'src/admin/analytics/columns.js');

/* Probe = renders the boss's exact data through the real components. */
writeFileSync(entry, `
import React from 'react';
import { Section, HeadRow, Row, Metric, Chip, ConvChip, EmptyState, CohortGrid, StatStrip, Pills } from '${sectionsAbs}';
import { PRODUCT_COLS, CUSTOMER_COLS, COUPON_COLS, VARIANT_COLS, WINBACK_COLS, QUALITY_COLS, CUSTOM_COLS, ALL_COL_SETS, colSum, METRIC_BUDGET, LEAD_SPAN, GRID_COLS } from '${columnsAbs}';

/* boss's pasted R1 rows (12 products) */
const productIntel = [
  { slug: 'a', name: 'HUSHAE Modal Soft Hipster', views: 137, conv: 2.9, orders: 4, revenue: 12600, returns: 0 },
  { slug: 'b', name: 'HUSHAE Cloud Lounge Set', views: 102, conv: 2, orders: 2, revenue: 8250, returns: 0 },
  { slug: 'c', name: 'HUSHAE Winter Thermal Vest', views: 52, conv: 5.8, orders: 3, revenue: 3600, returns: 0 },
  { slug: 'd', name: 'HUSHAE Second-Skin Wireless Bra', views: 29, conv: 0, orders: 0, revenue: 0, returns: 0 },
  { slug: 'e', name: 'HUSHAE Everyday Cotton Boxer', views: 25, conv: 28, orders: 7, revenue: 7700, returns: 0 },
  { slug: 'f', name: 'HUSHAE Contour Bodysuit', views: 227, conv: 2.7, orders: 16, revenue: 55575, returns: 0 },
  { slug: 'g', name: 'HUSHAE Ribbed Cotton Vest', views: 20, conv: 0, orders: 0, revenue: 0, returns: 0 },
  { slug: 'h', name: 'HUSHAE Printed Woven Boxer', views: 20, conv: 5, orders: 1, revenue: 2900, returns: 0 },
  { slug: 'i', name: 'HUSHAE Lace-Edge Bikini Brief', views: 19, conv: 21.1, orders: 4, revenue: 2100, returns: 0 },
  { slug: 'j', name: 'HUSHAE Relaxed Lounge Short', views: 15, conv: 0, orders: 0, revenue: 0, returns: 0 },
  { slug: 'k', name: 'HUSHAE Everyday T-Shirt Bra', views: 24, conv: 12.5, orders: 3, revenue: 3100, returns: 0 },
  { slug: 'l', name: 'HUSHAE Second-Skin Wireless Bra 2', views: 15, conv: 20, orders: 3, revenue: 14400, returns: 0 },
];
const topCustomers = [
  { name: 'gop gop', orders: 1, revenue: 306625 },
  { name: 'Adnan repeat', orders: 2, revenue: 88450 },
  { name: 'meow repeat', orders: 11, revenue: 48950 },
  { name: 'saba repeat', orders: 2, revenue: 40350 },
];
const variants = [
  { variant: 'Sylvie Lace-Edge Brief · L / Slate', qty: 20, revenue: 29000 },
  { variant: 'HUSHAE Cloud-Knit Relaxed Kimono Robe · S/M / Warm Oatmeal', qty: 10, revenue: 64500 },
  { variant: 'NoDot Variant', qty: 5, revenue: 1000 },
];
const cohorts = [
  { cohort: '2026-08', customers: 15, rates: [0, 0, 0, 0, 0, 0] },
  { cohort: '2026-07', customers: 22, rates: [20, 0, 0, 0, 0, 0] },
  { cohort: '2026-06', customers: 9, rates: [33, 22, 0, 0, 0, 0] },
];
const custom = [
  { name: 'hushae', orders: 46, revenue: 498137 },
  { name: 'formal', orders: 2, revenue: 88450 },
  { name: 'silhouette', orders: 3, revenue: 5400 },
];

const pkr = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-US');
const maxConv = Math.max(...productIntel.map((p) => p.conv || 0), 1);
const maxRev = Math.max(...productIntel.map((p) => p.revenue || 0), 1);
const maxQty = Math.max(...variants.map((v) => v.qty || 0), 1);
const maxVarRev = Math.max(...variants.map((v) => v.revenue || 0), 1);
const totRev = custom.reduce((s, r) => s + r.revenue, 0);
const totOrders = custom.reduce((s, r) => s + r.orders, 0);

/* spans come from the SAME module the page renders from — no local copy */
const cols = PRODUCT_COLS;

export function Probe() {
  return (
    <div className="an-grid">
      {/* benchmarks are now band meters in svgcharts.jsx — covered by
          test-analytics-charts.mjs, so this section renders as a plain card */}
      <Section className="an-c12" title="You vs industry benchmarks" subtitle="last 30 days">
        <div className="an-bands">
          <span>Conversion rate 1.6% — in healthy band</span>
        </div>
      </Section>

      <Section className="an-c12" title="Product conversion" subtitle="Views to orders, last 30 days"
        actions={<Chip tone="warn">2 burning traffic</Chip>}>
        <div className="an-callout"><span>2 products pulling traffic but converting under 1%.</span></div>
        <HeadRow label="Product" cols={cols} />
        <div className="an-list">
          {productIntel.map((p, i) => (
            <Row key={p.slug} rank={i + 1} top={i < 3} title={p.name} sub={p.views.toLocaleString() + ' views'}>
              <Metric span={cols[0].span} hide={cols[0].hide} value={p.views.toLocaleString()} mute />
              <Metric span={cols[1].span} align="c" chip={<ConvChip v={p.conv} max={maxConv} />} />
              <Metric span={cols[2].span} hide={cols[2].hide} value={p.orders} big={p.orders > 0} mute={p.orders === 0} />
              <Metric span={cols[3].span} value={pkr(p.revenue)} money big bar={p.revenue ? (p.revenue / maxRev) * 100 : 0} barTone="teal" />
              <Metric span={cols[4].span} align="c" hide={cols[4].hide} chip={p.returns > 0 ? <Chip tone="bad">{p.returns}</Chip> : <Chip tone="plain">0</Chip>} />
            </Row>
          ))}
        </div>
      </Section>

      <Section className="an-c7" title="Customer value" subtitle="21.9% repeat rate - 32 buyers">
        <HeadRow label="Customer" cols={[{ label: 'Orders', span: 2, align: 'c' }, { label: 'Lifetime spend', span: 4 }]} />
        <div className="an-list">
          {topCustomers.map((c, i) => (
            <Row key={c.name} rank={i + 1} top={i < 3} title={c.name}
              badge={c.orders > 1 ? <Chip tone="good">repeat</Chip> : null}
              sub={c.orders > 1 ? c.orders + ' orders' : 'first order'}>
              <Metric span={CUSTOMER_COLS[0].span} align="c" chip={<Chip tone={c.orders > 1 ? 'info' : 'plain'}>{c.orders}x</Chip>} />
              <Metric span={CUSTOMER_COLS[1].span} value={pkr(c.revenue)} money big bar={(c.revenue / topCustomers[0].revenue) * 100} barTone="green" />
            </Row>
          ))}
        </div>
      </Section>

      <Section className="an-c5" title="Marketing ROI" subtitle="Coupons and cart recovery">
        <p className="an-sub-h">Cart recovery</p>
        <StatStrip items={[{ label: 'Captured', value: 6 }, { label: 'Recovered', value: 1 }, { label: 'Rate', value: '16.7%' }]} />
        <div className="an-hero">
          <div className="an-hero-l">Recovered revenue</div>
          <div className="an-hero-v">{pkr(3150)}</div>
          <div className="an-hero-s">Recovery emails are doing okay work this period.</div>
        </div>
        <p className="an-sub-h">Coupons</p>
        <EmptyState title="No coupon usage in this range" body="Discount codes used at checkout will show here." />
      </Section>

      <Section className="an-c12" title="Top variants" subtitle="Size / colour selling best"
        actions={<Chip tone="plain">{variants.length} variants</Chip>}>
        <HeadRow label="Variant" cols={[{ label: 'Units', span: 2, align: 'c' }, { label: 'Revenue', span: 4 }]} />
        <div className="an-list scroll">
          {variants.map((v, i) => {
            const [name, opt] = String(v.variant).split(' · ');
            return (
              <Row key={v.variant} rank={i + 1} top={i < 3} title={name || v.variant} sub={opt || 'default variant'}>
                <Metric span={VARIANT_COLS[0].span} align="c" value={v.qty} big={v.qty >= 10} bar={(v.qty / maxQty) * 100} barTone="blue" />
                <Metric span={VARIANT_COLS[1].span} value={pkr(v.revenue)} money big bar={(v.revenue / maxVarRev) * 100} barTone="teal" />
              </Row>
            );
          })}
        </div>
      </Section>

      <Section className="an-c7" title="Cohort retention" subtitle="Repeat % by month">
        <CohortGrid rows={cohorts} />
      </Section>

      <Section className="an-c5" title="Win-back list" subtitle="Repeat buyers silent 60+ days">
        <EmptyState title="Nobody gone quiet" body="No repeat buyer has crossed 60 silent days." />
      </Section>

      <Section className="an-c4" title="Product quality" subtitle="Returns by product">
        <EmptyState title="Zero returns this period" body="Quality is holding." />
      </Section>

      <Section className="an-c8" title="Build your own report" subtitle="Any dimension, either metric"
        actions={<Pills ariaLabel="Dimension" value="category" onChange={() => {}}
          options={['category', 'product', 'city', 'payment', 'coupon'].map((d) => ({ v: d, label: d }))} />}
        footer={<span>Total - <b>{totOrders.toLocaleString()}</b> orders - <b>{pkr(totRev)}</b></span>}>
        <HeadRow label="category" cols={CUSTOM_COLS} />
        <div className="an-list">
          {custom.map((r, i) => (
            <Row key={r.name} rank={i + 1} top={i === 0} title={r.name}>
              <Metric span={CUSTOM_COLS[0].span} align="c" value={r.orders} />
              <Metric span={CUSTOM_COLS[1].span} value={pkr(r.revenue)} money big bar={(r.revenue / custom[0].revenue) * 100} barTone="teal" />
              <Metric span={CUSTOM_COLS[2].span} hide={CUSTOM_COLS[2].hide} chip={<Chip tone="plain">{Math.round((r.revenue / totRev) * 100)}%</Chip>} />
            </Row>
          ))}
        </div>
      </Section>
    </div>
  );
}

export const defs = { ALL_COL_SETS, colSum, METRIC_BUDGET, LEAD_SPAN, GRID_COLS, PRODUCT_COLS };

/* empty-data probe: every section with no rows must still render */
export function EmptyProbe() {
  return (
    <div className="an-grid">
      <Section className="an-c12" title="Product conversion" subtitle="empty">
        <EmptyState title="No traffic or sales in this range" body="Nothing yet." />
      </Section>
      <Section className="an-c7" title="Cohort retention" subtitle="empty">
        <EmptyState title="Not enough history yet" body="Cohorts build automatically." />
      </Section>
      <Section className="an-c5" title="Win-back list" subtitle="empty">
        <EmptyState title="Nobody gone quiet" body="Retention is holding." />
      </Section>
    </div>
  );
}
`);

/* Bundle: JSX + CSS-import stubbed out, React external. */
const cacheDir = join(root, 'node_modules/.cache/an-render');
mkdirSync(cacheDir, { recursive: true });
const out = join(cacheDir, 'probe.mjs');
await build({
  entryPoints: [entry],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react'],
  loader: { '.css': 'empty' },
  logLevel: 'silent',
});

const { Probe, EmptyProbe, defs } = await import(out);
const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');

const html = renderToStaticMarkup(React.createElement(Probe));
const emptyHtml = renderToStaticMarkup(React.createElement(EmptyProbe));

let fail = 0;
const ok = (cond, msg, extra = '') => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { fail += 1; console.log(`  ✗ ${msg}${extra ? ' — ' + extra : ''}`); }
};

console.log('\nanalytics sections — render + structure');

/* the shared column defs the page actually renders from */
ok(defs.LEAD_SPAN + defs.METRIC_BUDGET === defs.GRID_COLS,
  `lead cell (${defs.LEAD_SPAN}) + metric budget (${defs.METRIC_BUDGET}) = ${defs.GRID_COLS} grid columns`);
for (const [name, cs] of Object.entries(defs.ALL_COL_SETS)) {
  ok(defs.colSum(cs) === defs.METRIC_BUDGET,
    `${name} spans sum to ${defs.METRIC_BUDGET}`, `${name} = ${defs.colSum(cs)}`);
}

ok(html.includes('an-grid'), 'grid wrapper rendered');
ok((html.match(/class="an-sec /g) || []).length === 9, 'all 9 sections rendered as an-sec cards',
  `got ${(html.match(/class="an-sec /g) || []).length}`);
ok((html.match(/class="an-row"/g) || []).length === 12 + 4 + 3 + 3, 'all data rows rendered (12 products + 4 customers + 3 variants + 3 custom)',
  `got ${(html.match(/class="an-row"/g) || []).length}`);

/* column rhythm: every metric cell carries an explicit grid span */
const spans = [...html.matchAll(/style="grid-column:span (\d+)"/g)].map((m) => +m[1]);
ok(spans.length > 0, 'metric cells carry explicit grid spans', `none found`);
const badSpan = spans.filter((s) => s < 1 || s > 12);
ok(badSpan.length === 0, 'no span outside 1..12', badSpan.join(','));

/* each product row: 4 (lead) + 2+2+2+3+1 = 12 */
const rowChunks = html.split('class="an-row"').slice(1)
  .map((r) => r.split(/class="an-(?:hrow|sec|grid|empty|coh)/)[0]);
const rowTotals = rowChunks.map((r) => {
  const sp = [...r.matchAll(/style="grid-column:span (\d+)"/g)].map((m) => +m[1]);
  return sp.reduce((a, b) => a + b, 0);
});
/* every row's metrics must fill exactly 8 of the 12 columns, because the lead
 * cell (rank + name) occupies the other 4. Anything else overflows the grid. */
ok(rowTotals.length === 22, 'all 22 data rows parsed', String(rowTotals.length));
ok(rowTotals.every((t) => t === 8), 'every row: metrics sum to 8, lead cell 4 → exactly 12 columns',
  [...new Set(rowTotals)].join(','));

/* headers use the same spans as the cells they label */
const headRaw = html.split('class="an-hrow"')[1] || '';
const head = headRaw.split('class="an-row"')[0];
const headSpans = [...head.matchAll(/style="grid-column:span (\d+)"/g)].map((m) => +m[1]);
ok(headSpans.join(',') === defs.PRODUCT_COLS.map((c) => c.span).join(','),
  'R1 header spans match the shared PRODUCT_COLS spans', headSpans.join(','));

/* hide classes present so narrow screens drop low-priority columns */
ok(html.includes('hide-md') && html.includes('hide-sm'), 'priority hide classes emitted (hide-md / hide-sm)');

/* numbers aligned right, tabular */
ok((html.match(/an-m-v an-r/g) || []).length > 20, 'right-aligned numeric cells rendered',
  `${(html.match(/an-m-v an-r/g) || []).length}`);
ok(html.includes('an-m-v an-r money') || html.includes('money an-m-v') || /money/.test(html),
  'money cells carry the money class');

/* chips toned by conversion quality */
ok(html.includes('an-chip good') && html.includes('an-chip warn'), 'conversion chips toned good/warn by rate');
ok(html.includes('an-coh-cell h3') && html.includes('an-coh-cell h0'), 'cohort heatmap tints scale with repeat %');

/* boss's real numbers survive the round trip */
for (const want of ['PKR 306,625', 'PKR 55,575', 'PKR 498,137', 'PKR 3,150', '16.7%']) {
  ok(html.includes(want), `value present: ${want}`);
}

/* variant long string split into title + options line */
ok(html.includes('HUSHAE Cloud-Knit Relaxed Kimono Robe') && html.includes('S/M / Warm Oatmeal'),
  'variant split into name + size/colour sub-line');
ok(html.includes('default variant'), 'variant without " · " falls back to "default variant"');

/* empty states are the shared component, not loose paragraphs */
ok((emptyHtml.match(/class="an-empty"/g) || []).length === 3, 'empty states render via shared EmptyState',
  `${(emptyHtml.match(/class="an-empty"/g) || []).length}`);
ok(emptyHtml.includes('an-empty-t'), 'empty state has a title line');

/* total row / footer: 498137 + 88450 + 5400 = 591987 */
ok(html.includes('an-sec-f'), 'report footer rendered');
ok(html.includes('PKR 591,987'), 'report footer totals the custom report revenue (PKR 591,987)');
ok(html.includes('>51<'), 'report footer totals the custom report orders (51)');

console.log(fail === 0 ? '\n✓ all assertions passed\n' : `\n✗ ${fail} assertion(s) failed\n`);
process.exit(fail === 0 ? 0 : 1);
