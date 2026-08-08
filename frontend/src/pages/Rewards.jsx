import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award, Check, Copy, Gift, Repeat, ShoppingBag, Sparkles, Star, Users,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import { loyaltyConfig, pointsLabel, earnRateText } from '../lib/loyaltyConfig';
import EmptyState from '../components/ui/EmptyState';

/* ============================================================================
 * REWARDS — the customer's own dashboard.
 *
 * Mobile-first: this store is ~85% phones, so the default is one column and
 * the balance card is the first thing on screen. Everything else is below it.
 *
 * Every number on this page comes from GET /loyalty/me. Nothing is computed in
 * the browser — the client asks, the server answers. That is deliberate: a
 * balance a shopper could influence is not a balance.
 * ========================================================================== */

/* An explicit map, never `import * as Icons`. A namespace import pulls the
   whole lucide library into the shopper's bundle. */
const BADGE_ICONS = { Award, Gift, Repeat, ShoppingBag, Sparkles, Star, Users };

const num = (n) => Number(n || 0).toLocaleString('en-PK');

/* ---------------------------------------------------------------------------
 * Tier ladder with a real progress bar.
 * ------------------------------------------------------------------------- */
function TierCard({ tier, cfg }) {
  if (!cfg.tiers?.enabled || !tier?.current) return null;
  const { current, next, progress, toNext, spend } = tier;

  return (
    <section className="card-content" aria-labelledby="rw-tier">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-9 w-9 shrink-0 rounded-full border border-line"
            style={{ background: current.colour || '#C9BFB4' }}
          />
          <div>
            <h2 id="rw-tier" className="text-label uppercase tracking-widest text-ash">Your tier</h2>
            <p className="mt-0.5 font-display text-h4">{current.name}</p>
          </div>
        </div>
        <p className="text-body-sm text-ash">
          {num(spend)} PKR counted
        </p>
      </div>

      {next ? (
        <div className="mt-5">
          {/* The bar is decorative; the sentence beneath it is the real
              information, so a screen reader is given that and not a
              percentage with no context. */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-satin" aria-hidden="true">
            <div
              className="h-full rounded-full bg-sagedeep transition-all duration-slow"
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>
          <p className="mt-2.5 text-body-sm">
            Spend <strong>{pkr(toNext)}</strong> more to reach <strong>{next.name}</strong>.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-body-sm">You are at the highest tier. Thank you.</p>
      )}

      {(current.perks || []).length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {current.perks.map((p) => (
            <li key={p} className="flex items-start gap-2 text-body-sm">
              <Check size={15} className="mt-0.5 shrink-0 text-sagedeep" aria-hidden="true" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * Referral card — the code, a share button, and what it is worth.
 * ------------------------------------------------------------------------- */
function ReferralCard({ data, cfg, toast }) {
  const [copied, setCopied] = useState(false);
  if (!data?.enabled || !data.code) return null;

  const link = `${window.location.origin}/?ref=${data.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast('Invite link copied');
      setTimeout(() => setCopied(false), 2200);
    } catch { toast('Could not copy — long-press the code to select it'); }
  };

  const share = async () => {
    if (!navigator.share) return copy();
    try {
      await navigator.share({
        title: cfg.programName,
        text: `Join me at HUSHAE and get ${num(data.refereePoints)} ${cfg.pointsName} on your first order.`,
        url: link,
      });
    } catch { /* the sheet was dismissed — not an error */ }
    return undefined;
  };

  return (
    <section className="card-content" aria-labelledby="rw-ref">
      <h2 id="rw-ref" className="text-label uppercase tracking-widest text-ash">Refer a friend</h2>
      <p className="mt-2 text-body-sm">
        They get <strong>{pointsLabel(data.refereePoints, cfg)}</strong>. You get{' '}
        <strong>{pointsLabel(data.referrerPoints, cfg)}</strong> once their first order is delivered
        {data.minOrderValue > 0 ? ` (${pkr(data.minOrderValue)} minimum)` : ''}.
      </p>

      <div className="mt-4 flex items-stretch gap-2">
        <code className="min-w-0 flex-1 select-all break-all rounded-control border border-line bg-cream/50 px-4 py-3 font-mono text-body-sm tracking-wider">
          {data.code}
        </code>
        <button
          type="button" onClick={copy}
          className="grid min-h-[44px] w-12 shrink-0 place-items-center rounded-control border border-bronze bg-white text-graphite transition hover:bg-satin/60"
          aria-label={copied ? 'Invite link copied' : 'Copy invite link'}
        >
          {copied ? <Check size={16} className="text-sagedeep" /> : <Copy size={16} />}
        </button>
      </div>

      <button type="button" onClick={share} className="btn-primary mt-3 w-full">
        Share your invite
      </button>

      {(data.joinedCount > 0 || data.paidTotal > 0) && (
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
          <div>
            <dt className="text-caption text-ash">Friends joined</dt>
            <dd className="mt-0.5 font-display text-h5 tabular-nums">{num(data.joinedCount)}</dd>
          </div>
          <div>
            <dt className="text-caption text-ash">Points earned</dt>
            <dd className="mt-0.5 font-display text-h5 tabular-nums">{num(data.paidTotal)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * Points statement, paginated on the server.
 * ------------------------------------------------------------------------- */
function History({ token, cfg }) {
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback((p) => {
    setBusy(true);
    api(`/loyalty/me/history?page=${p}&limit=10`, { token })
      .then((d) => {
        setRows((prev) => (p === 1 ? (d.rows || []) : [...(prev || []), ...(d.rows || [])]));
        setMore(!!d.hasMore);
      })
      .catch(() => setRows([]))
      .finally(() => setBusy(false));
  }, [token]);

  useEffect(() => { load(1); }, [load]);

  if (rows === null) return <div className="skeleton h-40 w-full rounded-card" />;

  return (
    <section className="card-content" aria-labelledby="rw-hist">
      <h2 id="rw-hist" className="text-label uppercase tracking-widest text-ash">Points history</h2>

      {rows.length === 0 ? (
        <p className="mt-4 text-body-sm text-ash">
          Nothing here yet. Your first order will start this list.
        </p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-line">
            {rows.map((r) => (
              <li key={r._id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium capitalize">
                    {String(r.reason || '').replace(/-/g, ' ')}
                  </p>
                  <p className="mt-0.5 text-caption text-ash">
                    {fmtDate(r.createdAt)}
                    {r.orderNumber ? ` · ${r.orderNumber}` : ''}
                    {r.note ? ` · ${r.note}` : ''}
                  </p>
                </div>
                <p className={`shrink-0 text-body-sm font-semibold tabular-nums ${r.amount > 0 ? 'text-sagedark' : 'text-graphite'}`}>
                  {r.amount > 0 ? '+' : ''}{num(r.amount)}{r.kind === 'credit' ? ' PKR' : ''}
                </p>
              </li>
            ))}
          </ul>

          {more && (
            <button
              type="button" disabled={busy}
              onClick={() => { const p = page + 1; setPage(p); load(p); }}
              className="btn btn-sm mt-4 w-full border border-bronze bg-white text-graphite hover:bg-satin/60 disabled:opacity-50"
            >
              {busy ? 'Loading…' : 'Show more'}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/* ========================================================================== */

export default function Rewards() {
  const { auth, settings, toast } = useApp();
  const nav = useNavigate();
  const cfg = useMemo(() => loyaltyConfig(settings), [settings]);

  const [data, setData] = useState(null);
  const [refData, setRefData] = useState(null);
  const [err, setErr] = useState('');
  const announced = useRef(false);

  useEffect(() => {
    if (!auth?.token) return undefined;
    let alive = true;
    api('/loyalty/me', { token: auth.token })
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setErr(e.message || 'Could not load your rewards'); });
    api('/loyalty/me/referrals', { token: auth.token })
      .then((d) => { if (alive) setRefData(d); })
      .catch(() => { if (alive) setRefData({ enabled: false }); });
    return () => { alive = false; };
  }, [auth?.token]);

  /* A badge unlocked in the background is worth telling someone about, but
     only once per visit — a toast that fires on every re-render is noise. */
  useEffect(() => {
    if (!data?.justUnlocked?.length || announced.current) return;
    announced.current = true;
    const first = data.achievements?.find((a) => a.id === data.justUnlocked[0]);
    toast(first ? `Badge unlocked — ${first.name}` : 'New badge unlocked');
  }, [data, toast]);

  /* ---- signed out ---- */
  if (!auth?.token) {
    return (
      <div className="container-page py-sect-y">
        <EmptyState
          icon={Sparkles}
          title={cfg.programName}
          description={cfg.joinText}
          action={{ label: 'Sign in to start earning', to: '/account' }}
          secondary={{ label: 'Continue shopping', to: '/shop' }}
        />
      </div>
    );
  }

  /* ---- loading ----
   *
   * Gotcha 51/55: a skeleton that is too tall OR too short both cause a shift.
   * A first guess here measured 0.0129 CLS at 320px from the card block alone.
   * These heights are the REAL rendered heights, measured per breakpoint:
   *
   *          320    360    390    768   1024   1280
   *   header  382    382    382    297    302    312
   *   grid   1369   1298   1277   1266    702    684
   *   hist    786    786    786    794    794    794
   *
   * The grid collapses to one column below lg, which is why the mobile
   * reservation is roughly double the desktop one. */
  if (!data && !err) {
    return (
      <div className="container-page py-8 md:py-12">
        <div role="status" aria-live="polite">
          <span className="sr-only">Loading your rewards…</span>
          <div className="skeleton h-[382px] w-full rounded-panel md:h-[297px] lg:h-[302px] xl:h-[312px]" />
          <div className="skeleton mt-6 h-[1369px] w-full rounded-card min-[360px]:h-[1298px] min-[390px]:h-[1277px] md:h-[1266px] lg:h-[702px] xl:h-[684px]" />
          <div className="skeleton mt-6 h-[786px] w-full rounded-card md:h-[794px]" />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="container-page py-sect-y">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-h3">We could not load your rewards</h1>
          <p className="mt-3 text-body-sm text-ash">{err}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-6">Try again</button>
        </div>
      </div>
    );
  }

  /* ---- the merchant has switched the programme off ---- */
  if (data.enabled === false) {
    return (
      <div className="container-page py-sect-y">
        <EmptyState
          icon={Sparkles}
          title="Rewards are not running right now"
          description="Our rewards programme is being set up. Please check back soon."
          action={{ label: 'Continue shopping', to: '/shop' }}
        />
      </div>
    );
  }

  /* ---- loyalty is keyed on the phone number, so say so plainly rather than
     showing a zero that can never move ---- */
  if (data.needsPhone) {
    return (
      <div className="container-page py-sect-y">
        <EmptyState
          icon={Sparkles}
          title="Add your mobile number"
          description="Your rewards are held against your mobile number, so orders you placed as a guest count too. Add it to your profile to begin."
          action={{ label: 'Go to your profile', to: '/account' }}
        />
      </div>
    );
  }

  const a = data.account;
  const worth = Math.floor(a.points * (Number(data.pointValue) || 1));
  const earned = data.achievements?.filter((x) => x.earned) || [];

  return (
    <div className="container-page py-8 md:py-12">
      {/* ---------------- balance ---------------- */}
      <header className="rounded-panel border border-line bg-white/60 p-5 md:p-7">
        <p className="text-label uppercase tracking-widest text-sagedeep">{data.programName || cfg.programName}</p>
        <h1 className="mt-1 font-display text-h1 tabular-nums">{num(a.points)}</h1>
        <p className="mt-1 text-body">
          {cfg.pointsName} — worth <strong>{pkr(worth)}</strong> off your next order
        </p>

        {a.credit > 0 && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-sage/25 px-3 py-1.5 text-body-sm text-sagedark">
            <Gift size={14} aria-hidden="true" /> Plus {pkr(a.credit)} store credit
          </p>
        )}

        {data.expiringSoon > 0 && (
          <p role="status" className="mt-3 rounded-control bg-cream px-4 py-2.5 text-body-sm">
            <strong>{num(data.expiringSoon)}</strong> {cfg.pointsName} expire within{' '}
            {data.expiry?.warnDays || 30} days — use them before they go.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/shop" className="btn-primary">Shop and earn</Link>
          {a.points >= (data.redeem?.minPoints || 0) && data.redeem?.enabled && (
            <Link to="/cart" className="btn-ghost border border-bronze">Spend at checkout</Link>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TierCard tier={data.tier} cfg={{ ...cfg, tiers: data.tiers || cfg.tiers }} />
        <ReferralCard data={refData} cfg={cfg} toast={toast} />

        {/* ---------------- how to earn ---------------- */}
        <section className="card-content" aria-labelledby="rw-earn">
          <h2 id="rw-earn" className="text-label uppercase tracking-widest text-ash">Ways to earn</h2>
          <ul className="mt-4 divide-y divide-line">
            {[
              ['Every order', earnRateText({ ...cfg, earn: { perCurrency: data.earn?.perCurrency } }), true],
              ['Your first order', data.earn?.firstOrderPoints, !a.claimed?.firstOrder],
              ['Creating an account', data.earn?.signupPoints, !a.claimed?.signup],
              ['Writing a review', data.earn?.reviewPoints, true],
              ['Your birthday', data.earn?.birthdayPoints, true],
            ].filter(([, v]) => v).map(([label, value, open]) => (
              <li key={label} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-body-sm">{label}</span>
                <span className={`shrink-0 text-body-sm font-semibold tabular-nums ${open ? '' : 'text-ash'}`}>
                  {typeof value === 'number' ? `+${num(value)}` : value}
                  {!open && typeof value === 'number' ? ' · claimed' : ''}
                </span>
              </li>
            ))}
          </ul>
          {!a.birthday && data.earn?.birthdayPoints > 0 && (
            <Link to="/account" className="mt-4 inline-flex min-h-[44px] items-center text-body-sm font-semibold underline-offset-4 hover:underline">
              Add your birthday to claim that one
            </Link>
          )}
        </section>

        {/* ---------------- badges ---------------- */}
        {(data.achievements || []).length > 0 && (
          <section className="card-content" aria-labelledby="rw-badges">
            <div className="flex items-center justify-between gap-3">
              <h2 id="rw-badges" className="text-label uppercase tracking-widest text-ash">Badges</h2>
              <p className="text-caption text-ash">{earned.length} of {data.achievements.length}</p>
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-3">
              {data.achievements.map((b) => {
                const Icon = BADGE_ICONS[b.icon] || Award;
                return (
                  <li
                    key={b.id}
                    className={`rounded-card border p-4 ${b.earned ? 'border-sage bg-sage/15' : 'border-line bg-cream/40'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`grid h-9 w-9 place-items-center rounded-full ${b.earned ? 'bg-sagedeep text-alabaster' : 'bg-satin text-ash'}`}
                    >
                      <Icon size={16} strokeWidth={1.8} />
                    </span>
                    <p className="mt-2.5 text-body-sm font-medium">{b.name}</p>
                    <p className="mt-0.5 text-caption text-ash">
                      {b.earned ? (b.note || 'Unlocked') : `${num(b.current)} of ${num(b.target)}`}
                    </p>
                    {!b.earned && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-satin" aria-hidden="true">
                        <div className="h-full rounded-full bg-sand" style={{ width: `${Math.max(3, b.progress)}%` }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <div className="mt-6">
        <History token={auth.token} cfg={cfg} />
      </div>
    </div>
  );
}
