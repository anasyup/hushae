import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, Award, Loader2, MapPin, MessageCircle, Package, Phone, X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { fmtDate, pkr } from '../../lib/format';
import { stageTone, STAGE_MAP } from './orderConstants';

/* ============================================================================
 * Customer 360 — a side panel opened by clicking a customer name.
 *
 * Everything is derived from the orders already in the database, keyed on the
 * last ten digits of the phone number, so guest checkouts and inconsistent
 * number formats still resolve to one person.
 * ========================================================================== */

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'orders', label: 'Orders' },
  { key: 'issues', label: 'Issues' },
  { key: 'notes', label: 'Notes' },
];

export default function CustomerPanel({ phone, token, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    let alive = true;
    setData(null); setErr('');
    api(`/orders/insights/customer/${encodeURIComponent(phone)}`, { token })
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setErr(e.message || 'Could not load customer'); });
    return () => { alive = false; };
  }, [phone, token]);

  // Escape closes, and the body must not scroll behind the panel.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const c = data?.customer;
  const wa = c ? `https://wa.me/${String(c.phone).replace(/\D/g, '').replace(/^0/, '92')}` : '#';

  return createPortal((
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose} role="dialog" aria-modal="true">
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl sm:max-w-lg"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-neutral-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {!c ? <div className="h-5 w-32 animate-pulse rounded bg-neutral-100" /> : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-[9px] font-semibold text-neutral-900">{c.name || 'Customer'}</h2>
                    {c.isRepeat && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                        <Award size={10} /> Repeat
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[9px] text-neutral-500">
                    <span className="inline-flex items-center gap-1"><Phone size={11} />{c.phone}</span>
                    {c.city && <span className="inline-flex items-center gap-1"><MapPin size={11} />{c.city}</span>}
                  </p>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {c && (
                <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-neutral-200 text-emerald-600 hover:bg-emerald-50">
                  <MessageCircle size={15} />
                </a>
              )}
              <button onClick={onClose} aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50">
                <X size={15} />
              </button>
            </div>
          </div>

          {c && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="Orders" value={c.totalOrders} />
              <Stat label="Spent" value={pkr(c.totalSpent)} />
              <Stat label="Avg order" value={pkr(c.averageOrder)} />
            </div>
          )}
        </div>

        {/* Tabs */}
        {c && (
          <div className="flex shrink-0 gap-1 border-b border-neutral-100 px-3 py-2">
            {TABS.map((t) => {
              const n = t.key === 'orders' ? data.orders.length
                : t.key === 'issues' ? data.issues.length
                  : t.key === 'notes' ? data.notes.length : null;
              return (
                <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={tab === t.key}
                  className={`rounded-lg px-3 py-1.5 text-[9px] font-medium transition ${
                    tab === t.key ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>
                  {t.label}{n ? <span className="ml-1 opacity-60">{n}</span> : null}
                </button>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {err && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-[10px] text-red-800">{err}</p>}
          {!data && !err && (
            <div className="grid h-40 place-items-center"><Loader2 size={18} className="animate-spin text-neutral-400" /></div>
          )}

          {data && tab === 'overview' && (
            <div className="space-y-4">
              <Section title="Summary">
                <Row label="First order" value={fmtDate(c.firstOrderAt)} />
                <Row label="Last order" value={fmtDate(c.lastOrderAt)} />
                <Row label="Preferred payment" value={c.preferredMethod || '—'} />
                <Row label="Cancelled" value={c.cancelled} />
                <Row label="Open issues" value={c.openIssues} tone={c.openIssues ? 'bad' : undefined} />
              </Section>

              <Section title={`Delivery addresses (${data.addresses.length})`}>
                {data.addresses.map((a, i) => (
                  <p key={i} className="border-b border-neutral-100 py-1.5 text-[9px] leading-snug text-neutral-700 last:border-0">
                    {a.line}{a.postalCode ? ` – ${a.postalCode}` : ''}
                  </p>
                ))}
              </Section>

              {data.favourites.length > 0 && (
                <Section title="Most ordered">
                  {data.favourites.map((f) => (
                    <div key={f.name} className="flex items-center gap-2 border-b border-neutral-100 py-1.5 last:border-0">
                      {f.image ? <img src={f.image} alt="" className="h-8 w-8 rounded object-cover" /> : <span className="h-8 w-8 rounded bg-neutral-100" />}
                      <span className="min-w-0 flex-1 truncate text-[9px] text-neutral-700">{f.name}</span>
                      <span className="shrink-0 text-[9px] font-semibold tabular-nums">×{f.units}</span>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}

          {data && tab === 'orders' && (
            <div className="space-y-1.5">
              {data.orders.map((o) => {
                const tone = stageTone(o.stage || 'New');
                return (
                  <Link key={o._id} to={`/admin/orders/${o._id}`} onClick={onClose}
                    className="flex items-center gap-2.5 rounded-lg border border-neutral-200 p-2.5 transition hover:border-neutral-400">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[9px] font-semibold text-neutral-900">{o.orderNumber}</p>
                      <p className="mt-0.5 text-[10px] text-neutral-500">
                        {fmtDate(o.createdAt)} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${tone.pill}`}>
                      {STAGE_MAP[o.stage]?.label || o.status}
                    </span>
                    <span className="w-20 shrink-0 text-right text-[10px] font-semibold tabular-nums">{pkr(o.total)}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {data && tab === 'issues' && (
            data.issues.length === 0
              ? <EmptyState icon={Package} text="No issues ever raised for this customer" />
              : (
                <div className="space-y-2">
                  {data.issues.map((i) => (
                    <div key={i._id} className="rounded-lg border border-neutral-200 p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                        <span className="text-[10px] font-semibold">{i.issueType}</span>
                        <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-semibold">{i.status}</span>
                      </div>
                      {i.description && <p className="mt-1.5 text-[9px] text-neutral-600">{i.description}</p>}
                      <p className="mt-1.5 font-mono text-[9px] text-neutral-400">{i.orderNumber} · {fmtDate(i.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )
          )}

          {data && tab === 'notes' && (
            data.notes.length === 0
              ? <EmptyState icon={Package} text="No internal notes yet" />
              : (
                <div className="space-y-2">
                  {data.notes.map((n, i) => (
                    <div key={i} className="rounded-lg bg-neutral-50 p-3">
                      <p className="text-[9px] text-neutral-800">{n.body}</p>
                      <p className="mt-1 font-mono text-[9px] text-neutral-400">
                        {n.orderNumber} · {n.authorName || 'admin'} · {fmtDate(n.at)}
                      </p>
                    </div>
                  ))}
                </div>
              )
          )}
        </div>
      </aside>
    </div>
  ), document.body);
}

const Stat = ({ label, value }) => (
  <div className="rounded-lg bg-neutral-50 px-2.5 py-2">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
    <p className="mt-0.5 text-[9px] font-semibold tabular-nums text-neutral-900">{value}</p>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
    <div className="rounded-lg border border-neutral-200 px-3 py-1">{children}</div>
  </div>
);

const Row = ({ label, value, tone }) => (
  <div className="flex items-center justify-between border-b border-neutral-100 py-1.5 text-[9px] last:border-0">
    <span className="text-neutral-500">{label}</span>
    <span className={`font-medium ${tone === 'bad' ? 'text-red-600' : 'text-neutral-900'}`}>{value}</span>
  </div>
);

const EmptyState = ({ icon: Icon, text }) => (
  <div className="py-12 text-center">
    <Icon size={24} className="mx-auto text-neutral-300" />
    <p className="mt-2 text-[9px] text-neutral-500">{text}</p>
  </div>
);
