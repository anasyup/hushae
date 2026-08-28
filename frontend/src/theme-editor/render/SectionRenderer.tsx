import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck, ChevronDown, ChevronLeft, ChevronRight, Lock, Minus, Plus, RefreshCw,
  ShoppingBag, ShieldCheck, Star, Trash2, Truck, X, Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { BlockNode, SectionNode } from '../core/types';
import { BlockRenderer, Icon } from './BlockRenderer';
import { useRenderCtx } from './RenderContext';
import { resolveIcon } from '../ui/iconRegistry';
import { api as apiFetch } from '../../api/client';
import { useApp, lineKey } from '../../store/AppContext';
import { useCartPricing } from '../../pages/cart/useCartPricing';
import { cartConfig } from '../../lib/cartConfig';
import { pkr, fmtDate } from '../../lib/format';
import {
  alignClass, animationProps, bool, buttonStyle, containerClass, num,
  RATIO, sectionStyle, str, visibilityClass,
} from './styleUtils';

/* ============================================================================
 * Section renderer.
 * Sections own their layout; blocks own their content. Product-backed sections
 * request data through the render context so the same component works in the
 * editor preview and on the live storefront.
 * ========================================================================== */

export const SectionRenderer = memo(function SectionRenderer({ section }: { section: SectionNode }) {
  const { editable, theme, selectedId, hoveredId, onSelect, onHover } = useRenderCtx();
  if (section.hidden) return null;

  const s = section.settings || {};
  const anim = animationProps(s, theme.animEnabled !== false);
  const style = sectionStyle(s);

  const wrapperProps = editable
    ? {
      'data-node-id': section.id,
      onClick: (e: React.MouseEvent) => { e.stopPropagation(); onSelect?.(section.id); },
      onMouseOver: (e: React.MouseEvent) => { e.stopPropagation(); onHover?.(section.id); },
      onMouseOut: () => onHover?.(null),
    }
    : {};

  const cls = [
    'te-section relative',
    editable ? 'te-node' : '',
    editable && selectedId === section.id ? 'te-selected' : '',
    editable && hoveredId === section.id ? 'te-hovered' : '',
    visibilityClass(s),
    str(s.cssClass),
  ].filter(Boolean).join(' ');

  const motionProps = {
    id: str(s.anchorId) || undefined,
    className: cls,
    style,
    'data-type': section.type,
    ...wrapperProps,
    ...anim,
  } as Record<string, unknown>;

  return (
    <motion.section {...motionProps}>
      {str(s.customCss) && <style>{scopeCss(str(s.customCss), section.id)}</style>}
      <SectionBody section={section} />
    </motion.section>
  );
});

function scopeCss(css: string, id: string) {
  // Naive scoping: prefix every top-level selector with the section attribute.
  return css.replace(/(^|\})\s*([^{@}]+)\s*\{/g, (_m, brace, sel) =>
    `${brace} [data-node-id="${id}"] ${sel.trim()} {`);
}

const kids = (n: SectionNode | BlockNode, type: string) => (n.blocks || []).filter((b) => b.type === type);
const notTypes = (n: SectionNode | BlockNode, types: string[]) => (n.blocks || []).filter((b) => !types.includes(b.type));

