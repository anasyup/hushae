import { useEffect, useState } from 'react';
import {
  Banknote, BarChart3, ChevronRight, Globe, Layers, Monitor, Receipt, Repeat,
  ShoppingBag, ShoppingCart, Smartphone, Tablet, TrendingDown, TrendingUp, UserPlus, Users,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

const RANGES = [
  { v: 'today', label: 'Today' },
  { v: '7d', label: 'Last 7 days' },
  { v: '30d', label: 'Last 30 days' },
  { v: '90d', label: 'Last 90 days' },
  { v: 'all', label: 'All time' },
];

const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/* ---------- tiny chart building blocks (no library — fully ours) ---------- */

function LineChart({ data, k, color = '#3E5C4B', height = 170, fmt = (v) => v }) {
  const w = 720, h = height, padX = 10, padY = 14;
  const max = Math.max(...data.map((d) => d[k]), 1);
  const pts = data.map((d, i) => [
    padX + (i * (w - 2 * padX)) / Math.max(data.length - 1, 1),
    h - padY - (d[k] / max) * (h - 2 * padY),
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="min-w-[420px]">
        <defs>
          <linearGradient id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={padX} x2={w - padX} y1={h - padY - f * (h - 2 * padY)} y2={h - padY - f * (h - 2 * padY)} stroke="#e5e2dd" strokeDasharray="3 4" />
        ))}
        {pts.length > 1 && (
          <>
            <path d={`${line} L${pts[pts.length - 1][0]},${h - padY} L${pts[0][0]},${h - padY} Z`} fill={`url(#g${k})`} />
            <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={pts.length > 40 ? 2 : 3.4} fill="#fff" stroke={color} strokeWidth="2">
            <title>{`${dayLabel(data[i].date)} — ${fmt(data[i][k])}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] text-ash">
        {data.filter((_, i) => i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0).map((d) => <span key={d.date}>{dayLabel(d.date)}</span>)}
      </div>
    </div>
  );
}

function HBars({ rows, fmt = (v) => v, empty = 'No data for this range yet' }) {
  if (!rows.length) return <p className="py-3 text-sm text-ash">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-44 truncate text-xs font-medium" title={r.label}>{r.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-satin">
            <div className="h-full rounded-full bg-obsidian/80" style={{ width: `${Math.max((r.value / max) * 100, 2)}%` }} />
          </div>
          <span className="w-24 text-right text-xs font-bold">{fmt(r.value)}{r.sub ? <span className="ml-1 font-normal text-ash">{r.sub}</span> : null}</span>
        </div>
      ))}
    </div>
  );
}

function Group({ icon: Icon, title, hint, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-6 py-5 text-left transition hover:bg-satin/30">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-satin text-sagedeep"><Icon size={16} /></span>
        <span className="flex-1">
          <span className="block text-sm font-bold">{title}</span>
          <span className="block text-[11px] text-ash">{hint}</span>
        </span>
        <ChevronRight size={16} className={`text-ash transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="space-y-8 border-t border-line px-6 py-6">{children}</div>}
    </div>
  );
}

function Block({ title, children }) {
  return (
    <section>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ash">{title}</p>
      {children}
    </section>
  );
}

const DevIcon = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };

/* ---------- main page ---------- */

