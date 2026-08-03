import { useState } from 'react';
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { Field, SettingValue } from '../core/types';
import { FieldControl } from './FieldControl';

/* Repeatable rows driven by `field.fields`. Used for marquee messages, custom
 * lists, and anything else that needs an arbitrary number of entries. */

interface Props {
  field: Field;
  value: Array<Record<string, unknown>>;
  onChange: (v: SettingValue) => void;
}

export function ListField({ field, value, onChange }: Props) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [drag, setDrag] = useState<number | null>(null);

  const rowFields = field.fields || [];
  const blank = () =>
    rowFields.reduce<Record<string, unknown>>((a, f) => (f.id ? { ...a, [f.id]: f.default ?? '' } : a), {});

  const setRow = (i: number, patch: Record<string, unknown>) =>
    onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };

  const title = (row: Record<string, unknown>, i: number) => {
    const key = field.titleKey || rowFields.find((f) => f.type === 'text')?.id;
    const t = key ? String(row[key] || '') : '';
    return t || `Item ${i + 1}`;
  };

  return (
    <div className="space-y-1.5">
      {value.map((row, i) => (
        <div key={i}
          draggable onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); if (drag !== null && drag !== i) move(drag, i); setDrag(null); }}
          className={`rounded-lg border border-neutral-200 ${drag === i ? 'opacity-40' : ''}`}>
          <div className="flex items-center gap-1 px-1.5 py-1.5">
            <GripVertical size={12} className="shrink-0 cursor-grab text-neutral-300" />
            <button type="button" onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
              {open[i] ? <ChevronDown size={12} className="shrink-0 text-neutral-400" /> : <ChevronRight size={12} className="shrink-0 text-neutral-400" />}
              <span className="truncate text-xs font-medium">{title(row, i)}</span>
            </button>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="grid h-6 w-6 shrink-0 place-items-center rounded text-neutral-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 size={11} />
            </button>
          </div>
          {open[i] && (
            <div className="space-y-3 border-t border-neutral-100 p-2.5">
              {rowFields.map((f) => (
                <FieldControl key={f.id} field={f} settings={row as any}
                  value={(row[f.id!] as SettingValue) ?? (f.default as SettingValue)}
                  onChange={(x) => setRow(i, { [f.id!]: x })} />
              ))}
            </div>
          )}
        </div>
      ))}

      {(!field.maxRows || value.length < field.maxRows) && (
        <button type="button" onClick={() => onChange([...value, blank()])}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 py-2 text-xs font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900">
          <Plus size={13} /> {field.addLabel || 'Add item'}
        </button>
      )}
    </div>
  );
}
