import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { LOYALTY_DEFAULTS } from '../lib/loyaltyConfig';
import {
  PageHeader, EdSection, EdSaveBar, EdToggle, EdText, EdNum, EdSelect, EdNotice, EdConfirm,
  TableSkeleton, EditorialError, ctl, ta, btnGhost, btnSolid,
} from './settings/chrome';

function EarnRule({ label, description, on, points, onToggle, onPoints, disabled }) {
  return (
    <div className="border-b border-white/5 py-3 last:border-0">
      <EdToggle label={label} description={description} checked={on} onChange={onToggle} disabled={disabled} />
      <div className="mt-2 flex items-center gap-2 pl-0">
        <input
          type="number" min="0" max="100000" className={`${ctl} max-w-[140px]`}
          value={points ?? 0} disabled={disabled || !on}
          aria-label={`${label} — points awarded`}
          onChange={(e) => onPoints(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        <span className="text-[12px] text-white/35">points</span>
      </div>
    </div>
  );
}

export default function SettingsLoyalty() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const [openTier, setOpenTier] = useState(null);
  const [err, setErr] = useState('');
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    api('/settings')
      .then((d) => {
        const saved = d.settings?.loyalty || {};
        const merged = { ...LOYALTY_DEFAULTS, ...saved };
        for (const g of ['earn', 'redeem', 'expiry', 'tiers', 'referral', 'credit', 'giftCards', 'achievements', 'limits', 'notify']) {
          merged[g] = { ...LOYALTY_DEFAULTS[g], ...(saved[g] || {}) };
        }
        if (!Array.isArray(merged.tiers.levels)) merged.tiers.levels = LOYALTY_DEFAULTS.tiers.levels;
        if (!Array.isArray(merged.achievements.list)) merged.achievements.list = LOYALTY_DEFAULTS.achievements.list;
        const next = { ...d.settings, loyalty: merged };
        setS(next);
        setOriginal(JSON.stringify(next));
      })
      .catch(() => { setErr('Could not load settings'); toast('Could not load settings'); });
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!auth?.token) return;
    api('/loyalty/admin/stats', { token: auth.token }).then(setStats).catch(() => {});
  }, [auth?.token]);

  const dirty = useMemo(() => original && JSON.stringify(s) !== original, [s, original]);

  if (!s && !err) {
    return <AdminLayout title="Loyalty"><PageHeader title="Loyalty" description="Points, tiers and rewards." /><TableSkeleton rows={8} /></AdminLayout>;
  }
  if (err || !s) {
    return (
      <AdminLayout title="Loyalty">
        <PageHeader title="Loyalty" description="Points, tiers and rewards." />
        <EditorialError title="Unable to load settings" description={err} onRetry={() => window.location.reload()} />
      </AdminLayout>
    );
  }

  const L = s.loyalty;
  const off = !L.enabled;
  const set = (k, v) => setS({ ...s, loyalty: { ...L, [k]: v } });
  const setG = (g, k, v) => setS({ ...s, loyalty: { ...L, [g]: { ...L[g], [k]: v } } });

  const setTier = (i, k, v) => {
    const levels = L.tiers.levels.map((t, idx) => (idx === i ? { ...t, [k]: v } : t));
    setG('tiers', 'levels', levels);
  };
  const addTier = () => {
    const n = L.tiers.levels.length;
    setG('tiers', 'levels', [...L.tiers.levels, {
      id: `tier${n + 1}`, name: `Tier ${n + 1}`, minSpend: 0, multiplier: 1,
      freeShipping: false, discountPercent: 0, colour: '#C9BFB4', perks: [],
    }]);
    setOpenTier(n);
  };
  const removeTier = (i) => {
    setG('tiers', 'levels', L.tiers.levels.filter((_, idx) => idx !== i));
    setOpenTier(null);
    setDialog(null);
  };

  const setAch = (i, k, v) => {
    setG('achievements', 'list', L.achievements.list.map((a, idx) => (idx === i ? { ...a, [k]: v } : a)));
  };
  const addAch = () => {
    const n = L.achievements.list.length;
    setG('achievements', 'list', [...L.achievements.list, {
      id: `badge${n + 1}`, name: 'New badge', note: '', icon: 'Award', metric: 'orders', target: 1, points: 0,
    }]);
  };
  const removeAch = (i) => setG('achievements', 'list', L.achievements.list.filter((_, idx) => idx !== i));

  const problems = [];
  {
    const ids = L.tiers.levels.map((t) => t.id);
    if (new Set(ids).size !== ids.length) problems.push('Two tiers share the same ID — each must be unique.');
    if (ids.some((id) => !id)) problems.push('Every tier needs an ID.');
    const sorted = [...L.tiers.levels].sort((a, b) => (a.minSpend || 0) - (b.minSpend || 0));
    for (let i = 1; i < sorted.length; i += 1) {
      if ((sorted[i].minSpend || 0) === (sorted[i - 1].minSpend || 0)) {
        problems.push(`"${sorted[i].name}" and "${sorted[i - 1].name}" both start at the same spend.`);
        break;
      }
    }
    if (L.redeem.step > 0 && L.redeem.minPoints % L.redeem.step !== 0) {
      problems.push(`Minimum to redeem (${L.redeem.minPoints}) is not a multiple of the step (${L.redeem.step}) — customers will never reach it exactly.`);
    }
    if (L.giftCards.minAmount > L.giftCards.maxAmount) problems.push('Gift card minimum is above the maximum.');
    const aIds = L.achievements.list.map((a) => a.id);
    if (new Set(aIds).size !== aIds.length) problems.push('Two badges share the same ID.');
  }

  const save = async () => {
    if (problems.length) { toast('Fix the highlighted problems first'); return; }
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { loyalty: L } });
      setOriginal(JSON.stringify(s));
      toast('Loyalty settings saved');
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  const perCurrency = Number(L.earn.perCurrency) || 0;
  const spendPerPoint = perCurrency > 0 ? Math.round(1 / perCurrency) : 0;

  return (
    <AdminLayout title="Loyalty">
      <PageHeader
        title="Loyalty"
        description="Points, tiers, referrals, store credit and gift cards. Every rupee is calculated on the server."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Loyalty' }]}
        actions={<Link to="/admin/loyalty" className={`${btnGhost} hidden sm:inline-flex`}>Members</Link>}
      />

      {stats && (
        <section className="mb-10">
          <p className="adm-index">00 — Snapshot</p>
          <div className="adm-divide-x grid grid-cols-2 border-y border-white/10 md:grid-cols-4">
            {[
              ['Members', (stats.accounts || 0).toLocaleString('en-PK')],
              ['Points outstanding', (stats.points || 0).toLocaleString('en-PK')],
              ['Store credit', `PKR ${(stats.credit || 0).toLocaleString('en-PK')}`],
              ['Gift cards live', `PKR ${(stats.giftCards?.outstanding || 0).toLocaleString('en-PK')}`],
            ].map(([k, v]) => (
              <div key={k} className="px-5 py-6">
                <p className="adm-label">{k}</p>
                <p className="adm-metric mt-3 text-[22px] text-white">{v}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {problems.length > 0 && (
        <EdNotice>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">Fix these before saving</p>
          <ul className="list-disc space-y-1 pl-5">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </EdNotice>
      )}

      <EdSection index={1} title="Programme" description="While this is off, customers see nothing and no points are awarded — existing balances are kept.">
        <EdToggle label="Run the rewards programme" description="Turn this on only once the rules below are set." checked={L.enabled} onChange={(v) => set('enabled', v)} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdText label="Programme name" value={L.programName} onChange={(v) => set('programName', v)} disabled={off} hint="Shown to customers, e.g. HUSHAE Circle." />
          <EdText label="Rewards page heading" value={L.dashboardTitle} onChange={(v) => set('dashboardTitle', v)} disabled={off} />
          <EdText label="What you call points (many)" value={L.pointsName} onChange={(v) => set('pointsName', v)} disabled={off} hint='e.g. "points", "stars", "coins".' />
          <EdText label="What you call one point" value={L.pointsNameOne} onChange={(v) => set('pointsNameOne', v)} disabled={off} />
        </div>
        <div className="mt-4">
          <EdText label="Invitation line" value={L.joinText} onChange={(v) => set('joinText', v)} disabled={off} hint="The one sentence that explains the programme to a new shopper." />
        </div>
      </EdSection>

      <EdSection index={2} title="Earning on purchases">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="adm-label mb-1.5 block" htmlFor="loy-spend-per-point">Spend needed for 1 point (PKR)</label>
            <input
              id="loy-spend-per-point" aria-describedby="loy-spend-per-point-h"
              className={ctl} type="number" min="1" max="100000" disabled={off}
              value={spendPerPoint}
              onChange={(e) => {
                const v = Number(e.target.value);
                setG('earn', 'perCurrency', v > 0 ? 1 / v : 0);
              }}
            />
            <p id="loy-spend-per-point-h" className="mt-1.5 text-[11px] leading-relaxed text-white/30">
              {spendPerPoint > 0
                ? `A PKR 5,000 order earns about ${Math.floor(5000 / spendPerPoint)} points, worth PKR ${Math.floor((5000 / spendPerPoint) * (Number(L.redeem.pointValue) || 1)).toLocaleString('en-PK')} off a future order.`
                : 'Set a value above zero or purchases earn nothing.'}
            </p>
          </div>
          <EdSelect
            label="Pay points when the order is"
            value={L.earn.awardOnStatus}
            onChange={(v) => setG('earn', 'awardOnStatus', v)}
            disabled={off}
            options={[
              { value: 'Delivered', label: 'Delivered — safest' },
              { value: 'Ready to Ship', label: 'Ready to Ship' },
              { value: 'Shipped', label: 'Shipped' },
              { value: 'Pending', label: 'As soon as ordered — risky' },
            ]}
            hint="Paying before delivery means paying for orders that get cancelled or returned."
          />
          <EdSelect
            label="Rounding"
            value={L.earn.roundingMode}
            onChange={(v) => setG('earn', 'roundingMode', v)}
            disabled={off}
            options={[
              { value: 'floor', label: 'Round down — cheapest' },
              { value: 'round', label: 'Nearest whole point' },
              { value: 'ceil', label: 'Round up — most generous' },
            ]}
          />
        </div>
        <div className="mt-4">
          <EdToggle label="Earn on discounted items too" description="Off means a sale item earns points only on what is left after the discount." checked={L.earn.earnOnDiscounted} onChange={(v) => setG('earn', 'earnOnDiscounted', v)} disabled={off} />
          <EdToggle label="Earn on the delivery charge" description="Usually off — you do not keep the courier fee." checked={L.earn.earnOnShipping} onChange={(v) => setG('earn', 'earnOnShipping', v)} disabled={off} />
        </div>
      </EdSection>

      <EdSection index={3} title="Bonus points" description="One-off rewards. Each one can pay only once per customer.">
        <div className="grid gap-2 md:grid-cols-2">
          <EarnRule label="Creating an account" description="Paid the moment they register." on={L.earn.signupEnabled} points={L.earn.signupPoints} onToggle={(v) => setG('earn', 'signupEnabled', v)} onPoints={(v) => setG('earn', 'signupPoints', v)} disabled={off} />
          <EarnRule label="First order" description="On top of the normal purchase points." on={L.earn.firstOrderEnabled} points={L.earn.firstOrderPoints} onToggle={(v) => setG('earn', 'firstOrderEnabled', v)} onPoints={(v) => setG('earn', 'firstOrderPoints', v)} disabled={off} />
          <EarnRule label="Writing a review" description="Paid when you approve the review." on={L.earn.reviewEnabled} points={L.earn.reviewPoints} onToggle={(v) => setG('earn', 'reviewEnabled', v)} onPoints={(v) => setG('earn', 'reviewPoints', v)} disabled={off} />
          <EarnRule label="Joining the newsletter" on={L.earn.newsletterEnabled} points={L.earn.newsletterPoints} onToggle={(v) => setG('earn', 'newsletterEnabled', v)} onPoints={(v) => setG('earn', 'newsletterPoints', v)} disabled={off} />
          <EarnRule label="Completing their profile" on={L.earn.profileEnabled} points={L.earn.profilePoints} onToggle={(v) => setG('earn', 'profileEnabled', v)} onPoints={(v) => setG('earn', 'profilePoints', v)} disabled={off} />
          <EarnRule label="Birthday gift" description="Once a year, on the date they saved." on={L.earn.birthdayEnabled} points={L.earn.birthdayPoints} onToggle={(v) => setG('earn', 'birthdayEnabled', v)} onPoints={(v) => setG('earn', 'birthdayPoints', v)} disabled={off} />
        </div>
      </EdSection>

      <EdSection index={4} title="Spending points">
        <EdToggle label="Let customers pay with points" checked={L.redeem.enabled} onChange={(v) => setG('redeem', 'enabled', v)} disabled={off} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdNum label="1 point is worth (PKR)" value={L.redeem.pointValue} onChange={(v) => setG('redeem', 'pointValue', v)} min="0.1" step="0.1" max="100" disabled={off || !L.redeem.enabled} />
          <EdNum label="Fewest points they can spend at once" value={L.redeem.minPoints} onChange={(v) => setG('redeem', 'minPoints', v)} min="0" max="100000" disabled={off || !L.redeem.enabled} hint="Stops a 3-point discount cluttering every order." />
          <EdNum label="Points must be spent in blocks of" value={L.redeem.step} onChange={(v) => setG('redeem', 'step', v)} min="1" max="10000" disabled={off || !L.redeem.enabled} hint="e.g. 50 means they can spend 200 or 250, never 213." />
          <EdNum label="Most of an order that points can cover (%)" value={L.redeem.maxPercentOfOrder} onChange={(v) => setG('redeem', 'maxPercentOfOrder', v)} min="1" max="100" disabled={off || !L.redeem.enabled} hint="Keep below 100 so every order still brings in some cash." />
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-white/35">
          On a PKR 5,000 order a customer could take off at most{' '}
          <span className="text-white">PKR {Math.floor(5000 * ((Number(L.redeem.maxPercentOfOrder) || 0) / 100)).toLocaleString('en-PK')}</span>
          {' '}— that is {Math.floor((5000 * ((Number(L.redeem.maxPercentOfOrder) || 0) / 100)) / (Number(L.redeem.pointValue) || 1)).toLocaleString('en-PK')} points.
        </p>
      </EdSection>

      <EdSection index={5} title="Points expiry">
        <EdToggle label="Points expire" checked={L.expiry.enabled} onChange={(v) => setG('expiry', 'enabled', v)} disabled={off} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdNum label="Points last for (months)" value={L.expiry.months} onChange={(v) => setG('expiry', 'months', v)} min="1" max="120" disabled={off || !L.expiry.enabled} />
          <EdNum label="Warn the customer this many days before" value={L.expiry.warnDays} onChange={(v) => setG('expiry', 'warnDays', v)} min="1" max="180" disabled={off || !L.expiry.enabled} hint="A warning turns an expiry into a reason to shop." />
        </div>
      </EdSection>

      <EdSection index={6} title="VIP tiers" description="Spend more, earn faster. Qualifying spend counts delivered orders only.">
        <EdToggle label="Use tiers" checked={L.tiers.enabled} onChange={(v) => setG('tiers', 'enabled', v)} disabled={off} />
        <div className="mt-4">
          <EdNum label="Spend is counted over the last (months)" value={L.tiers.windowMonths} onChange={(v) => setG('tiers', 'windowMonths', v)} min="0" max="120" disabled={off || !L.tiers.enabled} hint="0 means lifetime spend — nobody is ever demoted." />
        </div>
        <div className="mt-5 space-y-1">
          {L.tiers.levels.map((t, i) => (
            <div key={`${t.id}-${i}`} className="border-b border-white/5">
              <button
                type="button"
                onClick={() => setOpenTier(openTier === i ? null : i)}
                aria-expanded={openTier === i}
                className="adm-row-hover flex w-full items-center gap-3 py-3 text-left"
              >
                <span className="h-3 w-3 shrink-0 border border-white/20" style={{ background: t.colour || '#C9BFB4' }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-white">{t.name || t.id}</span>
                  <span className="block text-[12px] text-white/35">
                    From PKR {(t.minSpend || 0).toLocaleString('en-PK')} · {t.multiplier || 1}× points
                    {t.freeShipping ? ' · free delivery' : ''}
                    {t.discountPercent ? ` · ${t.discountPercent}% off` : ''}
                  </span>
                </span>
                <span className="text-[11px] text-white/25">{openTier === i ? '−' : '+'}</span>
              </button>
              {openTier === i && (
                <div className="border-t border-white/10 pb-5 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <EdText label="Name" value={t.name} onChange={(v) => setTier(i, 'name', v)} disabled={off || !L.tiers.enabled} />
                    <EdText label="ID (never change this once live)" value={t.id} onChange={(v) => setTier(i, 'id', v.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))} disabled={off || !L.tiers.enabled} hint="Members are stored against this ID." />
                    <EdNum label="Reached at spend (PKR)" value={t.minSpend} onChange={(v) => setTier(i, 'minSpend', v)} min="0" max="100000000" disabled={off || !L.tiers.enabled} />
                    <EdNum label="Points multiplier" value={t.multiplier} onChange={(v) => setTier(i, 'multiplier', v)} min="1" max="10" step="0.05" disabled={off || !L.tiers.enabled} />
                    <EdNum label="Member discount (%)" value={t.discountPercent} onChange={(v) => setTier(i, 'discountPercent', v)} min="0" max="90" disabled={off || !L.tiers.enabled} />
                    <div>
                      <label className="adm-label mb-1.5 block" htmlFor={`tier-colour-${i}`}>Badge colour</label>
                      <div className="flex items-center gap-2">
                        <input id={`tier-colour-${i}`} type="color" aria-label={`${t.name || t.id} badge colour, colour picker`} className="h-8 w-12 cursor-pointer border border-white/20 bg-[#0A0A0A] p-0.5" value={t.colour || '#C9BFB4'} onChange={(e) => setTier(i, 'colour', e.target.value)} disabled={off || !L.tiers.enabled} />
                        <input aria-label={`${t.name || t.id} badge colour, hex code`} className={ctl} value={t.colour || ''} onChange={(e) => setTier(i, 'colour', e.target.value)} disabled={off || !L.tiers.enabled} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <EdToggle label="Free delivery for this tier" checked={t.freeShipping} onChange={(v) => setTier(i, 'freeShipping', v)} disabled={off || !L.tiers.enabled} />
                  </div>
                  <div className="mt-4">
                    <label className="adm-label mb-1.5 block" htmlFor={`tier-perks-${i}`}>Perks shown to the customer (one per line)</label>
                    <textarea
                      id={`tier-perks-${i}`}
                      className={ta} disabled={off || !L.tiers.enabled}
                      value={(t.perks || []).join('\n')}
                      onChange={(e) => setTier(i, 'perks', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))}
                    />
                  </div>
                  <button type="button" onClick={() => setDialog({ kind: 'tier', i, name: t.name })} className={`${btnGhost} mt-4`}>Remove tier</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addTier} disabled={off || !L.tiers.enabled} className={`${btnGhost} mt-3`}>Add a tier</button>
      </EdSection>

      <EdSection index={7} title="Refer a friend" description="Both sides are paid only when the friend's order actually completes.">
        <EdToggle label="Let customers refer friends" checked={L.referral.enabled} onChange={(v) => setG('referral', 'enabled', v)} disabled={off} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdNum label="Points for the person who referred" value={L.referral.referrerPoints} onChange={(v) => setG('referral', 'referrerPoints', v)} min="0" max="100000" disabled={off || !L.referral.enabled} />
          <EdNum label="Points for the new friend" value={L.referral.refereePoints} onChange={(v) => setG('referral', 'refereePoints', v)} min="0" max="100000" disabled={off || !L.referral.enabled} />
          <EdNum label="Friend's order must be at least (PKR)" value={L.referral.minOrderValue} onChange={(v) => setG('referral', 'minOrderValue', v)} min="0" max="1000000" disabled={off || !L.referral.enabled} />
          <EdNum label="Most referrals one person can be paid for, per month" value={L.referral.maxPerMonth} onChange={(v) => setG('referral', 'maxPerMonth', v)} min="1" max="500" disabled={off || !L.referral.enabled} />
          <EdSelect
            label="Pay the referrer when the order is"
            value={L.referral.payOnStatus}
            onChange={(v) => setG('referral', 'payOnStatus', v)}
            disabled={off || !L.referral.enabled}
            options={[
              { value: 'Delivered', label: 'Delivered — safest' },
              { value: 'Shipped', label: 'Shipped' },
              { value: 'Ready to Ship', label: 'Ready to Ship' },
            ]}
          />
          <EdText label="Referral code starts with" value={L.referral.codePrefix} onChange={(v) => setG('referral', 'codePrefix', v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} disabled={off || !L.referral.enabled} hint="Only affects codes created from now on." />
        </div>
      </EdSection>

      <EdSection index={8} title="Store credit">
        <EdToggle label="Use store credit" checked={L.credit.enabled} onChange={(v) => setG('credit', 'enabled', v)} disabled={off} />
        <EdToggle label="Let customers spend credit at checkout" description="Off means only you can apply it manually." checked={L.credit.allowAtCheckout} onChange={(v) => setG('credit', 'allowAtCheckout', v)} disabled={off || !L.credit.enabled} />
      </EdSection>

      <EdSection index={9} title="Gift cards" description="Codes are stored scrambled. You see the full code once, when you create it.">
        <EdToggle label="Use gift cards" checked={L.giftCards.enabled} onChange={(v) => setG('giftCards', 'enabled', v)} disabled={off} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdNum label="Smallest card (PKR)" value={L.giftCards.minAmount} onChange={(v) => setG('giftCards', 'minAmount', v)} min="1" max="1000000" disabled={off || !L.giftCards.enabled} />
          <EdNum label="Largest card (PKR)" value={L.giftCards.maxAmount} onChange={(v) => setG('giftCards', 'maxAmount', v)} min="1" max="1000000" disabled={off || !L.giftCards.enabled} />
          <EdNum label="Card expires after (months)" value={L.giftCards.expiryMonths} onChange={(v) => setG('giftCards', 'expiryMonths', v)} min="0" max="120" disabled={off || !L.giftCards.enabled} hint="0 means never." />
          <EdText label="Card code starts with" value={L.giftCards.codePrefix} onChange={(v) => setG('giftCards', 'codePrefix', v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} disabled={off || !L.giftCards.enabled} />
        </div>
        <Link to="/admin/loyalty?tab=gift-cards" className={`${btnGhost} mt-4`}>Create and manage cards</Link>
      </EdSection>

      <EdSection index={10} title="Achievement badges">
        <EdToggle label="Show badges" checked={L.achievements.enabled} onChange={(v) => setG('achievements', 'enabled', v)} disabled={off} />
        <div className="mt-4 space-y-6">
          {L.achievements.list.map((a, i) => (
            <div key={`${a.id}-${i}`} className="border-b border-white/5 pb-6 last:border-0">
              <div className="grid gap-4 md:grid-cols-2">
                <EdText label="Badge name" value={a.name} onChange={(v) => setAch(i, 'name', v)} disabled={off || !L.achievements.enabled} />
                <EdText label="ID" value={a.id} onChange={(v) => setAch(i, 'id', v.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))} disabled={off || !L.achievements.enabled} />
                <EdSelect
                  label="Earned by" value={a.metric} onChange={(v) => setAch(i, 'metric', v)} disabled={off || !L.achievements.enabled}
                  options={[
                    { value: 'orders', label: 'Number of orders' },
                    { value: 'spend', label: 'Total spend (PKR)' },
                    { value: 'reviews', label: 'Reviews written' },
                    { value: 'referrals', label: 'Friends referred' },
                    { value: 'points', label: 'Points earned' },
                  ]}
                />
                <EdNum label="Reaching" value={a.target} onChange={(v) => setAch(i, 'target', v)} min="1" max="10000000" disabled={off || !L.achievements.enabled} />
                <EdNum label="Bonus points on unlock" value={a.points} onChange={(v) => setAch(i, 'points', v)} min="0" max="100000" disabled={off || !L.achievements.enabled} />
                <EdText label="Short note" value={a.note} onChange={(v) => setAch(i, 'note', v)} disabled={off || !L.achievements.enabled} />
              </div>
              <button type="button" onClick={() => removeAch(i)} className={`${btnGhost} mt-3`}>Remove badge</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addAch} disabled={off || !L.achievements.enabled} className={`${btnGhost} mt-3`}>Add a badge</button>
      </EdSection>

      <EdSection index={11} title="Protection" description="Quiet limits that stop one person draining the programme.">
        <div className="grid gap-4 md:grid-cols-2">
          <EdNum label="Most points one order can earn" value={L.limits.maxPointsPerOrder} onChange={(v) => setG('limits', 'maxPointsPerOrder', v)} min="0" max="1000000" disabled={off} />
          <EdNum label="Most points one customer can earn in a day" value={L.limits.maxPointsPerDay} onChange={(v) => setG('limits', 'maxPointsPerDay', v)} min="0" max="1000000" disabled={off} />
        </div>
        <div className="mt-4">
          <EdToggle label="Stop people referring themselves" description="Blocks a customer signing up again with their own code." checked={L.limits.blockSelfReferral} onChange={(v) => setG('limits', 'blockSelfReferral', v)} disabled={off} />
        </div>
      </EdSection>

      <EdSection index={12} title="Notifications">
        <EdToggle label="Tell customers when they earn points" checked={L.notify.onEarn} onChange={(v) => setG('notify', 'onEarn', v)} disabled={off} />
        <EdToggle label="Tell customers when they reach a new tier" checked={L.notify.onTierUp} onChange={(v) => setG('notify', 'onTierUp', v)} disabled={off} />
        <EdToggle label="Warn customers before points expire" checked={L.notify.onExpiring} onChange={(v) => setG('notify', 'onExpiring', v)} disabled={off} />
        <p className="mt-3 text-[12px] leading-relaxed text-white/30">
          These need an email service connected in Settings → Apps. Until then nothing is sent.
        </p>
      </EdSection>

      <EdSaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setS(JSON.parse(original))} disabled={problems.length > 0} />

      <EdConfirm
        open={dialog?.kind === 'tier'}
        title="Remove tier"
        body={`Remove the "${dialog?.name}" tier? Members in it are moved to the tier below on their next order.`}
        confirmLabel="Remove"
        onCancel={() => setDialog(null)}
        onConfirm={() => removeTier(dialog.i)}
      />
    </AdminLayout>
  );
}
