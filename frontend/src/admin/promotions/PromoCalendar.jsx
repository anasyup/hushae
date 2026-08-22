import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { typeOf, DAYS, minToTime } from './promoTypes';
import { MonoStatus } from '../orders/orderUi';

const fmt = (d) => (d ? new Date(d).toLocaleString('en-GB', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}) : '—');

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short',
}) : '—');

function Row({ p, note }) {
  return (
    <li className="border-b border-white/10">
      <Link to={`/admin/promotions/${p._id}`} className="flex min-h-[44px] items-center gap-3 py-3 adm-row-hover">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-white">{p.name}</span>
          <span className="mt-0.5 block text-[11px] text-white/35">
            {typeOf(p.type).short}
            {p.priority != null && ` · priority ${p.priority}`}
            {p.exclusive && ' · exclusive'}
          </span>
        </span>
        <span className="shrink-0 text-[11px] text-white/40">{note}</span>
      </Link>
    </li>
  );
}

function Group({ title, description, rows, render, empty }) {
  return (
    <section>
      <p className="adm-label">{title}</p>
      {description && <p className="mt-1 text-[12px] text-white/35">{description}</p>}
      {!rows.length ? (
        <p className="mt-4 border-y border-white/10 py-6 text-center text-[12px] text-white/35">{empty}</p>
      ) : (
        <ul className="mt-3">{rows.map(render)}</ul>
      )}
    </section>
  );
}

export default function PromoCalendar({ rows }) {
  const now = Date.now();
  const DAY = 86400000;

  const groups = useMemo(() => {
    const all = rows || [];
    const live = all.filter((p) => p.state?.reason === 'live');
    const upcoming = all
      .filter((p) => p.state?.reason === 'scheduled')
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    const expiring = live
      .filter((p) => p.endsAt && new Date(p.endsAt).getTime() - now < 7 * DAY)
      .sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt));
    const flash = all.filter((p) => p.type === 'flash' || p.recurring?.enabled);
    return { live, upcoming, expiring, flash };
  }, [rows, now]);

  const overlaps = useMemo(() => {
    const live = (rows || []).filter((p) => p.state?.reason === 'live' && !p.exclusive);
    const out = [];
    for (let i = 0; i < live.length; i += 1) {
      for (let j = i + 1; j < live.length; j += 1) {
        const a = live[i]; const b = live[j];
        const sa = a.scope || {}; const sb = b.scope || {};
        const touchesAll = sa.mode === 'all' || sb.mode === 'all';
        const shared = touchesAll
          || (sa.categorySlugs || []).some((c) => (sb.categorySlugs || []).includes(c))
          || (sa.tags || []).some((t) => (sb.tags || []).includes(t))
          || (sa.productIds || []).some((p) => (sb.productIds || []).map(String).includes(String(p)));
        if (shared && !(a.stackable && b.stackable)) out.push([a, b]);
      }
    }
    return out.slice(0, 6);
  }, [rows]);

  if (rows === null) return <div className="h-40 animate-pulse bg-white/5" />;

  return (
    <div className="space-y-10">
      {overlaps.length > 0 && (
        <section role="alert" className="border-y border-white/15 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white">These promotions compete</p>
          <p className="mt-2 text-[12px] leading-relaxed text-white/40">
            Only the higher-priority one will apply to a shared item. Narrow a scope or mark both as stackable if that was not intended.
          </p>
          <ul className="mt-3 space-y-1.5 text-[12px] text-white/70">
            {overlaps.map(([a, b]) => (
              <li key={`${a._id}-${b._id}`}>
                <Link to={`/admin/promotions/${a._id}`} className="text-white hover:underline">{a.name}</Link>
                {' '}(P{a.priority}) and{' '}
                <Link to={`/admin/promotions/${b._id}`} className="text-white hover:underline">{b.name}</Link>
                {' '}(P{b.priority}) — <span className="text-white">{a.priority <= b.priority ? a.name : b.name}</span> wins
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        <Group
          title="Running now"
          description="Applying to baskets at this moment."
          rows={groups.live}
          empty="Nothing is running."
          render={(p) => (
            <Row key={p._id} p={p} note={p.endsAt ? `until ${fmt(p.endsAt)}` : 'no end date'} />
          )}
        />
        <Group
          title="Ending soon"
          description="Live, finishing within seven days."
          rows={groups.expiring}
          empty="Nothing ends this week."
          render={(p) => {
            const hrs = Math.max(0, Math.round((new Date(p.endsAt).getTime() - now) / 3600000));
            return <Row key={p._id} p={p} note={hrs < 24 ? `${hrs}h left` : `${Math.round(hrs / 24)}d left`} />;
          }}
        />
        <Group
          title="Starting later"
          description="Scheduled, not yet applying."
          rows={groups.upcoming}
          empty="Nothing scheduled."
          render={(p) => <Row key={p._id} p={p} note={`starts ${fmtDay(p.startsAt)}`} />}
        />
        <Group
          title="Flash & repeating"
          description="Set days or hours rather than continuously."
          rows={groups.flash}
          empty="No flash sales set up."
          render={(p) => {
            const r = p.recurring || {};
            const days = (r.daysOfWeek || []).length ? r.daysOfWeek.map((d) => DAYS[d]).join(' ') : 'every day';
            const note = r.enabled
              ? `${days} · ${minToTime(r.startMin)}–${minToTime(r.endMin)}`
              : (p.endsAt ? `until ${fmtDay(p.endsAt)}` : 'always on');
            return (
              <li key={p._id} className="border-b border-white/10">
                <Link to={`/admin/promotions/${p._id}`} className="flex min-h-[44px] items-center gap-3 py-3 adm-row-hover">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-white">{p.name}</span>
                    <span className="mt-0.5 block text-[11px] text-white/35">{note}</span>
                  </span>
                  <MonoStatus label={p.state?.reason === 'live' ? 'ACTIVE' : 'OFF'} dim={p.state?.reason !== 'live'} />
                </Link>
              </li>
            );
          }}
        />
      </div>
    </div>
  );
}
