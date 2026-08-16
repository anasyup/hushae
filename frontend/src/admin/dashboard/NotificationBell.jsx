import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCheck, CreditCard, Package, PackageX, Printer } from 'lucide-react';
import { api } from '../../api/client';
import { useApp } from '../../store/AppContext';

const ICON = {
  'order.created': Package,
  'order.status': Package,
  'payment.received': CreditCard,
  'payment.expiring': CreditCard,
  'payment.expired': CreditCard,
  'issue.raised': AlertTriangle,
  'print.done': Printer,
  'bulk.done': CheckCheck,
};
const TONE = {
  danger: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-700',
  success: 'bg-emerald-50 text-emerald-700',
  info: 'bg-blue-50 text-blue-600',
};

const ago = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/** The topbar bell — a real feed backed by /api/notifications. */
export default function NotificationBell() {
  const { auth } = useApp();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  const load = async () => {
    if (!auth?.token) return;
    try { setData(await api('/notifications?limit=15', { token: auth.token })); } catch { /* silent */ }
  };

  useEffect(() => { load(); }, [auth?.token]); // eslint-disable-line
  useEffect(() => {
    if (!auth?.token) return undefined;
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [auth?.token]); // eslint-disable-line

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const markAll = async () => {
    setBusy(true);
    try { await api('/notifications/read', { method: 'POST', token: auth.token, body: { all: true } }); await load(); }
    catch { /* silent */ }
    setBusy(false);
  };

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      api('/notifications/read', { method: 'POST', token: auth.token, body: { id: n.id } })
        .then(load).catch(() => {});
    }
    if (n.link) nav(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-[var(--px-muted)] transition-opacity hover:opacity-60"
        aria-label={`Notifications${data.unread ? ` — ${data.unread} unread` : ''}`}
      >
        <Bell size={15} strokeWidth={1.5} />
        {data.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[11px] font-medium text-white" style={{ background: 'var(--px-accent)' }}>
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">
              Notifications{data.unread > 0 ? ` · ${data.unread} new` : ''}
            </p>
            {data.unread > 0 && (
              <button onClick={markAll} disabled={busy}
                className="text-[12px] font-semibold text-neutral-500 transition hover:text-neutral-900 disabled:opacity-50">
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {data.items.length === 0 ? (
              <p className="py-10 text-center text-[12px] text-neutral-400">You&apos;re all caught up.</p>
            ) : data.items.map((n) => {
              const Icon = ICON[n.type] || PackageX;
              return (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`flex w-full items-start gap-3 border-b border-neutral-50 px-4 py-3 text-left transition last:border-0 hover:bg-neutral-50 ${n.read ? '' : 'bg-blue-50/40'}`}
                >
                  <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${TONE[n.severity] || TONE.info}`}>
                    <Icon size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-neutral-900">{n.title}</span>
                    {n.body && <span className="mt-0.5 block line-clamp-2 text-[13px] leading-snug text-neutral-500">{n.body}</span>}
                    <span className="mt-1 block text-[12px] text-neutral-400">{ago(n.at)}</span>
                  </span>
                  {!n.read && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
