import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Boxes } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import Seo from '../components/Seo';

/*
 * Public /collection/:slug page.
 * Loads collection metadata + resolved products (manual + smart merged).
 */
export default function Collection() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setData(null); setErr(false);
    api(`/collections/${slug}`)
      .then(setData)
      .catch(() => setErr(true));
  }, [slug]);

  if (err) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center md:px-8">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-satin/70 text-ash"><Boxes size={22} /></span>
        <h1 className="mt-6 font-display text-3xl">Collection not found</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ash">The collection you're looking for may have been renamed or removed.</p>
        <Link to="/shop" className="btn-primary mt-8">Browse all products</Link>
      </div>
    );
  }
  if (!data) return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="skeleton mb-6 h-64 w-full" />
      <ProductGridSkeleton count={8} />
    </div>
  );

  const { collection: c, products } = data;

  return (
    <div>
      <Seo
        title={c.name}
        description={c.description || `Shop the ${c.name} collection at HUSHAE — curated pieces for every moment.`}
        image={c.image}
        canonical={`/collection/${c.slug}`}
      />

      {/* Banner */}
      <section className="relative overflow-hidden bg-obsidian">
        {c.image && (
          <img src={c.image} alt={c.name} className="absolute inset-0 h-full w-full object-cover opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian/85 via-obsidian/30 to-obsidian/10" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="relative mx-auto max-w-7xl px-4 py-20 text-center md:px-8 md:py-28">
          <p className="text-[11px] font-bold uppercase tracking-widest text-alabaster/80">Collection</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-alabaster md:text-6xl">{c.name}</h1>
          {c.description && (
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-alabaster/80 md:text-base">{c.description}</p>
          )}
          <p className="mt-6 text-[11px] uppercase tracking-widest text-alabaster/60">{products.length} piece{products.length === 1 ? '' : 's'}</p>
        </motion.div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        {products.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <Boxes size={26} className="mb-3 text-neutral-300" />
            <p className="text-sm text-neutral-500">This collection is being curated — check back soon.</p>
            <Link to="/shop" className="btn-outline mt-6">Shop everything</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-ash transition hover:text-obsidian">
            <ArrowLeft size={13} /> Continue browsing all
          </Link>
        </div>
      </section>
    </div>
  );
}
