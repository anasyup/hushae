import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, Heart, Share2, ShoppingBag, Trash2 } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { pkr } from '../../lib/format';
import Img from '../../components/Img';
import ProductRow from '../../components/ProductRow';

/* ============================================================================
 * Saved — wishlist inside the account, plus recently viewed.
 *
 * The wishlist page already existed but had no way to move a piece into the
 * bag and no way to share it. Both were in the brief and both are here, with
 * the merchant able to hide either section from
 * Admin → Settings → Customer Accounts.
 *
 * Sharing uses the native share sheet on a phone (which is where most of this
 * store's customers are) and falls back to copying the link on desktop.
 * ========================================================================== */
export default function SavedPanel({ cfg }) {
  const { wishlist, toggleWish, addToCart, recent, auth, toast } = useApp();
  const [shared, setShared] = useState(false);
  const [addedId, setAddedId] = useState('');

  const share = async () => {
    // Slugs, not ids: a shared link should survive and stay readable.
    const slugs = wishlist.map((p) => p.slug).filter(Boolean).slice(0, 30).join(',');
    const url = `${window.location.origin}/shop?picks=${encodeURIComponent(slugs)}`;
    const text = 'My HUSHAE wishlist';
    try {
      if (navigator.share) await navigator.share({ title: 'HUSHAE', text, url });
      else {
        await navigator.clipboard?.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
      }
    } catch { /* the user dismissed the sheet */ }
  };

  const moveToBag = (p) => {
    addToCart(p, { size: p.sizes?.[0] || '', color: p.colors?.[0]?.name || '', quantity: 1 });
    setAddedId(p.id);
    setTimeout(() => setAddedId(''), 1600);
  };

  return (
    <div className="space-y-6">
      {cfg.showWishlist && (
        <section className="card-content" aria-labelledby="sec-wish">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="sec-wish" className="flex items-center gap-2 text-label uppercase tracking-widest text-ash">
              <Heart size={13} aria-hidden="true" /> Wishlist ({wishlist.length})
            </h2>
            {wishlist.length > 0 && (
              <button
                type="button" onClick={share}
                className="btn btn-sm gap-1.5 border border-stone bg-white text-graphite hover:bg-satin/60"
              >
                {shared ? <Check size={13} className="text-sagedark" aria-hidden="true" /> : <Share2 size={13} aria-hidden="true" />}
                {shared ? 'Link copied' : 'Share'}
              </button>
            )}
          </div>

          {!auth && (
            <p className="mt-2 text-caption text-ash">Saved on this device. Sign in to keep it across devices.</p>
          )}

          {wishlist.length === 0 ? (
            <div className="mt-4 rounded-card border border-dashed border-line py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-cream text-ash" aria-hidden="true">
                <Heart size={20} strokeWidth={1.6} />
              </span>
              <p className="mt-3 text-body-sm font-medium">Nothing saved yet</p>
              <p className="mt-1 text-caption text-ash">Tap the heart on any piece to keep it here.</p>
              <Link to="/women" className="btn-primary mt-5">Discover pieces</Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line" aria-live="polite">
              {wishlist.map((p) => (
                <li key={p.id} className="flex items-center gap-3.5 py-4">
                  <Link to={`/product/${p.slug}`} className="shrink-0 overflow-hidden rounded-control bg-cream" tabIndex={-1} aria-hidden="true">
                    <Img src={p.image} alt="" className="h-20 w-16 object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-body-sm font-medium leading-snug">
                      <Link to={`/product/${p.slug}`} className="transition hover:underline">{p.name}</Link>
                    </h3>
                    <p className="mt-0.5 text-body-sm font-semibold tabular-nums">{pkr(p.price)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      type="button" onClick={() => moveToBag(p)}
                      className="btn btn-sm gap-1.5 bg-obsidian px-3 text-alabaster"
                      aria-label={`Move ${p.name} to your bag`}
                    >
                      {addedId === p.id
                        ? <><Check size={13} aria-hidden="true" /> Added</>
                        : <><ShoppingBag size={13} aria-hidden="true" /> Move to bag</>}
                    </button>
                    <button
                      type="button" onClick={() => toggleWish(p)}
                      className="grid h-11 w-11 place-items-center rounded-full text-ash transition hover:bg-satin/60 hover:text-obsidian"
                      aria-label={`Remove ${p.name} from wishlist`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {cfg.showRecentlyViewed && recent.length > 0 && (
        <section aria-labelledby="sec-recent">
          <h2 id="sec-recent" className="flex items-center gap-2 text-label uppercase tracking-widest text-ash">
            <Clock size={13} aria-hidden="true" /> Recently viewed
          </h2>
          <div className="mt-4">
            <ProductRow products={recent.slice(0, 8)} />
          </div>
        </section>
      )}

      {cfg.showRecentlyViewed && recent.length === 0 && cfg.showWishlist && (
        <p className="text-caption text-ash">Pieces you look at will appear here.</p>
      )}
    </div>
  );
}
