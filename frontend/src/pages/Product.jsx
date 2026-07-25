import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Heart, Minus, Play, Plus, RotateCcw, Ruler, ShieldCheck, Star, Truck } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { pkr, snap } from '../lib/format';
import { isVideo, ytId } from '../lib/media';
import Img from '../components/Img';
import ProductRow from '../components/ProductRow';
import SizeGuideModal from '../components/SizeGuideModal';
import { PageSkeleton } from '../components/Skeletons';
import Tx from '../components/Tx';
import Seo, { productJsonLd } from '../components/Seo';

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-4 text-left text-[12px] font-bold uppercase tracking-widest">
        {title}<ChevronDown size={15} className={`text-ash transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-5 text-sm leading-relaxed text-ash">{children}</div>}
    </div>
  );
}

export default function Product() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { addToCart, inWishlist, toggleWish, pushRecent, recent, settings } = useApp();
  const [p, setP] = useState(null);
  const [err, setErr] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [sizeErr, setSizeErr] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [bundle, setBundle] = useState([]);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    setP(null); setErr(false); setImgIdx(0); setSize(''); setQty(1); setBundle([]); setRelated([]);
    api(`/products/${slug}`)
      .then((d) => {
        setP(d.product);
        setColor(d.product.colors[0]?.name || '');
        pushRecent(d.product);
        const bslug = d.product.bundleSlug || '';
        if (bslug) api(`/products?category=${bslug}&limit=3&sort=popular`).then((x) => setBundle(x.products)).catch(() => {});
      })
      .catch(() => setErr(true));
    // Load related products (same category / gender+tier) — separate call so it's cached differently
    api(`/products/${slug}/related`).then((d) => setRelated(d.products || [])).catch(() => setRelated([]));
  }, [slug]); // eslint-disable-line

  if (err) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <p className="font-display text-3xl">This piece has moved on</p>
        <p className="mt-2 text-ash">It may be sold out or no longer part of the edit.</p>
        <Link to="/shop" className="btn-primary mt-8">Back to Shop</Link>
      </div>
    );
  }
  if (!p) return <PageSkeleton />;

  const wished = inWishlist(p);
  const isBra = p.categorySlug === 'bras';
  const needsSize = p.sizes.length > 0;

  // Gallery media = images array in admin-chosen order (photo + video tiles mixed);
  // legacy `video` field appended only if not already inside images
  const imgs = p.images.map((im) => ({ t: isVideo(im.url) ? 'video' : 'img', url: im.url, alt: im.alt }));
  const media = p.video && !imgs.some((m) => m.url === p.video) ? [...imgs, { t: 'video', url: p.video, alt: `${p.name} video` }] : imgs;
  const active = media[imgIdx] || media[0];
  const activeYt = active?.t === 'video' ? ytId(active.url) : null;

  const tryAdd = (then) => {
    if (needsSize && !size) { setSizeErr(true); return; }
    addToCart(p, { size, color, quantity: qty });
    if (then) nav('/checkout');
  };

  // Color select → jump gallery to that color's photo (if the color has one)
  const pickColor = (name) => {
    setColor(name);
    const c = p.colors.find((x) => x.name === name);
    if (c?.image) {
      const idx = p.images.findIndex((im) => im.url === c.image);
      if (idx >= 0) setImgIdx(idx);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-8 md:px-8">
      <Seo
        title={p.name}
        description={p.shortDescription || p.description?.slice(0, 160) || `${p.name} — premium innerwear from VÉLOURA. PKR ${p.price}. ${p.stock > 0 ? 'In stock' : 'Out of stock'}. COD available.`}
        image={p.images?.[0]?.url}
        canonical={`/product/${p.slug}`}
        jsonLd={productJsonLd(p, typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="product"
      />
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-ash">
        <Link to="/" className="hover:text-obsidian">Home</Link><ChevronRight size={12} />
        <Link to={`/${p.gender}`} className="capitalize hover:text-obsidian">{p.gender}</Link><ChevronRight size={12} />
        <Link to={`/category/${p.categorySlug}`} className="hover:text-obsidian">{p.categorySlug.replace(/-/g, ' ')}</Link><ChevronRight size={12} />
        <span className="clamp-2 max-w-[180px] text-obsidian">{p.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:sticky lg:top-24 lg:self-start">
          <div className="grid gap-3 sm:grid-cols-[76px_1fr]">
            <div className="order-2 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:order-1 sm:mx-0 sm:flex-col sm:overflow-visible sm:px-0">
              {media.map((m, i) => (
                <button key={i} onClick={() => setImgIdx(i)} aria-label={m.t === 'video' ? 'Play video' : `View ${i + 1}`}
                  className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${i === imgIdx ? 'border-obsidian' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  {m.t === 'img' ? (
                    <Img src={m.url} alt={m.alt} className="h-20 w-16 object-cover" />
                  ) : (
                    <span className="relative flex h-20 w-16 items-center justify-center bg-obsidian text-alabaster">
                      {ytId(m.url)
                        ? <img src={`https://img.youtube.com/vi/${ytId(m.url)}/hqdefault.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
                        : null}
                      <Play size={18} fill="currentColor" className="relative" />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="gallery-zoom order-1 overflow-hidden rounded-[2rem] bg-satin/40 sm:order-2">
              {!active || active.t === 'img' ? (
                <Img src={active?.url} alt={active?.alt || p.name} className="aspect-[4/5] w-full object-cover" />
              ) : activeYt ? (
                <iframe src={`https://www.youtube.com/embed/${activeYt}?rel=0`} title="Product video"
                  className="aspect-[4/5] w-full bg-obsidian" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              ) : (
                <video src={active.url} className="aspect-[4/5] w-full bg-obsidian object-cover" controls autoPlay muted loop playsInline />
              )}
            </div>
          </div>
        </motion.div>

        {/* Info */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2">
            <span className={`pill ${p.tier === 'Premium' ? 'bg-obsidian text-alabaster' : p.tier === 'Standard' ? 'bg-satin text-obsidian' : 'bg-sage/25 text-sagedeep'}`}>{p.tier === 'Premium' ? 'Signature' : p.tier}</span>
            {p.compareAtPrice && <span className="pill bg-sage/85 text-obsidian">Sale</span>}
            {p.stock <= 5 && p.stock > 0 && <span className="pill bg-satin text-ash">Only {p.stock} left</span>}
          </div>

          <h1 className="mt-4 font-display text-3xl leading-tight md:text-4xl">{p.name}</h1>

          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 text-obsidian">
              <Star size={14} fill="currentColor" /> <b>{p.ratingAvg.toFixed(1)}</b>
            </span>
            <span className="text-ash">·</span>
            <span className="text-ash">{p.ratingCount} reviews</span>
            <span className="text-ash">·</span>
            <span className="text-ash">{p.sku}</span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-3xl">{pkr(p.price)}</span>
            {p.compareAtPrice && <span className="text-lg text-ash line-through">{pkr(p.compareAtPrice)}</span>}
          </div>

          <p className="mt-5 text-[15px] leading-relaxed text-ash">{p.shortDescription}</p>

          {/* Fabric badges */}
          <div className="mt-5 flex flex-wrap gap-2">
            {p.badges.map((b) => <span key={b} className="badge-sage">{b}</span>)}
          </div>

          {/* Colour */}
          {p.colors.length > 0 && (
            <div className="mt-7">
              <p className="label"><Tx k="color" /> — <span className="text-obsidian">{color}</span></p>
              <div className="flex gap-3">
                {p.colors.map((c) => (
                  <button key={c.name} onClick={() => pickColor(c.name)} title={c.name}
                    className={`h-9 w-9 rounded-full border transition ${color === c.name ? 'ring-2 ring-obsidian ring-offset-2 ring-offset-alabaster' : 'border-line'}`}
                    style={{ backgroundColor: c.hex }} />
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {needsSize && (
            <div className="mt-7">
              <div className="flex items-center justify-between">
                <p className="label !mb-0"><Tx k="size" /> {sizeErr && !size && <span className="!text-red-700 normal-case tracking-normal">— please select</span>}</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => setGuideOpen(true)} className="text-xs font-semibold text-ash underline underline-offset-2 hover:text-obsidian">Size guide</button>
                  <Link to="/fit-finder" className="inline-flex items-center gap-1 text-xs font-semibold text-sagedeep hover:underline"><Ruler size={12} /> Fit Finder</Link>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.sizes.map((s) => (
                  <button key={s} onClick={() => { setSize(s); setSizeErr(false); }}
                    className={`min-w-11 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${size === s ? 'border-obsidian bg-obsidian text-alabaster' : 'border-line hover:border-obsidian/50'}`}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Qty + actions */}
          <div className="mt-8 flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-line px-1">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 text-ash hover:text-obsidian" aria-label="Decrease"><Minus size={14} /></button>
              <span className="min-w-8 text-center text-sm font-semibold">{qty}</span>
              <button onClick={() => setQty(Math.min(10, qty + 1))} className="p-3 text-ash hover:text-obsidian" aria-label="Increase"><Plus size={14} /></button>
            </div>
            <button onClick={() => toggleWish(p)} aria-label="Wishlist"
              className={`grid h-12 w-12 place-items-center rounded-full border transition ${wished ? 'border-obsidian bg-obsidian text-alabaster' : 'border-line text-ash hover:border-obsidian/50 hover:text-obsidian'}`}>
              <Heart size={17} fill={wished ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => tryAdd(false)} disabled={p.stock === 0} className="btn-outline"><Tx k="addToCart" /></button>
            <button onClick={() => tryAdd(true)} disabled={p.stock === 0} className="btn-primary"><Tx k="buyNow" /></button>
          </div>
          {p.stock === 0 && <p className="mt-3 text-sm text-red-700">Currently sold out — check back soon.</p>}

          {/* Assurances */}
          <div className="mt-8 grid grid-cols-3 gap-2 rounded-2xl border border-line bg-white/50 p-4 text-center">
            {[[Truck, '2–4 day delivery'], [RotateCcw, '14-day exchange'], [ShieldCheck, 'Discreet parcel']].map(([Icon, txt]) => (
              <div key={txt} className="flex flex-col items-center gap-1.5 text-[11px] font-medium text-ash"><Icon size={16} className="text-obsidian" />{txt}</div>
            ))}
          </div>

          {/* Accordions */}
          <div className="mt-8">
            <Accordion title="Description" defaultOpen>
              <p>{p.description}</p>
            </Accordion>
            <Accordion title="Fabric & Feel">
              <p className="font-medium text-obsidian">{p.fabric}</p>
              <p className="mt-2">Every VÉLOURA fabric is wash-tested for 40 cycles before it enters the edit — softness in, softness out.</p>
            </Accordion>
            <Accordion title="Care Instructions">
              <ul className="list-disc space-y-1.5 pl-5">{p.care.map((c) => <li key={c}>{c}</li>)}</ul>
            </Accordion>
            <Accordion title="Shipping & Exchange">
              <p>
                Flat {pkr(settings?.shippingFlatRate ?? 350)} nationwide, free over {pkr(settings?.freeShippingThreshold ?? 4999)}.
                Dispatched in 24–48h in plain, unmarked packaging. Unworn pieces exchange within 14 days — size swaps are free.
              </p>
            </Accordion>
          </div>
        </motion.div>
      </div>

      {/* Bundle */}
      {bundle.length > 0 && (
        <div className="mt-24">
          <ProductRow eyebrow="Complete the set" title="Pairs perfectly with" products={bundle.map(snap)} />
        </div>
      )}

      {/* Related products — same category / gender+tier */}
      {related.length > 0 && (
        <div className="mt-24">
          <ProductRow eyebrow="You may also like" title="Related pieces" products={related.map(snap)} />
        </div>
      )}

      {/* Recently viewed */}
      {recent.filter((r) => r.slug !== p.slug).length > 0 && (
        <div className="mt-24 pb-4">
          <ProductRow eyebrow="Your history" title="Recently Viewed" products={recent.filter((r) => r.slug !== p.slug).slice(0, 8)} />
        </div>
      )}

      <SizeGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} gender={p.gender} isBra={isBra} />
    </div>
  );
}
