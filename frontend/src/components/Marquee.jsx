import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { MARQUEE_DEFAULTS } from '../lib/publicConfig';

/* Rolling announcement strip under the hero. Merchant-controlled via
 * settings.marquee.items; falls back to approved house lines (no exchange
 * promises, no fake payment methods) when the merchant hasn't set any. */
export default function Marquee() {
  const { settings } = useApp();
  const mq = settings?.marquee;

  const items = useMemo(() => {
    const raw = (mq?.items?.length ? mq.items : MARQUEE_DEFAULTS)
      .map((x) => String(x).trim())
      .filter(Boolean);
    return raw;
  }, [mq]);

  if (mq && mq.enabled === false) return null;
  if (!items.length) return null;

  const row = items.join('   \u2726   ');
  return (
    <div className="overflow-hidden bg-obsidian py-2.5 text-alabaster">
      <div className="animate-marquee flex w-max whitespace-nowrap text-[11px] font-medium uppercase tracking-widest">
        <span className="px-8">{row}&nbsp;&nbsp;&nbsp;\u2726&nbsp;&nbsp;&nbsp;</span>
        <span className="px-8" aria-hidden="true">{row}&nbsp;&nbsp;&nbsp;\u2726&nbsp;&nbsp;&nbsp;</span>
      </div>
    </div>
  );
}
