import {
  Banknote, Building2, CreditCard, Headphones, Landmark, Lock, Package, RefreshCw,
  ShieldCheck, Smartphone, Store, Truck, Wallet, Zap,
} from 'lucide-react';

/* ============================================================================
 * Payment / shipping method picker.
 *
 * Rendered as a real radiogroup: the options are <input type="radio"> with the
 * card as the visible label. That buys arrow-key navigation, a single tab
 * stop, and correct screen-reader semantics for free — the old checkout used
 * <button> elements, which announce as buttons and give no "2 of 4" position.
 *
 * Icons resolve by NAME from an explicit map because the merchant picks them
 * from a dropdown and the schema stores a string. A namespace import of lucide
 * would ship the whole set (~760 kB).
 * ========================================================================== */
const ICONS = {
  Banknote, Smartphone, Landmark, CreditCard, Wallet, Building2,
  Truck, Zap, Store, Package, Lock, ShieldCheck, RefreshCw, Headphones,
};

export const METHOD_ICON_NAMES = Object.keys(ICONS);

export default function MethodPicker({ name, legend, options, value, onChange, renderMeta }) {
  if (!options.length) return null;

  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="divide-y divide-clay/60">
        {options.map((m) => {
          const selected = value === m.id;
          const disabled = !!m.comingSoon;
          return (
            <label
              key={m.id}
              className={`relative flex cursor-pointer items-center gap-4 py-3 transition-colors duration-fast
                ${disabled ? 'cursor-not-allowed opacity-55' : ''}
                ${selected ? 'text-charcoal' : 'text-smoke hover:text-charcoal'}
                focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-charcoal`}
            >
              <input
                type="radio"
                name={name}
                value={m.id}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(m.id)}
                className="peer sr-only"
              />
              {/* Radio dot */}
              <span
                aria-hidden="true"
                className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition-colors
                  ${selected ? 'border-charcoal' : 'border-clay'}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full transition-colors ${selected ? 'bg-charcoal' : 'bg-transparent'}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-normal">
                  {m.label}
                  {m.comingSoon && <span className="ml-1.5 text-[11px] text-smoke">· coming soon</span>}
                </span>
                {m.note && <span className="mt-0.5 block text-[11px] leading-relaxed text-smoke">{m.note}</span>}
                {renderMeta && renderMeta(m)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
