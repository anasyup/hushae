import { registerBlock } from '../core/registry';
import type { BlockSchema } from '../core/types';
import { alignment, buttonFields, headerField, typographyFields } from './common';

/* ============================================================================
 * Shared block library.
 * Any section can accept any of these; nesting is unlimited where `accepts` is
 * declared (see `group` and `column`).
 * ========================================================================== */

const B = (s: BlockSchema) => registerBlock(s);

// ── Text primitives ─────────────────────────────────────────────────────────
B({
  type: 'heading', name: 'Heading', icon: 'Heading',
  settings: [
    { type: 'inline_richtext', id: 'text', label: 'Heading', default: 'Your heading' },
    { type: 'select', id: 'tag', label: 'HTML tag', default: 'h2',
      options: ['h1', 'h2', 'h3', 'h4', 'p'].map((v) => ({ value: v, label: v.toUpperCase() })) },
    alignment(),
    headerField('Typography'),
    ...typographyFields(),
  ],
});

B({
  type: 'text', name: 'Text', icon: 'Type',
  settings: [
    { type: 'textarea', id: 'text', label: 'Text', rows: 4, default: 'Share details about your brand.' },
    alignment(),
    { type: 'range', id: 'maxWidth', label: 'Max width', min: 200, max: 1200, step: 20, unit: 'px', default: 620 },
    headerField('Typography'),
    ...typographyFields(),
  ],
});

B({
  type: 'richtext', name: 'Rich text', icon: 'AlignLeft',
  settings: [
    { type: 'richtext', id: 'html', label: 'Content', rows: 8, default: '<p>Tell your story.</p>' },
    alignment(),
    { type: 'range', id: 'maxWidth', label: 'Max width', min: 200, max: 1200, step: 20, unit: 'px', default: 720 },
  ],
});

B({
  type: 'eyebrow', name: 'Eyebrow', icon: 'Minus',
  settings: [
    { type: 'text', id: 'text', label: 'Text', default: 'New in' },
    alignment(),
    { type: 'color', id: 'color', label: 'Colour', default: '' },
    { type: 'range', id: 'tracking', label: 'Letter spacing', min: 0, max: 60, step: 1, unit: '/100em', default: 20 },
  ],
});

B({
  type: 'button', name: 'Button', icon: 'MousePointerClick',
  settings: [...buttonFields()],
});

B({
  type: 'button_row', name: 'Button row', icon: 'Rows3',
  accepts: ['button'], maxBlocks: 4,
  preset: [{ type: 'button' }],
  settings: [
    alignment(),
    { type: 'range', id: 'gap', label: 'Gap', min: 0, max: 48, step: 2, unit: 'px', default: 12 },
  ],
});

B({
  type: 'image', name: 'Image', icon: 'Image',
  settings: [
    { type: 'image_picker', id: 'src', label: 'Image' },
    { type: 'text', id: 'alt', label: 'Alt text' },
    { type: 'url', id: 'href', label: 'Link (optional)' },
    { type: 'select', id: 'ratio', label: 'Aspect ratio', default: 'auto',
      options: [
        { value: 'auto', label: 'Original' }, { value: '1/1', label: 'Square' },
        { value: '4/5', label: 'Portrait 4:5' }, { value: '3/4', label: 'Portrait 3:4' },
        { value: '16/9', label: 'Landscape 16:9' }, { value: '21/9', label: 'Cinematic' },
      ] },
    { type: 'range', id: 'radius', label: 'Corner radius', min: 0, max: 64, step: 2, unit: 'px', default: 16 },
    { type: 'range', id: 'maxWidth', label: 'Max width', min: 80, max: 1400, step: 20, unit: 'px', default: 1400 },
  ],
});

B({
  type: 'video', name: 'Video', icon: 'Video',
  settings: [
    { type: 'video_picker', id: 'src', label: 'Video file' },
    { type: 'image_picker', id: 'poster', label: 'Poster image' },
    { type: 'checkbox', id: 'autoplay', label: 'Autoplay', default: true },
    { type: 'checkbox', id: 'loop', label: 'Loop', default: true },
    { type: 'checkbox', id: 'muted', label: 'Muted', default: true },
    { type: 'checkbox', id: 'controls', label: 'Show controls', default: false },
    { type: 'range', id: 'radius', label: 'Corner radius', min: 0, max: 64, step: 2, unit: 'px', default: 16 },
  ],
});

