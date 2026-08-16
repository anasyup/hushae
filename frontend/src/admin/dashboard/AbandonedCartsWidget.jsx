import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ShoppingCart } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { pkr } from '../../lib/format';

/* ============================================================================
 * Abandoned carts — quiet list: two serif stats + recent carts with a WhatsApp
 * nudge (wa.me, no API key). Email/phone captured at checkout.
 * ========================================================================== */

const INK = '#1A1815';
const MUTED = '#6F6A5E';
const HAIRLINE = 'rgba(26,24,21,0.08)';

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
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: MUTED }}>Abandoned carts</p>
        <Link to="/admin/abandoned-carts" className="text-[12px] transition-opacity hover:opacity-60" style={{ color: MUTED }}>All →</Link>
      </div>

      <div className="mt-4 flex items-baseline gap-10">
        <div>
          <p className="font-display-serif text-[30px] font-light leading-none tabular-nums" style={{ color: INK }}>{stats.openCount}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>Open</p>
        </div>
        <div>
          <p className="font-display-serif text-[30px] font-light leading-none tabular-nums" style={{ color: INK }}>{pkr(stats.openValue)}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>Potential revenue</p>
        </div>
      </div>

      {carts.length === 0 ? (
        <p className="mt-5 text-[13px]" style={{ color: MUTED }}>No open carts.</p>
      ) : (
        <div className="mt-4">
          {carts.map((c) => {
            const phone = waDigits(c.phone);
            const wa = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${c.name || 'there'}, we saved your HUSHAE bag for you. Complete your order and use code COMEBACK10 for 10% off.`)}` : '';
            return (
              <div key={c._id} className="flex items-center gap-3 border-b py-2.5 last:border-0" style={{ borderColor: HAIRLINE }}>
                <ShoppingCart size={13} strokeWidth={1.5} className="shrink-0" style={{ color: MUTED }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px]" style={{ color: INK }}>{c.name || c.email}</p>
                  <p className="truncate text-[11px]" style={{ color: MUTED }}>{c.itemCount} item{c.itemCount === 1 ? '' : 's'} · {pkr(c.subtotal)}</p>
                </div>
                {wa
                  ? <a href={wa} target="_blank" rel="noreferrer" aria-label={`Remind ${c.name || c.email} via WhatsApp`} title="Send WhatsApp reminder" className="shrink-0 text-[12px] font-medium underline-offset-4 hover:underline" style={{ color: MUTED }}>Remind</a>
                  : <span className="shrink-0 text-[11px]" style={{ color: MUTED }} title="No phone captured">{c.email ? 'email only' : '—'}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
