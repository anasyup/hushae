import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgePercent, Play, Save, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import { Accordion, DateTime, Num, Section, Select, Text, Toggle } from './ui/Controls';
import { DAYS, EMPTY_PROMO, PROMO_TYPES, hasField, minToTime, timeToMin, typeOf } from './promotions/promoTypes';
import PromoPreview from './promotions/PromoPreview';

/* ============================================================================
 * PROMOTION BUILDER — create and edit.
 *
 * One screen for all seven types. The type picker decides which sections are
 * shown, from the registry in promoTypes.js: rendering every option for every
 * type is a wall of controls nobody reads, and offering "buy quantity" on a
 * free-delivery promotion is a support ticket waiting to happen.
 *
 * Advanced settings are collapsed by default. A merchant creating "10% off
 * bras" should not have to scroll past per-customer usage caps to reach Save.
 * ========================================================================== */

export default function PromotionEdit() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const { auth, toast } = useApp();
  const nav = useNavigate();

  const [p, setP] = useState(isNew ? { ...EMPTY_PROMO } : null);
  const [original, setOriginal] = useState(isNew ? JSON.stringify(EMPTY_PROMO) : null);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState([]);
  const [cats, setCats] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    api('/categories').then((d) => setCats(d.categories || [])).catch(() => setCats([]));
  }, []);

  useEffect(() => {
    if (isNew || !auth?.token) return;
    api(`/promotions/${id}`, { token: auth.token })
      .then((d) => {
        // Merge onto EMPTY_PROMO so a document saved before a field existed
        // still opens with every control present.
        const merged = { ...EMPTY_PROMO, ...d.promotion };
        for (const k of ['recurring', 'scope', 'bxgy', 'bundle', 'eligibility', 'limits', 'badge']) {
          merged[k] = { ...EMPTY_PROMO[k], ...(d.promotion[k] || {}) };
        }
        setP(merged);
        setOriginal(JSON.stringify(merged));
      })
      .catch(() => toast('Could not load that promotion'));
  }, [id, isNew, auth?.token, toast]);

  const dirty = useMemo(() => original && JSON.stringify(p) !== original, [p, original]);

  if (!p) return <AdminLayout title="Promotion"><div className="skeleton h-96 w-full" /></AdminLayout>;

  const t = typeOf(p.type);
  const set = (k, v) => setP({ ...p, [k]: v });
  const setG = (g, k, v) => setP({ ...p, [g]: { ...p[g], [k]: v } });

  /* Validation mirrors the server's, so the merchant sees the problem before
     a round trip rather than after one. The server still validates — this is
     a courtesy, not a security boundary. */
  const problems = [];
  if (!String(p.name || '').trim()) problems.push('Give the promotion a name.');
  if (['flash', 'percent', 'fixed'].includes(p.type) && !p.discountPercent && !p.discountFixed) {
    problems.push('Set either a percentage or a fixed amount.');
  }
  if (p.discountPercent < 0 || p.discountPercent > 100) problems.push('Percentage must be between 0 and 100.');
  if (p.startsAt && p.endsAt && new Date(p.endsAt) <= new Date(p.startsAt)) {
    problems.push('The end date must be after the start date.');
  }
  if (p.type === 'bundle' && (p.bundle.productIds || []).length < 2) {
    problems.push('A bundle needs at least two products.');
  }
  if (p.type === 'tiered' && !(p.tiers || []).length) problems.push('Add at least one spend tier.');
  if (p.type === 'bxgy' && (p.bxgy.buyQty < 1 || p.bxgy.getQty < 1)) {
    problems.push('Buy and get quantities must be at least 1.');
  }

  const save = async () => {
    if (problems.length) { toast('Fix the problems listed above'); return; }
    setBusy(true); setErrs([]);
    try {
      if (isNew) {
        const r = await api('/promotions', { method: 'POST', token: auth.token, body: p });
        toast('Created — switch it on when you are ready');
        nav(`/admin/promotions/${r.promotion._id}`, { replace: true });
      } else {
        await api(`/promotions/${id}`, { method: 'PUT', token: auth.token, body: p });
        setOriginal(JSON.stringify(p));
        toast('Saved');
      }
    } catch (e) {
      setErrs(e.raw?.errors || [{ message: e.message || 'Could not save' }]);
      toast(e.message || 'Could not save');
    }
    setBusy(false);
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${p.name}"? Its usage history is kept for your records.`)) return;
    try {
      await api(`/promotions/${id}`, { method: 'DELETE', token: auth.token });
      toast('Deleted');
      nav('/admin/promotions');
    } catch (e) { toast(e.message || 'Could not delete'); }
  };

  const toggleDay = (d) => {
    const cur = p.recurring.daysOfWeek || [];
    setG('recurring', 'daysOfWeek', cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort());
  };

  const scopeModes = [
    { value: 'all', label: 'Everything in the shop' },
    { value: 'categories', label: 'Chosen categories' },
    { value: 'tags', label: 'Products with certain tags' },
    { value: 'rules', label: 'Rules (gender, range, price)' },
  ];

  return (
    <AdminLayout title={isNew ? 'New promotion' : p.name || 'Promotion'}>
      <Link to="/admin/promotions" className="mb-4 -ml-1 inline-flex min-h-[44px] items-center gap-1.5 px-1 text-[12px] font-semibold text-neutral-600 transition hover:text-neutral-900">
        <ArrowLeft size={13} /> Promotions
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
            <BadgePercent size={20} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="font-sans text-2xl leading-tight text-neutral-900">
              {isNew ? 'New promotion' : p.name || 'Promotion'}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">{t.help}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPreviewOpen(true)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
            <Play size={13} /> Test it
          </button>
          {!isNew && (
            <button type="button" onClick={remove} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-red-200 px-3 text-[12px] font-semibold text-red-600 transition hover:bg-red-50">
              <Trash2 size={13} /> Delete
            </button>
          )}
          <button type="button" onClick={save} disabled={busy || problems.length > 0} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50">
            <Save size={13} /> {busy ? 'Saving…' : isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      {(problems.length > 0 || errs.length > 0) && (
        <div role="alert" className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <ul className="list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-amber-900">
            {problems.map((x) => <li key={x}>{x}</li>)}
            {errs.map((x, i) => <li key={i}>{x.message}</li>)}
          </ul>
        </div>
      )}

      <div className="space-y-5">
        {/* ---- basics ---- */}
        <Section title="The basics">
          <div className="grid gap-4 md:grid-cols-2">
            <Text label="Name (only you see this)" value={p.name} onChange={(v) => set('name', v)} placeholder="e.g. Eid weekend 20%" />
            <Text label="Label shown to customers" value={p.publicLabel} onChange={(v) => set('publicLabel', v)} hint="Leave blank to apply the discount silently." />
          </div>
          <div className="mt-4">
            <Text label="Private note" value={p.internalNote} onChange={(v) => set('internalNote', v)} hint="Why this exists, for whoever reads it in six months." />
          </div>

          <div className="mt-5">
            <p className="label mb-2">Type of promotion</p>
            <div role="radiogroup" aria-label="Type of promotion" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PROMO_TYPES.map((x) => (
                <button
                  key={x.id} type="button" role="radio" aria-checked={p.type === x.id}
                  onClick={() => set('type', x.id)}
                  className={`min-h-[44px] rounded-xl border px-4 py-3 text-left transition ${p.type === x.id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}
                >
                  <span className="block text-[13px] font-semibold">{x.label}</span>
                  <span className={`mt-0.5 block text-[11px] ${p.type === x.id ? 'text-white/70' : 'text-neutral-600'}`}>{x.example}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <Toggle
              label="Switch this promotion on"
              description="Off means it is saved but does nothing. Everything is created switched off."
              checked={p.enabled}
              onChange={(v) => set('enabled', v)}
            />
          </div>
        </Section>

        {/* ---- the reward ---- */}
        <Section title="The reward" description="What the customer actually gets.">
          {hasField(p.type, 'discountPercent') && (
            <div className="grid gap-4 md:grid-cols-2">
              <Num label="Percentage off" value={p.discountPercent} onChange={(v) => set('discountPercent', v)} min="0" max="100" />
              <Num label="Never take off more than (PKR)" value={p.maxDiscount} onChange={(v) => set('maxDiscount', v)} min="0" hint="0 = no ceiling. Stops 50% off a large basket becoming a giveaway." />
            </div>
          )}
          {hasField(p.type, 'discountFixed') && (
            <div className="grid gap-4 md:grid-cols-2">
              <Num label="Amount off (PKR)" value={p.discountFixed} onChange={(v) => set('discountFixed', v)} min="0" />
            </div>
          )}

          {hasField(p.type, 'bxgy') && (
            <div className="grid gap-4 md:grid-cols-2">
              <Num label="Customer buys" value={p.bxgy.buyQty} onChange={(v) => setG('bxgy', 'buyQty', v)} min="1" max="20" />
              <Num label="…and gets this many" value={p.bxgy.getQty} onChange={(v) => setG('bxgy', 'getQty', v)} min="1" max="20" />
              <Num label="Discount on the free items (%)" value={p.bxgy.getPercent} onChange={(v) => setG('bxgy', 'getPercent', v)} min="1" max="100" hint="100 means completely free." />
              <Num label="Most times one order can claim it" value={p.bxgy.maxPerOrder} onChange={(v) => setG('bxgy', 'maxPerOrder', v)} min="0" max="20" hint="0 = unlimited." />
              <div className="md:col-span-2">
                <Toggle
                  label="Discount the cheapest qualifying item"
                  description="Strongly recommended. Giving away the most expensive item can cost more than the two being bought."
                  checked={p.bxgy.cheapestFree}
                  onChange={(v) => setG('bxgy', 'cheapestFree', v)}
                />
              </div>
            </div>
          )}

          {hasField(p.type, 'bundle') && (
            <>
              <p className="mb-3 text-[12px] leading-relaxed text-neutral-600">
                Paste the product IDs that make up the bundle, one per line. You can copy an ID
                from the address bar on any product page in Inventory.
              </p>
              <label className="label" htmlFor="bundle-ids">Products in the bundle</label>
              <textarea
                id="bundle-ids" className="input min-h-[96px] font-mono text-[12px]"
                value={(p.bundle.productIds || []).join('\n')}
                onChange={(e) => setG('bundle', 'productIds', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))}
              />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Num label="Bundle price (PKR)" value={p.bundle.bundlePrice} onChange={(v) => setG('bundle', 'bundlePrice', v)} min="0" hint="0 = use the percentage above instead." />
                <Num label="Fewest of them needed" value={p.bundle.minItems} onChange={(v) => setG('bundle', 'minItems', v)} min="1" disabled={p.bundle.requireAll} />
              </div>
              <div className="mt-4">
                <Toggle label="All of them must be in the basket" checked={p.bundle.requireAll} onChange={(v) => setG('bundle', 'requireAll', v)} />
              </div>
            </>
          )}

          {hasField(p.type, 'tiers') && (
            <>
              <div className="space-y-2">
                {(p.tiers || []).map((tier, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 p-3">
                    <div className="min-w-[140px] flex-1">
                      <Num label="Spend at least (PKR)" value={tier.minSubtotal} onChange={(v) => set('tiers', p.tiers.map((x, j) => (j === i ? { ...x, minSubtotal: v } : x)))} min="0" />
                    </div>
                    <div className="min-w-[110px] flex-1">
                      <Num label="Save (%)" value={tier.percent} onChange={(v) => set('tiers', p.tiers.map((x, j) => (j === i ? { ...x, percent: v } : x)))} min="0" max="100" />
                    </div>
                    <button
                      type="button" onClick={() => set('tiers', p.tiers.filter((_, j) => j !== i))}
                      aria-label={`Remove tier ${i + 1}`}
                      className="grid h-11 w-11 place-items-center rounded-lg text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => set('tiers', [...(p.tiers || []), { minSubtotal: 0, percent: 0, fixed: 0 }])}
                className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Add a tier
              </button>
            </>
          )}

          {p.type === 'freeship' && (
            <p className="rounded-xl bg-neutral-50 px-4 py-3 text-[12px] leading-relaxed text-neutral-600">
              The delivery charge is waived whenever this promotion applies. Use the conditions
              below to decide who gets it — first orders only, a minimum spend, and so on.
            </p>
          )}
        </Section>

        {/* ---- what it applies to ---- */}
        {hasField(p.type, 'scope') && (
          <Section title="What it applies to">
            <Select
              label="Apply to"
              value={p.scope.mode}
              onChange={(v) => setG('scope', 'mode', v)}
              options={scopeModes}
            />

            {p.scope.mode === 'categories' && (
              <div className="mt-4">
                <p className="label mb-2">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {cats.map((c) => {
                    const on = (p.scope.categorySlugs || []).includes(c.slug);
                    return (
                      <label key={c.slug} className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-4 text-[12px] font-medium transition ${on ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'}`}>
                        <input
                          type="checkbox" checked={on} className="sr-only"
                          onChange={() => setG('scope', 'categorySlugs', on
                            ? p.scope.categorySlugs.filter((x) => x !== c.slug)
                            : [...(p.scope.categorySlugs || []), c.slug])}
                        />
                        {c.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {p.scope.mode === 'tags' && (
              <div className="mt-4">
                <Text
                  label="Tags (comma separated)"
                  value={(p.scope.tags || []).join(', ')}
                  onChange={(v) => setG('scope', 'tags', v.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean))}
                  hint="A product matches if it has any one of these."
                />
              </div>
            )}

            {p.scope.mode === 'rules' && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Select
                  label="Gender" value={p.scope.gender} onChange={(v) => setG('scope', 'gender', v)}
                  options={[{ value: '', label: 'Both' }, { value: 'women', label: 'Women' }, { value: 'men', label: 'Men' }]}
                />
                <div>
                  <p className="label mb-2">Range</p>
                  <div className="flex flex-wrap gap-2">
                    {['Economy', 'Standard', 'Premium'].map((tier) => {
                      const on = (p.scope.tiers || []).includes(tier);
                      return (
                        <label key={tier} className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-4 text-[12px] font-medium transition ${on ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'}`}>
                          <input
                            type="checkbox" checked={on} className="sr-only"
                            onChange={() => setG('scope', 'tiers', on ? p.scope.tiers.filter((x) => x !== tier) : [...(p.scope.tiers || []), tier])}
                          />
                          {tier}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <Num label="Only products above (PKR)" value={p.scope.minPrice ?? 0} onChange={(v) => setG('scope', 'minPrice', v || null)} min="0" />
                <Num label="Only products below (PKR)" value={p.scope.maxPrice ?? 0} onChange={(v) => setG('scope', 'maxPrice', v || null)} min="0" hint="0 = no limit." />
              </div>
            )}

            <div className="mt-4">
              <Toggle
                label="Skip products that are already discounted"
                description="Your catalogue already carries a compare-at price on every product. Leaving this off means the promotion stacks on top of that markdown."
                checked={p.scope.excludeOnSale}
                onChange={(v) => setG('scope', 'excludeOnSale', v)}
              />
            </div>
          </Section>
        )}

        {/* ---- schedule ---- */}
        <Section title="When it runs" description="Leave both dates empty to run until you switch it off.">
          <div className="grid gap-4 md:grid-cols-2">
            <DateTime label="Starts" value={p.startsAt} onChange={(v) => set('startsAt', v)} />
            <DateTime label="Ends" value={p.endsAt} onChange={(v) => set('endsAt', v)} />
          </div>

          <div className="mt-4">
            <Toggle
              label="Only during certain days and hours"
              description="For an evening flash sale or a weekend offer."
              checked={p.recurring.enabled}
              onChange={(v) => setG('recurring', 'enabled', v)}
            />
          </div>

          {p.recurring.enabled && (
            <div className="mt-4">
              <p className="label mb-2">Days</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d, i) => {
                  const on = (p.recurring.daysOfWeek || []).includes(i);
                  return (
                    <label key={d} className={`inline-flex min-h-[44px] w-14 cursor-pointer items-center justify-center rounded-full border text-[12px] font-medium transition ${on ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'}`}>
                      <input type="checkbox" checked={on} onChange={() => toggleDay(i)} className="sr-only" />
                      {d}
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-neutral-600">No days selected means every day.</p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label" htmlFor="rec-from">From</label>
                  <input id="rec-from" type="time" className="input" value={minToTime(p.recurring.startMin)} onChange={(e) => setG('recurring', 'startMin', timeToMin(e.target.value))} />
                </div>
                <div>
                  <label className="label" htmlFor="rec-to">Until</label>
                  <input id="rec-to" type="time" className="input" value={minToTime(p.recurring.endMin)} onChange={(e) => setG('recurring', 'endMin', timeToMin(e.target.value))} />
                  <p className="mt-1.5 text-[11px] text-neutral-600">A window like 22:00 to 02:00 crosses midnight and is handled correctly.</p>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ---- conditions ---- */}
        <Section title="Who gets it">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Customers" value={p.eligibility.audience} onChange={(v) => setG('eligibility', 'audience', v)}
              options={[
                { value: 'all', label: 'Everyone' },
                { value: 'first-order', label: 'First-time customers only' },
                { value: 'returning', label: 'Returning customers only' },
                { value: 'tier', label: 'Certain loyalty tiers' },
                { value: 'phones', label: 'A named list of phone numbers' },
              ]}
            />
            <Num label="Minimum basket (PKR)" value={p.eligibility.minCartTotal} onChange={(v) => setG('eligibility', 'minCartTotal', v)} min="0" hint="0 = no minimum." />
            <Num label="Minimum items in the basket" value={p.eligibility.minCartItems} onChange={(v) => setG('eligibility', 'minCartItems', v)} min="0" />
            <Text
              label="Only these cities (comma separated)"
              value={(p.eligibility.cities || []).join(', ')}
              onChange={(v) => setG('eligibility', 'cities', v.split(',').map((x) => x.trim()).filter(Boolean))}
              hint="Leave blank for everywhere."
            />
          </div>

          {p.eligibility.audience === 'tier' && (
            <div className="mt-4">
              <Text
                label="Loyalty tiers (comma separated ids)"
                value={(p.eligibility.loyaltyTiers || []).join(', ')}
                onChange={(v) => setG('eligibility', 'loyaltyTiers', v.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean))}
                hint="e.g. gold, platinum, diamond"
              />
            </div>
          )}
          {p.eligibility.audience === 'phones' && (
            <div className="mt-4">
              <label className="label" htmlFor="elig-phones">Phone numbers, one per line</label>
              <textarea
                id="elig-phones" className="input min-h-[96px] font-mono text-[12px]"
                value={(p.eligibility.phones || []).join('\n')}
                onChange={(e) => setG('eligibility', 'phones', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))}
              />
            </div>
          )}
        </Section>

        {/* ---- advanced, collapsed ---- */}
        <Accordion title="Priority and stacking" subtitle="How this behaves when another promotion could also apply">
          <div className="grid gap-4 md:grid-cols-2">
            <Num label="Priority" value={p.priority} onChange={(v) => set('priority', v)} min="0" max="1000" hint="Lower wins. Two promotions on the same item: only the higher-priority one applies." />
          </div>
          <div className="mt-4 space-y-3">
            <Toggle label="Can combine with other promotions on the same item" description="Off is safer. Both promotions must allow it, and stacking must be on in Rules." checked={p.stackable} onChange={(v) => set('stackable', v)} />
            <Toggle label="Exclusive — suppress every other promotion" description="Use for a headline sale you do not want anything else layered onto." checked={p.exclusive} onChange={(v) => set('exclusive', v)} />
            <Toggle label="Allow alongside a coupon code" checked={p.allowWithCoupon} onChange={(v) => set('allowWithCoupon', v)} />
          </div>
        </Accordion>

        <Accordion title="Usage limits" subtitle="Caps so one promotion cannot run away with your margin">
          <div className="grid gap-4 md:grid-cols-3">
            <Num label="Total uses allowed" value={p.limits.maxUses} onChange={(v) => setG('limits', 'maxUses', v)} min="0" hint="0 = unlimited." />
            <Num label="Uses per customer" value={p.limits.maxUsesPerPhone} onChange={(v) => setG('limits', 'maxUsesPerPhone', v)} min="0" hint="Counted by phone number." />
            <Num label="Stop after giving away (PKR)" value={p.limits.maxTotalDiscount} onChange={(v) => setG('limits', 'maxTotalDiscount', v)} min="0" hint="A hard budget. 0 = none." />
          </div>
          {!isNew && (
            <p className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-[12px] text-neutral-600">
              Used <strong>{p.usedCount || 0}</strong> times so far, giving away{' '}
              <strong>PKR {Number(p.totalDiscounted || 0).toLocaleString('en-PK')}</strong>.
            </p>
          )}
        </Accordion>

        <Accordion title="How it looks to customers" subtitle="Badge and visibility">
          <div className="grid gap-4 md:grid-cols-2">
            <Text label="Badge text" value={p.badge.text} onChange={(v) => setG('badge', 'text', v)} hint="Short, e.g. “Eid offer”. Blank = no badge." />
            <div>
              <label className="label" htmlFor="badge-colour">Badge colour</label>
              <div className="flex items-center gap-2">
                <input id="badge-colour" type="color" aria-label="Badge colour picker" className="h-11 w-14 cursor-pointer rounded-lg border border-neutral-300 bg-white p-1" value={p.badge.color || '#B3927E'} onChange={(e) => setG('badge', 'color', e.target.value)} />
                <input aria-label="Badge colour hex code" className="input" value={p.badge.color || ''} onChange={(e) => setG('badge', 'color', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <Toggle label="Show the badge on product cards" checked={p.showOnCard} onChange={(v) => set('showOnCard', v)} />
            <Toggle label="Name the promotion in the basket" checked={p.showInCart} onChange={(v) => set('showInCart', v)} />
          </div>
        </Accordion>
      </div>

      {dirty && (
        <div className="sticky bottom-4 z-30 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-900 bg-neutral-900 px-4 py-3 text-white shadow-xl">
          <p className="text-[13px] font-medium">Unsaved changes</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setP(JSON.parse(original))} className="min-h-[44px] rounded-lg border border-white/20 px-3 text-[12px] font-semibold text-white/80 transition hover:bg-white/10">Discard</button>
            <button type="button" onClick={save} disabled={busy || problems.length > 0} className="min-h-[44px] rounded-lg bg-white px-4 text-[12px] font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50">
              {busy ? 'Saving…' : isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {previewOpen && <PromoPreview draft={p} onClose={() => setPreviewOpen(false)} />}
    </AdminLayout>
  );
}
