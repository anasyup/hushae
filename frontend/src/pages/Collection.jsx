import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Boxes } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import CollectionCard from '../components/CollectionCard';
import LuxuryFilterBar from '../components/LuxuryFilterBar';
import { ProductGridSkeleton } from '../components/Skeletons';
import Seo from '../components/Seo';
import { SIZES, COLORS, PRICE_BANDS } from './shop/FilterPanel';
import { fetchCats, fetchCollections } from '../lib/catalogue';

/* ============================================================================
 * Public /collection/:slug — same CK layout as the shop listings:
 *   · sub-category top bar · filter pills bar · 4/3/2-col grid
 * Filtering is client-side over the fetched collection list.
 * ========================================================================== */

const SORT_LABELS = { featured: 'Featured', 'price-asc': 'Price: Low to High', 'price-desc': 'Price: High to Low', newest: 'Newest Arrivals' };

export default function Collection() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [cats, setCats] = useState([]);
  const [collections, setCollections] = useState([]);
  const [sort, setSort] = useState('featured');
  const [bandKey, setBandKey] = useState('');
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);

  useEffect(() => {
    setData(null); setErr(false); setSort('featured'); setBandKey(''); setSizes([]); setColors([]);
    api(`/collections/${slug}`)
      .then(setData)
      .catch(() => setErr(true));
  }, [slug]);

  useEffect(() => { fetchCats().then(setCats); }, []);
  useEffect(() => { fetchCollections().then(setCollections); }, []);

  const products = data?.products || [];
  const c = data?.collection;

  const allSizes = useMemo(() => [...new Set(products.flatMap((p) => p.sizes || []))], [products]);
  const allColors = useMemo(() => {
    const seen = new Map();
    products.forEach((p) => (p.colors || []).forEach((col) => { if (!seen.has(col.name)) seen.set(col.name, col); }));
    return [...seen.values()];
  }, [products]);

  const visible = useMemo(() => {
    if (!products.length) return [];
    let list = [...products];
    if (bandKey) {
      const b = PRICE_BANDS.find((x) => x.key === bandKey);
      if (b) {
        const min = b.min ? Number(b.min) : 0;
        const max = b.max ? Number(b.max) : Infinity;
        list = list.filter((p) => (p.price || 0) >= min && (p.price || 0) <= max);
      }
    }
    if (sizes.length) list = list.filter((p) => (p.sizes || []).some((s) => sizes.includes(s)));
    if (colors.length) list = list.filter((p) => (p.colors || []).some((col) => colors.includes(col.name)));
    if (sort === 'price-asc') list.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === 'price-desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sort === 'newest') list.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
    return list;
  }, [products, sort, bandKey, sizes, colors]);

  const toggle = (set, v) => set((xs) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]));

  const pills = [
    {
      key: 'category',
      label: 'Category',
      multi: false,
      options: cats.map((x) => ({ value: x.slug, label: x.name })),
      selected: [],
      onPick: (s) => navigate(`/category/${s}`),
    },
    {
      key: 'price',
      label: 'Price',
      multi: false,
      options: PRICE_BANDS.map((b) => ({ value: b.key, label: b.label })),
      selected: bandKey ? [bandKey] : [],
      onPick: (k) => setBandKey((cur) => (cur === k ? '' : k)),
    },
    {
      key: 'color',
      label: 'Color',
      multi: true,
      options: (allColors.length ? allColors : COLORS).map((col) => ({ value: col.name || col, label: col.name || col })),
      selected: colors,
      onPick: (name) => toggle(setColors, name),
    },
    {
      key: 'size',
      label: 'Size',
      multi: true,
      options: (allSizes.length ? allSizes : SIZES).map((s) => ({ value: s, label: s })),
      selected: sizes,
      onPick: (s) => toggle(setSizes, s),
    },
    {
      key: 'collection',
      label: 'Collection',
      multi: false,
      options: collections.map((x) => ({ value: x.slug, label: x.name })),
      selected: c ? [c.slug] : [],
      onPick: (s) => { if (s !== slug) navigate(`/collection/${s}`); },
    },
  ];

  if (err) {
    return (
      <div className="container-page pt-[220px] pb-24 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#F0F0F0] text-[#696969]"><Boxes size={22} /></span>
        <h1 className="mt-6 text-3xl font-medium uppercase tracking-[0.04em] text-[#111111]">Collection Not Found</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#696969]">The collection you're looking for may have been renamed or removed.</p>
        <Link to="/shop" className="btn-primary mt-8">Browse all products</Link>
      </div>
    );
  }
  if (!data) return (
    <div className="px-5 pt-[220px] pb-10 md:px-10">
      <div className="skeleton mb-6 h-10 w-full max-w-md" />
      <ProductGridSkeleton count={8} />
    </div>
  );

  const activeFilterCount = (bandKey ? 1 : 0) + sizes.length + colors.length;
  const clearAll = () => { setBandKey(''); setSizes([]); setColors([]); };

  return (
    <div className="w-full min-h-screen bg-[#fcfbf9] pt-[220px] font-sans text-black">
      <Seo
        title={c.name}
        description={c.description || `Shop the ${c.name} collection at HUSHAE — curated pieces for every moment.`}
        image={c.image}
        canonical={`/collection/${c.slug}`}
      />

      {/* ═══ 1. LUXURY FILTER BAR ═════════════════════════════════════ */}
      <LuxuryFilterBar
        count={visible.length}
        f={{ sort, setOne: (k, v) => { if (k === 'sort') setSort(v); } }}
        onOpenFilters={() => setFilterOpen(true)}
      />

      {/* ═══ 2. PRODUCT GRID — max-w 1600 ═════════════════════════════ */}
      <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
        {visible.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <Boxes size={26} className="mb-3 text-[#C9A96E]" />
            <p className="text-sm text-[#696969]">No pieces match those filters.</p>
            <button onClick={clearAll} className="btn-outline mt-6">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-1 gap-y-10 md:grid-cols-4">
            {visible.map((p) => <CollectionCard key={p._id} product={p} />)}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[#777777] transition hover:text-[#111111]">
            <ArrowLeft size={13} /> Continue browsing all
          </Link>
        </div>
      </div>
    </div>
  );
}
