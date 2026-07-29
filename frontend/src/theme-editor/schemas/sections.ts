import './blocks';
import { registerSection } from '../core/registry';
import type { SectionSchema } from '../core/types';
import { advancedFields, alignment, headerField, layoutFields, note } from './common';

/* ============================================================================
 * Section library.
 * Adding a section = one entry here. The sidebar, add-section browser,
 * inspector and renderer all pick it up automatically.
 * ========================================================================== */

const S = (s: SectionSchema) => registerSection(s);

const PRODUCT_SOURCE = [
  { type: 'select' as const, id: 'source', label: 'Products from', default: 'featured',
    options: [
      { value: 'featured', label: 'Featured products' },
      { value: 'bestSeller', label: 'Best sellers' },
      { value: 'sale', label: 'On sale' },
      { value: 'newest', label: 'Newest arrivals' },
      { value: 'trending', label: 'Trending (30 days)' },
      { value: 'collection', label: 'Specific collection' },
      { value: 'manual', label: 'Hand-picked' },
    ] },
  { type: 'collection' as const, id: 'collection', label: 'Collection', visibleIf: (s: any) => s.source === 'collection' },
  { type: 'product_list' as const, id: 'products', label: 'Products', visibleIf: (s: any) => s.source === 'manual' },
  { type: 'select' as const, id: 'gender', label: 'Audience', default: '',
    options: [{ value: '', label: 'Everyone' }, { value: 'women', label: 'Women' }, { value: 'men', label: 'Men' }] },
  { type: 'select' as const, id: 'sort', label: 'Sort by', default: 'newest',
    visibleIf: (s: any) => s.source !== 'trending' && s.source !== 'manual',
    options: [
      { value: 'newest', label: 'Newest' }, { value: 'popular', label: 'Most popular' },
      { value: 'price-asc', label: 'Price: low to high' }, { value: 'price-desc', label: 'Price: high to low' },
    ] },
];

const GRID_FIELDS = [
  headerField('Grid'),
  { type: 'range' as const, id: 'count', label: 'Products shown', min: 2, max: 24, step: 1, default: 8 },
  { type: 'range' as const, id: 'columns', label: 'Columns (desktop)', min: 2, max: 6, step: 1, default: 4 },
  { type: 'segment' as const, id: 'mobileColumns', label: 'Columns (mobile)', default: 2,
    options: [{ value: 1, label: '1' }, { value: 2, label: '2' }] },
  { type: 'segment' as const, id: 'layout', label: 'Layout', default: 'grid',
    options: [{ value: 'grid', label: 'Grid' }, { value: 'carousel', label: 'Carousel' }] },
  { type: 'checkbox' as const, id: 'carouselMobile', label: 'Carousel on mobile', default: false,
    visibleIf: (s: any) => s.layout !== 'carousel' },
  { type: 'range' as const, id: 'gapX', label: 'Horizontal gap', min: 0, max: 48, step: 2, unit: 'px', default: 12 },
  { type: 'range' as const, id: 'gapY', label: 'Vertical gap', min: 0, max: 64, step: 2, unit: 'px', default: 28 },
];

// ══ HEADER GROUP ════════════════════════════════════════════════════════════
S({
  type: 'announcement_bar', name: 'Announcement bar', icon: 'Megaphone',
  category: 'Header', groups: ['header'], locked: true, maxBlocks: 6,
  blocks: [{
    type: 'announcement', name: 'Announcement', icon: 'Megaphone',
    settings: [
      { type: 'inline_richtext', id: 'text', label: 'Message', default: 'Season sale — up to 40% off' },
      { type: 'text', id: 'ctaLabel', label: 'Button label', default: 'Shop the sale' },
      { type: 'url', id: 'ctaHref', label: 'Button link', default: '/sale' },
    ],
  }],
  preset: [{ type: 'announcement' }],
  settings: [
    { type: 'checkbox', id: 'enabled', label: 'Show bar', default: true },
    { type: 'checkbox', id: 'autoRotate', label: 'Auto-rotate messages', default: true },
    { type: 'range', id: 'speed', label: 'Rotate every', min: 2, max: 15, step: 1, unit: 's', default: 5 },
    { type: 'color_background', id: 'background', label: 'Background', default: '#0D0D0D' },
    { type: 'color', id: 'textColor', label: 'Text colour', default: '#F7F5F1' },
    { type: 'range', id: 'height', label: 'Height', min: 24, max: 72, step: 2, unit: 'px', default: 38 },
    { type: 'checkbox', id: 'dismissible', label: 'Allow dismiss', default: false },
  ],
});

