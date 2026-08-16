import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { pkr } from '../../lib/format';

/* ============================================================================
 * Abandoned carts — two Inter stats + recent carts with a WhatsApp nudge.
 * Email/phone captured at checkout.
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
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium" style={{ color: 'var(--fs-text-muted)' }}>Abandoned carts</p>
        <Link to="/admin/abandoned-carts" className="text-[12px] font-semibold transition-opacity hover:opacity-70" style={{ color: 'var(--fs-accent-soft-text)' }}>All →</Link>
      </div>

      <div className="mt-4 flex items-baseline gap-10">
        <div>
          <p className="text-[21px] font-bold leading-none tabular-nums" style={{ color: 'var(--fs-text-primary)' }}>{stats.openCount}</p>
          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--fs-text-muted)' }}>Open</p>
        </div>
        <div>
          <p className="text-[21px] font-bold leading-none tabular-nums" style={{ color: 'var(--fs-text-primary)' }}>{pkr(stats.openValue)}</p>
          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--fs-text-muted)' }}>Potential revenue</p>
        </div>
      </div>

      {carts.length === 0 ? (
        <p className="mt-5 text-[13px]" style={{ color: 'var(--fs-text-muted)' }}>No open carts.</p>
      ) : (
        <div className="mt-4">
          {carts.map((c) => {
            const phone = waDigits(c.phone);
            const wa = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${c.name || 'there'}, we saved your HUSHAE bag for you. Complete your order and use code COMEBACK10 for 10% off.`)}` : '';
            return (
              <div key={c._id} className="flex items-center gap-3 border-b py-2.5 last:border-0" style={{ borderColor: 'var(--fs-border-subtle)' }}>
                <ShoppingCart size={13} strokeWidth={1.5} className="shrink-0" style={{ color: 'var(--fs-text-muted)' }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px]" style={{ color: 'var(--fs-text-secondary)' }}>{c.name || c.email}</p>
                  <p className="truncate text-[11px]" style={{ color: 'var(--fs-text-muted)' }}>{c.itemCount} item{c.itemCount === 1 ? '' : 's'} · {pkr(c.subtotal)}</p>
                </div>
                {wa
                  ? <a href={wa} target="_blank" rel="noreferrer" aria-label={`Remind ${c.name || c.email} via WhatsApp`} title="Send WhatsApp reminder" className="shrink-0 text-[12px] font-semibold" style={{ color: 'var(--fs-accent-soft-text)' }}>Remind</a>
                  : <span className="shrink-0 text-[11px]" style={{ color: 'var(--fs-text-muted)' }} title="No phone captured">{c.email ? 'email only' : '—'}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
