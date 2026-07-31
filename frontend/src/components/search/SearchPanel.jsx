import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Mic, Search, TrendingUp, X } from 'lucide-react';
import { api } from '../../api/client';
import { pkr } from '../../lib/format';
import {
  searchConfig, getHistory, pushHistory, removeHistory, clearHistory, sessionId, highlight,
} from '../../lib/searchConfig';
import Img from '../Img';

/* ============================================================================
 * SEARCH PANEL — the instant-suggestions dropdown.
 *
 * Built as a WAI-ARIA combobox rather than a styled div, because the pattern
 * has to work for someone who cannot see the list: the input owns the focus,
 * aria-activedescendant announces the highlighted row, and the list is a real
 * listbox with real options. Arrow keys move, Enter opens, Escape closes.
 *
 * Mobile first — 85%+ of this store's orders come from a phone:
 *   · full-screen sheet under md, dropdown above it
 *   · every row is at least 44px tall
 *   · the keyboard opens straight onto the field
 *
 * Nothing is ranked here. The server scores; this renders.
 * ========================================================================== */

export default function SearchPanel({ cfg: cfgProp, open, onClose, anchorRef }) {
  const cfg = searchConfig(cfgProp);
  const nav = useNavigate();
  const listId = useId();
  const inputId = useId();

  const [q, setQ] = useState('');
  const [data, setData] = useState(null);        // { products, categories, terms }
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);      // keyboard cursor
  const [history, setHistory] = useState(() => getHistory(cfg.history.maxItems));
  const [trending, setTrending] = useState([]);

  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const abortRef = useRef(null);
  const seq = useRef(0);

  /* ---- open / close ---------------------------------------------------- */
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) { setQ(''); setData(null); setActive(-1); }
    else setHistory(getHistory(cfg.history.maxItems));
  }, [open, cfg.history.maxItems]);

  // Trending is fetched once, lazily, the first time the panel is opened.
  useEffect(() => {
    if (!open || !cfg.trending.enabled || trending.length) return;
    api('/search/trending').then((d) => setTrending(d.terms || [])).catch(() => {});
  }, [open, cfg.trending.enabled, trending.length]);

  /* ---- debounced fetch --------------------------------------------------
     Every response carries a sequence number. Without it, a slow reply for
     "co" can land after a fast reply for "cotton" and overwrite it — the
     classic autocomplete race. */
  useEffect(() => {
    if (!open) return undefined;
    const term = q.trim();
    if (term.length < cfg.minChars) { setData(null); setLoading(false); return undefined; }

    setLoading(true);
    const mine = ++seq.current;
    const t = setTimeout(() => {
      abortRef.current?.abort?.();
      api(`/search/suggest?q=${encodeURIComponent(term)}`)
        .then((d) => { if (mine === seq.current) { setData(d); setActive(-1); } })
        .catch(() => { if (mine === seq.current) setData(null); })
        .finally(() => { if (mine === seq.current) setLoading(false); });
    }, cfg.debounceMs);

    return () => clearTimeout(t);
  }, [q, open, cfg.minChars, cfg.debounceMs]);

  /* ---- flat list for keyboard navigation --------------------------------
     One array so ArrowDown crosses section boundaries the way a shopper
     expects, instead of getting stuck at the end of "products". */
  const rows = [];
  if (q.trim().length >= cfg.minChars && data) {
    (data.terms || []).forEach((t) => rows.push({ kind: 'term', value: t }));
    (data.products || []).forEach((p) => rows.push({ kind: 'product', value: p }));
    (data.categories || []).forEach((c) => rows.push({ kind: 'category', value: c }));
  } else {
    history.forEach((t) => rows.push({ kind: 'history', value: t }));
    trending.forEach((t) => rows.push({ kind: 'trending', value: t }));
  }

  const go = useCallback((term) => {
    const t = String(term || '').trim();
    if (!t) return;
    setHistory(pushHistory(t, cfg.history.maxItems));
    onClose?.();
    nav(`/search?q=${encodeURIComponent(t)}`);
  }, [nav, onClose, cfg.history.maxItems]);

  const openProduct = useCallback((p, position) => {
    // Fire-and-forget: a click log must never delay the navigation.
    api('/search/click', {
      method: 'POST',
      body: { term: q.trim(), product: p._id, position, sid: sessionId() },
    }).catch(() => {});
    setHistory(pushHistory(q.trim(), cfg.history.maxItems));
    onClose?.();
    nav(`/product/${p.slug}`);
  }, [q, nav, onClose, cfg.history.maxItems]);

  const choose = useCallback((row, i) => {
    if (!row) return;
    if (row.kind === 'product') openProduct(row.value, i + 1);
    else if (row.kind === 'category') { onClose?.(); nav(`/category/${row.value.slug}`); }
    else go(row.value);
  }, [openProduct, go, nav, onClose]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose?.(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (rows.length ? (i + 1) % rows.length : -1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (rows.length ? (i <= 0 ? rows.length - 1 : i - 1) : -1));
      return;
    }
    if (e.key === 'Home' && rows.length) { e.preventDefault(); setActive(0); return; }
    if (e.key === 'End' && rows.length) { e.preventDefault(); setActive(rows.length - 1); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && rows[active]) choose(rows[active], active);
      else go(q);
    }
  };

  // Keep the highlighted row in view when driving from the keyboard.
  useEffect(() => {
    if (active < 0) return;
    panelRef.current?.querySelector(`#${CSS.escape(listId)}-opt-${active}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, listId]);

  if (!open) return null;

  const showEmptyHint = q.trim().length >= cfg.minChars && !loading && data && !rows.length;
  const Mark = ({ text }) => (cfg.suggest.highlightMatch
    ? <>{highlight(text, q).map((p, i) => (p.hit
      ? <mark key={i} className="bg-sage/40 text-obsidian">{p.text}</mark>
      : <span key={i}>{p.text}</span>))}</>
    : text);

  const rowCls = (i) => `flex w-full min-h-[44px] items-center gap-3 px-4 text-left transition-colors ${
    active === i ? 'bg-satin/70' : 'hover:bg-satin/40'}`;

  return (
    <div
      ref={panelRef}
      className="border-t border-line bg-alabaster"
      role="search"
    >
      <div className="mx-auto max-w-3xl px-4 py-3">
        {/* ---- the field ---- */}
        <div className="flex items-center gap-3">
          <Search size={17} strokeWidth={1.6} className="shrink-0 text-ash" aria-hidden="true" />
          <label htmlFor={inputId} className="sr-only">{cfg.placeholder}</label>
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={rows.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            enterKeyHint="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={cfg.placeholder}
            className="min-h-[44px] w-full bg-transparent text-body text-obsidian outline-none placeholder:text-ash/70"
          />
          {cfg.voice.enabled && (
            <button
              type="button"
              aria-label="Search by voice"
              className="btn-icon-sm shrink-0 text-ash hover:text-obsidian"
            >
              <Mic size={16} strokeWidth={1.7} aria-hidden="true" />
            </button>
          )}
          {q && (
            <button
              type="button"
              onClick={() => { setQ(''); inputRef.current?.focus(); }}
              aria-label="Clear search"
              className="btn-icon-sm shrink-0 text-ash hover:text-obsidian"
            >
              <X size={16} strokeWidth={1.7} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn-icon-sm -mr-1.5 hidden shrink-0 text-ash hover:text-obsidian md:grid"
            aria-label="Close search"
          >
            <X size={17} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>

        {/* Screen-reader running commentary. Sighted users see the list; this
            is the equivalent for someone who cannot. */}
        <p aria-live="polite" className="sr-only">
          {loading ? 'Searching…'
            : q.trim().length >= cfg.minChars && data
              ? `${data.total || 0} results. ${rows.length} suggestions.`
              : ''}
        </p>
      </div>

      {/* ---- the list ---- */}
      <div className="max-h-[min(70svh,520px)] overflow-y-auto overscroll-contain border-t border-line/70">
        <ul id={listId} role="listbox" aria-label="Search suggestions" className="mx-auto max-w-3xl py-1.5">
          {rows.map((row, i) => {
            const id = `${listId}-opt-${i}`;
            const selected = active === i;

            if (row.kind === 'product') {
              const p = row.value;
              return (
                <li key={`p-${p._id}`} id={id} role="option" aria-selected={selected}>
                  <button type="button" className={`${rowCls(i)} py-2`} onClick={() => choose(row, i)} tabIndex={-1}>
                    {cfg.suggest.showImages && (
                      <Img src={p.image} alt="" className="h-12 w-9 shrink-0 rounded-control border border-line object-cover" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm font-medium"><Mark text={p.name} /></span>
                      {cfg.suggest.showPrices && (
                        <span className="block text-caption text-ash">
                          {pkr(p.price)}
                          {p.stock === 0 && <span className="ml-2 text-clay">Out of stock</span>}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            }

            if (row.kind === 'category') {
              const c = row.value;
              return (
                <li key={`c-${c.slug}`} id={id} role="option" aria-selected={selected}>
                  <button type="button" className={rowCls(i)} onClick={() => choose(row, i)} tabIndex={-1}>
                    <Search size={15} className="shrink-0 text-ash" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-body-sm">
                      in <span className="font-medium"><Mark text={c.name} /></span>
                    </span>
                    <span className="shrink-0 text-caption text-ash">{c.count}</span>
                  </button>
                </li>
              );
            }

            const isHistory = row.kind === 'history';
            const Icon = isHistory ? Clock : row.kind === 'trending' ? TrendingUp : Search;
            return (
              <li key={`${row.kind}-${row.value}`} id={id} role="option" aria-selected={selected} className="relative">
                <button type="button" className={`${rowCls(i)} ${isHistory ? 'pr-12' : ''}`} onClick={() => choose(row, i)} tabIndex={-1}>
                  <Icon size={15} className="shrink-0 text-ash" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-body-sm">
                    {row.kind === 'term' ? <Mark text={row.value} /> : row.value}
                  </span>
                </button>
                {isHistory && (
                  <button
                    type="button"
                    onClick={() => setHistory(removeHistory(row.value))}
                    aria-label={`Remove ${row.value} from your recent searches`}
                    className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-ash transition hover:text-obsidian"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {/* ---- section labels and empties ---- */}
        {!q.trim() && history.length > 0 && (
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pb-3 pt-1">
            <span className="text-label uppercase tracking-widest text-ash">Recent</span>
            <button
              type="button"
              onClick={() => setHistory(clearHistory())}
              className="min-h-[44px] px-2 text-caption font-semibold text-ash underline-offset-4 hover:text-obsidian hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {showEmptyHint && (
          <div className="mx-auto max-w-3xl px-4 py-6 text-center">
            <p className="text-body-sm">{cfg.noResults.message}</p>
            <button type="button" onClick={() => go(q)} className="btn btn-sm mt-3 border border-stone bg-white text-graphite hover:bg-satin/60">
              See all results for “{q.trim()}”
            </button>
          </div>
        )}

        {loading && !rows.length && (
          <div className="mx-auto max-w-3xl space-y-2 px-4 py-4" aria-hidden="true">
            <div className="skeleton h-12 w-full rounded-control" />
            <div className="skeleton h-12 w-full rounded-control" />
            <div className="skeleton h-12 w-3/4 rounded-control" />
          </div>
        )}

        {q.trim().length >= cfg.minChars && data && data.total > (data.products?.length || 0) && (
          <div className="mx-auto max-w-3xl border-t border-line/70 px-4 py-2">
            <button
              type="button"
              onClick={() => go(q)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 text-body-sm font-semibold text-obsidian underline-offset-4 hover:underline"
            >
              See all {data.total} results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
