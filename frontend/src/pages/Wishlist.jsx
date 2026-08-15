import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Check, Heart, Share2, ShoppingBag, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { cxConfig } from '../lib/cxConfig';
import { titleCase } from '../lib/productMeta';
import { CARD_NAME, CARD_NAME_LINK, CARD_SUBTITLE, cardSubtitle, PriceRow } from '../lib/cardType';
import Img from '../components/Img';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Seo from '../components/Seo';

/* ============================================================================
 * WISHLIST
 *
 * The old page was a bare grid of product cards: no way to move a piece into
 * the bag, no share, no clear-all. Measured before this rewrite —
 * moveToCart:false, share:false, clearAll:false.
 *
 * Every control here is gated on settings.customerExperience.wishlist, so the
 * merchant can withdraw any of them from
 * Admin → Settings → Customer Experience without a deploy.
 *
 * Mobile-first: a single-column list with 44px controls, because ~85% of this
 * store's traffic is phones. The grid only appears from sm upwards.
 * ========================================================================== */
export default function Wishlist() {
  const { wishlist, toggleWish, clearWish, addToCart, auth, settings, toast } = useApp();
  const cfg = useMemo(() => cxConfig(settings).wishlist, [settings]);

  const [addedId, setAddedId] = useState('');
  const [shared, setShared] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const moveToBag = (p) => {
    addToCart(p, { size: p.sizes?.[0] || '', color: p.colors?.[0]?.name || '', quantity: 1 });
    setAddedId(p.id);
    setTimeout(() => setAddedId(''), 1600);
  };

  const remove = async (p) => {
    const r = await toggleWish(p);
    if (r && r.ok === false) setErr(r.message);
  };

  const share = async () => {
    // Slugs, not ids — a shared link should stay readable and keep working.
    const slugs = wishlist.map((p) => p.slug).filter(Boolean).slice(0, 30).join(',');
    const url = `${window.location.origin}/shop?picks=${encodeURIComponent(slugs)}`;
    try {
      if (navigator.share) await navigator.share({ title: 'HUSHAE', text: 'My HUSHAE wishlist', url });
      else {
        await navigator.clipboard?.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
      }
    } catch { /* the user dismissed the share sheet */ }
  };

  const doClear = async () => {
    setBusy(true);
    await clearWish();
    setBusy(false);
    setConfirmClear(false);
    toast('Wishlist cleared');
  };

  /* The whole feature can be switched off by the merchant. */
  if (!cfg.enabled) {
    return (
      <div className="container-page py-sect-y text-center pt-[190px]">
        <h1 className="font-display text-h2">{cfg.title}</h1>
        <p className="mt-3 text-body text-ash">This feature is currently unavailable.</p>
        <Link to="/women" className="btn-primary mt-8">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="container-page pt-[190px] pb-8 md:pb-12"><Seo title="Wishlist" description="Your saved HUSHAE pieces — move them to your bag in one tap." />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-6">
        <div>
          <h1 className="font-display text-h1">
            {cfg.title} <span className="text-ash">({wishlist.length})</span>
          </h1>
          <p className="mt-1.5 text-body-sm text-ash">
            {auth
              ? 'Saved to your account — it follows you everywhere.'
              : 'Saved on this device. Sign in to keep it across devices.'}
          </p>
        </div>

        {wishlist.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {cfg.allowShare && (
              <button
                type="button" onClick={share}
                className="btn btn-sm gap-1.5 border border-bronze bg-white text-graphite hover:bg-satin/60"
              >
                {shared ? <Check size={13} className="text-sagedark" aria-hidden="true" /> : <Share2 size={13} aria-hidden="true" />}
                {shared ? 'Link copied' : 'Share'}
              </button>
            )}
            {cfg.allowClearAll && (
              <button
                type="button" onClick={() => setConfirmClear(true)}
                className="btn btn-sm gap-1.5 border border-bronze bg-white text-ash hover:text-obsidian"
              >
                <Trash2 size={13} aria-hidden="true" /> Clear all
              </button>
            )}
          </div>
        )}
      </header>

      {/* Announced: the count changes as pieces are removed. */}
      <p className="sr-only" role="status">{wishlist.length} items saved</p>

      {err && (
        <p role="alert" className="mt-5 flex items-start gap-2 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-800">
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{err}
        </p>
      )}

      {confirmClear && (
        <div role="alertdialog" aria-label="Confirm clearing your wishlist" className="mt-5 rounded-card border border-red-200 bg-red-50 p-4">
          <p className="text-body-sm text-red-900">Remove all {wishlist.length} saved pieces?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={doClear} disabled={busy} className="btn btn-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
              {busy ? <><Spinner label="Clearing" /> Clearing…</> : 'Yes, clear it'}
            </button>
            <button type="button" onClick={() => setConfirmClear(false)} className="btn btn-sm border border-bronze bg-white text-graphite">
              Keep them
            </button>
          </div>
        </div>
      )}

      {wishlist.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          description={cfg.emptyText}
          action={{ label: 'Discover pieces', to: '/women' }}
        />
      ) : (
        <ul className="mt-6 divide-y divide-line border-b border-line sm:grid sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0 sm:border-0 lg:grid-cols-3">
          {wishlist.map((p) => {
            const sub = cardSubtitle(p);
            return (
            <li key={p.id} className="flex items-center gap-4 py-4 sm:border-b sm:border-line">
              <Link to={`/product/${p.slug}`} className="shrink-0 overflow-hidden rounded-card bg-cream" tabIndex={-1} aria-hidden="true">
                <Img src={p.image} alt="" className="h-24 w-20 object-cover" />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                {/* div, not h2 — the global heading rule forces serif+uppercase,
                    the client register demands plain sans names. */}
                <div className={CARD_NAME}>
                  <Link to={`/product/${p.slug}`} className={CARD_NAME_LINK}>
                    {titleCase(String(p.name || '').replace(/^HUSHAE\s+/i, ''))}
                  </Link>
                </div>
                {sub && <p className={`${CARD_SUBTITLE} mt-[3px]`}>{sub}</p>}
                <div className="mt-[3px] flex flex-wrap items-center gap-2">
                  <PriceRow product={p} />
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                  {cfg.allowMoveToCart && (
                    <button
                      type="button" onClick={() => moveToBag(p)}
                      className="btn btn-sm gap-1.5 bg-obsidian px-3 text-alabaster"
                      aria-label={`Move ${p.name} to your bag`}
                    >
                      {addedId === p.id
                        ? <><Check size={13} aria-hidden="true" /> Added</>
                        : <><ShoppingBag size={13} aria-hidden="true" /> Move to bag</>}
                    </button>
                  )}
                  <button
                    type="button" onClick={() => remove(p)}
                    className="grid h-11 w-11 place-items-center text-ash transition hover:bg-satin/60 hover:text-obsidian"
                    aria-label={`Remove ${p.name} from wishlist`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
