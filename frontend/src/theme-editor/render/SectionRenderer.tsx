import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { BlockNode, SectionNode } from '../core/types';
import { BlockRenderer, Icon } from './BlockRenderer';
import { useRenderCtx } from './RenderContext';
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

  const s = section.settings;
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
  const s = section.settings;
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
    case 'featured_product': return <FeaturedProduct section={section} />;
    case 'collection_list': return <CollectionList section={section} />;

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
  const s = section.settings;
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
          className="text-[11px] font-bold uppercase tracking-widest underline underline-offset-2">{str(cfg.ctaLabel)}</a>
      )}
    </div>
  );
}

function HeaderSection({ section }: { section: SectionNode }) {
  const { data } = useRenderCtx();
  const s = section.settings;
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
      <div className={`${containerClass('page')} flex items-center gap-4`} style={{ minHeight: num(s.height, 64) }}>
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
          <>{Logo}<div className="hidden flex-1 justify-center md:flex">{Menu}</div><div className="ml-auto">{IconRow}</div></>
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
        const subs = drop === 'children'
          ? (it.blocks || []).filter((c) => !c.hidden).map((c) => ({ name: str(c.settings.label), slug: str(c.settings.href) }))
          : drop ? categories.filter((c) => c.gender === drop).map((c) => ({ name: c.name, slug: `/category/${c.slug}` })) : [];
        return (
          <span key={it.id} className="group relative"
            data-node-id={editable ? it.id : undefined}
            onClick={editable ? (e) => { e.stopPropagation(); onSelect?.(it.id); } : undefined}>
            <a href={str(cfg.href, '#')} onClick={(e) => e.preventDefault()}
              className={`${bool(s.uppercase, true) ? 'uppercase' : ''} font-semibold tracking-widest transition hover:opacity-70`}
              style={{ fontSize: num(s.size, 12), color: cfg.highlight ? 'var(--t-accent)' : undefined }}>
              {str(cfg.label)}
            </a>
            {subs.length > 0 && (
              <span className="invisible absolute left-1/2 top-full z-40 -translate-x-1/2 pt-4 opacity-0 transition group-hover:visible group-hover:opacity-100">
                <span className="block w-52 rounded-2xl border p-2 shadow-lg"
                  style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                  {subs.map((c, i) => (
                    <a key={i} href={c.slug} onClick={(e) => e.preventDefault()}
                      className="block rounded-xl px-4 py-2.5 text-sm hover:opacity-70">{c.name}</a>
                  ))}
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
  center: 'items-center justify-center text-center',
  'bottom-left': 'items-end justify-start text-left',
  'bottom-center': 'items-end justify-center text-center',
  'bottom-right': 'items-end justify-end text-right',
};

function HeroSection({ section }: { section: SectionNode }) {
  const s = section.settings;
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
  const s = section.settings;
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
  const s = section.settings;
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
  const s = section.settings;
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
  return (
    <div className="relative overflow-hidden" style={{ minHeight: height }}>
      {str(cfg.video)
        ? <video src={str(cfg.video)} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
        : <img src={str(cfg.image) || heroPlaceholder} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0" style={{ background: `rgba(13,13,13,${num(cfg.overlay, 30) / 100})` }} />
      <div className={`relative z-10 flex ${POS[str(cfg.position, 'bottom-left')] || POS['bottom-left']} ${containerClass('page')}`}
        style={{ minHeight: height, paddingBlock: 56, color: '#F7F5F1' }}>
        <div className="flex flex-col gap-4">
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
  const s = section.settings;
  const { getProducts, requestProducts } = useRenderCtx();
  const query = useMemo(() => buildQuery(s), [s.source, s.count, s.sort, s.gender, s.collection, s.products]);
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
  const s = section.settings;
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
  const s = section.settings;
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
  const s = section.settings;
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
  const s = section.settings;
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
  const s = section.settings;
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
  const s = section.settings;
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
  const s = section.settings;
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
              {bool(s.showDate, true) && <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--t-text-muted)' }}>{p.date}</p>}
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
  const s = section.settings;
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
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--t-text-muted)' }}>{str(cfg.title, 'Contact')}</p>
                <div className="mt-4 space-y-2.5 text-sm">
                  <p className="flex items-center gap-2"><Icon name="Mail" size={14} /> {str(cfg.email) || data.settings.contactEmail || '—'}</p>
                  <p className="flex items-center gap-2"><Icon name="Phone" size={14} /> {str(cfg.phone) || data.settings.contactPhone || '—'}</p>
                  {str(cfg.note) && <p className="flex items-center gap-2"><Icon name="MapPin" size={14} /> {str(cfg.note)}</p>}
                </div>
                {bool(s.showPayments, true) && str(cfg.payments) && (
                  <p className="mt-5 flex items-center gap-2 text-[11px] uppercase tracking-widest" style={{ color: 'var(--t-text-muted)' }}>
                    <Icon name="CreditCard" size={14} /> {str(cfg.payments)}
                  </p>
                )}
              </div>
            );
          }
          // footer_column
          return (
            <div key={b.id} {...nodeProps(b)}>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--t-text-muted)' }}>{str(cfg.title)}</p>
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

      <div className="border-t pt-5 text-center text-[11px] uppercase tracking-widest" style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}>
        {str(s.bottomText) || `© ${year} ${data.settings.storeName || 'HUSHAE'} · All rights reserved`}
      </div>
    </footer>
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
