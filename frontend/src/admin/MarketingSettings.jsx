import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { Num, SaveBar, Section, Select, Text, Toggle } from './ui/Controls';
import { btnGhost } from './orders/orderUi';

const ESection = (p) => <Section variant="editorial" {...p} />;
const EToggle = (p) => <Toggle variant="editorial" {...p} />;
const ENum = (p) => <Num variant="editorial" {...p} />;
const EText = (p) => <Text variant="editorial" {...p} />;
const ESelect = (p) => <Select variant="editorial" {...p} />;

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
  if (!s) return <AdminLayout title="Marketing rules"><div className="h-96 animate-pulse bg-white/5" /></AdminLayout>;

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
      <PageHeader
        title="Marketing rules"
        description="The limits every promotion has to obey, and the extras that help customers buy more."
        actions={<Link to="/admin/promotions" className={btnGhost}><ArrowLeft size={12} /> Promotions</Link>}
      />

      {problems.length > 0 && (
        <div role="alert" className="mb-8 border-y border-white/15 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white">Check these</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-white/55">
            {problems.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
      )}

      <div className="space-y-5">
        <ESection title="Master switch">
          <EToggle
            label="Run automatic promotions"
            description="While this is off, no promotion applies to any basket — whatever their own settings say. Turn it on once your rules are ready."
            checked={M.enabled}
            onChange={(v) => set('enabled', v)}
          />
        </ESection>

        <ESection
          title="Your discount floor"
          description="The single most important number on this page."
          tone="warn"
        >
          <div className="mb-4 text-[12px] leading-relaxed text-white/40">
            Every product in your shop already shows a compare-at price — an average markdown of
            about 22%. On top of that a customer can use a coupon, then loyalty points, then store
            credit, then a gift card. Without a ceiling those add up: a PKR 1,550 item can reach
            checkout at PKR 540. This setting caps what <strong>promotions</strong> can add to that.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ENum
              label="Promotions can never exceed (% of basket)"
              value={M.maxTotalDiscountPercent}
              onChange={(v) => set('maxTotalDiscountPercent', v)}
              min="1" max="100"
              hint="If the rules produce more than this, the smallest offers are trimmed first so your headline offer survives."
            />
            <ENum
              label="Keep at least this margin over cost (%)"
              value={M.minMarginPercent}
              onChange={(v) => set('minMarginPercent', v)}
              min="0" max="90"
              hint="0 = not enforced."
            />
          </div>
          <p className="mt-3 text-[12px] text-white/40">
            On a PKR 5,000 basket, promotions could take off at most{' '}
            <strong>PKR {Math.round(5000 * ((Number(M.maxTotalDiscountPercent) || 0) / 100)).toLocaleString('en-PK')}</strong>.
          </p>
        </ESection>

        <ESection title="How promotions combine" description="What happens when two rules could apply to the same item.">
          <div className="space-y-3">
            <EToggle
              label="Allow two promotions on the same item"
              description="Off means one discount per item — the higher-priority promotion wins and the other is discarded. Safer, and what most shops want."
              checked={M.allowStacking}
              onChange={(v) => set('allowStacking', v)}
            />
            <EToggle
              label="Allow promotions alongside coupon codes"
              description="Off means entering a code turns automatic promotions off for that order."
              checked={M.allowWithCoupon}
              onChange={(v) => set('allowWithCoupon', v)}
            />
          </div>
        </ESection>

        <ESection title="Flash sales" description="The countdown and urgency shown to customers.">
          <div className="space-y-3">
            <EToggle label="Enable flash sale features" checked={M.flash?.enabled} onChange={(v) => setG('flash', 'enabled', v)} />
            <EToggle label="Show a countdown timer" checked={M.flash?.showCountdown} onChange={(v) => setG('flash', 'showCountdown', v)} disabled={!M.flash?.enabled} />
            <EToggle label="Show how many are left in stock" checked={M.flash?.showStockLeft} onChange={(v) => setG('flash', 'showStockLeft', v)} disabled={!M.flash?.enabled} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <EText label="Countdown wording" value={M.flash?.countdownLabel} onChange={(v) => setG('flash', 'countdownLabel', v)} disabled={!M.flash?.enabled} />
            <ENum label="Look urgent in the last (minutes)" value={M.flash?.urgencyMinutes} onChange={(v) => setG('flash', 'urgencyMinutes', v)} min="1" max="1440" disabled={!M.flash?.enabled} />
          </div>
        </ESection>

        <ESection
          title="Automatic product badges"
          description="New, Sale, Trending, Best seller, Limited stock — worked out from your real data, not typed in by hand."
        >
          <div className="space-y-3">
            <EToggle label="Show automatic badges" checked={M.badges?.enabled} onChange={(v) => setG('badges', 'enabled', v)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ENum label="Count as “New” for (days)" value={M.badges?.newDays} onChange={(v) => setG('badges', 'newDays', v)} min="1" max="120" disabled={!M.badges?.enabled} />
            <ENum
              label="Only show “Sale” above (% off)"
              value={M.badges?.minSalePercent}
              onChange={(v) => setG('badges', 'minSalePercent', v)}
              min="0" max="90" disabled={!M.badges?.enabled}
              hint="All 101 of your products carry a compare-at price. Without a floor here, the Sale badge appears on every card and stops meaning anything."
            />
            <ENum label="“Limited stock” when fewer than" value={M.badges?.limitedStockThreshold} onChange={(v) => setG('badges', 'limitedStockThreshold', v)} min="1" max="50" disabled={!M.badges?.enabled} />
            <ENum label="Most badges on one card" value={M.badges?.maxPerCard} onChange={(v) => setG('badges', 'maxPerCard', v)} min="1" max="4" disabled={!M.badges?.enabled} hint="Two is information. Four is noise." />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <EToggle label="New" checked={M.badges?.showNew} onChange={(v) => setG('badges', 'showNew', v)} disabled={!M.badges?.enabled} />
            <EToggle label="Sale" checked={M.badges?.showSale} onChange={(v) => setG('badges', 'showSale', v)} disabled={!M.badges?.enabled} />
            <EToggle label="Trending" checked={M.badges?.showTrending} onChange={(v) => setG('badges', 'showTrending', v)} disabled={!M.badges?.enabled} />
            <EToggle label="Best seller" checked={M.badges?.showBestSeller} onChange={(v) => setG('badges', 'showBestSeller', v)} disabled={!M.badges?.enabled} />
            <EToggle label="Limited stock" checked={M.badges?.showLimitedStock} onChange={(v) => setG('badges', 'showLimitedStock', v)} disabled={!M.badges?.enabled} />
          </div>
        </ESection>

        <ESection title="Suggestions in the basket" description="Extra products offered while a customer is checking out.">
          <div className="space-y-3">
            <EToggle label="Suggest add-ons in the basket" checked={M.upsell?.enabled} onChange={(v) => setG('upsell', 'enabled', v)} />
            <EToggle label="Show “goes well with” on product pages" checked={M.crossSell?.enabled} onChange={(v) => setG('crossSell', 'enabled', v)} />
            <EToggle label="Show “frequently bought together”" description="Worked out from your real orders, not guessed." checked={M.boughtTogether?.enabled} onChange={(v) => setG('boughtTogether', 'enabled', v)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <EText label="Add-ons heading" value={M.upsell?.title} onChange={(v) => setG('upsell', 'title', v)} disabled={!M.upsell?.enabled} />
            <ENum label="How many add-ons" value={M.upsell?.count} onChange={(v) => setG('upsell', 'count', v)} min="1" max="12" disabled={!M.upsell?.enabled} />
            <EText label="“Goes well with” heading" value={M.crossSell?.title} onChange={(v) => setG('crossSell', 'title', v)} disabled={!M.crossSell?.enabled} />
            <ENum label="Bought-together needs this many shared orders" value={M.boughtTogether?.minCoOccur} onChange={(v) => setG('boughtTogether', 'minCoOccur', v)} min="1" max="20" disabled={!M.boughtTogether?.enabled} hint="Below this it is coincidence, not a pattern." />
          </div>
        </ESection>

        <ESection title="Scheduling">
          <div className="grid gap-4 md:grid-cols-2">
            <ESelect
              label="Timezone"
              value={M.schedule?.timezone}
              onChange={(v) => setG('schedule', 'timezone', v)}
              options={[{ value: 'Asia/Karachi', label: 'Pakistan (Asia/Karachi)' }]}
              hint="Promotion times are read in this timezone."
            />
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-white/40">
            Schedules are checked every time a basket is priced, not by a background job. A
            promotion starts and stops exactly on time without anything needing to be running.
          </p>
        </ESection>
      </div>

      <SaveBar
        dirty={dirty} busy={busy} disabled={problems.length > 0}
        onSave={save} onDiscard={() => setS(JSON.parse(original))}
      />
    </AdminLayout>
  );
}
