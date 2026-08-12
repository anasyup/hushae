import { Link } from 'react-router-dom';

/* ============================================================================
 * THE EDITS — a typographic index of the house's named collections.
 * Four large, light, widely-tracked caps — the way Chanel or Tiffany name
 * their lines — each a direct gateway into a category. Type as architecture:
 * no images, no noise, just letters with air between them.
 * ========================================================================== */

const EDITS = [
  { label: 'The Bras Edit', href: '/category/bras' },
  { label: 'The Panty Edit', href: '/category/panties' },
  { label: 'The Brief Edit', href: '/category/briefs' },
  { label: 'The Boxer Edit', href: '/category/boxers' },
];

export default function CollectionIndex() {
  return (
    <section className="w-full border-b border-neutral-200/70 bg-[#fcfbf9] px-4 md:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-1 divide-y divide-neutral-200/70 md:grid-cols-4 md:divide-x md:divide-y-0">
          {EDITS.map((e) => (
            <Link
              key={e.label}
              to={e.href}
              className="group flex items-center justify-between gap-4 py-7 pr-2 md:py-10 md:pl-8 first:md:pl-0"
            >
              <span className="font-display text-[13px] font-light uppercase tracking-[0.22em] text-[#111111] transition-colors duration-300 group-hover:text-neutral-500 md:text-sm">
                {e.label}
              </span>
              <span
                aria-hidden="true"
                className="text-neutral-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#111111]"
              >
                &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
