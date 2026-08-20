import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import { typeOf, DAYS, minToTime } from './promoTypes';

/* ============================================================================
 * PROMOTION CALENDAR
 *
 * Deliberately NOT a month grid. A month grid answers "what is on the 14th",
 * which a merchant rarely asks. What they actually need to know is:
 *
 *   · what is running right now
 *   · what starts next
 *   · what is about to end, so they can extend it
 *   · which promotions OVERLAP, because that is where money leaks
 *
 * So this is four honest lists plus an overlap warning, which is the thing a
 * grid would bury. Overlap matters because two live promotions competing for
 * the same products means the conflict resolver is silently discarding one —
 * fine when intended, expensive when not.
 * ========================================================================== */

const fmt = (d) => (d ? new Date(d).toLocaleString('en-GB', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}) : '—');

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short',
}) : '—');

function Row({ p, note, tone }) {
  return (
    <li>
      <Link
        to={`/admin/promotions/${p._id}`}
        className={`flex min-h-[44px] items-center gap-3 rounded-xl border px-4 py-3 transition hover:border-neutral-300 ${tone === 'warn' ? 'border-[#CDB98F] bg-[#F6F1E6]' : 'border-neutral-200 bg-white'}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-neutral-900">{p.name}</span>
          <span className="mt-0.5 block text-[12px] text-neutral-600">
            {typeOf(p.type).short}
            {p.priority != null && ` · priority ${p.priority}`}
            {p.exclusive && ' · exclusive'}
          </span>
        </span>
        <span className={`shrink-0 text-[12px] ${tone === 'warn' ? 'font-semibold text-[#5C4A28]' : 'text-neutral-600'}`}>{note}</span>
      </Link>
    </li>
  );
}

function Group({ title, description, rows, render, empty }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-600">{title}</p>
      {description && <p className="mt-1 text-[12px] leading-relaxed text-neutral-600">{description}</p>}
      {!rows.length ? (
        <p className="mt-4 rounded-xl bg-neutral-50 px-4 py-6 text-center text-[12px] text-neutral-600">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2">{rows.map(render)}</ul>
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
    // "Expiring" means live AND ending within a week — a finished promotion
    // is not expiring, it has expired.
    const expiring = live
      .filter((p) => p.endsAt && new Date(p.endsAt).getTime() - now < 7 * DAY)
      .sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt));
    const flash = all.filter((p) => p.type === 'flash' || p.recurring?.enabled);
    return { live, upcoming, expiring, flash };
  }, [rows, now]);

  /* Overlap detection. Two promotions overlap when both are live and their
     scopes could touch the same products. Scope comparison is deliberately
     coarse — "all" overlaps everything, otherwise a shared category, tag or
     product id counts. A false warning costs a glance; a missed one costs
     margin. */
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

  if (rows === null) return <div className="skeleton h-96 w-full" />;

  return (
    <div className="space-y-5">
      {overlaps.length > 0 && (
        <section role="alert" className="rounded-2xl border border-[#CDB98F] bg-[#F6F1E6] p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[#5C4A28]">
            <AlertTriangle size={14} /> These promotions compete for the same products
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#5C4A28]">
            Only the higher-priority one will apply to a shared item — the other is
            discarded. That is fine if you meant it. If not, narrow one of them or
            mark both as stackable.
          </p>
          <ul className="mt-3 space-y-1.5 text-[12px] text-[#5C4A28]">
            {overlaps.map(([a, b]) => (
              <li key={`${a._id}-${b._id}`}>
                <Link to={`/admin/promotions/${a._id}`} className="font-semibold underline-offset-2 hover:underline">{a.name}</Link>
                {' '}(priority {a.priority}) and{' '}
                <Link to={`/admin/promotions/${b._id}`} className="font-semibold underline-offset-2 hover:underline">{b.name}</Link>
                {' '}(priority {b.priority}) — <strong>{a.priority <= b.priority ? a.name : b.name}</strong> wins
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Group
          title="Running now"
          description="Applying to baskets at this moment."
          rows={groups.live}
          empty="Nothing is running. Turn a promotion on, or check its schedule."
          render={(p) => (
            <Row key={p._id} p={p} note={p.endsAt ? `until ${fmt(p.endsAt)}` : 'no end date'} />
          )}
        />

        <Group
          title="Ending soon"
          description="Live, but finishing within seven days."
          rows={groups.expiring}
          empty="Nothing ends this week."
          render={(p) => {
            const hrs = Math.max(0, Math.round((new Date(p.endsAt).getTime() - now) / 3600000));
            return <Row key={p._id} p={p} tone="warn" note={hrs < 24 ? `${hrs}h left` : `${Math.round(hrs / 24)}d left`} />;
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
          title="Flash sales & repeating windows"
          description="Promotions that run on set days or hours rather than continuously."
          rows={groups.flash}
          empty="No flash sales set up."
          render={(p) => {
            const r = p.recurring || {};
            const days = (r.daysOfWeek || []).length ? r.daysOfWeek.map((d) => DAYS[d]).join(' ') : 'every day';
            const note = r.enabled
              ? `${days} · ${minToTime(r.startMin)}–${minToTime(r.endMin)}`
              : (p.endsAt ? `until ${fmtDay(p.endsAt)}` : 'always on');
            return (
              <li key={p._id}>
                <Link
                  to={`/admin/promotions/${p._id}`}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition hover:border-neutral-300"
                >
                  <Clock size={14} className="shrink-0 text-neutral-500" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-neutral-900">{p.name}</span>
                    <span className="mt-0.5 block text-[12px] text-neutral-600">{note}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${p.state?.reason === 'live' ? 'bg-[#E9EFEA] text-[#33503F]' : 'bg-neutral-100 text-neutral-600'}`}>
                    {p.state?.reason === 'live' ? 'On' : 'Off'}
                  </span>
                </Link>
              </li>
            );
          }}
        />
      </div>
    </div>
  );
}
