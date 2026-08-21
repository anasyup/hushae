import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Clock, GitCompare, History, RotateCcw, User } from 'lucide-react';
import { api } from '../../api/client';
import { useApp } from '../../store/AppContext';
import { Accordion, Empty } from '../ui/Controls';

/* ============================================================================
 * VERSION HISTORY
 *
 * WHY NOT REUSE theme-editor/ui/VersionHistory.tsx
 *   Measured before deciding. That component is 94 lines and every one of them
 *   reads from `useEditor` — the Zustand store the theme editor mounts. It
 *   takes no props for its data: versions, restore and the preview toggle all
 *   come from store selectors. Rendering it here would mean mounting the whole
 *   theme editor store on a page that does not use it, or rewriting it to take
 *   props — which is the same edit either way, except one leaves the theme
 *   editor working and the other risks it.
 *
 *   It also has no diff. The two screens genuinely differ: a theme has ONE
 *   document, so "restore" there is unambiguous. A CMS page has a live copy
 *   and a draft, so restore has to say WHICH it lands in — and the answer is
 *   always the draft.
 *
 *   What IS shared is the thing that matters: the section registry and the
 *   document shape. No rendering code is duplicated.
 *
 * THE ONE RULE THIS SCREEN ENFORCES
 *   Restore lands in the DRAFT, never live. An accidental restore must not
 *   change what a customer is reading mid-sentence. The server enforces it
 *   (routes/cms.js returns restoredAs: 'draft'); this says so before the click
 *   rather than after.
 * ========================================================================== */

const when = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hours ago`;
  if (mins < 10080) return `${Math.round(mins / 1440)} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const exact = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

/* One line of plain English per change. The server sends events, not a patch,
   so this is a lookup rather than a diff renderer. */
function changeLine(c) {
  switch (c.kind) {
    case 'section-added': return { tone: 'add', text: `Added ${c.label}` };
    case 'section-removed': return { tone: 'del', text: `Removed ${c.label}` };
    case 'section-moved': return { tone: 'move', text: `Moved ${c.label} from position ${c.from} to ${c.to}` };
    case 'section-edited': return { tone: 'edit', text: `Changed ${c.label}` };
    case 'section-hidden': return { tone: 'del', text: `Switched off ${c.label}` };
    case 'section-shown': return { tone: 'add', text: `Switched on ${c.label}` };
    case 'section-count': return { tone: 'edit', text: `Section count went from ${c.from} to ${c.to}` };
    case 'body-changed': {
      const grew = c.toChars > c.fromChars;
      const diff = Math.abs(c.toChars - c.fromChars);
      return { tone: 'edit', text: `The writing ${grew ? 'grew' : 'shrank'} by ${diff.toLocaleString('en-PK')} characters (${c.fromLines} → ${c.toLines} lines)` };
    }
    case 'seo-changed': return { tone: 'edit', text: `${c.label}: ${c.from} → ${c.to}` };
    default: return { tone: 'edit', text: c.kind };
  }
}

const TONE = {
  add: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  del: 'border-red-200 bg-red-50 text-red-800',
  move: 'border-sky-200 bg-sky-50 text-sky-900',
  edit: 'border-neutral-200 bg-neutral-50 text-neutral-700',
};

