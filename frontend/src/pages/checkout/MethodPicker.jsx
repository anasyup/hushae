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
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((m) => {
          const Icon = ICONS[m.icon] || CreditCard;
          const selected = value === m.id;
          const disabled = !!m.comingSoon;
          return (
            <label
              key={m.id}
              className={`relative flex cursor-pointer items-start gap-3 rounded-card border p-4 transition-colors duration-fast
                ${disabled ? 'cursor-not-allowed border-line opacity-55' : ''}
                ${selected ? 'border-obsidian bg-obsidian/[0.035]' : 'border-line hover:border-obsidian/40'}
                focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-obsidian`}
            >
              <input
                type="radio"
                name={name}
                value={m.id}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(m.id)}
                /* Visually replaced by the card, but still the real control:
                   keyboard, arrow keys and screen readers all use this. */
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors
                  ${selected ? 'bg-obsidian text-alabaster' : 'bg-satin/70 text-graphite'}`}
              >
                <Icon size={16} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-medium">
                  {m.label}
                  {m.comingSoon && <span className="ml-1.5 text-caption font-normal text-ash">· coming soon</span>}
                </span>
                {m.note && <span className="mt-0.5 block text-caption leading-relaxed text-ash">{m.note}</span>}
                {renderMeta && renderMeta(m)}
              </span>
              {/* Selection dot */}
              <span
                aria-hidden="true"
                className={`mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition-colors
                  ${selected ? 'border-obsidian' : 'border-stone'}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full transition-colors ${selected ? 'bg-obsidian' : 'bg-transparent'}`} />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
