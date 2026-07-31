import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

/* ============================================================================
 * usePromoQuote — ask the server what the promotions on this basket are worth.
 *
 * THE ONE RULE: the browser never computes a promotion amount. It posts which
 * products and how many; the server prices them from its own documents and
 * returns figures. Same discipline as the loyalty quote in Sprint 2I, for the
 * same reason — a value the client can influence is not a value.
 *
 * This is DISPLAY ONLY. It does not touch useCartPricing, which stays the
 * single source of bag money for the cart, the drawer and checkout. The order
 * route recomputes every promotion from scratch when the order is placed, so
 * a stale or tampered quote changes nothing that is charged.
 *
 * Debounced and sequence-guarded: a quantity stepper fires several changes in
 * a second, and a slow reply for the old basket must not overwrite a fast one
 * for the new.
 * ========================================================================== */

export default function usePromoQuote(cart, { hasCoupon = false, city = '', enabled = true } = {}) {
  const [quote, setQuote] = useState(null);
  const seq = useRef(0);

  // Key on what actually changes the answer. Serialising the whole cart would
  // re-quote when an unrelated field (an image url) changes identity.
  const key = (cart || [])
    .map((l) => `${l.id}:${l.size || ''}:${l.color || ''}:${l.qty}`)
    .join('|');

  useEffect(() => {
    if (!enabled || !key) { setQuote(null); return undefined; }
    const mine = ++seq.current;
    const t = setTimeout(() => {
      api('/promotions/quote', {
        method: 'POST',
        body: {
          items: (cart || []).map((l) => ({
            product: l.id, size: l.size, color: l.color, quantity: l.qty,
          })),
          hasCoupon,
          city,
        },
      })
        .then((d) => { if (mine === seq.current) setQuote(d?.enabled ? d : null); })
        .catch(() => { if (mine === seq.current) setQuote(null); });
    }, 250);
    return () => clearTimeout(t);
  }, [key, hasCoupon, city, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return quote;
}
