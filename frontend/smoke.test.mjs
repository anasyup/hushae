/* Client-render smoke test for the rebuilt Overview (frontend/src/admin/Dashboard.jsx).
   Boots jsdom, mounts the REAL component with createRoot + act, lets its effects
   run against a mocked API, and asserts the resulting DOM.

   Run one scenario per process so the api client's in-memory cache can never
   leak between scenarios:
       node smoke.test.mjs full | empty | fail
*/
import { JSDOM } from 'jsdom';

const CASE = process.argv[2] || 'full';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://admin.test/admin',
  pretendToBeVisual: true,
});
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'getComputedStyle', 'localStorage', 'sessionStorage']) {
  globalThis[k] = dom.window[k];
}
globalThis.matchMedia = dom.window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
dom.window.matchMedia = globalThis.matchMedia;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.requestAnimationFrame = globalThis.requestAnimationFrame;
dom.window.cancelAnimationFrame = globalThis.cancelAnimationFrame;
dom.window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 100, height: 20 });
dom.window.localStorage.setItem('hushae.auth', JSON.stringify({ token: 'test-token', user: { name: 'Anas Yup', role: 'admin' } }));

/* ── mocked API, shaped like the live endpoints ───────────────────────────── */
const DASH = {
  kpis: {
    revenue: { value: 128450.6, change: 18.6 },
    orders: { value: 1248, change: 15.3 },
    customers: { value: 856, change: 22.7 },
    aov: { value: 102.9, change: 8.7 },
    profit: { value: 21245.1, change: 20.4 },
  },
  chart: Array.from({ length: 7 }, (_, i) => ({
    label: `Aug ${19 + i}`, date: `2026-08-${19 + i}`, revenue: 12000 + i * 1500, orders: 140 + i * 9, customers: 40 + i * 3,
  })),
  hourly: Array.from({ length: 24 }, (_, i) => ({ hour: i, orders: i % 5 })),
  stats: { pending: 124, confirmed: 90, processing: 80, readyToShip: 40, shipped: 40, delivered: 812, cancelled: 62 },
  lowStock: [{ _id: 'a', name: 'Lace Bralette' }, { _id: 'b', name: 'Cotton Brief' }, { _id: 'c', name: 'Silk Camisole' }],
  bestSellers: [{ name: 'Signature Bralette', unitsSold: 42, revenue: 126000, categorySlug: 'bras' }],
  recentOrders: [
    { _id: 'o1', orderNumber: 'HSH-1250', total: 24800, status: 'Delivered', paymentStatus: 'Paid', customerInfo: { name: 'Ayesha Khan' } },
    { _id: 'o2', orderNumber: 'HSH-1249', total: 3800, status: 'Pending', paymentStatus: 'Pending', customerInfo: { name: 'Sara Malik' } },
  ],
};
const EMPTY_DASH = {
  kpis: { revenue: { value: 0 }, orders: { value: 0 }, customers: { value: 0 }, aov: { value: 0 }, profit: { value: 0 } },
  chart: [], hourly: [], stats: {}, lowStock: [], bestSellers: [], recentOrders: [],
};
const PREV = { ...DASH, chart: DASH.chart.map((r) => ({ ...r, revenue: r.revenue * 0.8 })) };
const LIVE = { visitorsNow: 128, today: { sessions: 540, orders: 12 }, byDevice: [{ device: 'mobile', sessions: 380 }, { device: 'desktop', sessions: 160 }], feed: [{ path: '/' }, { path: '/' }, { path: '/collections/all' }] };
const TREND = { products: [{ _id: 'p1', name: 'Noor Lace Bralette', unitsSold: 512, revenue: 2560000, categorySlug: 'bras', images: [] }] };
const CATS = { categories: [{ slug: 'bras', name: 'Bras' }, { slug: 'briefs', name: 'Briefs' }] };
const CUST = { customers: Array.from({ length: 40 }, (_, i) => ({ _id: `c${i}`, orders: i % 3 })) };
const INS = { paymentBreakdown: { Pending: 8, Paid: 1200 } };
const SMART = { insights: [{ id: 'product-momentum', text: 'Noor Lace Bralette sales are up 32% week on week.' }] };
const CARTS = { stats: { openCount: 128 } };

const calls = [];
globalThis.fetch = async (u) => {
  const url = String(u);
  calls.push(url.replace(/^https?:\/\/[^/]+/, ''));
  const path = url.split('?')[0];
  const body = (() => {
    if (path.endsWith('/api/admin/dashboard')) {
      if (CASE === 'fail') return null;
      if (CASE === 'empty') return EMPTY_DASH;
      return url.includes('from=2026-08-12') ? PREV : DASH;
    }
    if (path.endsWith('/api/track/admin/live')) return CASE === 'fail' ? null : LIVE;
    if (path.endsWith('/api/products/trending')) return CASE === 'fail' ? null : (CASE === 'empty' ? { products: [] } : TREND);
    if (path.endsWith('/api/categories')) return CASE === 'fail' ? null : (CASE === 'empty' ? { categories: [] } : CATS);
    if (path.endsWith('/api/admin/customers')) return CASE === 'fail' ? null : CUST;
    if (path.endsWith('/api/orders/insights/dashboard')) return CASE === 'fail' ? null : INS;
    if (path.endsWith('/api/dashboard/insights')) return CASE === 'fail' ? null : SMART;
    if (path.endsWith('/api/abandoned-cart/admin')) return CASE === 'fail' ? null : CARTS;
    return {};
  })();
  if (body === null) return { ok: false, status: 500, json: async () => ({ message: 'boom' }) };
  return { ok: true, status: 200, json: async () => body };
};

