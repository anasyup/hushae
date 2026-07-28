import './sections';
import { createBlock, createSection } from '../core/registry';
import type { PageDocument } from '../core/types';

/* ============================================================================
 * The document a brand-new store starts with. Mirrors the current HUSHAE
 * storefront so switching to the editor changes nothing visually.
 * ========================================================================== */

export function buildDefaultDoc(): PageDocument {
  const hero = createSection('hero', {
    settings: {
      overlay: 55, height: 'screen', position: 'bottom-left', contentWidth: 760,
      paddingTop: 0, paddingBottom: 0, width: 'full', animation: 'fade-up',
    },
    blocks: [
      createBlock('eyebrow', { settings: { text: 'Premium innerwear · Made in Pakistan', color: '#F7F5F1', tracking: 22 } }),
      createBlock('heading', {
        settings: {
          text: 'Second Skin,\nFirst Choice.', tag: 'h1', size: 84, font: 'display',
          weight: '400', color: '#F7F5F1', leading: 102, align: 'left',
        },
      }),
      createBlock('button_row', {
        settings: { align: 'left', gap: 12 },
        blocks: [
          createBlock('button', { settings: { label: 'Shop Women', href: '/women', style: 'solid' } }),
          createBlock('button', { settings: { label: 'Shop Men', href: '/men', style: 'outline' } }),
        ],
      }),
    ],
  });

  const featured = createSection('featured_collection', {
    settings: {
      source: 'featured', count: 8, columns: 4, mobileColumns: 2, layout: 'grid',
      gapX: 12, gapY: 28, paddingTop: 64, paddingBottom: 64, animation: 'fade-up',
    },
    blocks: [
      createBlock('section_header', {
        settings: { align: 'left', inline: true, gap: 24 },
        blocks: [
          createBlock('sh_title', { settings: { text: 'Signature Pieces', size: 30 } }),
          createBlock('sh_view_all', { settings: { label: 'View all', href: '/best', style: 'text' } }),
        ],
      }),
      createBlock('product_card', {
        settings: { align: 'left', radius: 0 },
        blocks: [
          createBlock('card_media', { settings: { ratio: '4/5', radius: 16 } }),
          createBlock('card_badge', { settings: { text: 'Save {percent}%', position: 'top-left' } }),
          createBlock('card_wishlist'),
          createBlock('card_quick_add', { settings: { label: 'Quick Add', showOnHover: true } }),
          createBlock('card_title', { settings: { size: 14, lines: 2 } }),
          createBlock('card_price', { settings: { showCompare: true, size: 14 } }),
        ],
      }),
    ],
  });

  const split = createSection('split_hero', {
    settings: {
      leftImage: '/images/products/gemini/hero-women-bra.png',
      rightImage: '/images/products/gemini/hero-men-boxer.png',
      leftLabel: 'Shop Women', leftHref: '/women',
      rightLabel: 'Shop Men', rightHref: '/men',
      overlay: 25, height: 620, width: 'full', paddingTop: 0, paddingBottom: 0,
    },
    blocks: [
      createBlock('eyebrow', { settings: { text: 'The Signature Edit', color: '#F7F5F1' } }),
      createBlock('heading', { settings: { text: 'Premium,\nperfected.', size: 56, color: '#F7F5F1' } }),
      createBlock('text', { settings: { text: 'Silk-touch fabrics. Bonded seamless edges. Discreet packaging always.', color: '#F7F5F1' } }),
    ],
  });

  const marquee = createSection('marquee', {
    settings: {
      speed: 40, direction: 'left', size: 12, paddingTop: 18, paddingBottom: 18,
      background: '#0D0D0D', textColor: '#F7F5F1', colorScheme: 'custom',
      items: [
        { text: 'COD available — nationwide' },
        { text: 'Free shipping over PKR 4,999' },
        { text: '14-day easy exchange' },
        { text: 'Discreet packaging — always' },
        { text: 'Made in Pakistan' },
      ],
    },
  });

  const icons = createSection('icon_row', {
    settings: { columns: 4, align: 'center', card: true, paddingTop: 56, paddingBottom: 56 },
    blocks: [
      createBlock('icon_item', { settings: { icon: 'PackageCheck', title: 'Discreet packaging', text: 'Plain, unmarked parcels — always.' } }),
      createBlock('icon_item', { settings: { icon: 'Banknote', title: 'COD available', text: 'Pay at your doorstep, Pakistan-wide.' } }),
      createBlock('icon_item', { settings: { icon: 'RefreshCw', title: 'Easy exchange', text: '14-day size exchange, no questions.' } }),
      createBlock('icon_item', { settings: { icon: 'MapPin', title: 'Made in Pakistan', text: 'Crafted locally, finished internationally.' } }),
    ],
  });

  const bestSellers = createSection('featured_collection', {
    settings: {
      source: 'bestSeller', count: 8, columns: 4, mobileColumns: 2, layout: 'carousel',
      gapX: 16, gapY: 28, paddingTop: 64, paddingBottom: 64,
    },
    blocks: [
      createBlock('section_header', {
        blocks: [
          createBlock('sh_title', { settings: { text: 'Best Sellers' } }),
          createBlock('sh_view_all', { settings: { label: 'View all', href: '/best' } }),
        ],
      }),
      createBlock('product_card', {
        blocks: [
          createBlock('card_media', { settings: { ratio: '4/5', radius: 16 } }),
          createBlock('card_badge'),
          createBlock('card_wishlist'),
          createBlock('card_title'),
          createBlock('card_price'),
        ],
      }),
    ],
  });

  const testimonials = createSection('testimonials', {
    settings: { columns: 3, layout: 'grid', showRating: true, paddingTop: 64, paddingBottom: 64 },
    blocks: [
      createBlock('section_header', {
        settings: { inline: false, align: 'center' },
        blocks: [createBlock('sh_title', { settings: { text: 'Loved across Pakistan' } })],
      }),
      createBlock('testimonial', { settings: { quote: 'Genuinely the most comfortable pieces I own.', author: 'Ayesha K.', meta: 'Lahore · Verified buyer', rating: 5 } }),
      createBlock('testimonial', { settings: { quote: 'Packaging was completely discreet. Fit is spot on.', author: 'Hamza R.', meta: 'Karachi · Verified buyer', rating: 5 } }),
      createBlock('testimonial', { settings: { quote: 'Exchanged a size in three days. Painless.', author: 'Sana M.', meta: 'Islamabad · Verified buyer', rating: 5 } }),
    ],
  });

  const newsletter = createSection('newsletter', {
    settings: {
      align: 'center', paddingTop: 72, paddingBottom: 72,
      background: '#F1EEE9', colorScheme: 'custom', radius: 32, width: 'page',
    },
    blocks: [
      createBlock('heading', { settings: { text: 'Join the inner circle', size: 34 } }),
      createBlock('text', { settings: { text: 'Early access to new drops, fit guides and private offers. No noise, ever.', align: 'center' } }),
    ],
  });

  return {
    template: 'index',
    header: [
      createSection('announcement_bar', {
        settings: { enabled: true, background: '#0D0D0D', textColor: '#F7F5F1', height: 38, autoRotate: true, speed: 5 },
        blocks: [createBlock('announcement', { settings: { text: 'Season sale — up to 40% off · while stock lasts', ctaLabel: 'Shop the sale', ctaHref: '/sale' } })],
      }),
      createSection('header', {
        settings: { layout: 'logo-left', sticky: true, transparentOnHero: true, height: 64, border: true },
      }),
    ],
    body: [hero, featured, split, marquee, icons, bestSellers, testimonials, newsletter],
    footer: [createSection('footer', { settings: { columns: 4, paddingTop: 56, paddingBottom: 24, showPayments: true } })],
  };
}
