import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

/* ============================================================================
 * HeaderNavigation — exact client reference (v2).
 * Centered secondary nav strip under the main header:
 *   Women ▾ · Men ▾ · New Arrivals · Best Sellers · Sale ▾ · Fit Finder ·
 *   Track Order
 *   font-sans 11px medium uppercase tracking-[0.18em] #1e1e1e, hover
 *   neutral-500, gap 6/8, border-b py-3.5. Chevron on dropdown items.
 * ========================================================================== */

const NAV = [
  { label: 'Women', hasDropdown: true, href: '/women' },
  { label: 'Men', hasDropdown: true, href: '/men' },
  { label: 'New Arrivals', hasDropdown: false, href: '/new' },
  { label: 'Best Sellers', hasDropdown: false, href: '/best' },
  { label: 'Sale', hasDropdown: true, href: '/sale' },
  { label: 'Fit Finder', hasDropdown: false, href: '/fit-finder' },
  { label: 'Track Order', hasDropdown: false, href: '/track' },
];

export default function HeaderNav() {
  return (
    <nav className="w-full border-b border-neutral-200 bg-white py-3.5" aria-label="Secondary">
      <ul className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
        {NAV.map((item) => (
          <li key={item.label} className="flex items-center">
            <Link
              to={item.href}
              className="flex items-center gap-1 font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-[#1e1e1e] transition-colors duration-200 hover:text-neutral-500"
            >
              <span>{item.label}</span>
              {item.hasDropdown && (
                <ChevronDown size={12} strokeWidth={2} className="text-[#1e1e1e]" aria-hidden="true" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
