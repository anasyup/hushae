import { create } from 'zustand';
import type {
  Device, HistoryEntry, PageDocument, SectionGroup, SettingsBag, ThemeVersion,
} from './types';
import { createSection } from './registry';
import { buildDefaultDoc } from '../schemas/defaultDoc';
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
  hydrate: (doc: PageDocument, theme: SettingsBag, versions?: ThemeVersion[], liveThemed?: boolean) => void;
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

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  markSaved: (doc: PageDocument, theme: SettingsBag) => void;
  setSaving: (v: boolean) => void;
  setAutosave: (v: boolean) => void;
  setVersions: (v: ThemeVersion[]) => void;
  restoreVersion: (v: ThemeVersion) => void;
  resetDoc: () => void;
  pendingDiff: () => ReturnType<typeof diffDocs> | null;
}

const emptyDoc: PageDocument = { template: 'index', header: [], body: [], footer: [] };

export const useEditor = create<EditorState>((set, get) => ({
  doc: emptyDoc,
  theme: {},
  savedDoc: null,
  savedTheme: null,

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

  hydrate: (doc, theme, versions = [], liveThemed = false) =>
    set({
      doc,
      theme,
      savedDoc: cloneDoc(doc),
      savedTheme: { ...theme },
      loading: false,
      dirty: false,
      past: [],
      future: [],
      versions,
      liveThemed,
    }),

  setLiveThemed: (liveThemed) => set({ liveThemed }),

  commit: (label, mutate) => {
    const { doc, theme, past } = get();
    const next = mutate(doc);
    if (next === doc) return;
    set({
      doc: next,
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

  resetDoc: () => get().commit('Reset theme', () => buildDefaultDoc()),

  pendingDiff: () => {
    const { savedDoc, doc } = get();
    if (!savedDoc) return null;
    return diffDocs(savedDoc, doc);
  },
}));