B({
  type: 'icon', name: 'Icon', icon: 'Star',
  settings: [
    { type: 'icon_picker', id: 'name', label: 'Icon', default: 'Star' },
    { type: 'range', id: 'size', label: 'Size', min: 12, max: 96, step: 2, unit: 'px', default: 24 },
    { type: 'color', id: 'color', label: 'Colour', default: '' },
    alignment(),
  ],
});

B({
  type: 'spacer', name: 'Spacer', icon: 'MoveVertical',
  settings: [{ type: 'range', id: 'height', label: 'Height', min: 4, max: 200, step: 4, unit: 'px', default: 32 }],
});

B({
  type: 'divider_block', name: 'Divider', icon: 'Minus',
  settings: [
    { type: 'color', id: 'color', label: 'Colour', default: '' },
    { type: 'range', id: 'thickness', label: 'Thickness', min: 1, max: 8, step: 1, unit: 'px', default: 1 },
    { type: 'range', id: 'width', label: 'Width', min: 10, max: 100, step: 5, unit: '%', default: 100 },
  ],
});

B({
  type: 'html', name: 'Custom HTML', icon: 'Code',
  settings: [{ type: 'html', id: 'code', label: 'HTML', rows: 8, default: '<div></div>' }],
});

B({
  type: 'liquid', name: 'Custom Liquid', icon: 'Braces',
  settings: [{ type: 'liquid', id: 'code', label: 'Liquid', rows: 8, default: '' }],
});

// ── Layout containers (unlimited nesting) ───────────────────────────────────
B({
  type: 'group', name: 'Group', icon: 'Group',
  accepts: ['heading', 'text', 'richtext', 'eyebrow', 'button', 'button_row', 'image', 'video', 'icon', 'spacer', 'divider_block', 'group', 'column', 'html'],
  settings: [
    { type: 'segment', id: 'direction', label: 'Direction', default: 'column',
      options: [{ value: 'column', label: 'Stack' }, { value: 'row', label: 'Row' }] },
    { type: 'range', id: 'gap', label: 'Gap', min: 0, max: 64, step: 2, unit: 'px', default: 12 },
    alignment('align', 'Align items', 'left'),
    { type: 'color_background', id: 'background', label: 'Background', default: '' },
    { type: 'range', id: 'padding', label: 'Padding', min: 0, max: 80, step: 4, unit: 'px', default: 0 },
    { type: 'range', id: 'radius', label: 'Corner radius', min: 0, max: 48, step: 2, unit: 'px', default: 0 },
  ],
});

B({
  type: 'column', name: 'Column', icon: 'Columns2',
  accepts: ['heading', 'text', 'richtext', 'eyebrow', 'button', 'button_row', 'image', 'video', 'icon', 'spacer', 'divider_block', 'group'],
  settings: [
    { type: 'range', id: 'span', label: 'Width', min: 1, max: 12, step: 1, unit: '/12', default: 6 },
    { type: 'range', id: 'gap', label: 'Gap', min: 0, max: 48, step: 2, unit: 'px', default: 12 },
    alignment('align', 'Align', 'left'),
  ],
});

