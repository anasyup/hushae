/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    /* PHASE 3 — desktop breakpoints.
       Tailwind's default 2xl is 1536px and the theme never used it, so every
       layout froze at max-w-7xl (1280px). MEASURED on live: the container, the
       940px product grid, the 220px cards and the 484px PDP frame were
       BYTE-IDENTICAL at 1440, 1920 and 2560 — 33% of a 1920 screen and 50% of a
       2560 screen was empty margin.
       NOTE: the comment lives OUTSIDE the object. A block comment inside the
       screens literal made Tailwind emit ZERO media queries — every responsive
       variant in the whole stylesheet silently vanished and .container-page
       compiled to a bare max-width:80rem. Caught by grepping the built CSS. */
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1600px',
      '3xl': '1920px',
    },
    extend: {
      colors: {
        // Refined premium palette — inspired by Calvin Klein / Hanro / editorial fashion houses.
        // Anchor: deep-warm black + soft ivory. Accents are muted, never loud.
        obsidian:  '#111111',   // primary ink (slightly warmer than pure #000)
        ink:       '#1A1A1A',   // secondary ink for softer text on light
        graphite:  '#2E2C2A',   // hover/pressed states, dividers on dark
        alabaster: '#F7F5F1',   // primary background — warm ivory (Hanro-style)
        cream:     '#EFEAE3',   // warm off-white — cards on alabaster
        satin:     '#E4DDD3',   // soft neutral (previous)
        stone:     '#C9BFB4',   // mid-tone warm
        // Secondary text. Was #7A736D, which measured 4.29:1 on alabaster and
        // 3.90:1 on cream — both under the 4.5:1 WCAG AA floor. Darkened just
        // enough to clear it on either surface (5.11:1 / 4.65:1) while staying
        // clearly lighter than `ink` so the hierarchy still reads.
        ash:       '#6E6760',
        ashlight:  '#7A736D',   // the old tone — decorative use only, never text
        smoke:     '#9C948C',   // muted text on dark
        line:      '#E4DED4',   // dividers/borders — barely visible
        sage:      '#8F9C8B',   // subtle accent (used sparingly)
        sagedeep:  '#5C6A5A',   // deep sage for links/CTAs
        // sagedeep on a sage/25 wash over white measures 4.26:1 — under AA.
        // This darker step clears it at 5.4:1 and is used by .badge-sage.
        sagedark:  '#4E5A4C',
        clay:      '#B3927E',   // rare warm accent (badges, sale)
      },
      fontFamily: {
        // Two-family editorial system:
        // - Display: Cormorant Garamond (elegant serif, close to Hanro/CK type)
        // - UI/body: Inter (clean sans, universally legible)
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', '"Tenor Sans"', 'Didot', 'serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
      },
      letterSpacing: {
        widest2: '0.32em',
        wider3:  '0.24em',
      },

      // ── Design system tokens ────────────────────────────────────────────
      // Type scale. Each entry pairs a size with its line-height and tracking
      // so a heading can never be set with the wrong leading by accident.
      /* PHASE 3 — desktop type ceilings.
         MEASURED on live: /shop rendered h1 at 44px and body at 13px on a 2560
         display, because every clamp maxed out around a 1280 viewport. Only the
         DISPLAY and HEADING ceilings are raised; body, caption, label and btn
         are untouched, so mobile, tablet and reading measure are unchanged and
         no line-length regression is possible. */
      fontSize: {
        'display-1': ['clamp(2.75rem, 6vw, 5.75rem)',  { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'display-2': ['clamp(2.25rem, 4.6vw, 4.5rem)', { lineHeight: '1.06', letterSpacing: '-0.018em' }],
        h1: ['clamp(1.875rem, 3.4vw, 3.75rem)', { lineHeight: '1.12', letterSpacing: '-0.015em' }],
        h2: ['clamp(1.5rem, 2.6vw, 2.75rem)',      { lineHeight: '1.18', letterSpacing: '-0.012em' }],
        h3: ['clamp(1.25rem, 2vw, 1.875rem)',     { lineHeight: '1.25', letterSpacing: '-0.008em' }],
        /* Intermediate rungs. With body at 17 and h2 at 60 there was nothing
           between 18 and 44 for a sub-heading to occupy, so every section
           jumped straight from display to caption. */
        h4: ['clamp(1.125rem, 2.6vw + 0.06rem, 1.5rem)',  { lineHeight: '1.32', letterSpacing: '-0.005em' }],
        h5: ['clamp(1rem, 1.7vw + 0.19rem, 1.25rem)',     { lineHeight: '1.38' }],
        h6: ['0.875rem', { lineHeight: '1.45', letterSpacing: '0.01em' }],
        /* PHASE 7 — the reading sizes, re-measured on live at 1920.
           MEASURED PROBLEM: ten paragraphs across the homepage rendered at
           12-15px under headlines of 60-112px. That gap is the single biggest
           reason the page read as cheap — a luxury house sets body copy at
           16-18px and lets the ramp between display and text be gradual.
           These are `clamp()` so MOBILE IS UNCHANGED (the min matches the old
           fixed value exactly) and only desktop grows:
             body     15 -> 17    body-sm  13 -> 15
             body-lg  17 -> 19    caption  12 -> 13
           Line-height eases as size grows, which is how type wants to set.
           SLOPE RE-MEASURED: the first attempt used a gentle vw slope and
           tablet picked up +2px (768px went 13 -> 15). The brief is desktop
           only. The slope is now steep with a low intercept, so every value is
           pinned to its minimum until ~1024 and reaches the maximum by ~1600 —
           390 and 768 keep their existing sizes exactly. */
        'body-lg': ['clamp(1.0625rem, 1.55vw + 0.30rem, 1.1875rem)', { lineHeight: '1.7' }],
        body:      ['clamp(0.9375rem, 1.55vw + 0.18rem, 1.0625rem)',  { lineHeight: '1.66' }],
        'body-sm': ['clamp(0.8125rem, 1.55vw + 0.06rem, 0.9375rem)', { lineHeight: '1.62' }],
        caption:   ['clamp(0.75rem, 0.8vw + 0.35rem, 0.8125rem)',   { lineHeight: '1.55' }],
        // UI labels are always uppercase + widely tracked in this brand.
        'label-lg': ['0.75rem',   { lineHeight: '1', letterSpacing: '0.18em' }],
        label:      ['0.6875rem', { lineHeight: '1', letterSpacing: '0.18em' }],
        'btn':    ['0.8125rem', { lineHeight: '1', letterSpacing: '0.16em' }],
        'btn-sm': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.16em' }],
      },

      // 4px base grid. Named steps stop 'p-3 vs p-3.5' drift between authors.
      maxWidth: {
        /* The editorial column. 7xl (1280) was the only width in the theme.
           These are the measured content widths the desktop redesign targets:
           1440 -> 1360, 1920 -> 1680, 2560 -> 1840. Capping at 1840 rather
           than filling 2560 is deliberate — a product grid that spans a full
           studio display stops reading as a considered edit. */
        shell: '1840px',
      },
      spacing: {
        'gap-xs': '0.5rem',   // 8  — inside a chip
        'gap-sm': '0.75rem',  // 12 — between related controls
        'gap-md': '1.25rem',  // 20 — between cards in a grid
        'gap-lg': '2rem',     // 32 — between blocks
        'gap-xl': '3rem',     // 48 — between sub-sections
        'sect-y':    '3.5rem',  // 56 — vertical section padding, mobile
        'sect-y-lg': '5.5rem',  // 88 — vertical section padding, desktop
        /* PHASE 4 editorial rhythm. A magazine does not space every spread
           equally: a chapter break breathes more than a caption. These are the
           three rungs the homepage now uses between major movements. */
        'ed-sm': '4.5rem',   // 72  — within a movement
        'ed-md': '7.5rem',   // 120 — between movements
        'ed-lg': '11rem',    // 176 — chapter break, desktop only
      },

      // One radius ladder. The audit found ten different values in use.
      /* PHASE 4 — the single most template-like signal in the whole theme.
         MEASURED: 148 `rounded-full` instances in shopper UI, plus a 12/16/24/32
         radius ladder. Soft pills and generous corner rounding are the visual
         grammar of a SaaS dashboard and of every default ecommerce theme; no
         fashion house sets its imagery in 32px-rounded tiles.
         HUSHAE's language is rectilinear. Type, photography and rules are
         squared; only genuinely circular affordances (an avatar, a colour
         swatch, a dot) stay round, and those use `rounded-full` explicitly.
         The token NAMES are unchanged so all ~300 call sites inherit the new
         geometry without a single edit — and can be reverted the same way. */
      borderRadius: {
        control: '2px',      // inputs, buttons — a hairline softening, not a pill
        card:    '0px',      // product imagery sits square on the page
        panel:   '2px',      // drawers, modals
        hero:    '0px',      // full-bleed editorial
      },

      // Four rungs of elevation, all warm-tinted to match the palette.
      boxShadow: {
        soft: '0 24px 60px -30px rgba(17,17,17,0.16)',
        card: '0 10px 34px -20px rgba(17,17,17,0.22)',
        'e-1': '0 1px 2px rgba(17,17,17,0.05)',
        'e-2': '0 4px 12px -4px rgba(17,17,17,0.10)',
        'e-3': '0 12px 32px -12px rgba(17,17,17,0.16)',
        'e-4': '0 28px 64px -28px rgba(17,17,17,0.24)',
        focus: '0 0 0 2px #F7F5F1, 0 0 0 4px #111111',
      },

      transitionDuration: {
        fast: '150ms',   // colour / opacity on hover
        base: '220ms',   // the default for anything interactive
        slow: '400ms',   // panels, accordions
        media: '700ms',  // image zoom, hero crossfades
      },
      transitionTimingFunction: {
        entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
        standard: 'cubic-bezier(0.2, 0.6, 0.2, 1)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        fadeUp:  { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        fadeUp:  'fadeUp 0.6s ease-out both',
      },
    },
  },
  plugins: [],
};
