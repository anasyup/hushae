import { useState } from 'react';
import { Check, Pencil, Target } from 'lucide-react';
import { api } from '../../api/client';
import { useApp } from '../../store/AppContext';
import { pkr } from '../../lib/format';

const PACE = {
  ahead:      { label: 'Ahead of pace', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500' },
  'on-track': { label: 'On track',      cls: 'bg-blue-50 text-blue-700 ring-blue-200',          bar: 'bg-blue-500' },
  behind:     { label: 'Behind pace',   cls: 'bg-amber-50 text-amber-800 ring-amber-200',       bar: 'bg-amber-500' },
  unset:      { label: 'No goal set',   cls: 'bg-neutral-100 text-neutral-600 ring-neutral-200', bar: 'bg-neutral-400' },
};

/** Monthly revenue goal with a pace read: % of month elapsed vs % of goal hit. */
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
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Monthly revenue goal</p>
          <p className="mt-1 text-[12px] text-neutral-500">
            {goal.daysRemaining} day{goal.daysRemaining === 1 ? '' : 's'} left in the month
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ring-1 ${pace.cls}`}>{pace.label}</span>
          <button
            onClick={() => { setValue(String(goal.goal || '')); setEditing((v) => !v); }}
            className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-800"
            aria-label="Edit goal"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 flex items-center gap-2">
          <input
            type="number" min="0" autoFocus value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            placeholder="e.g. 500000"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm tabular-nums outline-none focus:border-neutral-900"
          />
          <button onClick={save} disabled={busy}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-neutral-900 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50">
            <Check size={13} /> Save
          </button>
        </div>
      ) : goal.goal === 0 ? (
        <button onClick={() => { setValue(''); setEditing(true); }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 py-4 text-[12px] font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900">
          <Target size={14} /> Set a monthly revenue target
        </button>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="font-sans text-[13px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900">{pkr(goal.earned)}</p>
            <p className="text-[12px] text-neutral-500">of {pkr(goal.goal)}</p>
          </div>

          <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-100">
            <div className={`h-full rounded-full transition-all duration-700 ${pace.bar}`} style={{ width: `${pct}%` }} />
            {/* where the month itself has got to — the line you race */}
            <span
              className="absolute top-0 h-full w-px bg-neutral-900/40"
              style={{ left: `${Math.min(100, goal.pctElapsed)}%` }}
              title={`${goal.pctElapsed}% of the month elapsed`}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[12px]">
            <span className="font-semibold tabular-nums text-neutral-800">{goal.pctAchieved}% complete</span>
            <span className="text-neutral-500">{goal.pctElapsed}% of month gone</span>
          </div>

          {goal.dailyNeeded > 0 && (
            <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-[13px] leading-relaxed text-neutral-600">
              Need <b className="text-neutral-900">{pkr(goal.dailyNeeded)}</b>/day for the remaining {goal.daysRemaining} day{goal.daysRemaining === 1 ? '' : 's'}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