// ── Product-card sub-blocks ─────────────────────────────────────────────────
B({
  type: 'card_media', name: 'Media', icon: 'Image',
  settings: [
    { type: 'select', id: 'ratio', label: 'Aspect ratio', default: '4/5',
      options: [
        { value: '1/1', label: 'Square' }, { value: '4/5', label: 'Portrait 4:5' },
        { value: '3/4', label: 'Portrait 3:4' }, { value: '16/9', label: 'Landscape' },
      ] },
    { type: 'checkbox', id: 'hoverSwap', label: 'Swap to 2nd image on hover', default: false },
    { type: 'range', id: 'radius', label: 'Corner radius', min: 0, max: 48, step: 2, unit: 'px', default: 16 },
    { type: 'select', id: 'fit', label: 'Image fit', default: 'cover',
      options: [{ value: 'cover', label: 'Crop' }, { value: 'contain', label: 'Contain' }] },
  ],
});
B({
  type: 'card_title', name: 'Product title', icon: 'Type',
  settings: [
    { type: 'range', id: 'size', label: 'Size', min: 10, max: 28, step: 1, unit: 'px', default: 14 },
    { type: 'range', id: 'lines', label: 'Max lines', min: 1, max: 3, step: 1, default: 2 },
    { type: 'color', id: 'color', label: 'Colour', default: '' },
  ],
});
B({
  type: 'card_vendor', name: 'Vendor', icon: 'Store',
  settings: [{ type: 'range', id: 'size', label: 'Size', min: 8, max: 18, step: 1, unit: 'px', default: 11 }],
});
B({
  type: 'card_price', name: 'Price', icon: 'Tag',
  settings: [
    { type: 'checkbox', id: 'showCompare', label: 'Show compare-at price', default: true },
    { type: 'range', id: 'size', label: 'Size', min: 10, max: 28, step: 1, unit: 'px', default: 14 },
    { type: 'color', id: 'saleColor', label: 'Sale price colour', default: '' },
  ],
});
B({
  type: 'card_rating', name: 'Rating', icon: 'Star',
  settings: [{ type: 'checkbox', id: 'showCount', label: 'Show review count', default: true }],
});
B({
  type: 'card_badge', name: 'Sale badge', icon: 'BadgePercent',
  settings: [
    { type: 'text', id: 'text', label: 'Text', default: 'Save {percent}%', info: '{percent} is replaced automatically.' },
    { type: 'segment', id: 'position', label: 'Position', default: 'top-left',
      options: [{ value: 'top-left', label: 'TL' }, { value: 'top-right', label: 'TR' }] },
    { type: 'color', id: 'bg', label: 'Background', default: '' },
    { type: 'color', id: 'fg', label: 'Text colour', default: '' },
  ],
});
B({
  type: 'card_inventory', name: 'Inventory', icon: 'PackageSearch',
  settings: [{ type: 'range', id: 'threshold', label: 'Low-stock threshold', min: 1, max: 50, step: 1, default: 5 }],
});
B({
  type: 'card_quick_add', name: 'Quick add', icon: 'Plus',
  settings: [
    { type: 'text', id: 'label', label: 'Label', default: 'Quick Add' },
    { type: 'checkbox', id: 'showOnHover', label: 'Reveal on hover', default: true },
  ],
});
B({ type: 'card_wishlist', name: 'Wishlist', icon: 'Heart', settings: [] });
B({
  type: 'card_swatches', name: 'Colour swatches', icon: 'Palette',
  settings: [{ type: 'range', id: 'max', label: 'Max swatches', min: 2, max: 10, step: 1, default: 5 }],
});

// ── Product card container ──────────────────────────────────────────────────
B({
  type: 'product_card', name: 'Product card', icon: 'LayoutGrid',
  accepts: ['card_media', 'card_badge', 'card_wishlist', 'card_quick_add', 'card_vendor', 'card_title', 'card_rating', 'card_price', 'card_inventory', 'card_swatches'],
  preset: [{ type: 'card_media' }, { type: 'card_title' }, { type: 'card_price' }],
  settings: [
    alignment('align', 'Text alignment', 'left'),
    { type: 'color_background', id: 'background', label: 'Card background', default: '' },
    { type: 'range', id: 'padding', label: 'Card padding', min: 0, max: 32, step: 2, unit: 'px', default: 0 },
    { type: 'range', id: 'radius', label: 'Card radius', min: 0, max: 40, step: 2, unit: 'px', default: 0 },
    { type: 'checkbox', id: 'border', label: 'Show border', default: false },
    { type: 'select', id: 'shadow', label: 'Shadow', default: 'none',
      options: [{ value: 'none', label: 'None' }, { value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }] },
  ],
});

