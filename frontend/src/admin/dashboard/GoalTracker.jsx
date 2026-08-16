import { useState } from 'react';
import { Pencil, Target } from 'lucide-react';
import { api } from '../../api/client';
import { useApp } from '../../store/AppContext';
import { pkr } from '../../lib/format';

/* ============================================================================
 * Monthly revenue goal — a thin 3px progress line (accent fill), Inter numbers.
 * Behaviour unchanged.
 * ========================================================================== */

const PACE = {
  ahead:      { label: 'Ahead of pace', bar: 'var(--fs-success)' },
  'on-track': { label: 'On track',      bar: 'var(--fs-accent)' },
  behind:     { label: 'Behind pace',   bar: 'var(--fs-warning)' },
  unset:      { label: 'No goal set',   bar: 'var(--fs-border-medium)' },
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
        <p className="text-[11px] font-medium" style={{ color: 'var(--fs-text-muted)' }}>Monthly revenue goal</p>
        <div className="flex items-center gap-3">
          <span className="text-[12px]" style={{ color: 'var(--fs-text-muted)' }}>{goal.daysRemaining} day{goal.daysRemaining === 1 ? '' : 's'} left · {pace.label.toLowerCase()}</span>
          <button onClick={() => { setValue(String(goal.goal || '')); setEditing((v) => !v); }} className="transition-opacity hover:opacity-60" aria-label="Edit goal" style={{ color: 'var(--fs-text-muted)' }}>
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
            className="w-40 rounded-[8px] border px-3 py-1.5 text-[13px] tabular-nums outline-none"
            style={{ borderColor: 'var(--fs-border-medium)', color: 'var(--fs-text-primary)', background: 'var(--fs-bg-card)' }}
          />
          <button onClick={save} disabled={busy} className="text-[13px] font-semibold disabled:opacity-50" style={{ color: 'var(--fs-accent-soft-text)' }}>Save</button>
          <button onClick={() => setEditing(false)} className="text-[13px] font-medium" style={{ color: 'var(--fs-text-muted)' }}>Cancel</button>
        </div>
      ) : goal.goal === 0 ? (
        <button onClick={() => { setValue(''); setEditing(true); }}
          className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--fs-accent-soft-text)' }}>
          <Target size={13} strokeWidth={1.5} /> Set a monthly revenue target
        </button>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-[21px] font-bold leading-none tabular-nums" style={{ color: 'var(--fs-text-primary)', letterSpacing: '-0.3px' }}>{pkr(goal.earned)}</p>
            <p className="text-[12px]" style={{ color: 'var(--fs-text-muted)' }}>of {pkr(goal.goal)}</p>
          </div>

          {/* thin 3px progress line */}
          <div className="relative mt-3 h-[3px] w-full" style={{ background: 'var(--fs-border-subtle)' }}>
            <div className="animate-bar-fill absolute left-0 top-0 h-full" style={{ '--w': `${pct}%`, width: `${pct}%`, background: pace.bar }} />
          </div>

          <div className="mt-3 flex items-baseline justify-between text-[12px]">
            <span className="font-semibold tabular-nums" style={{ color: 'var(--fs-text-secondary)' }}>{goal.pctAchieved}% complete</span>
            <span style={{ color: 'var(--fs-text-muted)' }}>{goal.pctElapsed}% of month gone</span>
          </div>

          {goal.dailyNeeded > 0 && (
            <p className="mt-3 text-[13px]" style={{ color: 'var(--fs-text-muted)' }}>
              Need <span className="font-medium" style={{ color: 'var(--fs-text-secondary)' }}>{pkr(goal.dailyNeeded)}</span>/day for the remaining {goal.daysRemaining} day{goal.daysRemaining === 1 ? '' : 's'}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
