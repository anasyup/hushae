import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Boxes } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import Seo from '../components/Seo';

/* ============================================================================
 * Public /collection/:slug page — premium warm register.
 * References: light-minimal + warm-cream collection pages.
 *   · breadcrumb on top
 *   · warm cream hero band (image + title + count)
 *   · clean product grid (2/3/4 cols)
 * ========================================================================== */

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
      <div className="container-page py-24 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#F0F0F0] text-[#696969]"><Boxes size={22} /></span>
        <h1 className="mt-6 text-3xl font-medium uppercase tracking-[0.04em] text-[#111111]">Collection Not Found</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#696969]">The collection you're looking for may have been renamed or removed.</p>
        <Link to="/shop" className="btn-primary mt-8">Browse all products</Link>
      </div>
    );
  }
  if (!data) return (
    <div className="container-page py-10">
      <div className="skeleton mb-6 h-64 w-full" />
      <ProductGridSkeleton count={8} />
    </div>
  );

  const { collection: c, products } = data;

  return (
    <div className="bg-[#F7F1E3]">
      <Seo
        title={c.name}
        description={c.description || `Shop the ${c.name} collection at HUSHAE — curated pieces for every moment.`}
        image={c.image}
        canonical={`/collection/${c.slug}`}
      />

      {/* Breadcrumb — warm, quiet */}
      <div className="container-page pt-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[11px] font-normal text-[#696969]">
          <Link to="/" className="transition hover:text-[#111111]">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#111111]">{c.name}</span>
        </nav>
      </div>

      {/* Hero band — warm cream, image right */}
      <section className="container-page pt-6 md:pt-10">
        <div className="grid items-center gap-8 overflow-hidden rounded-2xl border border-[#E5E5E5]/70 bg-[#FBF6EC] md:grid-cols-2">
          {/* Text */}
          <div className="px-6 py-10 md:px-12 md:py-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#C9A96E]">Collection</p>
            <h1 className="mt-3 text-[32px] font-medium uppercase leading-[1.05] tracking-[0.03em] text-[#111111] md:text-[48px]">
              {c.name}
            </h1>
            {c.description && (
              <p className="mx-auto mt-4 max-w-md text-[15px] font-normal leading-[1.6] text-[#696969]">{c.description}</p>
            )}
            <div className="mt-6 flex items-center gap-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[#696969]">
              <span>{products.length} piece{products.length === 1 ? '' : 's'}</span>
              <span className="h-3 w-px bg-[#E5E5E5]" aria-hidden="true" />
              <span>New Season</span>
            </div>
          </div>
          {/* Image */}
          <div className="relative hidden h-full min-h-[320px] md:block">
            {c.image ? (
              <img src={c.image} alt={c.name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#EFE8DC] to-[#E4D6C0]" />
            )}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="container-page py-10 md:py-14">
        {products.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <Boxes size={26} className="mb-3 text-[#C9A96E]" />
            <p className="text-sm text-[#696969]">This collection is being curated — check back soon.</p>
            <Link to="/shop" className="btn-outline mt-6">Shop everything</Link>
          </div>
        ) : (
          <>
            {/* Result bar */}
            <div className="mb-6 flex items-baseline justify-between border-b border-[#E5E5E5] pb-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#111111]">{products.length} Items</p>
              <span className="text-[11px] text-[#696969]">New Season</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4">
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </>
        )}

        <div className="mt-12 text-center">
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[#696969] transition hover:text-[#111111]">
            <ArrowLeft size={13} /> Continue browsing all
          </Link>
        </div>
      </section>
    </div>
  );
}
