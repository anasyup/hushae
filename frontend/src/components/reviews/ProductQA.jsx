import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Flag, MessageCircleQuestion, Search, ThumbsUp } from 'lucide-react';
import { api } from '../../api/client';
import { useApp } from '../../store/AppContext';
import { reviewsConfig, reviewDate } from '../../lib/reviewsConfig';
import FloatField from '../../pages/checkout/FloatField';
import Spinner from '../ui/Spinner';

/* ============================================================================
 * QUESTIONS & ANSWERS
 *
 * Sits under the reviews on the product page. Everything is gated on
 * settings.reviews (the same block reviews use — a question is part of the
 * same product-feedback surface, and two blocks would drift apart).
 *
 * Search is server-side and debounced. Filtering a page of five questions in
 * the browser would look fine on this catalogue and quietly lie the moment a
 * product collects more than one page.
 *
 * The ask form is inline, not a modal: a question is one short sentence, and
 * making someone open a dialog for it loses more questions than it gains.
 * ========================================================================== */
export default function ProductQA({ product }) {
  const { settings, auth, toast } = useApp();
  const cfg = useMemo(() => reviewsConfig(settings), [settings]);

  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [asking, setAsking] = useState(false);
  const searchId = useId();

  const pid = product?._id;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback((p, append = false) => {
    const q = new URLSearchParams({ page: String(p), limit: '5' });
    if (debounced) q.set('q', debounced);
    return api(`/questions/product/${pid}?${q}`)
      .then((d) => {
        setData(d);
        setRows((prev) => (append ? [...prev, ...(d.questions || [])] : d.questions || []));
        setPage(p);
      })
      .catch(() => { if (!append) { setData({ questions: [], total: 0 }); setRows([]); } });
  }, [pid, debounced]);

  useEffect(() => {
    if (!pid || !cfg.enableQA) return;
    load(1, false);
  }, [pid, cfg.enableQA, load]);

  if (!pid || !cfg.enableQA) return null;

  const total = data?.total ?? 0;

  return (
    <section className="container-page mt-14 border-t border-line pt-10" aria-labelledby="qa-h">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-label uppercase tracking-widest text-sagedeep">Ask us anything</p>
          <h2 id="qa-h" className="mt-1.5 font-display text-h2">
            {cfg.qaTitle} {total > 0 && <span className="text-ash">({total})</span>}
          </h2>
        </div>
        <button type="button" onClick={() => setAsking((v) => !v)} aria-expanded={asking} className="btn-outline">
          {asking ? 'Cancel' : 'Ask a question'}
        </button>
      </div>

      {asking && (
        <AskForm
          product={product} cfg={cfg} auth={auth} toast={toast}
          onDone={() => { setAsking(false); load(1, false); }}
        />
      )}

      {total > 0 && (
        <div className="search-wrap relative mt-6 max-w-sm">
          <label className="sr-only" htmlFor={searchId}>Search questions</label>
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" aria-hidden="true" />
          <input
            id={searchId} value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions"
            className="input input-sm min-h-[44px] w-full pl-10"
          />
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {debounced ? `${total} questions match ${debounced}` : `${total} questions`}
      </p>

      {rows.length === 0 ? (
        <p className="py-10 text-body-sm text-ash">
          {debounced ? 'No questions match that search.' : cfg.qaEmptyText}
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-line border-t border-line">
          {rows.map((q) => <QuestionRow key={q._id} q={q} cfg={cfg} auth={auth} onAnswered={() => load(1, false)} />)}
        </ul>
      )}

      {data?.hasMore && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={async () => { setLoadingMore(true); await load(page + 1, true); setLoadingMore(false); }}
            disabled={loadingMore}
            className="btn-outline gap-2 disabled:opacity-50"
          >
            {loadingMore ? <><Spinner label="Loading" /> Loading…</> : 'Show more questions'}
          </button>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------- */
function AskForm({ product, cfg, auth, toast, onDone }) {
  const [body, setBody] = useState('');
  const [name, setName] = useState(auth?.user?.name || '');
  const [email, setEmail] = useState(auth?.user?.email || '');
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const ref = useRef(null);

  useEffect(() => { ref.current?.querySelector('textarea')?.focus(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (body.trim().length < 10) e2.body = 'Please write at least 10 characters';
    if (name.trim().length < 2) e2.customerName = 'Please enter your name';
    setErrs(e2);
    if (Object.keys(e2).length) {
      requestAnimationFrame(() => ref.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true);
    try {
      const r = await api('/questions', {
        method: 'POST', token: auth?.token,
        body: { productId: product._id, body: body.trim(), customerName: name.trim(), customerEmail: email.trim() },
      });
      setDone(r.message || 'Thank you.');
      toast('Question sent');
      setTimeout(onDone, 1800);
    } catch (ex) {
      if (ex?.raw?.field) setErrs({ [ex.raw.field]: ex.message });
      else setErrs({ body: ex.message || 'Could not send your question' });
    }
    setBusy(false);
  };

  if (done) {
    return (
      <p role="status" className="mt-5 flex items-start gap-2.5 rounded-card border border-sage/50 bg-sage/10 px-4 py-3.5 text-body-sm text-sagedark">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{done}
      </p>
    );
  }

  return (
    <form ref={ref} onSubmit={submit} className="mt-5 rounded-card border border-line bg-cream/30 p-4 md:p-5" noValidate>
      <div className="space-y-4">
        <FloatField
          as="textarea" label="Your question" required rows={3}
          value={body} onChange={(v) => { setBody(v); setErrs((x) => ({ ...x, body: '' })); }}
          error={errs.body}
          hint={!errs.body ? 'Fit, fabric, care — anything you need to know.' : ''}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FloatField
            label="Your name" required autoComplete="name"
            value={name} onChange={(v) => { setName(v); setErrs((x) => ({ ...x, customerName: '' })); }}
            error={errs.customerName}
          />
          <FloatField
            label="Email (optional)" type="email" autoComplete="email"
            value={email} onChange={setEmail} hint="So we can let you know when we answer."
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="btn-primary gap-2 disabled:opacity-50">
          {busy ? <><Spinner label="Sending" /> Sending…</> : 'Send question'}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------------- */
function QuestionRow({ q, cfg, auth, onAnswered }) {
  const [helpful, setHelpful] = useState(q.helpful || 0);
  const [voted, setVoted] = useState(false);
  const [reported, setReported] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [answer, setAnswer] = useState('');
  const [aName, setAName] = useState(auth?.user?.name || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const panelId = useId();

  const vote = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api(`/questions/${q._id}/helpful`, { method: 'POST' });
      if (typeof r.helpful === 'number') setHelpful(r.helpful);
      setVoted(!!r.voted);
    } catch { /* the count simply does not move */ }
    setBusy(false);
  };

  const report = async () => {
    if (reported) return;
    try { await api(`/questions/${q._id}/report`, { method: 'POST' }); setReported(true); } catch { /* noop */ }
  };

  const sendAnswer = async (e) => {
    e.preventDefault();
    setErr('');
    if (answer.trim().length < 5) { setErr('Please write a little more'); return; }
    if (aName.trim().length < 2) { setErr('Please enter your name'); return; }
    setBusy(true);
    try {
      const r = await api(`/questions/${q._id}/answer`, {
        method: 'POST', token: auth?.token,
        body: { body: answer.trim(), authorName: aName.trim() },
      });
      setMsg(r.message || 'Thank you.');
      setAnswer(''); setAnswering(false);
      onAnswered();
    } catch (ex) { setErr(ex.message || 'Could not send your answer'); }
    setBusy(false);
  };

  return (
    <li className="py-6">
      <div className="flex gap-3">
        <span aria-hidden="true" className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cream text-graphite">
          <MessageCircleQuestion size={15} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium leading-snug">{q.body}</p>
          <p className="mt-1 text-caption text-ash">
            {q.customerName} · {reviewDate(q.createdAt)}
          </p>
        </div>
      </div>

      {(q.answers || []).length > 0 && (
        <ul className="mt-3 space-y-3 pl-10">
          {q.answers.map((a) => (
            <li
              key={a._id}
              className={`rounded-card px-4 py-3 ${a.isMerchant ? 'border-l-2 border-sagedeep bg-cream/50' : 'bg-satin/30'}`}
            >
              {a.isMerchant && (
                <p className="text-caption font-semibold uppercase tracking-wider text-sagedark">HUSHAE answered</p>
              )}
              <p className={`text-body-sm leading-relaxed ${a.isMerchant ? 'mt-1' : ''}`}>{a.body}</p>
              {!a.isMerchant && <p className="mt-1 text-caption text-ash">{a.authorName}</p>}
            </li>
          ))}
        </ul>
      )}

      {msg && <p role="status" className="mt-2 pl-10 text-caption font-medium text-sagedark">{msg}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-1 pl-10">
        {cfg.allowHelpful && (
          <button
            type="button" onClick={vote} disabled={busy} aria-pressed={voted}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-caption transition ${
              voted ? 'bg-obsidian/[0.06] font-semibold text-obsidian' : 'text-ash hover:text-obsidian'
            }`}
          >
            <ThumbsUp size={13} aria-hidden="true" /> Helpful{helpful > 0 ? ` (${helpful})` : ''}
          </button>
        )}
        <button
          type="button" onClick={() => setAnswering((v) => !v)}
          aria-expanded={answering} aria-controls={panelId}
          className="inline-flex min-h-[44px] items-center rounded-full px-3 text-caption text-ash transition hover:text-obsidian"
        >
          {answering ? 'Cancel' : 'Answer this'}
        </button>
        {cfg.allowReport && (
          <button
            type="button" onClick={report} disabled={reported}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-caption text-ash transition hover:text-obsidian disabled:opacity-60"
          >
            <Flag size={12} aria-hidden="true" /> {reported ? 'Reported' : 'Report'}
          </button>
        )}
      </div>

      <div id={panelId} hidden={!answering}>
        {answering && (
          <form onSubmit={sendAnswer} className="ml-10 mt-3 rounded-card border border-line bg-white/60 p-3.5" noValidate>
            {err && (
              <p role="alert" className="mb-2 flex items-start gap-1.5 text-caption text-red-700">
                <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />{err}
              </p>
            )}
            <div className="space-y-3">
              <FloatField as="textarea" label="Your answer" rows={2} required value={answer} onChange={(v) => { setAnswer(v); setErr(''); }} />
              <FloatField label="Your name" required autoComplete="name" value={aName} onChange={setAName} />
            </div>
            <button type="submit" disabled={busy} className="btn btn-sm mt-3 gap-2 bg-obsidian text-alabaster disabled:opacity-50">
              {busy ? <><Spinner label="Sending" /> Sending…</> : 'Post answer'}
            </button>
          </form>
        )}
      </div>
    </li>
  );
}
