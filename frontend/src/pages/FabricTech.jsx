import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import { snap } from '../lib/format';
import { PRODUCT_GRID } from '../lib/productGrid';

const TECHNOLOGIES = {
  breathable: {
    name: 'Breathable', title: 'Breathable Cotton',
    body: 'Our breathable fabrics use an open-weave construction that allows air to circulate freely. Ideal for daily wear in any climate.',
    whenToChoose: 'Best for: daily wear, hot climates, all-day comfort.',
  },
  cooling: {
    name: 'Cooling', title: 'Cooling Technology',
    body: 'Cooling fabrics incorporate phase-change materials that absorb excess body heat and release it gradually.',
    whenToChoose: 'Best for: workouts, hot commutes, summer nights.',
  },
  seamless: {
    name: 'Seamless', title: 'Seamless Construction',
    body: 'Seamless garments are knitted as a single tube, eliminating side seams and friction points.',
    whenToChoose: 'Best for: fitted outfits, sensitive skin, minimalists.',
  },
  'sweat-control': {
    name: 'Sweat Control', title: 'Sweat Control',
    body: 'Hydrophilic finish spreads moisture for rapid evaporation. Dries 3x faster than standard cotton.',
    whenToChoose: 'Best for: gym, running, long days.',
  },
  support: {
    name: 'Support', title: 'Targeted Support',
    body: 'Graduated compression zones — firmer where you need structure, softer where you need movement.',
    whenToChoose: 'Best for: high-impact, recovery, all-day confidence.',
  },
  'silk-touch': {
    name: 'Silk-Touch', title: 'Silk-Touch Finish',
    body: 'Proprietary micro-sanding on long-staple cotton. The hand-feel of silk, the breathability of cotton.',
    whenToChoose: 'Best for: evenings, special occasions, luxury feel.',
  },
  'quick-dry': {
    name: 'Quick-Dry', title: 'Quick-Dry Finish',
    body: 'Capillary channels wick water outward. Ready to wear within 2 hours of washing.',
    whenToChoose: 'Best for: travel, gym rotations, small wardrobes.',
  },
};

export default function FabricTech({ slug = 'breathable' }) {
  const tech = TECHNOLOGIES[slug] || TECHNOLOGIES.breathable;
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api(`/products?tag=${slug}&limit=8`).then((d) => setProducts((d.products || []).map(snap))).catch(() => setProducts([]));
  }, [slug]);

  return (
    <div style={{ background: '#FFFFFF' }}>
      <div className="bg-obsidian text-white section">
        <div className="container text-center py-12 md:py-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/50">Fabric technology</p>
          <h1 className="mt-3 h1 !text-white">{tech.title}</h1>
        </div>
      </div>

      <div className="container section pt-[130px]">
        <div className="grid gap-12 md:grid-cols-2 max-w-3xl mx-auto">
          <div>
            <h2 className="h3">How it works</h2>
            <p className="mt-4 body leading-relaxed text-ash">{tech.body}</p>
          </div>
          <div>
            <h2 className="h3">When to choose</h2>
            <p className="mt-4 body leading-relaxed text-ash">{tech.whenToChoose}</p>
          </div>
        </div>
      </div>

      {products.length > 0 && (
        <div className="section" style={{ background: '#FFFFFF' }}>
          <div className="container">
            <h2 className="h3 mb-8">{tech.name} products</h2>
          </div>
          <div className={PRODUCT_GRID}>
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </div>
      )}

      <div className="container section text-center border-t border-line">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ash">Explore more</p>
        <h2 className="mt-2 h3">All fabric technologies</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {Object.entries(TECHNOLOGIES).map(([key, t]) => (
            <Link key={key} to={`/fabric/${key}`}
              className={`border px-6 py-2.5 text-[12px] font-medium uppercase tracking-[0.10em] transition-colors ${key === slug ? 'border-obsidian bg-obsidian text-white' : 'border-line text-obsidian hover:border-obsidian'}`}>
              {t.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
