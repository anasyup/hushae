/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
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
      fontSize: {
        'display-1': ['clamp(2.75rem, 6vw, 4.5rem)',  { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'display-2': ['clamp(2.25rem, 4.6vw, 3.5rem)', { lineHeight: '1.06', letterSpacing: '-0.018em' }],
        h1: ['clamp(1.875rem, 3.4vw, 2.75rem)', { lineHeight: '1.12', letterSpacing: '-0.015em' }],
        h2: ['clamp(1.5rem, 2.6vw, 2rem)',      { lineHeight: '1.18', letterSpacing: '-0.012em' }],
        h3: ['clamp(1.25rem, 2vw, 1.5rem)',     { lineHeight: '1.25', letterSpacing: '-0.008em' }],
        h4: ['1.125rem', { lineHeight: '1.35', letterSpacing: '-0.005em' }],
        h5: ['1rem',     { lineHeight: '1.4' }],
        h6: ['0.875rem', { lineHeight: '1.45', letterSpacing: '0.01em' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.7' }],
        body:      ['0.9375rem', { lineHeight: '1.65' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.6' }],
        caption:   ['0.75rem',   { lineHeight: '1.5' }],
        // UI labels are always uppercase + widely tracked in this brand.
        'label-lg': ['0.75rem',   { lineHeight: '1', letterSpacing: '0.18em' }],
        label:      ['0.6875rem', { lineHeight: '1', letterSpacing: '0.18em' }],
        'btn':    ['0.8125rem', { lineHeight: '1', letterSpacing: '0.16em' }],
        'btn-sm': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.16em' }],
      },

      // 4px base grid. Named steps stop 'p-3 vs p-3.5' drift between authors.
      spacing: {
        'gap-xs': '0.5rem',   // 8  — inside a chip
        'gap-sm': '0.75rem',  // 12 — between related controls
        'gap-md': '1.25rem',  // 20 — between cards in a grid
        'gap-lg': '2rem',     // 32 — between blocks
        'gap-xl': '3rem',     // 48 — between sub-sections
        'sect-y':    '3.5rem',  // 56 — vertical section padding, mobile
        'sect-y-lg': '5.5rem',  // 88 — vertical section padding, desktop
      },

      // One radius ladder. The audit found ten different values in use.
      borderRadius: {
        control: '0.75rem',  // 12 — inputs, small buttons
        card:    '1rem',     // 16 — product / content cards
        panel:   '1.5rem',   // 24 — drawers, modals, large surfaces
        hero:    '2rem',     // 32 — full-bleed editorial blocks
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
