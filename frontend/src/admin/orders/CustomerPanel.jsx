import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { fmtDate, pkr } from '../../lib/format';
import { STAGE_MAP } from './orderConstants';
import { btnIcon, MonoStatus } from './orderUi';

/* ===========================================================================
 * Customer 360 — editorial side panel. Data + endpoints unchanged.
 * ========================================================================== */

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'orders', label: 'Orders' },
  { key: 'issues', label: 'Issues' },
  { key: 'notes', label: 'Notes' },
];

export default function CustomerPanel({ phone, token, onClose }) {
  const [data, setData] = useState(null);
  const [customer360, setCustomer360] = useState(null);
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

  // Preserve the existing phone-keyed dossier, but surface the persistent-ID
  // Customer 360 record whenever one is available. We never auto-merge a
  // guest into an account here.
  useEffect(() => {
    let alive = true;
    setCustomer360(null);
    api(`/customers/search?q=${encodeURIComponent(phone)}&limit=8`, { token })
      .then((result) => {
        const digits = String(phone || '').replace(/\D/g, '').slice(-9);
        const match = (result.customers || []).find((customer) => String(customer.phone || '').replace(/\D/g, '').slice(-9) === digits);
        if (alive) setCustomer360(match || null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [phone, token]);

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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose} role="dialog" aria-modal="true">
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col border-l border-[#EAEAEA] bg-[#0A0A0A] sm:max-w-lg"
      >
        <div className="shrink-0 border-b border-[#EAEAEA] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {!c ? <div className="h-5 w-32 animate-pulse bg-[#F5F5F5]" /> : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-[16px] font-medium text-black">{c.name || 'Customer'}</h2>
                    {c.isRepeat && (
                      <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-[#777777]">Repeat</span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-[#999999]">
                    {c.phone}{c.city ? ` · ${c.city}` : ''}
                  </p>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {c && (
                <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp" className={btnIcon}>
                  WA
                </a>
              )}
              {customer360 && (
                <Link to={`/admin/customers/${customer360.id}`} onClick={onClose} title="Open Customer 360" className={btnIcon}>
                  360
                </Link>
              )}
              <button onClick={onClose} aria-label="Close" className={btnIcon}>
                <X size={15} />
              </button>
            </div>
          </div>

          {c && (
            <div className="adm-divide-x mt-5 grid grid-cols-3 border-y border-[#EAEAEA]">
              <Stat label="Orders" value={c.totalOrders} />
              <Stat label="Spent" value={pkr(c.totalSpent)} />
              <Stat label="Avg order" value={pkr(c.averageOrder)} />
            </div>
          )}
        </div>

        {c && (
          <div className="flex shrink-0 gap-4 border-b border-[#EAEAEA] px-5">
            {TABS.map((t) => {
              const n = t.key === 'orders' ? data.orders.length
                : t.key === 'issues' ? data.issues.length
                  : t.key === 'notes' ? data.notes.length : null;
              return (
                <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={tab === t.key}
                  className={`py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${
                    tab === t.key ? 'border-b border-white text-black' : 'border-b border-transparent text-[#AAAAAA] hover:text-[#555555]'
                  }`}>
                  {t.label}{n ? <span className="ml-1 text-[#999999]">{n}</span> : null}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {err && <p className="border border-[#EAEAEA] px-3 py-3 text-[13px] text-[#555555]">{err}</p>}
          {!data && !err && (
            <div className="grid h-40 place-items-center"><Loader2 size={18} className="animate-spin text-[#AAAAAA]" /></div>
          )}

          {data && tab === 'overview' && (
            <div className="space-y-8">
              <Section title="Summary">
                <Row label="First order" value={fmtDate(c.firstOrderAt)} />
                <Row label="Last order" value={fmtDate(c.lastOrderAt)} />
                <Row label="Preferred payment" value={c.preferredMethod || '—'} />
                <Row label="Cancelled" value={c.cancelled} />
                <Row label="Open issues" value={c.openIssues} />
              </Section>

              <Section title={`Delivery addresses (${data.addresses.length})`}>
                {data.addresses.map((a, i) => (
                  <p key={i} className="border-b border-[#F0F0F0] py-2 text-[12px] leading-snug text-[#555555] last:border-0">
                    {a.line}{a.postalCode ? ` – ${a.postalCode}` : ''}
                  </p>
                ))}
              </Section>

              {data.favourites.length > 0 && (
                <Section title="Most ordered">
                  {data.favourites.map((f) => (
                    <div key={f.name} className="flex items-center gap-2 border-b border-[#F0F0F0] py-2 last:border-0">
                      {f.image ? <img src={f.image} alt="" className="h-8 w-6 object-cover" /> : <span className="h-8 w-6 bg-[#F5F5F5]" />}
                      <span className="min-w-0 flex-1 truncate text-[12px] text-white/75">{f.name}</span>
                      <span className="shrink-0 text-[12px] tabular-nums text-black">×{f.units}</span>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}

          {data && tab === 'orders' && (
            <div className="divide-y divide-white/10">
              {data.orders.map((ord) => (
                <Link key={ord._id} to={`/admin/orders/${ord._id}`} onClick={onClose}
                  className="flex items-center gap-3 py-3 transition hover:bg-[#FAFAFA]">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[12px] text-black">{ord.orderNumber}</p>
                    <p className="mt-0.5 text-[11px] text-[#AAAAAA]">
                      {fmtDate(ord.createdAt)} · {ord.itemCount} item{ord.itemCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <MonoStatus label={String(STAGE_MAP[ord.stage]?.label || ord.status || '').toUpperCase()} />
                  <span className="w-20 shrink-0 text-right text-[12px] tabular-nums text-black">{pkr(ord.total)}</span>
                </Link>
              ))}
            </div>
          )}

          {data && tab === 'issues' && (
            data.issues.length === 0
              ? <EmptyState text="No issues ever raised for this customer" />
              : (
                <div className="divide-y divide-white/10">
                  {data.issues.map((i) => (
                    <div key={i._id} className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-black">{i.issueType}</span>
                        <span className="ml-auto text-[9px] uppercase tracking-[0.14em] text-[#999999]">{i.status}</span>
                      </div>
                      {i.description && <p className="mt-1.5 text-[12px] text-[#777777]">{i.description}</p>}
                      <p className="mt-1.5 font-mono text-[11px] text-[#AAAAAA]">{i.orderNumber} · {fmtDate(i.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )
          )}

          {data && tab === 'notes' && (
            data.notes.length === 0
              ? <EmptyState text="No internal notes yet" />
              : (
                <div className="divide-y divide-white/10">
                  {data.notes.map((n, i) => (
                    <div key={i} className="py-3">
                      <p className="text-[12px] text-[#333333]">{n.body}</p>
                      <p className="mt-1 font-mono text-[11px] text-[#AAAAAA]">
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
  <div className="px-3 py-3">
    <p className="adm-label">{label}</p>
    <p className="adm-metric mt-1 text-[15px] text-black">{value}</p>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <p className="adm-label mb-2">{title}</p>
    <div className="border-t border-[#EAEAEA]">{children}</div>
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between border-b border-[#F0F0F0] py-2 text-[12px] last:border-0">
    <span className="text-[#999999]">{label}</span>
    <span className="font-medium text-black">{value}</span>
  </div>
);

const EmptyState = ({ text }) => (
  <div className="py-14 text-center">
    <p className="text-[12px] text-[#999999]">{text}</p>
  </div>
);
