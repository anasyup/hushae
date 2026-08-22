/* ============================================================================
 * Admin UI — Tabs (underline style)
 * Active: white text + jet white bottom border. Inactive: muted.
 * No giant pill tabs. Keyboard: arrow keys navigate (roving tabindex).
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
    <div role="tablist" className={`flex items-center gap-1 border-b border-admin-border ${className}`}>
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
            className={`relative -mb-px inline-flex min-h-[40px] items-center px-3 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-admin-accent ${
              isActive
                ? 'font-medium text-admin-text after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:bg-admin-accent'
                : 'text-admin-text-muted hover:text-admin-text'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
