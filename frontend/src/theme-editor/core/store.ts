import { create } from 'zustand';
import type {
  ActiveTemplate, Device, HistoryEntry, PageDocument, SectionGroup, SettingsBag,
  TemplateBag, ThemeDoc, ThemeVersion,
} from './types';
import { createSection } from './registry';
import { buildDefaultTemplate } from '../schemas/defaultDoc';
import { applyPreset } from '../schemas/theme';
import {
  addBlock, addSection, cloneDoc, diffDocs, duplicateNode, findNode, moveNode,
  moveWithinParent, patchNode, removeNode, toggleHidden, updateNodeSettings,
} from './docUtils';

/* ============================================================================
 * Editor store — Zustand
 *
 * Holds the page document, global theme settings, selection, history and the
 * autosave/version machinery. Deliberately framework-agnostic so the same store
 * can drive the sidebar, the inspector and the preview bridge.
 * ========================================================================== */

const HISTORY_LIMIT = 500;

export interface EditorState {
  // document
  doc: PageDocument;
  theme: SettingsBag;
  savedDoc: PageDocument | null;
  savedTheme: SettingsBag | null;

  // multi-template bag (Shopify OS 2.0 style)
  templates: TemplateBag;
  activeTemplate: ActiveTemplate;

  // ui
  selectedId: string | null;
  hoveredId: string | null;
  device: Device;
  expanded: Record<string, boolean>;
  sidebarQuery: string;
  addSectionFor: SectionGroup | null;
  addBlockFor: string | null;
  showVersions: boolean;
  showThemeSettings: boolean;

  // status
  loading: boolean;
  saving: boolean;
  /** True once a document is published and the storefront renders it. */
  liveThemed: boolean;
  dirty: boolean;
  lastSavedAt: number | null;
  autosave: boolean;
  versions: ThemeVersion[];

  // history
  past: HistoryEntry[];
  future: HistoryEntry[];

  // ── actions ───────────────────────────────────────────────────────────────
  hydrate: (doc: ThemeDoc, theme: SettingsBag, versions?: ThemeVersion[], liveThemed?: boolean) => void;
  setLiveThemed: (v: boolean) => void;
  commit: (label: string, mutate: (doc: PageDocument) => PageDocument) => void;
  setTheme: (patch: SettingsBag, label?: string) => void;

  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setDevice: (d: Device) => void;
  toggleExpanded: (id: string, force?: boolean) => void;
  expandAncestors: (id: string) => void;
  setSidebarQuery: (q: string) => void;
  openAddSection: (g: SectionGroup | null) => void;
  openAddBlock: (parentId: string | null) => void;
  setShowVersions: (v: boolean) => void;
  setShowThemeSettings: (v: boolean) => void;

  updateSettings: (id: string, patch: Record<string, unknown>) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  toggleVisibility: (id: string) => void;
  move: (id: string, delta: number) => void;
  dropNode: (id: string, parent: string | SectionGroup, index: number) => void;
  insertSection: (type: string, group: SectionGroup, index?: number) => void;
  insertBlock: (parentId: string, type: string, index?: number) => void;

