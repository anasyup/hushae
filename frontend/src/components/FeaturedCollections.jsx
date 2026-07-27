import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { api } from '../api/client';

/**
 * FeaturedCollections — homepage tile grid that pulls collections
 * flagged `featuredOnHome: true` from the admin.
 * Renders nothing when there are no featured collections.
 */
export default function FeaturedCollections() {
  const [cols, setCols] = useState(null);

  useEffect(() => {
    api('/collections?featured=true').then((d) => setCols(d.collections || [])).catch(() => setCols([]));
  }, []);

  if (!cols || cols.length === 0) return null;

  const list = cols.slice(0, 4);

  return (
    <section className="mx-auto mt-24 max-w-7xl px-4 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6 }}
        className="mb-10 flex items-end justify-between gap-4"
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Curated edits</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Explore the collections</h2>
        </div>
        <Link to="/shop" className="hidden shrink-0 text-[11px] font-semibold uppercase tracking-widest text-ash transition hover:text-obsidian md:inline-flex md:items-center md:gap-1.5">
          Shop all <ArrowRight size={13} />
        </Link>
      </motion.div>

      <div className={`grid gap-4 md:gap-6 ${list.length === 1 ? 'md:grid-cols-1' : list.length === 2 ? 'md:grid-cols-2' : list.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
        {list.map((c, i) => (
          <motion.div
            key={c.slug}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.06 }}
          >
            <Link to={`/collection/${c.slug}`} className="group relative block overflow-hidden rounded-3xl bg-cream">
              {c.image ? (
                <img
                  src={c.image}
                  alt={c.name}
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="aspect-[4/5] w-full bg-gradient-to-br from-satin to-cream" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-obsidian/10 to-transparent" />
              <div className="absolute inset-x-4 bottom-5 text-alabaster">
                <p className="text-[10px] font-bold uppercase tracking-widest text-alabaster/80">Collection</p>
                <p className="mt-1 font-display text-2xl leading-tight">{c.name}</p>
                {c.description && <p className="mt-1 line-clamp-1 text-[12px] text-alabaster/80">{c.description}</p>}
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-alabaster/90 group-hover:text-alabaster">
                  Explore <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
