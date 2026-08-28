import type { Field, SettingsBag } from '../core/types';
import { defaultsFor } from '../core/registry';

/* ============================================================================
 * Global theme settings — the "Theme settings" panel.
 * Values are emitted as CSS custom properties on the preview root, so every
 * section inherits them without prop drilling.
 * ========================================================================== */

export interface ThemeGroup {
  id: string;
  label: string;
  icon: string;
  fields: Field[];
}

/* ── One-click looks (premium) ──────────────────────────────────────────────
   Presets are curated colour + typography combos. Selecting one patches the
   relevant theme keys, and the merchant keeps full control afterwards. */
export const THEME_PRESETS: Record<string, { label: string; swatch: [string, string, string]; patch: SettingsBag }> = {
  noir: {
    label: 'Noir',
    swatch: ['#0D0D0D', '#FBFAF8', '#7C8B72'],
    patch: {
      colorPrimary: '#0D0D0D', colorAccent: '#7C8B72', colorBg: '#FBFAF8', colorSurface: '#FFFFFF',
      colorMuted: '#F1EEE9', colorText: '#0D0D0D', colorTextMuted: '#6B6B6B', colorBorder: '#E4E0DA',
      colorSale: '#B4453C', colorSuccess: '#4F7A52', fontHeading: 'Jost', fontBody: 'Jost',
      btnRadius: 999, btnUppercase: true, cardRadius: 16,
    },
  },
  ivory: {
    label: 'Ivory',
    swatch: ['#F5EFE6', '#FFFFFF', '#A88B6C'],
    patch: {
      colorPrimary: '#2E2419', colorAccent: '#A88B6C', colorBg: '#F5EFE6', colorSurface: '#FFFFFF',
      colorMuted: '#EFE6D8', colorText: '#2E2419', colorTextMuted: '#8A7A66', colorBorder: '#E3D8C6',
      colorSale: '#B4453C', colorSuccess: '#4F7A52', fontHeading: 'Cormorant Garamond', fontBody: 'Jost',
      btnRadius: 4, btnUppercase: true, cardRadius: 4,
    },
  },
  emerald: {
    label: 'Emerald',
    swatch: ['#10302A', '#F4F7F5', '#2E8B6E'],
    patch: {
      colorPrimary: '#10302A', colorAccent: '#2E8B6E', colorBg: '#F4F7F5', colorSurface: '#FFFFFF',
      colorMuted: '#E8EFEC', colorText: '#10302A', colorTextMuted: '#5E7269', colorBorder: '#D8E4DE',
      colorSale: '#C2410C', colorSuccess: '#2E8B6E', fontHeading: 'Jost', fontBody: 'Jost',
      btnRadius: 999, btnUppercase: false, cardRadius: 12,
    },
  },
  terracotta: {
    label: 'Terracotta',
    swatch: ['#3B1F14', '#FAF6F3', '#C05B32'],
    patch: {
      colorPrimary: '#3B1F14', colorAccent: '#C05B32', colorBg: '#FAF6F3', colorSurface: '#FFFFFF',
      colorMuted: '#F3E8E1', colorText: '#3B1F14', colorTextMuted: '#8A7264', colorBorder: '#EADCD2',
      colorSale: '#B4453C', colorSuccess: '#4F7A52', fontHeading: 'Jost', fontBody: 'Jost',
      btnRadius: 2, btnUppercase: true, cardRadius: 8,
    },
  },
  slate: {
    label: 'Slate',
    swatch: ['#1E293B', '#F8FAFC', '#64748B'],
    patch: {
      colorPrimary: '#1E293B', colorAccent: '#64748B', colorBg: '#F8FAFC', colorSurface: '#FFFFFF',
      colorMuted: '#EEF2F7', colorText: '#1E293B', colorTextMuted: '#64748B', colorBorder: '#E2E8F0',
      colorSale: '#DC2626', colorSuccess: '#16A34A', fontHeading: 'Jost', fontBody: 'Jost',
      btnRadius: 6, btnUppercase: false, cardRadius: 10,
    },
  },
};

/** Apply a preset → returns the theme patch (no-op when unknown). */
export function applyPreset(id: string): SettingsBag | null {
  const p = THEME_PRESETS[id];
  return p ? { ...p.patch, preset: id } : null;
}