// ── Section-header block (title + view-all) ─────────────────────────────────
B({ type: 'sh_title', name: 'Collection title', icon: 'Heading', settings: [
  { type: 'text', id: 'text', label: 'Title', default: 'Featured collection' },
  { type: 'range', id: 'size', label: 'Size', min: 14, max: 72, step: 1, unit: 'px', default: 30 },
  { type: 'select', id: 'font', label: 'Font', default: 'display',
    options: [
      { value: 'display', label: 'Display (heading)' },
      { value: 'sans', label: 'Body (sans)' },
      { value: 'editorial', label: 'Editorial (serif)' },
    ] },
] });
B({ type: 'sh_view_all', name: 'View all button', icon: 'ArrowRight', settings: [
  { type: 'text', id: 'label', label: 'Label', default: 'View all' },
  { type: 'url', id: 'href', label: 'Link', default: '/shop' },
  { type: 'button_group', id: 'style', label: 'Style', default: 'text',
    options: [{ value: 'text', label: 'Text' }, { value: 'outline', label: 'Outline' }, { value: 'solid', label: 'Solid' }] },
] });
B({
  type: 'section_header', name: 'Header', icon: 'PanelTop',
  accepts: ['sh_title', 'sh_view_all', 'eyebrow', 'text'],
  preset: [{ type: 'sh_title' }, { type: 'sh_view_all' }],
  settings: [
    alignment('align', 'Alignment', 'left'),
    { type: 'checkbox', id: 'inline', label: 'Title and button on one line', default: true },
    { type: 'range', id: 'gap', label: 'Bottom gap', min: 0, max: 64, step: 2, unit: 'px', default: 24 },
  ],
});

