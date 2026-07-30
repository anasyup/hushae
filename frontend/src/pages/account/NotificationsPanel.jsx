import { useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import Spinner from '../../components/ui/Spinner';

/* ============================================================================
 * Notification preferences.
 *
 * The API route and the User.notify fields shipped in Part 1; this is the
 * screen that was missing.
 *
 * Order notifications are described honestly: they are transactional, so the
 * customer is told what turning them off actually costs rather than being
 * offered a switch that quietly breaks delivery updates.
 * ========================================================================== */

const GROUPS = [
  {
    title: 'Order updates',
    note: 'Confirmations, dispatch and delivery. We recommend keeping these on.',
    rows: [
      ['orderEmail', 'By email'],
      ['orderSms', 'By SMS or WhatsApp'],
    ],
  },
  {
    title: 'Offers and new arrivals',
    note: 'Occasional. You can turn these off without affecting your orders.',
    rows: [
      ['marketingEmail', 'By email'],
      ['marketingSms', 'By SMS or WhatsApp'],
    ],
  },
];

export default function NotificationsPanel({ user, onUpdated }) {
  const { auth, toast } = useApp();
  const [v, setV] = useState({
    orderEmail: user.notify?.orderEmail !== false,
    orderSms: user.notify?.orderSms !== false,
    marketingEmail: !!user.notify?.marketingEmail,
    marketingSms: !!user.notify?.marketingSms,
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');

  const dirty = ['orderEmail', 'orderSms', 'marketingEmail', 'marketingSms']
    .some((k) => v[k] !== (k.startsWith('order') ? user.notify?.[k] !== false : !!user.notify?.[k]));

  const save = async () => {
    setBusy(true); setSaved('');
    try {
      const d = await api('/customer/notifications', { method: 'PUT', token: auth.token, body: v });
      onUpdated(d.user);
      setSaved('Your preferences have been saved.');
    } catch (e) { toast(e.message || 'Could not save'); }
    setBusy(false);
  };

  return (
    <section className="card-content" aria-labelledby="sec-notify">
      <h2 id="sec-notify" className="flex items-center gap-2 text-label uppercase tracking-widest text-ash">
        <Bell size={13} aria-hidden="true" /> How we contact you
      </h2>

      <div className="mt-5 space-y-6">
        {GROUPS.map((g) => (
          <fieldset key={g.title}>
            <legend className="text-body-sm font-semibold">{g.title}</legend>
            <p className="mt-0.5 text-caption leading-relaxed text-ash">{g.note}</p>
            <div className="mt-3 space-y-2">
              {g.rows.map(([k, label]) => (
                <label
                  key={k}
                  className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4 rounded-control border border-line bg-white px-3.5 py-2 transition hover:border-obsidian/30"
                >
                  <span className="text-body-sm">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={v[k]}
                    aria-label={`${g.title} — ${label}`}
                    onClick={() => { setV({ ...v, [k]: !v[k] }); setSaved(''); }}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-fast ${v[k] ? 'bg-obsidian' : 'bg-stone'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-fast motion-reduce:transition-none ${v[k] ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy || !dirty} className="btn-primary gap-2 disabled:opacity-40">
          {busy ? <><Spinner label="Saving" /> Saving…</> : 'Save preferences'}
        </button>
        {saved && (
          <p role="status" className="flex items-center gap-1.5 text-caption font-medium text-sagedark">
            <CheckCircle2 size={13} aria-hidden="true" /> {saved}
          </p>
        )}
      </div>
    </section>
  );
}