export const THEME_GROUPS: ThemeGroup[] = [
  {
    id: 'presets', label: 'Looks (presets)', icon: 'Palette',
    fields: [
      { type: 'paragraph', label: 'One-click curated colour + typography looks. Pick one to start — every value stays fully editable afterwards.' },
      { type: 'preset_picker', id: 'preset', label: 'Theme look' },
    ],
  },
  {
    id: 'colors', label: 'Colours', icon: 'Palette',
    fields: [
      { type: 'header', label: 'Brand' },
      { type: 'color', id: 'colorPrimary', label: 'Primary', default: '#0D0D0D' },
      { type: 'color', id: 'colorAccent', label: 'Accent', default: '#7C8B72' },
      { type: 'header', label: 'Surfaces' },
      { type: 'color', id: 'colorBg', label: 'Page background', default: '#FBFAF8' },
      { type: 'color', id: 'colorSurface', label: 'Card surface', default: '#FFFFFF' },
      { type: 'color', id: 'colorMuted', label: 'Muted surface', default: '#F1EEE9' },
      { type: 'header', label: 'Text' },
      { type: 'color', id: 'colorText', label: 'Body text', default: '#0D0D0D' },
      { type: 'color', id: 'colorTextMuted', label: 'Muted text', default: '#6B6B6B' },
      { type: 'color', id: 'colorBorder', label: 'Borders', default: '#E4E0DA' },
      { type: 'header', label: 'Status' },
      { type: 'color', id: 'colorSale', label: 'Sale', default: '#B4453C' },
      { type: 'color', id: 'colorSuccess', label: 'Success', default: '#4F7A52' },
    ],
  },
  {
    id: 'typography', label: 'Typography', icon: 'Type',
    fields: [
      { type: 'header', label: 'Headings' },
      { type: 'font_picker', id: 'fontHeading', label: 'Heading font', default: 'Jost' },
      { type: 'range', id: 'headingScale', label: 'Heading size', min: 70, max: 150, step: 5, unit: '%', default: 100 },
      { type: 'range', id: 'headingTracking', label: 'Heading tracking', min: -5, max: 40, step: 1, unit: ' /100em', default: 0 }, // 0 = normal, 20 = wide
      { type: 'select', id: 'headingWeight', label: 'Heading weight', default: '500',
        options: ['300', '400', '500', '600', '700'].map((v) => ({ value: v, label: v })) },
      { type: 'header', label: 'Body' },
      { type: 'font_picker', id: 'fontBody', label: 'Body font', default: 'Jost' },
      { type: 'range', id: 'bodyScale', label: 'Body size', min: 80, max: 130, step: 5, unit: '%', default: 100 },
      { type: 'range', id: 'bodyLeading', label: 'Line spacing', min: 100, max: 200, step: 5, unit: '%', default: 160 },
    ],
  },
  {
    id: 'buttons', label: 'Buttons', icon: 'MousePointerClick',
    fields: [
      { type: 'range', id: 'btnRadius', label: 'Corner radius', min: 0, max: 40, step: 1, unit: 'px', default: 999 },
      { type: 'range', id: 'btnPaddingX', label: 'Horizontal padding', min: 8, max: 48, step: 2, unit: 'px', default: 28 },
      { type: 'range', id: 'btnPaddingY', label: 'Vertical padding', min: 6, max: 28, step: 1, unit: 'px', default: 14 },
      { type: 'range', id: 'btnTracking', label: 'Letter spacing', min: 0, max: 40, step: 1, unit: '/100em', default: 12, info: 'Wider = more space between letters' },
      { type: 'checkbox', id: 'btnUppercase', label: 'Uppercase labels', default: true },
      { type: 'range', id: 'btnBorderWidth', label: 'Border width', min: 0, max: 4, step: 1, unit: 'px', default: 1 },
    ],
  },
  {
    id: 'cards', label: 'Cards', icon: 'Square',
    fields: [
      { type: 'range', id: 'cardRadius', label: 'Corner radius', min: 0, max: 48, step: 2, unit: 'px', default: 16 },
      { type: 'select', id: 'cardShadow', label: 'Shadow', default: 'none',
        options: [{ value: 'none', label: 'None' }, { value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }] },
      { type: 'checkbox', id: 'cardBorder', label: 'Show border', default: false },
      { type: 'range', id: 'cardPadding', label: 'Inner padding', min: 0, max: 32, step: 2, unit: 'px', default: 0 },
    ],
  },
  {
    id: 'inputs', label: 'Forms & inputs', icon: 'TextCursorInput',
    fields: [
      { type: 'range', id: 'inputRadius', label: 'Corner radius', min: 0, max: 32, step: 1, unit: 'px', default: 12 },
      { type: 'range', id: 'inputHeight', label: 'Height', min: 32, max: 64, step: 2, unit: 'px', default: 44 },
      { type: 'color', id: 'inputBorder', label: 'Border colour', default: '#E4E0DA' },
      { type: 'color', id: 'inputBg', label: 'Background', default: '#FFFFFF' },
    ],
  },
  {
    id: 'layout', label: 'Layout & spacing', icon: 'Ruler',
    fields: [
      { type: 'range', id: 'pageWidth', label: 'Page width', min: 960, max: 1800, step: 20, unit: 'px', default: 1280 },
      { type: 'range', id: 'gutter', label: 'Side gutter', min: 8, max: 64, step: 2, unit: 'px', default: 20 },
      { type: 'range', id: 'sectionGap', label: 'Default gap between sections', min: 0, max: 160, step: 4, unit: 'px', default: 0 },
      { type: 'range', id: 'radiusBase', label: 'Global radius', min: 0, max: 40, step: 2, unit: 'px', default: 16 },
    ],
  },
  {
    id: 'animation', label: 'Animations', icon: 'Wand2',
    fields: [
      { type: 'checkbox', id: 'animEnabled', label: 'Enable scroll animations', default: true },
      { type: 'range', id: 'animDuration', label: 'Duration', min: 100, max: 1500, step: 50, unit: 'ms', default: 600 },
      { type: 'range', id: 'animDistance', label: 'Travel distance', min: 0, max: 80, step: 4, unit: 'px', default: 22 },
      { type: 'select', id: 'animEasing', label: 'Easing', default: 'ease-out',
        options: [
          { value: 'linear', label: 'Linear' }, { value: 'ease', label: 'Ease' },
          { value: 'ease-out', label: 'Ease out' }, { value: 'ease-in-out', label: 'Ease in-out' },
        ] },
      { type: 'checkbox', id: 'hoverLift', label: 'Lift cards on hover', default: true },
    ],
  },
  {
    id: 'custom', label: 'Custom CSS', icon: 'Code',
    fields: [
      { type: 'paragraph', label: 'Applies to every page of the storefront.' },
      { type: 'textarea', id: 'customCss', label: 'CSS', rows: 14, placeholder: ':root { --x: 1 }' },
    ],
  },
  {
    id: 'embeds', label: 'App embeds & scripts', icon: 'Puzzle',
    fields: [
      { type: 'paragraph', label: 'Premium storefront chrome — preloader, back-to-top, smooth scrolling, Ken Burns hero motion and custom scripts injected on every themed page.' },
      { type: 'checkbox', id: 'preloader', label: 'Preloader animation', default: true },
      { type: 'checkbox', id: 'backToTop', label: 'Back-to-top button', default: true },
      { type: 'checkbox', id: 'smoothScroll', label: 'Smooth scrolling', default: true },
      { type: 'checkbox', id: 'kenBurns', label: 'Ken Burns hero motion', default: true },
      { type: 'checkbox', id: 'grain', label: 'Subtle film grain overlay', default: false },
      { type: 'header', label: 'Custom scripts' },
      { type: 'textarea', id: 'customJs', label: 'JavaScript', rows: 8, placeholder: 'console.log("hello storefront")' },
      { type: 'textarea', id: 'headHtml', label: 'Head HTML', rows: 6, placeholder: '<meta name="theme-color" content="#0D0D0D">' },
      { type: 'textarea', id: 'bodyHtml', label: 'Body HTML (before footer)', rows: 6, placeholder: '<div class="custom-ribbon">Free shipping</div>' },
    ],
  },
  {
    id: 'text', label: 'Theme text', icon: 'Languages',
    fields: [
      { type: 'paragraph', label: 'Rename default storefront strings (the language editor) — used by product and form sections.' },
      { type: 'text', id: 't_addToCart', label: 'Add to cart button', default: 'Add to cart' },
      { type: 'text', id: 't_buyNow', label: 'Buy now button', default: 'Buy now' },
      { type: 'text', id: 't_soldOut', label: 'Sold out', default: 'Sold out' },
      { type: 'text', id: 't_shopNow', label: 'Shop now', default: 'Shop now' },
      { type: 'text', id: 't_viewAll', label: 'View all', default: 'View all' },
      { type: 'text', id: 't_newsletterTitle', label: 'Newsletter title', default: 'Join the list' },
      { type: 'text', id: 't_newsletterPlaceholder', label: 'Newsletter placeholder', default: 'Your email address' },
      { type: 'text', id: 't_added', label: 'Added-to-cart toast', default: 'Added to cart' },
    ],
  },
];

