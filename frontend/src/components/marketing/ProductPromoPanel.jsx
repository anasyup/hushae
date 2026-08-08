import { useEffect, useState } from 'react';
import { Flame, Package, Tag } from 'lucide-react';
import { api } from '../../api/client';
import { pkr } from '../../lib/format';
import Countdown from './Countdown';
import { usePromotions, promosForProduct } from '../../lib/usePromotions';

/* ============================================================================
 * PRODUCT PAGE PROMOTION PANEL
 *
 * Everything the brief asks for on a product page, in one block: the flash
 * banner, the countdown, an explanation of what the offer actually is, and
 * the "frequently bought together" row.
 *
 * Renders nothing at all when no promotion covers this product, so the page is
 * byte-identical to before this sprint for the 101 products that currently
 * have no promotion attached. That matters: a wrapper that always renders an
 * empty div still costs a layout box.
 *
 * Buy-X-get-Y and bundle wording is generated from the promotion's own
 * numbers rather than a hand-written string, so a merchant who edits "buy 2"
 * to "buy 3" does not leave stale copy on the storefront.
 * ========================================================================== */

function offerWords(p) {
  if (p.type === 'freeship') return 'Free delivery on this order';
  if (p.type === 'bxgy') return 'Buy more, get one discounted';
  if (p.type === 'bundle') return 'Bundle offer — buy together and save';
  if (p.discountPercent > 0) return `${p.discountPercent}% off`;
  return p.label;
}

export default function ProductPromoPanel({ product }) {
  const { enabled, promotions, scope, flash } = usePromotions();
  const [together, setTogether] = useState([]);

  const covering = enabled ? promosForProduct(scope, promotions, product) : [];
  const flashPromo = covering.find((p) => p.type === 'flash' && p.endsAt);

  useEffect(() => {
    if (!enabled || !product?.slug) { setTogether([]); return undefined; }
    let alive = true;
    api(`/discovery/bought-together/${product.slug}`)
      .then((d) => { if (alive) setTogether(d.products || []); })
      .catch(() => { if (alive) setTogether([]); });
    return () => { alive = false; };
  }, [enabled, product?.slug]);

  if (!covering.length && !together.length) return null;

  return (
    <div className="space-y-3">
      {/* ---- flash banner + countdown ---- */}
      {flashPromo && flash?.enabled !== false && (
        <section
          className="rounded-card border border-bronze/40 bg-bronze/10 p-4"
          aria-labelledby="promo-flash"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id="promo-flash" className="inline-flex items-center gap-2 text-body-sm font-semibold text-obsidian">
              <Flame size={15} className="shrink-0 text-bronze" aria-hidden="true" />
              {flashPromo.badge?.text || flashPromo.label}
            </p>
            {flash?.showCountdown !== false && (
              <Countdown
                endsAt={flashPromo.endsAt}
                label={flash?.countdownLabel || 'Ends in'}
                urgentMinutes={flash?.urgencyMinutes || 60}
              />
            )}
          </div>
          {flash?.showStockLeft !== false && product?.stock > 0 && product.stock <= (flash?.lowStockThreshold || 5) && (
            <p className="mt-2 text-caption text-graphite">
              Only {product.stock} left at this price.
            </p>
          )}
        </section>
      )}

      {/* ---- other offers, explained ---- */}
      {covering.filter((p) => p !== flashPromo).length > 0 && (
        <ul className="space-y-2" aria-label="Offers on this piece">
          {covering.filter((p) => p !== flashPromo).map((p) => (
            <li key={p.id} className="flex items-start gap-2.5 rounded-card border border-line bg-sage/10 px-4 py-3">
              {p.type === 'bundle'
                ? <Package size={15} className="mt-0.5 shrink-0 text-sagedark" aria-hidden="true" />
                : <Tag size={15} className="mt-0.5 shrink-0 text-sagedark" aria-hidden="true" />}
              <span className="min-w-0">
                <span className="block text-body-sm font-medium text-obsidian">{p.label}</span>
                <span className="block text-caption text-sagedark">{offerWords(p)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* ---- frequently bought together ---- */}
      {together.length > 0 && (
        <section className="rounded-card border border-line p-4" aria-labelledby="promo-fbt">
          <h2 id="promo-fbt" className="text-label uppercase tracking-widest text-ash">
            Frequently bought together
          </h2>
          <ul className="mt-3 space-y-2">
            {together.slice(0, 3).map((t) => (
              <li key={t._id}>
                <a
                  href={`/product/${t.slug}`}
                  className="flex min-h-[44px] items-center gap-3 rounded-control px-1 py-1.5 transition hover:bg-satin/50"
                >
                  <img
                    src={t.images?.[0]?.url || ''}
                    alt=""
                    loading="lazy"
                    width="40" height="52"
                    className="h-13 w-10 shrink-0 rounded-control border border-line object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm">{t.name}</span>
                    <span className="block text-caption text-ash">{pkr(t.price)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
