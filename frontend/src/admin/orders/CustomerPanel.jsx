import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { fmtDate, pkr } from '../../lib/format';
import { STAGE_MAP } from './orderConstants';
import s from './adesk.module.css';

/* ===========================================================================
 * Customer 360 — ATELIER side sheet. Data + endpoints unchanged.
 * =========================================================================== */

const cx = (...cls) => cls.filter(Boolean).join('');

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'orders', label: 'Orders' },
  { key: 'issues', label: 'Issues' },
  { key: 'notes', label: 'Notes' },
];

const sheet = {
  display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
  maxWidth: 520, background: 'var(--card)', borderLeft: '1px solid var(--border)',
  animation: 'dropIn .25s ease', margin: '0 0 0 auto', boxShadow: '-20px 0 60px rgba(0,0,0,.15)',
};

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

  // The persistent-ID Customer 360 record is surfaced when one exists; a guest
  // is never auto-merged into an account here.
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
    <div className={s.overlay} onClick={onClose} role="dialog" aria-modal="true"
      style={{ placeItems: 'stretch', padding: 0, justifyContent: 'flex-end' }}>
      <aside onClick={(e) => e.stopPropagation()} style={sheet}>
        <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              {!c ? <div className={s.skell} style={{ height: 16, width: 140 }} /> : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name || 'Customer'}
                    </h2>
                    {c.isRepeat && <span className={cx(s.bdg, s.bGreen)}><span className={s.bdgDot} />Repeat</span>}
                  </div>
                  <p style={{ marginTop: 4, fontSize: 11.5, color: 'var(--muted)' }}>
                    {c.phone}{c.city ? ` · ${c.city}` : ''}
                  </p>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {c && <a href={wa} target="_blank" rel="noreferrer" className={s.btnSm} title="WhatsApp">WA</a>}
              {customer360 && <Link to={`/admin/customers/${customer360.id}`} onClick={onClose} className={s.btnSm} title="Open Customer 360">360</Link>}
              <button type="button" onClick={onClose} aria-label="Close" className={s.iconBtn} style={{ width: 32, height: 32 }}><X size={15} /></button>
            </div>
          </div>

          {c && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, margin: '14px 0 14px' }}>
              <Stat label="Orders" value={c.totalOrders} />
              <Stat label="Spent" value={pkr(c.totalSpent)} />
              <Stat label="Avg order" value={pkr(c.averageOrder)} />
            </div>
          )}
        </div>

        {c && (
          <div style={{ display: 'flex', gap: 6, padding: '0 18px 12px', flexShrink: 0, flexWrap: 'wrap' }}>
            {TABS.map((t) => {
              const n = t.key === 'orders' ? data.orders.length
                : t.key === 'issues' ? data.issues.length
                  : t.key === 'notes' ? data.notes.length : null;
              const on = tab === t.key;
              return (
                <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-pressed={on}
                  className={cx(s.struct, on && s.structOn)} style={{ padding: '5px 10px', fontSize: 10.5 }}>
                  {t.label}{n ? <span className={s.structCount}>{n}</span> : null}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 20px' }}>
          {err && <p className={s.errCard} style={{ padding: '10px 12px' }}>{err}</p>}
          {!data && !err && (
            <div style={{ display: 'grid', placeItems: 'center', height: 160 }}>
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--muted2)' }} />
            </div>
          )}

          {data && tab === 'overview' && (
            <div style={{ display: 'grid', gap: 22 }}>
              <Section title="Summary">
                <Row label="First order" value={fmtDate(c.firstOrderAt)} />
                <Row label="Last order" value={fmtDate(c.lastOrderAt)} />
                <Row label="Preferred payment" value={c.preferredMethod || '—'} />
                <Row label="Cancelled" value={c.cancelled} />
                <Row label="Open issues" value={c.openIssues} />
              </Section>

              <Section title={`Delivery addresses (${data.addresses.length})`}>
                {data.addresses.map((a, i) => (
                  <p key={i} style={{ padding: '7px 0', fontSize: 11.5, color: 'var(--muted)', borderBottom: i === data.addresses.length - 1 ? 0 : '1px solid var(--border-light)' }}>
                    {a.line}{a.postalCode ? ` – ${a.postalCode}` : ''}
                  </p>
                ))}
              </Section>

              {data.favourites.length > 0 && (
                <Section title="Most ordered">
                  {data.favourites.map((f) => (
                    <div key={f.name} className={s.itemRow}>
                      {f.image ? <img src={f.image} alt="" loading="lazy" /> : <span className={s.itemPh} />}
                      <span className={s.itemName}>{f.name}</span>
                      <span className={s.itemQty}>×{f.units}</span>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}

          {data && tab === 'orders' && (
            <div>
              {data.orders.map((ord) => (
                <Link key={ord._id} to={`/admin/orders/${ord._id}`} onClick={onClose}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-light)', color: 'inherit', textDecoration: 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11.5, fontWeight: 600 }}>{ord.orderNumber}</p>
                    <p style={{ fontSize: 10.5, color: 'var(--muted2)', marginTop: 2 }}>
                      {fmtDate(ord.createdAt)} · {ord.itemCount} item{ord.itemCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className={cx(s.bdg, s.bGray)}>{STAGE_MAP[ord.stage]?.label || ord.status || '—'}</span>
                  <span className={s.itemAmt}>{pkr(ord.total)}</span>
                </Link>
              ))}
            </div>
          )}

          {data && tab === 'issues' && (
            data.issues.length === 0
              ? <EmptyState text="No issues ever raised for this customer" />
              : data.issues.map((i) => (
                <div key={i._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{i.issueType}</span>
                    <span className={s.flag} style={{ marginLeft: 'auto' }}>{i.status}</span>
                  </div>
                  {i.description && <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>{i.description}</p>}
                  <p style={{ fontSize: 10.5, color: 'var(--muted2)', marginTop: 5 }}>{i.orderNumber} · {fmtDate(i.createdAt)}</p>
                </div>
              ))
          )}

          {data && tab === 'notes' && (
            data.notes.length === 0
              ? <EmptyState text="No internal notes yet" />
              : data.notes.map((n, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <p style={{ fontSize: 11.5, lineHeight: 1.5 }}>{n.body}</p>
                  <p style={{ fontSize: 10.5, color: 'var(--muted2)', marginTop: 4 }}>
                    {n.orderNumber} · {n.authorName || 'admin'} · {fmtDate(n.at)}
                  </p>
                </div>
              ))
          )}
        </div>
      </aside>
    </div>
  ), document.body);
}

const Stat = ({ label, value }) => (
  <div className={s.ddStat}>
    <b>{value}</b>
    <span>{label}</span>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <p className={s.ctlLabel} style={{ marginBottom: 6 }}>{title}</p>
    <div>{children}</div>
  </div>
);

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '7px 0', fontSize: 11.5, borderBottom: '1px solid var(--border-light)' }}>
    <span style={{ color: 'var(--muted)' }}>{label}</span>
    <span style={{ fontWeight: 600 }}>{value}</span>
  </div>
);

const EmptyState = ({ text }) => (
  <div style={{ padding: '34px 0', textAlign: 'center', fontSize: 11.5, color: 'var(--muted2)' }}>{text}</div>
);
