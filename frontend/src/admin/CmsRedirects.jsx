import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { Select, Text } from './ui/Controls';
import { btnGhost, btnSolid, EditorialEmpty, MonoStatus, TableSkeleton } from './orders/orderUi';

const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never');

const CODES = [
  { value: '301', label: 'Moved for good (301)' },
  { value: '302', label: 'Moved for now (302)' },
  { value: '307', label: 'Temporary, keep method (307)' },
  { value: '308', label: 'Permanent, keep method (308)' },
];

export default function CmsRedirects() {
  const { auth, toast } = useApp();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ from: '', to: '', code: '301', note: '' });
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    if (!auth?.token) return;
    api('/cms/redirects', { token: auth.token })
      .then((d) => setRows(d.redirects || []))
      .catch(() => { setRows([]); toast('Could not load redirects'); });
  }, [auth?.token, toast]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const list = rows || [];
    return {
      total: list.length,
      auto: list.filter((r) => r.auto).length,
      hits: list.reduce((s, r) => s + (r.hits || 0), 0),
      unused: list.filter((r) => !r.hits).length,
    };
  }, [rows]);

  const problem = useMemo(() => {
    const from = form.from.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
    const to = form.to.trim();
    if (!from || !to) return '';
    if (`/${from}` === to || from === to.replace(/^\//, '')) return 'A page cannot point at itself.';
    const reverse = (rows || []).find((r) => r.active && r.from === to.replace(/^\//, ''));
    if (reverse && reverse.to.replace(/^\//, '') === from) {
      return 'That would make a loop — the other address already points back here.';
    }
    const existing = (rows || []).find((r) => r.from === from);
    if (existing) return `"/${from}" already points to ${existing.to}. Saving will replace it.`;
    return '';
  }, [form.from, form.to, rows]);

  const blocking = problem && !problem.startsWith('"');

  const add = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.from.trim()) { setErr('Enter the old address'); return; }
    if (!form.to.trim()) { setErr('Enter where it should go'); return; }
    if (blocking) { setErr(problem); return; }
    setBusy(true);
    try {
      await api('/cms/redirects', {
        method: 'POST', token: auth.token,
        body: { from: form.from, to: form.to, code: Number(form.code), note: form.note },
      });
      toast('Saved — the old address now works again');
      setForm({ from: '', to: '', code: '301', note: '' });
      load();
    } catch (e2) {
      setErr(e2.message || 'Could not save');
      toast(e2.message || 'Could not save');
    } finally { setBusy(false); }
  };

  const remove = async (r) => {
    const warn = r.hits > 0
      ? `Delete this note? ${r.hits} visitor${r.hits === 1 ? '' : 's'} still used it. They will see "page not found" instead.`
      : 'Delete this note? Nobody has used it yet.';
    if (!window.confirm(warn)) return;
    try {
      await api(`/cms/redirects/${r._id}`, { method: 'DELETE', token: auth.token });
      toast('Deleted');
      load();
    } catch (e) { toast(e.message || 'Could not delete'); }
  };

  return (
    <AdminLayout title="Old addresses">
      <PageHeader
        title="Redirects"
        description="When a page changes address, anyone with the old link should still arrive."
        actions={<Link to="/admin/cms" className={btnGhost}>Back to pages</Link>}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Overview</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] md:grid-cols-4">
          {[
            { label: 'Notes', value: stats.total },
            { label: 'Automatic', value: stats.auto, sub: 'from renames' },
            { label: 'Visitors rescued', value: stats.hits },
            { label: 'Never used', value: stats.unused },
          ].map((x) => (
            <div key={x.label} className="px-5 py-6">
              <p className="adm-label">{x.label}</p>
              <p className="adm-metric mt-3 text-[26px] text-white">{x.value}</p>
              {x.sub && <p className="mt-1 text-[11px] text-[#AAAAAA]">{x.sub}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">02 — Add a note</p>
        <p className="mb-4 text-[12px] text-[#AAAAAA]">Use this when a link is already out in the world.</p>
        <form onSubmit={add} className="grid gap-4 border-y border-[#EAEAEA] py-6 md:grid-cols-2">
          <Text variant="editorial" label="Old address" value={form.from} onChange={(v) => setForm({ ...form, from: v })} hint="What people type or click now. Example: summer-sale" placeholder="summer-sale" />
          <Text variant="editorial" label="Send them to" value={form.to} onChange={(v) => setForm({ ...form, to: v })} hint="Where they should land. Example: /eid-sale" placeholder="/eid-sale" />
          <Select variant="editorial" label="Kind of move" value={form.code} onChange={(v) => setForm({ ...form, code: v })} options={CODES} hint="Moved for good is right almost every time." />
          <Text variant="editorial" label="Note to yourself (optional)" value={form.note} onChange={(v) => setForm({ ...form, note: v })} hint="Why this exists, so it still makes sense in six months." placeholder="Old campaign link from the July flyer" />
          <div className="md:col-span-2">
            {(err || problem) && (
              <p role="alert" className="mb-3 text-[12px] leading-relaxed text-white/55">{err || problem}</p>
            )}
            <button type="submit" disabled={busy || blocking} className={btnSolid}>
              <Plus size={12} /> {busy ? 'Saving…' : 'Add note'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <p className="adm-index">03 — Directory</p>
        {rows === null ? (
          <TableSkeleton rows={5} />
        ) : !rows.length ? (
          <EditorialEmpty
            title="No notes yet"
            description="Nothing has moved. When you rename a page, a note appears here on its own so the old link keeps working."
          />
        ) : (
          <>
            <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_0.5fr_0.4fr_0.7fr_auto] md:gap-3">
              {['From', 'To', 'Status', 'Used', 'Updated', ''].map((h) => <p key={h || 'a'} className="adm-label">{h}</p>)}
            </div>
            {rows.map((r) => (
              <div key={r._id} className="grid grid-cols-1 gap-1 border-b border-[#F0F0F0] py-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_0.5fr_0.4fr_0.7fr_auto] md:items-center md:gap-3 adm-row-hover">
                <div>
                  <p className="truncate text-[13px] text-white">/{r.from}</p>
                  {r.note && <p className="truncate text-[11px] text-[#AAAAAA]">{r.note}</p>}
                </div>
                <p className="truncate text-[12px] text-[#555555]">{r.to}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] tabular-nums text-[#777777]">{r.code}</span>
                  {r.auto && <MonoStatus label="AUTO" dim />}
                </div>
                <span className="text-[12px] tabular-nums text-[#777777]">{r.hits || 0}</span>
                <span className="text-[12px] text-[#AAAAAA]">{fmtWhen(r.lastHit)}</span>
                <button type="button" onClick={() => remove(r)} className={`${btnGhost} justify-self-start md:justify-self-end`}>
                  Remove
                </button>
              </div>
            ))}
          </>
        )}
      </section>
    </AdminLayout>
  );
}
