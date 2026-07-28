import type { AnyNode, BlockNode, PageDocument, SectionGroup, SectionNode } from './types';
import { createBlock, uid } from './registry';

/* ============================================================================
 * Immutable document helpers.
 *
 * Every mutation returns a new document so the history stack can hold plain
 * snapshots and React can diff cheaply.
 * ========================================================================== */

export const GROUPS: SectionGroup[] = ['header', 'body', 'footer'];

export function cloneDoc(doc: PageDocument): PageDocument {
  return JSON.parse(JSON.stringify(doc));
}

/** Flat list of every section with its group. */
export function eachSection(doc: PageDocument): Array<{ section: SectionNode; group: SectionGroup }> {
  return GROUPS.flatMap((g) => doc[g].map((section) => ({ section, group: g })));
}

/** Locate any node (section or block) and its ancestry. */
export interface NodeLocation {
  node: AnyNode;
  group: SectionGroup;
  section: SectionNode;
  /** Parent array holding the node. */
  parentList: AnyNode[];
  index: number;
  /** Chain of block ancestors, outermost first. Empty when node is a section. */
  ancestors: BlockNode[];
  isSection: boolean;
}

export function findNode(doc: PageDocument, id: string): NodeLocation | null {
  for (const group of GROUPS) {
    const list = doc[group];
    for (let i = 0; i < list.length; i += 1) {
      const section = list[i];
      if (section.id === id) {
        return { node: section, group, section, parentList: list, index: i, ancestors: [], isSection: true };
      }
      const hit = searchBlocks(section.blocks, id, []);
      if (hit) {
        return { ...hit, group, section, isSection: false };
      }
    }
  }
  return null;
}

function searchBlocks(
  list: BlockNode[] | undefined,
  id: string,
  ancestors: BlockNode[],
): Omit<NodeLocation, 'group' | 'section' | 'isSection'> | null {
  if (!list) return null;
  for (let i = 0; i < list.length; i += 1) {
    const b = list[i];
    if (b.id === id) return { node: b, parentList: list, index: i, ancestors };
    const deeper = searchBlocks(b.blocks, id, [...ancestors, b]);
    if (deeper) return deeper;
  }
  return null;
}

/** Owning section of any node id. */
export function sectionOf(doc: PageDocument, id: string): SectionNode | null {
  return findNode(doc, id)?.section ?? null;
}

// ── Mutations (all return a fresh document) ─────────────────────────────────

export function addSection(doc: PageDocument, group: SectionGroup, section: SectionNode, index?: number): PageDocument {
  const next = cloneDoc(doc);
  const at = index ?? next[group].length;
  next[group].splice(at, 0, section);
  return next;
}

export function removeNode(doc: PageDocument, id: string): PageDocument {
  const next = cloneDoc(doc);
  const loc = findNode(next, id);
  if (!loc) return doc;
  loc.parentList.splice(loc.index, 1);
  return next;
}

export function updateNodeSettings(doc: PageDocument, id: string, patch: Record<string, unknown>): PageDocument {
  const next = cloneDoc(doc);
  const loc = findNode(next, id);
  if (!loc) return doc;
  loc.node.settings = { ...loc.node.settings, ...patch } as AnyNode['settings'];
  return next;
}

export function patchNode(doc: PageDocument, id: string, patch: Partial<AnyNode>): PageDocument {
  const next = cloneDoc(doc);
  const loc = findNode(next, id);
  if (!loc) return doc;
  Object.assign(loc.node, patch);
  return next;
}

export function toggleHidden(doc: PageDocument, id: string): PageDocument {
  const next = cloneDoc(doc);
  const loc = findNode(next, id);
  if (!loc) return doc;
  loc.node.hidden = !loc.node.hidden;
  return next;
}

/** Deep-clone a node with fresh ids. */
export function reid<T extends AnyNode>(node: T): T {
  const copy: AnyNode = JSON.parse(JSON.stringify(node));
  copy.id = uid((node as SectionNode).blocks !== undefined && 'blocks' in node ? 's' : 'b');
  const walk = (n: AnyNode) => {
    const kids = (n as SectionNode).blocks;
    if (!kids) return;
    kids.forEach((k) => {
      k.id = uid('b');
      walk(k);
    });
  };
  walk(copy);
  return copy as T;
}

