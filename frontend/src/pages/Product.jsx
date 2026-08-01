import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, Banknote, CheckCircle2, ChevronRight, CreditCard, Heart,
  Package, RotateCcw, Ruler, ShieldCheck, Star, Truck,
} from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { pkr, snap } from '../lib/format';
import { isVideo } from '../lib/media';
import QuantityStepper from '../components/ui/QuantityStepper';
import ProductRow from '../components/ProductRow';
import ProductReviews from '../components/ProductReviews';
import ProductQA from '../components/reviews/ProductQA';
import SizeGuideModal from '../components/SizeGuideModal';
import { ProductSkeleton } from '../components/Skeletons';
import Tx from '../components/Tx';
import Seo, { productJsonLd } from '../components/Seo';
import ProductGallery from './product/ProductGallery';
import StickyBuyBar from './product/StickyBuyBar';

/* Product-page only, and it drags Countdown along with it. Lazy so the shop
   grid and the home page never download either. */
const ProductPromoPanel = lazy(() => import('../components/marketing/ProductPromoPanel'));

import Accordion from './product/Accordion';

/* Light swatches need a dark tick, everything else a light one. */
const LIGHT_HEX = new Set(['#FFFFFF', '#FFF', '#F7F5F1', '#EFEAE3', '#E3C9B3', '#E8C7C8', '#E4DDD3']);

/* Phase 2C — the same standing-markdown rule ProductCard adopted in Part B,
 * applied here because the product page had been missed.
 *
 * MEASURED against the live catalogue: 101 of 101 products carry a
 * compareAtPrice, median markdown 22%, and only 6 exceed 25%. So the "% off"
 * chip printed on every single product page in the shop. A discount flag that
 * is always on is not a discount flag, it is decoration — and on a page whose
 * job is to make one garment feel considered, it reads as a clearance rack.
 *
 * The strike-through price and the "Save PKR x" line immediately below still
 * state the saving in full, so nothing is hidden from the shopper; only the
 * shouting is removed. Above the threshold the chip returns and now means
 * something. Kept as a module constant, identical value to ProductCard's, so
 * the two surfaces cannot drift apart. */
const STANDING_MARKDOWN = 25;

/* Shared so the three crumbs cannot drift apart. */
const CRUMB = 'transition-colors duration-base ease-standard hover:text-obsidian';

