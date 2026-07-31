import { useEffect, useState } from 'react';
import { Copy, Mail, Trash2, Users } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate } from '../lib/format';
import AdminLayout from './AdminLayout';

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
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <Users size={18} className="text-ash" />
          <p className="mt-3 font-sans text-3xl">{subs ? subs.length : '—'}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ash">Email Subscribers</p>
        </div>
        <div className="card p-5 md:col-span-2">
          <h2 className="font-sans text-lg">Newsletter list</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ash">
            Emails collected from the footer newsletter form appear here. Copy the list and
            send your own sale announcements and coupon codes — the cheapest marketing you have.
          </p>
          <button onClick={copyAll} disabled={!subs || !subs.length} className="btn-outline mt-4"><Copy size={14} /> {copied ? 'Copied!' : 'Copy All Emails'}</button>
        </div>
      </div>

      <div className="card mt-6 overflow-x-auto">
        {!subs ? <div className="skeleton m-6 h-40" /> : subs.length === 0 ? (
          <div className="p-14 text-center">
            <Mail size={36} className="mx-auto text-ash" />
            <p className="mt-3 text-sm text-ash">Abhi koi subscriber nahi — footer ka newsletter form live hai, jaisa hi koi email dega wo yahan aayega.</p>
          </div>
        ) : (
          <table className="w-full min-w-[560px]">
            <thead><tr className="border-b border-line bg-satin/30">
              {['#', 'Email', 'Subscribed On', ''].map((h) => <th key={h} className="table-head">{h}</th>)}
            </tr></thead>
            <tbody>
              {subs.map((s, i) => (
                <tr key={s._id} className="border-b border-line/60 transition hover:bg-satin/20">
                  <td className="table-cell text-ash">{i + 1}</td>
                  <td className="table-cell font-medium">{s.email}</td>
                  <td className="table-cell text-ash">{fmtDate(s.createdAt)}</td>
                  <td className="table-cell text-right"><button onClick={() => remove(s)} className="rounded-lg p-2 text-ash hover:bg-red-50 hover:text-red-700"><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
