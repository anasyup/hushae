import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Award, ChevronDown, Gift, Plus, Save, Sparkles, Trash2, Users,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { LOYALTY_DEFAULTS } from '../lib/loyaltyConfig';

/* ============================================================================
 * ADMIN → SETTINGS → LOYALTY & REWARDS
 *
 * Writes exactly one top-level field: `loyalty`. Nothing else on the settings
 * document is touched, so this page can never clobber cart, checkout or theme
 * values a different screen is editing.
 *
 * The whole programme ships OFF. Everything below the master switch is
 * disabled until the merchant turns it on, because a half-configured rewards
 * scheme that is already live is worse than none at all.
 * ========================================================================== */

function Section({ title, description, children, tone }) {
  return (
    <section className={`rounded-md border bg-white p-6 ${tone === 'warn' ? 'border-[#CDB98F]' : 'border-neutral-200'}`}>
      <div className="mb-5">
        <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">{title}</p>
        {description && <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className={`flex min-h-[44px] items-start justify-between gap-4 rounded-md border border-neutral-200 bg-white px-4 py-3 transition ${disabled ? 'opacity-55' : 'cursor-pointer hover:border-neutral-300'}`}>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-neutral-900">{label}</p>
        {description && <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">{description}</p>}
      </div>
      <button
        type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-neutral-900' : 'bg-neutral-300'} ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

/* MEASURED: reading the real accessibility tree of the shipped admin pages
 * showed 11 of 12 fields on /settings/reviews and 16 of 28 on /settings/cart
 * announce NO name at all — a <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500"> sitting next to an
 * input is only visually a label; without htmlFor nothing connects them, so a
 * screen-reader user hears "edit text, blank".
 *
 * useId() gives every field a collision-free id and wires the pair properly.
 * The hint is joined with aria-describedby so it is read after the name
 * instead of being invisible to assistive tech. */
const Num = ({ label, hint, value, onChange, disabled, ...rest }) => {
  const id = useId();
  return (
    <div>
      <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500" htmlFor={id}>{label}</label>
      <input
        id={id} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" value={value ?? 0} disabled={disabled}
        aria-describedby={hint ? `${id}-h` : undefined}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        {...rest}
      />
      {hint && <p id={`${id}-h`} className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">{hint}</p>}
    </div>
  );
};

const Text = ({ label, hint, value, onChange, disabled, ...rest }) => {
  const id = useId();
  return (
    <div>
      <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500" htmlFor={id}>{label}</label>
      <input
        id={id} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={value ?? ''} disabled={disabled}
        aria-describedby={hint ? `${id}-h` : undefined}
        onChange={(e) => onChange(e.target.value)} {...rest}
      />
      {hint && <p id={`${id}-h`} className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">{hint}</p>}
    </div>
  );
};

const Select = ({ label, hint, value, onChange, options, disabled }) => {
  const id = useId();
  return (
    <div>
      <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500" htmlFor={id}>{label}</label>
      <select
        id={id} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={value ?? ''} disabled={disabled}
        aria-describedby={hint ? `${id}-h` : undefined}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p id={`${id}-h`} className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">{hint}</p>}
    </div>
  );
};

/* An earn rule is always the same two controls, so it is one component rather
   than seven copies of the same markup.
 *
 * MEASURED: the pill itself is only 36x20 CSS px. A <button> is a labelable
 * element, so wrapping the header row in a <label> forwards the tap and the
 * real target becomes the full 308x83 row — verified in the browser, not
 * assumed. Without the wrapper these six toggles were the only sub-44px
 * targets on the page. The number input stays OUTSIDE the label, or typing a
 * value would flip the switch. */
function EarnRule({ label, description, on, points, onToggle, onPoints, disabled }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-4 py-3">
      {/* min-h-[44px] on the label, not the pill: rules without a description
          line collapsed to a 24px tap target while described ones were 39px.
          The row is the target, so the row is what must meet the minimum. */}
      <label className={`flex min-h-[44px] items-start justify-between gap-4 ${disabled ? '' : 'cursor-pointer'}`}>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-neutral-900">{label}</p>
          {description && <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">{description}</p>}
        </div>
        <button
          type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled}
          onClick={() => !disabled && onToggle(!on)}
          className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition ${on ? 'bg-neutral-900' : 'bg-neutral-300'} ${disabled ? 'cursor-not-allowed' : ''}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </label>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number" min="0" max="100000" className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 max-w-[140px]"
          value={points ?? 0} disabled={disabled || !on}
          aria-label={`${label} — points awarded`}
          onChange={(e) => onPoints(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        <span className="text-[12px] text-neutral-500">points</span>
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

  useEffect(() => {
    api('/settings')
      .then((d) => {
        // Merge group by group so a partially saved block keeps its siblings.
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
      .catch(() => toast('Could not load settings'));
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!auth?.token) return;
    api('/loyalty/admin/stats', { token: auth.token }).then(setStats).catch(() => {});
  }, [auth?.token]);

  const dirty = useMemo(() => original && JSON.stringify(s) !== original, [s, original]);

  if (!s) return <AdminLayout title="Loyalty & Rewards"><div className="animate-pulse rounded-md bg-neutral-100 h-96 w-full" /></AdminLayout>;

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
    if (!confirm(`Remove the "${L.tiers.levels[i]?.name}" tier? Members in it are moved to the tier below on their next order.`)) return;
    setG('tiers', 'levels', L.tiers.levels.filter((_, idx) => idx !== i));
    setOpenTier(null);
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

  /* Validation runs before the save, not after. A tier ladder that is out of
     order silently mis-ranks every customer, so it is refused here. */
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
    <AdminLayout title="Loyalty & Rewards">
      <Link to="/admin/settings" className="mb-4 -ml-1 inline-flex min-h-[44px] items-center gap-1.5 px-1 text-[12px] font-semibold text-neutral-600 transition hover:text-neutral-900">
        <ArrowLeft size={13} /> Settings
      </Link>

      <div className="mb-6 flex items-start gap-4 border-b border-neutral-200 pb-6">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-neutral-900 text-white">
          <Sparkles size={20} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h2 className="font-sans text-2xl leading-tight text-neutral-900">Loyalty & Rewards</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">
            Points, tiers, referrals, store credit and gift cards. Every rupee is calculated on the
            server — nothing here can be changed by a customer.
          </p>
        </div>
        <Link to="/admin/loyalty" className="ml-auto hidden min-h-[44px] shrink-0 items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 sm:inline-flex">
          <Users size={13} /> Members
        </Link>
      </div>

      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Members', (stats.accounts || 0).toLocaleString('en-PK')],
            ['Points outstanding', (stats.points || 0).toLocaleString('en-PK')],
            ['Store credit', `PKR ${(stats.credit || 0).toLocaleString('en-PK')}`],
            ['Gift cards live', `PKR ${(stats.giftCards?.outstanding || 0).toLocaleString('en-PK')}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md border border-neutral-200 bg-white px-4 py-3">
              <p className="text-[12px] uppercase tracking-wider text-neutral-500">{k}</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">{v}</p>
            </div>
          ))}
        </div>
      )}

      {problems.length > 0 && (
        <div role="alert" className="mb-5 rounded-md border border-[#CDB98F] bg-[#F6F1E6] p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[#5C4A28]">
            <AlertTriangle size={14} /> Fix these before saving
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-[#5C4A28]">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

      <div className="space-y-5">
        {/* ---- Master switch ---------------------------------------------- */}
        <Section
          title="The programme"
          description="While this is off, customers see nothing and no points are awarded — but any balances already earned are kept safely."
        >
          <div className="space-y-3">
            <Toggle
              label="Run the rewards programme"
              description="Turn this on only once the rules below are set the way you want them."
              checked={L.enabled}
              onChange={(v) => set('enabled', v)}
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Text label="Programme name" value={L.programName} onChange={(v) => set('programName', v)} disabled={off} hint="Shown to customers, e.g. HUSHAE Circle." />
            <Text label="Rewards page heading" value={L.dashboardTitle} onChange={(v) => set('dashboardTitle', v)} disabled={off} />
            <Text label="What you call points (many)" value={L.pointsName} onChange={(v) => set('pointsName', v)} disabled={off} hint='e.g. "points", "stars", "coins".' />
            <Text label="What you call one point" value={L.pointsNameOne} onChange={(v) => set('pointsNameOne', v)} disabled={off} />
          </div>
          <div className="mt-4">
            <Text label="Invitation line" value={L.joinText} onChange={(v) => set('joinText', v)} disabled={off} hint="The one sentence that explains the programme to a new shopper." />
          </div>
        </Section>

        {/* ---- Earning ----------------------------------------------------- */}
        <Section
          title="Earning on purchases"
          description="The main way points are earned. Everything else is a bonus on top."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500" htmlFor="loy-spend-per-point">Spend needed for 1 point (PKR)</label>
              <input
                id="loy-spend-per-point" aria-describedby="loy-spend-per-point-h"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="1" max="100000" disabled={off}
                value={spendPerPoint}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setG('earn', 'perCurrency', v > 0 ? 1 / v : 0);
                }}
              />
              <p id="loy-spend-per-point-h" className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">
                {spendPerPoint > 0
                  ? `A PKR 5,000 order earns about ${Math.floor(5000 / spendPerPoint)} points, worth PKR ${Math.floor((5000 / spendPerPoint) * (Number(L.redeem.pointValue) || 1)).toLocaleString('en-PK')} off a future order.`
                  : 'Set a value above zero or purchases earn nothing.'}
              </p>
            </div>
            <Select
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
            <Select
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
          <div className="mt-4 space-y-3">
            <Toggle label="Earn on discounted items too" description="Off means a sale item earns points only on what is left after the discount." checked={L.earn.earnOnDiscounted} onChange={(v) => setG('earn', 'earnOnDiscounted', v)} disabled={off} />
            <Toggle label="Earn on the delivery charge" description="Usually off — you do not keep the courier fee." checked={L.earn.earnOnShipping} onChange={(v) => setG('earn', 'earnOnShipping', v)} disabled={off} />
          </div>
        </Section>

        <Section title="Bonus points" description="One-off rewards that bring people back. Each one can pay only once per customer.">
          <div className="grid gap-3 md:grid-cols-2">
            <EarnRule label="Creating an account" description="Paid the moment they register." on={L.earn.signupEnabled} points={L.earn.signupPoints} onToggle={(v) => setG('earn', 'signupEnabled', v)} onPoints={(v) => setG('earn', 'signupPoints', v)} disabled={off} />
            <EarnRule label="First order" description="On top of the normal purchase points." on={L.earn.firstOrderEnabled} points={L.earn.firstOrderPoints} onToggle={(v) => setG('earn', 'firstOrderEnabled', v)} onPoints={(v) => setG('earn', 'firstOrderPoints', v)} disabled={off} />
            <EarnRule label="Writing a review" description="Paid when you approve the review, not when it is written." on={L.earn.reviewEnabled} points={L.earn.reviewPoints} onToggle={(v) => setG('earn', 'reviewEnabled', v)} onPoints={(v) => setG('earn', 'reviewPoints', v)} disabled={off} />
            <EarnRule label="Joining the newsletter" on={L.earn.newsletterEnabled} points={L.earn.newsletterPoints} onToggle={(v) => setG('earn', 'newsletterEnabled', v)} onPoints={(v) => setG('earn', 'newsletterPoints', v)} disabled={off} />
            <EarnRule label="Completing their profile" on={L.earn.profileEnabled} points={L.earn.profilePoints} onToggle={(v) => setG('earn', 'profileEnabled', v)} onPoints={(v) => setG('earn', 'profilePoints', v)} disabled={off} />
            <EarnRule label="Birthday gift" description="Once a year, on the date they saved. The date cannot be changed afterwards." on={L.earn.birthdayEnabled} points={L.earn.birthdayPoints} onToggle={(v) => setG('earn', 'birthdayEnabled', v)} onPoints={(v) => setG('earn', 'birthdayPoints', v)} disabled={off} />
          </div>
        </Section>

        {/* ---- Redemption -------------------------------------------------- */}
        <Section title="Spending points" description="What a point is worth at checkout, and the limits around it.">
          <div className="space-y-3">
            <Toggle label="Let customers pay with points" checked={L.redeem.enabled} onChange={(v) => setG('redeem', 'enabled', v)} disabled={off} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Num label="1 point is worth (PKR)" value={L.redeem.pointValue} onChange={(v) => setG('redeem', 'pointValue', v)} min="0.1" step="0.1" max="100" disabled={off || !L.redeem.enabled} />
            <Num label="Fewest points they can spend at once" value={L.redeem.minPoints} onChange={(v) => setG('redeem', 'minPoints', v)} min="0" max="100000" disabled={off || !L.redeem.enabled} hint="Stops a 3-point discount cluttering every order." />
            <Num label="Points must be spent in blocks of" value={L.redeem.step} onChange={(v) => setG('redeem', 'step', v)} min="1" max="10000" disabled={off || !L.redeem.enabled} hint="e.g. 50 means they can spend 200 or 250, never 213." />
            <Num label="Most of an order that points can cover (%)" value={L.redeem.maxPercentOfOrder} onChange={(v) => setG('redeem', 'maxPercentOfOrder', v)} min="1" max="100" disabled={off || !L.redeem.enabled} hint="Keep below 100 so every order still brings in some cash." />
          </div>
          <p className="mt-3 rounded-md bg-neutral-50 px-4 py-3 text-[12px] leading-relaxed text-neutral-600">
            On a PKR 5,000 order a customer could take off at most{' '}
            <strong>PKR {Math.floor(5000 * ((Number(L.redeem.maxPercentOfOrder) || 0) / 100)).toLocaleString('en-PK')}</strong>{' '}
            — that is {Math.floor((5000 * ((Number(L.redeem.maxPercentOfOrder) || 0) / 100)) / (Number(L.redeem.pointValue) || 1)).toLocaleString('en-PK')} points.
          </p>
        </Section>

        <Section title="Points expiry" description="Unused points that never expire sit on your books forever as a liability.">
          <div className="space-y-3">
            <Toggle label="Points expire" checked={L.expiry.enabled} onChange={(v) => setG('expiry', 'enabled', v)} disabled={off} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Num label="Points last for (months)" value={L.expiry.months} onChange={(v) => setG('expiry', 'months', v)} min="1" max="120" disabled={off || !L.expiry.enabled} />
            <Num label="Warn the customer this many days before" value={L.expiry.warnDays} onChange={(v) => setG('expiry', 'warnDays', v)} min="1" max="180" disabled={off || !L.expiry.enabled} hint="A warning turns an expiry into a reason to shop." />
          </div>
        </Section>

        {/* ---- Tiers ------------------------------------------------------- */}
        <Section title="VIP tiers" description="Spend more, earn faster. Qualifying spend counts delivered orders only.">
          <div className="space-y-3">
            <Toggle label="Use tiers" checked={L.tiers.enabled} onChange={(v) => setG('tiers', 'enabled', v)} disabled={off} />
          </div>
          <div className="mt-4">
            <Num label="Spend is counted over the last (months)" value={L.tiers.windowMonths} onChange={(v) => setG('tiers', 'windowMonths', v)} min="0" max="120" disabled={off || !L.tiers.enabled} hint="0 means lifetime spend — nobody is ever demoted." />
          </div>

          <div className="mt-5 space-y-2">
            {L.tiers.levels.map((t, i) => (
              <div key={`${t.id}-${i}`} className="overflow-hidden rounded-md border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setOpenTier(openTier === i ? null : i)}
                  aria-expanded={openTier === i}
                  className="flex w-full items-center gap-3 bg-white px-4 py-3 text-left transition hover:bg-neutral-50"
                >
                  <span className="h-6 w-6 shrink-0 rounded-full border border-black/10" style={{ background: t.colour || '#C9BFB4' }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-neutral-900">{t.name || t.id}</span>
                    <span className="block text-[12px] text-neutral-500">
                      From PKR {(t.minSpend || 0).toLocaleString('en-PK')} · {t.multiplier || 1}× points
                      {t.freeShipping ? ' · free delivery' : ''}
                      {t.discountPercent ? ` · ${t.discountPercent}% off` : ''}
                    </span>
                  </span>
                  <ChevronDown size={16} className={`shrink-0 text-neutral-400 transition ${openTier === i ? 'rotate-180' : ''}`} />
                </button>

                {openTier === i && (
                  <div className="border-t border-neutral-200 bg-neutral-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Text label="Name" value={t.name} onChange={(v) => setTier(i, 'name', v)} disabled={off || !L.tiers.enabled} />
                      <Text label="ID (never change this once live)" value={t.id} onChange={(v) => setTier(i, 'id', v.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))} disabled={off || !L.tiers.enabled} hint="Members are stored against this ID." />
                      <Num label="Reached at spend (PKR)" value={t.minSpend} onChange={(v) => setTier(i, 'minSpend', v)} min="0" max="100000000" disabled={off || !L.tiers.enabled} />
                      <Num label="Points multiplier" value={t.multiplier} onChange={(v) => setTier(i, 'multiplier', v)} min="1" max="10" step="0.05" disabled={off || !L.tiers.enabled} />
                      <Num label="Member discount (%)" value={t.discountPercent} onChange={(v) => setTier(i, 'discountPercent', v)} min="0" max="90" disabled={off || !L.tiers.enabled} />
                      <div>
                        <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500" htmlFor={`tier-colour-${i}`}>Badge colour</label>
                        <div className="flex items-center gap-2">
                          <input id={`tier-colour-${i}`} type="color" aria-label={`${t.name || t.id} badge colour, colour picker`} className="h-10 w-14 cursor-pointer rounded-md border border-neutral-300 bg-white p-1" value={t.colour || '#C9BFB4'} onChange={(e) => setTier(i, 'colour', e.target.value)} disabled={off || !L.tiers.enabled} />
                          <input aria-label={`${t.name || t.id} badge colour, hex code`} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={t.colour || ''} onChange={(e) => setTier(i, 'colour', e.target.value)} disabled={off || !L.tiers.enabled} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Toggle label="Free delivery for this tier" checked={t.freeShipping} onChange={(v) => setTier(i, 'freeShipping', v)} disabled={off || !L.tiers.enabled} />
                    </div>
                    <div className="mt-4">
                      <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500" htmlFor={`tier-perks-${i}`}>Perks shown to the customer (one per line)</label>
                      <textarea
                        id={`tier-perks-${i}`}
                        className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 min-h-[88px]" disabled={off || !L.tiers.enabled}
                        value={(t.perks || []).join('\n')}
                        onChange={(e) => setTier(i, 'perks', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))}
                      />
                    </div>
                    <button type="button" onClick={() => removeTier(i)} className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-[#E0C6BE] px-3 py-1.5 text-[12px] font-semibold text-[#9A5548] transition hover:bg-[#F5EDEB]">
                      <Trash2 size={13} /> Remove tier
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={addTier} disabled={off || !L.tiers.enabled} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50">
            <Plus size={13} /> Add a tier
          </button>
        </Section>

        {/* ---- Referrals --------------------------------------------------- */}
        <Section title="Refer a friend" description="Both sides are paid only when the friend's order actually completes.">
          <div className="space-y-3">
            <Toggle label="Let customers refer friends" checked={L.referral.enabled} onChange={(v) => setG('referral', 'enabled', v)} disabled={off} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Num label="Points for the person who referred" value={L.referral.referrerPoints} onChange={(v) => setG('referral', 'referrerPoints', v)} min="0" max="100000" disabled={off || !L.referral.enabled} />
            <Num label="Points for the new friend" value={L.referral.refereePoints} onChange={(v) => setG('referral', 'refereePoints', v)} min="0" max="100000" disabled={off || !L.referral.enabled} />
            <Num label="Friend's order must be at least (PKR)" value={L.referral.minOrderValue} onChange={(v) => setG('referral', 'minOrderValue', v)} min="0" max="1000000" disabled={off || !L.referral.enabled} />
            <Num label="Most referrals one person can be paid for, per month" value={L.referral.maxPerMonth} onChange={(v) => setG('referral', 'maxPerMonth', v)} min="1" max="500" disabled={off || !L.referral.enabled} />
            <Select
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
            <Text label="Referral code starts with" value={L.referral.codePrefix} onChange={(v) => setG('referral', 'codePrefix', v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} disabled={off || !L.referral.enabled} hint="Only affects codes created from now on." />
          </div>
        </Section>

        {/* ---- Credit & gift cards ----------------------------------------- */}
        <Section title="Store credit" description="Real money you owe a customer — from a refund, a goodwill gesture, or a returned order.">
          <div className="space-y-3">
            <Toggle label="Use store credit" checked={L.credit.enabled} onChange={(v) => setG('credit', 'enabled', v)} disabled={off} />
            <Toggle label="Let customers spend credit at checkout" description="Off means only you can apply it manually." checked={L.credit.allowAtCheckout} onChange={(v) => setG('credit', 'allowAtCheckout', v)} disabled={off || !L.credit.enabled} />
          </div>
        </Section>

        <Section title="Gift cards" description="Codes are stored scrambled, like a password. You see the full code once, when you create it.">
          <div className="space-y-3">
            <Toggle label="Use gift cards" checked={L.giftCards.enabled} onChange={(v) => setG('giftCards', 'enabled', v)} disabled={off} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Num label="Smallest card (PKR)" value={L.giftCards.minAmount} onChange={(v) => setG('giftCards', 'minAmount', v)} min="1" max="1000000" disabled={off || !L.giftCards.enabled} />
            <Num label="Largest card (PKR)" value={L.giftCards.maxAmount} onChange={(v) => setG('giftCards', 'maxAmount', v)} min="1" max="1000000" disabled={off || !L.giftCards.enabled} />
            <Num label="Card expires after (months)" value={L.giftCards.expiryMonths} onChange={(v) => setG('giftCards', 'expiryMonths', v)} min="0" max="120" disabled={off || !L.giftCards.enabled} hint="0 means never." />
            <Text label="Card code starts with" value={L.giftCards.codePrefix} onChange={(v) => setG('giftCards', 'codePrefix', v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} disabled={off || !L.giftCards.enabled} />
          </div>
          <Link to="/admin/loyalty?tab=gift-cards" className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
            <Gift size={13} /> Create and manage cards
          </Link>
        </Section>

        {/* ---- Achievements ------------------------------------------------ */}
        <Section title="Achievement badges" description="Small milestones that make the rewards page feel like progress rather than a receipt.">
          <div className="space-y-3">
            <Toggle label="Show badges" checked={L.achievements.enabled} onChange={(v) => setG('achievements', 'enabled', v)} disabled={off} />
          </div>
          <div className="mt-4 space-y-3">
            {L.achievements.list.map((a, i) => (
              <div key={`${a.id}-${i}`} className="rounded-md border border-neutral-200 bg-white p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Text label="Badge name" value={a.name} onChange={(v) => setAch(i, 'name', v)} disabled={off || !L.achievements.enabled} />
                  <Text label="ID" value={a.id} onChange={(v) => setAch(i, 'id', v.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))} disabled={off || !L.achievements.enabled} />
                  <Select
                    label="Earned by" value={a.metric} onChange={(v) => setAch(i, 'metric', v)} disabled={off || !L.achievements.enabled}
                    options={[
                      { value: 'orders', label: 'Number of orders' },
                      { value: 'spend', label: 'Total spend (PKR)' },
                      { value: 'reviews', label: 'Reviews written' },
                      { value: 'referrals', label: 'Friends referred' },
                      { value: 'points', label: 'Points earned' },
                    ]}
                  />
                  <Num label="Reaching" value={a.target} onChange={(v) => setAch(i, 'target', v)} min="1" max="10000000" disabled={off || !L.achievements.enabled} />
                  <Num label="Bonus points on unlock" value={a.points} onChange={(v) => setAch(i, 'points', v)} min="0" max="100000" disabled={off || !L.achievements.enabled} />
                  <Text label="Short note" value={a.note} onChange={(v) => setAch(i, 'note', v)} disabled={off || !L.achievements.enabled} />
                </div>
                <button type="button" onClick={() => removeAch(i)} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-[#E0C6BE] px-3 py-1.5 text-[12px] font-semibold text-[#9A5548] transition hover:bg-[#F5EDEB]">
                  <Trash2 size={13} /> Remove badge
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addAch} disabled={off || !L.achievements.enabled} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50">
            <Plus size={13} /> Add a badge
          </button>
        </Section>

        {/* ---- Abuse ------------------------------------------------------- */}
        <Section title="Protection" description="Quiet limits that stop one person draining the programme. Your own manual adjustments ignore these.">
          <div className="grid gap-4 md:grid-cols-2">
            <Num label="Most points one order can earn" value={L.limits.maxPointsPerOrder} onChange={(v) => setG('limits', 'maxPointsPerOrder', v)} min="0" max="1000000" disabled={off} />
            <Num label="Most points one customer can earn in a day" value={L.limits.maxPointsPerDay} onChange={(v) => setG('limits', 'maxPointsPerDay', v)} min="0" max="1000000" disabled={off} />
          </div>
          <div className="mt-4 space-y-3">
            <Toggle label="Stop people referring themselves" description="Blocks a customer signing up again with their own code." checked={L.limits.blockSelfReferral} onChange={(v) => setG('limits', 'blockSelfReferral', v)} disabled={off} />
          </div>
        </Section>

        <Section title="Notifications">
          <div className="space-y-3">
            <Toggle label="Tell customers when they earn points" checked={L.notify.onEarn} onChange={(v) => setG('notify', 'onEarn', v)} disabled={off} />
            <Toggle label="Tell customers when they reach a new tier" checked={L.notify.onTierUp} onChange={(v) => setG('notify', 'onTierUp', v)} disabled={off} />
            <Toggle label="Warn customers before points expire" checked={L.notify.onExpiring} onChange={(v) => setG('notify', 'onExpiring', v)} disabled={off} />
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">
            These need an email service connected in Settings → Apps & Integrations. Until then nothing is sent,
            and the rewards page is where customers see their balance.
          </p>
        </Section>
      </div>

      {dirty && (
        <div className="sticky bottom-4 z-30 mt-6 flex items-center justify-between gap-4 rounded-md border border-neutral-900 bg-neutral-900 px-4 py-3 text-white shadow-md">
          <p className="text-[13px] font-medium">Unsaved changes</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setS(JSON.parse(original))} className="min-h-[44px] rounded-md border border-white/20 px-3 py-1.5 text-[12px] font-semibold text-white/80 transition hover:bg-white/10">Discard</button>
            <button onClick={save} disabled={busy || problems.length > 0} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md bg-white px-4 py-1.5 text-[12px] font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50">
              <Save size={13} /> {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
