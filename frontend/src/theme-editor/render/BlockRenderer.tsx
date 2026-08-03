import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowRight, ChevronDown, Heart, Star } from 'lucide-react';
import type { BlockNode, SettingsBag } from '../core/types';
import { alignClass, bool, buttonStyle, num, RATIO, str, typographyStyle } from './styleUtils';
import { useRenderCtx } from './RenderContext';
import { resolveIcon } from '../ui/iconRegistry';

/* ============================================================================
 * Block renderer — recursive, schema-agnostic.
 * Each block type maps to a small pure component; unknown types render nothing
 * so the storefront never crashes on a stale document.
 * ========================================================================== */

interface Props {
  block: BlockNode;
  /** Extra data handed down by the parent section (e.g. a product for a card). */
  scope?: Record<string, unknown>;
}

function Icon({ name, size = 20, className, style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  const C = resolveIcon(name);
  return <C size={size} className={className} style={style} />;
}

export const BlockRenderer = memo(function BlockRenderer({ block, scope }: Props) {
  const { editable, selectedId, hoveredId, onSelect, onHover } = useRenderCtx();
  if (block.hidden) return null;

  const interactive = editable
    ? {
      'data-node-id': block.id,
      onClick: (e: React.MouseEvent) => { e.stopPropagation(); onSelect?.(block.id); },
      onMouseOver: (e: React.MouseEvent) => { e.stopPropagation(); onHover?.(block.id); },
      onMouseOut: () => onHover?.(null),
      className: `te-node ${selectedId === block.id ? 'te-selected' : ''} ${hoveredId === block.id ? 'te-hovered' : ''}`,
    }
    : {};

  const inner = <BlockBody block={block} scope={scope} />;
  if (!editable) return inner;
  return <div {...interactive}>{inner}</div>;
});

const children = (b: BlockNode, scope?: Record<string, unknown>) =>
  (b.blocks || []).map((c) => <BlockRenderer key={c.id} block={c} scope={scope} />);

function BlockBody({ block: b, scope }: Props) {
  const s = b.settings;
  switch (b.type) {
    // ── text ────────────────────────────────────────────────────────────────
    case 'heading': {
      const Tag = str(s.tag, 'h2') as 'h1' | 'h2' | 'h3' | 'h4' | 'p';
      return (
        <Tag className={`${alignClass(s.align)} whitespace-pre-line`} style={typographyStyle(s)}>
          {str(s.text, 'Your heading')}
        </Tag>
      );
    }
    case 'text':
      return (
        <p className={`${alignClass(s.align)} whitespace-pre-line`}
          style={{ ...typographyStyle(s), maxWidth: num(s.maxWidth, 620) || undefined, marginInline: str(s.align) === 'center' ? 'auto' : undefined }}>
          {str(s.text)}
        </p>
      );
    case 'richtext':
      return (
        <div className={`te-richtext ${alignClass(s.align)}`}
          style={{ maxWidth: num(s.maxWidth, 720) || undefined, marginInline: str(s.align) === 'center' ? 'auto' : undefined }}
          dangerouslySetInnerHTML={{ __html: str(s.html) }} />
      );
    case 'eyebrow':
      return (
        <p className={`text-[13px] font-bold uppercase ${alignClass(s.align)}`}
          style={{ color: str(s.color) || 'var(--t-accent)', letterSpacing: `${num(s.tracking, 20) / 100}em` }}>
          {str(s.text)}
        </p>
      );

    // ── actions ─────────────────────────────────────────────────────────────
    case 'button':
      return (
        <a href={str(s.href, '#')} target={s.newTab ? '_blank' : undefined} rel={s.newTab ? 'noreferrer' : undefined}
          style={buttonStyle(s)} onClick={(e) => e.preventDefault()}>
          {str(s.label, 'Button')}
        </a>
      );
    case 'button_row':
      return (
        <div className={`flex flex-wrap ${alignClass(s.align, 'justify')}`} style={{ gap: num(s.gap, 12) }}>
          {children(b, scope)}
        </div>
      );

    // ── media ───────────────────────────────────────────────────────────────
    case 'image': {
      const ratio = str(s.ratio, 'auto');
      return (
        <div className={alignClass(s.align)}>
          <img src={str(s.src) || placeholder} alt={str(s.alt)} loading="lazy"
            style={{
              width: '100%', maxWidth: num(s.maxWidth, 1400), borderRadius: num(s.radius, 16),
              aspectRatio: ratio === 'auto' ? undefined : RATIO[ratio], objectFit: ratio === 'auto' ? undefined : 'cover',
            }} />
        </div>
      );
    }
    case 'video':
      return (
        <video src={str(s.src)} poster={str(s.poster) || undefined}
          autoPlay={bool(s.autoplay, true)} loop={bool(s.loop, true)} muted={bool(s.muted, true)}
          controls={bool(s.controls)} playsInline
          className="w-full" style={{ borderRadius: num(s.radius, 16) }} />
      );
    case 'icon':
      return (
        <div className={alignClass(s.align)}>
          <Icon name={str(s.name, 'Star')} size={num(s.size, 24)} style={{ color: str(s.color) || undefined, display: 'inline-block' }} />
        </div>
      );
    case 'spacer':
      return <div style={{ height: num(s.height, 32) }} />;
    case 'divider_block':
      return (
        <hr style={{
          borderTopWidth: num(s.thickness, 1), borderColor: str(s.color) || 'var(--t-border)',
          width: `${num(s.width, 100)}%`, marginInline: 'auto',
        }} />
      );
    case 'html':
      return <div dangerouslySetInnerHTML={{ __html: str(s.code) }} />;
    case 'liquid':
      return <div className="rounded-lg border border-dashed p-4 text-xs opacity-60">Liquid renders on the live storefront</div>;

    // ── containers ──────────────────────────────────────────────────────────
    case 'group':
      return (
        <div
          className={`flex ${str(s.direction, 'column') === 'row' ? 'flex-row flex-wrap' : 'flex-col'} ${alignClass(s.align, 'items')}`}
          style={{
            gap: num(s.gap, 12), padding: num(s.padding, 0),
            background: str(s.background) || undefined, borderRadius: num(s.radius, 0) || undefined,
          }}>
          {children(b, scope)}
        </div>
      );
    case 'column':
      return (
        <div className={`flex flex-col ${alignClass(s.align, 'items')}`} style={{ gap: num(s.gap, 12) }}>
          {children(b, scope)}
        </div>
      );

    // ── section header ──────────────────────────────────────────────────────
    case 'section_header': {
      const inline = bool(s.inline, true);
      const kids = b.blocks || [];
      const titles = kids.filter((k) => k.type !== 'sh_view_all');
      const actions = kids.filter((k) => k.type === 'sh_view_all');
      return (
        <div className={`flex ${inline ? 'flex-wrap items-end justify-between' : 'flex-col'} ${alignClass(s.align, inline ? 'justify' : 'items')} gap-3`}
          style={{ marginBottom: num(s.gap, 24) }}>
          <div className={`flex flex-col gap-1 ${alignClass(s.align)}`}>
            {titles.map((k) => <BlockRenderer key={k.id} block={k} scope={scope} />)}
          </div>
          {actions.map((k) => <BlockRenderer key={k.id} block={k} scope={scope} />)}
        </div>
      );
    }
    case 'sh_title':
      return (
        <h2 style={{
          fontFamily: str(s.font, 'display') === 'display' ? 'var(--t-font-heading)' : 'var(--t-font-body)',
          fontSize: `calc(${num(s.size, 30)}px * var(--t-heading-scale, 1))`,
          fontWeight: 'var(--t-heading-weight)' as unknown as number,
          letterSpacing: 'var(--t-heading-tracking)',
        }}>
          {str(s.text, 'Featured collection')}
        </h2>
      );
    case 'sh_view_all': {
      const style = str(s.style, 'text');
      return (
        <a href={str(s.href, '/shop')} onClick={(e) => e.preventDefault()}
          className="inline-flex items-center gap-1 text-[13px] font-bold uppercase tracking-widest"
          style={style === 'text' ? { textDecoration: 'underline', textUnderlineOffset: 4 } : buttonStyle({ ...s, size: 'sm' })}>
          {str(s.label, 'View all')} <ArrowRight size={13} />
        </a>
      );
    }

    // ── product card ────────────────────────────────────────────────────────
    case 'product_card':
      return <ProductCardBlock block={b} scope={scope} />;
    case 'card_media': case 'card_title': case 'card_price': case 'card_vendor':
    case 'card_rating': case 'card_badge': case 'card_inventory': case 'card_quick_add':
    case 'card_wishlist': case 'card_swatches':
      return <CardPart block={b} scope={scope} />;

    // ── content blocks ──────────────────────────────────────────────────────
    case 'testimonial':
      return (
        <figure className="flex h-full flex-col rounded-[var(--t-card-radius)] border p-6"
          style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface)', boxShadow: 'var(--t-card-shadow)' }}>
          {num(s.rating, 5) > 0 && (
            <div className="mb-3 flex gap-0.5" style={{ color: 'var(--t-accent)' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={13} fill={i < num(s.rating, 5) ? 'currentColor' : 'none'} />
              ))}
            </div>
          )}
          <blockquote className="flex-1 text-[15px] leading-relaxed">“{str(s.quote)}”</blockquote>
          <figcaption className="mt-5 flex items-center gap-3 border-t pt-4" style={{ borderColor: 'var(--t-border)' }}>
            {str(s.avatar)
              ? <img src={str(s.avatar)} alt="" className="h-9 w-9 rounded-full object-cover" />
              : <span className="grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold"
                style={{ background: 'var(--t-primary)', color: 'var(--t-bg)' }}>
                {str(s.author, 'A').split(' ').map((w) => w[0]).slice(0, 2).join('')}
              </span>}
            <span>
              <span className="block text-[13px] font-semibold">{str(s.author)}</span>
              <span className="block text-[10.5px] uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>{str(s.meta)}</span>
            </span>
          </figcaption>
        </figure>
      );

    case 'faq_item':
      return <FaqItem block={b} />;
    case 'icon_item':
      return (
        <div className="text-center">
          <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full" style={{ background: 'var(--t-muted)' }}>
            <Icon name={str(s.icon, 'Sparkles')} size={19} />
          </span>
          <p className="font-medium" style={{ fontFamily: 'var(--t-font-heading)', fontSize: 17 }}>{str(s.title)}</p>
          <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>{str(s.text)}</p>
        </div>
      );
    case 'timeline_item':
      return (
        <div className="relative pl-7">
          <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full" style={{ background: 'var(--t-accent)' }} />
          <p className="text-[13px] font-bold uppercase tracking-widest" style={{ color: 'var(--t-accent)' }}>{str(s.year)}</p>
          <p className="mt-1 text-lg" style={{ fontFamily: 'var(--t-font-heading)' }}>{str(s.title)}</p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>{str(s.text)}</p>
        </div>
      );
    case 'countdown':
      return <Countdown settings={s} />;
    case 'slide':
      return null; // rendered by the slideshow section
    case 'tab':
      return <>{children(b, scope)}</>;

    // ── header / footer parts (rendered by their sections) ──────────────────
    case 'menu_item': case 'logo': case 'menu': case 'header_icons':
    case 'footer_column': case 'footer_about': case 'footer_contact': case 'footer_newsletter':
    case 'announcement':
      return null;

    default:
      return null;
  }
}

