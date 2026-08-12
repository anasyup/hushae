import type { CSSProperties } from 'react';
import type { SettingsBag } from '../core/types';

/* Shared style derivation used by every renderer. */

export const num = (v: unknown, fb = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
export const str = (v: unknown, fb = ''): string => (v === undefined || v === null || v === '' ? fb : String(v));
export const bool = (v: unknown, fb = false): boolean => (v === undefined ? fb : !!v);

const SCHEME: Record<string, { bg: string; fg: string; muted: string }> = {
  light: { bg: 'var(--t-surface)', fg: 'var(--t-text)', muted: 'var(--t-text-muted)' },
  dark: { bg: 'var(--t-primary)', fg: '#F7F5F1', muted: 'rgba(247,245,241,.7)' },
  accent: { bg: 'var(--t-accent)', fg: '#FFFFFF', muted: 'rgba(255,255,255,.8)' },
};

export function sectionStyle(s: SettingsBag): CSSProperties {
  const scheme = str(s.colorScheme, 'inherit');
  const preset = SCHEME[scheme];
  const style: CSSProperties = {
    paddingTop: num(s.paddingTop, 0),
    paddingBottom: num(s.paddingBottom, 0),
    marginTop: num(s.marginTop, 0),
    marginBottom: num(s.marginBottom, 0),
  };
  const radius = num(s.radius, 0);
  if (radius) { style.borderRadius = radius; style.overflow = 'hidden'; }
  if (preset) { style.background = preset.bg; style.color = preset.fg; }
  if (s.background) style.background = String(s.background);
  if (s.textColor) style.color = String(s.textColor);
  return style;
}

export function containerClass(width: unknown): string {
  const w = str(width, 'page');
  if (w === 'full') return 'w-full px-[var(--t-gutter)]';
  if (w === 'wide') return 'mx-auto w-full max-w-[1600px] px-[var(--t-gutter)]';
  return 'mx-auto w-full max-w-[var(--t-page-width)] px-[var(--t-gutter)]';
}

export function visibilityClass(s: SettingsBag): string {
  const out: string[] = [];
  if (s.hideMobile) out.push('max-md:hidden');
  if (s.hideTablet) out.push('max-lg:md:hidden');
  if (s.hideDesktop) out.push('lg:hidden');
  return out.join(' ');
}

export function alignClass(v: unknown, kind: 'text' | 'items' | 'justify' = 'text'): string {
  const a = str(v, 'left');
  if (kind === 'text') return a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left';
  if (kind === 'items') return a === 'center' ? 'items-center' : a === 'right' ? 'items-end' : 'items-start';
  return a === 'center' ? 'justify-center' : a === 'right' ? 'justify-end' : 'justify-start';
}

const FONT: Record<string, string> = {
  display: 'var(--t-font-heading)',
  sans: 'var(--t-font-body)',
  // Legacy alias: a stored block with font:'editorial' resolves to the house
  // heading font — the storefront is a one-family (LV register) system.
  editorial: 'var(--t-font-heading)',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

export function typographyStyle(s: SettingsBag, prefix = ''): CSSProperties {
  const k = (n: string) => (prefix ? `${prefix}${n[0].toUpperCase()}${n.slice(1)}` : n);
  const out: CSSProperties = {};
  if (s[k('font')]) out.fontFamily = FONT[str(s[k('font')])] || FONT.sans;
  if (s[k('size')]) out.fontSize = `calc(${num(s[k('size')], 16)}px * var(--t-heading-scale, 1))`;
  if (s[k('weight')]) out.fontWeight = Number(s[k('weight')]);
  if (s[k('tracking')] !== undefined && s[k('tracking')] !== '') out.letterSpacing = `${num(s[k('tracking')]) / 100}em`;
  if (s[k('leading')]) out.lineHeight = num(s[k('leading')], 120) / 100;
  if (s[k('transform')] && s[k('transform')] !== 'none') out.textTransform = str(s[k('transform')]) as CSSProperties['textTransform'];
  if (s[k('color')]) out.color = String(s[k('color')]);
  return out;
}

export function buttonStyle(s: SettingsBag): CSSProperties {
  const style = str(s.style, 'solid');
  const size = str(s.size, 'md');
  const scale = size === 'sm' ? 0.82 : size === 'lg' ? 1.18 : 1;
  const out: CSSProperties = {
    borderRadius: s.radius !== undefined && s.radius !== '' ? num(s.radius, 999) : 'var(--t-btn-radius)',
    paddingInline: `calc(var(--t-btn-px) * ${scale})`,
    paddingBlock: `calc(var(--t-btn-py) * ${scale})`,
    letterSpacing: 'var(--t-btn-tracking)',
    textTransform: 'var(--t-btn-transform)' as CSSProperties['textTransform'],
    fontSize: `${13 * scale}px`,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    transition: 'all .18s ease',
  };
  if (s.fullWidth) out.width = '100%';
  if (style === 'solid') {
    out.background = str(s.bg) || 'var(--t-primary)';
    out.color = str(s.fg) || 'var(--t-bg)';
    out.border = '1px solid transparent';
  } else if (style === 'outline') {
    out.background = str(s.bg) || 'transparent';
    out.color = str(s.fg) || 'currentColor';
    out.border = `var(--t-btn-border) solid ${str(s.fg) || 'currentColor'}`;
  } else {
    out.background = 'transparent';
    out.color = str(s.fg) || 'currentColor';
    out.border = '1px solid transparent';
    out.paddingInline = 0;
    out.textDecoration = 'underline';
    out.textUnderlineOffset = '4px';
  }
  return out;
}

export const RATIO: Record<string, string> = {
  auto: 'auto', '1/1': '1 / 1', '4/5': '4 / 5', '3/4': '3 / 4', '16/9': '16 / 9', '4/3': '4 / 3', '21/9': '21 / 9',
};

export const SHADOW: Record<string, string> = {
  none: 'none', sm: '0 1px 2px rgba(0,0,0,.06)', md: '0 6px 20px rgba(0,0,0,.08)', lg: '0 18px 48px rgba(0,0,0,.12)',
};

/** Framer-motion variants derived from the section animation setting. */
export function animationProps(s: SettingsBag, enabled: boolean) {
  const kind = str(s.animation, 'fade-up');
  if (!enabled || kind === 'none') return {};
  const d = 'var(--t-anim-distance)';
  const from: Record<string, Record<string, number | string>> = {
    fade: { opacity: 0 },
    'fade-up': { opacity: 0, y: 22 },
    'fade-down': { opacity: 0, y: -22 },
    zoom: { opacity: 0, scale: 0.96 },
    'slide-left': { opacity: 0, x: -32 },
    'slide-right': { opacity: 0, x: 32 },
  };
  return {
    initial: from[kind] || from['fade-up'],
    whileInView: { opacity: 1, y: 0, x: 0, scale: 1 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.6, delay: num(s.animDelay, 0) / 1000 },
    'data-anim-distance': d,
  };
}
