import { BadgeCheck, Headphones, Leaf, Lock, Package, RefreshCw, ShieldCheck, Truck } from 'lucide-react';

/* ============================================================================
 * Trust row.
 *
 * Icons are looked up by NAME because the merchant picks them from a dropdown
 * in the admin panel and the schema stores a string. The map is explicit —
 * a namespace import of lucide would ship the entire icon set (~760 kB).
 * An unknown name degrades to ShieldCheck rather than crashing the bag.
 * ========================================================================== */
const ICONS = { ShieldCheck, RefreshCw, BadgeCheck, Lock, Truck, Package, Headphones, Leaf };

export const TRUST_ICON_NAMES = Object.keys(ICONS);

export default function TrustRow({ items = [], className = '' }) {
  if (!items.length) return null;
  return (
    <ul className={`grid grid-cols-2 gap-x-4 gap-y-3 ${className}`}>
      {items.map((t, i) => {
        const Icon = ICONS[t.icon] || ShieldCheck;
        return (
          <li key={`${t.icon}-${i}`} className="flex items-center gap-2">
            <Icon size={14} strokeWidth={1.7} className="shrink-0 text-sagedeep" aria-hidden="true" />
            <span className="text-caption leading-tight text-ash">{t.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
