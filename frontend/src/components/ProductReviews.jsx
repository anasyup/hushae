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
 * PRODUCT REVIEWS — luxury house register.
 *
 * Visual language matches the rest of the storefront: fine hairline rules,
 * tracked-caps eyebrows, serif headings, quiet type, restraint. All
 * behaviour is unchanged — filters/sort are server-side, verified badges,
 * helpful votes, reports, photos and the merchant-driven config all work
 * exactly as before.
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

  useEffect(() => {
    if (!pid || !cfg.enabled) return undefined;
    let alive = true;
    setPage(1);
    api(`/reviews/product/${pid}?${query(1)}`)
      .then((d) => { if (alive) { setData(d); setRows(d.reviews || []); } })
      .catch(() => { if (alive) { setData({ reviews: [], distribution: {}, total: 0, avg: 0, matching: 0 }); setRows([]); } });
    return () => { alive = false; };
  }, [pid, query, cfg.enabled]);

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
    <section className="mx-auto w-full max-w-[1440px] px-6 pt-10 lg:px-12" aria-labelledby="rv-h">
      {/* ── Compact summary bar — Reviews (N) · stars · rating ── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-neutral-200 py-3.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id="rv-h" className="text-[12px] font-medium uppercase tracking-[0.18em] text-[#111111]">
            {cfg.title} ({total})
          </h2>
          <Stars value={avg} size={13} className="gap-[3px]" />
          <span className="text-[12px] font-light tabular-nums text-neutral-500">
            {avg.toFixed(1)} / 5
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="group inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#111111] transition-colors hover:text-neutral-500"
        >
          Write a review
          <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">›</span>
        </button>
      </div>

      {total > 0 ? (
        <>
          {/* ── Distribution — quiet hairlines ── */}
          {cfg.showDistribution && (
            <div className="mt-5 max-w-lg space-y-1">
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
                    className={`flex items-center gap-3 py-1 pr-2 transition ${
                      active ? 'text-[#111111]' : 'text-neutral-500 hover:text-[#111111]'
                    }`}
                  >
                    <span className="w-9 shrink-0 text-left text-[11px] tracking-[0.08em]">{k} ★</span>
                    <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-neutral-200">
                      <span className="block h-full bg-[#111111]" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-neutral-400">{cnt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Customer photos ── */}
          {cfg.showMediaGallery && media.length > 0 && (
            <div className="mt-6">
              <h3 className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.24em] text-neutral-400">
                <ImageIcon size={12} aria-hidden="true" /> Customer photos ({media.length})
              </h3>
              <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {media.map((m, i) => (
                  <li key={`${m.reviewId}-${i}`} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setLightbox(i)}
                      aria-label={`Open photo ${i + 1} of ${media.length} from ${m.by || 'a customer'}`}
                      className="block h-14 w-14 overflow-hidden border border-neutral-200 bg-[#f2f0ec]"
                    >
                      <img src={m.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Controls — minimal luxury ── */}
          <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-neutral-200 pt-5">
            <label className="sr-only" htmlFor="rv-sort">Sort reviews</label>
            <select
              id="rv-sort" value={sort} onChange={(e) => setSort(e.target.value)}
              className="min-h-[44px] cursor-pointer appearance-none border-b border-neutral-300 bg-transparent pb-1 pr-6 text-[11px] font-medium uppercase tracking-[0.15em] text-black outline-none transition-colors hover:border-black focus:border-black"
            >
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <button
              type="button" onClick={() => setVerifiedOnly((v) => !v)} aria-pressed={verifiedOnly}
              className={`min-h-[44px] border-b pb-1 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors ${
                verifiedOnly ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'
              }`}
            >
              <CheckCircle2 size={13} className="mr-1 inline" aria-hidden="true" /> Verified only
            </button>

            {cfg.enablePhotos && (
              <button
                type="button" onClick={() => setMediaOnly((v) => !v)} aria-pressed={mediaOnly}
                className={`min-h-[44px] border-b pb-1 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors ${
                  mediaOnly ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'
                }`}
              >
                <ImageIcon size={13} className="mr-1 inline" aria-hidden="true" /> With photos
              </button>
            )}

            {filtered && (
              <button
                type="button" onClick={clearFilters}
                className="min-h-[44px] px-1 text-[11px] font-medium uppercase tracking-[0.15em] text-neutral-400 underline underline-offset-4 transition-colors hover:text-black"
              >
                Clear filters
              </button>
            )}

            <span className="ml-auto text-[11px] font-light uppercase tracking-[0.15em] text-neutral-400" role="status" aria-live="polite">
              {filtered ? `${matching} of ${total} match` : `Showing ${rows.length} of ${total}`}
            </span>
          </div>

          {/* ── List ── */}
          <ul ref={listRef} className="mt-2 divide-y divide-neutral-200 border-t border-neutral-200" aria-busy={data === null}>
            {rows.map((r) => (
              <ReviewRow key={r._id} review={r} cfg={cfg} onOpenPhoto={(url) => {
                const i = media.findIndex((m) => m.url === url);
                setLightbox(i >= 0 ? i : 0);
              }} />
            ))}
          </ul>

          {rows.length === 0 && data && (
            <p className="py-12 text-center text-[12px] font-light uppercase tracking-[0.15em] text-neutral-400">
              No reviews match those filters.{' '}
              <button type="button" onClick={clearFilters} className="font-medium text-black underline underline-offset-4">
                Clear them
              </button>
            </p>
          )}

          {data?.hasMore && (
            <div className="mt-8 text-center">
              <button
                type="button" onClick={loadMore} disabled={loadingMore}
                className="border border-black px-8 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-all duration-300 hover:bg-black hover:text-white disabled:opacity-50"
              >
                {loadingMore ? <><Spinner label="Loading" /> Loading…</> : `Show more reviews (${matching - rows.length} left)`}
              </button>
            </div>
          )}
        </>
      ) : (
        /* ── Premium empty state ── */
        <div className="mx-auto mt-8 max-w-md border border-neutral-200 bg-white px-8 py-10 text-center">
          <span className="mx-auto block h-px w-10 bg-[#111111]/50" aria-hidden="true" />
          <h3 className="mt-6 font-serif text-sm font-medium uppercase tracking-[0.18em] text-[#111111]">
            Be the first to write a review
          </h3>
          <p className="mt-4 text-[13px] font-light leading-relaxed text-neutral-500">
            {cfg.emptyText}
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mx-auto mt-7 inline-block bg-[#111111] px-10 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800"
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
 * One review — luxury register.
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
      const r = await api(`/reviews/${review._id}/helpful`, { method: 'POST' });
      if (typeof r.helpful === 'number') setHelpful(r.helpful);
      setVoted(!!r.voted);
    } catch { /* silent */ }
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
    <li className="py-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Stars value={review.rating} size={13} className="gap-[3px]" />
        {review.verified && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-[#111111]">
            <CheckCircle2 size={11} aria-hidden="true" /> Verified purchase
          </span>
        )}
        {review.featured && (
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-400">Featured</span>
        )}
      </div>

      {review.title && (
        <h3 className="mt-2.5 font-serif text-sm font-normal uppercase tracking-[0.08em] text-[#111111]">
          {review.title}
        </h3>
      )}
      <p className="mt-1.5 whitespace-pre-line text-[13px] font-light leading-[1.8] text-neutral-600">
        {review.body}
      </p>

      {(review.images || []).length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {review.images.map((img, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onOpenPhoto(img.url)}
                aria-label={`Open photo ${i + 1} from ${review.customerName}`}
                className="block h-12 w-12 overflow-hidden border border-neutral-200 bg-[#f2f0ec]"
              >
                <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[11px] font-light uppercase tracking-[0.15em] text-neutral-400">
        {review.customerName} · {reviewDate(review.createdAt)}
      </p>

      {cfg.allowMerchantReply && review.adminReply && (
        <div className="mt-3 border-l border-[#111111] bg-[#f7f4ef] px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#111111]">HUSHAE replied</p>
          <p className="mt-1 text-[12px] font-light leading-relaxed text-neutral-600">{review.adminReply}</p>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {cfg.allowHelpful && (
          <button
            type="button" onClick={vote} disabled={busy} aria-pressed={voted}
            className={`inline-flex min-h-[44px] items-center gap-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.12em] transition ${
              voted ? 'text-[#111111]' : 'text-neutral-400 hover:text-[#111111]'
            }`}
          >
            <ThumbsUp size={12} aria-hidden="true" />
            Helpful{helpful > 0 ? ` (${helpful})` : ''}
          </button>
        )}
        {cfg.allowReport && (
          <button
            type="button" onClick={report} disabled={reported}
            className="inline-flex min-h-[44px] items-center gap-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400 transition hover:text-[#111111] disabled:opacity-60"
          >
            <Flag size={11} aria-hidden="true" />
            {reported ? 'Reported' : 'Report'}
          </button>
        )}
      </div>
    </li>
  );
}
