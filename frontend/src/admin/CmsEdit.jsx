import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, FileText, Send, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import { Accordion, DateTime, Num, Section, Select, Text, Toggle } from './ui/Controls';
import { EMPTY_PAGE, PAGE_TYPES, STATE_LABEL, STATE_STYLE, hydratePage, typeOf } from './cms/pageTypes';
import { CMS_DEFAULTS, checkSlugLocal, previewTitle, resolveCms } from '../lib/cmsConfig';

/* ============================================================================
 * PAGE EDITOR — create and edit one CMS page.
 *
 * THREE THINGS THIS SCREEN HAS TO GET RIGHT
 *
 * 1. DRAFT VS LIVE. Editing a page that customers are reading right now must
 *    not change what they see mid-sentence. Edits go into `draft`; Publish
 *    promotes the draft and snapshots a version. The banner at the top says
 *    which of the two the merchant is looking at, because guessing is how a
 *    half-finished returns policy ends up on the shop.
 *
 * 2. THE ADDRESS. Renaming a slug breaks every saved link. The server writes a
 *    301 automatically, but the merchant should be TOLD that before they save,
 *    not discover it in the redirect table afterwards.
 *
 * 3. NOTHING PUBLISHES BY ACCIDENT. Create always makes a draft, whatever the
 *    form says — enforced server-side, mirrored here so the button labels
 *    never promise something the API will refuse.
 * ========================================================================== */

