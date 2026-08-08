import ProductCard from './ProductCard';

// Horizontal snap carousel — best sellers, recently viewed, bundles.
// QA — quiet rail: label-qa eyebrow, Inter 300 title, same cards as home.
export default function ProductRow({ title, eyebrow, products, note }) {
  if (!products?.length) return null;
  return (
    <section className="container-page">
      {(title || eyebrow) && (
        <div className="mb-8 flex items-end justify-between">
          <div>
            {eyebrow && <p className="label-qa">{eyebrow}</p>}
            {title && <h2 className="mt-2 text-[22px] font-light normal-case tracking-[0.02em] text-charcoal md:text-[28px]">{title}</h2>}
          </div>
          {note && <p className="hidden text-[11px] uppercase tracking-[0.12em] text-smoke md:block">{note}</p>}
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
