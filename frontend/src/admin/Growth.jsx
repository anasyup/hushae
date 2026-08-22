import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnIcon, EditorialEmpty, TableSkeleton } from './orders/orderUi';

export default function Growth() {
  const { auth } = useApp();
  const [subs, setSubs] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = () => api('/admin/subscribers', { token: auth.token })
    .then((d) => setSubs(d.subscribers))
    .catch(() => setSubs([]));

  /* Same latent crash as /admin/discounts had: passing `load` straight to
     useEffect makes React treat the returned Promise as the cleanup function
     and call it on the next run — "TypeError: n is not a function", which
     blanks the page. The arrow body drops the return value, and keying on
     auth.token (a string) stops the effect re-running whenever an unrelated
     field on the user object is refreshed. */
  useEffect(() => { load(); }, [auth?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(subs.map((s) => s.email).join('\n'));
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  const remove = async (s) => { if (!window.confirm(`Remove ${s.email}?`)) return; try { await api(`/admin/subscribers/${s._id}`, { method: 'DELETE', token: auth.token }); load(); } catch {} };

  return (
    <AdminLayout title="Growth">
      <PageHeader
        title="Growth"
        description="Emails collected from the footer newsletter form."
        actions={(
          <button type="button" onClick={copyAll} disabled={!subs || !subs.length} className={btnGhost}>
            <Copy size={12} /> {copied ? 'Copied' : 'Copy all'}
          </button>
        )}
      />

      <section className="mb-10">
        <p className="adm-index">01 — List</p>
        <div className="border-y border-white/10 px-5 py-6">
          <p className="adm-label">Email subscribers</p>
          <p className="adm-metric mt-3 text-[32px] leading-none text-white">{subs ? subs.length : '—'}</p>
          <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-white/35">
            Copy the list and send your own sale announcements and coupon codes — the cheapest marketing you have.
          </p>
        </div>
      </section>

      <section>
        <p className="adm-index">02 — Subscribers</p>
        {!subs ? (
          <TableSkeleton rows={6} />
        ) : subs.length === 0 ? (
          <EditorialEmpty
            title="No subscribers yet"
            description="Abhi koi subscriber nahi — footer ka newsletter form live hai, jaisa hi koi email dega wo yahan aayega."
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="hidden border-b border-white/10 py-2 md:grid md:grid-cols-[3rem_minmax(0,1.6fr)_0.8fr_3rem] md:gap-3">
              {['#', 'Email', 'Subscribed', ''].map((h) => <p key={h || 'a'} className="adm-label">{h}</p>)}
            </div>
            {subs.map((s, i) => (
              <div key={s._id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/5 py-3 md:grid-cols-[3rem_minmax(0,1.6fr)_0.8fr_3rem] adm-row-hover">
                <span className="text-[11px] tabular-nums text-white/30">{String(i + 1).padStart(2, '0')}</span>
                <span className="truncate text-[13px] text-white">{s.email}</span>
                <span className="hidden text-[12px] text-white/40 md:block">{fmtDate(s.createdAt)}</span>
                <button type="button" onClick={() => remove(s)} className={btnIcon} aria-label={`Remove ${s.email}`}>×</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
