import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Check, Cloud, ExternalLink, FilePlus2, History, Loader2, Monitor, Redo2, Settings2,
  Smartphone, Tablet, Trash2, Undo2,
} from 'lucide-react';
import { useEditor } from '../core/store';
import type { TemplateType } from '../core/types';

/* ============================================================================
 * Top bar — Shopify OS 2.0 style dark bar.
 * Template switcher, device switcher, undo/redo, autosave status, Save/Publish.
 * ========================================================================== */

const TYPE_LABEL: Record<string, string> = { index: 'Home', product: 'Product', collection: 'Collection', blog: 'Blog', cart: 'Cart', page: 'Page' };

export default function Topbar({ onSave, onPublish }: { onSave?: () => void; onPublish: () => void }) {
  const device = useEditor((s) => s.device);
  const setDevice = useEditor((s) => s.setDevice);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const past = useEditor((s) => s.past);
  const future = useEditor((s) => s.future);
  const dirty = useEditor((s) => s.dirty);
  const saving = useEditor((s) => s.saving);
  const lastSavedAt = useEditor((s) => s.lastSavedAt);
  const autosave = useEditor((s) => s.autosave);
  const setAutosave = useEditor((s) => s.setAutosave);
  const setShowVersions = useEditor((s) => s.setShowVersions);
  const showVersions = useEditor((s) => s.showVersions);
  const setShowTheme = useEditor((s) => s.setShowThemeSettings);
  const showTheme = useEditor((s) => s.showThemeSettings);
  const templates = useEditor((s) => s.templates);
  const activeTemplate = useEditor((s) => s.activeTemplate);
  const setTemplate = useEditor((s) => s.setTemplate);
  const addCustomTemplate = useEditor((s) => s.addCustomTemplate);
  const deleteCustomTemplate = useEditor((s) => s.deleteCustomTemplate);

  const activeValue = activeTemplate.type === 'index' ? 'index' : `${activeTemplate.type}__${activeTemplate.customId || ''}`;

  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 20000);
    return () => clearInterval(t);
  }, []);

  const savedLabel = () => {
    if (saving) return 'Saving…';
    if (dirty) return autosave ? 'Unsaved changes' : 'Unsaved changes';
    if (!lastSavedAt) return 'All changes saved';
    const mins = Math.round((Date.now() - lastSavedAt) / 60000);
    return mins < 1 ? 'All changes saved' : `Saved ${mins} min ago`;
  };

  const iconBtn = (active?: boolean) =>
    `grid h-8 w-8 place-items-center rounded-[4px] transition ${
      active ? 'bg-white text-[#202123]' : 'text-[#9BA0A6] hover:bg-white/10 hover:text-white'
    }`;

  const devBtn = (d: typeof device, Icon: typeof Monitor, label: string) => (
    <button onClick={() => setDevice(d)} title={label} aria-label={label} aria-pressed={device === d}
      className={iconBtn(device === d)}>
      <Icon size={15} />
    </button>
  );

  return (
    <header className="te-topbar flex h-14 shrink-0 items-center justify-between gap-3 bg-[#202123] px-3 text-white">
      <div className="flex min-w-0 items-center gap-2">
        <Link to="/admin/store" title="Back to admin"
          className={iconBtn()}>
          <ArrowLeft size={16} />
        </Link>
        <div className="hidden min-w-0 items-center gap-2 sm:flex">
          <p className="truncate text-[13px] font-semibold tracking-tight text-white">HUSHAE Theme</p>
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#9BA0A6]">
            {dirty ? '● Draft' : '● Live'}
          </span>
        </div>

        {/* ── Template switcher (Shopify-style: one design per page type) ── */}
        <div className="ml-1 flex items-center gap-1 rounded-[6px] border border-white/15 bg-white/5 p-0.5">
          <select
            value={activeValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith('ct|')) {
                const [type, id] = v.slice(3).split('__');
                setTemplate({ type: type as TemplateType, customId: id || undefined });
              } else {
                setTemplate({ type: v as TemplateType });
              }
            }}
            title="Which page type you are designing"
            className="h-7 rounded-[4px] border-0 bg-transparent px-1.5 pr-6 text-[11.5px] font-semibold text-white outline-none transition focus:ring-2 focus:ring-white/25"
          >
            {(['index', 'product', 'collection', 'blog', 'cart', 'page'] as const).map((t) => (
              <option key={t} value={t} className="bg-[#202123] text-white">{TYPE_LABEL[t]} template</option>
            ))}
            {(templates.product.custom || []).map((c) => (
              <option key={c.id} value={`ct|product__${c.id}`} className="bg-[#202123] text-white">Product · {c.name}</option>
            ))}
            {(templates.collection.custom || []).map((c) => (
              <option key={c.id} value={`ct|collection__${c.id}`} className="bg-[#202123] text-white">Collection · {c.name}</option>
            ))}
            {(templates.page.custom || []).map((c) => (
              <option key={c.id} value={`ct|page__${c.id}`} className="bg-[#202123] text-white">Page · {c.name}</option>
            ))}
            {(templates.blog.custom || []).map((c) => (
              <option key={c.id} value={`ct|blog__${c.id}`} className="bg-[#202123] text-white">Blog · {c.name}</option>
            ))}
            {(templates.cart.custom || []).map((c) => (
              <option key={c.id} value={`ct|cart__${c.id}`} className="bg-[#202123] text-white">Cart · {c.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (activeTemplate.type === 'index') return;
              const name = window.prompt('Name for the new template', 'Variant 1');
              if (!name?.trim()) return;
              addCustomTemplate(activeTemplate.type as 'product' | 'collection' | 'page' | 'blog' | 'cart', name.trim());
            }}
            title={activeTemplate.type === 'index' ? 'Switch to a page template first' : `New ${TYPE_LABEL[activeTemplate.type]} template`}
            disabled={activeTemplate.type === 'index'}
            className="grid h-7 w-7 place-items-center rounded-[4px] text-[#9BA0A6] transition hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <FilePlus2 size={13} />
          </button>
          {activeTemplate.customId && (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('Delete this template? The default template stays.')) return;
                deleteCustomTemplate(activeTemplate.type as 'product' | 'collection' | 'page' | 'blog' | 'cart', activeTemplate.customId);
              }}
              title="Delete this template"
              className="grid h-7 w-7 place-items-center rounded-[4px] text-[#9BA0A6] transition hover:bg-white/10 hover:text-[#FF8A80]"
            >
              <Trash2 size={12.5} />
            </button>
          )}
        </div>
      </div>

      <div className="hidden items-center gap-1 rounded-[6px] border border-white/15 bg-white/5 p-0.5 md:flex">
        {devBtn('desktop', Monitor, 'Desktop')}
        {devBtn('tablet', Tablet, 'Tablet')}
        {devBtn('mobile', Smartphone, 'Mobile')}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="mr-1 hidden items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[#9BA0A6] lg:flex">
          {saving ? <Loader2 size={11} className="animate-spin" /> : dirty ? <Cloud size={11} /> : <Check size={11} />}
          {savedLabel()}
        </span>

        <button onClick={() => setAutosave(!autosave)} title={autosave ? 'Autosave on' : 'Autosave off'}
          className="hidden h-8 items-center gap-1.5 rounded-[4px] px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[#9BA0A6] transition hover:text-white lg:flex">
          <span className={`h-1 w-1 rounded-full ${autosave ? 'bg-[#7EE787]' : 'bg-[#3F3F46]'}`} /> Auto
        </button>

        <button onClick={() => setShowVersions(!showVersions)} title="Version history" aria-pressed={showVersions}
          className={iconBtn(showVersions)}>
          <History size={15} />
        </button>
        <button onClick={() => setShowTheme(!showTheme)} title="Theme settings" aria-pressed={showTheme}
          className={iconBtn(showTheme)}>
          <Settings2 size={15} />
        </button>

        <span className="mx-1 h-6 w-px bg-white/15" />

        <button onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)"
          className={`${iconBtn()} disabled:opacity-25`}>
          <Undo2 size={15} />
        </button>
        <button onClick={redo} disabled={!future.length} title="Redo (Ctrl+Shift+Z)"
          className={`${iconBtn()} disabled:opacity-25`}>
          <Redo2 size={15} />
        </button>

        {onSave && (
          <button onClick={onSave} disabled={saving}
            className="ml-1.5 inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-white/40 px-3 text-[10px] font-medium uppercase tracking-[0.08em] text-white transition hover:border-white disabled:opacity-35">
            Save
          </button>
        )}
        <button onClick={onPublish} disabled={saving}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[#008060] px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-white shadow-sm transition hover:bg-[#007755] disabled:opacity-35">
          {saving ? <Loader2 size={13} className="animate-spin" /> : null}
          {dirty || saving ? 'Publish' : 'Published'}
        </button>
        <a href="/" target="_blank" rel="noreferrer" title="View live site"
          className={iconBtn()}>
          <ExternalLink size={14} />
        </a>
      </div>
    </header>
  );
}
