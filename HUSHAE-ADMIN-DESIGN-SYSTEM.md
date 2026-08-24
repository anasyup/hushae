# HUSHAE Admin Design System — Current State

## Design Philosophy
**White + Jet Black + Luxury + Simple + Fast + Professional**  
Luxury from: typography + spacing + alignment + proportion + restraint

---

## Colors

### V2 Design Tokens (admin-v2.css)

| Token | Value | Usage |
|-------|-------|-------|
| `--v2-bg` | `#FFFFFF` | Page background |
| `--v2-surface` | `#FFFFFF` | Card/panel background |
| `--v2-surface-subtle` | `#FAFAFA` | Inset/secondary background |
| `--v2-surface-hover` | `#F5F5F5` | Hover state |
| `--v2-surface-active` | `#EFEFEF` | Active/pressed state |
| `--v2-text-primary` | `#000000` | Primary text, headings |
| `--v2-text-secondary` | `#555555` | Secondary text |
| `--v2-text-muted` | `#777777` | Muted/helper text |
| `--v2-text-disabled` | `#999999` | Disabled text |
| `--v2-border` | `#EAEAEA` | Standard border |
| `--v2-border-strong` | `#DCDCDC` | Strong/emphasis border |
| `--v2-border-subtle` | `#F0F0F0` | Subtle/divider border |
| `--v2-black` | `#000000` | Primary buttons, active states |
| `--v2-white` | `#FFFFFF` | Text on dark backgrounds |

### Semantic Colors (Monochrome)

| Token | Value | Usage |
|-------|-------|-------|
| `--v2-success` | `#000000` | Success indicators (monochrome) |
| `--v2-success-bg` | `#F5F5F5` | Success background |
| `--v2-warning` | `#555555` | Warning indicators |
| `--v2-warning-bg` | `#FAFAFA` | Warning background |
| `--v2-danger` | `#000000` | Error/danger indicators |
| `--v2-danger-bg` | `#FAFAFA` | Error background |

**Note:** Success/warning/danger use monochrome values. The system deliberately avoids colored status indicators. Status is communicated through text labels + dot indicators (black = active, gray = inactive).

### Tailwind Admin Colors (tailwind.config.js)

```javascript
admin: {
  bg:           'var(--admin-bg)',        // #FFFFFF
  sidebar:      'var(--admin-sidebar)',   // #FFFFFF
  surface:      'var(--admin-surface)',   // #FFFFFF
  'surface-2':  'var(--admin-surface-2)', // #F5F5F5
  'surface-3':  'var(--admin-surface-3)', // #EFEFEF
  border:       'var(--admin-border)',    // #EAEAEA
  'border-sub': 'var(--admin-border-subtle)', // #F0F0F0
  text:         'var(--admin-text)',      // #000000
  'text-2':     'var(--admin-text-secondary)', // #555555
  'text-muted': 'var(--admin-text-muted)', // #777777
  accent:       'var(--admin-accent)',    // #000000
  success:      'var(--admin-success)',
  warning:      'var(--admin-warning)',
  danger:       'var(--admin-danger)',
  info:         'var(--admin-info)',
}
```

### Legacy Palette (still referenced in some components)

| Name | Value | Usage |
|------|-------|-------|
| obsidian | `#111111` | Primary ink |
| ink | `#1A1A1A` | Secondary ink |
| graphite | `#333333` | Hover/pressed on dark |
| alabaster | `#FFFFFF` | Primary background |
| cream | `#F7F7F7` | Off-white cards |
| satin | `#F0F0F0` | Soft neutral |
| ash | `#707070` | Secondary text (WCAG AA compliant) |
| line | `#E5E5E5` | Dividers/borders |

---

## Typography

### Font Family
```css
--v2-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--v2-font-mono: 'JetBrains Mono', 'SF Mono', Monaco, monospace;
```

**Storefront** uses Klein/Jost (editorial fashion fonts). Admin uses Inter for readability.

### Type Scale

