import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Signpost, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import { Empty, Section, Select, Stat, Text } from './ui/Controls';

/* ============================================================================
 * ADMIN → OLD ADDRESSES (redirects)
 *
 * WHAT THIS IS, IN SHOP TERMS
 *   You move your shop from one street to another. You leave a note on the old
 *   door saying where you went. Without the note every customer who saved the
 *   old address finds an empty room.
 *
 * Renaming a page's web address silently breaks every existing link — a saved
 * WhatsApp message, a Google result, an influencer's bio. The server already
 * writes a 301 automatically on rename (settings.cms.autoRedirectOnRename) and
 * collapses chains so a → b → c resolves in ONE hop. This screen shows those
 * automatic notes alongside any the merchant writes by hand, and counts how
 * many people actually used each one — a note nobody follows is clutter, and
 * clutter is what makes a redirect table rot.
 * ========================================================================== */

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

  /* Client-side guards mirror the server's. The server still decides — this
     only spares a round trip and explains the problem next to the field that
     caused it, rather than in a toast that vanishes. */
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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
            <Signpost size={20} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="font-sans text-2xl leading-tight text-neutral-900">Old addresses</h2>
            <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-neutral-600">
              When a page changes address, anyone with the old link should still arrive. These are the notes
              on the old door. Renaming a page writes one automatically.
            </p>
          </div>
        </div>
        <Link to="/admin/cms" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[9px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
          <ArrowLeft size={13} aria-hidden="true" /> Back to pages
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Notes" value={stats.total} />
        <Stat label="Written automatically" value={stats.auto} sub="from renames" />
        <Stat label="Visitors rescued" value={stats.hits} />
        <Stat label="Never used" value={stats.unused} tone={stats.unused > 20 ? 'warn' : undefined} />
      </div>

      <div className="mb-6">
        <Section
          title="Add a note"
          description="Use this when a link is already out in the world — printed on a card, sent on WhatsApp — and you want it to keep working."
        >
          <form onSubmit={add} className="grid gap-4 md:grid-cols-2">
            <Text
              label="Old address" value={form.from}
              onChange={(v) => setForm({ ...form, from: v })}
              hint="What people type or click now. Example: summer-sale"
              placeholder="summer-sale"
            />
            <Text
              label="Send them to" value={form.to}
              onChange={(v) => setForm({ ...form, to: v })}
              hint="Where they should land. Example: /eid-sale"
              placeholder="/eid-sale"
            />
            <Select
              label="Kind of move" value={form.code}
              onChange={(v) => setForm({ ...form, code: v })}
              options={CODES}
              hint="Moved for good is right almost every time — it tells Google to update its records."
            />
            <Text
              label="Note to yourself (optional)" value={form.note}
              onChange={(v) => setForm({ ...form, note: v })}
              hint="Why this exists, so it still makes sense in six months."
              placeholder="Old campaign link from the July flyer"
            />
            <div className="md:col-span-2">
              {(err || problem) && (
                <p
                  role="alert"
                  className={`mb-3 rounded-lg px-3 py-2 text-[9px] ${blocking || err ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}
                >
                  {err || problem}
                </p>
              )}
              <button
                type="submit" disabled={busy || blocking}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 text-[9px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                <Plus size={13} aria-hidden="true" /> {busy ? 'Saving…' : 'Add note'}
              </button>
            </div>
          </form>
        </Section>
      </div>

      {rows === null ? (
        <div className="animate-pulse rounded-xl bg-neutral-100 h-48 w-full" />
      ) : !rows.length ? (
        <Empty
          title="No notes yet"
          description="Nothing has moved. When you rename a page, a note appears here on its own so the old link keeps working."
        />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r._id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium text-neutral-900">/{r.from}</p>
                    <p className="mt-1 flex items-center gap-1 truncate text-[9px] text-neutral-600">
                      <ArrowRight size={12} aria-hidden="true" /> {r.to}
                    </p>
                  </div>
                  <button
                    type="button" onClick={() => remove(r)}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-red-200 text-red-700 transition hover:bg-red-50"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span className="sr-only">Delete the note for /{r.from}</span>
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[9px] text-neutral-600">
                  <span>{r.code}</span>
                  <span>{r.hits || 0} used</span>
                  {r.auto && <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-800">Automatic</span>}
                </div>
                {r.note && <p className="mt-1.5 text-[9px] text-neutral-600">{r.note}</p>}
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border border-neutral-200 md:block">
            <table className="w-full text-left">
              <caption className="sr-only">Redirects, {rows.length} shown</caption>
              <thead className="bg-neutral-50 text-[9px] uppercase tracking-wider text-neutral-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Old address</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Goes to</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Kind</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Used</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Last used</th>
                  <th scope="col" className="w-16 px-4 py-3 text-right font-semibold">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-[10px]">
                {rows.map((r) => (
                  <tr key={r._id} className="bg-white transition hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-neutral-900">/{r.from}</span>
                      {r.note && <p className="mt-0.5 text-[9px] text-neutral-600">{r.note}</p>}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{r.to}</td>
                    <td className="px-4 py-3">
                      <span className="text-neutral-700">{r.code}</span>
                      {r.auto && (
                        <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 ring-1 ring-sky-200">Automatic</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{r.hits || 0}</td>
                    <td className="px-4 py-3 text-neutral-700">{fmtWhen(r.lastHit)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button" onClick={() => remove(r)}
                        className="inline-grid h-11 w-11 place-items-center rounded-lg border border-red-200 text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        <span className="sr-only">Delete the note for /{r.from}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