export function duplicateNode(doc: PageDocument, id: string): { doc: PageDocument; newId: string | null } {
  const next = cloneDoc(doc);
  const loc = findNode(next, id);
  if (!loc) return { doc, newId: null };
  const copy = reid(loc.node);
  copy.name = `${(loc.node.name || '').trim() || ''}`.length ? `${loc.node.name} copy` : undefined;
  loc.parentList.splice(loc.index + 1, 0, copy);
  return { doc: next, newId: copy.id };
}

export function addBlock(
  doc: PageDocument,
  parentId: string,
  type: string,
  index?: number,
): { doc: PageDocument; newId: string } {
  const next = cloneDoc(doc);
  const loc = findNode(next, parentId);
  const block = createBlock(type);
  if (!loc) return { doc, newId: block.id };
  const parent = loc.node as SectionNode | BlockNode;
  if (!('blocks' in parent) || !parent.blocks) (parent as BlockNode).blocks = [];
  const list = (parent as SectionNode).blocks!;
  list.splice(index ?? list.length, 0, block);
  return { doc: next, newId: block.id };
}

/** Move a node within its own parent list. */
export function moveWithinParent(doc: PageDocument, id: string, delta: number): PageDocument {
  const next = cloneDoc(doc);
  const loc = findNode(next, id);
  if (!loc) return doc;
  const to = loc.index + delta;
  if (to < 0 || to >= loc.parentList.length) return doc;
  const [item] = loc.parentList.splice(loc.index, 1);
  loc.parentList.splice(to, 0, item);
  return next;
}

/** Drag-and-drop: move `id` to sit at `index` inside `targetParentId`. */
export function moveNode(
  doc: PageDocument,
  id: string,
  targetParentId: string | SectionGroup,
  index: number,
): PageDocument {
  const next = cloneDoc(doc);
  const loc = findNode(next, id);
  if (!loc) return doc;

  // Prevent dropping a node inside itself
  if (typeof targetParentId === 'string' && !GROUPS.includes(targetParentId as SectionGroup)) {
    const target = findNode(next, targetParentId);
    if (!target) return doc;
    let p: AnyNode | undefined = target.node;
    if (p.id === id) return doc;
    for (const a of target.ancestors) if (a.id === id) return doc;
  }

  const [item] = loc.parentList.splice(loc.index, 1);

  if (GROUPS.includes(targetParentId as SectionGroup)) {
    const g = targetParentId as SectionGroup;
    next[g].splice(Math.max(0, Math.min(index, next[g].length)), 0, item as SectionNode);
    return next;
  }

  const target = findNode(next, targetParentId as string);
  if (!target) return doc;
  const parent = target.node as SectionNode;
  if (!parent.blocks) parent.blocks = [];
  parent.blocks.splice(Math.max(0, Math.min(index, parent.blocks.length)), 0, item as BlockNode);
  return next;
}

// ── Diffing for incremental autosave ────────────────────────────────────────
export interface DocDiff {
  changed: string[];
  added: string[];
  removed: string[];
}

function indexNodes(doc: PageDocument): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (n: AnyNode) => {
    map.set(n.id, JSON.stringify({ t: n.type, s: n.settings, h: n.hidden, n: n.name }));
    (n as SectionNode).blocks?.forEach(walk);
  };
  GROUPS.forEach((g) => doc[g].forEach(walk));
  return map;
}

export function diffDocs(prev: PageDocument, next: PageDocument): DocDiff {
  const a = indexNodes(prev);
  const b = indexNodes(next);
  const changed: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  b.forEach((v, k) => {
    if (!a.has(k)) added.push(k);
    else if (a.get(k) !== v) changed.push(k);
  });
  a.forEach((_v, k) => {
    if (!b.has(k)) removed.push(k);
  });
  return { changed, added, removed };
}
