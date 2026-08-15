import { Link } from 'react-router-dom';

/* ============================================================================
 * NewArrivals3DBanner — FULL-SCREEN 3D editorial banner for the New
 * Arrivals listing (same treatment as the Sale split banner).
 *   · Full viewport height (100svh), full width — one cinematic banner:
 *     'The New In' on the left, 'The Edit' on the right, hairline divider.
 *   · 3D: each half sits in a perspective container and tilts in 3D
 *     (rotateY) toward the viewer on hover with an image zoom.
 *   · Realistic campaign photography (the store's own hero images).
 * Placed inside the New Arrivals grid after the first 8 products.
 * ========================================================================== */

const Half = ({ to, img, label, title, link, reverse }) => (
  <Link
    to={to}
    aria-label={title}
    className="group relative block h-[50svh] overflow-hidden bg-[#111] sm:h-full"
    style={{ perspective: '1400px' }}
  >
    <span
      className="absolute inset-0 block transition-transform duration-700 ease-out group-hover:[transform:rotateY(var(--rot))]"
      style={{
        '--rot': reverse ? '10deg' : '-10deg',
        transformStyle: 'preserve-3d',
        transform: 'rotateY(0deg)',
      }}
    >
      <img
        src={img}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-110"
      />
    </span>

    <span
      aria-hidden="true"
      className="absolute inset-0 block transition-colors duration-500 group-hover:bg-black/10"
      style={{ background: 'linear-gradient(to top, rgba(17,17,17,0.7) 0%, rgba(17,17,17,0.12) 55%, rgba(17,17,17,0) 100%)' }}
    />

    <span className="absolute inset-x-0 bottom-0 block p-6 text-white md:p-10">
      <span className="block text-[9px] font-medium uppercase tracking-[0.32em] text-white/70">{label}</span>
      <span className="mt-2 block font-serif text-3xl font-normal uppercase tracking-[0.12em] md:text-5xl">
        {title}
      </span>
      <span className="mt-5 inline-block border-b border-white/60 pb-1 text-[10px] font-medium uppercase tracking-[0.25em] transition-colors group-hover:border-white">
        {link}
      </span>
    </span>
  </Link>
);

export default function NewArrivals3DBanner() {
  return (
    <section
      aria-label="New arrivals by gender"
      className="relative col-span-1 h-[100svh] w-screen overflow-hidden bg-[#111] sm:col-span-2 md:col-span-4"
      style={{ marginInline: 'calc(50% - 50vw)' }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 z-10 hidden w-px -translate-x-1/2 bg-white/25 sm:block"
      />

      <div className="grid h-full w-full grid-cols-1 sm:grid-cols-2">
        <Half to="/men" img="/images/campaign/qa/hero-men.jpg" label="The New In" title="For Him" link="Shop Men" />
        <Half to="/women" img="/images/campaign/qa/hero-women.jpg" label="The New In" title="For Her" link="Shop Women" reverse />
      </div>
    </section>
  );
}
