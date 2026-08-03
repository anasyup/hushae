import { useEffect, useState } from 'react';
import { Calculator, ChevronDown, ChevronUp, X } from 'lucide-react';
import { pkr } from '../lib/format';

/*
 * ProfitCalculator — floating tool available on every admin page.
 * Bottom-right button that opens a slide-up panel. Persists inputs
 * to localStorage so the admin doesn't lose numbers between pages.
 *
 * Inputs: sale price, cost/wholesale, quantity, packing per order,
 *         shipping subsidy, ads spend, other one-off costs, tax %.
 * Live outputs: gross profit, net profit, margin %, break-even qty,
 *               profit per unit, ROAS if ads > 0.
 */

const LS_KEY = 'hushae.calc';

const EMPTY = {
  price: '', cost: '', qty: '1',
  packing: '', shippingSubsidy: '', ads: '', otherCosts: '',
  taxPct: '',
};

function num(v) { const n = Number(String(v ?? '').replace(/,/g, '')); return Number.isFinite(n) ? n : 0; }

export default function ProfitCalculator() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(() => {
    try { return { ...EMPTY, ...(JSON.parse(localStorage.getItem(LS_KEY) || '{}')) }; }
    catch { return EMPTY; }
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* noop */ }
  }, [state]);

  const set = (k, v) => setState((x) => ({ ...x, [k]: v }));
  const reset = () => setState(EMPTY);

  // --- Compute ---
  const price = num(state.price);
  const cost  = num(state.cost);
  const qty   = Math.max(1, num(state.qty));
  const packing = num(state.packing);
  const shipSub = num(state.shippingSubsidy);
  const ads = num(state.ads);
  const other = num(state.otherCosts);
  const taxPct = num(state.taxPct);

  const revenue = price * qty;
  const cogs = cost * qty;
  const perOrderCosts = (packing + shipSub) * qty;
  const totalCosts = cogs + perOrderCosts + ads + other;
  const taxAmount = revenue > 0 ? (revenue * taxPct) / 100 : 0;

  const grossProfit = revenue - cogs;
  const netProfit = revenue - totalCosts - taxAmount;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const perUnitProfit = qty > 0 ? netProfit / qty : 0;
  const roas = ads > 0 ? revenue / ads : 0;
  const breakEvenQty = (price - cost - packing - shipSub) > 0
    ? Math.ceil((ads + other) / (price - cost - packing - shipSub))
    : null;

  // Health rating
  const health = margin >= 30 ? 'good' : margin >= 10 ? 'ok' : margin > 0 ? 'thin' : 'loss';
  const healthMeta = {
    good: { color: 'bg-emerald-100 text-emerald-800', label: 'Healthy' },
    ok:   { color: 'bg-amber-100 text-amber-800',     label: 'OK' },
    thin: { color: 'bg-orange-100 text-orange-800',   label: 'Thin' },
    loss: { color: 'bg-red-100 text-red-800',         label: 'Loss' },
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Profit calculator"
        title="Profit calculator"
        className={`fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-[9px] font-semibold shadow-lg transition ${
          open ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-white hover:bg-neutral-800'
        }`}
      >
        <Calculator size={15} />
        <span className="hidden sm:inline">Profit calc</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-end px-4 pb-4 md:right-5 md:bottom-20 md:left-auto md:px-0 md:pb-0">
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl"
            role="dialog"
            aria-label="Profit calculator"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-900 px-5 py-3 text-white">
              <div className="flex items-center gap-2">
                <Calculator size={16} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Quick tool</p>
                  <p className="text-[9px] font-semibold">Profit Calculator</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={reset} className="rounded-full px-2.5 py-1 text-[9px] font-semibold text-neutral-300 transition hover:bg-white/10 hover:text-white">Reset</button>
                <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-neutral-300 hover:bg-white/10 hover:text-white"><X size={16} /></button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              {/* Live output cards */}
              <div className="grid gap-2 sm:grid-cols-2">
                <OutputTile label="Net profit" value={pkr(netProfit)} tone={netProfit >= 0 ? 'green' : 'red'} big />
                <OutputTile label="Net margin" value={`${margin.toFixed(1)}%`} tone={margin >= 20 ? 'green' : margin >= 5 ? 'amber' : 'red'} sub={healthMeta[health].label} bigSub />
              </div>
              <div className="mt-2 grid gap-2 grid-cols-2 sm:grid-cols-3">
                <OutputTile label="Gross profit" value={pkr(grossProfit)} tone="neutral" small />
                <OutputTile label="Per-unit profit" value={pkr(perUnitProfit)} tone={perUnitProfit >= 0 ? 'green' : 'red'} small />
                <OutputTile label="Gross margin" value={`${grossMargin.toFixed(1)}%`} tone="neutral" small />
              </div>

              {(ads > 0 || breakEvenQty != null) && (
                <div className="mt-2 grid gap-2 grid-cols-2">
                  {breakEvenQty != null && (
                    <OutputTile label="Break-even qty" value={breakEvenQty.toLocaleString()} tone="neutral" small
                      sub={`orders to cover ads + other`} />
                  )}
                  {ads > 0 && (
                    <OutputTile label="ROAS" value={`${roas.toFixed(2)}x`} tone={roas >= 3 ? 'green' : roas >= 2 ? 'amber' : 'red'} small
                      sub="revenue ÷ ads" />
                  )}
                </div>
              )}

              {/* Inputs */}
              <div className="mt-5 space-y-4">
                <Section title="Per unit">
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Sale price" v={state.price}       onChange={(v) => set('price', v)}       placeholder="1800" prefix="PKR" />
                    <Field label="Cost"       v={state.cost}        onChange={(v) => set('cost', v)}        placeholder="900"  prefix="PKR" />
                    <Field label="Quantity"   v={state.qty}         onChange={(v) => set('qty', v)}         placeholder="1" />
                  </div>
                </Section>

                <Section title="Per order costs">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Packing"           v={state.packing}         onChange={(v) => set('packing', v)}         placeholder="40" prefix="PKR" />
                    <Field label="Courier subsidy"   v={state.shippingSubsidy} onChange={(v) => set('shippingSubsidy', v)} placeholder="50" prefix="PKR" />
                  </div>
                </Section>

                <Section title="One-off costs">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Ads spend"    v={state.ads}         onChange={(v) => set('ads', v)}         placeholder="0"  prefix="PKR" />
                    <Field label="Other"        v={state.otherCosts}  onChange={(v) => set('otherCosts', v)}  placeholder="0"  prefix="PKR" />
                  </div>
                </Section>

                <Section title="Tax (optional)">
                  <Field label="Sales tax %"  v={state.taxPct}      onChange={(v) => set('taxPct', v)}      placeholder="0" suffix="%" />
                </Section>
              </div>

              <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-[9px] leading-relaxed text-neutral-600">
                <b className="text-neutral-900">How this is calculated:</b><br />
                Net profit = (Price × Qty) − (Cost × Qty) − (Packing + Courier subsidy) × Qty − Ads − Other − Tax.<br />
                Break-even = orders needed to cover Ads + Other with the per-unit contribution margin.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, v, onChange, placeholder, prefix, suffix }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9px] font-semibold text-neutral-500">{label}</span>
      <span className="relative block">
        {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-400">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-neutral-200 bg-white py-2 text-[10px] font-medium text-neutral-900 outline-none transition focus:border-neutral-900 ${
            prefix ? 'pl-11' : 'pl-3'
          } ${suffix ? 'pr-8' : 'pr-3'}`}
        />
        {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-neutral-400">{suffix}</span>}
      </span>
    </label>
  );
}

function OutputTile({ label, value, sub, tone = 'neutral', big, bigSub, small }) {
  const map = {
    green:   'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber:   'bg-amber-50 text-amber-800 border-amber-200',
    red:     'bg-red-50 text-red-800 border-red-200',
    neutral: 'bg-neutral-50 text-neutral-800 border-neutral-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${map[tone]}`}>
      <p className="text-[9.5px] font-bold uppercase tracking-widest opacity-70">{label}</p>
      <p className={`mt-1 font-sans tabular-nums leading-none tracking-tight ${big ? 'text-[9px] font-semibold' : small ? 'text-[9px] font-semibold' : 'text-[10px] font-semibold'}`}>
        {value}
      </p>
      {sub && <p className={`mt-1 ${bigSub ? 'text-[9px] font-semibold' : 'text-[10px] opacity-70'}`}>{sub}</p>}
    </div>
  );
}