function SectionBody({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const wrap = containerClass(s.width);

  switch (section.type) {
    // ══ HEADER ══════════════════════════════════════════════════════════════
    case 'announcement_bar': return <AnnouncementBar section={section} />;
    case 'header': return <HeaderSection section={section} />;

    // ══ BANNERS ═════════════════════════════════════════════════════════════
    case 'hero': return <HeroSection section={section} />;
    case 'slideshow': return <Slideshow section={section} />;
    case 'split_hero': return <SplitHero section={section} />;
    case 'image_banner': return <ImageBanner section={section} />;

    // ══ PRODUCTS ════════════════════════════════════════════════════════════
    case 'featured_collection':
    case 'product_grid': return <ProductSection section={section} />;
    case 'featured_marquee': return <FeaturedMarqueeSection section={section} />;
    case 'featured_collections': return <FeaturedCollectionsSection section={section} />;
    case 'editorial': return <EditorialSection section={section} />;
    case 'cta_banner': return <CtaBanner section={section} />;
    case 'featured_product': return <FeaturedProduct section={section} />;
    case 'collection_list': return <CollectionList section={section} />;

    // ══ PRODUCT / COLLECTION TEMPLATE (Shopify OS 2.0 sections) ════════════
    case 'product_buy_box': return <ProductBuyBox section={section} />;
    case 'related_products': return <RelatedProducts section={section} />;
    case 'product_reviews': return <ProductReviews section={section} />;
    case 'collection_hero': return <CollectionHero section={section} />;
    case 'collection_filters': return <CollectionFilters section={section} />;

    // ══ BLOG / CART TEMPLATE ═══════════════════════════════════════════════
    case 'blog_list': return <BlogList section={section} />;
    case 'cart_page': return <CartPage section={section} />;

    // ══ CONTENT ═════════════════════════════════════════════════════════════
    case 'rich_text':
      return (
        <div className={wrap}>
          <div className={`mx-auto flex max-w-3xl flex-col gap-4 ${alignClass(s.align, 'items')} ${alignClass(s.align)}`}>
            {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
          </div>
        </div>
      );

    case 'marquee': return <Marquee section={section} />;

    case 'icon_row': {
      const cols = num(s.columns, 4);
      return (
        <div className={wrap}>
          <div className={bool(s.card, true) ? 'rounded-[var(--t-radius)] border p-8' : ''}
            style={bool(s.card, true) ? { borderColor: 'var(--t-border)', background: 'var(--t-surface)' } : undefined}>
            <div className="te-grid" style={{ '--cols': cols, '--mcols': 2, gap: 24 } as CSSProperties}>
              {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
            </div>
          </div>
        </div>
      );
    }

    case 'gallery': {
      const cols = num(s.columns, 3);
      return (
        <div className={wrap}>
          <div className={bool(s.masonry) ? 'te-masonry' : 'te-grid'}
            style={{ '--cols': cols, '--mcols': 2, gap: num(s.gap, 12), columnCount: bool(s.masonry) ? cols : undefined } as CSSProperties}>
            {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
          </div>
        </div>
      );
    }

    case 'testimonials': {
      const header = kids(section, 'section_header');
      const items = notTypes(section, ['section_header']);
      const carousel = str(s.layout, 'grid') === 'carousel';
      return (
        <div className={wrap}>
          {header.map((b) => <BlockRenderer key={b.id} block={b} />)}
          {carousel ? (
            <div className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2">
              {items.map((b) => (
                <div key={b.id} className="w-[80%] shrink-0 snap-start md:w-[38%]"><BlockRenderer block={b} /></div>
              ))}
            </div>
          ) : (
            <div className="te-grid" style={{ '--cols': num(s.columns, 3), '--mcols': 1, gap: 20 } as CSSProperties}>
              {items.map((b) => <BlockRenderer key={b.id} block={b} />)}
            </div>
          )}
        </div>
      );
    }

    case 'faq': {
      const header = kids(section, 'section_header');
      const items = notTypes(section, ['section_header']);
      return (
        <div className={wrap}>
          <div className="mx-auto" style={{ maxWidth: num(s.maxWidth, 760) }}>
            {header.map((b) => <BlockRenderer key={b.id} block={b} />)}
            {items.map((b) => <BlockRenderer key={b.id} block={b} />)}
          </div>
        </div>
      );
    }

    case 'tabs': return <Tabs section={section} />;

    case 'timeline': {
      const header = kids(section, 'section_header');
      const items = notTypes(section, ['section_header']);
      const horizontal = str(s.orientation, 'vertical') === 'horizontal';
      return (
        <div className={wrap}>
          {header.map((b) => <BlockRenderer key={b.id} block={b} />)}
          <div className={horizontal ? 'te-grid' : 'relative flex flex-col gap-8 border-l pl-1'}
            style={horizontal
              ? ({ '--cols': Math.min(4, items.length || 1), '--mcols': 1, gap: 24 } as CSSProperties)
              : { borderColor: 'var(--t-border)' }}>
            {items.map((b) => <BlockRenderer key={b.id} block={b} />)}
          </div>
        </div>
      );
    }

    case 'video_section':
      return (
        <div className={wrap}>
          {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
          <video src={str(s.src)} poster={str(s.poster) || undefined}
            autoPlay={bool(s.autoplay)} loop={bool(s.loop, true)} muted controls={bool(s.controls, true)} playsInline
            className="mt-6 w-full rounded-[var(--t-radius)]" style={{ aspectRatio: RATIO[str(s.ratio, '16/9')], objectFit: 'cover' }} />
        </div>
      );

    case 'countdown_section':
      return (
        <div className={wrap}>
          <div className={`flex flex-col gap-5 ${alignClass(s.align, 'items')} ${alignClass(s.align)}`}>
            {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
          </div>
        </div>
      );

    case 'newsletter': return <Newsletter section={section} />;
    case 'contact_form': return <ContactForm section={section} />;

    case 'map':
      return (
        <div className={wrap}>
          <iframe title="Map" loading="lazy" className="w-full rounded-[var(--t-radius)] border-0"
            style={{ height: num(s.height, 400) }}
            src={`https://www.google.com/maps?q=${encodeURIComponent(str(s.query, 'Pakistan'))}&z=${num(s.zoom, 13)}&output=embed`} />
        </div>
      );

    case 'blog_posts': return <BlogPosts section={section} />;

    case 'custom_html': case 'custom_liquid':
      return <div className={wrap}>{(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}</div>;

    // ══ FOOTER ══════════════════════════════════════════════════════════════
    case 'footer': return <FooterSection section={section} />;

    default:
      return (
        <div className={wrap}>
          <div className="rounded-lg border border-dashed p-6 text-center text-sm opacity-60">
            Unknown section “{section.type}”
          </div>
        </div>
      );
  }
}

/* ── Header ────────────────────────────────────────────────────────────── */
function AnnouncementBar({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const items = (section.blocks || []).filter((b) => !b.hidden);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!bool(s.autoRotate, true) || items.length < 2) return undefined;
    const t = setInterval(() => setI((p) => (p + 1) % items.length), num(s.speed, 5) * 1000);
    return () => clearInterval(t);
  }, [s.autoRotate, s.speed, items.length]);
  if (!bool(s.enabled, true) || !items.length) return null;
  const b = items[Math.min(i, items.length - 1)];
  const cfg = b.settings;
  return (
    <div className="flex items-center justify-center gap-3 px-4 text-center"
      style={{ background: str(s.background, '#0D0D0D'), color: str(s.textColor, '#F7F5F1'), minHeight: num(s.height, 38) }}>
      <span className="text-[11.5px] tracking-wide">{str(cfg.text)}</span>
      {str(cfg.ctaLabel) && (
        <a href={str(cfg.ctaHref, '#')} onClick={(e) => e.preventDefault()}
          className="text-[13px] font-bold uppercase tracking-widest underline underline-offset-2">{str(cfg.ctaLabel)}</a>
      )}
    </div>
  );
}

function HeaderSection({ section }: { section: SectionNode }) {
  const { data } = useRenderCtx();
  const s = section.settings || {};
  const logo = (section.blocks || []).find((b) => b.type === 'logo' && !b.hidden);
  const menu = (section.blocks || []).find((b) => b.type === 'menu' && !b.hidden);
  const icons = (section.blocks || []).find((b) => b.type === 'header_icons' && !b.hidden);
  const layout = str(s.layout, 'logo-left');

  const Logo = logo ? <LogoBlock block={logo} /> : null;
  const Menu = menu ? <MenuBlock block={menu} categories={data.categories} /> : null;
  const IconRow = icons ? <IconsBlock block={icons} /> : null;

  return (
    <header
      className={`relative z-30 ${bool(s.border, true) ? 'border-b' : ''}`}
      style={{
        background: str(s.background) || 'var(--t-bg)',
        color: str(s.textColor) || 'var(--t-text)',
        borderColor: 'var(--t-border)',
      }}>
      <div className={`${containerClass(str(s.width, 'full'))} relative flex items-center gap-4`} style={{ minHeight: num(s.height, 80) }}>
        {layout === 'menu-left' ? (
          <><div className="flex-1">{Menu}</div>{Logo}<div className="flex flex-1 justify-end">{IconRow}</div></>
        ) : layout === 'logo-center' ? (
          <div className="flex w-full flex-col items-center gap-2 py-2">
            <div className="flex w-full items-center justify-between">
              <span className="w-24" />{Logo}<div className="flex w-24 justify-end">{IconRow}</div>
            </div>
            {Menu}
          </div>
        ) : (
          <>
            {Logo}
            <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">{Menu}</div>
            <div className="ml-auto">{IconRow}</div>
          </>
        )}
      </div>
    </header>
  );
}

function LogoBlock({ block }: { block: BlockNode }) {
  const s = block.settings;
  const { editable, selectedId, onSelect, onHover } = useRenderCtx();
  const props = editable ? {
    'data-node-id': block.id,
    className: `te-node ${selectedId === block.id ? 'te-selected' : ''}`,
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); onSelect?.(block.id); },
    onMouseOver: (e: React.MouseEvent) => { e.stopPropagation(); onHover?.(block.id); },
    onMouseOut: () => onHover?.(null),
  } : {};
  if (str(s.kind, 'text') === 'image' && str(s.image)) {
    return <span {...props}><img src={str(s.image)} alt="Logo" style={{ width: num(s.width, 130) }} className="h-auto max-h-12 object-contain" /></span>;
  }
  return (
    <span {...props}
      className={`${props.className || ''} select-none font-semibold ${bool(s.boxed, true) ? 'inline-flex items-center border px-3 py-1.5' : ''}`}
      style={{
        fontFamily: 'var(--t-font-heading)', fontSize: num(s.size, 20),
        letterSpacing: `${num(s.tracking, 32) / 100}em`, borderColor: 'currentColor',
      }}>
      {str(s.text, 'HUSHAE')}
    </span>
  );
}

function MenuBlock({ block, categories }: { block: BlockNode; categories: any[] }) {
  const s = block.settings;
  const { editable, selectedId, onSelect, onHover } = useRenderCtx();
  const items = (block.blocks || []).filter((b) => !b.hidden);
  const props = editable ? {
    'data-node-id': block.id,
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); onSelect?.(block.id); },
    onMouseOver: (e: React.MouseEvent) => { e.stopPropagation(); onHover?.(block.id); },
    onMouseOut: () => onHover?.(null),
    className: `te-node ${selectedId === block.id ? 'te-selected' : ''}`,
  } : {};
  return (
    <nav {...props} className={`${props.className || ''} hidden items-center md:flex`} style={{ gap: num(s.gap, 28) }}>
      {items.map((it) => {
        const cfg = it.settings;
        const drop = str(cfg.dropdown);
        const kids = (it.blocks || []).filter((c) => !c.hidden);
        const isMega = drop === 'mega';
        const simple = drop === 'children'
          ? kids.filter((c) => c.type === 'menu_item').map((c) => ({ name: str(c.settings.label), slug: str(c.settings.href) }))
          : (drop === 'women' || drop === 'men')
            ? categories.filter((c) => c.gender === drop).map((c) => ({ name: c.name, slug: `/category/${c.slug}` }))
            : [];
        const LinkIcon = str(cfg.icon) ? resolveIcon(str(cfg.icon)) : null;
        return (
          <span key={it.id} className="group static md:relative"
            data-node-id={editable ? it.id : undefined}
            onClick={editable ? (e) => { e.stopPropagation(); onSelect?.(it.id); } : undefined}>
            <a href={str(cfg.href, '#')} onClick={(e) => e.preventDefault()}
              className={`inline-flex items-center gap-1.5 ${bool(s.uppercase, true) ? 'uppercase' : ''} font-semibold tracking-widest transition hover:opacity-70`}
              style={{ fontSize: num(s.size, 12), color: cfg.highlight ? 'var(--t-accent)' : undefined }}>
              {LinkIcon ? <LinkIcon size={13} /> : null}
              {str(cfg.label)}
            </a>

            {/* Simple dropdown */}
            {!isMega && simple.length > 0 && (
              <span className="invisible absolute left-1/2 top-full z-40 -translate-x-1/2 pt-4 opacity-0 transition group-hover:visible group-hover:opacity-100">
                <span className="block w-52 rounded-2xl border p-2 shadow-lg"
                  style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                  {simple.map((c, i) => (
                    <a key={i} href={c.slug} onClick={(e) => e.preventDefault()}
                      className="block rounded-xl px-4 py-2.5 text-sm hover:opacity-70">{c.name}</a>
                  ))}
                </span>
              </span>
            )}

            {/* Mega menu — merchant-built columns plus an optional promo card */}
            {isMega && kids.length > 0 && (
              <span className="invisible absolute inset-x-0 top-full z-40 pt-4 opacity-0 transition group-hover:visible group-hover:opacity-100">
                <span className="mx-auto block w-full max-w-[var(--t-page-width)] rounded-2xl border p-6 shadow-xl"
                  style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                  <span className="te-grid" style={{ '--cols': num(cfg.megaColumns, 4), '--mcols': 2, gap: 24 } as CSSProperties}>
                    {kids.map((col) => {
                      if (col.type === 'menu_promo') {
                        const pc = col.settings;
                        return (
                          <a key={col.id} href={str(pc.href, '#')} onClick={(e) => e.preventDefault()}
                            data-node-id={editable ? col.id : undefined}
                            className="block overflow-hidden rounded-xl" style={{ background: 'var(--t-muted)' }}>
                            <img src={str(pc.image) || heroPlaceholder} alt="" className="h-28 w-full object-cover" />
                            <span className="block p-3">
                              <span className="block text-sm font-semibold">{str(pc.title)}</span>
                              <span className="mt-0.5 block text-xs" style={{ color: 'var(--t-text-muted)' }}>{str(pc.text)}</span>
                              <span className="mt-2 inline-block text-[13px] font-bold uppercase tracking-widest underline underline-offset-4">
                                {str(pc.ctaLabel, 'Shop now')}
                              </span>
                            </span>
                          </a>
                        );
                      }
                      const links = (col.blocks || []).filter((l) => !l.hidden);
                      return (
                        <span key={col.id} className="block" data-node-id={editable ? col.id : undefined}>
                          <a href={str(col.settings.titleHref, '#')} onClick={(e) => e.preventDefault()}
                            className="mb-2 block text-[13px] font-bold uppercase tracking-widest" style={{ color: 'var(--t-text-muted)' }}>
                            {str(col.settings.title)}
                          </a>
                          {links.map((l) => (
                            <a key={l.id} href={str(l.settings.href, '#')} onClick={(e) => e.preventDefault()}
                              className="block py-1.5 text-sm transition hover:opacity-70">{str(l.settings.label)}</a>
                          ))}
                        </span>
                      );
                    })}
                  </span>
                </span>
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function IconsBlock({ block }: { block: BlockNode }) {
  const s = block.settings;
  const { editable, selectedId, onSelect } = useRenderCtx();
  const list: Array<[string, string]> = [
    ['search', 'Search'], ['wishlist', 'Heart'], ['account', 'User'], ['cart', 'ShoppingBag'],
  ];
  return (
    <div data-node-id={editable ? block.id : undefined}
      onClick={editable ? (e) => { e.stopPropagation(); onSelect?.(block.id); } : undefined}
      className={`flex items-center gap-1 ${editable ? 'te-node' : ''} ${selectedId === block.id ? 'te-selected' : ''}`}>
      {list.filter(([k]) => bool(s[k], true)).map(([k, icon]) => (
        <span key={k} className="rounded-full p-2 transition hover:bg-black/5"><Icon name={icon} size={19} /></span>
      ))}
    </div>
  );
}

/* ── Banners ───────────────────────────────────────────────────────────── */
const HEIGHTS: Record<string, string> = { screen: '100svh', lg: '78vh', md: '58vh', sm: '40vh' };
const POS: Record<string, string> = {
  'top-left': 'items-start justify-start text-left',
  'top-center': 'items-start justify-center text-center',
  'top-right': 'items-start justify-end text-right',
  'center-left': 'items-center justify-start text-left',
  center: 'items-center justify-center text-center',
  'center-right': 'items-center justify-end text-right',
  'bottom-left': 'items-end justify-start text-left',
  'bottom-center': 'items-end justify-center text-center',
  'bottom-right': 'items-end justify-end text-right',
};
const OBJECT_POS: Record<string, string> = {
  top: 'center top', bottom: 'center bottom', left: 'left center', right: 'right center', center: 'center',
};

function HeroSection({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const h = str(s.height, 'screen');
  const height = h === 'custom' ? `${num(s.customHeight, 640)}px` : HEIGHTS[h] || '100svh';
  const overlay = num(s.overlay, 45) / 100;
  return (
    <div className="relative flex overflow-hidden" style={{ minHeight: height, background: 'var(--t-primary)' }}>
      {str(s.video)
        ? <video src={str(s.video)} poster={str(s.image) || undefined} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
        : <img src={str(s.image) || heroPlaceholder} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(to top, ${hexA(str(s.overlayColor, '#0D0D0D'), Math.min(0.95, overlay + 0.25))} 0%, ${hexA(str(s.overlayColor, '#0D0D0D'), overlay)} 45%, ${hexA(str(s.overlayColor, '#0D0D0D'), Math.max(0, overlay - 0.3))} 100%)`,
      }} />
      <div className={`relative z-10 flex w-full ${POS[str(s.position, 'bottom-left')] || POS['bottom-left']} ${containerClass(s.width)}`}
        style={{ paddingBlock: 56 }}>
        <div className="flex flex-col gap-5" style={{ maxWidth: num(s.contentWidth, 720), color: '#F7F5F1' }}>
          {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
        </div>
      </div>
    </div>
  );
}

function SplitHero({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const overlay = num(s.overlay, 25) / 100;
  const half = (img: string, video: string, label: string) => (
    <div className="relative flex-1 overflow-hidden">
      {video ? <video src={video} autoPlay muted loop playsInline className="h-full w-full object-cover" />
        : <img src={img || heroPlaceholder} alt="" className="h-full w-full object-cover" />}
      <div className="absolute inset-0" style={{ background: `rgba(13,13,13,${overlay})` }} />
      <div className="absolute inset-x-0 bottom-8 flex justify-center">
        <span style={buttonStyle({ style: 'solid', size: 'md', bg: '#F7F5F1', fg: '#0D0D0D' })}>{label}</span>
      </div>
    </div>
  );
  return (
    <div className="relative">
      <div className="flex flex-col md:flex-row" style={{ minHeight: num(s.height, 620) }}>
        {half(str(s.leftImage), str(s.leftVideo), str(s.leftLabel, 'Shop Women'))}
        {half(str(s.rightImage), str(s.rightVideo), str(s.rightLabel, 'Shop Men'))}
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex max-w-xl flex-col items-center gap-3 px-6 text-center" style={{ color: '#F7F5F1' }}>
          {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
        </div>
      </div>
    </div>
  );
}

function ImageBanner({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const side = str(s.imageSide, 'full');
  const height = HEIGHTS[str(s.height, 'md')] || '58vh';
  const content = (
    <div className={`flex flex-col gap-4 ${alignClass(s.align, 'items')} ${alignClass(s.align)}`}>
      {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
    </div>
  );
  if (side === 'full') {
    return (
      <div className="relative flex items-center overflow-hidden" style={{ minHeight: height }}>
        <img src={str(s.image) || heroPlaceholder} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: `rgba(13,13,13,${num(s.overlay, 25) / 100})` }} />
        <div className={`relative z-10 ${containerClass(s.width)}`} style={{ color: '#F7F5F1' }}>{content}</div>
      </div>
    );
  }
  return (
    <div className={containerClass(s.width)}>
      <div className={`grid items-center gap-10 md:grid-cols-2 ${side === 'right' ? 'md:[&>*:first-child]:order-2' : ''}`}>
        <img src={str(s.image) || heroPlaceholder} alt="" className="w-full rounded-[var(--t-radius)] object-cover" style={{ maxHeight: height }} />
        {content}
      </div>
    </div>
  );
}

function Slideshow({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const slides = (section.blocks || []).filter((b) => b.type === 'slide' && !b.hidden);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!bool(s.autoplay, true) || slides.length < 2) return undefined;
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), num(s.interval, 6) * 1000);
    return () => clearInterval(t);
  }, [s.autoplay, s.interval, slides.length]);
  if (!slides.length) return <div className={containerClass(s.width)}><Empty label="Add a slide" /></div>;
  const cur = slides[Math.min(i, slides.length - 1)];
  const cfg = cur.settings;
  const height = HEIGHTS[str(s.height, 'lg')] || '78vh';
  const objectFit = str(cfg.fit, 'cover') as CSSProperties['objectFit'];
  const objectPosition = OBJECT_POS[str(cfg.focal, 'center')] || 'center';
  const mobileSrc = str(cfg.mobileImage);
  return (
    <div className="relative overflow-hidden" style={{ minHeight: height }}>
      {str(cfg.video) ? (
        <video src={str(cfg.video)} poster={str(cfg.poster) || undefined} autoPlay muted loop playsInline
          className="absolute inset-0 h-full w-full" style={{ objectFit, objectPosition }} />
      ) : mobileSrc ? (
        <picture>
          <source media="(max-width: 767px)" srcSet={mobileSrc} />
          <img src={str(cfg.image) || heroPlaceholder} alt="" className="absolute inset-0 h-full w-full" style={{ objectFit, objectPosition }} />
        </picture>
      ) : (
        <img src={str(cfg.image) || heroPlaceholder} alt="" className="absolute inset-0 h-full w-full" style={{ objectFit, objectPosition }} />
      )}
      <div className="absolute inset-0" style={{ background: hexA(str(cfg.overlayColor, '#0D0D0D'), num(cfg.overlay, 30) / 100) }} />
      <div className={`relative z-10 flex ${POS[str(cfg.position, 'bottom-left')] || POS['bottom-left']} ${containerClass('page')}`}
        style={{ minHeight: height, paddingBlock: 56, color: str(cfg.textColor, '#F7F5F1') }}>
        <div className="flex flex-col gap-4" style={{ maxWidth: num(cfg.contentWidth, 640) }}>
          {(cur.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
        </div>
      </div>
      {bool(s.showArrows, true) && slides.length > 1 && (
        <>
          <Arrow dir="left" onClick={() => setI((p) => (p - 1 + slides.length) % slides.length)} />
          <Arrow dir="right" onClick={() => setI((p) => (p + 1) % slides.length)} />
        </>
      )}
      {bool(s.showDots, true) && slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-5 z-10 flex justify-center gap-2">
          {slides.map((_, j) => (
            <button key={j} onClick={() => setI(j)} aria-label={`Slide ${j + 1}`}
              className="h-1.5 rounded-full transition-all"
              style={{ width: j === i ? 26 : 8, background: j === i ? '#F7F5F1' : 'rgba(247,245,241,.5)' }} />
          ))}
        </div>
      )}
    </div>
  );
}

const Arrow = ({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) => (
  <button onClick={onClick} aria-label={dir}
    className="absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full backdrop-blur transition hover:scale-105"
    style={{ [dir]: 16, background: 'rgba(255,255,255,.85)' } as CSSProperties}>
    {dir === 'left' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
  </button>
);

/* ── Products ──────────────────────────────────────────────────────────── */
function buildQuery(s: SectionNode['settings']) {
  const limit = Math.max(2, Math.min(24, num(s.count, 8)));
  if (str(s.source) === 'trending') return `/products/trending?limit=${limit}`;
  const p = new URLSearchParams();
  p.set('limit', String(limit));
  if (s.sort) p.set('sort', str(s.sort));
  if (s.gender) p.set('gender', str(s.gender));
  switch (str(s.source, 'featured')) {
    case 'bestSeller': p.set('bestSeller', 'true'); break;
    case 'sale': p.set('sale', 'true'); break;
    case 'newest': p.set('sort', 'newest'); break;
    case 'collection': if (s.collection) p.set('category', str(s.collection)); break;
    case 'manual': if (Array.isArray(s.products) && s.products.length) p.set('ids', (s.products as string[]).join(',')); break;
    default: p.set('featured', 'true');
  }
  return `/products?${p.toString()}`;
}

function ProductSection({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { getProducts, requestProducts, data } = useRenderCtx();
  const sort = data.collectionSort;
  const query = useMemo(() => {
    const base = buildQuery(s);
    // Collection template: a grid with source 'collection' and no explicit
    // category binds to the current collection, and honours the sort chosen
    // by the collection_filters section.
    if (str(s.source, 'featured') === 'collection' && !s.collection && data.collectionSlug) {
      const p = new URLSearchParams();
      p.set('category', String(data.collectionSlug));
      p.set('count', String(num(s.count, 12)));
      p.set('sort', String(sort || s.sort || 'newest'));
      if (s.gender) p.set('gender', str(s.gender));
      return `/products?${p.toString()}`;
    }
    if (sort && base.includes('sort=')) return base.replace(/sort=[^&]*/, `sort=${sort}`);
    return base;
  }, [s.source, s.count, s.sort, s.gender, s.collection, s.products, sort, data.collectionSlug]);
  useEffect(() => { requestProducts(query, query); }, [query, requestProducts]);
  const products = getProducts(query);

  const header = kids(section, 'section_header');
  const card = (section.blocks || []).find((b) => b.type === 'product_card');
  const cols = num(s.columns, 4);
  const mcols = num(s.mobileColumns, 2);
  const carousel = str(s.layout, 'grid') === 'carousel';
  const mobCarousel = !carousel && bool(s.carouselMobile);

  const list = products ?? Array.from({ length: Math.min(num(s.count, 8), 8) }).map(() => null);

  const renderCard = (p: any, i: number) =>
    card
      ? <BlockRenderer key={p?._id || i} block={card} scope={{ product: p || skeletonProduct }} />
      : <div key={i} className="aspect-[4/5] animate-pulse rounded-[var(--t-card-radius)]" style={{ background: 'var(--t-muted)' }} />;

  return (
    <div className={containerClass(s.width)}>
      {header.map((b) => <BlockRenderer key={b.id} block={b} />)}
      {carousel ? (
        <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto pb-2" style={{ gap: num(s.gapX, 12) }}>
          {list.map((p, i) => (
            <div key={i} className="te-slide shrink-0 snap-start" style={{ '--cols': cols, '--gap': `${num(s.gapX, 12)}px` } as CSSProperties}>
              {renderCard(p, i)}
            </div>
          ))}
        </div>
      ) : mobCarousel ? (
        <>
          <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto pb-2 md:hidden" style={{ gap: num(s.gapX, 12) }}>
            {list.map((p, i) => <div key={i} className="w-[68%] shrink-0 snap-start">{renderCard(p, i)}</div>)}
          </div>
          <div className="te-grid hidden md:grid" style={{ '--cols': cols, '--mcols': mcols, columnGap: num(s.gapX, 12), rowGap: num(s.gapY, 28) } as CSSProperties}>
            {list.map(renderCard)}
          </div>
        </>
      ) : (
        <div className="te-grid" style={{ '--cols': cols, '--mcols': mcols, columnGap: num(s.gapX, 12), rowGap: num(s.gapY, 28) } as CSSProperties}>
          {list.map(renderCard)}
        </div>
      )}
    </div>
  );
}

const skeletonProduct = { name: 'Product title', price: 0, images: [], stock: 10 };

function FeaturedProduct({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { getProducts, requestProducts } = useRenderCtx();
  const q = s.product ? `/products?ids=${s.product}&limit=1` : '/products?featured=true&limit=1';
  useEffect(() => { requestProducts(q, q); }, [q, requestProducts]);
  const p = (getProducts(q) || [])[0];
  const img = p?.images?.[0]?.url || p?.images?.[0] || heroPlaceholder;
  return (
    <div className={containerClass(s.width)}>
      <div className={`grid items-center gap-10 md:grid-cols-2 ${str(s.mediaSide) === 'right' ? 'md:[&>*:first-child]:order-2' : ''}`}>
        <img src={img} alt={p?.name || ''} className="w-full rounded-[var(--t-radius)] object-cover" style={{ aspectRatio: '4/5' }} />
        <div className="flex flex-col gap-4">
          {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
          <h3 style={{ fontFamily: 'var(--t-font-heading)', fontSize: 30 }}>{p?.name || 'Featured product'}</h3>
          <p className="text-lg font-semibold">PKR {(p?.price ?? 0).toLocaleString('en-PK')}</p>
          {bool(s.showVariants, true) && (
            <div className="flex gap-2">
              {(p?.sizes || ['S', 'M', 'L']).slice(0, 5).map((z: string) => (
                <span key={z} className="rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--t-border)' }}>{z}</span>
              ))}
            </div>
          )}
          <span style={buttonStyle({ style: 'solid', size: 'lg' })}>Add to bag</span>
        </div>
      </div>
    </div>
  );
}

function CollectionList({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { data } = useRenderCtx();
  const chosen = Array.isArray(s.collections) ? (s.collections as string[]) : [];
  const cats = chosen.length ? data.categories.filter((c) => chosen.includes(c.slug)) : data.categories.slice(0, 6);
  return (
    <div className={containerClass(s.width)}>
      {kids(section, 'section_header').map((b) => <BlockRenderer key={b.id} block={b} />)}
      <div className="te-grid" style={{ '--cols': num(s.columns, 3), '--mcols': 2, gap: 16 } as CSSProperties}>
        {cats.map((c) => (
          <a key={c.slug} href={`/category/${c.slug}`} onClick={(e) => e.preventDefault()} className="group relative block overflow-hidden rounded-[var(--t-card-radius)]">
            <img src={c.image || heroPlaceholder} alt={c.name} className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ aspectRatio: RATIO[str(s.ratio, '4/5')] }} />
            {bool(s.overlayTitle, true) ? (
              <>
                <span className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(13,13,13,.6), transparent 60%)' }} />
                <span className="absolute bottom-4 left-4 text-lg font-medium" style={{ color: '#F7F5F1', fontFamily: 'var(--t-font-heading)' }}>{c.name}</span>
              </>
            ) : <span className="mt-2 block text-sm font-medium">{c.name}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Misc sections ─────────────────────────────────────────────────────── */
function Marquee({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const items = (Array.isArray(s.items) ? s.items : []) as Array<{ text?: string }>;
  const text = items.map((i) => i?.text).filter(Boolean);
  if (!text.length) return <Empty label="Add a message" />;
  const seq = [...text, ...text];
  return (
    <div className="overflow-hidden">
      <div className="flex w-max animate-[te-marquee_linear_infinite]"
        style={{ animationDuration: `${num(s.speed, 40)}s`, animationDirection: str(s.direction) === 'right' ? 'reverse' : 'normal' }}>
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center">
            {seq.map((t, i) => (
              <span key={`${dup}-${i}`} className="flex items-center whitespace-nowrap px-6 uppercase tracking-widest"
                style={{ fontSize: num(s.size, 12) }}>
                {t}<span className="ml-6 opacity-40">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tabs({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const tabs = (section.blocks || []).filter((b) => b.type === 'tab' && !b.hidden);
  const [i, setI] = useState(0);
  if (!tabs.length) return <Empty label="Add a tab" />;
  const pill = str(s.style, 'underline') === 'pill';
  return (
    <div className={containerClass(s.width)}>
      <div className={`mb-6 flex gap-2 ${alignClass(s.align, 'justify')}`}>
        {tabs.map((t, j) => (
          <button key={t.id} onClick={() => setI(j)}
            className={`px-4 py-2 text-sm font-semibold transition ${pill ? 'rounded-full' : 'border-b-2'}`}
            style={pill
              ? { background: i === j ? 'var(--t-primary)' : 'var(--t-muted)', color: i === j ? 'var(--t-bg)' : 'inherit' }
              : { borderColor: i === j ? 'currentColor' : 'transparent', opacity: i === j ? 1 : 0.55 }}>
            {str(t.settings.label, `Tab ${j + 1}`)}
          </button>
        ))}
      </div>
      <div>{(tabs[Math.min(i, tabs.length - 1)].blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}</div>
    </div>
  );
}

function Newsletter({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  return (
    <div className={containerClass(s.width)}>
      <div className={`flex flex-col gap-4 ${alignClass(s.align, 'items')} ${alignClass(s.align)}`}>
        {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
        <form onSubmit={(e) => e.preventDefault()} className="mt-2 flex w-full max-w-md gap-2">
          <input placeholder={str(s.placeholder, 'Your email address')} className="te-input flex-1" />
          <button style={buttonStyle({ style: 'solid', size: 'md' })}>{str(s.button, 'Subscribe')}</button>
        </form>
      </div>
    </div>
  );
}

function ContactForm({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  return (
    <div className={containerClass(s.width)}>
      <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: num(s.maxWidth, 560) }}>
        {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3">
          <input placeholder="Name" className="te-input" />
          <input placeholder="Email" className="te-input" />
          {bool(s.showPhone, true) && <input placeholder="Phone" className="te-input" />}
          {bool(s.showSubject) && <input placeholder="Subject" className="te-input" />}
          <textarea placeholder="Message" rows={5} className="te-input" />
          <button style={buttonStyle({ style: 'solid', size: 'md' })}>{str(s.button, 'Send message')}</button>
        </form>
      </div>
    </div>
  );
}

function BlogPosts({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { data } = useRenderCtx();
  const posts = (data.blogs || []).slice(0, num(s.count, 3));
  return (
    <div className={containerClass(s.width)}>
      {kids(section, 'section_header').map((b) => <BlockRenderer key={b.id} block={b} />)}
      {posts.length === 0 ? <Empty label="No blog posts yet" /> : (
        <div className="te-grid" style={{ '--cols': num(s.columns, 3), '--mcols': 1, gap: 20 } as CSSProperties}>
          {posts.map((p: any, i: number) => (
            <article key={i} className="flex flex-col gap-3">
              <img src={p.image || heroPlaceholder} alt="" className="w-full rounded-[var(--t-card-radius)] object-cover" style={{ aspectRatio: '16/9' }} />
              {bool(s.showDate, true) && <p className="text-[13px] uppercase tracking-widest" style={{ color: 'var(--t-text-muted)' }}>{p.date}</p>}
              <h3 style={{ fontFamily: 'var(--t-font-heading)', fontSize: 20 }}>{p.title}</h3>
              {bool(s.showExcerpt, true) && <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>{p.excerpt}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function FooterSection({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { data } = useRenderCtx();
  const blocks = (section.blocks || []).filter((b) => !b.hidden);
  const newsletter = blocks.find((b) => b.type === 'footer_newsletter');
  const cols = blocks.filter((b) => b.type !== 'footer_newsletter');
  const year = new Date().getFullYear();

  const nodeProps = (b: BlockNode) => useNodeProps(b);

  return (
    <footer style={{
      background: str(s.background) || 'var(--t-muted)',
      color: str(s.textColor) || 'var(--t-text)',
      paddingTop: num(s.paddingTop, 56), paddingBottom: num(s.paddingBottom, 24),
    }}>
      {newsletter && (
        <div className="border-b" style={{ borderColor: 'var(--t-border)' }}>
          <div className={`${containerClass('page')} flex flex-col items-center gap-5 pb-10 text-center md:flex-row md:justify-between md:text-left`}
            {...nodeProps(newsletter)}>
            <div>
              <p style={{ fontFamily: 'var(--t-font-heading)', fontSize: 21 }}>{str(newsletter.settings.title)}</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--t-text-muted)' }}>{str(newsletter.settings.text)}</p>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="flex w-full max-w-md gap-2">
              <input placeholder="Your email address" className="te-input flex-1" />
              <button style={buttonStyle({ style: 'solid', size: 'md' })}>{str(newsletter.settings.button, 'Subscribe')}</button>
            </form>
          </div>
        </div>
      )}

      <div className={`${containerClass('page')} te-grid py-12`} style={{ '--cols': num(s.columns, 4), '--mcols': 2, gap: 32 } as CSSProperties}>
        {cols.map((b) => {
          const cfg = b.settings;
          if (b.type === 'footer_about') {
            return (
              <div key={b.id} {...nodeProps(b)}>
                <p style={{ fontFamily: 'var(--t-font-heading)', fontSize: 19, letterSpacing: '.12em' }}>{str(cfg.title)}</p>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>{str(cfg.text)}</p>
                {bool(cfg.showSocial, true) && (
                  <div className="mt-4 flex gap-2">
                    {['Instagram', 'Facebook', 'Music2'].map((n) => (
                      <span key={n} className="grid h-9 w-9 place-items-center rounded-full border" style={{ borderColor: 'var(--t-border)' }}>
                        <Icon name={n} size={15} />
                      </span>
                    ))}
                  </div>
                )}
                {str(cfg.note) && <p className="mt-4 text-xs uppercase tracking-widest" style={{ color: 'var(--t-text-muted)' }}>{str(cfg.note)}</p>}
              </div>
            );
          }
          if (b.type === 'footer_contact') {
            return (
              <div key={b.id} {...nodeProps(b)}>
                <p className="text-[13px] font-bold uppercase tracking-widest" style={{ color: 'var(--t-text-muted)' }}>{str(cfg.title, 'Contact')}</p>
                <div className="mt-4 space-y-2.5 text-sm">
                  <p className="flex items-center gap-2"><Icon name="Mail" size={14} /> {str(cfg.email) || data.settings.contactEmail || '—'}</p>
                  <p className="flex items-center gap-2"><Icon name="Phone" size={14} /> {str(cfg.phone) || data.settings.contactPhone || '—'}</p>
                  {str(cfg.note) && <p className="flex items-center gap-2"><Icon name="MapPin" size={14} /> {str(cfg.note)}</p>}
                </div>
                {bool(s.showPayments, true) && str(cfg.payments) && (
                  <p className="mt-5 flex items-center gap-2 text-[13px] uppercase tracking-widest" style={{ color: 'var(--t-text-muted)' }}>
                    <Icon name="CreditCard" size={14} /> {str(cfg.payments)}
                  </p>
                )}
              </div>
            );
          }
          // footer_column
          return (
            <div key={b.id} {...nodeProps(b)}>
              <p className="text-[13px] font-bold uppercase tracking-widest" style={{ color: 'var(--t-text-muted)' }}>{str(cfg.title)}</p>
              <div className="mt-4 space-y-2.5 text-sm">
                {(b.blocks || []).filter((l) => !l.hidden).map((l) => (
                  <a key={l.id} href={str(l.settings.href, '#')} onClick={(e) => e.preventDefault()} className="block transition hover:opacity-70">
                    {str(l.settings.label)}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t pt-5 text-center text-[13px] uppercase tracking-widest" style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}>
        {str(s.bottomText) || `© ${year} ${data.settings.storeName || 'HUSHAE'} · All rights reserved`}
      </div>
    </footer>
  );
}


/* ── Parity sections ───────────────────────────────────────────────────── */

function FeaturedMarqueeSection({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { getProducts, requestProducts } = useRenderCtx();
  const query = useMemo(() => buildQuery({ ...s, count: num(s.count, 10) }), [s.source, s.count, s.sort, s.gender, s.collection, s.products]);
  useEffect(() => { requestProducts(query, query); }, [query, requestProducts]);
  const products = getProducts(query) || [];
  const list = products.filter((p: any) => p?.images?.length);
  if (!list.length) return null;

  const doubled = [...list, ...list];
  const tile = num(s.tileWidth, 200);

  return (
    <>
      <div className={containerClass(s.width)}>
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            {str(s.eyebrow) && <p className="text-[13px] font-bold uppercase tracking-widest opacity-60">{str(s.eyebrow)}</p>}
            {str(s.heading) && <h2 className="mt-1 text-2xl md:text-3xl" style={{ fontFamily: 'var(--t-font-heading)' }}>{str(s.heading)}</h2>}
          </div>
          {bool(s.showViewAll, true) && (
            <a href={str(s.viewAllHref, '/best')} onClick={(e) => e.preventDefault()}
              className="hidden shrink-0 text-[13px] font-semibold uppercase tracking-widest opacity-70 hover:opacity-100 md:inline-block">
              {str(s.viewAllLabel, 'View all')} →
            </a>
          )}
        </div>
      </div>
      <div className={`te-marquee-wrap group overflow-hidden ${bool(s.pauseOnHover, true) ? 'te-pausable' : ''}`}>
        <div className="flex w-max"
          style={{
            animation: `te-marquee ${num(s.speed, 45)}s linear infinite`,
            animationDirection: str(s.direction) === 'right' ? 'reverse' : 'normal',
          }}>
          {doubled.map((p: any, i: number) => {
            const img = p.images?.[0]?.url || p.images?.[0];
            return (
              <a key={`${p._id}-${i}`} href={`/product/${p.slug}`} onClick={(e) => e.preventDefault()}
                className="mr-4 shrink-0" style={{ width: tile }}>
                <span className="block overflow-hidden rounded-[var(--t-card-radius)]" style={{ background: 'rgba(255,255,255,.06)' }}>
                  <img src={img} alt={p.name} loading="lazy" className="w-full object-cover transition-transform duration-500 hover:scale-105"
                    style={{ aspectRatio: '4 / 5' }} />
                </span>
                <span className="mt-2 block truncate text-[12.5px] font-medium">{p.name}</span>
                {bool(s.showPrice, true) && (
                  <span className="block text-[12px] opacity-70">PKR {Number(p.price || 0).toLocaleString('en-PK')}</span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </>
  );
}

function FeaturedCollectionsSection({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { data } = useRenderCtx();
  const [featured, setFeatured] = useState<any[] | null>(null);

  useEffect(() => {
    if (str(s.mode, 'featured') !== 'featured') return;
    let alive = true;
    apiFetch('/collections?featured=true')
      .then((d: any) => { if (alive) setFeatured(d.collections || []); })
      .catch(() => { if (alive) setFeatured([]); });
    return () => { alive = false; };
  }, [s.mode]);

  const picked = Array.isArray(s.collections) ? (s.collections as string[]) : [];
  const source = str(s.mode, 'featured') === 'pick'
    ? data.categories.filter((c: any) => picked.includes(c.slug))
        .sort((a: any, b: any) => picked.indexOf(a.slug) - picked.indexOf(b.slug))
    : (featured || []);
  const list = source.slice(0, num(s.count, 4));

  if (str(s.mode, 'featured') === 'featured' && featured === null) return null;
  if (!list.length) {
    return <div className={containerClass(s.width)}><Empty label="No featured collections yet — flag some in Admin › Collections" /></div>;
  }

  return (
    <div className={containerClass(s.width)}>
      {kids(section, 'section_header').map((b) => <BlockRenderer key={b.id} block={b} />)}
      <div className="te-grid" style={{ '--cols': num(s.columns, 4), '--mcols': 2, gap: 16 } as CSSProperties}>
        {list.map((c: any) => (
          <a key={c.slug || c._id} href={`/collection/${c.slug}`} onClick={(e) => e.preventDefault()}
            className="group relative block overflow-hidden rounded-[var(--t-card-radius)]">
            <img src={c.image || c.heroImage || heroPlaceholder} alt={c.name || c.title}
              className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ aspectRatio: RATIO[str(s.ratio, '4/5')] }} />
            {bool(s.overlayTitle, true) ? (
              <>
                <span className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(13,13,13,.65), transparent 62%)' }} />
                <span className="absolute bottom-4 left-4 right-4">
                  <span className="block text-lg" style={{ color: '#F7F5F1', fontFamily: 'var(--t-font-heading)' }}>{c.name || c.title}</span>
                  {bool(s.showCount) && c.productCount != null && (
                    <span className="block text-[13px]" style={{ color: 'rgba(247,245,241,.75)' }}>{c.productCount} products</span>
                  )}
                </span>
              </>
            ) : (
              <span className="mt-2 block text-sm font-medium">{c.name || c.title}</span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

function EditorialSection({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const side = str(s.imageSide, 'left');
  const content = (
    <div className={`flex flex-col justify-center gap-4 ${alignClass(s.align, 'items')} ${alignClass(s.align)}`}>
      {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
    </div>
  );

  if (side === 'overlay') {
    return (
      <div className="relative flex items-end overflow-hidden" style={{ minHeight: num(s.minHeight, 520) }}>
        {str(s.video)
          ? <video src={str(s.video)} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
          : <img src={str(s.image) || heroPlaceholder} alt=""
              className={`absolute inset-0 h-full w-full object-cover ${bool(s.zoomOnScroll, true) ? 'te-zoom-in' : ''}`} />}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(13,13,13,${num(s.overlay, 45) / 100}), rgba(13,13,13,.08))` }} />
        <div className={`relative z-10 w-full py-14 ${containerClass(s.width)}`} style={{ color: '#F7F5F1' }}>{content}</div>
      </div>
    );
  }

  const media = str(s.video) ? (
    <video src={str(s.video)} autoPlay muted loop playsInline className="h-full w-full object-cover"
      style={{ aspectRatio: RATIO[str(s.ratio, '4/5')] }} />
  ) : (
    <img src={str(s.image) || heroPlaceholder} alt=""
      className={`h-full w-full object-cover ${bool(s.zoomOnScroll, true) ? 'te-zoom-in' : ''}`}
      style={{ aspectRatio: RATIO[str(s.ratio, '4/5')] }} />
  );

  return (
    <div className="grid items-stretch md:grid-cols-2">
      <div className={`overflow-hidden ${side === 'right' ? 'md:order-2' : ''}`}>{media}</div>
      <div className="px-6 py-12 md:px-14 md:py-20">{content}</div>
    </div>
  );
}

function CtaBanner({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  return (
    <div className={containerClass(s.width)}>
      <div className="relative overflow-hidden"
        style={{
          background: str(s.panelBg, '#0D0D0D'),
          color: str(s.panelText, '#F7F5F1'),
          borderRadius: num(s.panelRadius, 40),
          padding: num(s.panelPadding, 56),
        }}>
        {bool(s.glow, true) && (
          <>
            <span className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl"
              style={{ background: 'var(--t-accent)', opacity: 0.18 }} />
            <span className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl"
              style={{ background: 'var(--t-muted)', opacity: 0.12 }} />
          </>
        )}
        <div className={`relative flex flex-col gap-4 ${alignClass(s.align, 'items')} ${alignClass(s.align)}`}>
          {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
        </div>
      </div>
    </div>
  );
}

/** Shared selection props for footer sub-blocks. */
function useNodeProps(b: BlockNode) {
  const { editable, selectedId, onSelect, onHover } = useRenderCtx();
  if (!editable) return {};
  return {
    'data-node-id': b.id,
    className: `te-node ${selectedId === b.id ? 'te-selected' : ''}`,
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); onSelect?.(b.id); },
    onMouseOver: (e: React.MouseEvent) => { e.stopPropagation(); onHover?.(b.id); },
    onMouseOut: () => onHover?.(null),
  } as Record<string, unknown>;
}

const Empty = ({ label }: { label: string }) => (
  <div className="rounded-[var(--t-radius)] border border-dashed p-10 text-center text-sm"
    style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}>{label}</div>
);

const heroPlaceholder =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="#20201F"/><text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#6B6B6B" text-anchor="middle">Add an image</text></svg>`,
  );

function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(f || '0D0D0D', 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* ═══ PRODUCT TEMPLATE — buy box ══════════════════════════════════════════ */

const imgUrl = (p: any, i = 0) => {
  const imgs = p?.images || [];
  const src = imgs[i];
  if (!src) return heroPlaceholder;
  return typeof src === 'string' ? src : src.url || '';
};
const pkr2 = (n: number) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
const ratingStars = (r: number) => (Array.from({ length: 5 }).map((_, i) => (
  <Star key={i} size={12} strokeWidth={1.6} fill={i < Math.round(r || 0) ? 'currentColor' : 'none'} />
)));

function ProductBuyBox({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { data, theme } = useRenderCtx();
  const { addToCart, toast } = useApp();
  const navigate = useNavigate();
  const p = data.product;
  const [img, setImg] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);

  const t = (k: string, fb: string) => String((theme as any)[k] || fb);

  if (p === undefined) {
    // Loading — keep the page stable with a skeleton instead of a flash.
    return (
      <div className={containerClass(s.width)} style={{ paddingTop: num(s.paddingTop, 32), paddingBottom: num(s.paddingBottom, 56) }}>
        <div className="grid items-start gap-10 md:grid-cols-2" style={{ gap: num(s.gap, 56) }}>
          <div className="aspect-[5/4] animate-pulse rounded-[var(--t-radius)]" style={{ background: 'var(--t-muted)' }} />
          <div className="flex flex-col gap-4">
            <div className="h-4 w-24 animate-pulse rounded" style={{ background: 'var(--t-muted)' }} />
            <div className="h-9 w-3/4 animate-pulse rounded" style={{ background: 'var(--t-muted)' }} />
            <div className="h-6 w-28 animate-pulse rounded" style={{ background: 'var(--t-muted)' }} />
            <div className="mt-2 h-12 w-full animate-pulse rounded-full" style={{ background: 'var(--t-muted)' }} />
          </div>
        </div>
      </div>
    );
  }
  if (!p) {
    return (
      <div className={containerClass(s.width)} style={{ paddingTop: num(s.paddingTop, 32), paddingBottom: num(s.paddingBottom, 56) }}>
        <div className="rounded-[var(--t-radius)] border p-12 text-center" style={{ borderColor: 'var(--t-border)' }}>
          <p className="text-[15px]" style={{ color: 'var(--t-text-muted)' }}>Product not found.</p>
        </div>
      </div>
    );
  }

  const sizes: string[] = Array.isArray(p.sizes) ? p.sizes : [];
  const colors: Array<{ name?: string; value?: string } | string> = Array.isArray(p.colors) ? p.colors : [];
  const price = Number(p.price || 0);
  const compare = Number(p.compareAtPrice || 0);
  const onSale = price < compare;
  const count = (p.images || []).length;
  const imgs = Array.from({ length: Math.max(1, count) });

  const add = (buyNow = false) => {
    if (sizes.length && !size) { toast?.('Please select a size'); return; }
    addToCart(p, { size: size || p.sizes?.[0] || '', color: (typeof (colors[0] || '') === 'string' ? String(colors[0] || '') : String((colors[0] as any)?.name || '')), quantity: qty });
    toast?.(t('t_added', 'Added to cart'));
    if (buyNow) navigate('/checkout');
  };

  const blockFor = (type: string) => (section.blocks || []).filter((b) => b.type === type);
  const childrenOf = (b: any) => b?.blocks || [];

  return (
    <div className={containerClass(s.width)} style={{ paddingTop: num(s.paddingTop, 32), paddingBottom: num(s.paddingBottom, 56) }}>
      {bool(s.showBreadcrumb, true) && (
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-[12px]" style={{ color: 'var(--t-text-muted)' }}>
          <Link to="/" style={{ color: 'inherit' }} className="hover:opacity-70">Home</Link>
          <span>/</span>
          <Link to="/shop" style={{ color: 'inherit' }} className="hover:opacity-70">Shop</Link>
          <span>/</span>
          <span style={{ color: 'var(--t-text)' }}>{p.name}</span>
        </nav>
      )}

      <div className={str(s.layout, 'split') === 'stacked' ? 'flex flex-col gap-10' : 'grid items-start gap-10 md:grid-cols-2'}
        style={{ gap: num(s.gap, 56) }}>

        {/* ── Gallery ── */}
        {blockFor('buy_gallery').length > 0 && (() => {
          const g = blockFor('buy_gallery')[0].settings || {};
          return (
            <div className="min-w-0">
              <div className="te-buy-zoom group relative overflow-hidden rounded-[var(--t-radius)]"
                style={{ background: 'var(--t-muted)', aspectRatio: `${num(g.aspect, 125)}/100` }}>
                <img src={imgUrl(p, img)} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  style={{ aspectRatio: `${num(g.aspect, 125)}/100` }} loading="eager" />
                {onSale && <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: 'var(--t-sale)' }}>Sale</span>}
              </div>
              {bool(g.thumbs, true) && imgs.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {imgs.map((_, i) => (
                    <button key={i} type="button" onClick={() => setImg(i)} aria-label={`Image ${i + 1}`}
                      className="h-16 w-14 shrink-0 overflow-hidden rounded-lg border transition"
                      style={{ borderColor: i === img ? 'var(--t-text)' : 'var(--t-border)', opacity: i === img ? 1 : 0.6 }}>
                      <img src={imgUrl(p, i)} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Info column ── */}
        <div className="flex min-w-0 flex-col gap-4" style={bool(s.stickyInfo, true) ? { position: 'sticky', top: 24 } : undefined}>
          {blockFor('buy_title').map((b) => {
            const bs = b.settings || {};
            const Tag = bs.tag || 'h1';
            return (
              <div key={b.id} className="flex flex-col gap-2">
                {bool(bs.showVendor, true) && p.tier && (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--t-accent)' }}>{p.tier}</p>
                )}
                <Tag style={{ fontFamily: 'var(--t-font-heading)', fontSize: 30, lineHeight: 1.12, letterSpacing: 'var(--t-heading-tracking)', margin: 0 }}>{p.name}</Tag>
                {bool(bs.showRating, true) && (p.rating || 0) > 0 && (
                  <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--t-text-muted)' }}>
                    <span className="flex" style={{ color: 'var(--t-accent)' }}>{ratingStars(p.rating)}</span>
                    <span>{Number(p.rating || 0).toFixed(1)} · {p.ratingCount || 0} reviews</span>
                  </div>
                )}
              </div>
            );
          })}

          {blockFor('buy_price').map((b) => {
            const bs = b.settings || {};
            return (
              <div key={b.id} className="flex items-baseline gap-3">
                <span className="text-2xl font-semibold tabular-nums" style={{ fontFamily: 'var(--t-font-heading)' }}>{pkr2(price)}</span>
                {bool(bs.showCompareAt, true) && onSale && (
                  <span className="text-[15px] line-through" style={{ color: 'var(--t-text-muted)' }}>{pkr2(compare)}</span>
                )}
                {bool(bs.showTaxNote, true) && (
                  <span className="text-[11px]" style={{ color: 'var(--t-text-muted)' }}>incl. tax</span>
                )}
              </div>
            );
          })}

          {blockFor('buy_variants').map((b) => {
            const bs = b.settings || {};
            return (
              <div key={b.id} className="flex flex-col gap-4">
                {sizes.length > 0 && (
                  <div>
                    <p className="mb-2 text-[12px] font-semibold">{String(bs.sizeLabel || 'Size')}{!size && <span style={{ color: 'var(--t-sale)' }}> — select</span>}</p>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((z) => (
                        <button key={z} type="button" onClick={() => setSize(z)}
                          className="min-w-11 rounded-lg border px-3 py-2 text-[13px] font-medium transition"
                          style={{
                            borderColor: size === z ? 'var(--t-text)' : 'var(--t-border)',
                            background: size === z ? 'var(--t-text)' : 'transparent',
                            color: size === z ? 'var(--t-bg)' : 'var(--t-text)',
                          }}>{z}</button>
                      ))}
                    </div>
                  </div>
                )}
                {colors.length > 0 && (
                  <div>
                    <p className="mb-2 text-[12px] font-semibold">{String(bs.colorLabel || 'Colour')}</p>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((c, i) => {
                        const name = typeof c === 'string' ? c : String(c?.name || '');
                        const val = typeof c === 'string' ? '' : String(c?.value || '');
                        return (
                          <button key={i} type="button" onClick={() => setColor(name)} aria-label={name}
                            title={name}
                            className="h-8 w-8 rounded-full border-2 transition"
                            style={{
                              borderColor: color === name ? 'var(--t-text)' : 'var(--t-border)',
                              background: val || 'var(--t-muted)',
                            }} />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {blockFor('buy_qty').map((b) => {
            const bs = b.settings || {};
            const max = num(bs.max, 10);
            return (
              <div key={b.id} className="flex items-center gap-3">
                <span className="text-[12px] font-semibold">Quantity</span>
                <div className="flex items-center rounded-full border" style={{ borderColor: 'var(--t-border)' }}>
                  <button type="button" aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="grid h-10 w-10 place-items-center rounded-full transition hover:opacity-60"><Minus size={14} /></button>
                  <span className="w-8 text-center text-[14px] font-semibold tabular-nums">{qty}</span>
                  <button type="button" aria-label="Increase" onClick={() => setQty((q) => Math.min(max, q + 1))}
                    className="grid h-10 w-10 place-items-center rounded-full transition hover:opacity-60"><Plus size={14} /></button>
                </div>
              </div>
            );
          })}

          {blockFor('buy_buttons').map((b) => {
            const bs = b.settings || {};
            const btn = { ...buttonStyle({ style: 'solid', size: 'lg' }), width: bool(bs.fullWidth, true) ? '100%' : 'auto' };
            return (
              <div key={b.id} className="flex flex-col gap-2.5" style={bool(bs.fullWidth, true) ? { width: '100%' } : { display: 'inline-flex' }}>
                <button type="button" onClick={() => add(false)} style={btn} className="te-btn-shine">
                  <ShoppingBag size={15} /> {t('t_addToCart', 'Add to cart')}
                </button>
                {bool(bs.showBuyNow, true) && (
                  <button type="button" onClick={() => add(true)}
                    style={{ ...buttonStyle({ style: 'outline', size: 'lg' }), width: bool(bs.fullWidth, true) ? '100%' : 'auto' }}>
                    <Zap size={15} /> {t('t_buyNow', 'Buy now')}
                  </button>
                )}
              </div>
            );
          })}

          {blockFor('buy_trust').map((b) => (
            <div key={b.id} className="mt-1 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border px-4 py-3"
              style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface)' }}>
              {childrenOf(b).map((it: any) => {
                const ic = (it.settings || {}).icon || 'Truck';
                const C = resolveIcon(ic);
                return (
                  <span key={it.id} className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--t-text-muted)' }}>
                    <C size={13} style={{ stroke: 'var(--t-accent)' }} /> {String((it.settings || {}).text || '')}
                  </span>
                );
              })}
            </div>
          ))}

          {blockFor('buy_accordion').map((b) => (
            <div key={b.id} className="mt-1 divide-y rounded-xl border" style={{ borderColor: 'var(--t-border)' }}>
              {childrenOf(b).map((it: any) => {
                const it2 = it.settings || {};
                return (
                  <details key={it.id} open={bool(it2.open, false)} className="group px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13.5px] font-semibold [&::-webkit-details-marker]:hidden">
                      {String(it2.title || '')}
                      <ChevronDown size={14} className="shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="pt-2 text-[13px] leading-relaxed" style={{ color: 'var(--t-text-muted)' }}
                      dangerouslySetInnerHTML={{ __html: String(it2.body || '') }} />
                  </details>
                );
              })}
            </div>
          ))}

          {blockFor('buy_meta').map((b) => {
            const bs = b.settings || {};
            return (
              <div key={b.id} className="flex flex-col gap-1 text-[12px]" style={{ color: 'var(--t-text-muted)' }}>
                {bool(bs.showSKU, true) && p.sku && <p>SKU: <span className="font-mono">{p.sku}</span></p>}
                {bool(bs.showCategory, true) && p.category && (
                  <p>Category: <Link to={`/collection/${p.category}`} style={{ color: 'var(--t-text)' }} className="underline-offset-2 hover:underline">{p.category}</Link></p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══ PRODUCT TEMPLATE — related products ═════════════════════════════════ */

function RelatedProducts({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { data, getProducts, requestProducts } = useRenderCtx();
  const p = data.product;
  const count = num(s.count, 4);
  const cat = p?.category || '';
  const q = str(s.source, 'category') === 'category' && cat
    ? `/products?category=${encodeURIComponent(cat)}&limit=${count + 1}`
    : `/products?bestSeller=true&limit=${count}`;
  useEffect(() => { if (p) requestProducts(q, q); }, [q, p, requestProducts]);
  const list = (getProducts(q) || []).filter((x: any) => x._id !== p?._id).slice(0, count);

  return (
    <div className={containerClass(s.width)} style={{ paddingTop: num(s.paddingTop, 56), paddingBottom: num(s.paddingBottom, 56) }}>
      {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}
      <div className="te-grid" style={{ '--cols': num(s.columns, 4), '--mcols': 2, gap: 16 } as CSSProperties}>
        {list.map((x: any) => (
          <Link key={x._id} to={`/product/${x.slug}`} className="group flex flex-col gap-2.5">
            <div className="relative overflow-hidden rounded-[var(--t-card-radius)]" style={{ background: 'var(--t-muted)', aspectRatio: '3/4' }}>
              <img src={imgUrl(x)} alt={x.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              {bool(s.showPrice, true) && Number(x.compareAtPrice || 0) > Number(x.price || 0) && (
                <span className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ background: 'var(--t-sale)' }}>Sale</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[13px] font-medium leading-snug">{x.name}</p>
              {bool(s.showPrice, true) && (
                <p className="text-[13px] font-semibold tabular-nums">
                  {pkr2(x.price)}
                  {Number(x.compareAtPrice || 0) > Number(x.price || 0) && (
                    <span className="ml-2 text-[12px] font-normal line-through" style={{ color: 'var(--t-text-muted)' }}>{pkr2(x.compareAtPrice)}</span>
                  )}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
      {!list.length && (
        <p className="text-[13px]" style={{ color: 'var(--t-text-muted)' }}>More pieces coming soon.</p>
      )}
    </div>
  );
}

/* ═══ PRODUCT TEMPLATE — reviews ══════════════════════════════════════════ */

function ProductReviews({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { data } = useRenderCtx();
  const p = data.product;
  const [rev, setRev] = useState<{ reviews?: any[]; average?: number; total?: number } | null>(null);
  useEffect(() => {
    if (!p?._id) return;
    let alive = true;
    apiFetch(`/reviews/product/${p._id}?limit=${num(s.limit, 6)}`)
      .then((d: any) => { if (alive) setRev(d); })
      .catch(() => { if (alive) setRev({ reviews: [] }); });
    return () => { alive = false; };
  }, [p?._id, num(s.limit, 6)]); // eslint-disable-line

  const reviews = rev?.reviews || [];
  const avg = Number(rev?.average ?? p?.rating ?? 0);
  const total = Number(rev?.total ?? p?.ratingCount ?? reviews.length);

  return (
    <div className={containerClass(s.width)} style={{ paddingTop: num(s.paddingTop, 56), paddingBottom: num(s.paddingBottom, 56) }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h3 style={{ fontFamily: 'var(--t-font-heading)', fontSize: 26 }}>{String(s.heading || 'Customer reviews')}</h3>
          {bool(s.showSummary, true) && total > 0 && (
            <div className="flex items-center gap-2 rounded-full border px-4 py-2" style={{ borderColor: 'var(--t-border)' }}>
              <span className="flex" style={{ color: 'var(--t-accent)' }}>{ratingStars(avg)}</span>
              <span className="text-[13px] font-semibold">{Number(avg).toFixed(1)}</span>
              <span className="text-[12px]" style={{ color: 'var(--t-text-muted)' }}>· {total} review{total === 1 ? '' : 's'}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4">
          {reviews.map((r: any) => (
            <div key={r._id} className="rounded-2xl border p-5" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface)' }}>
              <div className="mb-2 flex flex-wrap items-center gap-2.5">
                <span className="flex" style={{ color: 'var(--t-accent)' }}>{ratingStars(Number(r.rating || 0))}</span>
                <b className="text-[13.5px]">{r.name || 'Verified buyer'}</b>
                {bool(s.showVerified, true) && r.verified && (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: 'var(--t-success)', background: 'var(--t-muted)' }}>
                    <BadgeCheck size={10} /> Verified
                  </span>
                )}
                {r.createdAt && <span className="text-[11px]" style={{ color: 'var(--t-text-muted)' }}>{new Date(r.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
              </div>
              {r.comment && <p className="text-[13.5px] leading-relaxed">{r.comment}</p>}
            </div>
          ))}
          {!reviews.length && (
            <p className="rounded-2xl border border-dashed p-8 text-center text-[13px]" style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}>
              No reviews yet — be the first to review this piece.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ COLLECTION TEMPLATE — hero ══════════════════════════════════════════ */

function CollectionHero({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { data } = useRenderCtx();
  const cat = data.categories.find((c) => c.slug === data.collectionSlug);
  const img = cat?.image || heroPlaceholder;
  return (
    <div className="relative flex items-end overflow-hidden" style={{ height: num(s.height, 260), paddingTop: num(s.paddingTop, 0), paddingBottom: num(s.paddingBottom, 24) }}>
      <img src={img} alt={cat?.name || 'Collection'} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: String(s.overlay || 'rgba(0,0,0,.18)') }} />
      <div className={containerClass(s.width)} style={{ position: 'relative', zIndex: 1 }}>
        <div className={`flex flex-col gap-2 text-white ${str(s.align, 'left') === 'center' ? 'mx-auto items-center text-center' : ''} max-w-2xl`}>
          {bool(s.showTitle, true) && (
            <h1 style={{ fontFamily: 'var(--t-font-heading)', fontSize: 40, lineHeight: 1.08, letterSpacing: 'var(--t-heading-tracking)', margin: 0 }}>
              {cat?.name || 'Shop'}
            </h1>
          )}
          {bool(s.showDescription, true) && cat?.description && <p className="text-[14px] text-white/85">{cat.description}</p>}
          {bool(s.showCount, true) && <p className="text-[12px] uppercase tracking-[0.18em] text-white/70">{cat?.productCount ?? ''}{cat?.productCount ? ' products' : ''}</p>}
        </div>
      </div>
    </div>
  );
}

/* ═══ COLLECTION TEMPLATE — filters / sort bar ════════════════════════════ */

function CollectionFilters({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { data, setCollectionSort } = useRenderCtx();
  const [avail, setAvail] = useState(false);
  const cat = data.categories.find((c) => c.slug === data.collectionSlug);
  return (
    <div className={containerClass(s.width)} style={{ paddingTop: num(s.paddingTop, 0), paddingBottom: num(s.paddingBottom, 12) }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--t-border)' }}>
        <div className="flex flex-wrap items-center gap-3">
          {bool(s.showCount, true) && (
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--t-text-muted)' }}>
              {cat?.productCount ?? ''}{cat?.productCount ? ' items' : ''}
            </span>
          )}
          {bool(s.showAvailability, true) && (
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px]">
              <span className="relative inline-block h-4.5 w-8">
                <input type="checkbox" className="peer sr-only" checked={avail} onChange={(e) => setAvail(e.target.checked)} />
                <span className="absolute inset-0 rounded-full transition" style={{ background: avail ? 'var(--t-accent)' : 'var(--t-border)' }} />
                <span className="absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition peer-checked:translate-x-3.5" />
              </span>
              In stock only
            </label>
          )}
        </div>
        <label className="flex items-center gap-2 text-[12.5px]">
          <span style={{ color: 'var(--t-text-muted)' }}>{String(s.label || 'Sort by')}</span>
          <select
            defaultValue="newest"
            onChange={(e) => setCollectionSort?.(e.target.value)}
            className="rounded-lg border bg-transparent px-3 py-1.5 text-[13px] outline-none transition focus:ring-2"
            style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
          >
            <option value="newest">Newest</option>
            <option value="popular">Most popular</option>
            {bool(s.showPriceSort, true) && <option value="price-asc">Price: low → high</option>}
            {bool(s.showPriceSort, true) && <option value="price-desc">Price: high → low</option>}
          </select>
        </label>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * BLOG LIST — blog template body section.
 * Fetches the published journal from /api/blog and renders the section
 * header block plus a featured post + responsive grid of cards.
 * ════════════════════════════════════════════════════════════════════════ */
function BlogList({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { theme } = useRenderCtx();
  const [posts, setPosts] = useState<any[] | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    apiFetch('/blog')
      .then((d) => { if (alive) setPosts(d?.posts || []); })
      .catch(() => { if (alive) setPosts([]); });
    return () => { alive = false; };
  }, []);

  const showFeatured = bool(s.showFeatured, true);
  const cols = Math.min(4, Math.max(1, num(s.columns, 3)));
  const count = num(s.count, 9);
  const rest = posts ? (showFeatured ? posts.slice(0, count) : posts.slice(0, count)) : [];
  const featured = showFeatured ? rest[0] : null;
  const grid = showFeatured ? rest.slice(1) : rest;

  const card = (p: any) => (
    <Link key={p._id} to={`/blog/${p.slug}`} className="group block overflow-hidden rounded-[var(--t-radius)]"
      style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
      <div className="overflow-hidden" style={{ aspectRatio: '4/3', background: 'var(--t-muted)' }}>
        {p.coverImage ? (
          <img src={p.coverImage} alt={p.coverAlt || p.title} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700"
            style={{ transform: 'scale(1)', transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')} />
        ) : (
          <div className="grid h-full w-full place-items-center text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--t-text-muted)' }}>HUSHAE</div>
        )}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.14em]"
          style={{ color: 'var(--t-text-muted)' }}>
          {p.author && <span>{p.author}</span>}
          {bool(s.showDate, true) && <span>{fmtDate(p.publishAt || p.createdAt)}</span>}
        </div>
        <h3 className="mt-3 text-[19px] font-semibold leading-snug" style={{ color: 'var(--t-text)' }}>
          {p.title}
        </h3>
        {bool(s.showExcerpt, true) && p.excerpt && (
          <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>{p.excerpt}</p>
        )}
        {bool(s.showReadMore, true) && (
          <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: 'var(--t-accent)' }}>
            Read <ChevronRight size={13} />
          </span>
        )}
      </div>
    </Link>
  );

  return (
    <div className={containerClass(s.width)} style={{ paddingTop: num(s.paddingTop, 48), paddingBottom: num(s.paddingBottom, 64) }}>
      {(section.blocks || []).map((b) => <BlockRenderer key={b.id} block={b} />)}

      {posts === undefined ? (
        <div className="grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-[var(--t-radius)]" style={{ background: 'var(--t-muted)', aspectRatio: '3/4' }} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-[var(--t-radius)] border py-16 text-center" style={{ borderColor: 'var(--t-border)' }}>
          <p className="text-[15px]" style={{ color: 'var(--t-text-muted)' }}>Nothing published yet — the first story is on its way.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {featured && (
            <Link to={`/blog/${featured.slug}`} className="group grid overflow-hidden rounded-[var(--t-radius)] border md:grid-cols-2"
              style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
              <div className="overflow-hidden" style={{ aspectRatio: '16/10', background: 'var(--t-muted)' }}>
                {featured.coverImage ? (
                  <img src={featured.coverImage} alt={featured.coverAlt || featured.title} loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700"
                    style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')} />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: 'var(--t-text-muted)' }}>HUSHAE</div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-3 p-6 md:p-10">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--t-accent)' }}>Featured story</span>
                <h3 className="text-[26px] font-semibold leading-tight md:text-[34px]" style={{ color: 'var(--t-text)' }}>{featured.title}</h3>
                {featured.excerpt && <p className="text-[14.5px] leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>{featured.excerpt}</p>}
                <div className="flex flex-wrap items-center gap-x-3 text-[11.5px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--t-text-muted)' }}>
                  {featured.author && <span>{featured.author}</span>}
                  {bool(s.showDate, true) && <span>{fmtDate(featured.publishAt || featured.createdAt)}</span>}
                </div>
              </div>
            </Link>
          )}
          {grid.length > 0 && (
            <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {grid.map(card)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * CART PAGE — cart template body section.
 * Real bag: stock-aware pricing from useCartPricing, line editing with the
 * same rules as the hand-coded Cart page, COD/trust badges, checkout CTA.
 * ════════════════════════════════════════════════════════════════════════ */
const BLOCKING = new Set(['oos', 'unavailable', 'size-gone']);

function CartPage({ section }: { section: SectionNode }) {
  const s = section.settings || {};
  const { theme } = useRenderCtx();
  const { cart, updateQty, removeLine, clearCart, settings } = useApp();
  const [stockMap, setStockMap] = useState<Record<string, any>>({});

  const idKey = useMemo(
    () => Array.from(new Set(cart.map((l) => l.id).filter(Boolean))).sort().join(','),
    [cart],
  );

  useEffect(() => {
    if (!idKey) { setStockMap({}); return; }
    let alive = true;
    apiFetch(`/products?ids=${idKey}&limit=50`)
      .then((d) => {
        if (!alive) return;
        const map: Record<string, any> = {};
        (d?.products || []).forEach((p) => {
          map[String(p._id)] = {
            stock: p.stock ?? 0,
            sizes: p.sizes || [],
            isActive: p.isActive !== false,
            compareAtPrice: p.compareAtPrice || null,
            onSale: p.onSale === true,
            saleStart: p.saleStart || null,
            saleEnd: p.saleEnd || null,
          };
        });
        setStockMap(map);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [idKey]);

  const cfg = useMemo(() => cartConfig(settings), [settings]);

  const lines = useMemo(() => cart.map((line, index) => {
    const m = stockMap[String(line.id)];
    const withCompare = m ? { ...line } : { ...line, compareAtPrice: null, onSale: false };
    if (!m) return { line: withCompare, index, status: 'ok', available: null };
    if (!m.isActive) return { line: withCompare, index, status: 'unavailable', available: 0 };
    if (m.stock <= 0) return { line: withCompare, index, status: 'oos', available: 0 };
    if (line.size && m.sizes.length && !m.sizes.includes(line.size)) return { line: withCompare, index, status: 'size-gone', available: m.stock };
    if (line.qty > m.stock) return { line: withCompare, index, status: 'low', available: m.stock };
    return { line: withCompare, index, status: 'ok', available: m.stock };
  }), [cart, stockMap]);

  const pricing = useCartPricing(lines, settings, cfg, null);
  const ordered = useMemo(
    () => [...lines].sort((a, b) => (BLOCKING.has(b.status) ? 1 : 0) - (BLOCKING.has(a.status) ? 1 : 0)),
    [lines],
  );

  const heading = String(s.heading || 'Your bag');
  const emptyTitle = String(s.emptyTitle || 'Your bag is empty');
  const emptyText = String(s.emptyText || 'Looks like you have not added anything yet — start shopping!');
  const checkoutLabel = String(s.checkoutLabel || 'Proceed to checkout');

  return (
    <div className={containerClass(s.width)} style={{ paddingTop: num(s.paddingTop, 40), paddingBottom: num(s.paddingBottom, 64) }}>
      <h1 className="text-[28px] font-semibold md:text-[34px]" style={{ color: 'var(--t-text)' }}>{heading}</h1>

      {cart.length === 0 ? (
        <div className="mt-10 rounded-[var(--t-radius)] border py-20 text-center" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface)' }}>
          <ShoppingBag size={40} strokeWidth={1.4} className="mx-auto" style={{ color: 'var(--t-text-muted)' }} />
          <h2 className="mt-4 text-[20px] font-semibold" style={{ color: 'var(--t-text)' }}>{emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-sm text-[14px]" style={{ color: 'var(--t-text-muted)' }}>{emptyText}</p>
          <Link to="/shop" className="mt-7 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.08em]"
            style={{ background: 'var(--t-text)', color: 'var(--t-bg)' }}>
            Start shopping <ChevronRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1fr_360px]">
          {/* Line items */}
          <div className="flex flex-col gap-4">
            {ordered.map(({ line, index, status, available }) => {
              const key = lineKey(line);
              const blocked = BLOCKING.has(status);
              const img = Array.isArray(line.images) ? (typeof line.images[0] === 'string' ? line.images[0] : line.images[0]?.url) : null;
              return (
                <div key={key} className="flex gap-4 rounded-[var(--t-radius)] border p-4"
                  style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface)', opacity: blocked ? 0.62 : 1 }}>
                  {img ? (
                    <img src={img} alt={line.name || 'Product'} loading="lazy"
                      className="h-28 w-24 shrink-0 rounded-[calc(var(--t-radius)*0.7)] object-cover" />
                  ) : (
                    <div className="grid h-28 w-24 shrink-0 place-items-center rounded-[calc(var(--t-radius)*0.7)] text-[10px] font-semibold uppercase tracking-[0.14em]"
                      style={{ background: 'var(--t-muted)', color: 'var(--t-text-muted)' }}>HUSHAE</div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/product/${line.slug || line.id}`} className="block truncate text-[15px] font-semibold hover:opacity-70"
                          style={{ color: 'var(--t-text)' }}>{line.name || 'Product'}</Link>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--t-text-muted)]">
                          {line.size && <span>Size: <b style={{ color: 'var(--t-text)' }}>{line.size}</b></span>}
                          {line.color && <span>Colour: <b style={{ color: 'var(--t-text)' }}>{line.color}</b></span>}
                        </div>
                        {blocked && (
                          <span className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
                            style={{ background: 'var(--t-muted)', color: 'var(--t-text-muted)' }}>
                            {status === 'oos' ? 'Sold out' : status === 'unavailable' ? 'No longer available' : 'Size no longer available'}
                          </span>
                        )}
                      </div>
                      <button type="button" onClick={() => removeLine(key)} aria-label="Remove"
                        className="rounded-full p-1.5 transition hover:rotate-90 hover:opacity-70"
                        style={{ color: 'var(--t-text-muted)' }}>
                        <X size={15} />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="inline-flex items-center rounded-full border" style={{ borderColor: 'var(--t-border)' }}>
                        <button type="button" className="px-3 py-1.5 disabled:opacity-40" disabled={line.qty <= 1 || blocked}
                          onClick={() => updateQty(key, line.qty - 1)} aria-label="Decrease"><Minus size={12} /></button>
                        <span className="min-w-7 text-center text-[13.5px] font-semibold" style={{ color: 'var(--t-text)' }}>{line.qty}</span>
                        <button type="button" className="px-3 py-1.5 disabled:opacity-40" disabled={blocked || (available != null && line.qty >= available)}
                          onClick={() => updateQty(key, line.qty + 1)} aria-label="Increase"><Plus size={12} /></button>
                      </div>
                      <span className="text-[15px] font-semibold" style={{ color: 'var(--t-text)' }}>{pkr(line.price * (status === 'low' && available != null ? Math.min(line.qty, available) : line.qty))}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={clearCart} className="text-[12px] font-medium uppercase tracking-[0.1em] underline-offset-4 hover:underline"
                style={{ color: 'var(--t-text-muted)' }}>
                Clear bag
              </button>
              <Link to="/shop" className="text-[12px] font-medium uppercase tracking-[0.1em] underline-offset-4 hover:underline"
                style={{ color: 'var(--t-accent)' }}>
                Continue shopping
              </Link>
            </div>
          </div>

          {/* Order summary */}
          <aside className="rounded-[var(--t-radius)] border p-6 lg:sticky lg:top-28"
            style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface)' }}>
            <h2 className="text-[17px] font-semibold" style={{ color: 'var(--t-text)' }}>Order summary</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-[13.5px]">
              <div className="flex justify-between" style={{ color: 'var(--t-text-muted)' }}>
                <dt>Subtotal</dt><dd style={{ color: 'var(--t-text)' }}>{pkr(pricing.subtotal)}</dd>
              </div>
              {pricing.discount > 0 && (
                <div className="flex justify-between" style={{ color: 'var(--t-text-muted)' }}>
                  <dt>Discount</dt><dd style={{ color: 'var(--t-sale, #B3261E)' }}>−{pkr(pricing.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between" style={{ color: 'var(--t-text-muted)' }}>
                <dt>Delivery</dt>
                <dd>{pricing.freeShip ? 'Complimentary' : pkr(pricing.shipping)}</dd>
              </div>
              {pricing.tax > 0 && (
                <div className="flex justify-between" style={{ color: 'var(--t-text-muted)' }}>
                  <dt>Tax</dt><dd style={{ color: 'var(--t-text)' }}>{pkr(pricing.tax)}</dd>
                </div>
              )}
              <div className="my-1 border-t" style={{ borderColor: 'var(--t-border)' }} />
              <div className="flex justify-between text-[16px] font-semibold" style={{ color: 'var(--t-text)' }}>
                <dt>Total</dt><dd>{pkr(pricing.total)}</dd>
              </div>
            </dl>

            {bool(s.showShippingNote, true) && pricing.count > 0 && !pricing.freeShip && (
              <p className="mt-4 rounded-lg px-3.5 py-2.5 text-[12.5px] leading-relaxed" style={{ background: 'var(--t-muted)', color: 'var(--t-text-muted)' }}>
                You are <b style={{ color: 'var(--t-text)' }}>{pkr(pricing.remaining)}</b> away from complimentary delivery.
              </p>
            )}

            <Link to="/checkout" className="te-btn-shine mt-5 flex w-full items-center justify-center gap-2 rounded-full py-4 text-[13px] font-bold uppercase tracking-[0.1em] transition hover:opacity-90"
              style={{ background: 'var(--t-text)', color: 'var(--t-bg)' }}>
              <Lock size={13} /> {checkoutLabel}
            </Link>

            {bool(s.showTrustBadges, true) && (
              <div className="mt-5 flex flex-col gap-2 text-[12px]" style={{ color: 'var(--t-text-muted)' }}>
                <span className="inline-flex items-center gap-2"><ShieldCheck size={14} style={{ color: 'var(--t-accent)' }} /> Cash on delivery available nationwide</span>
                <span className="inline-flex items-center gap-2"><Truck size={14} style={{ color: 'var(--t-accent)' }} /> 3–5 day delivery across Pakistan</span>
                <span className="inline-flex items-center gap-2"><BadgeCheck size={14} style={{ color: 'var(--t-accent)' }} /> 14-day easy exchange</span>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
