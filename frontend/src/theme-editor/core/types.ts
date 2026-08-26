/* ============================================================================
 * Theme Editor — core type system
 *
 * The whole editor is data-driven: a page is a JSON document, every section and
 * block declares a schema, and the UI is generated from that schema. Nothing in
 * the editor UI is hard-coded per section.
 * ========================================================================== */

// ── Setting values ──────────────────────────────────────────────────────────
export type SettingPrimitive = string | number | boolean | null;
export type SettingValue =
  | SettingPrimitive
  | SettingPrimitive[]
  | Record<string, unknown>
  | Array<Record<string, unknown>>;

export type SettingsBag = Record<string, SettingValue>;

// ── Schema field types (mirrors Shopify's input settings, plus extras) ──────
export type FieldType =
  // text
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'inline_richtext'
  | 'html'
  | 'liquid'
  // numeric
  | 'number'
  | 'range'
  // boolean
  | 'checkbox'
  | 'toggle'
  // choice
  | 'select'
  | 'radio'
  | 'button_group'
  | 'segment'
  // colour
  | 'color'
  | 'color_background'
  | 'color_scheme'
  // media
  | 'image_picker'
  | 'video_picker'
  | 'icon_picker'
  // resources
  | 'product'
  | 'product_list'
  | 'collection'
  | 'collection_list'
  | 'page'
  | 'blog'
  | 'article'
  | 'link_list'
  | 'url'
  // typography / layout
  | 'font_picker'
  | 'spacing'
  | 'alignment'
  // repeaters
  | 'list'
  // presentational (no value)
  | 'header'
  | 'paragraph'
  | 'divider';

export interface FieldOption {
  value: string | number;
  label: string;
  /** Optional lucide icon name for button_group / segment renderers. */
  icon?: string;
}

/** A single schema-driven input. */
export interface Field {
  type: FieldType;
  /** Key inside the owning node's `settings` object. Omitted for presentational fields. */
  id?: string;
  label?: string;
  info?: string;
  placeholder?: string;
  default?: SettingValue;

  // numeric
  min?: number;
  max?: number;
  step?: number;
  unit?: string;

  // choice
  options?: FieldOption[];

  // text
  rows?: number;

  // list repeater
  /** Schema for each row of a `list` field. */
  fields?: Field[];
  /** Which sub-field to show as the row title in the collapsed state. */
  titleKey?: string;
  addLabel?: string;
  maxRows?: number;

  /** Conditional visibility, evaluated against the node's own settings bag. */
  visibleIf?: (settings: SettingsBag, ctx: VisibilityContext) => boolean;
}

export interface VisibilityContext {
  /** Global theme settings, so a field can react to them if needed. */
  theme: SettingsBag;
  /** The node being edited. */
  node: SectionNode | BlockNode;
}

// ── Document nodes ──────────────────────────────────────────────────────────
export interface BlockNode {
  id: string;
  type: string;
  /** Merchant-supplied rename; falls back to the schema name. */
  name?: string;
  hidden?: boolean;
  settings: SettingsBag;
  /** Unlimited nesting. */
  blocks?: BlockNode[];
}

export interface SectionNode {
  id: string;
  type: string;
  name?: string;
  hidden?: boolean;
  settings: SettingsBag;
  blocks: BlockNode[];
}

export type AnyNode = SectionNode | BlockNode;

/** A whole page template. */
export interface PageDocument {
  /** Template identifier, e.g. 'index', 'product', 'collection'. */
  template: string;
  /** Sections pinned above the template body (header group). */
  header: SectionNode[];
  /** The template body — freely reorderable. */
  body: SectionNode[];
  /** Sections pinned below (footer group). */
  footer: SectionNode[];
}

export type SectionGroup = 'header' | 'body' | 'footer';

// ── Schemas ─────────────────────────────────────────────────────────────────
export interface BlockSchema {
  type: string;
  name: string;
  /** Lucide icon name. */
  icon?: string;
  /** Short description — used for the row's hover tooltip, as on sections. */
  description?: string;
  /** Max instances of this block inside one parent. */
  limit?: number;
  settings: Field[];
  /** Block types allowed as children — enables unlimited nesting. */
  accepts?: string[];
  maxBlocks?: number;
  /** Default child blocks created with the block. */
  preset?: Array<{ type: string; settings?: SettingsBag }>;
}

export interface SectionSchema {
  type: string;
  name: string;
  icon?: string;
  /** Grouping in the "Add section" browser. */
  category: string;
  /** Which document groups this section may live in. */
  groups?: SectionGroup[];
  /** Max instances of this section on a page. */
  limit?: number;
  /** Section may not be deleted or moved out of its group (header/footer). */
  locked?: boolean;
  settings: Field[];
  blocks?: BlockSchema[];
  maxBlocks?: number;
  /** Blocks created when the section is added. */
  preset?: Array<{ type: string; settings?: SettingsBag; blocks?: BlockNode[] }>;
  /** Short description shown in the add-section browser. */
  description?: string;
}

// ── Selection & history ─────────────────────────────────────────────────────
export interface Selection {
  /** Node id — section or block. */
  id: string;
  /** Group the owning section lives in. */
  group: SectionGroup;
}

export interface HistoryEntry {
  doc: PageDocument;
  theme: SettingsBag;
  label: string;
  at: number;
}

export interface ThemeVersion {
  _id: string;
  label: string;
  createdAt: string;
  doc: PageDocument;
  theme: SettingsBag;
}

export type Device = 'desktop' | 'tablet' | 'mobile';

// ── Preview bridge messages ─────────────────────────────────────────────────
export type EditorToPreview =
  | { source: 'hushae-editor'; type: 'doc'; doc: PageDocument; theme: SettingsBag }
  | { source: 'hushae-editor'; type: 'select'; id: string | null }
  | { source: 'hushae-editor'; type: 'scroll-to'; id: string };

export type PreviewToEditor =
  | { source: 'hushae-preview'; type: 'ready' }
  | { source: 'hushae-preview'; type: 'select'; id: string }
  | { source: 'hushae-preview'; type: 'hover'; id: string | null }
  /** Merchant dragged a node onto another one directly in the preview. */
  | { source: 'hushae-preview'; type: 'move'; id: string; targetId: string; edge: 'before' | 'after' | 'inside' }
  /** Inline text edit committed in the preview. */
  | { source: 'hushae-preview'; type: 'edit-text'; id: string; key: string; value: string }
  /** Toolbar actions fired from the on-canvas chrome. */
  | { source: 'hushae-preview'; type: 'nudge'; id: string; delta: number }
  | { source: 'hushae-preview'; type: 'duplicate'; id: string }
  | { source: 'hushae-preview'; type: 'delete'; id: string };
