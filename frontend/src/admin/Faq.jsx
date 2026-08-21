import { useEffect, useState } from 'react';
import { HelpCircle, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';

/**
 * Admin — FAQ manager.
 * Lifted out of the Content page (which was getting crowded) into its own
 * standalone route at /admin/faq. Same underlying data model — writes to
 * settings.faq — but a much calmer, focused editor.
 */
export default function AdminFaq() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/settings').then((d) => setS(d.settings)).catch(() => toast('Could not load settings')); }, []); // eslint-disable-line

  if (!s) return <AdminLayout title="FAQ"><div className="animate-pulse rounded-xl bg-neutral-100 h-64 w-full" /></AdminLayout>;

  const faq = s.faq || { enabled: true, heading: 'Frequently Asked Questions', subheading: '', items: [] };
  const setFaq = (k, v) => setS({ ...s, faq: { ...faq, [k]: v } });
  const setItem = (i, k, v) => setFaq('items', (faq.items || []).map((x, j) => j === i ? { ...x, [k]: v } : x));
  const addItem = () => setFaq('items', [...(faq.items || []), { question: '', answer: '' }]);
  const delItem = (i) => setFaq('items', (faq.items || []).filter((_, j) => j !== i));
  const move = (i, dir) => {
    const arr = [...(faq.items || [])];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setFaq('items', arr);
  };

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', {
        method: 'PUT', token: auth.token,
        body: {
          faq: {
            ...faq,
            items: (faq.items || [])
              .map((it) => ({ question: String(it.question || '').trim(), answer: String(it.answer || '').trim() }))
              .filter((it) => it.question && it.answer),
          },
        },
      });
      toast('FAQ saved — live on /faq');
    } catch (ex) { toast(ex.message || 'Could not save'); }
    setBusy(false);
  };

  return (
    <AdminLayout title="FAQ">
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-neutral-900 text-white">
            <HelpCircle size={22} />
          </span>
          <div className="flex-1">
            <h1 className="font-sans text-2xl font-semibold text-neutral-900">FAQ</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Questions and answers shown on the public <a href="/faq" target="_blank" rel="noreferrer" className="font-semibold text-neutral-900 underline">/faq</a> page.
              These are also picked up by Google as rich snippets (SEO benefit).
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={faq.enabled !== false}
              onChange={(e) => setFaq('enabled', e.target.checked)}
            />
            <span className="text-xs font-semibold text-neutral-600">FAQ page live</span>
            <div className="relative h-6 w-11 rounded-full bg-neutral-100 transition peer-checked:bg-emerald-50 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
          </label>
        </div>
      </div>

      {/* Page heading */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="font-sans text-base font-semibold text-neutral-900">Page headings</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Main heading</label>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900"
              value={faq.heading || ''}
              onChange={(e) => setFaq('heading', e.target.value)}
              placeholder="Frequently Asked Questions"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Sub-heading (optional)</label>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900"
              value={faq.subheading || ''}
              onChange={(e) => setFaq('subheading', e.target.value)}
              placeholder="Sizing, shipping, returns…"
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-base font-semibold text-neutral-900">Questions</h2>
          <button onClick={addItem} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black">
            <Plus size={13} /> Add question
          </button>
        </div>

        {(faq.items || []).length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
            <p className="text-sm text-neutral-500">No questions yet — click <b>Add question</b> to start.</p>
            <p className="mt-1 text-xs text-neutral-400">Tip: 5–8 focused questions works best for Google FAQ rich results.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {(faq.items || []).map((it, i) => (
              <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-400">Question {i + 1}</p>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                      className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30"
                      aria-label="Move up"><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => move(i, +1)} disabled={i === (faq.items || []).length - 1}
                      className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30"
                      aria-label="Move down"><ArrowDown size={14} /></button>
                    <button type="button" onClick={() => delItem(i)}
                      className="rounded-full p-1.5 text-red-500 hover:bg-red-50"
                      aria-label="Delete FAQ"><Trash2 size={14} /></button>
                  </div>
                </div>
                <input
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 mb-2 font-semibold"
                  placeholder="Question — e.g. How do I choose the right size?"
                  value={it.question || ''}
                  onChange={(e) => setItem(i, 'question', e.target.value)}
                />
                <textarea
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 min-h-24"
                  placeholder="Answer — line breaks are supported."
                  value={it.answer || ''}
                  onChange={(e) => setItem(i, 'answer', e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-end">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-full bg-neutral-900 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-black disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save FAQ'}
        </button>
      </div>
    </div>
    </AdminLayout>
  );
}
