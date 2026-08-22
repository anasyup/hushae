import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ShoppingCart } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { pkr } from '../../lib/format';

/* ============================================================================
 * Abandoned carts — count + potential revenue + recent carts with a one-click
 * WhatsApp nudge (wa.me, no API key). Email/phone captured at checkout by the
 * storefront's POST /abandoned-cart/track.
 * ========================================================================== */

const waDigits = (p) => {
  const d = String(p || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) return `92${d.slice(1)}`;
  if (d.startsWith('92')) return d;
  return `92${d}`;
};

export default function AbandonedCartsWidget() {
  const { auth } = useApp();
  const [data, setData] = useState(null);

  useEffect(() => {
    api('/abandoned-cart/admin?status=open', { token: auth.token })
      .then(setData)
      .catch(() => setData({ carts: [], stats: { openCount: 0, openValue: 0 } }));
  }, [auth.token]);

  const stats = data?.stats || { openCount: 0, openValue: 0 };
  const carts = (data?.carts || []).slice(0, 3);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Abandoned carts</p>
        <Link to="/admin/abandoned-carts" className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-900">All →</Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] uppercase tracking-wider text-neutral-500">Open</p><p className="mt-0.5 font-sans text-[20px] font-semibold tabular-nums text-neutral-900">{stats.openCount}</p></div>
        <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] uppercase tracking-wider text-neutral-500">Potential revenue</p><p className="mt-0.5 font-sans text-[16px] font-semibold tabular-nums text-neutral-900">{pkr(stats.openValue)}</p></div>
      </div>

      {carts.length === 0 ? (
        <p className="mt-4 text-[13px] text-neutral-400">No open carts.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {carts.map((c) => {
            const phone = waDigits(c.phone);
            const wa = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${c.name || 'there'}, we saved your HUSHAE bag for you. Complete your order and use code COMEBACK10 for 10% off.`)}` : '';
            return (
              <div key={c._id} className="flex items-center gap-2.5 rounded-xl border border-neutral-100 p-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-500"><ShoppingCart size={13} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-neutral-900">{c.name || c.email}</p>
                  <p className="truncate text-[11px] text-neutral-500">{c.itemCount} item{c.itemCount === 1 ? '' : 's'} · {pkr(c.subtotal)}</p>
                </div>
                {wa
                  ? <a href={wa} target="_blank" rel="noreferrer" aria-label={`Remind ${c.name || c.email} via WhatsApp`} title="Send WhatsApp reminder" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white/80 transition hover:bg-white/20"><MessageCircle size={14} /></a>
                  : <span className="shrink-0 text-[11px] text-neutral-400" title="No phone captured">{c.email ? 'email only' : '—'}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