const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export default function CmsEdit() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const { auth, toast } = useApp();
  const nav = useNavigate();

  const [p, setP] = useState(isNew ? hydratePage(EMPTY_PAGE) : null);
  const [original, setOriginal] = useState(isNew ? JSON.stringify(hydratePage(EMPTY_PAGE)) : null);
  const [state, setState] = useState(isNew ? { live: false, reason: 'draft' } : null);
  const [cfg, setCfg] = useState(CMS_DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState([]);
  const [scheduleAt, setScheduleAt] = useState(null);
  // The merchant typed a slug by hand — stop deriving it from the title, or
  // every keystroke in the title box silently overwrites their choice.
  const slugTouched = useRef(!isNew);

  /* gotcha 68: the effect body is a BLOCK, not a bare async callback. Handing
     React a function that returns a Promise makes it call the Promise as a
     cleanup — `TypeError: n is not a function`, blank page. Cost two live
     screens in Sprint 2K. */
  useEffect(() => {
    let alive = true;
    api('/settings')
      .then((d) => { if (alive) setCfg(resolveCms(d.settings)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const load = useCallback(() => {
    if (isNew || !auth?.token) return;
    api(`/cms/pages/${id}`, { token: auth.token })
      .then((d) => {
        const merged = hydratePage(d.page);
        setP(merged);
        setOriginal(JSON.stringify(merged));
        setState(d.page.state || { live: false, reason: 'draft' });
      })
      .catch(() => toast('Could not open that page'));
  }, [id, isNew, auth?.token, toast]);

  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(() => original !== null && JSON.stringify(p) !== original, [p, original]);

  /* Warn before losing work. A merchant who spent ten minutes on a returns
     policy and hit Back deserves one question. */
  useEffect(() => {
    if (!dirty) return undefined;
    const onLeave = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  const slugCheck = useMemo(() => (p?.slug ? checkSlugLocal(p.slug, cfg) : { ok: true }), [p?.slug, cfg]);
  const renamed = useMemo(() => {
    if (isNew || !original) return false;
    try { return JSON.parse(original).slug !== p?.slug; } catch { return false; }
  }, [original, p?.slug, isNew]);

  if (!p) return <AdminLayout title="Page"><div className="skeleton h-96 w-full" /></AdminLayout>;

  const t = typeOf(p.type);
  const set = (k, v) => setP({ ...p, [k]: v });

  const setTitle = (v) => {
    // Deriving the address from the title is a convenience, not a rule — the
    // moment the merchant edits the address themselves, stop touching it.
    if (isNew && !slugTouched.current) {
      const auto = checkSlugLocal(v.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'), cfg);
      setP({ ...p, title: v, slug: auto.ok ? auto.slug : p.slug });
    } else {
      setP({ ...p, title: v });
    }
  };

  /* Mirrors the server's validation so the problem shows up before a round
     trip. The server still validates — this is a courtesy, not a boundary. */
  const problems = [];
  if (!String(p.title || '').trim()) problems.push('Give the page a name.');
  if (p.slug && !slugCheck.ok) problems.push(slugCheck.message);
  if (p.publishAt && p.unpublishAt && new Date(p.unpublishAt) <= new Date(p.publishAt)) {
    problems.push('The end date must be after the start date.');
  }
  if (cfg.requireSeoTitle && p.status === 'published' && !String(p.seo?.title || '').trim()) {
    problems.push('Your settings require an SEO title before publishing.');
  }

  const save = async () => {
    if (problems.length) { toast('Fix the problems listed above'); return; }
    setBusy(true); setErrs([]);
    try {
      if (isNew) {
        const r = await api('/cms/pages', { method: 'POST', token: auth.token, body: p });
        toast('Saved as a draft — nobody can see it yet');
        nav(`/admin/cms/${r.page._id}`, { replace: true });
      } else {
        const r = await api(`/cms/pages/${id}`, { method: 'PUT', token: auth.token, body: p });
        const merged = hydratePage(r.page);
        setP(merged);
        setOriginal(JSON.stringify(merged));
        setState(r.page.state || state);
        toast(renamed ? 'Saved — the old address still works' : 'Saved');
      }
    } catch (e) {
      setErrs(e.raw?.errors || [{ message: e.message || 'Could not save' }]);
      toast(e.message || 'Could not save');
    } finally { setBusy(false); }
  };

  const publish = async (when = null) => {
    if (dirty) { toast('Save your changes first'); return; }
    const msg = when
      ? `Schedule this page to go live on ${fmtWhen(when)}?`
      : 'Make this page visible to customers right now?';
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const r = await api(`/cms/pages/${id}/publish`, {
        method: 'POST', token: auth.token,
        body: { publishAt: when, unpublishAt: p.unpublishAt || null },
      });
      const merged = hydratePage(r.page);
      setP(merged); setOriginal(JSON.stringify(merged)); setState(r.page.state);
      toast(when ? 'Scheduled' : 'Live — customers can see it now');
    } catch (e) { toast(e.message || 'Could not publish'); } finally { setBusy(false); }
  };

  const unpublish = async () => {
    if (!window.confirm('Hide this page from customers? Anyone with the link will see "page not found".')) return;
    setBusy(true);
    try {
      const r = await api(`/cms/pages/${id}/unpublish`, { method: 'POST', token: auth.token });
      const merged = hydratePage(r.page);
      setP(merged); setOriginal(JSON.stringify(merged)); setState(r.page.state);
      toast('Hidden — it is a draft again');
    } catch (e) { toast(e.message || 'Could not hide'); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try {
      await api(`/cms/pages/${id}`, { method: 'DELETE', token: auth.token });
      toast('Deleted');
      nav('/admin/cms');
    } catch (e) { toast(e.message || 'Could not delete'); }
  };

  const reason = state?.reason || 'draft';

  return (
    <AdminLayout title={isNew ? 'New page' : p.title || 'Page'}>
      {/* ---- header ---- */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-6">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
            <FileText size={20} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-sans text-2xl leading-tight text-neutral-900">{isNew ? 'New page' : p.title || 'Untitled'}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-neutral-600">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATE_STYLE[reason] || STATE_STYLE.draft}`}>
                {STATE_LABEL[reason] || reason}
              </span>
              {p.slug && <span className="truncate">/{p.slug}</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/cms" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
            <ArrowLeft size={13} aria-hidden="true" /> Pages
          </Link>
          {!isNew && state?.live && (
            <a
              href={`/${p.slug}`} target="_blank" rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              <Eye size={13} aria-hidden="true" /> View
            </a>
          )}
          <button
            type="button" onClick={save} disabled={busy || (!dirty && !isNew)}
            className="min-h-[44px] rounded-lg bg-neutral-900 px-4 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy ? 'Saving…' : isNew ? 'Save draft' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* ---- what the customer sees right now ---- */}
      {!isNew && (
        <div className={`mb-5 rounded-xl border px-4 py-3 text-[13px] ${state?.live ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-neutral-200 bg-neutral-50 text-neutral-700'}`}>
          {reason === 'live' && <>Customers can read this page now{p.hasDraft ? ' — but your newest edits are not published yet.' : '.'}</>}
          {reason === 'draft' && 'Only you can see this. Press Publish when it is ready.'}
          {reason === 'scheduled' && <>Hidden until {fmtWhen(p.publishAt)}. Nobody can reach it before then, even with the link.</>}
          {reason === 'expired' && <>This finished on {fmtWhen(p.unpublishAt)} and is hidden again.</>}
          {reason === 'archived' && 'Archived. Hidden from customers and kept out of your way.'}
        </div>
      )}

      {problems.length > 0 && (
        <ul role="alert" className="mb-5 space-y-1 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
          {problems.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      {errs.length > 0 && (
        <ul role="alert" className="mb-5 space-y-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">
          {errs.map((e, i) => <li key={i}>{e.message}</li>)}
        </ul>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ================= main column ================= */}
        <div className="min-w-0 space-y-5">
          <Section title="The page" description="The name at the top and the web address people type.">
            <div className="space-y-4">
              <Text
                label="Page name" value={p.title} onChange={setTitle}
                hint="Shown as the big heading. Example: Size guide"
                placeholder="Size guide"
              />

              <div>
                <Text
                  label="Web address" value={p.slug}
                  onChange={(v) => { slugTouched.current = true; set('slug', v); }}
                  hint={`People will reach it at hushae.pk/${p.slug || '…'}`}
                  placeholder="size-guide"
                />
                {p.slug && !slugCheck.ok && (
                  <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-700">
                    {slugCheck.message}
                    {slugCheck.suggestion && (
                      <button
                        type="button"
                        onClick={() => { slugTouched.current = true; set('slug', slugCheck.suggestion); }}
                        className="ml-2 underline underline-offset-2"
                      >
                        Use that
                      </button>
                    )}
                  </p>
                )}
                {renamed && slugCheck.ok && (
                  <p className="mt-1.5 rounded-lg bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-900">
                    You changed the address. Anyone using the old link would normally hit a dead end —
                    {cfg.autoRedirectOnRename
                      ? ' we will leave a note that sends them to the new one automatically.'
                      : ' automatic notes are switched off, so add one yourself under Old addresses.'}
                  </p>
                )}
              </div>

              <Select
                label="Kind of page" value={p.type} onChange={(v) => set('type', v)}
                options={PAGE_TYPES.map((x) => ({ value: x.type, label: x.label }))}
                hint={t.blurb}
              />
            </div>
          </Section>

          <Section
            title="What it says"
            description="Write it the way you would explain it to a customer standing in front of you. Leave a blank line between paragraphs."
          >
            <div>
              <label className="label" htmlFor="cms-body">Page writing</label>
              <textarea
                id="cms-body" rows={18}
                value={p.body || ''}
                onChange={(e) => set('body', e.target.value)}
                aria-describedby="cms-body-h"
                className="input min-h-[320px] resize-y font-mono text-[13px] leading-relaxed"
                placeholder={'Returns\n\nWe accept returns within 14 days of delivery, as long as the item is unworn and the tags are still attached.\n\nHow to start a return\n\nMessage us on WhatsApp with your order number.'}
              />
              <p id="cms-body-h" className="mt-1.5 text-[11px] leading-relaxed text-neutral-600">
                A line on its own with nothing after it becomes a heading. Everything else becomes a paragraph.
                {' '}{(p.body || '').length.toLocaleString('en-PK')} characters.
              </p>
            </div>
          </Section>

          <Accordion title="Short summary" subtitle="Used in search results and when the link is shared">
            <div>
              <label className="label" htmlFor="cms-excerpt">Summary</label>
              <textarea
                id="cms-excerpt" rows={3} value={p.excerpt || ''}
                onChange={(e) => set('excerpt', e.target.value)}
                aria-describedby="cms-excerpt-h"
                className="input resize-y"
                placeholder="How to measure yourself and pick the right size."
                maxLength={300}
              />
              <p id="cms-excerpt-h" className="mt-1.5 text-[11px] text-neutral-600">
                Keep it under about 160 characters. {(p.excerpt || '').length}/300 used.
              </p>
            </div>
          </Accordion>
        </div>

        {/* ================= sidebar ================= */}
        <div className="min-w-0 space-y-5">
          <Section title="Going live" description="Nothing is visible until you publish.">
            <div className="space-y-3">
              {isNew ? (
                <p className="rounded-lg bg-neutral-50 px-3 py-2.5 text-[12px] leading-relaxed text-neutral-700">
                  Save the page first. New pages are always saved as a draft so you can read them over before
                  anyone else does.
                </p>
              ) : (
                <>
                  <button
                    type="button" onClick={() => publish(null)} disabled={busy || dirty || reason === 'live'}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-4 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
                  >
                    <Send size={13} aria-hidden="true" />
                    {reason === 'live' ? (p.hasDraft ? 'Publish your edits' : 'Already live') : 'Publish now'}
                  </button>
                  {reason === 'live' && p.hasDraft && (
                    <button
                      type="button" onClick={() => publish(null)} disabled={busy || dirty}
                      className="min-h-[44px] w-full rounded-lg border border-neutral-900 px-4 text-[12px] font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-50"
                    >
                      Publish the newest edits
                    </button>
                  )}
                  {(reason === 'live' || reason === 'scheduled') && (
                    <button
                      type="button" onClick={unpublish} disabled={busy}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-4 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <EyeOff size={13} aria-hidden="true" /> Hide from customers
                    </button>
                  )}
                  {dirty && (
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      Save your changes before publishing — otherwise the old version goes live.
                    </p>
                  )}
                  {p.publishedAt && (
                    <p className="text-[11px] text-neutral-600">Last published {fmtWhen(p.publishedAt)}</p>
                  )}
                </>
              )}
            </div>
          </Section>

          {!isNew && (
            <Accordion title="Publish later" subtitle="Pick a date and time instead">
              <div className="space-y-3">
                <DateTime
                  label="Go live on" value={scheduleAt} onChange={setScheduleAt}
                  hint="Karachi time. Before this moment the page cannot be reached, even with the link."
                />
                <button
                  type="button" disabled={busy || dirty || !scheduleAt}
                  onClick={() => publish(scheduleAt)}
                  className="min-h-[44px] w-full rounded-lg border border-neutral-900 px-4 text-[12px] font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  Schedule
                </button>
                <DateTime
                  label="Hide again on (optional)" value={p.unpublishAt} onChange={(v) => set('unpublishAt', v)}
                  hint="For a sale page that should disappear when the sale ends. Save after changing."
                />
              </div>
            </Accordion>
          )}

          <Accordion title="Where it appears" subtitle="Footer and menu links">
            <div className="space-y-3">
              <Toggle
                label="Show in the footer" checked={!!p.showInFooter}
                onChange={(v) => set('showInFooter', v)}
                description="The list of links at the very bottom of every page."
              />
              <Toggle
                label="Show in the top menu" checked={!!p.showInHeader}
                onChange={(v) => set('showInHeader', v)}
                description="Use sparingly — a crowded menu is harder to shop."
              />
              <Text
                label="Link wording (optional)" value={p.navLabel}
                onChange={(v) => set('navLabel', v)}
                hint={`Leave blank to use "${p.title || 'the page name'}". Useful when the page name is long.`}
                placeholder="Sizing"
              />
              <Num
                label="Order in the list" value={p.sortOrder}
                onChange={(v) => set('sortOrder', v)}
                min={0} max={999}
                hint="Smaller numbers come first. 100 is the default."
              />
            </div>
          </Accordion>

          <Accordion title="How it looks in Google" subtitle="A preview, not a setting">
            <div className="rounded-lg border border-neutral-200 bg-white p-3">
              <p className="truncate text-[13px] text-[#1a0dab]">{previewTitle(p.seo?.title || p.title, cfg) || 'Page name'}</p>
              <p className="mt-0.5 truncate text-[11px] text-[#006621]">hushae.pk/{p.slug || '…'}</p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-neutral-600">
                {p.seo?.description || p.excerpt || 'Add a short summary above and it will show here.'}
              </p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-neutral-600">
              Full search and sharing controls arrive in the next update.
            </p>
          </Accordion>

          {!isNew && !p.locked && (
            <button
              type="button" onClick={remove}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 px-4 text-[12px] font-semibold text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={13} aria-hidden="true" /> Delete this page
            </button>
          )}
          {!isNew && p.locked && (
            <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900">
              This page is part of the shop and cannot be deleted. Hide it instead.
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