export default function Product() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { addToCart, inWishlist, toggleWish, pushRecent, recent, settings } = useApp();
  const rvCfg = settings?.customerExperience?.recentlyViewed || {};

  const [p, setP] = useState(null);
  const [err, setErr] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [sizeErr, setSizeErr] = useState(false);
  const [added, setAdded] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [bundle, setBundle] = useState([]);
  const [related, setRelated] = useState([]);
  /* null = not answered yet. The header must not print a review count the
     reviews section cannot back up, so it waits for the real total rather
     than trusting product.ratingCount (see the header comment). */
  const [reviewTotal, setReviewTotal] = useState(null);

  const ctaRef = useRef(null);   // the real Add/Buy row — what the sticky bar shadows
  const sizeRef = useRef(null);

  useEffect(() => {
    setP(null); setErr(false); setImgIdx(0); setSize(''); setQty(1);
    setSizeErr(false); setAdded(false); setBundle([]); setRelated([]);
    setReviewTotal(null);
    api(`/products/${slug}`)
      .then((d) => {
        setP(d.product);
        setColor(d.product.colors[0]?.name || '');
        pushRecent(d.product);
        const bslug = d.product.bundleSlug || '';
        if (bslug) api(`/products?category=${bslug}&limit=3&sort=popular`).then((x) => setBundle(x.products)).catch(() => {});
        /* limit=1 — this asks only for the count, not the page of reviews the
           reviews section fetches for itself further down. Chained off the
           product because the id is not known before it resolves. On failure
           the header simply shows no rating, which is the honest default. */
        api(`/reviews/product/${d.product._id}?limit=1`)
          .then((r) => setReviewTotal(Number(r?.total) || 0))
          .catch(() => setReviewTotal(0));
      })
      .catch(() => setErr(true));
    api(`/products/${slug}/related`).then((d) => setRelated(d.products || [])).catch(() => setRelated([]));
  }, [slug]); // eslint-disable-line

  // Clear the "added" confirmation when the shopper changes their choice.
  useEffect(() => { setAdded(false); }, [size, color, qty]);

  const media = useMemo(() => {
    if (!p) return [];
    const imgs = (p.images || []).map((im) => ({ t: isVideo(im.url) ? 'video' : 'img', url: im.url, alt: im.alt || p.name }));
    return p.video && !imgs.some((m) => m.url === p.video)
      ? [...imgs, { t: 'video', url: p.video, alt: `${p.name} video` }]
      : imgs;
  }, [p]);

  if (err) {
    return (
      <div className="container-page py-sect-y md:py-sect-y-lg">
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><Package size={24} strokeWidth={1.6} /></span>
          <h1 className="mt-6 font-display text-h2">This piece has moved on</h1>
          <p className="mt-2 text-body-sm">It may be sold out or no longer part of the edit.</p>
          <Link to="/shop" className="btn-primary mt-8">Back to Shop</Link>
        </div>
      </div>
    );
  }
  if (!p) return <ProductSkeleton />;

  const wished = inWishlist(p);
  const isBra = p.categorySlug === 'bras';
  const needsSize = (p.sizes || []).length > 0;
  const soldOut = p.stock === 0;
  const onSale = p.compareAtPrice > p.price;
  const off = onSale ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;
  const notableMarkdown = onSale && off > STANDING_MARKDOWN;
  const lowStock = !soldOut && p.stock <= 5;

  const tierLabel = p.tier === 'Premium' ? 'Signature' : p.tier;

  /* Only what the reviews section can actually render. While the count is in
     flight this is 0, so the header never flashes a number and then withdraws
     it — the block is simply absent until the truth arrives, which also keeps
     the layout stable (the SKU line holds the row height either way). */
  const reviewsShown = reviewTotal ?? 0;

  /* MEASURED: 40 of 101 products list their own tier again inside `badges`,
     so the header read "SIGNATURE" and then the badge row underneath read
     "SIGNATURE  SILK-TOUCH  NEW" — the same word twice, 15px apart, in two
     different colours. Dropping the echo leaves the genuine descriptors.
     Case-insensitive because the data is merchant-entered. */
  const extraBadges = (p.badges || [])
    .filter((b) => String(b).trim().toLowerCase() !== String(tierLabel).trim().toLowerCase());

  const tryAdd = (goToCheckout) => {
    if (needsSize && !size) {
      setSizeErr(true);
      // Move the shopper to the thing that is blocking them, rather than
      // showing an error they may have scrolled past.
      sizeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      sizeRef.current?.querySelector('button')?.focus();
      return;
    }
    addToCart(p, { size, color, quantity: qty });
    setAdded(true);
    if (goToCheckout) nav('/checkout');
  };

  const pickColor = (name) => {
    setColor(name);
    const c = p.colors.find((x) => x.name === name);
    if (c?.image) {
      const idx = p.images.findIndex((im) => im.url === c.image);
      if (idx >= 0) setImgIdx(idx);
    }
  };

  return (
    <div className="container-page py-6 md:py-8">
      <Seo
        title={p.name}
        description={p.shortDescription || p.description?.slice(0, 160) || `${p.name} — premium innerwear from HUSHAE. PKR ${p.price}. ${p.stock > 0 ? 'In stock' : 'Out of stock'}. COD available.`}
        image={p.images?.[0]?.url}
        canonical={`/product/${p.slug}`}
        jsonLd={productJsonLd(p, typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="product"
      />

      {/* MEASURED transition: all 0s — the breadcrumb links had no easing at
          all while the size buttons beside them run 150ms and the CTAs 220ms.
          A colour that snaps reads as a plain document link; a colour that
          eases reads as a considered one. This is the cheapest luxury cue on
          the page and it was simply missing. */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-caption text-ash">
        <Link to="/" className={CRUMB}>Home</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <Link to={`/${p.gender}`} className={`capitalize ${CRUMB}`}>{p.gender}</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <Link to={`/category/${p.categorySlug}`} className={CRUMB}>{p.categorySlug.replace(/-/g, ' ')}</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span aria-current="page" className="clamp-2 max-w-[180px] text-obsidian">{p.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
        <ProductGallery media={media} index={imgIdx} onIndex={setImgIdx} productName={p.name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`pill ${p.tier === 'Premium' ? 'bg-obsidian text-alabaster' : p.tier === 'Standard' ? 'bg-satin text-obsidian' : 'badge-sage'}`}>
              {tierLabel}
            </span>
            {notableMarkdown && <span className="badge-sale">{off}% off</span>}
          </div>

          <h1 className="mt-gap-sm font-display text-h1 leading-tight">{p.name}</h1>

          {/* MEASURED: this header advertised "4.7 · 70 reviews" while the
              reviews section 2,000px below rendered "No reviews yet". 100 of
              101 products carry a ratingCount (4,326 claimed reviews in total)
              and GET /api/reviews/product/:id returns total: 0 for every one
              of them — the counts are seed data, no review document exists.

              A shop that advertises reviews it cannot show reads as fake, and
              it is the one thing on a product page a shopper is most likely to
              check. `reviewsShown` is the count the reviews section will
              actually be able to display, so the two can no longer disagree.
              Nothing is deleted: if the merchant approves real reviews the
              count reappears by itself. */}
          <div className="mt-gap-sm flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
            {reviewsShown > 0 ? (
              <>
                <span className="inline-flex items-center gap-1 text-obsidian">
                  <Star size={14} fill="currentColor" aria-hidden="true" />
                  <b>{p.ratingAvg.toFixed(1)}</b>
                  <span className="sr-only">out of 5</span>
                </span>
                <span aria-hidden="true" className="text-ash">·</span>
                <a href="#reviews" className="text-ash underline-offset-4 hover:text-obsidian hover:underline">
                  {reviewsShown} review{reviewsShown === 1 ? '' : 's'}
                </a>
                <span aria-hidden="true" className="text-ash">·</span>
              </>
            ) : null}
            <span className="text-ash">SKU {p.sku}</span>
          </div>

          {/* MEASURED type ladder before this change (390px):
                h1 30 · price 24 · comparePrice 17 · shortDesc 15 · save/stock/sku 13
              The struck-through OLD price was rendering at body-lg (17px) —
              LARGER than the product's own description (15px) and second only
              to the live price itself. The loudest thing after the price was
              the number the shopper is not paying.
              body-sm (13px) puts it on the same rung as "Save PKR x", which is
              the same idea expressed twice; the strike-through and the colour
              already mark it as historic. New ladder: 30 · 24 · 13. */}
          <div className="mt-gap-md flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-h2 tabular-nums text-obsidian">{pkr(p.price)}</span>
            {onSale && (
              <>
                <span className="text-body-sm tabular-nums text-ash line-through">
                  <span className="sr-only">Regular price </span>{pkr(p.compareAtPrice)}
                </span>
                <span className="text-body-sm tabular-nums text-sagedeep">
                  Save {pkr(p.compareAtPrice - p.price)}
                </span>
              </>
            )}
          </div>

          {/* Stock is a live region: choosing a variant should tell a screen
              reader whether it can actually be bought. */}
          <p aria-live="polite" className="mt-gap-sm flex items-center gap-1.5 text-body-sm">
            {soldOut ? (
              <><AlertCircle size={14} className="text-red-600" aria-hidden="true" /><span className="font-medium text-red-700">Sold out — check back soon</span></>
            ) : lowStock ? (
              <><AlertCircle size={14} className="text-clay" aria-hidden="true" /><span className="font-medium text-obsidian">Only {p.stock} left</span></>
            ) : (
              <><CheckCircle2 size={14} className="text-sagedeep" aria-hidden="true" /><span className="text-sagedeep">In stock — ships in 24–48h</span></>
            )}
          </p>

          {p.shortDescription && <p className="mt-gap-md text-body leading-relaxed text-ink">{p.shortDescription}</p>}

          {extraBadges.length > 0 && (
            <ul className="mt-gap-md flex flex-wrap gap-2">
              {extraBadges.map((b) => <li key={b} className="badge-sage">{b}</li>)}
            </ul>
          )}

          {p.colors?.length > 0 && (
            <fieldset className="mt-gap-lg border-0 p-0">
              <legend className="label !mb-2">
                <Tx k="color" /> — <span className="text-obsidian">{color}</span>
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {p.colors.map((c) => {
                  const on = color === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => pickColor(c.name)}
                      aria-pressed={on}
                      aria-label={c.name}
                      title={c.name}
                      /* 5% with no curve was a pop; 3% on the standard curve
                         is a lift. The selected ring is what communicates
                         state — the scale only acknowledges the pointer. */
                      className={`grid h-11 w-11 place-items-center rounded-full border transition-[box-shadow,transform] duration-base ease-standard hover:scale-[1.03] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:scale-100 ${
                        on ? 'border-transparent ring-2 ring-obsidian ring-offset-2 ring-offset-alabaster' : 'border-line hover:border-stone'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {on && (
                        <CheckCircle2
                          size={15} strokeWidth={2.4} aria-hidden="true"
                          className={LIGHT_HEX.has(String(c.hex).toUpperCase()) ? 'text-obsidian' : 'text-white'}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {needsSize && (
            <fieldset ref={sizeRef} className="mt-gap-lg border-0 p-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <legend className="label !mb-0 float-left"><Tx k="size" /></legend>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setGuideOpen(true)}
                    className="text-caption font-semibold text-ash underline underline-offset-4 transition-colors duration-base ease-standard hover:text-obsidian">
                    Size guide
                  </button>
                  <Link to="/fit-finder" className="inline-flex items-center gap-1 text-caption font-semibold text-sagedeep transition-colors duration-base ease-standard hover:text-sagedark hover:underline">
                    <Ruler size={12} aria-hidden="true" /> Fit Finder
                  </Link>
                </div>
              </div>

              <div className="mt-gap-sm flex flex-wrap gap-2">
                {p.sizes.map((s) => {
                  const on = size === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSize(s); setSizeErr(false); }}
                      aria-pressed={on}
                      aria-label={`Size ${s}`}
                      /* transition-colors only meant the selected state
                         arrived with no physical feedback at all. A 2% settle
                         on press plus a hairline lift on hover is the whole
                         gesture — anything larger reads as a toy. */
                      className={`min-h-[44px] min-w-[52px] rounded-control border px-3.5 text-body-sm transition-[color,background-color,border-color,transform] duration-base ease-standard active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                        on
                          ? 'border-obsidian bg-obsidian font-medium text-alabaster'
                          : 'border-line font-normal text-ink hover:border-obsidian/60 hover:bg-cream/40'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              {/* role="alert" so the message is spoken, not just painted. */}
              {sizeErr && !size && (
                <p role="alert" className="field-error">
                  <AlertCircle size={13} aria-hidden="true" /> Please choose a size first
                </p>
              )}
            </fieldset>
          )}

          <div className="mt-gap-lg flex items-center gap-3">
            <QuantityStepper value={qty} onChange={setQty} min={1} max={Math.max(1, Math.min(10, p.stock || 10))} />
            <button
              type="button"
              onClick={() => toggleWish(p)}
              aria-pressed={wished}
              aria-label={`${wished ? 'Remove' : 'Save'} ${p.name} ${wished ? 'from' : 'to'} wishlist`}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border transition-colors duration-base ${
                wished ? 'border-obsidian bg-obsidian text-alabaster' : 'border-line text-ash hover:border-obsidian/50 hover:text-obsidian'
              }`}
            >
              <Heart size={17} strokeWidth={1.8} fill={wished ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>

          <div ref={ctaRef} className="mt-gap-sm grid grid-cols-2 gap-3">
            <button type="button" onClick={() => tryAdd(false)} disabled={soldOut} className="btn btn-outline disabled:opacity-40">
              <Tx k="addToCart" />
            </button>
            <button type="button" onClick={() => tryAdd(true)} disabled={soldOut} className="btn btn-primary disabled:opacity-40">
              <Tx k="buyNow" />
            </button>
          </div>

          <p aria-live="polite" className="min-h-[1.25rem] text-body-sm">
            {added && (
              <span className="inline-flex items-center gap-1.5 pt-2 font-medium text-sagedeep">
                <CheckCircle2 size={14} aria-hidden="true" /> Added to your bag
              </span>
            )}
          </p>

          <ul className="mt-gap-lg grid grid-cols-3 gap-2 rounded-card border border-line bg-white/50 p-4 text-center">
            {[
              [Truck, '2–4 day delivery'],
              [RotateCcw, '14-day exchange'],
              [ShieldCheck, 'Discreet parcel'],
            ].map(([Icon, txt]) => (
              <li key={txt} className="flex flex-col items-center gap-1.5 text-caption font-medium text-ash">
                <Icon size={16} className="text-obsidian" aria-hidden="true" />{txt}
              </li>
            ))}
          </ul>

          <div className="mt-gap-sm flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-line bg-white/50 px-4 py-3">
            <span className="text-label font-bold uppercase text-ash">Pay with</span>
            {[[Banknote, 'Cash on delivery'], [CreditCard, 'JazzCash'], [CreditCard, 'EasyPaisa'], [Package, 'Bank transfer']].map(([Icon, label]) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-caption text-ink">
                <Icon size={14} className="text-ash" aria-hidden="true" />{label}
              </span>
            ))}
          </div>

          {/* Offers on this piece: flash banner, countdown, bundle wording and
              frequently-bought-together. Renders nothing when no promotion
              covers the product, so the page is unchanged for a catalogue with
              no promotions attached. */}
          <div className="mt-gap-md">
            <Suspense fallback={null}>
              <ProductPromoPanel product={p} />
            </Suspense>
          </div>

          <div className="mt-gap-lg">
            <Accordion title="Description" defaultOpen>
              <p>{p.description}</p>
            </Accordion>
            <Accordion title="Fabric & feel">
              <p className="font-medium text-obsidian">{p.fabric}</p>
              <p className="mt-2">Every HUSHAE fabric is wash-tested for 40 cycles before it enters the edit — softness in, softness out.</p>
            </Accordion>
            <Accordion title="Care instructions">
              <ul className="list-disc space-y-1.5 pl-5">{(p.care || []).map((c) => <li key={c}>{c}</li>)}</ul>
            </Accordion>
            <Accordion title="Shipping & exchange">
              <p>
                Flat {pkr(settings?.shippingFlatRate ?? 350)} nationwide, free over {pkr(settings?.freeShippingThreshold ?? 4999)}.
                Dispatched in 24–48h in plain, unmarked packaging.
              </p>
              <p className="mt-2">
                Unworn pieces exchange within 14 days — size swaps are free. For hygiene reasons innerwear is only
                returnable if it arrives faulty.
              </p>
            </Accordion>
            <Accordion title="Product details">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                {[
                  ['SKU', p.sku],
                  ['Material', p.fabric],
                  ['Tier', p.tier === 'Premium' ? 'Signature' : p.tier],
                  ['Category', p.categorySlug?.replace(/-/g, ' ')],
                  ['Sizes', (p.sizes || []).join(' · ') || '—'],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-label font-bold uppercase text-ash">{k}</dt>
                    <dd className="capitalize text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </Accordion>
          </div>
        </div>
      </div>

      {bundle.length > 0 && (
        <div className="mt-20 md:mt-24">
          <ProductRow eyebrow="Complete the set" title="Pairs perfectly with" products={bundle.map(snap)} />
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-20 md:mt-24">
          <ProductRow eyebrow="You may also like" title="Related pieces" products={related.map(snap)} />
        </div>
      )}

      <div id="reviews" className="scroll-mt-28">
        <ProductReviews product={p} />
        <ProductQA product={p} />
      </div>

      {rvCfg.enabled !== false && rvCfg.showOnProduct !== false
        && recent.filter((r) => r.slug !== p.slug).length > 0 && (
        <div className="mt-20 pb-4 md:mt-24">
          <ProductRow eyebrow="Your history" title={rvCfg.title || 'Recently viewed'} products={recent.filter((r) => r.slug !== p.slug).slice(0, 8)} />
        </div>
      )}

      <StickyBuyBar
        product={p}
        watchRef={ctaRef}
        size={size}
        needsSize={needsSize}
        onAdd={() => tryAdd(false)}
        disabled={soldOut}
        thumb={p.images?.[0]?.url}
      />

      <SizeGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} gender={p.gender} isBra={isBra} />
    </div>
  );
}
