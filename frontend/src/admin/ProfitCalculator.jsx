import { useEffect, useState } from 'react';
import { pkr } from '../lib/format';
import { btnGhost, ctl, MonoStatus } from './orders/orderUi';

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

  const price = num(state.price);
  const cost = num(state.cost);
  const qty = Math.max(1, num(state.qty));
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

  const health = margin >= 30 ? 'HEALTHY' : margin >= 10 ? 'OK' : margin > 0 ? 'THIN' : 'LOSS';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Profit calculator"
        title="Profit calculator"
        className="fixed bottom-5 right-5 z-40 inline-flex h-10 items-center gap-2 border border-[#DCDCDC] bg-[#0A0A0A] px-4 text-[10px] font-medium uppercase tracking-[0.14em] text-[#333333] hover:border-white/45 hover:text-white"
      >
        Profit calc
      </button>

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-end px-4 pb-16 md:right-5 md:bottom-20 md:left-auto md:px-0 md:pb-0">
          <div className="w-full max-w-md border border-[#EAEAEA] bg-[#0A0A0A]" role="dialog" aria-label="Profit calculator">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] px-5 py-3">
              <div>
                <p className="adm-label">Quick tool</p>
                <p className="mt-1 text-[13px] text-white">Profit calculator</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={reset} className={btnGhost}>Reset</button>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className={btnGhost}>Close</button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
              <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA]">
                <div className="px-4 py-4">
                  <p className="adm-label">Net profit</p>
                  <p className="adm-metric mt-2 text-[20px] text-white">{pkr(netProfit)}</p>
                </div>
                <div className="px-4 py-4">
                  <p className="adm-label">Net margin</p>
                  <p className="adm-metric mt-2 text-[20px] text-white">{margin.toFixed(1)}%</p>
                  <div className="mt-2"><MonoStatus label={health} dim={health === 'LOSS' || health === 'THIN'} /></div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-[12px]">
                <div><p className="adm-label">Gross</p><p className="mt-1 tabular-nums text-[#333333]">{pkr(grossProfit)}</p></div>
                <div><p className="adm-label">Per unit</p><p className="mt-1 tabular-nums text-[#333333]">{pkr(perUnitProfit)}</p></div>
                <div><p className="adm-label">Gross %</p><p className="mt-1 tabular-nums text-[#333333]">{grossMargin.toFixed(1)}%</p></div>
              </div>
              {(ads > 0 || breakEvenQty != null) && (
                <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                  {breakEvenQty != null && <div><p className="adm-label">Break-even qty</p><p className="mt-1 text-[#333333]">{breakEvenQty.toLocaleString()}</p></div>}
                  {ads > 0 && <div><p className="adm-label">ROAS</p><p className="mt-1 text-[#333333]">{roas.toFixed(2)}x</p></div>}
                </div>
              )}

              <div className="mt-6 space-y-4">
                <p className="adm-index">Per unit</p>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Sale price" v={state.price} onChange={(v) => set('price', v)} placeholder="1800" />
                  <Field label="Cost" v={state.cost} onChange={(v) => set('cost', v)} placeholder="900" />
                  <Field label="Quantity" v={state.qty} onChange={(v) => set('qty', v)} placeholder="1" />
                </div>
                <p className="adm-index">Per order</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Packing" v={state.packing} onChange={(v) => set('packing', v)} placeholder="40" />
                  <Field label="Courier subsidy" v={state.shippingSubsidy} onChange={(v) => set('shippingSubsidy', v)} placeholder="50" />
                </div>
                <p className="adm-index">One-off</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Ads spend" v={state.ads} onChange={(v) => set('ads', v)} placeholder="0" />
                  <Field label="Other" v={state.otherCosts} onChange={(v) => set('otherCosts', v)} placeholder="0" />
                </div>
                <Field label="Sales tax %" v={state.taxPct} onChange={(v) => set('taxPct', v)} placeholder="0" />
              </div>

              <p className="mt-5 text-[11px] leading-relaxed text-[#AAAAAA]">
                Net profit = (Price × Qty) − (Cost × Qty) − (Packing + Courier subsidy) × Qty − Ads − Other − Tax.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, v, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="adm-label mb-1.5 block">{label}</span>
      <input type="number" inputMode="decimal" value={v} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={ctl} />
    </label>
  );
}