S({
  type: 'header', name: 'Header', icon: 'Layout',
  category: 'Header', groups: ['header'], locked: true,
  blocks: [
    {
      type: 'logo', name: 'Logo', icon: 'ImageIcon',
      settings: [
        { type: 'segment', id: 'kind', label: 'Type', default: 'text',
          options: [{ value: 'text', label: 'Text' }, { value: 'image', label: 'Image' }] },
        { type: 'image_picker', id: 'image', label: 'Logo image', visibleIf: (s) => s.kind === 'image' },
        { type: 'range', id: 'width', label: 'Width', min: 40, max: 320, step: 5, unit: 'px', default: 130, visibleIf: (s) => s.kind === 'image' },
        { type: 'text', id: 'text', label: 'Logo text', default: 'HUSHAE', visibleIf: (s) => s.kind !== 'image' },
        { type: 'checkbox', id: 'boxed', label: 'Outlined box', default: true, visibleIf: (s) => s.kind !== 'image' },
        { type: 'range', id: 'tracking', label: 'Letter spacing', min: 0, max: 60, step: 1, unit: '/100em', default: 32, visibleIf: (s) => s.kind !== 'image' },
        { type: 'range', id: 'size', label: 'Font size', min: 12, max: 48, step: 1, unit: 'px', default: 20, visibleIf: (s) => s.kind !== 'image' },
      ],
    },
    {
      type: 'menu', name: 'Menu', icon: 'List', accepts: ['menu_item'],
      preset: [
        { type: 'menu_item', settings: { label: 'Women', href: '/women', dropdown: 'women' } },
        { type: 'menu_item', settings: { label: 'Men', href: '/men', dropdown: 'men' } },
        { type: 'menu_item', settings: { label: 'New Arrivals', href: '/new' } },
        { type: 'menu_item', settings: { label: 'Best Sellers', href: '/best' } },
        { type: 'menu_item', settings: { label: 'Sale', href: '/sale', highlight: true } },
      ],
      settings: [
        { type: 'range', id: 'gap', label: 'Link spacing', min: 8, max: 64, step: 2, unit: 'px', default: 34 },
        { type: 'range', id: 'size', label: 'Font size', min: 9, max: 18, step: 1, unit: 'px', default: 13 },
        { type: 'checkbox', id: 'uppercase', label: 'Uppercase', default: false },
      ],
    },
    {
      type: 'header_icons', name: 'Icons', icon: 'MousePointerClick',
      settings: [
        { type: 'checkbox', id: 'search', label: 'Search', default: true },
        { type: 'checkbox', id: 'wishlist', label: 'Wishlist', default: true },
        { type: 'checkbox', id: 'account', label: 'Account', default: true },
        { type: 'checkbox', id: 'cart', label: 'Cart', default: true },
      ],
    },
  ],
  preset: [{ type: 'logo' }, { type: 'menu' }, { type: 'header_icons' }],
  settings: [
    { type: 'select', id: 'layout', label: 'Layout', default: 'logo-left',
      options: [
        { value: 'logo-left', label: 'Logo left, menu centre' },
        { value: 'logo-center', label: 'Logo centre, menu below' },
        { value: 'menu-left', label: 'Menu left, logo centre' },
      ] },
    { type: 'segment', id: 'width', label: 'Bar width', default: 'full',
      options: [{ value: 'full', label: 'Edge to edge' }, { value: 'page', label: 'Boxed' }] },
    { type: 'checkbox', id: 'sticky', label: 'Sticky on scroll', default: true },
    { type: 'checkbox', id: 'transparentOnHero', label: 'Transparent over hero', default: true },
    { type: 'range', id: 'height', label: 'Height', min: 48, max: 120, step: 2, unit: 'px', default: 80 },
    { type: 'color_background', id: 'background', label: 'Background', default: '' },
    { type: 'color', id: 'textColor', label: 'Text colour', default: '' },
    { type: 'checkbox', id: 'border', label: 'Bottom border', default: true },
  ],
});

