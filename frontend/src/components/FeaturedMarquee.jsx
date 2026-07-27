import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Img from './Img';
import { pkr } from '../lib/format';

/**
 * FeaturedMarquee — dark strip that auto-scrolls featured product tiles
 * behind (and after) the full-screen hero video.
 * Pauses on hover. Loops seamlessly by duplicating the list.
 */
export default function FeaturedMarquee({ products, title = 'HUSHAE — Signature Pieces', speed = 55 }) {
  const list = Array.isArray(products) ? products.filter((p) => p && p.images && p.images.length) : [];
  const trackRef = useRef(null);
  const [paused, setPaused] = useState(false);

  // duplicate the array so the CSS animation can slide -50% for a seamless loop
  const doubled = useMemo(() => [...list, ...list], [list]);

  if (!list.length) return null;

  const duration = Math.max(20, Math.min(120, Math.round(list.length * speed / 6)));

  return (
    <section className="relative overflow-hidden bg-obsidian py-10 md:py-14">
      <div className="mx-auto mb-6 flex max-w-7xl items-end justify-between gap-4 px-4 md:mb-8 md:px-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-alabaster/60">Featured</p>
          <h2 className="mt-1 font-display text-2xl text-alabaster md:text-3xl">{title}</h2>
        </div>
        <Link to="/best" className="hidden shrink-0 text-[11px] font-semibold uppercase tracking-widest text-alabaster/70 hover:text-alabaster md:inline-block">
          View all →
        </Link>
      </div>

      <div
        className="group relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          ref={trackRef}
          className="flex w-max gap-4 px-4 md:gap-6 md:px-8"
          style={{
            animation: `hushae-marquee ${duration}s linear infinite`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          {doubled.map((p, i) => (
            <Link
              key={`${p._id || p.id}-${i}`}
              to={`/product/${p.slug}`}
              className="group/card block w-[52vw] shrink-0 sm:w-[280px] md:w-[300px]"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-graphite">
                <Img
                  src={p.images?.[0]?.url}
                  alt={p.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-[1.05]"
                />
                {p.compareAtPrice && p.compareAtPrice > p.price && (
                  <span className="absolute left-3 top-3 rounded-full bg-clay px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-alabaster">
                    Sale
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-start justify-between gap-3">
                <p className="line-clamp-1 text-[13px] font-semibold text-alabaster">{p.name}</p>
                <p className="shrink-0 text-[13px] font-semibold text-alabaster/90">{pkr(p.price)}</p>
              </div>
              {p.tier && (
                <p className="mt-0.5 text-[10px] uppercase tracking-widest text-alabaster/50">{p.tier}</p>
              )}
            </Link>
          ))}
        </div>

        {/* gradient edges to hint that the strip slides */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-obsidian to-transparent md:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-obsidian to-transparent md:w-24" />
      </div>

      <style>{`
        @keyframes hushae-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
