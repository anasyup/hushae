import { useState } from 'react';
import { Pencil, Target } from 'lucide-react';
import { api } from '../../api/client';
import { useApp } from '../../store/AppContext';
import { pkr } from '../../lib/format';

/* ============================================================================
 * Monthly revenue goal — a thin 2px line progress indicator (not a chunky bar).
 * Desaturated pace tints; serif numbers. Editing behaviour unchanged.
 * ========================================================================== */

const INK = 'var(--px-ink)';
const MUTED = 'var(--px-muted)';
const HAIRLINE = 'var(--px-border)';
const PACE = {
  ahead:      { label: 'Ahead of pace', bar: 'var(--px-success)' },
  'on-track': { label: 'On track',      bar: '#5C6C8A' },
  behind:     { label: 'Behind pace',   bar: '#A67C52' },
  unset:      { label: 'No goal set',   bar: 'rgba(26,24,21,0.15)' },
};

export default function GoalTracker({ goal, onSaved }) {
  const { auth, toast } = useApp();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  if (!goal) return null;
  const pace = PACE[goal.pace] || PACE.unset;
  const pct = Math.min(100, Math.max(0, goal.pctAchieved));

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings/goals', { method: 'POST', token: auth.token, body: { monthlyRevenueGoal: Number(value) || 0 } });
      toast('Monthly goal saved');
      setEditing(false);
      onSaved?.();
    } catch { toast('Could not save the goal'); }
    setBusy(false);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: MUTED }}>Monthly revenue goal</p>
        <div className="flex items-center gap-3">
          <span className="text-[12px]" style={{ color: MUTED }}>{goal.daysRemaining} day{goal.daysRemaining === 1 ? '' : 's'} left · {pace.label.toLowerCase()}</span>
          <button
            onClick={() => { setValue(String(goal.goal || '')); setEditing((v) => !v); }}
            className="transition-opacity hover:opacity-60"
            aria-label="Edit goal"
            style={{ color: MUTED }}
          >
            <Pencil size={12} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 flex items-center gap-3">
          <input
            type="number" min="0" autoFocus value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            placeholder="e.g. 500000"
            className="w-40 rounded border px-3 py-1.5 text-[13px] tabular-nums outline-none"
            style={{ borderColor: HAIRLINE, color: INK, background: '#FFFFFF' }}
          />
          <button onClick={save} disabled={busy} className="text-[13px] font-medium underline underline-offset-4 disabled:opacity-50" style={{ color: INK }}>Save</button>
          <button onClick={() => setEditing(false)} className="text-[13px] font-medium" style={{ color: MUTED }}>Cancel</button>
        </div>
      ) : goal.goal === 0 ? (
        <button onClick={() => { setValue(''); setEditing(true); }}
          className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium underline-offset-4 hover:underline" style={{ color: INK }}>
          <Target size={13} strokeWidth={1.5} /> Set a monthly revenue target
        </button>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-[26px] font-bold leading-none tabular-nums" style={{ color: INK }}>{pkr(goal.earned)}</p>
            <p className="text-[12px]" style={{ color: MUTED }}>of {pkr(goal.goal)}</p>
          </div>

          {/* thin 2px line progress */}
          <div className="relative mt-3 h-[2px] w-full" style={{ background: 'rgba(26,24,21,0.08)' }}>
            <div className="animate-bar-fill absolute left-0 top-0 h-full" style={{ '--w': `${pct}%`, width: `${pct}%`, background: pace.bar }} />
            <span className="absolute top-1/2 h-3 w-px -translate-y-1/2" style={{ left: `${Math.min(100, goal.pctElapsed)}%`, background: 'rgba(26,24,21,0.35)' }} title={`${goal.pctElapsed}% of the month elapsed`} />
          </div>

          <div className="mt-3 flex items-baseline justify-between text-[12px]">
            <span className="font-medium tabular-nums" style={{ color: INK }}>{goal.pctAchieved}% complete</span>
            <span style={{ color: MUTED }}>{goal.pctElapsed}% of month gone</span>
          </div>

          {goal.dailyNeeded > 0 && (
            <p className="mt-3 text-[13px]" style={{ color: MUTED }}>
              Need <span className="font-medium" style={{ color: INK }}>{pkr(goal.dailyNeeded)}</span>/day for the remaining {goal.daysRemaining} day{goal.daysRemaining === 1 ? '' : 's'}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
