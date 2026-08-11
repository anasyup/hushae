import { Link } from 'react-router-dom';

/* ============================================================================
 * HeaderNavigation — exact client reference.
 * Centered secondary nav strip under the main header on listing pages:
 *   WOMEN'S · MEN'S · NEW ARRIVALS · COLLECTIONS · SALE
 *   font-sans 12px medium uppercase tracking-[0.15em] #1e1e1e,
 *   hover neutral-500, gap 8/10, border-b py-4.
 * ========================================================================== */

const NAV = [
  { label: "WOMEN'S", href: '/women' },
  { label: "MEN'S", href: '/men' },
  { label: 'NEW ARRIVALS', href: '/new' },
  { label: 'COLLECTIONS', href: '/collection/new-arrivals' },
  { label: 'SALE', href: '/sale' },
];

export default function HeaderNav() {
  return (
    <nav className="w-full border-b border-neutral-200 bg-white py-4" aria-label="Secondary">
      <ul className="flex items-center justify-center gap-8 md:gap-10">
        {NAV.map((link) => (
          <li key={link.href}>
            <Link
              to={link.href}
              className="font-sans text-[12px] font-medium uppercase tracking-[0.15em] text-[#1e1e1e] transition-colors duration-200 hover:text-neutral-500"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