// ══ TEMPLATE SECTIONS ═══════════════════════════════════════════════════════
S({
  type: 'hero', name: 'Hero', icon: 'Sparkles', category: 'Banners',
  description: 'Full-bleed image or video banner with overlaid content.',
  blocks: [], maxBlocks: 8,
  preset: [
    { type: 'eyebrow', settings: { text: 'Premium innerwear · Made in Pakistan' } },
    { type: 'heading', settings: { text: 'Second Skin,\nFirst Choice.', tag: 'h1', size: 72 } },
    { type: 'button_row' },
  ],
  settings: [
    headerField('Media'),
    { type: 'image_picker', id: 'image', label: 'Background image' },
    { type: 'image_picker', id: 'mobileImage', label: 'Mobile image (optional)' },
    { type: 'video_picker', id: 'video', label: 'Background video' },
    { type: 'range', id: 'overlay', label: 'Overlay strength', min: 0, max: 95, step: 5, unit: '%', default: 45 },
    { type: 'color', id: 'overlayColor', label: 'Overlay colour', default: '#0D0D0D' },
    headerField('Size & position'),
    { type: 'select', id: 'height', label: 'Height', default: 'screen',
      options: [
        { value: 'screen', label: 'Full screen' }, { value: 'lg', label: 'Large' },
        { value: 'md', label: 'Medium' }, { value: 'sm', label: 'Small' }, { value: 'custom', label: 'Custom' },
      ] },
    { type: 'range', id: 'customHeight', label: 'Custom height', min: 200, max: 1200, step: 20, unit: 'px', default: 640, visibleIf: (s) => s.height === 'custom' },
    { type: 'select', id: 'position', label: 'Content position', default: 'bottom-left',
      options: [
        { value: 'top-left', label: 'Top left' }, { value: 'top-center', label: 'Top centre' },
        { value: 'center', label: 'Centre' }, { value: 'bottom-left', label: 'Bottom left' },
        { value: 'bottom-center', label: 'Bottom centre' }, { value: 'bottom-right', label: 'Bottom right' },
      ] },
    { type: 'range', id: 'contentWidth', label: 'Content max width', min: 300, max: 1200, step: 20, unit: 'px', default: 720 },
    ...layoutFields({ padTop: 0, padBottom: 0 }),
    ...advancedFields(),
  ],
});

S({
  type: 'featured_collection', name: 'Featured collection', icon: 'LayoutGrid', category: 'Products',
  description: 'A configurable grid or carousel of products with an editable card.',
  preset: [{ type: 'section_header' }, { type: 'product_card' }],
  blocks: [],
  settings: [
    headerField('Source'), ...PRODUCT_SOURCE,
    ...GRID_FIELDS,
    ...layoutFields(),
    ...advancedFields(),
  ],
});

S({
  type: 'product_grid', name: 'Product grid', icon: 'Grid3x3', category: 'Products',
  description: 'Dense grid, ideal for a full catalogue row.',
  preset: [{ type: 'section_header', settings: { inline: true } }, { type: 'product_card' }],
  settings: [headerField('Source'), ...PRODUCT_SOURCE, ...GRID_FIELDS, ...layoutFields(), ...advancedFields()],
});

