import { memo, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Field, SettingsBag, SettingValue } from '../core/types';
import MediaPicker from '../../components/MediaPicker';
import { ResourcePicker } from './ResourcePicker';
import { ListField } from './ListField';
import { PICKER_ICONS, resolveIcon } from './iconRegistry';
import { THEME_PRESETS } from '../schemas/theme';
import { useEditor } from '../core/store';

/* ============================================================================
 * Renders one schema field. Every supported FieldType lands here, so a new
 * input type is added once and every section gets it.
 * ========================================================================== */

interface Props {
  field: Field;
  value: SettingValue;
  settings: SettingsBag;
  onChange: (v: SettingValue) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FieldControl = memo(function FieldControl({ field, value, settings, onChange }: Props) {
  // presentational
  if (field.type === 'header') {
    return <p className="te-field-group pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400 first:pt-0">{field.label}</p>;
  }
  if (field.type === 'paragraph') {
    return <p className="rounded-lg bg-neutral-50 p-3 text-[13.5px] leading-relaxed text-neutral-500">{field.label}</p>;
  }
  if (field.type === 'divider') return <hr className="border-neutral-200" />;

  const v: SettingValue = (value === undefined || value === null ? field.default : value) ?? '';

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        {field.label && <label className="te-field-label">{field.label}</label>}
        {(field.type === 'range' || field.type === 'number') && (
          <span className="flex items-center gap-1">
            <input
              type="number" min={field.min} max={field.max} step={field.step}
              value={Number(v ?? field.min ?? 0)}
              onChange={(e) => onChange(clamp(Number(e.target.value) || 0, field.min ?? -Infinity, field.max ?? Infinity))}
              className="w-16 rounded-md border border-neutral-300 px-2 py-1 text-right text-xs tabular-nums outline-none focus:border-[#005BD3]"
            />
            {field.unit && <span className="text-[15px] text-neutral-400">{field.unit}</span>}
          </span>
        )}
      </div>

      <Input field={field} v={v} settings={settings} onChange={onChange} />

      {field.info && <p className="mt-1 text-[15px] leading-snug text-neutral-400">{field.info}</p>}
    </div>
  );
});