const placeholder =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="100%" height="100%" fill="#EFECE7"/><text x="50%" y="50%" font-family="sans-serif" font-size="15" fill="#A8A29B" text-anchor="middle">Image</text></svg>`,
  );

// ── Product card ────────────────────────────────────────────────────────────
function ProductCardBlock({ block: b, scope }: Props) {
  const s = b.settings;
  const product = scope?.product as Record<string, unknown> | undefined;
  const kids = b.blocks || [];
  const overlays = kids.filter((k) => ['card_badge', 'card_wishlist', 'card_quick_add'].includes(k.type));
  const media = kids.find((k) => k.type === 'card_media');
  const below = kids.filter((k) => !overlays.includes(k) && k !== media);

  return (
    <div className={`group relative ${alignClass(s.align)}`}
      style={{
        background: str(s.background) || undefined,
        padding: num(s.padding, 0) || undefined,
        borderRadius: num(s.radius, 0) || undefined,
        border: s.border ? '1px solid var(--t-border)' : undefined,
        boxShadow: s.shadow && s.shadow !== 'none' ? `var(--t-card-shadow)` : undefined,
      }}>
      <div className="relative overflow-hidden" style={{ borderRadius: num(media?.settings.radius, 16) }}>
        {media && <BlockRenderer block={media} scope={scope} />}
        {overlays.map((k) => <BlockRenderer key={k.id} block={k} scope={scope} />)}
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {below.map((k) => <BlockRenderer key={k.id} block={k} scope={scope} />)}
      </div>
    </div>
  );
}

function CardPart({ block: b, scope }: Props) {
  const s = b.settings;
  const p = (scope?.product || {}) as Record<string, any>;
  const price = Number(p.price ?? 0);
  const compare = Number(p.compareAtPrice ?? 0);
  const pkr = (n: number) => `PKR ${n.toLocaleString('en-PK')}`;

  switch (b.type) {
    case 'card_media': {
      const imgs: any[] = Array.isArray(p.images) ? p.images : [];
      const first = imgs[0]?.url || imgs[0] || p.image || placeholder;
      const second = imgs[1]?.url || imgs[1];
      return (
        <div className="relative w-full" style={{ aspectRatio: RATIO[str(s.ratio, '4/5')] }}>
          <img src={first} alt={str(p.name)} loading="lazy"
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
            style={{ objectFit: str(s.fit, 'cover') as CSSProperties['objectFit'] }} />
          {bool(s.hoverSwap) && second && (
            <img src={second} alt="" loading="lazy"
              className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ objectFit: str(s.fit, 'cover') as CSSProperties['objectFit'] }} />
          )}
        </div>
      );
    }
    case 'card_title':
      return (
        <p className="font-medium leading-snug"
          style={{
            fontSize: num(s.size, 14), color: str(s.color) || undefined,
            display: '-webkit-box', WebkitLineClamp: num(s.lines, 2), WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
          {str(p.name, 'Product title')}
        </p>
      );
    case 'card_vendor':
      return <p className="uppercase tracking-widest" style={{ fontSize: num(s.size, 11), color: 'var(--t-text-muted)' }}>{str(p.vendor, 'HUSHAE')}</p>;
    case 'card_price':
      return (
        <div className="flex items-center gap-2" style={{ fontSize: num(s.size, 14) }}>
          <span className="font-semibold" style={{ color: compare ? (str(s.saleColor) || 'var(--t-sale)') : undefined }}>{pkr(price)}</span>
          {bool(s.showCompare, true) && compare > 0 && (
            <span className="line-through" style={{ color: 'var(--t-text-muted)', fontSize: '0.85em' }}>{pkr(compare)}</span>
          )}
        </div>
      );
    case 'card_rating': {
      const avg = Number(p.ratingAvg ?? 0);
      return (
        <div className="flex items-center gap-1" style={{ color: 'var(--t-accent)' }}>
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} fill={i < Math.round(avg) ? 'currentColor' : 'none'} />)}
          {bool(s.showCount, true) && <span className="ml-1 text-[13px]" style={{ color: 'var(--t-text-muted)' }}>({p.ratingCount ?? 0})</span>}
        </div>
      );
    }
    case 'card_badge': {
      if (!compare || compare <= price) return null;
      const percent = Math.round((1 - price / compare) * 100);
      const pos = str(s.position, 'top-left') === 'top-right' ? { right: 12 } : { left: 12 };
      return (
        <span className="absolute rounded-full px-2.5 py-1 text-[13px] font-bold uppercase tracking-wider"
          style={{ top: 12, ...pos, background: str(s.bg) || 'var(--t-accent)', color: str(s.fg) || '#fff' }}>
          {str(s.text, 'Save {percent}%').replace('{percent}', String(percent))}
        </span>
      );
    }
    case 'card_inventory': {
      const stock = Number(p.stock ?? 0);
      if (stock === 0) return <p className="text-[13px] font-semibold" style={{ color: 'var(--t-sale)' }}>Sold out</p>;
      if (stock > num(s.threshold, 5)) return null;
      return <p className="text-[13px] font-semibold" style={{ color: 'var(--t-sale)' }}>Only {stock} left</p>;
    }
    case 'card_quick_add':
      return (
        <button
          className={`absolute inset-x-3 bottom-3 rounded-full py-2.5 text-[13px] font-semibold uppercase tracking-widest backdrop-blur transition-all ${
            bool(s.showOnHover, true) ? 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100' : ''
          }`}
          style={{ background: 'rgba(13,13,13,.9)', color: '#F7F5F1' }}>
          {str(s.label, 'Quick Add')}
        </button>
      );
    case 'card_wishlist':
      return (
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full shadow"
          style={{ background: 'rgba(255,255,255,.92)' }}>
          <Heart size={16} />
        </span>
      );
    case 'card_swatches': {
      const colors: any[] = Array.isArray(p.colors) ? p.colors.slice(0, num(s.max, 5)) : [];
      if (!colors.length) return null;
      return (
        <div className="mt-1 flex gap-1.5">
          {colors.map((c, i) => (
            <span key={i} className="h-3.5 w-3.5 rounded-full border" style={{ background: c.hex || c.name, borderColor: 'var(--t-border)' }} />
          ))}
        </div>
      );
    }
    default: return null;
  }
}

function FaqItem({ block: b }: { block: BlockNode }) {
  const s = b.settings;
  const [open, setOpen] = useState(bool(s.open));
  useEffect(() => setOpen(bool(s.open)), [s.open]);
  return (
    <div className="border-b" style={{ borderColor: 'var(--t-border)' }}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 py-4 text-left">
        <span className="text-[15px] font-medium">{str(s.q)}</span>
        <ChevronDown size={17} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>{str(s.a)}</p>}
    </div>
  );
}

function Countdown({ settings: s }: { settings: SettingsBag }) {
  const target = useMemo(() => (s.until ? new Date(String(s.until)).getTime() : 0), [s.until]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target || Number.isNaN(target)) {
    return <p className="text-sm opacity-60">Set an end date in the settings panel</p>;
  }
  const left = Math.max(0, target - now);
  if (left === 0) return <p className="text-lg font-semibold">{str(s.expiredText, 'Offer ended')}</p>;
  const units = [
    { label: 'Days', v: Math.floor(left / 86400000) },
    { label: 'Hours', v: Math.floor(left / 3600000) % 24 },
    { label: 'Minutes', v: Math.floor(left / 60000) % 60 },
    { label: 'Seconds', v: Math.floor(left / 1000) % 60 },
  ];
  return (
    <div className="flex justify-center gap-5">
      {units.map((u) => (
        <div key={u.label} className="text-center">
          <p style={{ fontSize: num(s.size, 28), fontFamily: 'var(--t-font-heading)', fontVariantNumeric: 'tabular-nums' }}>
            {String(u.v).padStart(2, '0')}
          </p>
          {bool(s.showLabels, true) && (
            <p className="text-[13px] uppercase tracking-widest" style={{ color: 'var(--t-text-muted)' }}>{u.label}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export { Icon };