// ── Misc content blocks ─────────────────────────────────────────────────────
B({
  type: 'slide', name: 'Slide', icon: 'Images',
  accepts: ['heading', 'text', 'eyebrow', 'button', 'button_row'],
  preset: [{ type: 'heading' }, { type: 'button' }],
  settings: [
    headerField('Media'),
    { type: 'image_picker', id: 'image', label: 'Image (desktop)' },
    { type: 'image_picker', id: 'mobileImage', label: 'Image (mobile)', info: 'Optional — falls back to the desktop image.' },
    { type: 'video_picker', id: 'video', label: 'Video', info: 'Plays muted and looped, overrides the image.' },
    { type: 'image_picker', id: 'poster', label: 'Video poster', visibleIf: (s) => !!s.video },
    { type: 'select', id: 'fit', label: 'Media fit', default: 'cover',
      options: [{ value: 'cover', label: 'Crop to fill' }, { value: 'contain', label: 'Fit inside' }] },
    { type: 'select', id: 'focal', label: 'Focal point', default: 'center',
      options: [
        { value: 'top', label: 'Top' }, { value: 'center', label: 'Centre' }, { value: 'bottom', label: 'Bottom' },
        { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' },
      ] },
    headerField('Overlay'),
    { type: 'range', id: 'overlay', label: 'Overlay strength', min: 0, max: 90, step: 5, unit: '%', default: 30 },
    { type: 'color', id: 'overlayColor', label: 'Overlay colour', default: '#0D0D0D' },
    headerField('Content'),
    { type: 'select', id: 'position', label: 'Content position', default: 'bottom-left',
      options: [
        { value: 'top-left', label: 'Top left' }, { value: 'top-center', label: 'Top centre' }, { value: 'top-right', label: 'Top right' },
        { value: 'center-left', label: 'Middle left' }, { value: 'center', label: 'Centre' }, { value: 'center-right', label: 'Middle right' },
        { value: 'bottom-left', label: 'Bottom left' }, { value: 'bottom-center', label: 'Bottom centre' }, { value: 'bottom-right', label: 'Bottom right' },
      ] },
    { type: 'range', id: 'contentWidth', label: 'Content max width', min: 260, max: 1100, step: 20, unit: 'px', default: 640 },
    { type: 'color', id: 'textColor', label: 'Text colour', default: '#F7F5F1' },
    { type: 'url', id: 'href', label: 'Make whole slide clickable', placeholder: '/collection' },
  ],
});

B({
  type: 'testimonial', name: 'Testimonial', icon: 'Quote',
  settings: [
    { type: 'textarea', id: 'quote', label: 'Quote', rows: 3, default: 'Genuinely the most comfortable pieces I own.' },
    { type: 'text', id: 'author', label: 'Author', default: 'Ayesha K.' },
    { type: 'text', id: 'meta', label: 'Meta', default: 'Lahore · Verified buyer' },
    { type: 'range', id: 'rating', label: 'Rating', min: 0, max: 5, step: 1, default: 5 },
    { type: 'image_picker', id: 'avatar', label: 'Avatar' },
  ],
});

B({
  type: 'faq_item', name: 'FAQ item', icon: 'CircleHelp',
  settings: [
    { type: 'text', id: 'q', label: 'Question', default: 'How long does delivery take?' },
    { type: 'textarea', id: 'a', label: 'Answer', rows: 4, default: '2–4 working days nationwide.' },
    { type: 'checkbox', id: 'open', label: 'Open by default', default: false },
  ],
});

B({
  type: 'tab', name: 'Tab', icon: 'PanelTopOpen',
  accepts: ['heading', 'text', 'richtext', 'image', 'button'],
  preset: [{ type: 'text' }],
  settings: [{ type: 'text', id: 'label', label: 'Tab label', default: 'Tab' }],
});

B({
  type: 'icon_item', name: 'Icon item', icon: 'Sparkles',
  settings: [
    { type: 'icon_picker', id: 'icon', label: 'Icon', default: 'Truck' },
    { type: 'text', id: 'title', label: 'Title', default: 'Free shipping' },
    { type: 'text', id: 'text', label: 'Text', default: 'On orders over PKR 4,999' },
  ],
});

B({
  type: 'timeline_item', name: 'Timeline step', icon: 'GitCommitHorizontal',
  settings: [
    { type: 'text', id: 'year', label: 'Label', default: '2024' },
    { type: 'text', id: 'title', label: 'Title', default: 'Founded' },
    { type: 'textarea', id: 'text', label: 'Text', rows: 3, default: 'The first HUSHAE collection ships.' },
  ],
});

B({
  type: 'menu_item', name: 'Menu link', icon: 'Link',
  accepts: ['menu_item', 'menu_column', 'menu_promo'],
  settings: [
    { type: 'text', id: 'label', label: 'Label', default: 'Link' },
    { type: 'url', id: 'href', label: 'Link', default: '/' },
    { type: 'select', id: 'dropdown', label: 'Dropdown', default: '',
      options: [
        { value: '', label: 'None' },
        { value: 'women', label: 'Auto — Women categories' },
        { value: 'men', label: 'Auto — Men categories' },
        { value: 'children', label: 'Simple list (child links)' },
        { value: 'mega', label: 'Mega menu (columns + promo)' },
      ] },
    { type: 'range', id: 'megaColumns', label: 'Mega menu columns', min: 2, max: 5, step: 1, default: 4,
      visibleIf: (s) => s.dropdown === 'mega' },
    { type: 'checkbox', id: 'highlight', label: 'Accent colour', default: false },
    { type: 'icon_picker', id: 'icon', label: 'Icon (optional)', default: '' },
    { type: 'checkbox', id: 'newTab', label: 'Open in new tab', default: false },
  ],
});

B({
  type: 'menu_column', name: 'Mega menu column', icon: 'List',
  accepts: ['menu_item'],
  preset: [{ type: 'menu_item' }],
  settings: [
    { type: 'text', id: 'title', label: 'Column title', default: 'Shop' },
    { type: 'url', id: 'titleHref', label: 'Title link (optional)' },
  ],
});

B({
  type: 'menu_promo', name: 'Mega menu promo', icon: 'ImageIcon',
  settings: [
    { type: 'image_picker', id: 'image', label: 'Image' },
    { type: 'text', id: 'title', label: 'Title', default: 'New season' },
    { type: 'text', id: 'text', label: 'Text', default: 'Discover the latest edit' },
    { type: 'text', id: 'ctaLabel', label: 'Button label', default: 'Shop now' },
    { type: 'url', id: 'href', label: 'Link', default: '/new' },
  ],
});

B({
  type: 'footer_column', name: 'Link column', icon: 'List',
  accepts: ['menu_item'],
  preset: [{ type: 'menu_item' }],
  settings: [{ type: 'text', id: 'title', label: 'Column title', default: 'Shop' }],
});

B({
  type: 'countdown', name: 'Countdown', icon: 'Timer',
  settings: [
    { type: 'text', id: 'until', label: 'End date/time (ISO)', placeholder: '2026-12-31T23:59', default: '' },
    { type: 'text', id: 'expiredText', label: 'Text when finished', default: 'Offer ended' },
    { type: 'checkbox', id: 'showLabels', label: 'Show unit labels', default: true },
    { type: 'range', id: 'size', label: 'Digit size', min: 14, max: 72, step: 2, unit: 'px', default: 28 },
  ],
});