function Input({ field, v, settings, onChange }: { field: Field; v: SettingValue; settings: SettingsBag; onChange: (x: SettingValue) => void }) {
  const inputCls = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-[#005BD3] focus:ring-2 focus:ring-[#005BD3]/15';

  switch (field.type) {
    case 'text':
    case 'inline_richtext':
    case 'url':
      return <input className={inputCls} placeholder={field.placeholder} value={String(v ?? '')} onChange={(e) => onChange(e.target.value)} />;

    case 'textarea':
    case 'richtext':
    case 'html':
    case 'liquid':
      return (
        <textarea rows={field.rows ?? 4} placeholder={field.placeholder}
          className={`${inputCls} ${field.type === 'html' || field.type === 'liquid' ? 'font-mono text-xs' : ''}`}
          value={String(v ?? '')} onChange={(e) => onChange(e.target.value)} />
      );

    case 'number':
      return <input type="number" className={inputCls} value={Number(v ?? 0)} onChange={(e) => onChange(Number(e.target.value) || 0)} />;

    case 'range':
      return (
        <input type="range" min={field.min ?? 0} max={field.max ?? 100} step={field.step ?? 1}
          value={Number(v ?? field.min ?? 0)} onChange={(e) => onChange(Number(e.target.value))}
          className="te-range w-full accent-[#005BD3]" />
      );

    case 'checkbox':
    case 'toggle':
      return (
        <label className="flex cursor-pointer items-center gap-2.5">
          <span className="relative inline-block h-5 w-9 shrink-0">
            <input type="checkbox" className="peer sr-only" checked={!!v} onChange={(e) => onChange(e.target.checked)} />
            <span className="absolute inset-0 rounded-full bg-neutral-300 transition peer-checked:bg-[#008060]" />
            <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
          </span>
          <span className="text-[15px] text-neutral-600">{v ? 'On' : 'Off'}</span>
        </label>
      );

    case 'select':
      return (
        <select className={inputCls} value={String(v ?? '')} onChange={(e) => onChange(e.target.value)}>
          {(field.options || []).map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
      );

    case 'radio':
      return (
        <div className="space-y-1.5">
          {(field.options || []).map((o) => (
            <label key={String(o.value)} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" checked={String(v) === String(o.value)} onChange={() => onChange(o.value)} className="accent-[#005BD3]" />
              {o.label}
            </label>
          ))}
        </div>
      );

    case 'segment':
    case 'button_group':
    case 'alignment':
      return (
        <div className="flex rounded-lg bg-neutral-100 p-1">
          {(field.options || []).map((o) => {
            const active = String(v) === String(o.value);
            const I = o.icon ? resolveIcon(o.icon) : null;
            return (
              <button key={String(o.value)} type="button" onClick={() => onChange(o.value)} title={o.label}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  active ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>
                {I ? <I size={14} /> : o.label}
              </button>
            );
          })}
        </div>
      );

    case 'color':
    case 'color_background':
      return <ColorInput value={String(v ?? '')} onChange={onChange} />;

    case 'color_scheme':
      return (
        <select className={inputCls} value={String(v ?? 'inherit')} onChange={(e) => onChange(e.target.value)}>
          {(field.options || []).map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
      );

    case 'font_picker':
      return <FontPicker value={String(v ?? '')} onChange={onChange} />;

    case 'preset_picker':
      return (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(THEME_PRESETS).map(([id, p]) => (
            <button key={id} type="button"
              onClick={() => useEditor.getState().applyPreset(id)}
              title={`Apply ${p.label} look`}
              className={`flex flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                String(v ?? '') === id ? 'border-black ring-2 ring-black/10' : 'border-neutral-200'
              }`}>
              <span className="flex gap-1">
                {p.swatch.map((c, i) => (
                  <span key={i} className="h-5 w-5 rounded-full border border-black/10" style={{ background: c }} />
                ))}
              </span>
              <span className="text-[12px] font-semibold text-neutral-800">{p.label}</span>
            </button>
          ))}
        </div>
      );

    case 'image_picker':
      return <MediaPicker value={String(v ?? '')} onChange={(u: string) => onChange(u)} onAdd={(u: string) => onChange(u)} accept="image" hideUrl />;
    case 'video_picker':
      return <MediaPicker value={String(v ?? '')} onChange={(u: string) => onChange(u)} onAdd={(u: string) => onChange(u)} accept="video" hideUrl />;

    case 'icon_picker':
      return <IconPicker value={String(v ?? 'Star')} onChange={onChange} />;

    case 'product': case 'product_list':
    case 'collection': case 'collection_list':
    case 'page': case 'blog': case 'article': case 'link_list':
      return <ResourcePicker field={field} value={v} onChange={onChange} />;

    case 'list':
      return <ListField field={field} value={Array.isArray(v) ? (v as Array<Record<string, unknown>>) : []} onChange={onChange} />;

    case 'spacing':
      return (
        <div className="grid grid-cols-4 gap-1.5">
          {['top', 'right', 'bottom', 'left'].map((side) => (
            <input key={side} type="number" placeholder={side[0].toUpperCase()}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-center text-xs"
              value={Number((v as any)?.[side] ?? 0)}
              onChange={(e) => onChange({ ...(v as object), [side]: Number(e.target.value) || 0 })} />
          ))}
        </div>
      );

    default:
      return <input className={inputCls} value={String(v ?? '')} onChange={(e) => onChange(e.target.value)} />;
  }
}

/* ── Colour ─────────────────────────────────────────────────────────────── */
const SWATCHES = ['#0D0D0D', '#FFFFFF', '#FBFAF8', '#F1EEE9', '#7C8B72', '#B4453C', '#4F7A52', '#2C4A7C', '#C8A96A'];

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="h-9 w-10 shrink-0 rounded-lg border border-neutral-300"
          style={{ background: value || 'repeating-conic-gradient(#e5e5e5 0 25%, #fff 0 50%) 50%/10px 10px' }} />
        <input className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs outline-none focus:border-[#005BD3]"
          placeholder="transparent" value={value} onChange={(e) => onChange(e.target.value)} />
        {value && (
          <button type="button" onClick={() => onChange('')} title="Clear"
            className="grid h-9 w-8 shrink-0 place-items-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900">
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute left-0 top-11 z-50 w-60 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
          <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)}
            className="h-24 w-full cursor-pointer rounded-lg border border-neutral-200" />
          <div className="mt-3 grid grid-cols-9 gap-1.5">
            {SWATCHES.map((c) => (
              <button key={c} type="button" onClick={() => { onChange(c); setOpen(false); }}
                className="h-5 w-5 rounded border border-neutral-200" style={{ background: c }} title={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Font ───────────────────────────────────────────────────────────────── */
const FONTS = [
  'Family Klein', 'Helvetica Neue', 'Helvetica', 'Arial', 'Inter',
  'Montserrat', 'Cormorant Garamond', 'Playfair Display', 'DM Sans', 'Poppins',
  'Lora', 'Libre Baskerville', 'Work Sans', 'Space Grotesk', 'Jost',
  'Karla', 'Georgia',
];

function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#005BD3]"
      value={value} onChange={(e) => onChange(e.target.value)} style={{ fontFamily: `"${value}", sans-serif` }}>
      {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: `"${f}", sans-serif` }}>{f}</option>)}
    </select>
  );
}

/* ── Icon ───────────────────────────────────────────────────────────────── */
function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState('');
  const list = PICKER_ICONS.filter((n) => n.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="rounded-lg border border-neutral-300 p-2">
      <input className="mb-2 w-full rounded-md border border-neutral-200 px-2 py-1.5 text-xs outline-none"
        placeholder="Search icons" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="te-scroll grid max-h-40 grid-cols-7 gap-1 overflow-y-auto">
        {list.map((n) => {
          const I = resolveIcon(n);
          return (
            <button key={n} type="button" onClick={() => onChange(n)} title={n}
              className={`grid h-8 place-items-center rounded-md transition ${value === n ? 'bg-[#FFFFFF] text-white' : 'hover:bg-neutral-100'}`}>
              <I size={15} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
