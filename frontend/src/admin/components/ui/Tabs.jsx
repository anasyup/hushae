/* ============================================================================
 * Admin UI — Tabs (Phase 03-R)
 * Underline style: uppercase micro-labels, active = white text + 2px white
 * rule. No pill tabs. Keyboard: arrow keys (roving tabindex).
 * ========================================================================== */

import { useRef } from 'react';

export default function Tabs({ tabs, active, onChange, className = '' }) {
  const refs = useRef({});

  const onKeyDown = (e, i) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    let next = i;
    if (e.key === 'ArrowRight') next = Math.min(i + 1, tabs.length - 1);
    if (e.key === 'ArrowLeft') next = Math.max(i - 1, 0);
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" className={`flex items-center gap-5 border-b border-[#EAEAEA] ${className}`}>
      {tabs.map((t, i) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            ref={(el) => (refs.current[i] = el)}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`relative -mb-px inline-flex min-h-[38px] items-center text-[10px] font-medium uppercase tracking-[0.16em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white ${
              isActive
                ? 'text-black after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-white'
                : 'text-[#999999] hover:text-[#333333]'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
