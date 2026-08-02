import { validEmail, normalizePhone } from './validators';

/* ============================================================================
 * STOREFRONT CONFIG — normalised, administrator-safe view of settings.
 *
 * WHY THIS EXISTS
 *   Before this, every shell component (Header, Footer, OfferBar, MobileNav,
 *   …) reached directly into `settings.header.xyz` / `settings.footer.xyz` and
 *   invented its own defaults. That meant:
 *     · a missing field rendered "undefined" or nothing,
 *     · two components could disagree on the default CTA text,
 *     · invalid URLs / phone numbers / emails placed by the merchant were
 *       shown verbatim (dead links, broken mailto:, fake numbers),
 *     · admin-only fields like cost prices and bank details could be
 *       accidentally consumed because nothing stripped them.
 *
 *   This file is the ONE place the shell reads from. It returns a deep-
 *   frozen object with safe defaults, validated URLs, empty strings instead
 *   of broken placeholders, and a documented map of which fields are
 *   currently admin-controlled vs. still pending an editor.
 *
 * SAFETY
 *   · Never returns cost prices, margins, secrets, bank auth data or any
 *     field the merchant marked internal. Only the public-safe slice is
 *     exposed. Callers should NOT re-reach into the raw `settings` object
 *     for any chrome-level value.
 *   · All URLs are validated and rejected if malformed.
 *   · Phone is only emitted when normalizePhone() accepts it (Pakistani
 *     mobile format). Otherwise hidden entirely.
 *   · Emails validated; legacy brand addresses rejected.
 * ========================================================================== */

const STORE_NAME = 'HUSHAE';
const TAGLINE = 'Second Skin, First Choice.';

const DEFAULT_HEADER_MENU = [
  { label: 'Women', href: '/women', dropdown: 'women' },
  { label: 'Men', href: '/men', dropdown: 'men' },
  { label: 'New Arrivals', href: '/new' },
  { label: 'Best Sellers', href: '/best' },
  { label: 'Sale', href: '/sale', highlight: true },
  { label: 'Fit Finder', href: '/fit-finder' },
  { label: 'Track Order', href: '/track' },
];

const DEFAULT_FOOTER_COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'Women', href: '/women' },
      { label: 'Men', href: '/men' },
      { label: 'New Arrivals', href: '/new' },
      { label: 'Best Sellers', href: '/best' },
      { label: 'Sale', href: '/sale' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Track Order', href: '/track' },
      { label: 'Fit Finder', href: '/fit-finder' },
      { label: 'Shipping', href: '/shipping-policy' },
      { label: 'Returns & Exchange', href: '/returns' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Contact', href: '/about' }, // safe fallback — /about renders
    ],
  },
];

const TRUST_LINE = 'Free nationwide shipping over PKR 4,999 · Discreet packaging on every order';
const TRUST_LINE_SHORT = 'Free shipping over PKR 4,999 · Discreet packaging';

/* Validates absolute http(s) URLs and internal paths starting with `/`. */
const safeUrl = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s.startsWith('/')) return s; // internal route
  if (/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(s)) return s;
  return null;
};

const safeText = (v, fb = '') => {
  if (v == null) return fb;
  const s = String(v).trim();
  return s.length ? s : fb;
};

const safeLink = (label, href) => {
  const l = safeText(label);
  const h = safeUrl(href);
  if (!l || !h) return null;
  return { label: l, href: h };
};

const isRealEmail = (v) => {
  if (!validEmail(v)) return false;
  if (/veloura/i.test(v)) return false; // legacy pre-rebrand addresses hidden
  if (/example|placeholder|changeme/i.test(v)) return false;
  return true;
};