export default function VersionPanel({ pageId, versions, onRestored }) {
  const { auth, toast } = useApp();
  const [openId, setOpenId] = useState(null);
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  /* gotcha 68: block body, never a bare async callback handed to useEffect —
     React would call the returned Promise as a cleanup and blank the page. */
  const loadDiff = useCallback((versionId) => {
    if (!auth?.token || !pageId) return;
    setLoading(true);
    setDiff(null);
    api(`/cms/pages/${pageId}/diff?from=${versionId}&to=current`, { token: auth.token })
      .then((d) => setDiff(d))
      .catch(() => toast('Could not compare those versions'))
      .finally(() => setLoading(false));
  }, [auth?.token, pageId, toast]);

  useEffect(() => {
    if (!openId) { setDiff(null); return; }
    loadDiff(openId);
  }, [openId, loadDiff]);

  const restore = async (v) => {
    const msg = `Bring back "${v.label}"?\n\nIt will be put into your draft, so what customers see right now does not change. You can read it over and then publish when you are ready.`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const r = await api(`/cms/pages/${pageId}/restore/${v._id}`, { method: 'POST', token: auth.token });
      toast('Brought back as a draft — nothing changed for customers');
      onRestored?.(r.page);
      setOpenId(null);
    } catch (e) { toast(e.message || 'Could not restore'); } finally { setBusy(false); }
  };

  const list = versions || [];

  return (
    <Accordion
      title="Earlier versions"
      subtitle={list.length ? `${list.length} saved` : 'A copy is kept every time you publish'}
      badge={list.length ? (
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[13px] font-semibold text-neutral-700 ring-1 ring-neutral-200">
          {list.length}
        </span>
      ) : null}
    >
      {!list.length ? (
        <p className="rounded-lg bg-neutral-50 px-3 py-3 text-[12px] leading-relaxed text-neutral-700">
          Nothing saved yet. Every time you press Publish, a copy of the page is kept here — so you can
          always go back to how it read last month.
        </p>
      ) : (
        <>
          <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-[12px] leading-relaxed text-sky-900">
            Bringing back an old version puts it into your <strong>draft</strong>. What customers are reading
            right now does not change until you press Publish.
          </p>

          {/* Timeline. A left rule with a dot per entry reads as a sequence; a
              plain list of cards reads as a set, and the order is the point. */}
          <ol className="relative space-y-2 border-l border-neutral-200 pl-4">
            {list.map((v, i) => {
              const open = openId === v._id;
              return (
                <li key={v._id} className="relative">
                  <span
                    className={`absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full ring-2 ring-white ${i === 0 ? 'bg-neutral-900' : 'bg-neutral-300'}`}
                    aria-hidden="true"
                  />
                  <div className={`rounded-xl border transition ${open ? 'border-neutral-900' : 'border-neutral-200'} bg-white`}>
                    <div className="p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-neutral-900">
                            {v.label || 'Saved version'}
                            {i === 0 && <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[13px] font-medium text-neutral-700">newest</span>}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-neutral-600">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={10} aria-hidden="true" />
                              <time dateTime={v.createdAt} title={exact(v.createdAt)}>{when(v.createdAt)}</time>
                            </span>
                            {v.createdBy && (
                              <span className="inline-flex items-center gap-1">
                                <User size={10} aria-hidden="true" /> {v.createdBy}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenId(open ? null : v._id)}
                          aria-expanded={open}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                        >
                          <GitCompare size={13} aria-hidden="true" />
                          {open ? 'Hide changes' : 'What changed'}
                        </button>
                        <button
                          type="button" disabled={busy}
                          onClick={() => restore(v)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
                        >
                          <RotateCcw size={13} aria-hidden="true" /> Bring back
                        </button>
                      </div>
                    </div>

                    {open && (
                      <div className="border-t border-neutral-200 p-3">
                        {loading ? (
                          <div className="skeleton h-16 w-full" />
                        ) : !diff ? (
                          <p className="text-[12px] text-neutral-600">Could not load the comparison.</p>
                        ) : !diff.changes?.length ? (
                          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-900">
                            Identical to the page as it stands now — nothing has changed since.
                          </p>
                        ) : (
                          <>
                            <p className="mb-2 flex flex-wrap items-center gap-1.5 text-[12px] font-semibold uppercase tracking-widest text-neutral-600">
                              {diff.from?.label || 'that version'}
                              <ArrowRight size={11} aria-hidden="true" />
                              {diff.to?.label || 'now'}
                            </p>
                            <ul className="space-y-1.5">
                              {diff.changes.map((c, k) => {
                                const line = changeLine(c);
                                return (
                                  <li key={k} className={`rounded-lg border px-2.5 py-1.5 text-[12px] leading-relaxed ${TONE[line.tone]}`}>
                                    {line.text}
                                  </li>
                                );
                              })}
                            </ul>
                            <p className="mt-2 text-[12px] text-neutral-600">
                              {diff.changes.length} change{diff.changes.length === 1 ? '' : 's'} since that version.
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-neutral-600">
            <History size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
            Older copies past your limit are cleared automatically so this list stays readable.
          </p>
        </>
      )}
    </Accordion>
  );
}
