import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, CheckCircle2, X } from 'lucide-react';
import { api } from '../api/client';

/**
 * ProductReviews — public-facing block for the product page.
 * Shows the current rating distribution + approved reviews +
 * a "Write a review" trigger opening a modal form.
 */
export default function ProductReviews({ product }) {
  const [data, setData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    if (!product?._id) return;
    api(`/reviews/product/${product._id}?sort=${sort}&limit=30`)
      .then(setData)
      .catch(() => setData({ reviews: [], distribution: {}, total: 0, avg: 0 }));
  }, [product?._id, sort]);

  if (!product?._id) return null;

  const avg = data?.avg || product.ratingAvg || 0;
  const total = data?.total || product.ratingCount || 0;
  const dist = data?.distribution || {};
  const maxBar = Math.max(1, ...[5, 4, 3, 2, 1].map(k => dist[k] || 0));

  return (
    <section className="mx-auto mt-16 max-w-5xl px-4 md:px-8">
      <div className="mb-10 flex flex-col items-start justify-between gap-6 border-t border-line pt-10 md:flex-row md:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Customer reviews</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">What people are saying</h2>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-outline">Write a review</button>
      </div>

      {total > 0 ? (
        <>
          <div className="mb-10 grid gap-8 md:grid-cols-[240px_1fr]">
            {/* Aggregate */}
            <div className="text-center md:text-left">
              <p className="font-display text-6xl">{avg.toFixed(1)}</p>
              <Stars value={avg} size={20} className="mt-2 justify-center md:justify-start" />
              <p className="mt-2 text-xs text-ash">{total} verified review{total === 1 ? '' : 's'}</p>
            </div>
            {/* Distribution bars */}
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map(k => {
                const cnt = dist[k] || 0;
                const pct = total ? (cnt / maxBar) * 100 : 0;
                return (
                  <div key={k} className="flex items-center gap-3 text-xs text-ash">
                    <span className="w-4">{k}</span>
                    <Star size={12} className="fill-sagedeep text-sagedeep" />
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                      <div className="h-full bg-sagedeep" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right tabular-nums">{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-6 flex items-center gap-3 text-xs">
            <span className="text-ash">Sort by:</span>
            <button onClick={() => setSort('recent')} className={`rounded-full px-3 py-1 ${sort === 'recent' ? 'bg-obsidian text-alabaster' : 'bg-satin text-ash'}`}>Most recent</button>
            <button onClick={() => setSort('helpful')} className={`rounded-full px-3 py-1 ${sort === 'helpful' ? 'bg-obsidian text-alabaster' : 'bg-satin text-ash'}`}>Most helpful</button>
          </div>

          <div className="space-y-6">
            {(data?.reviews || []).map(r => (
              <ReviewCard key={r._id} review={r} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-line bg-cream/40 py-16 text-center">
          <p className="font-display text-2xl">No reviews yet</p>
          <p className="mt-2 text-sm text-ash">Be the first to share your experience.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-6">Write the first review</button>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <ReviewForm
            product={product}
            onClose={() => setShowForm(false)}
            onSubmitted={() => { setShowForm(false); }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function ReviewCard({ review }) {
  const [helpful, setHelpful] = useState(review.helpful || 0);
  const [voted, setVoted] = useState(false);

  const vote = async () => {
    if (voted) return;
    setVoted(true); setHelpful(h => h + 1);
    try { await api(`/reviews/${review._id}/helpful`, { method: 'POST' }); } catch { /* noop */ }
  };

  return (
    <article className="rounded-2xl border border-line bg-white/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{review.customerName}</p>
            {review.verified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-sagedeep">
                <CheckCircle2 size={11} /> Verified buyer
              </span>
            )}
          </div>
          <Stars value={review.rating} size={13} className="mt-1" />
        </div>
        <p className="text-[11px] text-ash">{new Date(review.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
      </div>
      {review.title && <p className="mt-3 font-display text-lg">{review.title}</p>}
      <p className="mt-2 text-sm leading-relaxed text-ash">{review.body}</p>
      {review.adminReply && (
        <div className="mt-4 rounded-xl bg-sage/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sagedeep">HUSHAE responded</p>
          <p className="mt-1.5 text-sm text-obsidian">{review.adminReply}</p>
        </div>
      )}
      <button onClick={vote} className={`mt-4 inline-flex items-center gap-1.5 text-xs ${voted ? 'text-sagedeep' : 'text-ash hover:text-obsidian'}`}>
        <ThumbsUp size={13} /> Helpful ({helpful})
      </button>
    </article>
  );
}

export function Stars({ value = 0, size = 14, className = '' }) {
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(value) ? 'fill-sagedeep text-sagedeep' : 'text-line'}
        />
      ))}
    </div>
  );
}

function ReviewForm({ product, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [thankyou, setThankyou] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!body.trim() || !name.trim()) return;
    setBusy(true);
    try {
      await api('/reviews', {
        method: 'POST',
        body: {
          productId: product._id,
          rating,
          title: title.trim(),
          body: body.trim(),
          customerName: name.trim(),
          customerEmail: email.trim(),
          orderNumber: orderNumber.trim(),
          phone: phone.trim(),
        },
      });
      setThankyou(true);
      setTimeout(() => { onSubmitted?.(); }, 1400);
    } catch (err) {
      alert(err.message || 'Could not submit review');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-obsidian/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-alabaster p-6 md:p-8 shadow-soft"
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1.5 text-ash hover:bg-satin"><X size={18} /></button>
        {thankyou ? (
          <div className="py-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage/20"><CheckCircle2 size={26} className="text-sagedeep" /></div>
            <p className="mt-4 font-display text-2xl">Thank you</p>
            <p className="mt-2 text-sm text-ash">Your review is under moderation — it'll appear here soon.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Review</p>
            <h3 className="mt-1 font-display text-2xl">{product.name}</h3>

            <div className="mt-6">
              <label className="label">Your rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="p-0.5"
                    aria-label={`Rate ${n} stars`}
                  >
                    <Star size={26} className={n <= rating ? 'fill-sagedeep text-sagedeep' : 'text-line'} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="label">Name *</label>
                <input required className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayesha K." />
              </div>
              <div>
                <label className="label">Email (kept private)</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>

            <div className="mt-3">
              <label className="label">Title (optional)</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Softest bra I've owned" />
            </div>

            <div className="mt-3">
              <label className="label">Your review *</label>
              <textarea required rows={5} className="input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell us how it fits, the fabric, sizing, delivery experience…" />
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl bg-cream/50 p-4 md:grid-cols-2">
              <p className="col-span-full text-[10px] font-bold uppercase tracking-widest text-ash">Verify your purchase (optional)</p>
              <div>
                <label className="label">Order number</label>
                <input className="input" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="VL-YYYYMMDD-XXXXXX" />
              </div>
              <div>
                <label className="label">Phone used on order</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03XX XXXXXXX" />
              </div>
              <p className="col-span-full text-[11px] text-ash">Reviews with a matching order get a "Verified buyer" badge.</p>
            </div>

            <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
              {busy ? 'Submitting…' : 'Submit review'}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