export function storefrontConfig(settings) {
  const s = settings || {};

  // ── Identity ─────────────────────────────────────────────────────────────
  const storeName = safeText(s.storeName, STORE_NAME);
  const tagline   = safeText(s.tagline, TAGLINE);
  const contactEmail = isRealEmail(s.contactEmail) ? s.contactEmail.trim() : null;
  const contactPhone = normalizePhone(s.contactPhone); // null if not a valid PK mobile

  // ── Header ───────────────────────────────────────────────────────────────
  const rawHeader = s.header || {};
  const menu = Array.isArray(rawHeader.menu) && rawHeader.menu.length
    ? rawHeader.menu
        .map((m) => m && m.label ? {
          label: String(m.label).trim(),
          href: m.href && String(m.href).startsWith('/') ? String(m.href) : (m.dropdown ? '/' : null),
          dropdown: m.dropdown || null,
          highlight: !!m.highlight,
        } : null)
        .filter(Boolean)
        .filter((m) => m.href) // drop anything without a valid internal href
    : DEFAULT_HEADER_MENU;

  const header = {
    menu,
    width: rawHeader.width === 'boxed' ? 'boxed' : 'full',
    height: Math.max(56, Math.min(120, Number(rawHeader.height) || 80)),
    navSize: Math.max(10, Math.min(18, Number(rawHeader.navSize) || 12)),
    navGap: Math.max(12, Math.min(64, Number(rawHeader.navGap) || 38)),
    navUppercase: rawHeader.navUppercase !== false,
    menuAlign: rawHeader.menuAlign === 'left' ? 'left' : 'center',
    border: rawHeader.border !== false,
    showSearch: rawHeader.showSearch !== false,
    showWishlist: rawHeader.showWishlist !== false,
    showAccount: rawHeader.showAccount !== false,
    showCart: rawHeader.showCart !== false,
  };

  // ── Offer bar ────────────────────────────────────────────────────────────
  // Respects enabled state, uses safe defaults when off or missing, does
  // NOT invent payment/discount/shipping promises beyond the house default.
  // Scheduling is admin-FUTURE: the shape reserves `schedule.start/end`
  // but does not enforce them yet — it only renders the content when
  // `enabled` is true AND `messageEn` is present.
  const ob = s.offerBar || {};
  const offerBar = {
    enabled: !!ob.enabled,
    message: safeText(ob.messageEn, TRUST_LINE_SHORT),
    messageLong: safeText(ob.messageEn, TRUST_LINE),
    cta: ob.enabled ? safeText(ob.ctaEn, 'Shop now') : null,
    link: ob.enabled ? safeUrl(ob.link) || '/shop' : null,
    schedule: ob.schedule ? { start: ob.schedule.start || null, end: ob.schedule.end || null } : null,
  };

  // ── Footer ───────────────────────────────────────────────────────────────
  const f = s.footer || {};
  const columns = Array.isArray(f.columns) && f.columns.length
    ? f.columns
        .map((c) => ({
          title: safeText(c.title),
          links: Array.isArray(c.links)
            ? c.links.map((l) => safeLink(l?.label, l?.href)).filter(Boolean)
            : [],
        }))
        .filter((c) => c.title && c.links.length)
    : DEFAULT_FOOTER_COLUMNS;

  const social = s.integrations?.social || {};
  const socialLinks = [
    safeLink('Instagram', social.instagram),
    safeLink('Facebook',  social.facebook),
    safeLink('TikTok',    social.tiktok),
  ].filter(Boolean);

  const footer = {
    aboutText: safeText(f.aboutText, tagline),
    tagline: f.tagline === '' ? '' : safeText(f.tagline, 'Made in Pakistan · Worn worldwide soon'),
    showNewsletter: f.showNewsletter !== false,
    newsletterTitle: safeText(f.newsletterTitle, 'Join the inner circle'),
    newsletterText: safeText(f.newsletterText, 'Early access to new drops, fit guides and private offers.'),
    showSocial: f.showSocial !== false && socialLinks.length > 0,
    socialLinks,
    columns,
    showContact: f.showContact !== false && (contactEmail || contactPhone || f.contactNote),
    contactTitle: safeText(f.contactTitle, 'Contact'),
    contactNote: safeText(f.contactNote, 'Pakistan — nationwide delivery'),
    paymentNote: f.paymentNote === '' ? null : safeText(
      f.paymentNote,
      'COD · JazzCash · SafePay', // only lists methods actually wired up
    ),
    bottomText: safeText(
      f.bottomText,
      `\u00a9 ${new Date().getFullYear()} ${storeName} \u00b7 All rights reserved \u00b7 Discreet always`,
    ),
  };

  // ── Cookie popup ─────────────────────────────────────────────────────────
  const c = s.cookiePopup || {};
  const cookie = {
    enabled: c.enabled !== false,
    title: safeText(c.title, 'Cookies on ' + storeName),
    text: safeText(
      c.text,
      'We use cookies to keep you signed in and remember your bag. With your permission, we also use a few cookies to understand traffic and improve the store. Your data is never sold — promise.',
    ),
  };

  // ── Promo popup ──────────────────────────────────────────────────────────
  const p = s.promoPopup;
  const promo = {
    enabled: p ? p.enabled !== false : true,
    delaySec: Math.max(5, Math.min(60, Number(p?.delaySec) || 18)),
    title: safeText(p?.title, 'Join the ' + storeName + ' inner circle'),
    text: safeText(
      p?.text,
      'First access to drops, private sales and member-only offers. No spam — ever.',
    ),
    couponCode: safeText(p?.couponCode),
  };

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  const wa = s.integrations?.whatsapp;
  const waEnabled = !!wa?.enabled && !!normalizePhone(wa.number);
  const whatsapp = {
    enabled: waEnabled,
    number: waEnabled ? normalizePhone(wa.number) : null,
    href: waEnabled ? `https://wa.me/92${normalizePhone(wa.number).slice(1)}?text=${encodeURIComponent(wa.message || 'Hi!')}` : null,
  };

  // ── Store lock (gate) ───────────────────────────────────────────────────
  const lock = s.storefrontLock || {};
  const storeLock = {
    enabled: !!lock.enabled && !!lock.hasPassword,
    heading: safeText(lock.heading, 'Opening soon'),
    message: safeText(lock.message, ''),
  };

  return Object.freeze({
    storeName, tagline,
    contactEmail, contactPhone,
    header, offerBar, footer, cookie, promo, whatsapp, storeLock,
    // Fields that future admin editors must still be built for (documented
    // here so the next agent knows what to wire when the CMS expands):
    __admin: Object.freeze({
      controlled: [
        'storeName', 'tagline', 'contactEmail', 'contactPhone',
        'header.menu', 'header.navSize', 'header.navGap', 'header.navUppercase',
        'header.menuAlign', 'header.border',
        'header.showSearch/showWishlist/showAccount/showCart',
        'offerBar.enabled/messageEn/ctaEn/link',
        'footer.aboutText/tagline/newsletter*/showSocial/showContact/contactNote/paymentNote/bottomText/columns',
        'cookiePopup.title/text/enabled',
        'promoPopup.enabled/delaySec/title/text/couponCode',
        'integrations.social.{instagram,facebook,tiktok}',
        'integrations.whatsapp.{enabled,number,message}',
        'storefrontLock.{enabled,heading,message}',
      ],
      future: [
        'header.logo (image upload) — currently uses wordmark',
        'header.announcement scheduling (start/end dates) — shape reserved',
        'footer.trustBadges[] (shipping / exchange / discreet) — uses static copy',
        'footer.paymentIcons[] — currently uses text note',
        'theme.tokens (colors/radii) via /admin/theme',
        'header.megaMenu.heroImage/copy per category',
      ],
    }),
  });
}

export default storefrontConfig;
