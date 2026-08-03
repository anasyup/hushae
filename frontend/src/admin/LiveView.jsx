import { useEffect, useState } from 'react';
import { Activity, CreditCard, Globe, MapPin, Monitor, ShoppingCart, Smartphone, Tablet, Users } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

const ago = (ts) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const DevIcon = ({ d, size = 13 }) =>
  d === 'mobile' ? <Smartphone size={size} /> : d === 'tablet' ? <Tablet size={size} /> : <Monitor size={size} />;
const EvIcon = ({ e }) =>
  e === 'cart' ? <ShoppingCart size={13} className="text-amber-700" />
    : e === 'checkout' ? <CreditCard size={13} className="text-emerald-700" />
    : <Globe size={13} className="text-neutral-500" />;
const EV_LABEL = { pageview: 'Viewed', cart: 'Added to cart', checkout: 'Reached checkout' };

export default function LiveView() {
  const { auth } = useApp();
  const [d, setD] = useState(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let stop = false;
    const load = () => api('/track/admin/live', { token: auth.token })
      .then((x) => { if (!stop) { setD(x); setStale(false); } })
      .catch(() => setStale(true));
    load();
    const t = setInterval(load, 15000);
    return () => { stop = true; clearInterval(t); };
  }, [auth]);

  if (!d) return <AdminLayout title="Live View"><div className="animate-pulse rounded-xl bg-neutral-100 h-64 w-full" /></AdminLayout>;

  const maxLoc = Math.max(...d.byLocation.map((l) => l.sessions), 1);
  const cards = [
    [Users, 'Visitors right now', d.visitorsNow, true],
    [Globe, 'Sessions today', d.today.sessions],
    [ShoppingCart, 'Orders today', d.today.orders],
    [CreditCard, 'Sales today', pkr(d.today.sales)],
  ];

  return (
    <AdminLayout title="Live View">
      <div className="mb-5 flex items-center gap-2 text-xs text-neutral-500">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
        </span>
        Live — refreshes every 15 seconds {stale && <span className="text-amber-700">(reconnecting…)</span>}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([Icon, label, v, hot]) => (
          <div key={label} className={`card p-5 ${hot ? 'ring-1 ring-emerald-200' : ''}`}>
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">{label}</p>
              <Icon size={16} className={hot ? 'text-emerald-700' : 'text-emerald-700'} />
            </div>
            <p className={`mt-2 font-sans ${hot ? 'text-4xl' : 'text-2xl'}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Customer behaviour funnel */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="mb-5 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-neutral-500"><Activity size={14} /> Customer behaviour — today</p>
          <div className="grid grid-cols-3 divide-x divide-line text-center">
            {[[ShoppingCart, 'Active carts', d.today.carts], [CreditCard, 'Reached checkout', d.today.checkouts], [Users, 'Purchased', d.today.orders]].map(([Icon, l, v]) => (
              <div key={l} className="px-2">
                <Icon size={16} className="mx-auto text-emerald-700" />
                <p className="mt-2 font-sans text-2xl">{v}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sessions by location */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-2">
          <p className="mb-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-neutral-500"><MapPin size={14} /> Sessions by location — today</p>
          <p className="mb-4 text-[9px] leading-relaxed text-neutral-500">Shehar visitor ke network (IP) se milta hai — VPN ya mobile network (Jazz/Telenor) ki wajah se qareebi shehar bhi dikh sakta hai. Ye GPS nahi, approximate area hai.</p>
          {d.byLocation.length === 0
            ? <p className="text-sm text-neutral-500">No visits yet today — jab visitors aayenge to unke shehar yahan dikhenge.</p>
            : (
              <div className="space-y-2.5">
                {d.byLocation.map((l) => (
                  <div key={`${l.city}-${l.country}`} className="flex items-center gap-3">
                    <span className="w-40 truncate text-xs font-medium">{l.city} <span className="text-neutral-500">({l.country})</span></span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(l.sessions / maxLoc) * 100}%` }} />
                    </div>
                    <span className="w-14 text-right text-xs font-bold">{l.sessions}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Live feed */}
      <div className="rounded-2xl border border-neutral-200 bg-white mt-6 p-6">
        <p className="mb-4 text-[9px] font-bold uppercase tracking-widest text-neutral-500">Live activity feed</p>
        {d.feed.length === 0 ? <p className="text-sm text-neutral-500">Abhi koi activity nahi — store khulte hi yahan real-time feed chalegi.</p> : (
          <ol className="space-y-2">
            {d.feed.map((e, i) => (
              <li key={i} className="flex items-center gap-3 border-b border-neutral-200/50 pb-2 text-sm last:border-0 last:pb-0">
                <EvIcon e={e.event} />
                <span className="font-medium">{EV_LABEL[e.event]}</span>
                <span className="max-w-56 truncate font-mono text-xs text-neutral-500">{e.path}</span>
                <span className="ml-auto flex items-center gap-2 text-[9px] text-neutral-500">
                  {e.city && <span>📍 {e.city}</span>}
                  <DevIcon d={e.device} />
                  <span className="w-16 text-right">{ago(e.createdAt)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </AdminLayout>
  );
}
