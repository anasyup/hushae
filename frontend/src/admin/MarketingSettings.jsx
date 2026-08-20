import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BadgePercent, Megaphone } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import { Num, SaveBar, Section, Select, Text, Toggle } from './ui/Controls';

/* ============================================================================
 * ADMIN → MARKETING RULES
 *
 * Writes exactly one top-level field: `marketing`. Nothing else on the
 * settings document is touched, so this cannot clobber values another screen
 * is editing.
 *
 * The first section is the one that matters. Measured on the live catalogue
 * before Part 1: every one of 101 products carries a compare-at price, a
 * coupon stacks on that with no cap, then loyalty points, then store credit
 * and gift cards — a PKR 1,550 item could reach the till at PKR 540 with
 * nobody having decided that. maxTotalDiscountPercent is the floor that was
 * missing, so it is explained here rather than buried in an accordion.
 * ========================================================================== */

export default function MarketingSettings() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/settings')
      .then((d) => { setS(d.settings); setOriginal(JSON.stringify(d.settings)); })
      .catch(() => toast('Could not load settings'));
  }, []); // eslint-disable-line

  const dirty = useMemo(() => original && JSON.stringify(s) !== original, [s, original]);
  if (!s) return <AdminLayout title="Marketing"><div className="animate-pulse rounded-xl bg-neutral-100 h-96 w-full" /></AdminLayout>;

  const M = s.marketing || {};
  const set = (k, v) => setS({ ...s, marketing: { ...M, [k]: v } });
  const setG = (g, k, v) => setS({ ...s, marketing: { ...M, [g]: { ...(M[g] || {}), [k]: v } } });

  const problems = [];
  if (M.maxTotalDiscountPercent > 90) problems.push('A ceiling above 90% means you can sell at almost nothing.');
  if (M.maxTotalDiscountPercent <= 0) problems.push('A ceiling of 0 blocks every promotion.');

  const save = async () => {
    if (problems.length) { toast('Fix the problems first'); return; }
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { marketing: M } });
      setOriginal(JSON.stringify(s));
      toast('Marketing rules saved');
    } catch (e) { toast(e.message || 'Save failed'); }
    setBusy(false);
  };

  return (
    <AdminLayout title="Marketing rules">
      <Link to="/admin/promotions" className="mb-4 -ml-1 inline-flex min-h-[44px] items-center gap-1.5 px-1 text-[12px] font-semibold text-neutral-600 transition hover:text-neutral-900">
        <ArrowLeft size={13} /> Promotions
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
            <Megaphone size={20} strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="font-sans text-2xl leading-tight text-neutral-900">Marketing rules</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">
              The limits every promotion has to obey, and the extras that help customers buy more.
            </p>
          </div>
        </div>
        <Link to="/admin/promotions" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
          <BadgePercent size={13} /> Promotions
        </Link>
      </div>

      {problems.length > 0 && (
        <div role="alert" className="mb-5 rounded-2xl border border-[#CDB98F] bg-[#F6F1E6] p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[#5C4A28]">
            <AlertTriangle size={14} /> Check these
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-[#5C4A28]">
            {problems.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
      )}

      <div className="space-y-5">
        <Section title="Master switch">
          <Toggle
            label="Run automatic promotions"
            description="While this is off, no promotion applies to any basket — whatever their own settings say. Turn it on once your rules are ready."
            checked={M.enabled}
            onChange={(v) => set('enabled', v)}
          />
        </Section>

        <Section
          title="Your discount floor"
          description="The single most important number on this page."
          tone="warn"
        >
          <div className="mb-4 rounded-xl bg-[#F6F1E6] px-4 py-3 text-[12px] leading-relaxed text-[#5C4A28]">
            Every product in your shop already shows a compare-at price — an average markdown of
            about 22%. On top of that a customer can use a coupon, then loyalty points, then store
            credit, then a gift card. Without a ceiling those add up: a PKR 1,550 item can reach
            checkout at PKR 540. This setting caps what <strong>promotions</strong> can add to that.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Num
              label="Promotions can never exceed (% of basket)"
              value={M.maxTotalDiscountPercent}
              onChange={(v) => set('maxTotalDiscountPercent', v)}
              min="1" max="100"
              hint="If the rules produce more than this, the smallest offers are trimmed first so your headline offer survives."
            />
            <Num
              label="Keep at least this margin over cost (%)"
              value={M.minMarginPercent}
              onChange={(v) => set('minMarginPercent', v)}
              min="0" max="90"
              hint="0 = not enforced."
            />
          </div>
          <p className="mt-3 rounded-xl bg-neutral-50 px-4 py-3 text-[12px] text-neutral-600">
            On a PKR 5,000 basket, promotions could take off at most{' '}
            <strong>PKR {Math.round(5000 * ((Number(M.maxTotalDiscountPercent) || 0) / 100)).toLocaleString('en-PK')}</strong>.
          </p>
        </Section>

        <Section title="How promotions combine" description="What happens when two rules could apply to the same item.">
          <div className="space-y-3">
            <Toggle
              label="Allow two promotions on the same item"
              description="Off means one discount per item — the higher-priority promotion wins and the other is discarded. Safer, and what most shops want."
              checked={M.allowStacking}
              onChange={(v) => set('allowStacking', v)}
            />
            <Toggle
              label="Allow promotions alongside coupon codes"
              description="Off means entering a code turns automatic promotions off for that order."
              checked={M.allowWithCoupon}
              onChange={(v) => set('allowWithCoupon', v)}
            />
          </div>
        </Section>

        <Section title="Flash sales" description="The countdown and urgency shown to customers.">
          <div className="space-y-3">
            <Toggle label="Enable flash sale features" checked={M.flash?.enabled} onChange={(v) => setG('flash', 'enabled', v)} />
            <Toggle label="Show a countdown timer" checked={M.flash?.showCountdown} onChange={(v) => setG('flash', 'showCountdown', v)} disabled={!M.flash?.enabled} />
            <Toggle label="Show how many are left in stock" checked={M.flash?.showStockLeft} onChange={(v) => setG('flash', 'showStockLeft', v)} disabled={!M.flash?.enabled} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Text label="Countdown wording" value={M.flash?.countdownLabel} onChange={(v) => setG('flash', 'countdownLabel', v)} disabled={!M.flash?.enabled} />
            <Num label="Look urgent in the last (minutes)" value={M.flash?.urgencyMinutes} onChange={(v) => setG('flash', 'urgencyMinutes', v)} min="1" max="1440" disabled={!M.flash?.enabled} />
          </div>
        </Section>

        <Section
          title="Automatic product badges"
          description="New, Sale, Trending, Best seller, Limited stock — worked out from your real data, not typed in by hand."
        >
          <div className="space-y-3">
            <Toggle label="Show automatic badges" checked={M.badges?.enabled} onChange={(v) => setG('badges', 'enabled', v)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Num label="Count as “New” for (days)" value={M.badges?.newDays} onChange={(v) => setG('badges', 'newDays', v)} min="1" max="120" disabled={!M.badges?.enabled} />
            <Num
              label="Only show “Sale” above (% off)"
              value={M.badges?.minSalePercent}
              onChange={(v) => setG('badges', 'minSalePercent', v)}
              min="0" max="90" disabled={!M.badges?.enabled}
              hint="All 101 of your products carry a compare-at price. Without a floor here, the Sale badge appears on every card and stops meaning anything."
            />
            <Num label="“Limited stock” when fewer than" value={M.badges?.limitedStockThreshold} onChange={(v) => setG('badges', 'limitedStockThreshold', v)} min="1" max="50" disabled={!M.badges?.enabled} />
            <Num label="Most badges on one card" value={M.badges?.maxPerCard} onChange={(v) => setG('badges', 'maxPerCard', v)} min="1" max="4" disabled={!M.badges?.enabled} hint="Two is information. Four is noise." />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Toggle label="New" checked={M.badges?.showNew} onChange={(v) => setG('badges', 'showNew', v)} disabled={!M.badges?.enabled} />
            <Toggle label="Sale" checked={M.badges?.showSale} onChange={(v) => setG('badges', 'showSale', v)} disabled={!M.badges?.enabled} />
            <Toggle label="Trending" checked={M.badges?.showTrending} onChange={(v) => setG('badges', 'showTrending', v)} disabled={!M.badges?.enabled} />
            <Toggle label="Best seller" checked={M.badges?.showBestSeller} onChange={(v) => setG('badges', 'showBestSeller', v)} disabled={!M.badges?.enabled} />
            <Toggle label="Limited stock" checked={M.badges?.showLimitedStock} onChange={(v) => setG('badges', 'showLimitedStock', v)} disabled={!M.badges?.enabled} />
          </div>
        </Section>

        <Section title="Suggestions in the basket" description="Extra products offered while a customer is checking out.">
          <div className="space-y-3">
            <Toggle label="Suggest add-ons in the basket" checked={M.upsell?.enabled} onChange={(v) => setG('upsell', 'enabled', v)} />
            <Toggle label="Show “goes well with” on product pages" checked={M.crossSell?.enabled} onChange={(v) => setG('crossSell', 'enabled', v)} />
            <Toggle label="Show “frequently bought together”" description="Worked out from your real orders, not guessed." checked={M.boughtTogether?.enabled} onChange={(v) => setG('boughtTogether', 'enabled', v)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Text label="Add-ons heading" value={M.upsell?.title} onChange={(v) => setG('upsell', 'title', v)} disabled={!M.upsell?.enabled} />
            <Num label="How many add-ons" value={M.upsell?.count} onChange={(v) => setG('upsell', 'count', v)} min="1" max="12" disabled={!M.upsell?.enabled} />
            <Text label="“Goes well with” heading" value={M.crossSell?.title} onChange={(v) => setG('crossSell', 'title', v)} disabled={!M.crossSell?.enabled} />
            <Num label="Bought-together needs this many shared orders" value={M.boughtTogether?.minCoOccur} onChange={(v) => setG('boughtTogether', 'minCoOccur', v)} min="1" max="20" disabled={!M.boughtTogether?.enabled} hint="Below this it is coincidence, not a pattern." />
          </div>
        </Section>

        <Section title="Scheduling">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Timezone"
              value={M.schedule?.timezone}
              onChange={(v) => setG('schedule', 'timezone', v)}
              options={[{ value: 'Asia/Karachi', label: 'Pakistan (Asia/Karachi)' }]}
              hint="Promotion times are read in this timezone."
            />
          </div>
          <p className="mt-3 rounded-xl bg-neutral-50 px-4 py-3 text-[12px] leading-relaxed text-neutral-600">
            Schedules are checked every time a basket is priced, not by a background job. A
            promotion starts and stops exactly on time without anything needing to be running.
          </p>
        </Section>
      </div>

      <SaveBar
        dirty={dirty} busy={busy} disabled={problems.length > 0}
        onSave={save} onDiscard={() => setS(JSON.parse(original))}
      />
    </AdminLayout>
  );
}
