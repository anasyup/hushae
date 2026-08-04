import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Search, Settings2, Trash2, X } from 'lucide-react';
import { useEditor } from '../core/store';
import { getBlockSchema, getSectionSchema, labelFor } from '../core/registry';
import { findNode } from '../core/docUtils';
import { FieldControl } from './FieldControl';
import { THEME_GROUPS } from '../schemas/theme';
import type { Field } from '../core/types';
import { resolveIcon } from './iconRegistry';

/* ============================================================================
 * Right panel — schema-driven settings for the selected node, or the global
 * theme settings when nothing is selected / the theme tab is open.
 * ========================================================================== */

export default function Inspector() {
  const doc = useEditor((s) => s.doc);
  const selectedId = useEditor((s) => s.selectedId);
  const showTheme = useEditor((s) => s.showThemeSettings);

  const loc = useMemo(() => (selectedId ? findNode(doc, selectedId) : null), [doc, selectedId]);

  if (showTheme || !loc) return <ThemePanel forced={showTheme} hasSelection={!!loc} />;
  return <NodePanel key={loc.node.id} />;
}

/* ── Node settings ──────────────────────────────────────────────────────── */
function NodePanel() {
  const doc = useEditor((s) => s.doc);
  const selectedId = useEditor((s) => s.selectedId)!;
  const updateSettings = useEditor((s) => s.updateSettings);
  const select = useEditor((s) => s.select);
  const duplicate = useEditor((s) => s.duplicate);
  const remove = useEditor((s) => s.remove);
  const theme = useEditor((s) => s.theme);
  const [query, setQuery] = useState('');

  const loc = findNode(doc, selectedId);
  if (!loc) return null;
  const { node, isSection, section } = loc;
  const schema = isSection ? getSectionSchema(node.type) : getBlockSchema(node.type);
  const locked = isSection && !!(schema as any)?.locked;

  const fields: Field[] = (schema?.settings || []).filter((f) => {
    if (f.visibleIf && !f.visibleIf(node.settings, { theme, node })) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (f.label || '').toLowerCase().includes(q) || (f.id || '').toLowerCase().includes(q);
  });

  const breadcrumb = isSection ? null : labelFor(section);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {breadcrumb && (
              <button onClick={() => select(section.id)} className="flex items-center gap-1 text-[13px] text-neutral-400 hover:text-[#005BD3]">
                <ChevronLeft size={11} /> {breadcrumb}
              </button>
            )}
            <p className="mt-0.5 truncate text-[15px] font-semibold text-neutral-900">{labelFor(node)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {!locked && (
              <>
                <button onClick={() => duplicate(node.id)} title="Duplicate"
                  className="grid h-7 w-7 place-items-center rounded text-neutral-500 hover:bg-neutral-100"><Copy size={13} /></button>
                <button onClick={() => { if (window.confirm(`Delete “${labelFor(node)}”? This cannot be undone.`)) remove(node.id); }} title="Delete"
                  className="grid h-7 w-7 place-items-center rounded text-neutral-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
              </>
            )}
            <button onClick={() => select(null)} title="Close"
              className="grid h-7 w-7 place-items-center rounded text-neutral-500 hover:bg-neutral-100"><X size={14} /></button>
          </div>
        </div>

        {(schema?.settings?.length || 0) > 10 && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-1.5">
            <Search size={12} className="text-neutral-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search settings"
              className="w-full bg-transparent text-xs outline-none" />
            {query && <button onClick={() => setQuery('')}><X size={11} className="text-neutral-400" /></button>}
          </div>
        )}
      </div>

      <div className="te-scroll flex-1 space-y-4 overflow-y-auto p-4">
        {fields.length === 0 && (
          <p className="rounded-lg bg-neutral-50 p-4 text-center text-xs text-neutral-400">
            {query ? 'No settings match your search.' : 'This block has no settings.'}
          </p>
        )}
        {fields.map((f, i) => (
          <FieldControl
            key={f.id || `${f.type}-${i}`}
            field={f}
            settings={node.settings}
            value={node.settings[f.id!]}
            onChange={(v) => updateSettings(node.id, { [f.id!]: v })}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Theme settings ─────────────────────────────────────────────────────── */
function ThemePanel({ forced, hasSelection }: { forced: boolean; hasSelection: boolean }) {
  const theme = useEditor((s) => s.theme);
  const setTheme = useEditor((s) => s.setTheme);
  const setShowThemeSettings = useEditor((s) => s.setShowThemeSettings);
  const [openGroup, setOpenGroup] = useState<string | null>('colors');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <p className="text-[15px] font-semibold text-neutral-900">Theme settings</p>
        {(forced || hasSelection) && (
          <button onClick={() => setShowThemeSettings(false)}
            className="grid h-7 w-7 place-items-center rounded text-neutral-500 hover:bg-neutral-100"><X size={14} /></button>
        )}
      </div>

      <div className="border-b border-neutral-100 px-3 py-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-1.5">
          <Search size={12} className="text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search theme settings"
            className="w-full bg-transparent text-xs outline-none" />
        </div>
      </div>

      <div className="te-scroll flex-1 overflow-y-auto">
        {THEME_GROUPS.map((g) => {
          const fields = g.fields.filter((f) => !q || (f.label || '').toLowerCase().includes(q));
          if (q && fields.length === 0) return null;
          const open = q ? true : openGroup === g.id;
          const I = resolveIcon(g.icon);
          return (
            <div key={g.id} className="border-b border-neutral-100">
              <button onClick={() => setOpenGroup(open ? null : g.id)}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition hover:bg-neutral-50">
                <I size={14} className="text-neutral-500" />
                <span className="flex-1 text-[13px] font-medium text-neutral-800">{g.label}</span>
                {open ? <ChevronDown size={13} className="text-neutral-400" /> : <ChevronRight size={13} className="text-neutral-400" />}
              </button>
              {open && (
                <div className="space-y-4 px-4 pb-4">
                  {fields.map((f, i) => (
                    <FieldControl key={f.id || `${f.type}-${i}`} field={f} settings={theme}
                      value={theme[f.id!]} onChange={(v) => setTheme({ [f.id!]: v })} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
