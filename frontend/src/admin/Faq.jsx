import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnIcon, btnSolid, ctl, EditorialEmpty, TableSkeleton } from './orders/orderUi';

export default function AdminFaq() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/settings').then((d) => setS(d.settings)).catch(() => toast('Could not load settings')); }, []); // eslint-disable-line

  if (!s) {
    return (
      <AdminLayout title="FAQ">
        <PageHeader title="FAQ" description="Questions shown on the public /faq page." />
        <TableSkeleton rows={5} />
      </AdminLayout>
    );
  }

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
      <PageHeader
        title="FAQ"
        description="Questions and answers shown on the public /faq page."
        actions={(
          <>
            <a href="/faq" target="_blank" rel="noreferrer" className={btnGhost}>View /faq</a>
            <button type="button" onClick={save} disabled={busy} className={btnSolid}>{busy ? 'Saving…' : 'Save FAQ'}</button>
          </>
        )}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Page</p>
        <div className="flex items-start justify-between gap-4 border-y border-white/10 py-6">
          <div>
            <p className="text-[13px] text-white">FAQ page live</p>
            <p className="mt-1 text-[12px] text-white/35">Also picked up by Google as rich snippets.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={faq.enabled !== false}
            onClick={() => setFaq('enabled', faq.enabled === false)}
            className={`relative h-5 w-9 shrink-0 rounded-full ${faq.enabled !== false ? 'bg-white' : 'bg-white/20'}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${faq.enabled !== false ? 'left-[18px] bg-black' : 'left-0.5 bg-white'}`} />
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="adm-label mb-1.5 block">Main heading</label>
            <input className={ctl} value={faq.heading || ''} onChange={(e) => setFaq('heading', e.target.value)} placeholder="Frequently Asked Questions" />
          </div>
          <div>
            <label className="adm-label mb-1.5 block">Sub-heading (optional)</label>
            <input className={ctl} value={faq.subheading || ''} onChange={(e) => setFaq('subheading', e.target.value)} placeholder="Sizing, shipping, returns…" />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="adm-index mb-0">02 — Questions</p>
          <button type="button" onClick={addItem} className={btnGhost}><Plus size={12} /> Add question</button>
        </div>
        {(faq.items || []).length === 0 ? (
          <EditorialEmpty
            title="No questions yet"
            description="Click Add question to start. Tip: 5–8 focused questions works best for Google FAQ rich results."
          />
        ) : (
          <div className="space-y-6">
            {(faq.items || []).map((it, i) => (
              <div key={i} className="border-y border-white/10 py-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="adm-label">Question {String(i + 1).padStart(2, '0')}</p>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={btnIcon} aria-label="Move up">↑</button>
                    <button type="button" onClick={() => move(i, +1)} disabled={i === (faq.items || []).length - 1} className={btnIcon} aria-label="Move down">↓</button>
                    <button type="button" onClick={() => delItem(i)} className={btnIcon} aria-label="Delete FAQ">×</button>
                  </div>
                </div>
                <input
                  className={`${ctl} mb-3`}
                  placeholder="Question — e.g. How do I choose the right size?"
                  value={it.question || ''}
                  onChange={(e) => setItem(i, 'question', e.target.value)}
                />
                <textarea
                  className={`${ctl} min-h-24 py-2`}
                  placeholder="Answer — line breaks are supported."
                  value={it.answer || ''}
                  onChange={(e) => setItem(i, 'answer', e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
