import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Info, PackageX, X } from 'lucide-react';

const TONE = {
  danger:  { chip: 'bg-[#F5F5F5] text-black',       dot: 'bg-white',       icon: PackageX },
  warning: { chip: 'bg-white/8 text-black',      dot: 'bg-white/80',    icon: AlertTriangle },
  info:    { chip: 'bg-[#FAFAFA] text-[#555555]',      dot: 'bg-[#FAFAFA]0',    icon: Info },
};

const KEY = 'hushae_alerts_dismissed';
const readDismissed = () => {
  try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch { return []; }
};

/**
 * "What needs my attention today" — sits between the greeting and the KPIs.
 * Dismissals last for the session only: a real condition should come back
 * tomorrow rather than being silenced forever.
 */
export default function AlertsBar({ alerts }) {
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(dismissed)); } catch { /* ignore */ }
  }, [dismissed]);

  const visible = useMemo(
    () => (alerts || []).filter((a) => !dismissed.includes(a.id)),
    [alerts, dismissed],
  );

  if (!alerts) return null;

  if (visible.length === 0) {
    return (
      <div className="mb-6 flex items-center gap-2.5 rounded-[10px] border border-[#EAEAEA] bg-[#FAFAFA] px-4 py-3">
        <CheckCircle2 size={16} className="shrink-0 text-[#333333]" />
        <p className="text-[13px] font-medium text-[#333333]">All caught up — nothing needs your attention right now.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-2">
      {visible.map((a) => {
        const tone = TONE[a.severity] || TONE.info;
        const Icon = tone.icon;
        return (
          <div key={a.id} className="group flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 pl-4 transition hover:border-neutral-300">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${tone.chip}`}>
              <Icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-neutral-900">{a.title}</p>
              {a.detail && <p className="truncate text-[13px] text-neutral-500">{a.detail}</p>}
            </div>
            <Link
              to={a.link}
              className="hidden shrink-0 items-center gap-1 rounded-full bg-neutral-900 px-3 py-1.5 text-[12px] font-semibold text-black transition hover:bg-neutral-700 sm:inline-flex"
            >
              {a.cta || 'Open'} <ArrowRight size={11} />
            </Link>
            <Link to={a.link} className="shrink-0 rounded-full bg-neutral-900 p-2 text-black sm:hidden" aria-label={a.cta || 'Open'}>
              <ArrowRight size={12} />
            </Link>
            <button
              onClick={() => setDismissed((d) => [...d, a.id])}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Dismiss alert"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
