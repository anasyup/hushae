import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Sparkles, X } from 'lucide-react';
import { api } from '../../api/client';
import { pkr } from '../../lib/format';
import Img from '../Img';

/* ============================================================================
 * SHOPPING ASSISTANT
 *
 * A conversation, not a chatbot. Every answer is computed on the server by the
 * same rule engine that powers the search box — no third-party AI service is
 * called, so nothing about a customer leaves the store, there is no per-query
 * cost, and the merchant can edit every occasion and budget band from the
 * admin panel.
 *
 * The one design rule: it always SAYS what it understood. "for women, under
 * PKR 2,000, summer" printed above the results means a wrong answer is
 * visible and correctable, instead of the shopper wondering why they were
 * shown the wrong thing.
 *
 * Mobile first — a bottom sheet under md, a right-hand panel above it.
 * ========================================================================== */

function Bubble({ from, children }) {
  const mine = from === 'user';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-panel px-4 py-2.5 text-body-sm leading-relaxed ${
          mine ? 'bg-obsidian text-alabaster' : 'bg-white text-ink ring-1 ring-line'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function ShoppingAssistant({ cfg, open, onClose }) {
  const titleId = useId();
  const inputId = useId();
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const [turns, setTurns] = useState([]);   // { from, text, products, understood, followUps }
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const a = cfg?.assistant || {};

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  // Escape closes; Tab is trapped. A panel you cannot leave by keyboard is a
  // failure, not a detail.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); return; }
      if (e.key !== 'Tab') return;
      const f = panelRef.current?.querySelectorAll('button, input, a[href], textarea');
      if (!f?.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Keep the newest turn in view.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, busy]);

  const ask = useCallback(async (message) => {
    const msg = String(message || '').trim();
    if (!msg || busy) return;
    setTurns((t) => [...t, { from: 'user', text: msg }]);
    setText('');
    setBusy(true);
    try {
      const r = await api('/discovery/assistant', { method: 'POST', body: { message: msg } });
      setTurns((t) => [...t, {
        from: 'bot', text: r.reply, products: r.products || [],
        understood: r.understood, followUps: r.followUps || [],
      }]);
    } catch (e) {
      setTurns((t) => [...t, { from: 'bot', text: e.message || 'Something went wrong. Please try again.', products: [] }]);
    }
    setBusy(false);
  }, [busy]);

  if (!open || !a.enabled) return null;

  const understoodChips = (u) => {
    if (!u) return [];
    const out = [];
    if (u.gender) out.push(u.gender === 'men' ? 'for men' : 'for women');
    if (u.budget?.max) out.push(`under ${pkr(u.budget.max)}`);
    else if (u.budget?.min) out.push(`over ${pkr(u.budget.min)}`);
    (u.occasions || []).forEach((o) => out.push(o));
    return out;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-stretch md:justify-end"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[88svh] w-full flex-col rounded-t-panel bg-alabaster md:h-full md:max-h-none md:w-[420px] md:rounded-none md:border-l md:border-line"
      >
        {/* ---- header ---- */}
        <div className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-4">
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-obsidian text-alabaster">
            <Sparkles size={16} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate font-display text-h5">{a.title || 'Shopping assistant'}</h2>
          </div>
          {/* min-h/w-11 locally rather than editing .btn-icon-sm, which is
              shared with the whole storefront: measured at 36px here, and 44
              is the floor on a phone. */}
          <button
            type="button" onClick={onClose} aria-label="Close assistant"
            className="btn-icon-sm h-11 w-11 shrink-0 text-ash hover:text-obsidian"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* ---- conversation ---- */}
        <div
          ref={logRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          {!turns.length && (
            <>
              <Bubble from="bot">{a.intro || 'Tell me what you need and I will find it.'}</Bubble>
              {(a.prompts || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {a.prompts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => ask(p.query || p.label)}
                      className="inline-flex min-h-[44px] items-center rounded-full border border-stone bg-white px-4 text-caption font-medium text-graphite transition hover:bg-satin/60"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {turns.map((t, i) => (
            <div key={i} className="space-y-3">
              <Bubble from={t.from}>{t.text}</Bubble>

              {t.from === 'bot' && understoodChips(t.understood).length > 0 && (
                <p className="flex flex-wrap gap-1.5 px-1">
                  {understoodChips(t.understood).map((c) => (
                    <span key={c} className="rounded-full bg-obsidian/5 px-2.5 py-1 text-caption text-obsidian">{c}</span>
                  ))}
                </p>
              )}

              {t.products?.length > 0 && (
                <ul className="space-y-2">
                  {t.products.map((p) => (
                    <li key={p._id}>
                      <Link
                        to={`/product/${p.slug}`}
                        onClick={onClose}
                        className="flex min-h-[44px] items-center gap-3 rounded-card border border-line bg-white p-2.5 transition hover:border-obsidian/30"
                      >
                        <Img src={p.images?.[0]?.url} alt="" className="h-14 w-11 shrink-0 rounded-control border border-line object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body-sm font-medium">{p.name}</span>
                          <span className="block text-caption text-ash">
                            {pkr(p.price)}
                            {p.stock === 0 && <span className="ml-2 text-clay">Out of stock</span>}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {t.followUps?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {t.followUps.map((f) => (
                    <button
                      key={f.label}
                      type="button"
                      onClick={() => ask(f.message)}
                      className="inline-flex min-h-[44px] items-center rounded-full border border-stone bg-white px-4 text-caption font-medium text-graphite transition hover:bg-satin/60"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {busy && (
            <Bubble from="bot">
              <span className="inline-flex items-center gap-2">
                <span className="spinner" aria-hidden="true" /> Looking…
              </span>
            </Bubble>
          )}
        </div>

        {/* ---- composer ---- */}
        <form
          onSubmit={(e) => { e.preventDefault(); ask(text); }}
          className="flex shrink-0 items-end gap-2 border-t border-line bg-alabaster p-4"
        >
          <label htmlFor={inputId} className="sr-only">Tell the assistant what you need</label>
          <input
            id={inputId}
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. a cotton vest under 1500"
            autoComplete="off"
            enterKeyHint="send"
            className="min-h-[44px] min-w-0 flex-1 rounded-control border border-stone bg-white px-4 text-body-sm outline-none focus:border-obsidian"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-obsidian text-alabaster transition hover:bg-graphite disabled:opacity-40"
          >
            <Send size={16} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