| Token | Size | Weight | Tracking | Usage |
|-------|------|--------|----------|-------|
| `--v2-text-display` | 48px | 600 | -0.02em | Hero metrics (rare) |
| `--v2-text-page` | 24px | 600 | -0.02em | Page titles |
| `--v2-text-section` | 18px | 600 | normal | Section titles |
| `--v2-text-card` | 15px | 600 | normal | Card titles |
| `--v2-text-body` | 14px | 400 | normal | Body text |
| `--v2-text-small` | 13px | 400 | normal | Small text, table cells |
| `--v2-text-table` | 13px | 400 | normal | Table data |
| `--v2-text-label` | 11px | 600 | 0.08em | Labels (UPPERCASE) |
| `--v2-text-caption` | 10px | 400 | normal | Captions, hints |

### Common Patterns
```css
/* Section label */
text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]

/* KPI value */
text-[24px] font-semibold leading-none tracking-tight text-black
font-variant-numeric: tabular-nums

/* Table header */
text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]

/* Status badge */
text-[10px] font-semibold uppercase tracking-wider
```

---

## Spacing

### V2 Spacing Scale

| Token | Value |
|-------|-------|
| `--v2-space-1` | 4px |
| `--v2-space-2` | 8px |
| `--v2-space-3` | 12px |
| `--v2-space-4` | 16px |
| `--v2-space-5` | 20px |
| `--v2-space-6` | 24px |
| `--v2-space-8` | 32px |
| `--v2-space-10` | 40px |
| `--v2-space-12` | 48px |
| `--v2-space-16` | 64px |
| `--v2-space-20` | 80px |

### Common Spacing Patterns
```
Card padding: p-5 (20px) or p-6 (24px)
Section gap: space-y-6 (24px) or space-y-8 (32px)
Grid gap: gap-3 (12px) or gap-4 (16px) or gap-6 (24px)
Page padding: px-4 md:px-8 xl:px-10, py-6 md:py-8 xl:py-10
Table cell padding: px-4 py-3 or px-5 py-3
```

---

## Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--v2-radius-sm` | 2px | Badges, tags |
| `--v2-radius-md` | 4px | Buttons, inputs, cards |
| `--v2-radius-lg` | 6px | Panels, modals |
| `--v2-radius-xl` | 8px | Large containers (rare) |