export const themeDefaults = (): SettingsBag =>
  THEME_GROUPS.reduce<SettingsBag>((acc, g) => ({ ...acc, ...defaultsFor(g.fields) }), {});

/** Map theme settings to CSS custom properties for the preview root. */
export function themeToCssVars(t: SettingsBag): Record<string, string> {
  const v = (k: string, fb = '') => (t[k] === undefined || t[k] === '' ? fb : String(t[k]));
  const shadow = { none: 'none', sm: '0 1px 2px rgba(0,0,0,.06)', md: '0 6px 20px rgba(0,0,0,.08)', lg: '0 18px 48px rgba(0,0,0,.12)' } as Record<string, string>;
  return {
    '--t-primary': v('colorPrimary', '#0D0D0D'),
    '--t-accent': v('colorAccent', '#7C8B72'),
    '--t-bg': v('colorBg', '#FBFAF8'),
    '--t-surface': v('colorSurface', '#FFFFFF'),
    '--t-muted': v('colorMuted', '#F1EEE9'),
    '--t-text': v('colorText', '#0D0D0D'),
    '--t-text-muted': v('colorTextMuted', '#6B6B6B'),
    '--t-border': v('colorBorder', '#E4E0DA'),
    '--t-sale': v('colorSale', '#B4453C'),
    '--t-success': v('colorSuccess', '#4F7A52'),
    '--t-font-heading': `"${v('fontHeading', 'Jost')}", "Klein", Helvetica, Arial, sans-serif`,
    '--t-font-body': `"${v('fontBody', 'Jost')}", "Klein", Helvetica, Arial, sans-serif`,
    // Editorial alias — the storefront is a one-family system (LV register).
    '--t-font-editorial': `"${v('fontHeading', 'Jost')}", "Klein", Helvetica, Arial, sans-serif`,
    '--t-heading-scale': String(Number(v('headingScale', '100')) / 100),
    '--t-heading-tracking': `${Number(v('headingTracking', '0')) / 100}em`,
    '--t-heading-weight': v('headingWeight', '500'),
    '--t-body-scale': String(Number(v('bodyScale', '100')) / 100),
    '--t-body-leading': String(Number(v('bodyLeading', '160')) / 100),
    '--t-btn-radius': `${v('btnRadius', '999')}px`,
    '--t-btn-px': `${v('btnPaddingX', '28')}px`,
    '--t-btn-py': `${v('btnPaddingY', '14')}px`,
    '--t-btn-tracking': `${Number(v('btnTracking', '12')) / 100}em`,
    '--t-btn-transform': t.btnUppercase === false ? 'none' : 'uppercase',
    '--t-btn-border': `${v('btnBorderWidth', '1')}px`,
    '--t-card-radius': `${v('cardRadius', '16')}px`,
    '--t-card-shadow': shadow[v('cardShadow', 'none')] || 'none',
    '--t-card-padding': `${v('cardPadding', '0')}px`,
    '--t-input-radius': `${v('inputRadius', '12')}px`,
    '--t-input-height': `${v('inputHeight', '44')}px`,
    '--t-input-border': v('inputBorder', '#E4E0DA'),
    '--t-input-bg': v('inputBg', '#FFFFFF'),
    '--t-page-width': `${v('pageWidth', '1280')}px`,
    '--t-gutter': `${v('gutter', '20')}px`,
    '--t-section-gap': `${v('sectionGap', '0')}px`,
    '--t-radius': `${v('radiusBase', '16')}px`,
    '--t-anim-duration': `${v('animDuration', '600')}ms`,
    '--t-anim-distance': `${v('animDistance', '22')}px`,
    '--t-anim-easing': v('animEasing', 'ease-out'),
  };
}