S({
  type: 'featured_product', name: 'Featured product', icon: 'Package', category: 'Products',
  preset: [{ type: 'heading', settings: { text: 'Product of the week' } }],
  settings: [
    { type: 'product', id: 'product', label: 'Product' },
    { type: 'checkbox', id: 'showGallery', label: 'Show gallery', default: true },
    { type: 'checkbox', id: 'showVariants', label: 'Show variant picker', default: true },
    { type: 'checkbox', id: 'showQuantity', label: 'Show quantity', default: true },
    { type: 'segment', id: 'mediaSide', label: 'Media side', default: 'left',
      options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
    ...layoutFields(), ...advancedFields(),
  ],
});

S({
  type: 'collection_list', name: 'Collection list', icon: 'Library', category: 'Products',
  preset: [{ type: 'section_header', settings: {} }],
  settings: [
    { type: 'collection_list', id: 'collections', label: 'Collections' },
    { type: 'range', id: 'columns', label: 'Columns', min: 2, max: 6, step: 1, default: 3 },
    { type: 'select', id: 'ratio', label: 'Image ratio', default: '4/5',
      options: [{ value: '1/1', label: 'Square' }, { value: '4/5', label: 'Portrait' }, { value: '16/9', label: 'Landscape' }] },
    { type: 'checkbox', id: 'overlayTitle', label: 'Title over image', default: true },
    ...layoutFields(), ...advancedFields(),
  ],
});

S({
  type: 'image_banner', name: 'Image banner', icon: 'Image', category: 'Banners',
  preset: [{ type: 'heading' }, { type: 'text' }, { type: 'button' }],
  settings: [
    { type: 'image_picker', id: 'image', label: 'Image' },
    { type: 'range', id: 'overlay', label: 'Overlay', min: 0, max: 90, step: 5, unit: '%', default: 25 },
    { type: 'select', id: 'height', label: 'Height', default: 'md',
      options: [{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }] },
    { type: 'segment', id: 'imageSide', label: 'Layout', default: 'full',
      options: [{ value: 'full', label: 'Overlay' }, { value: 'left', label: 'Image left' }, { value: 'right', label: 'Image right' }] },
    alignment('align', 'Content alignment', 'left'),
    ...layoutFields({ padTop: 0, padBottom: 0 }), ...advancedFields(),
  ],
});

S({
  type: 'slideshow', name: 'Slideshow', icon: 'Images', category: 'Banners',
  preset: [{ type: 'slide' }, { type: 'slide' }],
  settings: [
    { type: 'checkbox', id: 'autoplay', label: 'Autoplay', default: true },
    { type: 'range', id: 'interval', label: 'Change every', min: 2, max: 15, step: 1, unit: 's', default: 6 },
    { type: 'checkbox', id: 'showArrows', label: 'Show arrows', default: true },
    { type: 'checkbox', id: 'showDots', label: 'Show dots', default: true },
    { type: 'select', id: 'height', label: 'Height', default: 'lg',
      options: [{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }, { value: 'screen', label: 'Full screen' }] },
    ...layoutFields({ padTop: 0, padBottom: 0 }), ...advancedFields(),
  ],
});

S({
  type: 'split_hero', name: 'Split hero', icon: 'Columns2', category: 'Banners',
  preset: [{ type: 'heading', settings: { text: 'Premium,\nperfected.' } }, { type: 'text' }],
  settings: [
    { type: 'image_picker', id: 'leftImage', label: 'Left image' },
    { type: 'video_picker', id: 'leftVideo', label: 'Left video' },
    { type: 'text', id: 'leftLabel', label: 'Left button', default: 'Shop Women' },
    { type: 'url', id: 'leftHref', label: 'Left link', default: '/women' },
    { type: 'image_picker', id: 'rightImage', label: 'Right image' },
    { type: 'video_picker', id: 'rightVideo', label: 'Right video' },
    { type: 'text', id: 'rightLabel', label: 'Right button', default: 'Shop Men' },
    { type: 'url', id: 'rightHref', label: 'Right link', default: '/men' },
    { type: 'range', id: 'overlay', label: 'Overlay', min: 0, max: 80, step: 5, unit: '%', default: 25 },
    { type: 'range', id: 'height', label: 'Height', min: 300, max: 1000, step: 20, unit: 'px', default: 620 },
    ...layoutFields({ padTop: 0, padBottom: 0 }), ...advancedFields(),
  ],
});

S({
  type: 'rich_text', name: 'Rich text', icon: 'AlignLeft', category: 'Content',
  preset: [{ type: 'eyebrow' }, { type: 'heading' }, { type: 'text' }, { type: 'button' }],
  settings: [alignment('align', 'Alignment', 'center'), ...layoutFields(), ...advancedFields()],
});

S({
  type: 'marquee', name: 'Scrolling text', icon: 'Zap', category: 'Content',
  settings: [
    { type: 'list', id: 'items', label: 'Messages', addLabel: 'Add message', titleKey: 'text',
      fields: [{ type: 'text', id: 'text', label: 'Text', default: 'Free shipping over PKR 4,999' }],
      default: [
        { text: 'COD available — nationwide' },
        { text: 'Free shipping over PKR 4,999' },
        { text: '14-day easy exchange' },
      ] },
    { type: 'range', id: 'speed', label: 'Speed', min: 10, max: 120, step: 5, unit: 's', default: 40 },
    { type: 'segment', id: 'direction', label: 'Direction', default: 'left',
      options: [{ value: 'left', label: '←' }, { value: 'right', label: '→' }] },
    { type: 'range', id: 'size', label: 'Font size', min: 10, max: 48, step: 1, unit: 'px', default: 12 },
    ...layoutFields({ padTop: 16, padBottom: 16 }), ...advancedFields(),
  ],
});

S({
  type: 'icon_row', name: 'Icons with text', icon: 'Sparkles', category: 'Content',
  preset: [{ type: 'icon_item' }, { type: 'icon_item' }, { type: 'icon_item' }, { type: 'icon_item' }],
  settings: [
    { type: 'range', id: 'columns', label: 'Columns', min: 2, max: 6, step: 1, default: 4 },
    alignment('align', 'Alignment', 'center'),
    { type: 'checkbox', id: 'card', label: 'Show card background', default: true },
    ...layoutFields(), ...advancedFields(),
  ],
});

S({
  type: 'gallery', name: 'Gallery', icon: 'GalleryHorizontal', category: 'Content',
  preset: [{ type: 'image' }, { type: 'image' }, { type: 'image' }],
  settings: [
    { type: 'range', id: 'columns', label: 'Columns', min: 2, max: 6, step: 1, default: 3 },
    { type: 'range', id: 'gap', label: 'Gap', min: 0, max: 48, step: 2, unit: 'px', default: 12 },
    { type: 'checkbox', id: 'masonry', label: 'Masonry layout', default: false },
    ...layoutFields(), ...advancedFields(),
  ],
});

S({
  type: 'testimonials', name: 'Testimonials', icon: 'Quote', category: 'Content',
  preset: [{ type: 'section_header' }, { type: 'testimonial' }, { type: 'testimonial' }, { type: 'testimonial' }],
  settings: [
    { type: 'range', id: 'columns', label: 'Columns', min: 1, max: 4, step: 1, default: 3 },
    { type: 'segment', id: 'layout', label: 'Layout', default: 'grid',
      options: [{ value: 'grid', label: 'Grid' }, { value: 'carousel', label: 'Carousel' }] },
    { type: 'checkbox', id: 'showRating', label: 'Show stars', default: true },
    ...layoutFields(), ...advancedFields(),
  ],
});

S({
  type: 'faq', name: 'FAQ', icon: 'CircleHelp', category: 'Content',
  preset: [{ type: 'section_header' }, { type: 'faq_item' }, { type: 'faq_item' }],
  settings: [
    { type: 'checkbox', id: 'single', label: 'Open one at a time', default: true },
    { type: 'range', id: 'maxWidth', label: 'Max width', min: 400, max: 1200, step: 20, unit: 'px', default: 760 },
    ...layoutFields(), ...advancedFields(),
  ],
});

S({
  type: 'tabs', name: 'Tabs', icon: 'PanelTopOpen', category: 'Content',
  preset: [{ type: 'tab' }, { type: 'tab' }],
  settings: [
    alignment('align', 'Tab alignment', 'center'),
    { type: 'segment', id: 'style', label: 'Style', default: 'underline',
      options: [{ value: 'underline', label: 'Underline' }, { value: 'pill', label: 'Pill' }] },
    ...layoutFields(), ...advancedFields(),
  ],
});

S({
  type: 'timeline', name: 'Timeline', icon: 'GitCommitHorizontal', category: 'Content',
  preset: [{ type: 'section_header' }, { type: 'timeline_item' }, { type: 'timeline_item' }],
  settings: [
    { type: 'segment', id: 'orientation', label: 'Orientation', default: 'vertical',
      options: [{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }] },
    ...layoutFields(), ...advancedFields(),
  ],
});

S({
  type: 'video_section', name: 'Video', icon: 'Video', category: 'Media',
  preset: [{ type: 'heading' }],
  settings: [
    { type: 'video_picker', id: 'src', label: 'Video' },
    { type: 'image_picker', id: 'poster', label: 'Poster' },
    { type: 'checkbox', id: 'autoplay', label: 'Autoplay', default: false },
    { type: 'checkbox', id: 'loop', label: 'Loop', default: true },
    { type: 'checkbox', id: 'controls', label: 'Controls', default: true },
    { type: 'select', id: 'ratio', label: 'Aspect ratio', default: '16/9',
      options: [{ value: '16/9', label: '16:9' }, { value: '4/3', label: '4:3' }, { value: '1/1', label: '1:1' }, { value: '21/9', label: '21:9' }] },
    ...layoutFields(), ...advancedFields(),
  ],
});

S({
  type: 'countdown_section', name: 'Countdown', icon: 'Timer', category: 'Content',
  preset: [{ type: 'heading', settings: { text: 'Sale ends in' } }, { type: 'countdown' }, { type: 'button' }],
  settings: [alignment('align', 'Alignment', 'center'), ...layoutFields(), ...advancedFields()],
});

S({
  type: 'newsletter', name: 'Newsletter', icon: 'Mail', category: 'Forms',
  preset: [{ type: 'heading', settings: { text: 'Join the inner circle' } }, { type: 'text' }],
  settings: [
    { type: 'text', id: 'placeholder', label: 'Input placeholder', default: 'Your email address' },
    { type: 'text', id: 'button', label: 'Button label', default: 'Subscribe' },
    { type: 'text', id: 'success', label: 'Success message', default: 'Welcome in.' },
    alignment('align', 'Alignment', 'center'),
    ...layoutFields(), ...advancedFields(),
  ],
});

S({
  type: 'contact_form', name: 'Contact form', icon: 'MessageSquare', category: 'Forms',
  preset: [{ type: 'heading', settings: { text: 'Get in touch' } }],
  settings: [
    { type: 'checkbox', id: 'showPhone', label: 'Phone field', default: true },
    { type: 'checkbox', id: 'showSubject', label: 'Subject field', default: false },
    { type: 'text', id: 'button', label: 'Button label', default: 'Send message' },
    { type: 'range', id: 'maxWidth', label: 'Max width', min: 320, max: 900, step: 20, unit: 'px', default: 560 },
    ...layoutFields(), ...advancedFields(),
  ],
});

S({
  type: 'map', name: 'Map', icon: 'MapPin', category: 'Content',
  settings: [
    { type: 'text', id: 'query', label: 'Address / place', default: 'Rawalpindi, Pakistan' },
    { type: 'range', id: 'zoom', label: 'Zoom', min: 1, max: 20, step: 1, default: 13 },
    { type: 'range', id: 'height', label: 'Height', min: 200, max: 800, step: 20, unit: 'px', default: 400 },
    ...layoutFields(), ...advancedFields(),
  ],
});

S({
  type: 'blog_posts', name: 'Blog posts', icon: 'Newspaper', category: 'Content',
  preset: [{ type: 'section_header', settings: {} }],
  settings: [
    { type: 'blog', id: 'blog', label: 'Blog' },
    { type: 'range', id: 'count', label: 'Posts shown', min: 1, max: 12, step: 1, default: 3 },
    { type: 'range', id: 'columns', label: 'Columns', min: 1, max: 4, step: 1, default: 3 },
    { type: 'checkbox', id: 'showExcerpt', label: 'Show excerpt', default: true },
    { type: 'checkbox', id: 'showDate', label: 'Show date', default: true },
    ...layoutFields(), ...advancedFields(),
  ],
});

S({
  type: 'custom_html', name: 'Custom HTML', icon: 'Code', category: 'Advanced',
  preset: [{ type: 'html' }],
  settings: [...layoutFields(), ...advancedFields()],
});

S({
  type: 'custom_liquid', name: 'Custom Liquid', icon: 'Braces', category: 'Advanced',
  preset: [{ type: 'liquid' }],
  settings: [note('Liquid is rendered server-side on the live storefront.'), ...layoutFields(), ...advancedFields()],
});


// ── Parity sections: everything the original coded home page rendered ──────
S({
  type: 'featured_marquee', name: 'Auto-scrolling product strip', icon: 'Zap', category: 'Products',
  description: 'Dark band of product tiles that scrolls on its own. Pauses on hover.',
  settings: [
    headerField('Source'), ...PRODUCT_SOURCE,
    headerField('Header'),
    { type: 'text', id: 'eyebrow', label: 'Eyebrow', default: 'Featured' },
    { type: 'text', id: 'heading', label: 'Heading', default: 'Signature Pieces' },
    { type: 'checkbox', id: 'showViewAll', label: 'Show "View all"', default: true },
    { type: 'text', id: 'viewAllLabel', label: 'View-all label', default: 'View all', visibleIf: (s: any) => s.showViewAll !== false },
    { type: 'url', id: 'viewAllHref', label: 'View-all link', default: '/best', visibleIf: (s: any) => s.showViewAll !== false },
    headerField('Strip'),
    { type: 'range', id: 'count', label: 'Products shown', min: 4, max: 24, step: 1, default: 10 },
    { type: 'range', id: 'speed', label: 'Scroll duration', min: 15, max: 120, step: 5, unit: 's', default: 45 },
    { type: 'segment', id: 'direction', label: 'Direction', default: 'left',
      options: [{ value: 'left', label: '←' }, { value: 'right', label: '→' }] },
    { type: 'checkbox', id: 'pauseOnHover', label: 'Pause on hover', default: true },
    { type: 'range', id: 'tileWidth', label: 'Tile width', min: 120, max: 360, step: 10, unit: 'px', default: 200 },
    { type: 'checkbox', id: 'showPrice', label: 'Show price', default: true },
    ...layoutFields({ padTop: 48, padBottom: 56 }),
    ...advancedFields(),
  ],
});

S({
  type: 'editorial', name: 'Editorial block', icon: 'Newspaper', category: 'Content',
  description: 'Large image beside a headline, or a full-bleed image with text over it.',
  preset: [
    { type: 'eyebrow', settings: { text: 'For her' } },
    { type: 'heading', settings: { text: 'Quiet, considered,\nyours.', size: 44 } },
    { type: 'text', settings: { text: 'Pieces cut for real bodies and real days.' } },
    { type: 'button_row' },
  ],
  settings: [
    headerField('Media'),
    { type: 'image_picker', id: 'image', label: 'Image' },
    { type: 'video_picker', id: 'video', label: 'Video (optional)' },
    { type: 'segment', id: 'imageSide', label: 'Layout', default: 'left',
      options: [
        { value: 'left', label: 'Image left' },
        { value: 'right', label: 'Image right' },
        { value: 'overlay', label: 'Text over image' },
      ] },
    { type: 'select', id: 'ratio', label: 'Image ratio', default: '4/5',
      options: [
        { value: '4/5', label: 'Portrait 4:5' }, { value: '3/4', label: 'Portrait 3:4' },
        { value: '1/1', label: 'Square' }, { value: '16/9', label: 'Landscape' },
      ], visibleIf: (s: any) => s.imageSide !== 'overlay' },
    { type: 'range', id: 'overlay', label: 'Overlay strength', min: 0, max: 90, step: 5, unit: '%', default: 45,
      visibleIf: (s: any) => s.imageSide === 'overlay' },
    { type: 'range', id: 'minHeight', label: 'Min height', min: 240, max: 900, step: 20, unit: 'px', default: 520,
      visibleIf: (s: any) => s.imageSide === 'overlay' },
    { type: 'checkbox', id: 'zoomOnScroll', label: 'Subtle zoom on scroll', default: true },
    headerField('Content'),
    alignment('align', 'Text alignment', 'left'),
    ...layoutFields({ padTop: 0, padBottom: 0 }),
    ...advancedFields(),
  ],
});

S({
  type: 'featured_collections', name: 'Collection tiles', icon: 'Library', category: 'Products',
  description: 'Tiles for collections you have flagged as featured in the admin.',
  preset: [{ type: 'section_header' }],
  settings: [
    { type: 'segment', id: 'mode', label: 'Collections', default: 'featured',
      options: [{ value: 'featured', label: 'Flagged featured' }, { value: 'pick', label: 'Hand-picked' }] },
    { type: 'collection_list', id: 'collections', label: 'Collections', visibleIf: (s: any) => s.mode === 'pick' },
    { type: 'range', id: 'count', label: 'Maximum shown', min: 2, max: 12, step: 1, default: 4 },
    { type: 'range', id: 'columns', label: 'Columns', min: 2, max: 6, step: 1, default: 4 },
    { type: 'select', id: 'ratio', label: 'Image ratio', default: '4/5',
      options: [{ value: '1/1', label: 'Square' }, { value: '4/5', label: 'Portrait' }, { value: '16/9', label: 'Landscape' }] },
    { type: 'checkbox', id: 'overlayTitle', label: 'Title over image', default: true },
    { type: 'checkbox', id: 'showCount', label: 'Show product count', default: false },
    ...layoutFields(),
    ...advancedFields(),
  ],
});

S({
  type: 'cta_banner', name: 'Call-to-action banner', icon: 'Sparkles', category: 'Content',
  description: 'Rounded dark panel with an icon, headline and button.',
  preset: [
    { type: 'icon', settings: { name: 'Ruler', size: 24 } },
    { type: 'heading', settings: { text: 'Never guess your size again', size: 34, align: 'center' } },
    { type: 'text', settings: { text: 'Answer four quick questions and our Fit Finder recommends your true size.', align: 'center' } },
    { type: 'button', settings: { label: 'Try the Fit Finder', href: '/fit-finder' } },
  ],
  settings: [
    { type: 'color_background', id: 'panelBg', label: 'Panel background', default: '#0D0D0D' },
    { type: 'color', id: 'panelText', label: 'Panel text colour', default: '#F7F5F1' },
    { type: 'range', id: 'panelRadius', label: 'Panel radius', min: 0, max: 64, step: 2, unit: 'px', default: 40 },
    { type: 'range', id: 'panelPadding', label: 'Panel padding', min: 16, max: 120, step: 4, unit: 'px', default: 56 },
    { type: 'checkbox', id: 'glow', label: 'Soft corner glow', default: true },
    alignment('align', 'Alignment', 'center'),
    ...layoutFields({ padTop: 56, padBottom: 56 }),
    ...advancedFields(),
  ],
});

// ══ FOOTER GROUP ════════════════════════════════════════════════════════════
S({
  type: 'footer', name: 'Footer', icon: 'PanelBottom',
  category: 'Footer', groups: ['footer'], locked: true,
  blocks: [
    {
      type: 'footer_about', name: 'About column', icon: 'Info',
      settings: [
        { type: 'text', id: 'title', label: 'Title', default: 'HUSHAE' },
        { type: 'textarea', id: 'text', label: 'Text', rows: 3, default: 'Second Skin, First Choice.' },
        { type: 'checkbox', id: 'showSocial', label: 'Show social icons', default: true },
        { type: 'text', id: 'note', label: 'Small note', default: 'Made in Pakistan' },
      ],
    },
    {
      type: 'footer_contact', name: 'Contact column', icon: 'Mail',
      settings: [
        { type: 'text', id: 'title', label: 'Title', default: 'Contact' },
        { type: 'text', id: 'email', label: 'Email', default: '' },
        { type: 'text', id: 'phone', label: 'Phone', default: '' },
        { type: 'text', id: 'note', label: 'Note', default: 'Pakistan — nationwide delivery' },
        { type: 'text', id: 'payments', label: 'Payment line', default: 'COD · JazzCash · EasyPaisa' },
      ],
    },
    {
      type: 'footer_newsletter', name: 'Newsletter', icon: 'Send',
      settings: [
        { type: 'text', id: 'title', label: 'Title', default: 'Join the inner circle' },
        { type: 'text', id: 'text', label: 'Text', default: 'Early access to new drops.' },
        { type: 'text', id: 'button', label: 'Button', default: 'Subscribe' },
      ],
    },
  ],
  preset: [
    { type: 'footer_newsletter' },
    { type: 'footer_about' },
    { type: 'footer_column', settings: { title: 'Shop' } },
    { type: 'footer_column', settings: { title: 'Help' } },
    { type: 'footer_contact' },
  ],
  settings: [
    { type: 'range', id: 'columns', label: 'Columns', min: 2, max: 6, step: 1, default: 4 },
    { type: 'color_background', id: 'background', label: 'Background', default: '' },
    { type: 'color', id: 'textColor', label: 'Text colour', default: '' },
    { type: 'text', id: 'bottomText', label: 'Bottom bar text', default: '' },
    { type: 'checkbox', id: 'showPayments', label: 'Show payment icons', default: true },
    { type: 'range', id: 'paddingTop', label: 'Padding top', min: 0, max: 160, step: 4, unit: 'px', default: 56 },
    { type: 'range', id: 'paddingBottom', label: 'Padding bottom', min: 0, max: 160, step: 4, unit: 'px', default: 24 },
  ],
});
