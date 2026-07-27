// Lightweight SEO helper — updates <title>, <meta description>, canonical, OG tags,
// and injects JSON-LD structured data. No dependency (no react-helmet needed).
// Usage:
//   <Seo title="..." description="..." image="..." canonical="/shop" jsonLd={{...}} />
import { useEffect } from 'react';

const SITE_NAME = 'HUSHAE';
const DEFAULT_TITLE = 'HUSHAE — Second Skin, First Choice.';
const DEFAULT_DESC = 'Premium innerwear for men and women. Made in Pakistan, finished to an international standard. Discreet packaging, COD nationwide.';
const DEFAULT_IMAGE = '/favicon.svg';

function upsertMeta(attr, key, value) {
  if (!value) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id, obj) {
  document.querySelectorAll(`script[data-seo="${id}"]`).forEach((s) => s.remove());
  if (!obj) return;
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.setAttribute('data-seo', id);
  s.textContent = JSON.stringify(obj);
  document.head.appendChild(s);
}

export default function Seo({ title, description, image, canonical, noIndex = false, jsonLd = null, jsonLdId = 'page' }) {
  useEffect(() => {
    const finalTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
    const finalDesc = description || DEFAULT_DESC;
    const site = typeof window !== 'undefined' ? window.location.origin : '';
    const finalImage = image ? (image.startsWith('http') ? image : `${site}${image}`) : `${site}${DEFAULT_IMAGE}`;
    const finalCanonical = canonical ? (canonical.startsWith('http') ? canonical : `${site}${canonical}`) : (typeof window !== 'undefined' ? window.location.href.split('?')[0].split('#')[0] : '');

    document.title = finalTitle;
    upsertMeta('name', 'description', finalDesc);
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    upsertLink('canonical', finalCanonical);

    // Open Graph (Facebook, WhatsApp preview)
    upsertMeta('property', 'og:type', jsonLd?.['@type'] === 'Product' ? 'product' : 'website');
    upsertMeta('property', 'og:title', finalTitle);
    upsertMeta('property', 'og:description', finalDesc);
    upsertMeta('property', 'og:image', finalImage);
    upsertMeta('property', 'og:url', finalCanonical);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'en_US');

    // Twitter card
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', finalTitle);
    upsertMeta('name', 'twitter:description', finalDesc);
    upsertMeta('name', 'twitter:image', finalImage);

    // JSON-LD structured data
    upsertJsonLd(jsonLdId, jsonLd);
  }, [title, description, image, canonical, noIndex, jsonLd, jsonLdId]);

  return null;
}

// Convenience: build a Product JSON-LD from a product record
export function productJsonLd(product, site = '') {
  if (!product) return null;
  const img = product.images?.[0]?.url || '';
  const finalImg = img ? (img.startsWith('http') ? img : `${site}${img}`) : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description || undefined,
    image: finalImg,
    sku: product.sku,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      priceCurrency: 'PKR',
      price: product.price,
      availability: (product.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

// Organization + WebSite schema for homepage
export function organizationJsonLd(site = '') {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${site}/#org`,
        name: SITE_NAME,
        url: site,
        logo: `${site}/favicon.svg`,
        sameAs: [], // filled from social links in Home.jsx
      },
      {
        '@type': 'WebSite',
        '@id': `${site}/#site`,
        url: site,
        name: SITE_NAME,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${site}/shop?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}