const { createElement: h } = await import('react');
const { createRoot } = await import('react-dom/client');
const { act } = await import('react');
const { MemoryRouter } = await import('react-router-dom');
const { AppProvider, Dashboard } = await import('./entry.bundle.mjs');

let fail = 0;
const check = (label, cond, extra = '') => {
  if (!cond) fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${cond ? '' : '   ' + extra}`);
};

const container = document.createElement('div');
container.style.width = '1280px';
container.style.height = '900px';
document.body.appendChild(container);
const root = createRoot(container);
await act(async () => {
  root.render(h(MemoryRouter, { initialEntries: ['/admin'] }, h(AppProvider, null, h(Dashboard))));
});
for (let i = 0; i < 6; i++) {
  await act(async () => { await new Promise((r) => setTimeout(r, 25)); });
}
const text = container.textContent;
const has = (s) => text.includes(s);
const qsa = (sel) => container.querySelectorAll(sel);

if (CASE === 'full') {
  check('mounts without throwing', qsa('section').length > 0, `${qsa('section').length} cards`);
  check('page title "Overview"', has('Overview'));
  check('topbar search present', !!container.querySelector('input[placeholder^="Search products"]'));
  check('Add New pill present', has('Add New'));
  check('Compare pill present', has('Compare: Previous period'));
  check('date pill shows the live range', /Aug \d+/.test(text));
  check('fullscreen control present', !!container.querySelector('button[title="Fullscreen"]'));

  ['Total Sales', 'Orders', 'Customers', 'Avg. Order Value', 'Conversion Rate', 'Net Profit',
    'Sales Overview', 'Sales by Channel', 'Live Visitors', 'Today at a Glance', 'Top Selling Products',
    'Recent Orders', 'Revenue & Orders', 'Orders Status', 'Customer Overview', 'Top Categories',
    'Quick Actions', 'Smart Insights'].forEach((t) => check(`section: ${t}`, has(t)));

  check('KPI count-up reaches PKR value', has('Rs 128,450.60'), text.match(/Rs [\d,.]+/g)?.slice(0, 3).join(' '));
  check('orders KPI formatted', has('1,248'));
  check('conversion computed from live sessions (12/540 = 2.22%)', has('2.22%'));
  check('live visitors from API', has('128'));
  check('real order number rendered', has('HSH-1250'));
  check('real customer name rendered', has('Ayesha Khan'));
  check('paid badge', has('Paid'));
  check('pending badge', has('Pending'));
  check('real product name rendered', has('Noor Lace Bralette'));
  check('category label rendered', has('Bras'));
  check('smart insight text from API', has('up 32% week on week'));
  check('abandoned carts from API', has('128 cart'));
  check('low stock count from API', has('3 products are running low'));
  check('status mix percentage', /65%/.test(text));
  const glance = [...container.querySelectorAll('a[href^="/admin"] b')].slice(0, 4).map((n) => n.textContent);
  const bellBadge = [...container.querySelectorAll('a[title="Alerts & verification queue"] span')].map((n) => n.textContent).join('|');
  const badgeSum = glance.slice(0, 3).reduce((a, b) => a + Number(b), 0);
  check('alerts badge = new orders + pending payments + low stock', bellBadge.split('|').includes(String(badgeSum)), `tiles=${glance.join('+')} sum=${badgeSum} badge=${JSON.stringify(bellBadge)}`);
  check('chart slots mounted', qsa('.recharts-responsive-container').length >= 8, `${qsa('.recharts-responsive-container').length} chart slots`);
  check('quick actions point at admin routes', [...container.querySelectorAll('a[href^="/admin"]')].length > 15);

  ['Wireless Headphones', 'John Doe', 'Sarah Williams', 'May 20', '$128,450', 'Electronics', 'Smart Watch Series 9', 'Running Shoes']
    .forEach((s) => check(`no demo leftover: "${s}"`, !text.includes(s)));

  check('current + previous window both requested',
    calls.filter((c) => c.includes('/api/admin/dashboard')).length >= 2
    && calls.some((c) => c.includes('from=2026-08-12') && c.includes('to=2026-08-18')),
    calls.filter((c) => c.includes('/api/admin/dashboard')).join(' | '));
}

if (CASE === 'empty') {
  check('empty store renders the page', has('Overview') && qsa('section').length > 0, `${qsa('section').length} cards`);
  check('empty store shows empty-orders copy', has('No orders in this period.'));
  check('empty store shows empty-categories copy', has('Category sales appear with orders.'));
  check('empty store shows zero KPIs', has('Rs 0.00'));
  check('empty store insights fall back to guidance copy', has('All tracked products are stocked.'));
  const catsBlock = text.slice(text.indexOf('Top Categories'), text.indexOf('Top Categories') + 140);
  check('no category rows rendered when there is no revenue', !catsBlock.includes('Rs '), JSON.stringify(catsBlock));
}

if (CASE === 'fail') {
  check('error card on API failure', has('Failed to load dashboard.') && has('Try again'), text.replace(/\s+/g, ' ').slice(0, 160));
  check('error card does not render KPI skeleton', !text.includes('Total Sales'));
}

await act(async () => { root.unmount(); });
console.log(fail ? `\n[${CASE}] ${fail} CHECK(S) FAILED` : `\n[${CASE}] ALL CHECKS PASSED`);
process.exit(fail ? 1 : 0);