  // template bag
  setTemplate: (t: ActiveTemplate) => void;
  addCustomTemplate: (type: 'product' | 'collection' | 'page' | 'blog' | 'cart', name: string) => void;
  renameCustomTemplate: (type: 'product' | 'collection' | 'page', id: string, name: string) => void;
  deleteCustomTemplate: (type: 'product' | 'collection' | 'page' | 'blog' | 'cart', id: string) => void;
  applyPreset: (presetId: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  markSaved: (doc: PageDocument, theme: SettingsBag) => void;
  setSaving: (v: boolean) => void;
  setAutosave: (v: boolean) => void;
  setVersions: (v: ThemeVersion[]) => void;
  restoreVersion: (v: ThemeVersion) => void;
  pendingDiff: () => ReturnType<typeof diffDocs> | null;
}

const emptyDoc: PageDocument = { template: 'index', header: [], body: [], footer: [] };

export function emptyTemplateBag(): TemplateBag {
  return {
    index: { template: 'index', header: [], body: [], footer: [] },
    product: { default: buildDefaultTemplate('product'), custom: [] },
    collection: { default: buildDefaultTemplate('collection'), custom: [] },
    page: { default: buildDefaultTemplate('page'), custom: [] },
    blog: { default: buildDefaultTemplate('blog'), custom: [] },
    cart: { default: buildDefaultTemplate('cart'), custom: [] },
  };
}

/** Key into the templates bag for an active template. */
export function templateKey(t: ActiveTemplate): string {
  return t.type === 'index' ? 'index' : `${t.type}${t.customId ? `__${t.customId}` : ''}`;
}

export const useEditor = create<EditorState>((set, get) => ({
  doc: emptyDoc,
  theme: {},
  savedDoc: null,
  savedTheme: null,
  templates: emptyTemplateBag(),
  activeTemplate: { type: 'index' },

  selectedId: null,
  hoveredId: null,
  device: (() => {
    try {
      const d = localStorage.getItem('hushae.te.device');
      return d === 'tablet' || d === 'mobile' || d === 'desktop' ? d : 'desktop';
    } catch { return 'desktop'; }
  })(),
  expanded: {},
  sidebarQuery: '',
  addSectionFor: null,
  addBlockFor: null,
  showVersions: false,
  showThemeSettings: false,

  loading: true,
  saving: false,
  liveThemed: false,
  dirty: false,
  lastSavedAt: null,
  autosave: true,
  versions: [],

  past: [],
  future: [],

  hydrate: (themeDoc, theme, versions = [], liveThemed = false) => {
    // ThemeDoc may carry a templates bag (new) or be a plain index document
    // (legacy) — always normalise into the bag.
    const indexDoc: PageDocument = {
      template: 'index',
      header: themeDoc?.header || [],
      body: themeDoc?.body || [],
      footer: themeDoc?.footer || [],
    };
    const base = themeDoc?.templates || emptyTemplateBag();
    const bag: TemplateBag = { ...base, index: indexDoc };
    set({
      doc: indexDoc,
      templates: bag,
      activeTemplate: { type: 'index' },
      theme,
      savedDoc: cloneDoc(indexDoc),
      savedTheme: { ...theme },
      loading: false,
      dirty: false,
      past: [],
      future: [],
      versions,
      liveThemed,
    });
  },

  setLiveThemed: (liveThemed) => set({ liveThemed }),

  commit: (label, mutate) => {
    const { doc, theme, past, templates, activeTemplate } = get();
    const next = mutate(doc);
    if (next === doc) return;
    // Persist the active template back into the bag so switching never loses it.
    const bag: TemplateBag = { ...templates };
    if (activeTemplate.type === 'index') {
      bag.index = next;
    } else if (activeTemplate.customId) {
      const list = bag[activeTemplate.type].custom;
      bag[activeTemplate.type] = {
        ...bag[activeTemplate.type],
        custom: list.map((c) => (c.id === activeTemplate.customId ? { ...c, doc: next } : c)),
      };
    } else {
      bag[activeTemplate.type] = { ...bag[activeTemplate.type], default: next };
    }
    set({
      doc: next,
      templates: bag,
      past: [...past, { doc, theme, label, at: Date.now() }].slice(-HISTORY_LIMIT),
      future: [],
      dirty: true,
    });
  },

  setTheme: (patch, label = 'Theme settings') => {
    const { doc, theme, past } = get();
    set({
      theme: { ...theme, ...patch },
      past: [...past, { doc, theme, label, at: Date.now() }].slice(-HISTORY_LIMIT),
      future: [],
      dirty: true,
    });
  },

  select: (id) => {
    set({ selectedId: id });
    if (id) get().expandAncestors(id);
  },
  hover: (id) => set({ hoveredId: id }),
  setDevice: (device) => {
    try { localStorage.setItem('hushae.te.device', device); } catch { /* ignore */ }
    set({ device });
  },

  toggleExpanded: (id, force) =>
    set((s) => ({ expanded: { ...s.expanded, [id]: force ?? !s.expanded[id] } })),

  expandAncestors: (id) => {
    const { doc } = get();
    const loc = findNode(doc, id);
    if (!loc) return;
    const ids = [loc.section.id, ...loc.ancestors.map((a) => a.id)];
    set((s) => {
      const next = { ...s.expanded };
      ids.forEach((i) => { next[i] = true; });
      return { expanded: next };
    });
  },

  setSidebarQuery: (sidebarQuery) => set({ sidebarQuery }),
  openAddSection: (addSectionFor) => set({ addSectionFor, addBlockFor: null }),
  openAddBlock: (addBlockFor) => set({ addBlockFor, addSectionFor: null }),
  setShowVersions: (showVersions) => set({ showVersions }),
  setShowThemeSettings: (showThemeSettings) => set({ showThemeSettings }),

  updateSettings: (id, patch) =>
    get().commit('Edit settings', (d) => updateNodeSettings(d, id, patch)),

  rename: (id, name) => get().commit('Rename', (d) => patchNode(d, id, { name: name || undefined })),
  remove: (id) => {
    get().commit('Delete', (d) => removeNode(d, id));
    if (get().selectedId === id) set({ selectedId: null });
  },
  duplicate: (id) => {
    const { doc } = get();
    const { doc: next, newId } = duplicateNode(doc, id);
    if (!newId) return;
    get().commit('Duplicate', () => next);
    set({ selectedId: newId });
  },
  toggleVisibility: (id) => get().commit('Toggle visibility', (d) => toggleHidden(d, id)),
  move: (id, delta) => get().commit('Reorder', (d) => moveWithinParent(d, id, delta)),
  dropNode: (id, parent, index) => get().commit('Reorder', (d) => moveNode(d, id, parent, index)),

  insertSection: (type, group, index) => {
    const section = createSection(type);
    get().commit('Add section', (d) => addSection(d, group, section, index));
    set({ selectedId: section.id, addSectionFor: null });
    get().toggleExpanded(section.id, true);
  },

  insertBlock: (parentId, type, index) => {
    const { doc } = get();
    const { doc: next, newId } = addBlock(doc, parentId, type, index);
    get().commit('Add block', () => next);
    set({ selectedId: newId, addBlockFor: null });
    get().toggleExpanded(parentId, true);
  },

  // ── Template bag ────────────────────────────────────────────────────────
  setTemplate: (t) => {
    const { doc, templates, activeTemplate } = get();
    // stash the current doc into the bag before switching
    const bag: TemplateBag = { ...templates };
    if (activeTemplate.type === 'index') {
      bag.index = doc;
    } else if (activeTemplate.customId) {
      const list = bag[activeTemplate.type].custom;
      bag[activeTemplate.type] = {
        ...bag[activeTemplate.type],
        custom: list.map((c) => (c.id === activeTemplate.customId ? { ...c, doc } : c)),
      };
    } else {
      bag[activeTemplate.type] = { ...bag[activeTemplate.type], default: doc };
    }
    // load the target template
    let nextDoc = doc;
    if (t.type === 'index') nextDoc = bag.index || { template: 'index', header: [], body: [], footer: [] };
    else if (t.customId) {
      const c = bag[t.type].custom.find((x) => x.id === t.customId);
      nextDoc = c ? c.doc : bag[t.type].default;
    } else nextDoc = bag[t.type].default;
    set({
      templates: bag,
      activeTemplate: t,
      doc: nextDoc,
      selectedId: null,
      addSectionFor: null,
      addBlockFor: null,
      expanded: {},
    });
  },

  addCustomTemplate: (type, name) => {
    const { templates, doc, activeTemplate } = get();
    const bag: TemplateBag = { ...templates };
    if (activeTemplate.type === type && !activeTemplate.customId) {
      // duplicate the current default as the seed
      bag[type] = { ...bag[type], custom: [...bag[type].custom, { id: `ct_${Date.now().toString(36)}`, name, doc: cloneDoc(doc) }] };
    } else {
      bag[type] = { ...bag[type], custom: [...bag[type].custom, { id: `ct_${Date.now().toString(36)}`, name, doc: cloneDoc(bag[type].default) }] };
    }
    const newId = bag[type].custom[bag[type].custom.length - 1].id;
    set({ templates: bag });
    get().setTemplate({ type, customId: newId });
  },

  renameCustomTemplate: (type, id, name) => {
    const { templates } = get();
    const bag: TemplateBag = { ...templates };
    bag[type] = {
      ...bag[type],
      custom: bag[type].custom.map((c) => (c.id === id ? { ...c, name } : c)),
    };
    set({ templates: bag });
  },

  deleteCustomTemplate: (type, id) => {
    const { templates, activeTemplate } = get();
    const bag: TemplateBag = { ...templates };
    bag[type] = { ...bag[type], custom: bag[type].custom.filter((c) => c.id !== id) };
    set({ templates: bag });
    if (activeTemplate.type === type && activeTemplate.customId === id) {
      get().setTemplate({ type });
    }
  },

  applyPreset: (presetId) => {
    const patch = applyPreset(presetId);
    if (!patch) return;
    get().setTheme(patch, `Applied preset: ${presetId}`);
  },

  undo: () => {
    const { past, future, doc, theme } = get();
    if (!past.length) return;
    const prev = past[past.length - 1];
    set({
      doc: prev.doc,
      theme: prev.theme,
      past: past.slice(0, -1),
      future: [{ doc, theme, label: prev.label, at: Date.now() }, ...future].slice(0, HISTORY_LIMIT),
      dirty: true,
    });
  },

  redo: () => {
    const { past, future, doc, theme } = get();
    if (!future.length) return;
    const [nextEntry, ...rest] = future;
    set({
      doc: nextEntry.doc,
      theme: nextEntry.theme,
      past: [...past, { doc, theme, label: nextEntry.label, at: Date.now() }].slice(-HISTORY_LIMIT),
      future: rest,
      dirty: true,
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  markSaved: (doc, theme) =>
    set({ savedDoc: cloneDoc(doc), savedTheme: { ...theme }, dirty: false, lastSavedAt: Date.now(), saving: false }),
  setSaving: (saving) => set({ saving }),
  setAutosave: (autosave) => set({ autosave }),
  setVersions: (versions) => set({ versions }),

  restoreVersion: (v) => {
    get().commit(`Restore ${v.label}`, () => cloneDoc(v.doc));
    set({ theme: { ...v.theme }, showVersions: false, selectedId: null });
  },

  pendingDiff: () => {
    const { savedDoc, doc } = get();
    if (!savedDoc) return null;
    return diffDocs(savedDoc, doc);
  },
}));