**No pill/rounded-full shapes** in the admin design system.

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--v2-shadow-none` | none | Most surfaces (borders define structure) |
| `--v2-shadow-subtle` | `0 1px 2px rgba(0,0,0,0.04)` | Subtle elevation |
| `--v2-shadow-overlay` | `0 4px 12px rgba(0,0,0,0.08)` | Modals, dropdowns, popovers |

**Design principle:** Borders define structure, not shadows. Most admin surfaces use `border border-[#EAEAEA]` rather than box-shadow.

---

## Icons

| Property | Value |
|----------|-------|
| Library | Lucide React |
| Default size | 14px (inline), 16px (navigation), 24px (empty states) |
| Default stroke | 1.5 (regular), 2.0 (active/emphasis) |
| Color | `#DCDCDC` (decorative), `#777777` (secondary), `#000000` (active) |

---

## Components

### Button
| Variant | Classes | Usage |
|---------|---------|-------|
| Primary | `bg-black text-white hover:bg-[#1a1a1a]` | Main actions |
| Secondary | `border border-[#EAEAEA] text-[#555555] hover:border-[#DCDCDC]` | Secondary actions |
| Ghost | `text-[#777777] hover:text-black` | Tertiary actions |
| Sizes | `h-9` (default), `h-8` (small), `px-3 py-1.5` (compact) | |

### Input
| Property | Value |
|----------|-------|
| Height | `h-9` (36px) |
| Border | `border border-[#DCDCDC]` |
| Focus | `focus:border-black` |
| Placeholder | `placeholder:text-[#AAAAAA]` |
| Font | `text-[13px] text-black` |

### Card
| Property | Value |
|----------|-------|
| Border | `border border-[#EAEAEA]` |
| Background | `bg-white` |
| Radius | `rounded-md` (4px) |
| Padding | `p-5` or `p-6` |
| Header | `border-b border-[#EAEAEA] px-5 py-3` |

### Table
| Property | Value |
|----------|-------|
| Header bg | `bg-[#FAFAFA]` |
| Header text | `text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]` |
| Row border | `border-b border-[#F0F0F0]` |
| Cell padding | `px-4 py-3` or `px-5 py-3` |
| Hover | `hover:bg-[#FAFAFA]` |
| Numbers | `font-variant-numeric: tabular-nums` |

### Badge
| Variant | Classes |
|---------|---------|
| Default | `bg-[#F5F5F5] text-[#555555]` |
| Active | `bg-black text-white` |
| Inactive | `bg-[#FAFAFA] text-[#999999]` |
| Style | `rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider` |

### Tabs
| Property | Value |
|----------|-------|
| Active | `border-b-2 border-black text-black` |
| Inactive | `border-b-2 border-transparent text-[#AAAAAA] hover:text-[#777777]` |
| Font | `text-[11px] font-semibold uppercase tracking-[0.14em]` |
| Padding | `px-4 py-3` |

### Modal
| Property | Value |
|----------|-------|
| Overlay | `bg-black/20` |
| Container | `rounded-md border border-[#EAEAEA] bg-white` |
| Header | `border-b border-[#EAEAEA] px-6 py-4` |
| Footer | `border-t border-[#EAEAEA] px-6 py-4` |
| Max width | `max-w-lg` or `max-w-md` |

### Skeleton (Loading)
| Property | Value |
|----------|-------|
| Class | `v2-skeleton` |
| Animation | Gradient shimmer (200% background-size, 1.5s ease-in-out infinite) |
| Colors | `#FAFAFA → #F5F5F5 → #FAFAFA` |
| Radius | `rounded-md` |

### Empty State
| Property | Value |
|----------|-------|
| Padding | `py-16` or `p-8` |
| Alignment | `text-center` |
| Icon | `text-[#DCDCDC]` |
| Title | `text-[14px] font-semibold text-black` |
| Description | `text-[13px] text-[#AAAAAA]` |

### Page Header
| Property | Value |
|----------|-------|
| Title | `text-[24px] font-semibold tracking-tight text-black` |
| Description | `text-[13px] text-[#999999]` |
| Actions | `flex gap-2` right-aligned |
| Border | `border-b border-[#EAEAEA] pb-6 mb-8` |

### Sidebar (AdminLayout)
| Property | Value |
|----------|-------|
| Width | `w-[260px]` expanded, `w-[72px]` collapsed |
| Background | `bg-white` |
| Border | `border-r border-[#F0F0F0]` |
| Nav item height | `h-8` (32px) |
| Nav active | `bg-black text-white` |
| Nav inactive | `text-[#555555] hover:bg-[#F5F5F5]` |
| Section label | `text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]` |

### Header (TopBar)
| Property | Value |
|----------|-------|
| Height | `h-[60px]` |
| Background | `bg-white/95 backdrop-blur-sm` |
| Border | `border-b border-[#F0F0F0]` |
| Title | `text-[15px] font-semibold tracking-tight text-black` |

### Command Palette
| Property | Value |
|----------|-------|
| Overlay | `bg-black/20 backdrop-blur-sm` |
| Container | `rounded-lg border border-[#EAEAEA] bg-white` |
| Shadow | `0 8px 32px rgba(0,0,0,0.12)` |
| Input | `text-[15px]` |
| Active item | `bg-[#F5F5F5]` |

---

## Dark/Light Mode

### Current State
- **Default mode:** Light (white background, black text)
- **Dark mode:** Available via toggle in TopBar (Moon/Sun icon)
- **Persistence:** `localStorage` key `hushae.admin_theme_v3`
- **Implementation:** CSS class `.dark-admin` on `<html>` element
- **Legacy:** `admin-dark.css` and `admin-light.css` provide overrides

### Known Conflicts
1. Some components still use hardcoded `text-white` inline classes (rely on `admin-v2-override.css` to remap)
2. Theme Editor has its own theme chrome that may conflict
3. Charts (Recharts) need explicit color overrides for dark mode
4. Legacy `adm-*` CSS classes may not respect V2 tokens

### Override Strategy
`admin-v2-override.css` maps all dark-first inline classes to light-first equivalents within `.admin-shell`:
```css
.admin-shell .text-white → #000000
.admin-shell .text-white/60 → #555555
.admin-shell .bg-white/5 → #FAFAFA
.admin-shell .border-white/10 → #EAEAEA
```

---

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop XL | 1440px+ | Full workspace, sidebar 260px, content max 1600px |
| Desktop | 1280px | Same as XL, compressed |
| Tablet landscape | 1024px | Sidebar collapsible to 72px |
| Tablet | 768px | Sidebar hidden, mobile drawer |
| Mobile | 390px | Stacked cards, simplified tables |
| Small mobile | 360px | Tighter padding |
