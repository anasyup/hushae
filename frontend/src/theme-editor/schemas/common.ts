import type { Field } from '../core/types';

/* ============================================================================
 * Reusable schema fragments.
 * Keeps every section consistent and cuts the schema files down dramatically.
 * ========================================================================== */

export const headerField = (label: string): Field => ({ type: 'header', label });
export const divider = (): Field => ({ type: 'divider' });
export const note = (label: string): Field => ({ type: 'paragraph', label });

export const ALIGN_OPTIONS = [
  { value: 'left', label: 'Left', icon: 'AlignLeft' },
  { value: 'center', label: 'Center', icon: 'AlignCenter' },
  { value: 'right', label: 'Right', icon: 'AlignRight' },
];

export const alignment = (id = 'align', label = 'Alignment', def = 'left'): Field => ({
  type: 'alignment', id, label, default: def, options: ALIGN_OPTIONS,
});

export const colorScheme = (): Field => ({
  type: 'color_scheme',
  id: 'colorScheme',
  label: 'Colour scheme',
  default: 'inherit',
  options: [
    { value: 'inherit', label: 'Inherit' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'accent', label: 'Accent' },
    { value: 'custom', label: 'Custom' },
  ],
});

/** Padding / margin / width / background — the block every section shares. */
export const layoutFields = (opts: { padTop?: number; padBottom?: number } = {}): Field[] => [
  headerField('Section layout'),
  {
    type: 'segment', id: 'width', label: 'Width', default: 'page',
    options: [
      { value: 'page', label: 'Page' },
      { value: 'wide', label: 'Wide' },
      { value: 'full', label: 'Full' },
    ],
  },
  colorScheme(),
  {
    type: 'color_background', id: 'background', label: 'Background',
    default: '', info: 'Leave empty to inherit the colour scheme.',
    visibleIf: (s) => s.colorScheme === 'custom' || !s.colorScheme || s.colorScheme === 'inherit',
  },
  { type: 'color', id: 'textColor', label: 'Text colour', default: '', visibleIf: (s) => s.colorScheme === 'custom' },
  { type: 'range', id: 'paddingTop', label: 'Padding top', min: 0, max: 200, step: 4, unit: 'px', default: opts.padTop ?? 48 },
  { type: 'range', id: 'paddingBottom', label: 'Padding bottom', min: 0, max: 200, step: 4, unit: 'px', default: opts.padBottom ?? 48 },
  { type: 'range', id: 'marginTop', label: 'Margin top', min: -80, max: 160, step: 4, unit: 'px', default: 0 },
  { type: 'range', id: 'marginBottom', label: 'Margin bottom', min: -80, max: 160, step: 4, unit: 'px', default: 0 },
  { type: 'range', id: 'radius', label: 'Corner radius', min: 0, max: 64, step: 2, unit: 'px', default: 0 },
];

/** Animation + visibility + custom CSS — appended to every section. */
export const advancedFields = (): Field[] => [
  headerField('Animation'),
  {
    type: 'select', id: 'animation', label: 'On scroll', default: 'fade-up',
    options: [
      { value: 'none', label: 'None' },
      { value: 'fade', label: 'Fade in' },
      { value: 'fade-up', label: 'Fade up' },
      { value: 'fade-down', label: 'Fade down' },
      { value: 'zoom', label: 'Zoom in' },
      { value: 'slide-left', label: 'Slide from left' },
      { value: 'slide-right', label: 'Slide from right' },
    ],
  },
  { type: 'range', id: 'animDelay', label: 'Delay', min: 0, max: 1000, step: 50, unit: 'ms', default: 0, visibleIf: (s) => s.animation !== 'none' },

  headerField('Visibility'),
  { type: 'checkbox', id: 'hideDesktop', label: 'Hide on desktop', default: false },
  { type: 'checkbox', id: 'hideTablet', label: 'Hide on tablet', default: false },
  { type: 'checkbox', id: 'hideMobile', label: 'Hide on mobile', default: false },

  headerField('Advanced'),
  { type: 'text', id: 'anchorId', label: 'Anchor ID', placeholder: 'my-section', info: 'Link to this section with #my-section' },
  { type: 'text', id: 'cssClass', label: 'Custom CSS class' },
  { type: 'textarea', id: 'customCss', label: 'Custom CSS', rows: 5, placeholder: '.selector { color: red; }', info: 'Scoped to this section.' },
];

/** Typography controls for a text-ish block. */
export const typographyFields = (prefix = ''): Field[] => {
  const k = (s: string) => (prefix ? `${prefix}${s[0].toUpperCase()}${s.slice(1)}` : s);
  return [
    {
      type: 'select', id: k('font'), label: 'Font', default: 'display',
      options: [
        { value: 'display', label: 'Display (heading)' },
        { value: 'sans', label: 'Body (sans)' },
        { value: 'mono', label: 'Mono' },
      ],
    },
    { type: 'range', id: k('size'), label: 'Size', min: 10, max: 120, step: 1, unit: 'px', default: 32 },
    {
      type: 'select', id: k('weight'), label: 'Weight', default: '400',
      options: [
        { value: '300', label: 'Light' }, { value: '400', label: 'Regular' },
        { value: '500', label: 'Medium' }, { value: '600', label: 'Semibold' },
        { value: '700', label: 'Bold' },
      ],
    },
    { type: 'range', id: k('tracking'), label: 'Letter spacing', min: -5, max: 60, step: 1, unit: '/100em', default: 0 },
    { type: 'range', id: k('leading'), label: 'Line height', min: 80, max: 220, step: 5, unit: '%', default: 120 },
    {
      type: 'select', id: k('transform'), label: 'Text case', default: 'none',
      options: [
        { value: 'none', label: 'Normal' }, { value: 'uppercase', label: 'UPPERCASE' },
        { value: 'lowercase', label: 'lowercase' }, { value: 'capitalize', label: 'Capitalize' },
      ],
    },
    { type: 'color', id: k('color'), label: 'Colour', default: '' },
  ];
};

/** Button styling shared by CTA blocks. */
export const buttonFields = (): Field[] => [
  { type: 'text', id: 'label', label: 'Label', default: 'Shop now' },
  { type: 'url', id: 'href', label: 'Link', default: '/shop' },
  {
    type: 'button_group', id: 'style', label: 'Style', default: 'solid',
    options: [
      { value: 'solid', label: 'Solid' },
      { value: 'outline', label: 'Outline' },
      { value: 'text', label: 'Text' },
    ],
  },
  {
    type: 'segment', id: 'size', label: 'Size', default: 'md',
    options: [{ value: 'sm', label: 'S' }, { value: 'md', label: 'M' }, { value: 'lg', label: 'L' }],
  },
  { type: 'checkbox', id: 'fullWidth', label: 'Full width', default: false },
  { type: 'color', id: 'bg', label: 'Background', default: '' },
  { type: 'color', id: 'fg', label: 'Text colour', default: '' },
  { type: 'range', id: 'radius', label: 'Corner radius', min: 0, max: 40, step: 1, unit: 'px', default: 999 },
  { type: 'checkbox', id: 'newTab', label: 'Open in new tab', default: false },
];
