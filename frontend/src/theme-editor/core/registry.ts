import type { BlockSchema, SectionSchema, SettingsBag, Field, BlockNode, SectionNode } from './types';

/* ============================================================================
 * Schema registry
 *
 * Sections and blocks register themselves here. The editor UI, the renderer and
 * the document factory all read from this single source of truth, so adding a
 * new section is one file + one register call — no editor code changes.
 * ========================================================================== */

const sections = new Map<string, SectionSchema>();
const blocks = new Map<string, BlockSchema>();

export function registerSection(schema: SectionSchema): SectionSchema {
  sections.set(schema.type, schema);
  (schema.blocks || []).forEach(registerBlock);
  return schema;
}

export function registerBlock(schema: BlockSchema): BlockSchema {
  if (!blocks.has(schema.type)) blocks.set(schema.type, schema);
  return schema;
}

export const getSectionSchema = (type: string) => sections.get(type);
export const getBlockSchema = (type: string) => blocks.get(type);
export const allSections = () => [...sections.values()];
export const allBlocks = () => [...blocks.values()];

/** Section types grouped by their `category`, for the add-section browser. */
export function sectionsByCategory() {
  const out = new Map<string, SectionSchema[]>();
  for (const s of sections.values()) {
    if (s.locked) continue;
    const list = out.get(s.category) || [];
    list.push(s);
    out.set(s.category, list);
  }
  return out;
}

// ── Defaults ────────────────────────────────────────────────────────────────
export function defaultsFor(fields: Field[]): SettingsBag {
  const bag: SettingsBag = {};
  for (const f of fields) {
    if (!f.id) continue;
    if (f.default !== undefined) bag[f.id] = f.default;
    else if (f.type === 'checkbox' || f.type === 'toggle') bag[f.id] = false;
    else if (f.type === 'range' || f.type === 'number') bag[f.id] = f.min ?? 0;
    else if (f.type === 'list') bag[f.id] = [];
    else bag[f.id] = '';
  }
  return bag;
}

let seq = 0;
export function uid(prefix = 'n'): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

// ── Factories ───────────────────────────────────────────────────────────────
export function createBlock(type: string, overrides: Partial<BlockNode> = {}): BlockNode {
  const schema = getBlockSchema(type);
  const node: BlockNode = {
    id: uid('b'),
    type,
    settings: { ...defaultsFor(schema?.settings || []), ...(overrides.settings || {}) },
    ...(overrides.name ? { name: overrides.name } : null),
  };
  const children = schema?.preset?.map((p) => createBlock(p.type, { settings: p.settings }));
  if (children?.length) node.blocks = children;
  if (overrides.blocks) node.blocks = overrides.blocks;
  return node;
}

export function createSection(type: string, overrides: Partial<SectionNode> = {}): SectionNode {
  const schema = getSectionSchema(type);
  const preset = schema?.preset || [];
  return {
    id: uid('s'),
    type,
    settings: { ...defaultsFor(schema?.settings || []), ...(overrides.settings || {}) },
    blocks: overrides.blocks || preset.map((p) => createBlock(p.type, { settings: p.settings, blocks: p.blocks })),
    ...(overrides.name ? { name: overrides.name } : null),
  };
}

/** Human label for a node — merchant rename wins, then schema name, then type. */
export function labelFor(node: { type: string; name?: string }): string {
  if (node.name) return node.name;
  return getSectionSchema(node.type)?.name || getBlockSchema(node.type)?.name || node.type;
}

export function iconFor(node: { type: string }): string {
  return getSectionSchema(node.type)?.icon || getBlockSchema(node.type)?.icon || 'Square';
}
