import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { MonoStatus, TableSkeleton } from './orders/orderUi';
import { RankedBars } from './analytics/charts';

const ago = (ts) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

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

  if (!d) {
    return (
      <AdminLayout title="Live View">
        <PageHeader title="Live" description="Real-time store activity." />
        <TableSkeleton rows={6} />
      </AdminLayout>
    );
  }

  const cards = [
    { label: 'Visitors now', value: d.visitorsNow },
    { label: 'Sessions today', value: d.today.sessions },
    { label: 'Orders today', value: d.today.orders },
    { label: 'Sales today', value: pkr(d.today.sales) },
  ];

  return (
    <AdminLayout title="Live View">
      <PageHeader
        title="Live"
        description="Real-time store activity."
        actions={(
          <div className="flex items-center gap-3">
            <MonoStatus label="LIVE" dim={stale} />
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#AAAAAA]">
              {stale ? 'Reconnecting…' : 'Every 15 seconds'}
            </span>
          </div>
        )}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Now</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] lg:grid-cols-4">
          {cards.map((x) => (
            <div key={x.label} className="px-5 py-6">
              <p className="adm-label">{x.label}</p>
              <p className="adm-metric mt-3 text-[28px] leading-none text-black">{x.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">02 — Behaviour</p>
        <div className="adm-divide-x grid grid-cols-3 border-y border-[#EAEAEA]">
          {[
            { label: 'Active carts', value: d.today.carts },
            { label: 'Reached checkout', value: d.today.checkouts },
            { label: 'Purchased', value: d.today.orders },
          ].map((x) => (
            <div key={x.label} className="px-5 py-6">
              <p className="adm-label">{x.label}</p>
              <p className="adm-metric mt-3 text-[26px] leading-none text-black">{x.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">03 — Location</p>
        <p className="mb-4 text-[12px] leading-relaxed text-[#AAAAAA]">
          Shehar visitor ke network (IP) se milta hai — VPN ya mobile network (Jazz/Telenor) ki wajah se qareebi shehar bhi dikh sakta hai. Ye GPS nahi, approximate area hai.
        </p>
        <RankedBars
          rows={d.byLocation.map((l) => ({ label: `${l.city} (${l.country})`, value: l.sessions }))}
          empty="No visits yet today — jab visitors aayenge to unke shehar yahan dikhenge."
        />
      </section>

      <section>
        <p className="adm-index">04 — Activity</p>
        {d.feed.length === 0 ? (
          <p className="border-y border-[#EAEAEA] py-10 text-center text-[12px] text-[#AAAAAA]">
            Abhi koi activity nahi — store khulte hi yahan real-time feed chalegi.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[0.7fr_1.1fr_0.6fr_minmax(0,1.4fr)_0.6fr] md:gap-3">
              {['Time', 'Event', 'Device', 'Page / context', 'City'].map((h) => <p key={h} className="adm-label">{h}</p>)}
            </div>
            {d.feed.map((e, i) => (
              <div key={i} className="grid grid-cols-2 items-center gap-2 border-b border-[#F0F0F0] py-3 md:grid-cols-[0.7fr_1.1fr_0.6fr_minmax(0,1.4fr)_0.6fr] md:gap-3">
                <span className="text-[11px] tabular-nums text-[#999999]">{ago(e.createdAt)}</span>
                <span className="text-[12px] text-black">{EV_LABEL[e.event] || e.event}</span>
                <span className="text-[11px] uppercase tracking-[0.12em] text-[#AAAAAA]">{e.device || '—'}</span>
                <span className="truncate font-mono text-[11px] text-[#777777]">{e.path}</span>
                <span className="text-[11px] text-[#AAAAAA]">{e.city || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
