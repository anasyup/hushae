import { useApp } from '../store/AppContext';

const FALLBACK = ['COD available — nationwide', 'Free shipping over PKR 4,999', '14-day easy exchange', 'Discreet packaging — always', 'Made in Pakistan', '3-tier quality system'];

export default function Marquee() {
  const { settings } = useApp();
  const mq = settings?.marquee;
  if (mq && mq.enabled === false) return null;
  const items = (mq?.items?.length ? mq.items : FALLBACK).filter((x) => String(x).trim());
  if (!items.length) return null;
  const row = items.join('   ✦   ');
  return (
    <div className="overflow-hidden bg-obsidian py-2.5 text-alabaster">
      <div className="animate-marquee flex w-max whitespace-nowrap text-[11px] font-medium uppercase tracking-widest">
        <span className="px-8">{row}&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;</span>
        <span className="px-8" aria-hidden="true">{row}&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;</span>
      </div>
    </div>
  );
}