export default function Analytics() {
  const { auth, logout } = useApp();
  const [range, setRange] = useState('30d');
  const [a, setA] = useState(null);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setA(null); setErr('');
    api(`/analytics/overview?range=${range}`, { token: auth.token })
      .then(setA)
      .catch((e) => { if (e?.status === 401) { logout(); return; } setErr('Failed to load analytics — please try again.'); });
  }, [auth, range, tick]); // eslint-disable-line

  const head = (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <select value={range} onChange={(e) => setRange(e.target.value)} className="input !w-52">
        {RANGES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
      </select>
      {a?.prev && <span className="text-xs text-ash">compared with the previous {RANGES.find((r) => r.v === range)?.label.toLowerCase()}</span>}
    </div>
  );

  if (!a) return (
    <AdminLayout title="Analytics">
      {head}
      {err
        ? <div className="card mx-auto max-w-md p-10 text-center"><p className="text-sm text-red-700">{err}</p><button onClick={() => setTick((t) => t + 1)} className="btn-outline mt-5 !px-5 !py-2 !text-[11px]">Try again</button></div>
        : <div className="skeleton h-64 w-full" />}
    </AdminLayout>
  );

  const delta = (v, p) => {
    if (!a.prev) return null;
    if (p === 0) return v > 0 ? { txt: 'new', up: true } : { txt: '0%', up: null };
    const pc = Math.round(((v - p) / p) * 100);
    return { txt: `${pc >= 0 ? '+' : ''}${pc}%`, up: pc >= 0 };
  };
  const Delta = ({ d }) => !d ? null : (
    <span className={`ml-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${d.up === null ? 'bg-satin text-ash' : d.up ? 'bg-sage/25 text-sagedeep' : 'bg-red-100 text-red-700'}`}>
      {d.up === null ? null : d.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{d.txt}
    </span>
  );

  const kpis = [
    [Banknote, 'Total sales', pkr(a.kpis.revenue), delta(a.kpis.revenue, a.prev?.revenue)],
    [ShoppingBag, 'Orders', a.kpis.orders, delta(a.kpis.orders, a.prev?.orders)],
    [Receipt, 'Avg order value', pkr(a.kpis.aov), null],
    [Layers, 'Items sold', a.kpis.itemsSold, null],
    [Globe, 'Store sessions', a.kpis.sessions, null],
    [BarChart3, 'Conversion rate', `${a.kpis.conversion}%`, null],
  ];

  const catName = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <AdminLayout title="Analytics">
      {head}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {kpis.map(([Icon, label, v, d]) => (
          <div key={label} className="card p-4">
            <Icon size={16} className="text-ash" />
            <p className="mt-3 font-sans text-xl">{v}<Delta d={d} /></p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ash">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        {/* ===== SALES ===== */}
        <Group icon={Banknote} title="Sales reports" hint="Revenue, orders, products aur categories ki performance">
          <Block title="Sales over time">
            <LineChart data={a.series} k="revenue" fmt={(v) => pkr(v)} />
          </Block>
          <Block title="Orders over time">
            <LineChart data={a.series} k="orders" color="#8A6D3B" />
          </Block>
          <div className="grid gap-8 lg:grid-cols-2">
            <Block title="Total sales by product">
              <HBars rows={a.topProducts.map((p) => ({ label: p.name, value: p.revenue, sub: `· ${p.qty} pcs` }))} fmt={(v) => pkr(v)} />
            </Block>
            <Block title="Sales by category">
              <HBars rows={a.byCategory.map((c) => ({ label: catName(c.cat), value: c.revenue }))} fmt={(v) => pkr(v)} />
            </Block>
            <Block title="Sales by payment method">
              <HBars rows={a.byPayment.map((p) => ({ label: p.method, value: p.revenue }))} fmt={(v) => pkr(v)} />
            </Block>
            <Block title="Orders by status">
              <HBars rows={a.byStatus.map((s) => ({ label: s.status, value: s.count }))} />
            </Block>
          </div>
        </Group>

        {/* ===== CUSTOMERS ===== */}
        <Group icon={Users} title="Customer reports" hint="Naye vs waps aane wale buyers, shehar ki performance" defaultOpen={false}>
          <div className="grid gap-8 lg:grid-cols-2">
            <Block title="New vs returning customers">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-satin/50 p-5 text-center">
                  <UserPlus size={16} className="mx-auto text-sagedeep" />
                  <p className="mt-2 font-sans text-3xl">{a.customerSplit.fresh}</p>
                  <p className="text-[10px] uppercase tracking-wider text-ash">First-time buyers</p>
                </div>
                <div className="rounded-2xl bg-satin/50 p-5 text-center">
                  <Repeat size={16} className="mx-auto text-sagedeep" />
                  <p className="mt-2 font-sans text-3xl">{a.customerSplit.returning}</p>
                  <p className="text-[10px] uppercase tracking-wider text-ash">Returning buyers</p>
                </div>
              </div>
            </Block>
            <Block title="Orders by city">
              <HBars rows={a.orderCities.map((c) => ({ label: c.city, value: c.orders }))} />
            </Block>
          </div>
        </Group>

        {/* ===== TRAFFIC ===== */}
        <Group icon={Globe} title="Traffic reports" hint="Kitne log site par aaye, kis device se, kahan se" defaultOpen={false}>
          <Block title="Sessions over time">
            <LineChart data={a.traffic.sessionsSeries} k="sessions" color="#4A6670" />
          </Block>
          <div className="grid gap-8 lg:grid-cols-2">
            <Block title="Sessions by device">
              <HBars rows={a.traffic.byDevice.map((d) => ({ label: `${d.device}`, value: d.sessions }))} />
            </Block>
            <Block title="Sessions by city">
              <HBars rows={a.traffic.visitCities.map((c) => ({ label: c.city, value: c.sessions }))} empty="City data visits aane par dikhegi" />
            </Block>
            <Block title="Top pages">
              <HBars rows={a.traffic.landing.map((l) => ({ label: l.path, value: l.views }))} />
            </Block>
            <Block title="Visitors source (referrers)">
              <HBars rows={a.traffic.refs.map((r) => ({ label: r.ref.replace(/^https?:\/\//, '').slice(0, 38), value: r.views }))} empty="All traffic is direct so far — once links are shared, sources will appear here" />
            </Block>
          </div>
        </Group>
      </div>
    </AdminLayout>
  );
}
