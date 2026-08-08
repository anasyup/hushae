import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, Gift, Sparkles, X } from 'lucide-react';
import { api } from '../../api/client';
import { pkr } from '../../lib/format';
import Spinner from '../../components/ui/Spinner';

/* ============================================================================
 * REWARDS AT CHECKOUT — points, store credit and gift cards.
 *
 * The single rule this component exists to obey:
 *
 *   THE SERVER DECIDES EVERY RUPEE.
 *
 * The browser asks "how much can this person take off a basket of X?" via
 * POST /loyalty/quote and renders the answer. When the order is placed it
 * sends the customer's INTENT — spend 500 points, apply my credit, here is a
 * card code — and never an amount. If this file were rewritten by an attacker
 * the worst they could do is ask; the server still computes the discount from
 * its own ledger.
 *
 * Mobile-first: a single column, 44px targets, and the slider is paired with a
 * number input because a slider alone is unusable with a screen reader and
 * fiddly with a thumb.
 * ========================================================================== */

const num = (n) => Number(n || 0).toLocaleString('en-PK');

export default function RewardsBox({
  token, subtotal, value, onChange, onQuote, disabled,
}) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cardCode, setCardCode] = useState('');
  const [cardState, setCardState] = useState(null);   // { checking, valid, balance, last4, error }
  const sliderId = useId();
  const cardId = useId();
  const lastSubtotal = useRef(null);

  /* Re-quote whenever the basket changes. A quote taken against an older,
     larger basket would let the percentage cap be exceeded. */
  useEffect(() => {
    if (!token || !subtotal) { setQuote(null); return undefined; }
    if (lastSubtotal.current === subtotal && quote) return undefined;
    lastSubtotal.current = subtotal;
    let alive = true;
    setLoading(true);
    api('/loyalty/quote', { method: 'POST', token, body: { subtotal } })
      .then((q) => { if (alive) { setQuote(q); onQuote?.(q); } })
      .catch(() => { if (alive) { setQuote(null); onQuote?.(null); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, subtotal]); // eslint-disable-line react-hooks/exhaustive-deps

  /* If the basket shrank, a previously chosen number of points may now exceed
     the cap. Clamp it rather than letting the server silently reduce it — the
     customer must see the number they will actually get. */
  useEffect(() => {
    if (!quote) return;
    if (value.points > quote.maxPoints) {
      onChange({ ...value, points: quote.maxPoints });
    }
  }, [quote]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkCard = useCallback(async () => {
    const code = cardCode.trim();
    if (!code) return;
    setCardState({ checking: true });
    try {
      const r = await api('/loyalty/gift-card/check', { method: 'POST', body: { code } });
      setCardState({ valid: true, balance: r.balance, last4: r.last4 });
      onChange({ ...value, giftCardCode: code });
      // The parent prices from the quote, so the card balance has to live
      // there too — otherwise the summary shows the card applied at zero.
      setQuote((q) => { const next = { ...q, cardBalance: r.balance }; onQuote?.(next); return next; });
    } catch (e) {
      setCardState({ error: e.message || 'That card is not valid' });
      onChange({ ...value, giftCardCode: '' });
      setQuote((q) => { const next = { ...q, cardBalance: 0 }; onQuote?.(next); return next; });
    }
  }, [cardCode, onChange, onQuote, value]);

  const removeCard = () => {
    setCardCode('');
    setCardState(null);
    onChange({ ...value, giftCardCode: '' });
    setQuote((q) => { const next = { ...q, cardBalance: 0 }; onQuote?.(next); return next; });
  };

  if (!token) return null;
  if (loading && !quote) return <div className="skeleton h-24 w-full rounded-card" />;
  if (!quote || quote.enabled === false) return null;

  const canPoints = quote.maxPoints > 0;
  const canCredit = quote.creditUsable > 0;
  const canCards = true;   // the endpoint itself refuses when switched off
  if (!canPoints && !canCredit && !canCards) return null;

  const pointsValue = Math.floor(value.points * (Number(quote.pointValue) || 1));

  return (
    <section className="mt-5 border-t border-line pt-5" aria-labelledby="rw-box">
      <h3 id="rw-box" className="flex items-center gap-2 text-label uppercase tracking-widest text-ash">
        <Sparkles size={13} aria-hidden="true" /> Rewards
      </h3>

      {/* ---------------- points ---------------- */}
      {canPoints ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label htmlFor={sliderId} className="text-body-sm font-medium">
              Spend points
            </label>
            <span className="text-caption text-ash">
              {num(quote.balance)} available
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-3">
            <input
              id={sliderId}
              type="range"
              min="0"
              max={quote.maxPoints}
              step={quote.step || 1}
              value={value.points}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, points: Number(e.target.value) })}
              className="h-11 min-w-0 flex-1 accent-obsidian"
              aria-describedby={`${sliderId}-out`}
            />
            <output
              id={`${sliderId}-out`}
              htmlFor={sliderId}
              className="w-24 shrink-0 text-right text-body-sm font-semibold tabular-nums"
            >
              {value.points > 0 ? `− ${pkr(pointsValue)}` : `0`}
            </output>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button" disabled={disabled}
              onClick={() => onChange({ ...value, points: quote.maxPoints })}
              className="min-h-[44px] rounded-control border border-bronze bg-white px-3 text-caption font-semibold text-graphite transition hover:bg-satin/60 disabled:opacity-50"
            >
              Use maximum ({num(quote.maxPoints)})
            </button>
            {value.points > 0 && (
              <button
                type="button" disabled={disabled}
                onClick={() => onChange({ ...value, points: 0 })}
                className="min-h-[44px] px-2 text-caption font-semibold text-ash underline-offset-4 transition hover:text-obsidian hover:underline disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>

          <p className="mt-2 text-caption text-ash">
            Points can cover up to {pkr(quote.maxPointsValue)} of this order.
          </p>
        </div>
      ) : quote.balance > 0 && quote.reason === 'below-minimum' ? (
        <p className="mt-3 text-caption text-ash">
          You have {num(quote.balance)} points. You can start spending them at {num(quote.minPoints)}.
        </p>
      ) : null}

      {/* ---------------- store credit ---------------- */}
      {canCredit && (
        <label className="mt-4 flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-control border border-line bg-cream/40 px-4 py-3">
          <span className="min-w-0">
            <span className="block text-body-sm font-medium">Use store credit</span>
            <span className="block text-caption text-ash">{pkr(quote.credit)} available</span>
          </span>
          <input
            type="checkbox"
            checked={!!value.useCredit}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, useCredit: e.target.checked })}
            className="h-5 w-5 shrink-0 accent-obsidian"
          />
        </label>
      )}

      {/* ---------------- gift card ---------------- */}
      <div className="mt-4">
        {cardState?.valid ? (
          <div className="flex items-center justify-between gap-3 rounded-control border border-sage bg-sage/15 px-4 py-3">
            <span className="flex min-w-0 items-center gap-2">
              <Check size={15} className="shrink-0 text-sagedark" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-body-sm font-medium">Gift card ····{cardState.last4}</span>
                <span className="block text-caption text-sagedark">{pkr(cardState.balance)} on the card</span>
              </span>
            </span>
            <button
              type="button" onClick={removeCard} disabled={disabled}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-control text-ash transition hover:text-obsidian"
              aria-label="Remove gift card"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <label htmlFor={cardId} className="text-body-sm font-medium">Gift card</label>
            <div className="mt-2 flex gap-2">
              <input
                id={cardId}
                className="input min-h-[44px] min-w-0 flex-1 font-mono uppercase"
                value={cardCode}
                disabled={disabled}
                placeholder="HUSGC-XXXXXXXXXX"
                autoComplete="off"
                aria-invalid={cardState?.error ? 'true' : undefined}
                aria-describedby={cardState?.error ? `${cardId}-err` : undefined}
                onChange={(e) => { setCardCode(e.target.value); if (cardState?.error) setCardState(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); checkCard(); } }}
              />
              <button
                type="button"
                onClick={checkCard}
                disabled={disabled || !cardCode.trim() || cardState?.checking}
                className="btn btn-sm shrink-0 border border-bronze bg-white text-graphite hover:bg-satin/60 disabled:opacity-50"
              >
                {cardState?.checking ? <Spinner label="Checking" /> : 'Apply'}
              </button>
            </div>
            {cardState?.error && (
              <p id={`${cardId}-err`} role="alert" className="mt-2 text-caption font-medium text-red-700">
                {cardState.error}
              </p>
            )}
          </>
        )}
      </div>

      {/* What the customer will actually see come off. The server recomputes
          this on submit; showing it here is a promise the server keeps. */}
      {(pointsValue > 0 || (value.useCredit && canCredit) || cardState?.valid) && (
        <p className="mt-4 flex items-start gap-2 rounded-control bg-sage/12 px-3 py-2.5 text-caption text-sagedark">
          <Gift size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Rewards are applied at the last step — your final total is confirmed
            before anything is placed.
          </span>
        </p>
      )}
    </section>
  );
}
