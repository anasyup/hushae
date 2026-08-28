import './sections';
import { createBlock, createSection } from '../core/registry';
import type { PageDocument, SettingsBag } from '../core/types';

/* ============================================================================
 * The starting document.
 *
 * This is a faithful rebuild of the hand-coded HUSHAE home page, so activating
 * the editor changes nothing visually — the merchant simply gains control of
 * every section. Live values (hero video, split images, marquee copy) are read
 * from the store settings when available and fall back to what the coded page
 * shipped with.
 * ========================================================================== */

const pick = <T,>(value: T | undefined | null | '', fallback: T): T =>
  value === undefined || value === null || value === '' ? fallback : value;

export function buildDefaultDoc(settings: SettingsBag = {}): PageDocument {
  const s = settings as Record<string, any>;
  const hero = s.hero || {};
  const h = s.header || {};
  const split = s.signatureSplit || {};
  const offer = s.offerBar || {};
  const marqueeItems: string[] = Array.isArray(s.marquee?.items) && s.marquee.items.length
    ? s.marquee.items
    : ['COD available — nationwide', 'Free shipping over PKR 4,999', '14-day easy exchange',
       'Discreet packaging — always', 'Made in Pakistan', '3-tier quality system'];
  const heroBadges: string[] = Array.isArray(hero.badges) && hero.badges.length
    ? hero.badges
    : ['3 tiers — Economy to Signature', '100+ styles', 'Discreet packaging always'];

  // ── Header ────────────────────────────────────────────────────────────────
  const announcement = createSection('announcement_bar', {
    settings: {
      enabled: s.offerBar?.enabled !== false,
      background: '#0D0D0D', textColor: '#F7F5F1', height: 38, autoRotate: true, speed: 5,
    },
    blocks: [createBlock('announcement', {
      settings: {
        text: pick(offer.messageEn, 'Season Sale — up to 40% off · while stock lasts'),
        ctaLabel: pick(offer.ctaEn, 'Shop the Sale'),
        ctaHref: pick(offer.link, '/sale'),
      },
    })],
  });

  const header = createSection('header', {
    settings: { layout: 'logo-left', width: 'full', sticky: true, transparentOnHero: true, height: 80, border: true },
    blocks: [
      createBlock('logo', {
        settings: {
          kind: 'text', text: pick(s.storeName, 'HUSHAE'),
          boxed: h.logoBoxed !== false, tracking: Number(h.logoTracking ?? 32), size: Number(h.logoSize ?? 26),
        },
      }),
      createBlock('menu', {
        settings: { gap: Number(h.navGap ?? 34), size: Number(h.navSize ?? 13), uppercase: h.navUppercase === true },
        blocks: (Array.isArray(h.menu) && h.menu.length
          ? h.menu
          : [
            { label: 'Women', href: '/women', dropdown: 'women' },
            { label: 'Men', href: '/men', dropdown: 'men' },
            { label: 'New Arrivals', href: '/new' },
            { label: 'Best Sellers', href: '/best' },
            { label: 'Sale', href: '/sale', highlight: true },
            { label: 'Fit Finder', href: '/fit-finder' },
            { label: 'Track Order', href: '/track' },
          ]
        ).filter((m: any) => m && m.label).map((m: any) => createBlock('menu_item', {
          settings: {
            label: String(m.label), href: String(m.href || '/'),
            ...(m.dropdown ? { dropdown: String(m.dropdown) } : {}),
            ...(m.highlight ? { highlight: true } : {}),
          },
        })),
      }),
      createBlock('header_icons', {
        settings: {
          search: h.showSearch !== false, wishlist: h.showWishlist !== false,
          account: h.showAccount !== false, cart: h.showCart !== false,
        },
      }),
    ],
  });

  // ── 1 · Full-screen hero ──────────────────────────────────────────────────
  const heroSection = createSection('hero', {
    name: 'Hero video',
    settings: {
      image: pick(hero.image, ''),
      video: pick(hero.video, ''),
      overlay: Number(hero.overlayOpacity ?? 55),
      overlayColor: '#0D0D0D',
      height: hero.fullScreen === false ? 'lg' : 'screen',
      position: hero.align === 'center' ? 'bottom-center' : 'bottom-left',
      contentWidth: 780, width: 'full', paddingTop: 0, paddingBottom: 0, animation: 'none',
    },
    blocks: [
      ...(hero.eyebrow ? [createBlock('eyebrow', { settings: { text: hero.eyebrow, color: '#F7F5F1', tracking: 20 } })] : []),
      createBlock('heading', {
        settings: {
          text: pick(hero.title, 'Second Skin,\nFirst Choice.'),
          tag: 'h1', size: 84, font: 'display', weight: '400', color: '#F7F5F1', leading: 102,
          align: hero.align === 'center' ? 'center' : 'left',
        },
      }),
      ...(hero.subtitle ? [createBlock('text', { settings: { text: hero.subtitle, color: '#F7F5F1', maxWidth: 560 } })] : []),
      ...(hero.showButtons === false ? [] : [createBlock('button_row', {
        settings: { align: hero.align === 'center' ? 'center' : 'left', gap: 12 },
        blocks: [
          createBlock('button', { settings: { label: pick(hero.ctaWomen, 'Shop Women'), href: '/women', style: 'solid', bg: '#F7F5F1', fg: '#0D0D0D' } }),
          createBlock('button', { settings: { label: pick(hero.ctaMen, 'Shop Men'), href: '/men', style: 'outline', fg: '#F7F5F1' } }),
        ],
      })]),
      createBlock('text', {
        name: 'Trust line',
        settings: {
          text: heroBadges.join('   |   '),
          color: 'rgba(247,245,241,.62)', size: 11, tracking: 18, transform: 'uppercase', maxWidth: 900,
        },
      }),
    ],
  });

  // ── 2 · Auto-scrolling signature strip ────────────────────────────────────
  const signatureStrip = createSection('featured_marquee', {
    name: 'Signature Pieces strip',
    settings: {
      source: 'featured', count: 10, speed: 45, direction: 'left', pauseOnHover: true,
      tileWidth: 200, showPrice: true, eyebrow: 'Featured', heading: 'Signature Pieces',
      showViewAll: true, viewAllLabel: 'View all', viewAllHref: '/best',
      colorScheme: 'custom', background: '#0D0D0D', textColor: '#F7F5F1',
      paddingTop: 44, paddingBottom: 52, width: 'page',
    },
  });

  // ── 3 · Split hero ────────────────────────────────────────────────────────
  const splitHero = createSection('split_hero', {
    name: 'Women / Men split',
    settings: {
      leftImage: pick(split.leftImage, '/images/products/gemini/hero-women-bra.png'),
      leftVideo: pick(split.leftVideo, ''),
      leftLabel: pick(split.leftCtaLabel, 'Shop Women'),
      leftHref: pick(split.leftCtaHref, '/women'),
      rightImage: pick(split.rightImage, '/images/products/gemini/hero-men-boxer.png'),
      rightVideo: pick(split.rightVideo, ''),
      rightLabel: pick(split.rightCtaLabel, 'Shop Men'),
      rightHref: pick(split.rightCtaHref, '/men'),
      overlay: Number(split.overlayOpacity ?? 25),
      height: 620, width: 'full', paddingTop: 0, paddingBottom: 0,
    },
    blocks: [
      createBlock('eyebrow', { settings: { text: pick(split.eyebrow, 'The Signature Edit'), color: '#F7F5F1', align: 'center' } }),
      createBlock('heading', { settings: { text: pick(split.title, 'Premium,\nperfected.'), size: 56, color: pick(split.textColor, '#F7F5F1'), align: 'center' } }),
      createBlock('text', {
        settings: {
          text: pick(split.subtitle, "Silk-touch fabrics. Bonded seamless edges. Discreet packaging always."),
          color: 'rgba(247,245,241,.85)', align: 'center', maxWidth: 560,
        },
      }),
    ],
  });

  // ── 4 · Signature product row ─────────────────────────────────────────────
  const signatureRow = createSection('featured_collection', {
    name: 'Premium, perfected',
    settings: {
      source: 'featured', count: 10, columns: 4, mobileColumns: 2, layout: 'carousel',
      gapX: 16, gapY: 28, paddingTop: 64, paddingBottom: 8, animation: 'fade-up',
    },
    blocks: [
      createBlock('section_header', {
        settings: { align: 'left', inline: true, gap: 24 },
        blocks: [
          createBlock('eyebrow', { settings: { text: 'The Signature Edit' } }),
          createBlock('sh_title', { settings: { text: 'Premium, perfected', size: 30 } }),
        ],
      }),
      productCard(),
    ],
  });

  // ── 5-7 · Editorial blocks ────────────────────────────────────────────────
  const editorialWomen = createSection('editorial', {
    name: 'For her',
    settings: { image: '/images/products/cat-bras-hero.jpg', imageSide: 'right', ratio: '4/5', align: 'left', paddingTop: 0, paddingBottom: 0 },
    blocks: [
      createBlock('eyebrow', { settings: { text: 'For her' } }),
      createBlock('heading', { settings: { text: 'Quiet, considered,\nyours.', size: 46 } }),
      createBlock('text', { settings: { text: 'Bras that vanish under a slip dress. Briefs cut for real bodies. Lounge sets you\u2019ll live in.', maxWidth: 460 } }),
      createBlock('button_row', {
        blocks: [
          createBlock('button', { settings: { label: 'Shop the Edit', href: '/women', style: 'solid' } }),
          createBlock('button', { settings: { label: 'View Bras', href: '/category/bras', style: 'outline' } }),
        ],
      }),
    ],
  });

  const editorialMen = createSection('editorial', {
    name: 'For him',
    settings: { image: '/images/products/cat-briefs-hero.jpg', imageSide: 'left', ratio: '4/5', align: 'left', paddingTop: 0, paddingBottom: 0 },
    blocks: [
      createBlock('eyebrow', { settings: { text: 'For him' } }),
      createBlock('heading', { settings: { text: 'Everyday essentials,\nrefined.', size: 46 } }),
      createBlock('text', { settings: { text: 'Modal-cotton briefs, contoured trunks and thermal layers — engineered for the daily rotation.', maxWidth: 460 } }),
      createBlock('button_row', {
        blocks: [
          createBlock('button', { settings: { label: 'Shop the Edit', href: '/men', style: 'solid' } }),
          createBlock('button', { settings: { label: 'View Briefs', href: '/category/briefs', style: 'outline' } }),
        ],
      }),
    ],
  });

  const editorialDiscreet = createSection('editorial', {
    name: 'Discreet packaging',
    settings: { image: '/images/products/cat-sleepwear-hero.jpg', imageSide: 'overlay', overlay: 55, minHeight: 560, align: 'left', paddingTop: 0, paddingBottom: 0, width: 'full' },
    blocks: [
      createBlock('eyebrow', { settings: { text: 'Discreet always', color: '#F7F5F1' } }),
      createBlock('heading', { settings: { text: 'Delivered in plain,\nunmarked parcels.', size: 50, color: '#F7F5F1' } }),
      createBlock('text', {
        settings: {
          text: 'Every order ships in a signature HUSHAE parcel with zero product references on the outside.',
          color: 'rgba(247,245,241,.85)', maxWidth: 520,
        },
      }),
      createBlock('button_row', {
        blocks: [createBlock('button', { settings: { label: 'Shop All', href: '/shop', style: 'solid', bg: '#F7F5F1', fg: '#0D0D0D' } })],
      }),
    ],
  });

  // ── 8 · Scrolling text strip ──────────────────────────────────────────────
  const marquee = createSection('marquee', {
    settings: {
      speed: 40, direction: 'left', size: 12, paddingTop: 18, paddingBottom: 18,
      colorScheme: 'custom', background: '#0D0D0D', textColor: '#F7F5F1', width: 'full',
      items: marqueeItems.map((text) => ({ text })),
    },
  });

  // ── 9 · Featured collection tiles ─────────────────────────────────────────
  const collectionTiles = createSection('featured_collections', {
    settings: { mode: 'featured', count: 4, columns: 4, ratio: '4/5', overlayTitle: true, paddingTop: 72, paddingBottom: 0 },
    blocks: [
      createBlock('section_header', {
        settings: { inline: true },
        blocks: [
          createBlock('sh_title', { settings: { text: 'Featured Collections' } }),
          createBlock('sh_view_all', { settings: { label: 'View all', href: '/shop' } }),
        ],
      }),
    ],
  });

  // ── 10 · Trust badges ─────────────────────────────────────────────────────
  const trust = createSection('icon_row', {
    name: 'Trust badges',
    settings: { columns: 4, align: 'center', card: true, paddingTop: 56, paddingBottom: 8 },
    blocks: [
      createBlock('icon_item', { settings: { icon: 'PackageCheck', title: 'Discreet Packaging', text: 'Plain, unmarked parcels — always.' } }),
      createBlock('icon_item', { settings: { icon: 'Banknote', title: 'COD Available', text: 'Pay at your doorstep, Pakistan-wide.' } }),
      createBlock('icon_item', { settings: { icon: 'RefreshCw', title: 'Easy Exchange', text: '14-day size exchange, no questions.' } }),
      createBlock('icon_item', { settings: { icon: 'MapPin', title: 'Made in Pakistan', text: 'Crafted locally, finished internationally.' } }),
    ],
  });

  // ── 11 · Best sellers ─────────────────────────────────────────────────────
  const bestSellers = createSection('featured_collection', {
    name: 'Best Sellers',
    settings: {
      source: 'bestSeller', count: 10, columns: 4, mobileColumns: 2, layout: 'carousel',
      gapX: 16, gapY: 28, paddingTop: 80, paddingBottom: 8, animation: 'fade-up',
    },
    blocks: [
      createBlock('section_header', {
        settings: { inline: true },
        blocks: [
          createBlock('eyebrow', { settings: { text: 'Loved across Pakistan' } }),
          createBlock('sh_title', { settings: { text: 'Best Sellers' } }),
        ],
      }),
      productCard(),
    ],
  });

  // ── 12 · Trending ─────────────────────────────────────────────────────────
  const trending = createSection('featured_collection', {
    name: 'Trending Now',
    settings: {
      source: 'trending', count: 8, columns: 4, mobileColumns: 2, layout: 'carousel',
      gapX: 16, gapY: 28, paddingTop: 80, paddingBottom: 8, animation: 'fade-up',
    },
    blocks: [
      createBlock('section_header', {
        settings: { inline: true },
        blocks: [
          createBlock('eyebrow', { settings: { text: 'Flying off the shelves' } }),
          createBlock('sh_title', { settings: { text: 'Trending Now' } }),
        ],
      }),
      productCard(),
    ],
  });

  // ── 13 · Fit Finder CTA ───────────────────────────────────────────────────
  const fitFinder = createSection('cta_banner', {
    name: 'Fit Finder',
    settings: { panelBg: '#0D0D0D', panelText: '#F7F5F1', panelRadius: 40, panelPadding: 60, glow: true, align: 'center', paddingTop: 80, paddingBottom: 0 },
    blocks: [
      createBlock('icon', { settings: { name: 'Ruler', size: 26, color: '#F7F5F1', align: 'center' } }),
      createBlock('heading', { settings: { text: 'Never guess your size again', size: 36, color: '#F7F5F1', align: 'center' } }),
      createBlock('text', {
        settings: {
          text: 'Answer four quick questions and our Fit Finder recommends your true HUSHAE size — for him and for her.',
          color: 'rgba(247,245,241,.7)', align: 'center', maxWidth: 460,
        },
      }),
      createBlock('button_row', {
        settings: { align: 'center' },
        blocks: [createBlock('button', { settings: { label: 'Start Fit Finder', href: '/fit-finder', style: 'solid', bg: '#F7F5F1', fg: '#0D0D0D', size: 'lg' } })],
      }),
    ],
  });

  // ── 14 · Reviews ──────────────────────────────────────────────────────────
  const testimonials = createSection('testimonials', {
    settings: { columns: 3, layout: 'grid', showRating: true, paddingTop: 80, paddingBottom: 8 },
    blocks: [
      createBlock('section_header', {
        settings: { inline: false, align: 'center' },
        blocks: [
          createBlock('eyebrow', { settings: { text: 'Real reviews', align: 'center' } }),
          createBlock('sh_title', { settings: { text: 'Loved across Pakistan' } }),
        ],
      }),
      createBlock('testimonial', { settings: { quote: 'Genuinely the most comfortable pieces I own. The fit is spot on.', author: 'Ayesha K.', meta: 'Lahore · Verified buyer', rating: 5 } }),
      createBlock('testimonial', { settings: { quote: 'Packaging was completely discreet. Delivery took two days.', author: 'Hamza R.', meta: 'Karachi · Verified buyer', rating: 5 } }),
      createBlock('testimonial', { settings: { quote: 'Exchanged a size in three days. Painless, and the fabric is lovely.', author: 'Sana M.', meta: 'Islamabad · Verified buyer', rating: 5 } }),
    ],
  });

  // ── 15 · Why choose HUSHAE ────────────────────────────────────────────────
  const whyUs = createSection('icon_row', {
    name: 'Why choose HUSHAE',
    settings: { columns: 4, align: 'center', card: true, paddingTop: 80, paddingBottom: 8 },
    blocks: [
      createBlock('icon_item', { settings: { icon: 'Lock', title: 'Discreet', text: 'Unmarked packaging on every order' } }),
      createBlock('icon_item', { settings: { icon: 'Truck', title: 'Nationwide', text: 'COD across all of Pakistan' } }),
      createBlock('icon_item', { settings: { icon: 'Gift', title: 'Free ship', text: 'On orders over PKR 4,999' } }),
      createBlock('icon_item', { settings: { icon: 'RefreshCw', title: '14-day exchange', text: 'Easy size swaps within two weeks' } }),
    ],
  });

  // ── 16 · Newsletter ───────────────────────────────────────────────────────
  const newsletter = createSection('newsletter', {
    settings: {
      align: 'center', paddingTop: 72, paddingBottom: 72, marginTop: 80,
      colorScheme: 'custom', background: '#F1EEE9', radius: 40, width: 'page',
      placeholder: 'Your email address', button: 'Subscribe', success: 'Welcome in.',
    },
    blocks: [
      createBlock('heading', { settings: { text: 'Join the inner circle', size: 34, align: 'center' } }),
      createBlock('text', { settings: { text: 'Early access to new drops, fit guides and private offers. No noise, ever.', align: 'center', maxWidth: 420 } }),
    ],
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = createSection('footer', {
    settings: { columns: 4, paddingTop: 56, paddingBottom: 24, showPayments: true },
    blocks: [
      createBlock('footer_newsletter', { settings: { title: 'Join the inner circle', text: 'Early access to new drops, fit guides and private offers.', button: 'Subscribe' } }),
      createBlock('footer_about', {
        settings: {
          title: pick(s.storeName, 'HUSHAE'),
          text: pick(s.tagline, 'Second Skin, First Choice.'),
          showSocial: true, note: 'Made in Pakistan · Worn worldwide soon',
        },
      }),
      createBlock('footer_column', {
        settings: { title: 'Shop' },
        blocks: [
          createBlock('menu_item', { settings: { label: 'Women', href: '/women' } }),
          createBlock('menu_item', { settings: { label: 'Men', href: '/men' } }),
          createBlock('menu_item', { settings: { label: 'New Arrivals', href: '/new' } }),
          createBlock('menu_item', { settings: { label: 'Best Sellers', href: '/best' } }),
          createBlock('menu_item', { settings: { label: 'Sale', href: '/sale' } }),
        ],
      }),
      createBlock('footer_column', {
        settings: { title: 'Help' },
        blocks: [
          createBlock('menu_item', { settings: { label: 'Track Order', href: '/track' } }),
          createBlock('menu_item', { settings: { label: 'Fit Finder', href: '/fit-finder' } }),
          createBlock('menu_item', { settings: { label: 'FAQ', href: '/faq' } }),
          createBlock('menu_item', { settings: { label: 'My Account', href: '/account' } }),
          createBlock('menu_item', { settings: { label: 'Wishlist', href: '/wishlist' } }),
        ],
      }),
      createBlock('footer_column', {
        settings: { title: 'Policies' },
        blocks: [
          createBlock('menu_item', { settings: { label: 'Privacy Policy', href: '/privacy' } }),
          createBlock('menu_item', { settings: { label: 'Terms of Service', href: '/terms' } }),
          createBlock('menu_item', { settings: { label: 'Returns & Exchanges', href: '/returns' } }),
          createBlock('menu_item', { settings: { label: 'Shipping Policy', href: '/shipping-policy' } }),
        ],
      }),
      createBlock('footer_contact', {
        settings: {
          title: 'Contact',
          email: pick(s.contactEmail, ''),
          phone: pick(s.contactPhone, ''),
          note: 'Pakistan — nationwide delivery',
          payments: 'COD · JazzCash · EasyPaisa · Bank Transfer',
        },
      }),
    ],
  });

  return {
    template: 'index',
    header: [announcement, header],
    body: [
      heroSection, signatureStrip, splitHero, signatureRow,
      editorialWomen, editorialMen, editorialDiscreet,
      marquee, collectionTiles, trust,
      bestSellers, trending, fitFinder, testimonials, whyUs, newsletter,
    ],
    footer: [footer],
  };
}

/** The product card used by every product row — matches the coded ProductCard. */
function productCard() {
  return createBlock('product_card', {
    settings: { align: 'left', radius: 0 },
    blocks: [
      createBlock('card_media', { settings: { ratio: '3/4', radius: 16, fit: 'cover' } }),
      createBlock('card_badge', { settings: { text: 'Save {percent}%', position: 'top-left' } }),
      createBlock('card_wishlist'),
      createBlock('card_quick_add', { settings: { label: 'Quick Add', showOnHover: true } }),
      createBlock('card_title', { settings: { size: 14, lines: 2 } }),
      createBlock('card_price', { settings: { showCompare: true, size: 14 } }),
    ],
  });
}

/* ══ Default templates for the other page types (Shopify OS 2.0) ══════════
   Each template ships with a sensible starter layout that pulls live data —
   the merchant then edits every section in the theme editor. */

const sharedHeaderFooter = () => {
  const announcement = createSection('announcement_bar', {
    settings: { enabled: true, background: '#0D0D0D', textColor: '#F7F5F1', height: 38, autoRotate: true, speed: 5 },
    blocks: [createBlock('announcement', {
      settings: { text: 'Season Sale — up to 40% off · while stock lasts', ctaLabel: 'Shop the Sale', ctaHref: '/sale' },
    })],
  });
  const header = createSection('header', {
    settings: { layout: 'logo-left', width: 'full', sticky: true, transparentOnHero: false, height: 80, border: true },
    blocks: [
      createBlock('logo', { settings: { kind: 'text', text: 'HUSHAE', boxed: true, tracking: 32, size: 26 } }),
      createBlock('menu', {
        settings: { gap: 34, size: 13, uppercase: false },
        blocks: [
          createBlock('menu_item', { settings: { label: 'Women', href: '/women' } }),
          createBlock('menu_item', { settings: { label: 'Men', href: '/men' } }),
          createBlock('menu_item', { settings: { label: 'New Arrivals', href: '/new' } }),
          createBlock('menu_item', { settings: { label: 'Best Sellers', href: '/best' } }),
          createBlock('menu_item', { settings: { label: 'Sale', href: '/sale', highlight: true } }),
        ],
      }),
      createBlock('header_icons', { settings: { search: true, wishlist: true, account: true, cart: true } }),
    ],
  });
  const footer = createSection('footer', {
    settings: { columns: 4, bottomText: '© HUSHAE — Second Skin, First Choice.', showPayments: true, paddingTop: 56, paddingBottom: 24 },
    blocks: [
      createBlock('footer_newsletter', { settings: { title: 'Join the inner circle', text: 'Early access to new drops.', button: 'Subscribe' } }),
      createBlock('footer_about', { settings: { title: 'HUSHAE', text: 'Pakistan — nation-wide delivery. Discreet packaging, always.' } }),
      createBlock('footer_column', { settings: { title: 'Shop' }, blocks: [
        createBlock('menu_item', { settings: { label: 'Women', href: '/women' } }),
        createBlock('menu_item', { settings: { label: 'Men', href: '/men' } }),
        createBlock('menu_item', { settings: { label: 'Sale', href: '/sale' } }),
      ] }),
      createBlock('footer_contact', { settings: { title: 'Contact', note: 'Pakistan — nationwide delivery', payments: 'COD · JazzCash · EasyPaisa' } }),
    ],
  });
  return { header: [announcement, header], footer: [footer] };
};

/** Starter document for a page type. */
export function buildDefaultTemplate(type: 'product' | 'collection' | 'page' | 'blog' | 'cart'): PageDocument {
  const { header, footer } = sharedHeaderFooter();

  if (type === 'product') {
    const buyBox = createSection('product_buy_box', {
      settings: { layout: 'split', stickyInfo: true, showBreadcrumb: true, gap: 56, paddingTop: 32, paddingBottom: 56 },
      blocks: [
        createBlock('buy_gallery', { settings: { thumbs: true, zoom: true, aspect: 125 } }),
        createBlock('buy_title', { settings: { tag: 'h1', showVendor: true, showRating: true } }),
        createBlock('buy_price', { settings: { showCompareAt: true, showTaxNote: true } }),
        createBlock('buy_variants', { settings: { sizeLabel: 'Size', colorLabel: 'Colour', swatches: true } }),
        createBlock('buy_qty', { settings: { max: 10 } }),
        createBlock('buy_buttons', { settings: { showBuyNow: true, fullWidth: true } }),
        createBlock('buy_trust', { settings: {}, blocks: [
          createBlock('buy_trust_item', { settings: { icon: 'Truck', text: 'Nationwide delivery' } }),
          createBlock('buy_trust_item', { settings: { icon: 'BadgeCheck', text: 'COD available' } }),
          createBlock('buy_trust_item', { settings: { icon: 'RefreshCw', text: '14-day easy exchange' } }),
        ] }),
        createBlock('buy_accordion', { settings: {}, blocks: [
          createBlock('buy_accordion_item', { settings: { title: 'Description', open: true, body: '<p>Details about this piece.</p>' } }),
          createBlock('buy_accordion_item', { settings: { title: 'Shipping & returns', body: '<p>COD available nationwide. 14-day easy exchange.</p>' } }),
        ] }),
        createBlock('buy_meta', { settings: { showSKU: true, showCategory: true } }),
      ],
    });
    const related = createSection('related_products', {
      settings: { source: 'category', count: 4, columns: 4, layout: 'grid', showPrice: true, paddingTop: 56, paddingBottom: 56 },
      blocks: [createBlock('section_header', { settings: { eyebrow: 'Keep exploring', heading: 'You may also like' } })],
    });
    const reviews = createSection('product_reviews', {
      settings: { heading: 'Customer reviews', limit: 6, showSummary: true, showVerified: true, paddingTop: 0, paddingBottom: 56 },
    });
    return { template: 'product', ...sharedHeaderFooter(), body: [buyBox, related, reviews] };
  }

  if (type === 'collection') {
    const hero = createSection('collection_hero', {
      settings: { showTitle: true, showDescription: true, showCount: true, height: 260, overlay: 'rgba(0,0,0,.18)', align: 'left', paddingBottom: 24 },
    });
    const filters = createSection('collection_filters', {
      settings: { label: 'Sort by', showPriceSort: true, showAvailability: true, showCount: true, paddingBottom: 12 },
    });
    const grid = createSection('product_grid', {
      settings: {
        source: 'collection', gender: '', sort: 'newest', count: 12, columns: 4, mobileColumns: 2, layout: 'grid',
        showPrice: true, showSaleBadge: true, showQuickAdd: true, showWishlist: true, imageRatio: 'portrait',
        gapX: 12, gapY: 28, width: 'page', paddingTop: 0, paddingBottom: 64,
      },
    });
    return { template: 'collection', ...sharedHeaderFooter(), body: [hero, filters, grid] };
  }

  // page
  const rich = createSection('rich_text', {
    settings: { width: 'page', align: 'left', paddingTop: 48, paddingBottom: 48 },
    blocks: [
      createBlock('eyebrow', { settings: { text: 'HUSHAE' } }),
      createBlock('heading', { settings: { text: 'Your page title', tag: 'h1' } }),
      createBlock('text', { settings: { text: 'Edit this page in the Theme Editor — add images, FAQs, banners, forms and more.' } }),
    ],
  });
  const cta = createSection('cta_banner', {
    settings: { align: 'center', paddingTop: 32, paddingBottom: 56 },
    blocks: [
      createBlock('heading', { settings: { text: 'Have questions?' } }),
      createBlock('button', { settings: { label: 'Contact us', href: '/contact', variant: 'primary' } }),
    ],
  });
  return { template: 'page', ...sharedHeaderFooter(), body: [rich, cta] };

  if (type === 'blog') {
    const list = createSection('blog_list', {
      settings: { showFeatured: true, columns: 3, count: 9, showDate: true, showExcerpt: true, paddingTop: 48, paddingBottom: 64 },
    });
    return { template: 'blog', ...sharedHeaderFooter(), body: [list] };
  }

  // cart
  const cart = createSection('cart_page', {
    settings: { showShippingNote: true, showTrustBadges: true, paddingTop: 40, paddingBottom: 64 },
  });
  return { template: 'cart', ...sharedHeaderFooter(), body: [cart] };
}
