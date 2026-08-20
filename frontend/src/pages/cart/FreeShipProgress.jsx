import { useEffect, useRef, useState } from 'react';
import { pkr } from '../../lib/format';
import { fill } from '../../lib/cartConfig';

/* ============================================================================
 * HUSHAE FreeShipProgress — Minimalist Luxury Free Shipping Progress Bar
 * ========================================================================== */

export default function FreeShipProgress({ subtotal, threshold, cfg }) {
  const limit = threshold > 0 ? threshold : 4999;
  const unlocked = subtotal >= limit;
  const pct = Math.min(100, Math.round((subtotal / limit) * 100));
  const remaining = Math.max(0, limit - subtotal);

  if (!cfg.showProgress && threshold <= 0) return null;

  return (
    <div className="space-y-2 font-sans">
      <div className="flex items-center justify-between text-xs tracking-wide">
        {unlocked ? (
          <span className="font-medium text-[#000000]">
            Free express delivery unlocked
          </span>
        ) : (
          <span className="text-neutral-600 font-light">
            Add <strong className="font-medium text-[#000000]">{pkr(remaining)}</strong> for free delivery
          </span>
        )}
        <span className="text-[11px] text-neutral-400 font-light">
          {pct}%
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EAEAEA]">
        <div
          className="h-full rounded-full bg-[#000000] transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
