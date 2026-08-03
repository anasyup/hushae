import ProductCard from './ProductCard';

// Horizontal snap carousel — best sellers, recently viewed, bundles
export default function ProductRow({ title, eyebrow, products, note }) {
  if (!products?.length) return null;
  return (
    <section className="container-page">
      {(title || eyebrow) && (
        <div className="mb-6 flex items-end justify-between">
          <div>
            {eyebrow && <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">{eyebrow}</p>}
            {title && <h2 className="mt-1 font-display text-2xl md:text-3xl">{title}</h2>}
          </div>
          {note && <p className="hidden text-xs uppercase tracking-widest text-ash md:block">{note}</p>}
        </div>
      )}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {products.map((p) => (
          <div key={p.id || p._id || p.slug} className="w-44 shrink-0 snap-start md:w-56">
            <ProductCard product={p} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
