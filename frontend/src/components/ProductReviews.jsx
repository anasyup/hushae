import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Flag, Image as ImageIcon, ThumbsUp } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { reviewsConfig, reviewDate } from '../lib/reviewsConfig';
import Stars from './reviews/Stars';
import MediaLightbox from './reviews/MediaLightbox';
import ReviewForm from './reviews/ReviewForm';
import Spinner from './ui/Spinner';

/* ============================================================================
 * PRODUCT REVIEWS
 *
 * Measured before this rewrite: 2 sort chips, 0 star filters, no media
 * gallery, no report, no pagination — the list simply fetched 30 and stopped.
 *
 * Everything here is driven by settings.reviews, so the merchant can withdraw
 * helpful votes, reporting, photos, the distribution graph or the whole
 * feature from Admin → Settings → Reviews without a deploy.
 *
 * Filters and sorting are SERVER-side. Filtering 30 pre-fetched rows in the
 * browser would silently lie once a product has more than 30 reviews.
 * ========================================================================== */

const SORTS = [
  ['recent', 'Most recent'],
  ['helpful', 'Most helpful'],
  ['highest', 'Highest rated'],
  ['lowest', 'Lowest rated'],
  ['oldest', 'Oldest'],
];

export default function ProductReviews({ product }) {
  const { settings } = useApp();
  const cfg = useMemo(() => reviewsConfig(settings), [settings]);

  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState('recent');
  const [star, setStar] = useState(0);          // 0 = all
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [mediaOnly, setMediaOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [media, setMedia] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const listRef = useRef(null);

  const pid = product?._id;

  const query = useCallback((p) => {
    const q = new URLSearchParams({ sort, page: String(p), limit: String(cfg.perPage) });
    if (star) q.set('rating', String(star));
    if (verifiedOnly) q.set('verified', '1');
    if (mediaOnly) q.set('media', '1');
    return q.toString();
  }, [sort, star, verifiedOnly, mediaOnly, cfg.perPage]);

  /* Filter/sort change → page 1. The previous rows stay on screen while the
     new set loads (dimmed via aria-busy) rather than collapsing to nothing —
     the same rule the shop grid learned in Sprint 2C.3. */
  useEffect(() => {
    if (!pid || !cfg.enabled) return undefined;
    let alive = true;
    setPage(1);
    api(`/reviews/product/${pid}?${query(1)}`)
      .then((d) => { if (alive) { setData(d); setRows(d.reviews || []); } })
      .catch(() => { if (alive) { setData({ reviews: [], distribution: {}, total: 0, avg: 0, matching: 0 }); setRows([]); } });
    return () => { alive = false; };
  }, [pid, query, cfg.enabled]);

  /* The photo strip is its own request and only when the merchant allows it. */
  useEffect(() => {
    if (!pid || !cfg.enabled || !cfg.showMediaGallery || !cfg.enablePhotos) return undefined;
    let alive = true;
    api(`/reviews/product/${pid}/media`)
      .then((d) => { if (alive) setMedia(d.media || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [pid, cfg.enabled, cfg.showMediaGallery, cfg.enablePhotos]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const d = await api(`/reviews/product/${pid}?${query(next)}`);
      setRows((r) => [...r, ...(d.reviews || [])]);
      setData(d);
      setPage(next);
    } catch { /* the button stays, the shopper can retry */ }
    setLoadingMore(false);
  };

  const onPosted = () => {
    setShowForm(false);
    api(`/reviews/product/${pid}?${query(1)}`).then((d) => { setData(d); setRows(d.reviews || []); }).catch(() => {});
  };

  if (!pid || !cfg.enabled) return null;

  const avg = data?.avg ?? product.ratingAvg ?? 0;
  const total = data?.total ?? product.ratingCount ?? 0;
  const dist = data?.distribution || {};
  const matching = data?.matching ?? rows.length;
  const filtered = star || verifiedOnly || mediaOnly;
  const maxBar = Math.max(1, ...[5, 4, 3, 2, 1].map((k) => dist[k] || 0));

  const clearFilters = () => { setStar(0); setVerifiedOnly(false); setMediaOnly(false); };

  return (
    <section className="container-page mt-16 border-t border-line pt-10" aria-labelledby="rv-h">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-label uppercase tracking-widest text-sagedeep">Customer reviews</p>
          <h2 id="rv-h" className="mt-1.5 font-display text-h2">{cfg.title}</h2>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="btn-outline">Write a review</button>
      </div>

      {total > 0 ? (
        <>
          {/* ---- summary ---- */}
          <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
            <div className="text-center md:text-left">
              <p className="font-display text-display-2 leading-none">{avg.toFixed(1)}</p>
              <Stars value={avg} size={18} className="mt-2 justify-center md:justify-start" />
              <p className="mt-2 text-body-sm text-ash">
                {total} review{total === 1 ? '' : 's'}
                {data?.verifiedCount ? ` · ${data.verifiedCount} verified` : ''}
              </p>
            </div>

            {cfg.showDistribution && (
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((k) => {
                  const cnt = dist[k] || 0;
                  const pct = (cnt / maxBar) * 100;
                  const active = star === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setStar(active ? 0 : k)}
                      aria-pressed={active}
                      aria-label={`${cnt} ${k} star review${cnt === 1 ? '' : 's'}${active ? ', filter active' : ''}`}
                      className={`flex min-h-[44px] w-full items-center gap-3 rounded-control px-2 text-caption transition ${
                        active ? 'bg-obsidian/[0.05]' : 'hover:bg-satin/50'
                      }`}
                    >
                      <span className="w-8 shrink-0 text-left text-ash">{k} ★</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                        <span className="block h-full rounded-full bg-sagedeep" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="w-8 shrink-0 text-right tabular-nums text-ash">{cnt}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ---- customer photos ---- */}
          {cfg.showMediaGallery && media.length > 0 && (
            <div className="mt-8">
              <h3 className="flex items-center gap-2 text-label uppercase tracking-widest text-ash">
                <ImageIcon size={13} aria-hidden="true" /> Customer photos ({media.length})
              </h3>
              <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {media.map((m, i) => (
                  <li key={`${m.reviewId}-${i}`} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setLightbox(i)}
                      aria-label={`Open photo ${i + 1} of ${media.length} from ${m.by || 'a customer'}`}
                      className="block h-20 w-20 overflow-hidden rounded-control border border-line bg-cream"
                    >
                      <img src={m.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ---- controls ---- */}
          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-line pt-6">
            <label className="sr-only" htmlFor="rv-sort">Sort reviews</label>
            <select
              id="rv-sort" value={sort} onChange={(e) => setSort(e.target.value)}
              className="input input-sm min-h-[44px] w-auto"
            >
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <button
              type="button" onClick={() => setVerifiedOnly((v) => !v)} aria-pressed={verifiedOnly}
              className={`btn btn-sm gap-1.5 border ${verifiedOnly ? 'border-obsidian bg-obsidian text-alabaster' : 'border-bronze bg-white text-graphite'}`}
            >
              <CheckCircle2 size={13} aria-hidden="true" /> Verified only
            </button>

            {cfg.enablePhotos && (
              <button
                type="button" onClick={() => setMediaOnly((v) => !v)} aria-pressed={mediaOnly}
                className={`btn btn-sm gap-1.5 border ${mediaOnly ? 'border-obsidian bg-obsidian text-alabaster' : 'border-bronze bg-white text-graphite'}`}
              >
                <ImageIcon size={13} aria-hidden="true" /> With photos
              </button>
            )}

            {filtered && (
              <button
                type="button" onClick={clearFilters}
                className="min-h-[44px] px-2 text-caption font-semibold text-ash underline-offset-4 hover:text-obsidian hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          <p className="mt-3 text-caption text-ash" role="status" aria-live="polite">
            {filtered ? `${matching} of ${total} reviews match` : `Showing ${rows.length} of ${total}`}
          </p>

          {/* ---- list ---- */}
          <ul ref={listRef} className="mt-4 divide-y divide-line border-t border-line" aria-busy={data === null}>
            {rows.map((r) => (
              <ReviewRow key={r._id} review={r} cfg={cfg} onOpenPhoto={(url) => {
                const i = media.findIndex((m) => m.url === url);
                setLightbox(i >= 0 ? i : 0);
              }} />
            ))}
          </ul>

          {rows.length === 0 && data && (
            <p className="py-10 text-center text-body-sm text-ash">
              No reviews match those filters.{' '}
              <button type="button" onClick={clearFilters} className="font-medium text-obsidian underline underline-offset-4">Clear them</button>
            </p>
          )}

          {data?.hasMore && (
            <div className="mt-6 text-center">
              <button type="button" onClick={loadMore} disabled={loadingMore} className="btn-outline gap-2 disabled:opacity-50">
                {loadingMore ? <><Spinner label="Loading" /> Loading…</> : `Show more reviews (${matching - rows.length} left)`}
              </button>
            </div>
          )}
        </>
      ) : (
        /* ── Premium empty state — never a bare line ────────────────────
           A quiet, designed moment when no reviews exist yet: seam rule,
           tracked-caps eyebrow, a considered line, and a clear CTA that
           opens the review form. Restraint is the luxury. */
        <div className="mx-auto mt-10 max-w-md border border-line bg-white px-8 py-12 text-center">
          <span className="mx-auto block h-px w-10 bg-obsidian/50" aria-hidden="true" />
          <h3 className="mt-6 font-display text-sm font-medium uppercase tracking-[0.18em] text-obsidian">
            Be the first to write a review
          </h3>
          <p className="mt-4 text-body-sm leading-relaxed text-ash">
            {cfg.emptyText}
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary mx-auto mt-7"
          >
            Write a review
          </button>
        </div>
      )}

      {showForm && (
        <ReviewForm product={product} cfg={cfg} onClose={() => setShowForm(false)} onPosted={onPosted} />
      )}

      <MediaLightbox media={media} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * One review.
 * ------------------------------------------------------------------------- */
function ReviewRow({ review, cfg, onOpenPhoto }) {
  const [helpful, setHelpful] = useState(review.helpful || 0);
  const [voted, setVoted] = useState(false);
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);

  const vote = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // The server owns the count — one vote per person, and it returns the
      // real total, so an optimistic guess can never drift from the truth.
      const r = await api(`/reviews/${review._id}/helpful`, { method: 'POST' });
      if (typeof r.helpful === 'number') setHelpful(r.helpful);
      setVoted(!!r.voted);
    } catch { /* silent — the count simply does not move */ }
    setBusy(false);
  };

  const report = async () => {
    if (reported) return;
    try {
      await api(`/reviews/${review._id}/report`, { method: 'POST' });
      setReported(true);
    } catch { /* noop */ }
  };

  return (
    <li className="py-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Stars value={review.rating} size={14} />
        {review.verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sage/25 px-2 py-0.5 text-caption font-semibold text-sagedark">
            <CheckCircle2 size={10} aria-hidden="true" /> Verified purchase
          </span>
        )}
        {review.featured && (
          <span className="rounded-full bg-bronze/20 px-2 py-0.5 text-caption font-semibold text-graphite">Featured</span>
        )}
      </div>

      {review.title && <h3 className="mt-2 text-body font-medium">{review.title}</h3>}
      <p className="mt-1.5 whitespace-pre-line text-body-sm leading-relaxed">{review.body}</p>

      {(review.images || []).length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {review.images.map((img, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onOpenPhoto(img.url)}
                aria-label={`Open photo ${i + 1} from ${review.customerName}`}
                className="block h-16 w-16 overflow-hidden rounded-control border border-line bg-cream"
              >
                <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2.5 text-caption text-ash">
        {review.customerName} · {reviewDate(review.createdAt)}
      </p>

      {cfg.allowMerchantReply && review.adminReply && (
        <div className="mt-3 rounded-card border-l-2 border-sagedeep bg-cream/50 px-4 py-3">
          <p className="text-caption font-semibold uppercase tracking-wider text-sagedark">HUSHAE replied</p>
          <p className="mt-1 text-body-sm leading-relaxed">{review.adminReply}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {cfg.allowHelpful && (
          <button
            type="button" onClick={vote} disabled={busy} aria-pressed={voted}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-caption transition ${
              voted ? 'bg-obsidian/[0.06] font-semibold text-obsidian' : 'text-ash hover:text-obsidian'
            }`}
          >
            <ThumbsUp size={13} aria-hidden="true" />
            Helpful{helpful > 0 ? ` (${helpful})` : ''}
          </button>
        )}
        {cfg.allowReport && (
          <button
            type="button" onClick={report} disabled={reported}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-caption text-ash transition hover:text-obsidian disabled:opacity-60"
          >
            <Flag size={12} aria-hidden="true" />
            {reported ? 'Reported' : 'Report'}
          </button>
        )}
      </div>
    </li>
  );
}
